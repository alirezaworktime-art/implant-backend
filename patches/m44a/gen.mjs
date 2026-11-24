// builds patch-m44a.mjs from css.css + client.js + srv.js. Input: the m43d bundle.
import fs from 'node:fs'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const r = f => fs.readFileSync(path.join(D, f), 'utf8');
const tpl = `// patch-m44a (owner, 2026-11-17): surgery sheet — early failure + implant on one tooth = two fixtures with their own brand and size. See SPEC.md.
// Input: the m43d bundle. Usage: node patch-m44a.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = ${JSON.stringify(r('css.css'))}, JS = ${JSON.stringify(r('client.js'))}, SRV = ${JSON.stringify(r('srv.js'))};
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m43d (')) throw new Error('needs the m43d bundle');
  if (h.includes('---------- m44a (')) throw new Error('already m44a');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  return h;
}
const A1 = "if (m.rs === 'fail' && Number(m.rep)) ops.push(...invMoveOps(db, it.id, -1, 'use', by, nt + ' — فیکسچر دوم (فیل اولیه، کاشت دوباره همان جلسه)', o.id, o.name));";
const B1 = "if (m.rs === 'fail' && Number(m.rep)) { const s2 = m44It(m), it2 = s2 ? await invFind(db, s2) : it; ops.push(...invMoveOps(db, it2.id, -1, 'use', by, nt + ' — فیکسچر دوم (فیل اولیه، کاشت دوباره همان جلسه)', o.id, o.name)); } /* m44a */";
const A2 = "B.push([{ kind: 'fix', b: m.b, sys: m.sys, d: m.d, l: m.l }, (m.rs === 'fail' && Number(m.rep)) ? 2 : 1]);";
const B2 = "{ const s2 = (m.rs === 'fail' && Number(m.rep)) ? m44It(m) : null; if (s2) { B.push([{ kind: 'fix', b: m.b, sys: m.sys, d: m.d, l: m.l }, 1]); B.push([s2, 1]); } else B.push([{ kind: 'fix', b: m.b, sys: m.sys, d: m.d, l: m.l }, (m.rs === 'fail' && Number(m.rep)) ? 2 : 1]); } /* m44a */";
const A3 = "f.n++; f[m.rs === 'redo' || m.rs === 'fail' ? m.rs : 'new']++; }); }); });";
const B3 = "f.n++; f[m.rs === 'redo' || m.rs === 'fail' ? m.rs : 'new']++; if (m.rs === 'fail' && Number(m.rep)) { const s2 = m44It(m) || m, b2 = [s2.b, s2.sys].filter(Boolean).join(' '), z2 = xlSize(s2), k2 = b2 + '|' + z2, g2 = FX[k2] = FX[k2] || { brand: b2, size: z2, n: 0, new: 0, redo: 0, fail: 0 }; g2.n++; g2.new++; } /* m44a: the fixture placed after the failed one */ }); }); });";
function patchServer(s, code) { const a = NL + 'export default {', c = s.split(a).length - 1; if (code && c === 0) { CODE_SKIP.push('srv block'); return s; } if (c !== 1) throw new Error('anchor srv block' + (code ? ' (CODE)' : '') + ': ' + c);
  for (const [a, b, l] of [[A1, B1, 'stock'], [A2, B2, 'bag'], [A3, B3, 'report']]) { if (code && s.split(a).length - 1 !== 1) { CODE_SKIP.push(l); continue; } s = rep(s, a, b, l); }
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
console.log('m44a patched ok');
`;
fs.writeFileSync(path.join(D, 'patch-m44a.mjs'), tpl); console.log('wrote patch-m44a.mjs', tpl.length);
