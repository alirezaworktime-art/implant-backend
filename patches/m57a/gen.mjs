// builds patch-m57a.mjs from css.css + client.js + srv.js. Input: the m55a bundle.
import fs from 'node:fs'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const r = f => fs.readFileSync(path.join(D, f), 'utf8');
const tpl = `// patch-m57a (owner, 2026-11-18): All on X may be Korean too; SMS line in the PDF of a patient who wants to think; the consultant keeps several patients open. See SPEC.md.
// Input: the m55a bundle. Usage: node patch-m57a.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = ${JSON.stringify(r('css.css'))}, JS = ${JSON.stringify(r('client.js'))}, SRV = ${JSON.stringify(r('srv.js'))};
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m55a (')) throw new Error('needs the m55a bundle');
  if (h.includes('---------- m57a (')) throw new Error('already m57a');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  h = rep(h, ">فقط برند ایتالیایی.</p>", ">برند ایتالیایی یا کره‌ای.</p>", 'aox note');
  h = rep(h, "const g=IMPSID==='aox'?'it':(", "const g=IMPSID==='aox'?(SURG.rec.brand==='ko'?'ko':'it'):(", 'surgery aox default brand');
  h = rep(h, "((sid || 'imp') !== 'aox' || c.g === 'it')", "((sid || 'imp') !== 'aox' || c.g === 'it' || c.g === 'ko')", 'surgery aox last brand');
  h = rep(h, "try{(window.M48PB||[]).forEach(b=>blocks.push(b))}catch(e){}", "try{(window.M48PB||[]).forEach(b=>blocks.push(b))}catch(e){}try{(window.M57PB||[]).forEach(b=>blocks.push(b))}catch(e){}", 'pdf sms block');
  return h;
}
function patchServer(s, code) { const a = NL + 'export default {', c = s.split(a).length - 1; if (code && c === 0) { CODE_SKIP.push('srv block'); return s; } if (c !== 1) throw new Error('anchor srv block' + (code ? ' (CODE)' : '') + ': ' + c);
  return s.split(a).join(NL + SRV + NL + 'export default {'); }
const lines = src.split(NL);
const ai = lines.findIndex(l => l.startsWith('const ASSETS='));
const A = JSON.parse(lines[ai].slice('const ASSETS='.length).replace(/;\\s*$/, ''));
if (A['/'].d !== A['/index.html'].d) throw new Error('index copies differ');
A['/'].d = A['/index.html'].d = patchHtml(A['/'].d);
lines[ai] = 'const ASSETS=' + JSON.stringify(A) + ';';
const ci = lines.findIndex(l => l.startsWith('const CODE='));
if (ci >= 0) { const C = JSON.parse(lines[ci].slice('const CODE='.length).replace(/;\\s*$/, '')); if (C.files['src/main.js']) C.files['src/main.js'] = patchServer(C.files['src/main.js'], true); lines[ci] = 'const CODE=' + JSON.stringify(C) + ';'; }
const si = lines.findIndex(l => l.startsWith('const ROLE_Q'));
fs.writeFileSync(out, lines.slice(0, si).join(NL) + NL + patchServer(lines.slice(si).join(NL), false));
if (CODE_SKIP.length) console.log('CODE copy - anchors not present:', CODE_SKIP.join(', '));
console.log('m57a patched ok');
`;
fs.writeFileSync(path.join(D, 'patch-m57a.mjs'), tpl); console.log('wrote patch-m57a.mjs', tpl.length);
