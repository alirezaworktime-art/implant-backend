// Local development server: builds the bundle, runs it with the same Node + node:sqlite layer as the Iran server,
// on a local database (dev-data/dev.db), and seeds development passwords for every role.
// Usage: node scripts/dev.mjs [--port 8787] [--fresh]     then open http://127.0.0.1:8787/
import { spawn, execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite';
const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = Number(arg('--port', process.env.PORT || 8787)), FE = arg('--frontend', path.join(root, '..', 'impyar-frontend')), TAB = arg('--tablet', path.join(root, '..', 'impyar-tablet'));
const data = path.join(root, 'dev-data'), app = path.join(data, 'app'), db = path.join(data, 'dev.db');
fs.mkdirSync(app, { recursive: true });
if (process.argv.includes('--fresh')) for (const f of [db, db + '-wal', db + '-shm']) fs.rmSync(f, { force: true });
execFileSync(process.execPath, [path.join(root, 'scripts', 'build-bundle.mjs'), FE, TAB, path.join(app, 'worker.js')], { stdio: 'inherit' });
/* development passwords — for this local database only */
export const DEV_PW = { staff: 'dev-staff', doctor: 'dev-doctor', consultant: 'dev-consult', surgery: 'dev-surgery', manager: 'dev-manager', lab: 'dev-lab', inventory: 'dev-stock', accountant: 'dev-acc' };
const p = spawn(process.execPath, ['--no-warnings', path.join(root, 'ops', 'iran-server', 'server.mjs')], { env: { ...process.env, APP_DIR: app, DB_FILE: db, RUN_DIR: data, PORT: String(PORT), HOST: '127.0.0.1', IMPORT_KEY: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
let up = false; p.stdout.on('data', async d => { process.stdout.write(d); if (up || !/listening/.test(String(d))) return; up = true;
  const u = `http://127.0.0.1:${PORT}/`; await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ping' }) }).catch(() => {});
  const s = new DatabaseSync(db), sha = t => crypto.createHash('sha256').update(t).digest('hex');
  for (const [r, pw] of Object.entries(DEV_PW)) s.prepare("INSERT OR IGNORE INTO kv (k, v, t) VALUES (?, ?, 0)").run('pw:' + r, sha('ipk|' + pw)); s.close();
  console.log(`\n  dev server: ${u}\n  passwords (local only): ${Object.entries(DEV_PW).map(([r, v]) => r + '=' + v).join('  ')}\n`); });
p.on('exit', c => process.exit(c ?? 0)); process.on('SIGINT', () => p.kill('SIGTERM'));
