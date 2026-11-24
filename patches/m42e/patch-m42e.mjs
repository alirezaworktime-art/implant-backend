// patch-m42e (owner, 2026-11-17): surgery session dated by the server when the tablet clock is wrong (audit item 3). Server only. See SPEC.md.
// Input: the m42d bundle. Usage: node patch-m42e.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = '', JS = "/* ---------- m42e (2026-11-17): server only — a surgery session with a tablet time in the future or older than 7 days is dated by the server clock. ---------- */\n", SRV = "/* ---------- m42e (surgery-day audit, item 3; 2026-11-17): the time of a surgery session came from the tablet clock, so a tablet with a wrong date put\n   the session, its invoice and its accounting voucher on a wrong day. A session time in the future (more than 10 minutes) or older than 7 days is\n   replaced by the server time; the tablet's value is kept in «clk». Sessions waiting in the tablet's offline queue (hours, a few days) keep their time. ---------- */\n{ const _s42e = surgSave; surgSave = async function (db, req) {\n  try { const ses = req && req.session; if (ses && typeof ses === 'object') { const t = Date.parse(ses.at), now = Date.now();\n    if (!Number.isFinite(t) || t > now + 10 * 60000 || t < now - 7 * 864e5) { ses.clk = tcut(String(ses.at == null ? '' : ses.at), 40); ses.at = nowIso(); ses.jalali = pr2J(tehranDay()); } } }\n  catch (e) { console.error('m42e clock', e && e.message); }\n  return _s42e.apply(this, arguments); }; }\n";
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m42d (')) throw new Error('needs the m42d bundle');
  if (h.includes('---------- m42e (')) throw new Error('already m42e');
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
console.log('m42e patched ok');
