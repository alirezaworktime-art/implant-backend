// Full regression, cross-platform (PowerShell, cmd, Git Bash, Linux): node scripts/reg-all.mjs <bundle> <tag>
// Same tests, same order, same output as patches/reg-all.sh (which stays as it is): the list is read from that file,
// 4 parallel streams (REG_STREAMS to change), 580 s per test (REG_TIMEOUT, seconds), output patches/reg-<tag>.out.
// Differences, only where reg-all.sh cannot work on Windows: --import shims are file:// URLs, CHROME is found like
// scripts/run-test.mjs, a timeout kills the whole process tree (Chrome and test servers too), and a summary line is printed.
// Exit code 0 as before; results are in the .out file. OLD (bundle for t-m41b) can be set in the environment.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const W = path.join(root, 'patches');
const [bundle, tag] = process.argv.slice(2);
if (!bundle || !tag) { console.error('usage: node scripts/reg-all.mjs <bundle> <tag>'); process.exit(2); }
const B = path.resolve(bundle);
if (!fs.existsSync(B)) { console.error('bundle not found: ' + B); process.exit(2); }

// the test list: the L=( ... ) array of patches/reg-all.sh, one source of truth
const sh = fs.readFileSync(path.join(W, 'reg-all.sh'), 'utf8').replace(/\r/g, '');
const m = sh.match(/^L=\((.*)\)\s*$/m);
if (!m) { console.error('test list L=( … ) not found in patches/reg-all.sh'); process.exit(2); }
const L = [...m[1].matchAll(/"([^"]*)"/g)].map(x => x[1].trim().split(/\s+/));
const EXPECT = Number(process.env.REG_EXPECT || 90);
if (L.length !== EXPECT || L.some(e => e.length !== 3)) { console.error(`test list: read ${L.length} entries (expected ${EXPECT}, each "kind dir file")`); process.exit(2); }

const STREAMS = Math.max(1, Number(process.env.REG_STREAMS || 4)), TIMEOUT = Number(process.env.REG_TIMEOUT || 580) * 1000;
const env = { ...process.env, WORKER: B, OLD: process.env.OLD || path.join(W, 'clean', 'm41-clean.mjs') };
if (!env.CHROME && process.platform === 'win32') { // same as scripts/run-test.mjs
  const pf = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const c = pf.flatMap(d => [d + '\\Google\\Chrome\\Application\\chrome.exe', d + '\\Microsoft\\Edge\\Application\\msedge.exe']).find(p => fs.existsSync(p));
  if (c) env.CHROME = c;
}
const shim = f => url.pathToFileURL(path.join(W, f)).href;
const killTree = p => { try { if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); else process.kill(-p.pid, 'SIGTERM'); } catch { } };

// one test: like one() in reg-all.sh — keep lines matching ^FAIL|ALL OK|FAILED|ERR|Error, each cut to 260 chars, joined by spaces
const KEEP = /^FAIL|ALL OK|FAILED|ERR|Error/;
const one = ([kind, dir, file]) => new Promise(res => {
  const args = ['--no-warnings', '--import', shim('m23/sameday-shim.mjs'), ...(kind === 'run' ? ['--import', shim('m39/lab-old-shim.mjs')] : []), file];
  const p = spawn(process.execPath, args, { cwd: path.join(W, dir), env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let buf = '';
  p.stdout.on('data', d => buf += d); p.stderr.on('data', d => buf += d);
  const t = setTimeout(() => killTree(p), TIMEOUT);
  p.on('close', () => { clearTimeout(t); const out = buf.replace(/\r/g, '').split('\n').filter(l => KEEP.test(l)).map(l => l.slice(0, 260)).join(' ');
    res(`== ${file}: ${out ? out + ' ' : 'NO OUTPUT'}`); }); // trailing space as in reg-all.sh (tr '\n' ' ')
  p.on('error', e => { clearTimeout(t); res(`== ${file}: ERR spawn ${e.message}`); });
});

const O = path.join(W, 'reg-' + tag); fs.mkdirSync(O, { recursive: true });
for (const f of fs.readdirSync(O)) if (f.endsWith('.out')) fs.rmSync(path.join(O, f));
const t0 = Date.now();
await Promise.all(Array.from({ length: STREAMS }, async (_, s) => {
  const f = path.join(O, `s${s}.out`);
  for (let i = s; i < L.length; i += STREAMS) { const line = await one(L[i]); fs.appendFileSync(f, line + '\n'); console.log(line.slice(0, 160)); }
  fs.appendFileSync(f, 'DONE\n');
}));
const all = Array.from({ length: STREAMS }, (_, s) => fs.readFileSync(path.join(O, `s${s}.out`), 'utf8')).join('') + 'ALLDONE\n';
fs.writeFileSync(path.join(W, `reg-${tag}.out`), all);
const lines = all.split('\n').filter(l => l.startsWith('== '));
const ok = lines.filter(l => /ALL OK/.test(l) && !/FAIL|ERR|Error/.test(l)).length;
const none = lines.filter(l => l.endsWith('NO OUTPUT')).length;
console.log(`summary: ${lines.length} tests, ${ok} ALL OK, ${lines.length - ok - none} with FAIL/ERR, ${none} no output, ${Math.round((Date.now() - t0) / 1000)} s → patches/reg-${tag}.out`);
