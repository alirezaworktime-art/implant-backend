// Builds the single worker bundle (site + API) that runs on the Iran server (Node + node:sqlite D1 shim) and on Cloudflare.
// Usage: node scripts/build-bundle.mjs <path-to-implant-frontend> <path-to-implant-tablet> [out=dist/worker.mjs]
// Secrets come from secrets/local.mjs (git-ignored); without it the bundle has no passwords (nobody can log in).
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const here = path.dirname(url.fileURLToPath(import.meta.url)), root = path.join(here, '..');
const [fe, tab, out = path.join(root, 'dist', 'worker.mjs')] = process.argv.slice(2);
if (!fe || !tab) { console.error('usage: node scripts/build-bundle.mjs <frontend dir> <tablet dir> [out]'); process.exit(2); }
let S = { PW_HASH: {}, BACKUP_HASH: '', IMPORT_KEY: '', SENDER: 'user@example.com', APPS_SCRIPT_DEPLOYMENT_ID: 'APPS_SCRIPT_DEPLOYMENT_ID', LF_DEF: { lfdoc: '', lflab: '' } };
const sec = path.join(root, 'secrets', 'local.mjs'); if (fs.existsSync(sec)) S = Object.assign(S, (await import(url.pathToFileURL(sec))).default);
const T = (f, enc) => fs.readFileSync(path.join(fe, f), enc);
const gas = t => S.APPS_SCRIPT_DEPLOYMENT_ID ? t.split('APPS_SCRIPT_DEPLOYMENT_ID').join(S.APPS_SCRIPT_DEPLOYMENT_ID) : t;
const H = 'text/html; charset=utf-8', J = 'text/javascript; charset=utf-8', P = 'image/png';
const txt = (t, d) => ({ t, d, b: 0 }), bin = (t, buf) => ({ t, d: buf.toString('base64'), b: 1 });
const index = gas(T('index.html', 'utf8'));
const A = {
  '/': txt(H, index),
  '/manifest.webmanifest': txt('application/manifest+json; charset=utf-8', T('manifest.webmanifest', 'utf8')),
  '/sw.js': txt(J, T('sw.js', 'utf8')),
  '/p': txt(H, gas(T('p.html', 'utf8'))),
  '/probe': txt(H, gas(T('probe.html', 'utf8'))),
  '/icon-192.png': bin(P, T('icons/icon-192.png')), '/icon-512.png': bin(P, T('icons/icon-512.png')),
  '/icon-maskable-512.png': bin(P, T('icons/icon-maskable-512.png')), '/apple-touch-icon.png': bin(P, T('icons/apple-touch-icon.png')),
  '/implant-plan.apk': bin('application/vnd.android.package-archive', fs.readFileSync(path.join(tab, 'dist', 'implant-plan.apk'))),
  '/index.html': txt(H, index),
  '/f': { t: H, d: gas(T('f.html', 'utf8')) },
  '/pdf.min.mjs': txt(J, T('vendor/pdfjs/pdf.min.mjs', 'utf8')), '/pdf.worker.min.mjs': txt(J, T('vendor/pdfjs/pdf.worker.min.mjs', 'utf8'))
};
const head = fs.readFileSync(path.join(root, 'src', 'header.js'), 'utf8')
  .replace('__PW_HASH__', '{' + Object.entries(S.PW_HASH).map(([k, v]) => `'${k}':'${v}'`).join(',') + '}')
  .replace('__IMPORT_KEY__', `'${S.IMPORT_KEY}'`).replace('__SENDER__', `'${S.SENDER}'`);
const bundle = head + 'const ASSETS=' + JSON.stringify(A) + ';\n' + `const BACKUP_HASH='${S.BACKUP_HASH}';\n` + fs.readFileSync(path.join(root, 'src', 'server.js'), 'utf8').replace('__LF_DEF__', '{ ' + Object.entries(S.LF_DEF).map(([k, v]) => `${k}: '${v}'`).join(', ') + ' }');
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, bundle); console.log('wrote', out, bundle.length, 'bytes');
