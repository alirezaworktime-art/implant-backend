// patch-m53b (owner, 2026-11-18): the «nodis» task also closes 60 days after surgery; the call one week after delivery closes when 30 days overdue. See SPEC.md.
// Input: the m53a bundle. Usage: node patch-m53b.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = "/* ---------- m53b ---------- */\n", JS = "/* ---------- m53b (owner, 2026-11-18): server only (the reception tasks of m53a are tidied up) ---------- */\n", SRV = "/* ---------- m53b (owner, 2026-11-18): tidy-up of m53a after the second audit:\n   the «nodis» task also closes by itself 60 days after the last surgery day (when no cost difference is open) — nobody discharges that late;\n   «pweek» (call one week after delivery) closes when it is 30 days overdue, like «numb» and «week». ---------- */\n{ const _t53 = m53Tick; m53Tick = async function (db) { await _t53.apply(this, arguments);\n  const now = nowIso(); let ch = 0; const run = async st => { const r = await st.run(); ch += (r && r.meta && r.meta.changes) || 0; };\n  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND kind='nodis' AND plan IN (SELECT id FROM plans WHERE COALESCE(settle,'')<>'pending' AND surg IS NOT NULL AND json_valid(surg) AND COALESCE(json_extract(surg,'$.lastDay'),'')<>'' AND json_extract(surg,'$.lastDay')<?)`).bind(now, 'خودکار: بیش از ۶۰ روز از جراحی گذشت', addDays(-60)));\n  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND kind='pweek' AND due<?`).bind(now, M53_OLD, addDays(-30)));\n  if (ch) await db.batch([bump(db)]); }; }\n";
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m53a (')) throw new Error('needs the m53a bundle');
  if (h.includes('---------- m53b (')) throw new Error('already m53b');
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
console.log('m53b patched ok');
