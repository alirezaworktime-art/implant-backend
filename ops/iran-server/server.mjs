// implant-plan on Node.js: runs the Cloudflare Worker code unchanged, with a D1-compatible layer over node:sqlite
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';

const APP = process.env.APP_DIR || '/opt/implant/app';
const DBF = process.env.DB_FILE || '/opt/implant/data/implant.db';
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';

/* ---------- D1 compatibility ---------- */
const sq = new DatabaseSync(DBF);
sq.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;');
const norm = v => v === undefined ? null : (typeof v === 'boolean' ? (v ? 1 : 0) : (v instanceof ArrayBuffer ? new Uint8Array(v) : v));
const cache = new Map();
const stmt = sql => { let s = cache.get(sql); if (!s) { s = sq.prepare(sql); if (cache.size > 500) cache.clear(); cache.set(sql, s); } return s; };
const isRead = sql => /^\s*(select|with|pragma)\b/i.test(sql);
class Stmt {
  constructor(sql, args = []) { this.sql = sql; this.args = args; }
  bind(...a) { return new Stmt(this.sql, a.map(norm)); }
  _all() { const r = stmt(this.sql).all(...this.args); return { results: r.map(o => ({ ...o })), success: true, meta: { changes: 0 } }; }
  _run() {
    if (isRead(this.sql) || /\breturning\b/i.test(this.sql)) return this._all();
    const r = stmt(this.sql).run(...this.args);
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  async all() { return this._all(); }
  async run() { return this._run(); }
  async first(col) { const r = stmt(this.sql).get(...this.args); if (!r) return null; return col ? (col in r ? r[col] : null) : { ...r }; }
  async raw() { return stmt(this.sql).all(...this.args).map(o => Object.values(o)); }
}
const DB = {
  prepare: sql => new Stmt(sql),
  async batch(list) {
    sq.exec('BEGIN IMMEDIATE');
    try { const out = list.map(s => s._run()); sq.exec('COMMIT'); return out; }
    catch (e) { try { sq.exec('ROLLBACK'); } catch {} throw e; }
  },
  async exec(sql) { sq.exec(sql); return { count: 1, duration: 0 }; },
};

/* ---------- load the worker ---------- */
let src = fs.readFileSync(path.join(APP, 'worker.js'), 'utf8');
const KEY = (process.env.IMPORT_KEY || '').replace(/[^A-Za-z0-9_-]/g, '');
if (KEY) src = src.replace("const IMPORT_KEY='';", `const IMPORT_KEY='${KEY}';`);
const BH = (process.env.BACKUP_HASH || '').replace(/[^0-9a-f]/g, '');
if (BH && !/const BACKUP_HASH\s*=/.test(src)) src = `const BACKUP_HASH='${BH}';\n` + src;
// Iran server: no Google Apps Script from the browser (blocked in Iran without VPN); patient summary goes to Google Sheet nightly from the server
{
  const lines = src.split('\n'); const i = lines.findIndex(l => l.startsWith('const ASSETS='));
  if (i >= 0) {
    const before = lines[i];
    lines[i] = lines[i].split('GAS_URL=API_URL_DEFAULT').join("GAS_URL=''")
      .split("&&o.kind==='confirm'&&o.payload.pdf)").join("&&o.kind==='confirm'&&o.payload.pdf&&GAS_URL)")
      .split("if(FS_ON||CF_ON)api('gasSettings'").join("if(GAS_URL&&(FS_ON||CF_ON))api('gasSettings'");
    console.log('site patch:', before === lines[i] ? 'NOT APPLIED' : 'applied');
    src = lines.join('\n');
  }
}
const RUN = path.join(process.env.RUN_DIR || '/opt/implant/data', '.worker.run.mjs');
fs.writeFileSync(RUN, src, { mode: 0o600 });
const worker = (await import(pathToFileURL(RUN).href + '?t=' + Date.now())).default;
const env = { DB };
console.log(`implant-plan: db=${DBF} import=${KEY ? 'ON' : 'off'} backup=${BH ? 'on' : 'off'}`);

/* ---------- http ---------- */
const MAX = 25 * 1024 * 1024;
http.createServer(async (req, res) => {
  try {
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > MAX) { res.writeHead(413).end(); return; } chunks.push(c); }
    const h = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (k !== 'cf-connecting-ip') h.set(k, Array.isArray(v) ? v.join(', ') : v);
    const peer = String(req.socket.remoteAddress || ''), local = peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1';
    h.set('CF-Connecting-IP', String((local && req.headers['x-real-ip']) || peer));
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const url = `${proto}://${req.headers.host || 'localhost'}${req.url}`;
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
    const r = await worker.fetch(new Request(url, { method: req.method, headers: h, body }), env, { waitUntil() {}, passThroughOnException() {} });
    const hd = {}; r.headers.forEach((v, k) => { hd[k] = v; });
    res.writeHead(r.status, hd);
    res.end(req.method === 'HEAD' || !r.body ? undefined : Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error(e); if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'server' }));
  }
}).listen(PORT, HOST, () => console.log(`listening ${HOST}:${PORT}`));

const stop = () => { try { sq.close(); } catch {} process.exit(0); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);
