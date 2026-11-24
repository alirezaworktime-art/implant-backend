// patch-m45b (owner, 2026-11-17): discharge — the 60-day limit after the last surgery session is removed. See SPEC.md.
// Input: the m45a bundle. Usage: node patch-m45b.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = "/* ---------- m45b (2026-11-17): discharge without the 60-day limit — page text ---------- */\n", JS = "/* ---------- m45b (owner, 2026-11-17): a patient can be discharged at any time after the last surgery session — the 60-day limit is removed (reception\n   list, the discharge itself and its checks). Prosthesis work still starts by itself after day 60 if the patient was never discharged. ---------- */\n", SRV = "/* ---------- m45b (owner, 2026-11-17): discharge has no 60-day limit any more (four places above were changed in place); pr2InDis keeps day 60 so\n   prosthesis rows of a never-discharged patient still appear after two months. ---------- */\n";
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m45a (')) throw new Error('needs the m45a bundle');
  if (h.includes('---------- m45b (')) throw new Error('already m45b');
  h = rep(h, P1, Q1, 'reception list');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  return h;
}
const A1 = "args.push(addDays(-60) > '2026-10-18' ? addDays(-60) : '2026-10-18');";
const B1 = "args.push('2026-10-18'); /* m45b: no 60-day limit */";
const A2 = "|| !sg.lastDay || sg.lastDay < addDays(-60)) return { ok: false, error: 'از جراحی این بیمار بیش از ۶۰ روز گذشته است.' };";
const B2 = "|| !sg.lastDay) return { ok: false, error: 'این بیمار در مرحله‌ی ترخیص نیست.' }; /* m45b */";
const A3 = "|| !sg.lastDay || sg.lastDay < addDays(-60)) return '';";
const B3 = "|| !sg.lastDay) return ''; /* m45b */";
const A4 = "|| !sg.lastDay || sg.lastDay < addDays(-60) || sg.dis) return true;";
const B4 = "|| !sg.lastDay || sg.dis) return true; /* m45b */";
const P1 = "x.sg.lastDay&&dDiff(tDay(),x.sg.lastDay)<=60&&!x.sg.dis);";
const Q1 = "x.sg.lastDay&&!x.sg.dis);/* m45b: no 60-day limit */";
function patchServer(s, code) { const a = NL + 'export default {', c = s.split(a).length - 1; if (code && c === 0) { CODE_SKIP.push('srv block'); return s; } if (c !== 1) throw new Error('anchor srv block' + (code ? ' (CODE)' : '') + ': ' + c);
  for (const [a, b, l] of [[A1, B1, 'list'], [A2, B2, 'discharge'], [A3, B3, 'rx'], [A4, B4, 'bad']]) { if (code && s.split(a).length - 1 !== 1) { CODE_SKIP.push(l); continue; } s = rep(s, a, b, l); }
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
console.log('m45b patched ok');
