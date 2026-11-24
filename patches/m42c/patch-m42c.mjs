// patch-m42c (2026-11-17): the floating save bar (m41) flickered and stayed hidden on phones when the save row is not the very last thing of a long page
// (paper-file editor: «ثبت پرونده در بایگانی» is followed by the notes block). Page only. See SPEC.md.
// Input: the m42b bundle. Usage: node patch-m42c.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const A1 = 'if(by<document.documentElement.scrollHeight-Math.max(700,innerHeight))return null;return best}';
const B1 = "const pad=document.body.classList.contains('m41dock')?84:0;if(by<document.documentElement.scrollHeight-pad-Math.max(700,innerHeight)-400)return null;return best}";
const JS = '/* ---------- m42c (2026-11-17): the floating save bar no longer flickers off when the save row is followed by a short block (paper file on phones): its own padding is not counted and the row may sit up to 400px above the last screen. ---------- */';
function patchHtml(h) {
  if (!h.includes('---------- m42b (')) throw new Error('needs the m42b bundle');
  if (h.includes('---------- m42c (')) throw new Error('already m42c');
  h = rep(h, A1, B1, 'dock rule');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  return h;
}
const lines = src.split(NL);
const ai = lines.findIndex(l => l.startsWith('const ASSETS='));
const A = JSON.parse(lines[ai].slice('const ASSETS='.length).replace(/;\s*$/, ''));
if (A['/'].d !== A['/index.html'].d) throw new Error('index copies differ');
A['/'].d = A['/index.html'].d = patchHtml(A['/'].d);
lines[ai] = 'const ASSETS=' + JSON.stringify(A) + ';';
fs.writeFileSync(out, lines.join(NL));
console.log('m42c patched ok');
