// builds patch-m52a.mjs from css.css + client.js + srv.js. Input: the m51a bundle.
import fs from 'node:fs'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const r = f => fs.readFileSync(path.join(D, f), 'utf8');
const tpl = `// patch-m52a (owner, 2026-11-18): after surgery the two parts are settled separately and the cash discount is only on the surgery part; «منتظر پزشک» until the plan is sent; plan count in the doctor's archive. See SPEC.md.
// Input: the m51a bundle. Usage: node patch-m52a.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = ${JSON.stringify(r('css.css'))}, JS = ${JSON.stringify(r('client.js'))}, SRV = ${JSON.stringify(r('srv.js'))};
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m51a (')) throw new Error('needs the m51a bundle');
  if (h.includes('---------- m52a (')) throw new Error('already m52a');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, "...q('reviewing').map(x=>({n:x,s:'نزد پزشک'}))", "...q('reviewing').map(x=>({n:x,s:'منتظر پزشک · '+mqWait(x.queuedAt),late:mqMin(x.queuedAt)>=20}))", 'board reviewing');
  h = rep(h, "K.push(['منتظر پزشک',QITEMS.filter(x=>x.queue==='waiting').length,'warn']);K.push(['نزد پزشک',QITEMS.filter(x=>x.queue==='reviewing').length]);", "K.push(['منتظر پزشک',QITEMS.filter(x=>x.queue==='waiting'||x.queue==='reviewing').length,'warn']);", 'doctor kpi');
  h = rep(h, "OWN.forEach(x=>{const k=x.queue||'none';qs[k]=(qs[k]||0)+1});", "OWN.forEach(x=>{const k=(x.queue==='reviewing'?'waiting':x.queue)||'none';qs[k]=(qs[k]||0)+1});", 'chips count');
  h = rep(h, "OWN.filter(x=>(x.queue||'none')===RQF.slice(2))", "OWN.filter(x=>((x.queue==='reviewing'?'waiting':x.queue)||'none')===RQF.slice(2))", 'chips filter');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  return h;
}
function patchServer(s, code) { const a = NL + 'export default {', c = s.split(a).length - 1; if (code && c === 0) { CODE_SKIP.push('srv block'); return s; } if (c !== 1) throw new Error('anchor srv block' + (code ? ' (CODE)' : '') + ': ' + c);
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
console.log('m52a patched ok');
`;
fs.writeFileSync(path.join(D, 'patch-m52a.mjs'), tpl); console.log('wrote patch-m52a.mjs', tpl.length);
