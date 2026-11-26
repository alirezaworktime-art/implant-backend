// t-m41b (server): paper file — earlier payments above the cost leave a credit; «تسویه» / remaining debt unchanged; files stored under the old rule recomputed once.
// Run: OLD=<m41 bundle> WORKER=<m41b bundle> node t-m41b.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite';
import { start, uuid, PW } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 300) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const yd = new Date(Date.now() - 3 * 864e5 + 3.5 * 36e5).toISOString().slice(0, 10), old = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
const L = (price = 10000000) => [{ id: 'l' + uuid().slice(0, 10), k: 'imp', day: old, doc: 'دکتر نمونه', teeth: ['UR6'], n: 1, price, imp: { UR6: { b: 'Root', d: '4', l: '10' } } }];
const pay = a => [{ id: 'p' + uuid().slice(0, 12), amount: a, day: yd, meth: 'cash', note: '' }];
const mkWith = h => (name, extra, lines, pays) => h.call('staff', 'fxArc', { id: '', by: 'منشی', ackDup: 1, ackFile: 1, arc: Object.assign({ v6: 1, name, phone: '0913' + String(1000000 + Math.floor(Math.random() * 8999999)), nid: '', age: '40', city: 'یزد', doc: 'دکتر نمونه', pfile: '', lines, pays, disc: {}, settled: false, rem: '' }, extra) });
const balWith = sql => id => { const o = sql(`select total, data from plans where id='${id}'`)[0], a = JSON.parse(o.data).arc, paid = sql(`select coalesce(sum(amount),0) s from pays where plan='${id}' and st='ok'`)[0].s; return { total: o.total, paid, credit: Math.max(0, paid - o.total), rest: o.total - paid, vt: a.vt, imp: a.imp, over: a.over || 0, net: a.net } };
const NEW = process.env.WORKER, OLD = process.env.OLD;
try {
  // ---- new rule
  const h = await start(), mk = mkWith(h), bal = balWith(h.sql);
  let r = await mk('نمونه یک', {}, L(), pay(13000000)); ok(r.ok, 'paper file saved', r);
  if (r.ok) { const b = bal(r.id); ok(b.total === 10000000 && b.credit === 3000000 && b.over === 0, 'no mark, paid 13 on cost 10 → credit 3,000,000, total stays 10', b);
    ok(h.sql(`select count(*) n from refunds where plan='${r.id}'`)[0].n === 0, 'credit does not enter the refund list');
    const g = await h.call('consultant', 'get', { id: r.id }); ok(g && g.ok !== false, 'file opens for the consultant', g && g.error);
    const q = await h.call('consultant', 'queue', { ver: '', qh: '' }); ok(!(q.rfd || []).some(x => x.plan === r.id), 'not in «منتظر برگشت پول»'); }
  r = await mk('نمونه دو', { disc: { c: { m: 'a', v: '1040000' }, d: { m: 'a', v: '' } } }, L(30500000), pay(30000000));
  if (r.ok) { const b = bal(r.id); ok(b.net === 29460000 && b.total === 29460000 && b.credit === 540000 && b.over === 0, 'owner case: 30,500,000 − 1,040,000 discount, paid 30,000,000 → credit 540,000', b) } else ok(false, 'save owner case', r);
  r = await mk('نمونه سه', { settled: true }, L(), pay(15000000)); if (r.ok) { const b = bal(r.id); ok(b.credit === 0 && b.rest === 0 && b.total === 15000000 && b.over === 5000000, '«حساب تسویه است», paid more → zero as before', b) } else ok(false, 'save 3', r);
  r = await mk('نمونه چهار', { rem: '2000000' }, L(), pay(12000000)); if (r.ok) { const b = bal(r.id); ok(b.credit === 0 && b.rest === 2000000 && b.total === 14000000, 'remaining debt of the file kept (2,000,000) as before', b) } else ok(false, 'save 4', r);
  r = await mk('نمونه پنج', {}, L(), pay(4000000)); if (r.ok) { const b = bal(r.id); ok(b.rest === 6000000 && b.total === 10000000 && !b.over, 'paid less → debt as before', b) } else ok(false, 'save 5', r);
  r = await mk('نمونه شش', { settled: true }, L(), pay(4000000)); if (r.ok) { const b = bal(r.id); ok(b.rest === 0 && b.total === 4000000 && !b.over, 'settled, paid less → as before', b) } else ok(false, 'save 6', r);
  r = await mk('نمونه هفت', {}, L(), pay(10000000)); if (r.ok) { const b = bal(r.id); ok(b.rest === 0 && b.credit === 0 && !b.over, 'paid exactly the cost → zero', b) } else ok(false, 'save 7', r);
  // a later payment on a credit file keeps the credit growing, an edit keeps the rule
  h.stop();
  // ---- migration: files stored by the old bundle
  if (!OLD) { ok(false, 'OLD bundle not given — migration not tested'); }
  else {
    process.env.WORKER = OLD; const before = new Set(fs.readdirSync(os.tmpdir()).filter(n => n.startsWith('au-')));
    const h1 = await start(), mk1 = mkWith(h1), bal1 = balWith(h1.sql);
    const dir = path.join(os.tmpdir(), fs.readdirSync(os.tmpdir()).filter(n => n.startsWith('au-') && !before.has(n))[0]), dbf = path.join(dir, 'd.db');
    const a = await mk1('قدیمی یک', {}, L(), pay(13000000)), b = await mk1('قدیمی دو', { settled: true }, L(), pay(15000000)), c = await mk1('قدیمی سه', { rem: '2000000' }, L(), pay(12000000)), d = await mk1('قدیمی چهار', {}, L(), pay(4000000));
    ok(a.ok && b.ok && c.ok && d.ok, 'old bundle: four files saved'); const o1 = bal1(a.id); ok(o1.total === 13000000 && o1.over === 3000000 && o1.credit === 0, 'old bundle raised the total (old rule)', o1);
    h1.stop(); await new Promise(r => setTimeout(r, 600));
    const app = path.join(dir, 'app2'); fs.mkdirSync(app); fs.copyFileSync(NEW, path.join(app, 'worker.js')); const port = 23000 + Math.floor(Math.random() * 1500);
    const p = spawn(process.execPath, ['--no-warnings', new URL('../audit/server-clock.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')], { env: { ...process.env, APP_DIR: app, DB_FILE: dbf, RUN_DIR: dir, PORT: String(port), HOST: '127.0.0.1', IMPORT_KEY: '', BACKUP_HASH: '', CLOCK: path.join(dir, 'clock') }, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; p.stdout.on('data', x => log += x); p.stderr.on('data', x => log += x); for (let i = 0; i < 150 && !/listening/.test(log); i++) await new Promise(r => setTimeout(r, 100));
    const call = async (role, action, body = {}) => (await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: PW[role], ...body }) })).json();
    const sql = q => { const s = new DatabaseSync(dbf); try { return s.prepare(q).all() } finally { s.close() } }, bal2 = balWith(sql);
    const pg = await call('staff', 'ping'); ok(pg && pg.ok, 'new bundle answers on the old database', pg && pg.error);
    const n1 = bal2(a.id); ok(n1.total === 10000000 && n1.credit === 3000000 && n1.over === 0, 'old file (no mark) → now credit 3,000,000', n1);
    const n2 = bal2(b.id); ok(n2.total === 15000000 && n2.credit === 0, 'old settled file unchanged', n2);
    const n3 = bal2(c.id); ok(n3.total === 14000000 && n3.rest === 2000000, 'old file with remaining debt unchanged', n3);
    const n4 = bal2(d.id); ok(n4.total === 10000000 && n4.rest === 6000000, 'old file with debt unchanged', n4);
    const flag = sql(`select v from kv where k='m41bArc'`)[0]; ok(flag && flag.v, 'migration flag stored', flag);
    const up = sql(`select updatedAt u from plans where id='${a.id}'`)[0].u; await call('staff', 'ping'); await call('consultant', 'queue', { ver: '', qh: '' });
    ok(sql(`select updatedAt u from plans where id='${a.id}'`)[0].u === up, 'migration does not run again');
    p.kill('SIGTERM');
  }
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 500)); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
