// builds patch-m43a.mjs from css.css + client.js. Input: the m42e bundle. Page only.
import fs from 'node:fs'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const r = f => fs.readFileSync(path.join(D, f), 'utf8');
const tpl = `// patch-m43a (owner, 2026-11-17): plan pricing — «موارد خاص» implants priced by their own brand group, split shown as count × tariff. Page only. See SPEC.md.
// Input: the m42e bundle. Usage: node patch-m43a.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = ${JSON.stringify(r('css.css'))}, JS = ${JSON.stringify(r('client.js'))};
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
function patchHtml(h) {
  if (!h.includes('---------- m42e (')) throw new Error('needs the m42e bundle');
  if (h.includes('---------- m43a (')) throw new Error('already m43a');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  return h;
}
const lines = src.split(NL);
const ai = lines.findIndex(l => l.startsWith('const ASSETS='));
const A = JSON.parse(lines[ai].slice('const ASSETS='.length).replace(/;\\s*$/, ''));
if (A['/'].d !== A['/index.html'].d) throw new Error('index copies differ');
A['/'].d = A['/index.html'].d = patchHtml(A['/'].d);
lines[ai] = 'const ASSETS=' + JSON.stringify(A) + ';';
fs.writeFileSync(out, lines.join(NL));
console.log('m43a patched ok');
`;
fs.writeFileSync(path.join(D, 'patch-m43a.mjs'), tpl); console.log('wrote patch-m43a.mjs', tpl.length);
