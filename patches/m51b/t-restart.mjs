// repro: a publish (service restart with a new bundle) while reception is typing a paper file. OLD=<bundle> NEW=<bundle> node t-restart.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs');
const W = ms => new Promise(r => setTimeout(r, ms)); const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'au-')), app = path.join(dir, 'app'); fs.mkdirSync(app);
const port = 23000 + Math.floor(Math.random() * 900), db = path.join(dir, 'd.db'), clock = path.join(dir, 'clock'); fs.writeFileSync(clock, '0');
const url = `http://127.0.0.1:${port}/`; let p, log = '';
async function up(bundle) { fs.copyFileSync(bundle, path.join(app, 'worker.js')); log = '';
  p = spawn(process.execPath, ['--no-warnings', '--import', '/home/claude/w/m23/sameday-shim.mjs', '/home/claude/w/audit/server-clock.mjs'], { env: { ...process.env, APP_DIR: app, DB_FILE: db, RUN_DIR: dir, PORT: String(port), HOST: '127.0.0.1', IMPORT_KEY: '', BACKUP_HASH: '', CLOCK: clock }, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', d => log += d); p.stderr.on('data', d => log += d); for (let i = 0; i < 150 && !/listening/.test(log); i++) await W(100) }
const call = async (role, action, body = {}) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: role ? A.PW[role] : undefined, ...body }) })).json();
await up(process.env.OLD); await call(null, 'ping');
{ const s = new DatabaseSync(db); for (const [r, pw] of Object.entries(A.PW)) s.prepare("INSERT OR REPLACE INTO kv (k, v, t) VALUES (?, ?, 0)").run('pw:' + r, sha('ipk|' + pw)); s.close() }
const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await br.newContext({ viewport: { width: 1180, height: 860 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, x => x.abort()); const pg = await c.newPage(); const PE = []; pg.on('pageerror', e => PE.push(e.message.slice(0, 200))); pg.on('dialog', d => { console.log('DIALOG', d.type(), d.message().slice(0, 120)); d.accept().catch(() => { }) });
await pg.goto(url); await pg.click('[data-lrole="staff"]'); await pg.fill('#lg_pw', A.PW.staff); await pg.click('#lgGo'); await W(3000); await pg.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
await pg.evaluate(() => a6Open(null)); await W(2500);
await pg.fill('[data-a6h="name"]', 'نمونه آزمایشی'); await pg.click('[data-a6h="pfile"]'); await pg.keyboard.type('5566'); await pg.click('[data-a6h="phone"]'); await pg.keyboard.type('09120000000'); await W(4000);
const st = async tag => console.log(tag, JSON.stringify(await pg.evaluate(() => { const vis = id => { const e = document.getElementById(id); return !!e && !e.hidden }; const q = s => (document.querySelector(s) || {}).value;
  return { arc6: vis('viewArc6'), login: vis('viewLogin'), A6: typeof A6 !== 'undefined' && A6 ? { name: A6.name, pfile: A6.pfile, dirty: A6.dirty } : null, name: q('[data-a6h="name"]'), pfile: q('[data-a6h="pfile"]'), bar: !!document.getElementById('lf3Bar'), role: typeof ROLE !== 'undefined' ? ROLE : '?', toast: (document.getElementById('toast') || {}).hidden ? '' : (document.getElementById('toast') || {}).textContent, sheets: [...document.querySelectorAll('.sheet:not([hidden]),.uxask:not([hidden])')].map(x => x.id).slice(0, 5), draft: Object.keys(localStorage).filter(k => /M4A6/.test(k)) } })));
await st('before  ');
p.kill('SIGTERM'); await W(2500); await st('down    '); await up(process.env.NEW); await st('up      ');
for (let i = 1; i <= 5; i += 1) { await W(15000); await st('+' + i * 15 + 's   ') }
await pg.click('#lf3Go'); await W(6000); await st('reloaded');
await pg.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
await pg.evaluate(() => a6Open(null)); await W(2500); await st('reopened');
console.log('ask', JSON.stringify(await pg.evaluate(() => [...document.querySelectorAll('[id^="ux"]')].filter(e => !e.hidden && e.offsetHeight).map(e => e.id + ':' + e.textContent.slice(0, 140)))));
console.log('pageerrors', JSON.stringify(PE).slice(0, 600));
await br.close(); p.kill('SIGTERM'); process.exit(0);
