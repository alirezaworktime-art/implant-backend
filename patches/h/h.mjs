// local harness: runs a worker bundle via server.mjs on a fresh DB; seeds test role passwords (test-only, not real)
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite';
export const PW = { staff: 'tstaff1xx', doctor: 'tdoc1xxxx', consultant: 'tcons1xxx', surgery: 'tsurg1xxx', manager: 'tmgr1xxxx', lab: 'tlab1xxxx', inventory: 'tinv1xxxx', accountant: 'tacc1xxxx' };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
export async function start(o = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h-')), app = path.join(dir, 'app'); fs.mkdirSync(app);
  fs.copyFileSync(process.env.WORKER, path.join(app, 'worker.js'));
  const port = 18000 + Math.floor(Math.random() * 2000), db = path.join(dir, 'd.db');
  const p = spawn(process.execPath, ['--no-warnings', new URL('./server.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')], { env: { ...process.env, APP_DIR: app, DB_FILE: db, RUN_DIR: dir, PORT: String(port), HOST: '127.0.0.1', IMPORT_KEY: '', BACKUP_HASH: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', d => log += d); p.stderr.on('data', d => log += d);
  for (let i = 0; i < 150 && !/listening/.test(log); i++) await new Promise(r => setTimeout(r, 100));
  const url = `http://127.0.0.1:${port}/`;
  const call = async (role, action, body = {}) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: role ? PW[role] : undefined, ...body }) })).json();
  await call(null, 'ping');
  const s = new DatabaseSync(db); for (const [r, pw] of Object.entries(PW)) s.prepare("INSERT OR REPLACE INTO kv (k, v, t) VALUES (?, ?, 0)").run('pw:' + r, sha('ipk|' + pw)); s.close();
  await call('manager', 'userSave', { u: { name: 'حسابدار تست', role: 'accountant', pw: PW.accountant } });
  return { url, call, sql: q => { const d = new DatabaseSync(db); try { return d.prepare(q).all() } finally { d.close() } }, stop: () => p.kill('SIGTERM'), log: () => log };
}
