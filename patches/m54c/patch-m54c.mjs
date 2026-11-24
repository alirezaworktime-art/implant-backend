// patch-m54c (owner, 2026-11-18): the extra fields of m54a are taken away (patient extras, medical alerts, cheque owner / warranty / satisfaction, surgery extras); closing a file stays. See SPEC.md.
// Input: the m54b bundle. Usage: node patch-m54c.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = "/* ---------- m54c ---------- */\n", JS = "/* ---------- m54c (owner, 2026-11-18): the extra fields of m54a are not needed — taken away: the «مشخصات تکمیلی» card and sheet (patient file and\n   reception form), the medical alerts (file and surgery day), cheque owner / warranty / satisfaction / complaint, and «ثبت تکمیلی جراحی».\n   What stays from m54a: «بستن پرونده» (the card now shows only the closed banner and the close / open button), the result of follow-up calls,\n   and the automatic tasks. ---------- */\nfunction m54Card() { const B = $('pfBody'); if (!B || !PF || !PF.j || PF.sess) return; const D = M54.c[PF.id]; const old = $('m54Card'); if (old) old.remove(); if (!D) return;\n  const c = D.c; if (!c && !m54Can()) return;\n  B.insertAdjacentHTML('afterbegin', `<div class=\"m54card\" id=\"m54Card\">${c ? `<div class=\"m54cl\">پرونده بسته شده است: ${esc(c.why || '')}${c.note ? ' — ' + esc(c.note) : ''}${c.by ? ' · ' + esc(c.by) : ''}</div>` : ''}${m54Can() ? `<div class=\"btns\">${c ? '<button type=\"button\" class=\"btn sm\" id=\"m54Open\">باز کردن دوباره‌ی پرونده</button>' : '<button type=\"button\" class=\"btn sm ghost\" id=\"m54CloseB\">بستن پرونده</button>'}</div>` : ''}</div>`) }\nfunction m54Mounts() { try { ['m54Rc', 'm54SgW', 'm54SgSh', 'm54Sh'].forEach(id => { const n = $(id); if (n) n.remove() }); const b = $('m54SgB'); if (b) { const w = b.closest('.btns'); (w || b).remove() } M54.pend = null; M54.sx = null } catch (e) { } }\nm54Mounts();\n", SRV = "/* ---------- m54c (owner, 2026-11-18): the extra fields of m54a are not needed: m54Pat «set» and m54Surg are refused, and «get» gives only the\n   closed state of the file (kv m54p: / m54s: are no longer read or written). Closing a file (m54Close) stays. ---------- */\n{ const _ar54c = arc6Route; arc6Route = async function (db, req, role) { const a = req && req.action;\n  if (a === 'm54Surg' || (a === 'm54Pat' && String(req.op || 'get') !== 'get')) return { ok: false, error: 'این بخش برداشته شده است.' };\n  if (a === 'm54Pat') { const id = String(req.id || ''); if (!id) return { ok: false, error: 'بیمار مشخص نیست.' }; return { ok: true, p: {}, s: {}, c: parse(await kvGet(db, 'm54c:' + id), null) }; }\n  return _ar54c.apply(this, arguments); }; }\n";
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m54b (')) throw new Error('needs the m54b bundle');
  if (h.includes('---------- m54c (')) throw new Error('already m54c');
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
console.log('m54c patched ok');
