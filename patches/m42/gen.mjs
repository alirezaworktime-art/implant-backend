// builds patch-m42.mjs from css.css + client.js + srv.js. Input: the m41b bundle.
import fs from 'node:fs'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const r = f => fs.readFileSync(path.join(D, f), 'utf8');
const tpl = `// patch-m42 (owner, 2026-11-17): clinic staff accounts — several roles with one password (cartable chooser), shared password of a cartable can be switched off by the manager. See SPEC.md.
// Input: the m41b bundle. Usage: node patch-m42.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = ${JSON.stringify(r('css.css'))}, JS = ${JSON.stringify(r('client.js'))}, SRV = ${JSON.stringify(r('srv.js'))};
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m41b (')) throw new Error('needs the m41b bundle');
  if (h.includes('---------- m42 (')) throw new Error('already m42');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  return h;
}
const AS_A = 'req._role = role; req._user = user; if (user) { req.by = user.name;';
const AS_B = "if (user && Array.isArray(user.roles) && typeof req.as === 'string' && req.as !== role && user.roles.includes(req.as)) role = req.as; /* m42: the cartable this person chose */ " + AS_A;
function patchServer(s, code) { const a = NL + 'export default {', c = s.split(a).length - 1; if (code && c === 0) { CODE_SKIP.push('srv block'); return s; } if (c !== 1) throw new Error('anchor srv block' + (code ? ' (CODE)' : '') + ': ' + c);
  if (code && s.split(AS_A).length - 1 !== 1) { CODE_SKIP.push('as-role'); } else s = rep(s, AS_A, AS_B, 'as-role');
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
console.log('m42 patched ok');
`;
fs.writeFileSync(path.join(D, 'patch-m42.mjs'), tpl); console.log('wrote patch-m42.mjs', tpl.length);
