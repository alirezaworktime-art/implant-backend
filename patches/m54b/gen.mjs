// builds patch-m54b.mjs from css.css + client.js + srv.js. Input: the m54a bundle.
import fs from 'node:fs'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const r = f => fs.readFileSync(path.join(D, f), 'utf8');
const tpl = `// patch-m54b (owner, 2026-11-18): patients waiting for the settlement of a surgery cost difference are reception's work, not the consultant's. See SPEC.md.
// Input: the m54a bundle. Usage: node patch-m54b.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = ${JSON.stringify(r('css.css'))}, JS = ${JSON.stringify(r('client.js'))}, SRV = ${JSON.stringify(r('srv.js'))};
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m54a (')) throw new Error('needs the m54a bundle');
  if (h.includes('---------- m54b (')) throw new Error('already m54b');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, "K.push(['تسویه اختلاف',QITEMS.filter(x=>x.settle==='pending').length,'bad']);", "", 'consultant kpi settle');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
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
console.log('m54b patched ok');
`;
fs.writeFileSync(path.join(D, 'patch-m54b.mjs'), tpl); console.log('wrote patch-m54b.mjs', tpl.length);
