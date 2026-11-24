// builds patch-m47a.mjs from css.css + client.js + srv.js. Input: the m46c bundle.
import fs from 'node:fs'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const r = f => fs.readFileSync(path.join(D, f), 'utf8');
const tpl = `// patch-m47a (owner, 2026-11-17): prosthesis session — «ارسال کار برای لابراتوار» opens the lab work order, no mandatory field. See SPEC.md.
// Input: the m46c bundle. Usage: node patch-m47a.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = ${JSON.stringify(r('css.css'))}, JS = ${JSON.stringify(r('client.js'))}, SRV = ${JSON.stringify(r('srv.js'))};
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m46c (')) throw new Error('needs the m46c bundle');
  if (h.includes('---------- m47a (')) throw new Error('already m47a');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  return h;
}
const A1 = "if (!d.teeth.length && !d.note) return { ok: false, error: 'دندان‌ها یا توضیح سفارش را مشخص کنید.' };";
const B1 = "if (!(req.order && req.order.m47) && !d.teeth.length && !d.note) return { ok: false, error: 'دندان‌ها یا توضیح سفارش را مشخص کنید.' };";
const A2 = "{ const M4 = pr.map || {}, K4 = Object.keys(M4);";
const B2 = "if (!(req.order && req.order.m47)) { const M4 = pr.map || {}, K4 = Object.keys(M4);";
function patchServer(s, code) { const a = NL + 'export default {', c = s.split(a).length - 1; if (code && c === 0) { CODE_SKIP.push('srv block'); return s; } if (c !== 1) throw new Error('anchor srv block' + (code ? ' (CODE)' : '') + ': ' + c);
  for (const [a, b, l] of [[A1, B1, 'labNew teeth-or-note'], [A2, B2, 'labNew map']]) { if (code && s.split(a).length - 1 !== 1) { CODE_SKIP.push(l); continue; } s = rep(s, a, b, l); }
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
console.log('m47a patched ok');
`;
fs.writeFileSync(path.join(D, 'patch-m47a.mjs'), tpl); console.log('wrote patch-m47a.mjs', tpl.length);
