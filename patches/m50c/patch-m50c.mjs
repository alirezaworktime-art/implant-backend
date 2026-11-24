// patch-m50c (owner, 2026-11-18): surgery sheet — «فیل اولیه» is the last choice of the treatment row. Page only. See SPEC.md.
// Input: the m50b bundle. Usage: node patch-m50c.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = "/* ---------- m50c ---------- */\n#sgPick2 .chip.m50cpf{border-style:dashed}\n", JS = "/* ---------- m50c (owner, 2026-11-18): surgery day — the «فیل اولیه» choice moves from the plan treatments (right panel, beside «پایه ایمپلنت»)\n   to the top of the out-of-plan list (left panel): it is recorded only if it happens. Page only. ---------- */\nfunction m50cPf() { try { const B = $('sgPick2'); if (!B) return; const pf = document.querySelector('#sgPick [data-m31pf],#sgPick2 [data-m31pf]'); if (!pf) return; pf.classList.add('m50cpf'); const hd = B.querySelector('.sgh'), first = hd ? hd.nextElementSibling : B.firstElementChild; if (first !== pf) { if (hd) hd.insertAdjacentElement('afterend', pf); else B.insertBefore(pf, B.firstElementChild) } } catch (e) { } }\n{ const _p = renderPick; renderPick = function () { const r = _p.apply(this, arguments); m50cPf(); return r } }\n", SRV = "/* ---------- m50c (owner, 2026-11-18): page only — «فیل اولیه» moved to the end of the treatment row of the surgery sheet. No server change. ---------- */\n";
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m50b (')) throw new Error('needs the m50b bundle');
  if (h.includes('---------- m50c (')) throw new Error('already m50c');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  return h;
}
function patchServer(s, code) { const a = NL + 'export default {', c = s.split(a).length - 1; if (code && c === 0) { CODE_SKIP.push('srv block'); return s; } if (c !== 1) throw new Error('anchor srv block' + (code ? ' (CODE)' : '') + ': ' + c);
  return s.split(a).join(NL + SRV + NL + 'export default {'); }
const lines = src.split(NL);
const ai = lines.findIndex(l => l.startsWith('const ASSETS='));
const A = JSON.parse(lines[ai].slice('const ASSETS='.length).replace(/;\s*$/, ''));
if (A['/'].d !== A['/index.html'].d) throw new Error('index copies differ');
A['/'].d = A['/index.html'].d = patchHtml(A['/'].d);
lines[ai] = 'const ASSETS=' + JSON.stringify(A) + ';';
const ci = lines.findIndex(l => l.startsWith('const CODE='));
if (ci >= 0) { const C = JSON.parse(lines[ci].slice('const CODE='.length).replace(/;\s*$/, '')); if (C.files['src/main.js']) C.files['src/main.js'] = patchServer(C.files['src/main.js'], true); lines[ci] = 'const CODE=' + JSON.stringify(C) + ';'; }
const si = lines.findIndex(l => l.startsWith('const ROLE_Q'));
fs.writeFileSync(out, lines.slice(0, si).join(NL) + NL + patchServer(lines.slice(si).join(NL), false));
if (CODE_SKIP.length) console.log('CODE copy - anchors not present:', CODE_SKIP.join(', '));
console.log('m50c patched ok');
