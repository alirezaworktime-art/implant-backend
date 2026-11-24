// patch-m54b (owner, 2026-11-18): patients waiting for the settlement of a surgery cost difference are reception's work, not the consultant's. See SPEC.md.
// Input: the m54a bundle. Usage: node patch-m54b.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = "/* ---------- m54b ---------- */\n", JS = "/* ---------- m54b (owner, 2026-11-18): the settlement of a surgery cost difference is in reception's cartable only; the consultant's cartable no longer\n   lists these patients (server) and its counter is gone (page anchor). The consultant can still open the settlement from the archive or the\n   patient file («رایگان» stays there). ---------- */\n", SRV = "/* ---------- m54b (owner, 2026-11-18): patients whose surgery cost difference waits for settlement belong to reception's cartable, not the consultant's:\n   the consultant's queue no longer carries them (unless the patient is in the consultant's own queue for a plan). Reception already has the list\n   «تسویه‌ی اختلاف جراحی» and the full settlement form (m50a). ---------- */\nqueue0 = (orig => async function (db, v, sv, role, td) { const r = await orig.apply(this, arguments);\n  try { if (role === 'consultant' && r && r.ok && Array.isArray(r.items)) r.items = r.items.filter(x => !(x && x.settle === 'pending' && x.queue !== 'consult' && x.queue !== 'consulting')); } catch (e) { console.error('m54b', e && e.message); }\n  return r; })(queue0);\n";
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
const A = JSON.parse(lines[ai].slice('const ASSETS='.length).replace(/;\s*$/, ''));
if (A['/'].d !== A['/index.html'].d) throw new Error('index copies differ');
A['/'].d = A['/index.html'].d = patchHtml(A['/'].d);
lines[ai] = 'const ASSETS=' + JSON.stringify(A) + ';';
const ci = lines.findIndex(l => l.startsWith('const CODE='));
if (ci >= 0) { const C = JSON.parse(lines[ci].slice('const CODE='.length).replace(/;\s*$/, '')); if (C.files['src/main.js']) C.files['src/main.js'] = patchServer(C.files['src/main.js'], true); lines[ci] = 'const CODE=' + JSON.stringify(C) + ';'; }
const si = lines.findIndex(l => l.startsWith('const ROLE_Q'));
fs.writeFileSync(out, lines.slice(0, si).join(NL) + NL + patchServer(lines.slice(si).join(NL), false));
if (CODE_SKIP.length) console.log('CODE copy - anchors not present:', CODE_SKIP.join(', '));
console.log('m54b patched ok');
