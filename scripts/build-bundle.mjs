// Builds the single worker bundle (site + API) that runs on the Iran server (Node + node:sqlite D1 shim) and on Cloudflare.
// Usage: node scripts/build-bundle.mjs <path-to-impyar-frontend> <path-to-impyar-tablet> [out=dist/worker.mjs] [--target iran|cloudflare]
// --target cloudflare uses IMPORT_KEY_CF (the key the nightly Iran → Cloudflare copy uses); iran (default) uses IMPORT_KEY (keep '').
// Secrets come from secrets/local.mjs (git-ignored); without it the bundle has no passwords (nobody can log in).
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const here = path.dirname(url.fileURLToPath(import.meta.url)), root = path.join(here, '..');
const av = process.argv.slice(2), ti = av.indexOf('--target'), target = ti >= 0 ? av.splice(ti, 2)[1] : 'iran';
const gi = av.indexOf('--tag'), tag = gi >= 0 ? av.splice(gi, 2)[1] : ''; // release name, e.g. r1: the page gets the marker «---------- r1 (» that the deploy checks look for
const [fe, tab, out = path.join(root, 'dist', 'worker.mjs')] = av;
if (!fe || !tab) { console.error('usage: node scripts/build-bundle.mjs <frontend dir> <tablet dir> [out]'); process.exit(2); }
let S = { PW_HASH: {}, BACKUP_HASH: '', IMPORT_KEY: '', SENDER: 'user@example.com', APPS_SCRIPT_DEPLOYMENT_ID: 'APPS_SCRIPT_DEPLOYMENT_ID', LF_DEF: { lfdoc: 'dev-lfdoc', lflab: 'dev-lflab' } };
const sec = path.join(root, 'secrets', 'local.mjs'); if (fs.existsSync(sec)) S = Object.assign(S, (await import(url.pathToFileURL(sec))).default);
const T = (f, enc) => fs.readFileSync(path.join(fe, f), enc);
const faN = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const phone = t => { for (const [k, v] of Object.entries(S.PHONES || {})) if (v) t = t.split(k).join(v).split(faN(k)).join(faN(v)); return t; };
const mail = t => t.split('sender@example.com').join(S.SENDER || 'sender@example.com').split('recipient@example.com').join(S.EMAIL_HINT || 'recipient@example.com');
const gas = t => mail(phone(S.APPS_SCRIPT_DEPLOYMENT_ID ? t.split('APPS_SCRIPT_DEPLOYMENT_ID').join(S.APPS_SCRIPT_DEPLOYMENT_ID) : t));
const H = 'text/html; charset=utf-8', J = 'text/javascript; charset=utf-8', P = 'image/png';
const txt = (t, d) => ({ t, d, b: 0 }), bin = (t, buf) => ({ t, d: buf.toString('base64'), b: 1 });
// the site files come from impyar-frontend (tools/assets.mjs knows its pages, routes and build-time values); the tablet
// app from impyar-tablet. Frontend commits from before the src/ split have no tools/assets.mjs: the old layout below.
const feTool = path.join(fe, 'tools', 'assets.mjs'), apk = bin('application/vnd.android.package-archive', fs.readFileSync(path.join(tab, 'dist', 'implant-plan.apk')));
let A;
if (fs.existsSync(feTool)) A = (await import(url.pathToFileURL(feTool))).siteAssets({ values: S, tag, apk });
else {
let index = gas(T('index.html', 'utf8'));
if (tag) { let sha = ''; try { sha = (await import('node:child_process')).execFileSync('git', ['-C', fe, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { }
  const k = index.lastIndexOf('</body>'); index = index.slice(0, k) + `<!-- ---------- ${tag} (repo build${sha ? ' frontend ' + sha : ''}) -->\n` + index.slice(k); }
A = {
  '/': txt(H, index),
  '/manifest.webmanifest': txt('application/manifest+json; charset=utf-8', T('manifest.webmanifest', 'utf8')),
  '/sw.js': txt(J, T('sw.js', 'utf8')),
  '/p': txt(H, gas(T('p.html', 'utf8'))),
  '/probe': txt(H, gas(T('probe.html', 'utf8'))),
  '/icon-192.png': bin(P, T('icons/icon-192.png')), '/icon-512.png': bin(P, T('icons/icon-512.png')),
  '/icon-maskable-512.png': bin(P, T('icons/icon-maskable-512.png')), '/apple-touch-icon.png': bin(P, T('icons/apple-touch-icon.png')),
  '/implant-plan.apk': apk,
  '/index.html': txt(H, index),
  '/f': { t: H, d: gas(T('f.html', 'utf8')) },
  '/pdf.min.mjs': txt(J, T('vendor/pdfjs/pdf.min.mjs', 'utf8')), '/pdf.worker.min.mjs': txt(J, T('vendor/pdfjs/pdf.worker.min.mjs', 'utf8'))
};
}
const head = phone(fs.readFileSync(path.join(root, 'src', 'header.js'), 'utf8'))
  .replace('__PW_HASH__', '{' + Object.entries(S.PW_HASH).map(([k, v]) => `'${k}':'${v}'`).join(',') + '}')
  .replace('__IMPORT_KEY__', `'${target === 'cloudflare' ? (S.IMPORT_KEY_CF || '') : S.IMPORT_KEY}'`).replace('__SENDER__', `'${S.SENDER}'`);
// embedded source copy for the daily backup (code.files): secrets/code.txt from scripts/code-from-bundle.mjs (git-ignored); without it the bundle has none
const codeF = path.join(root, 'secrets', 'code.txt'), CODE = fs.existsSync(codeF) ? fs.readFileSync(codeF, 'utf8') + '\n' : '';
const bundle = head + 'const ASSETS=' + JSON.stringify(A) + ';\n' + `const BACKUP_HASH='${S.BACKUP_HASH}';\n` + CODE + mail(fs.readFileSync(path.join(root, 'src', 'server.js'), 'utf8')).replace('__LF_DEF__', '{ ' + Object.entries(S.LF_DEF).map(([k, v]) => `${k}: '${v}'`).join(', ') + ' }');
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, bundle); console.log('wrote', out, bundle.length, 'bytes');
