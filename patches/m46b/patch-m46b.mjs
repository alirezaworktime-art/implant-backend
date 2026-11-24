// patch-m46b (owner, 2026-11-17): reception — the plan-choice sheet shows the content of every plan. See SPEC.md.
// Input: the m46a bundle. Usage: node patch-m46b.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = "/* ---------- m46b (2026-11-17): reception plan-choice sheet shows the content of every plan ---------- */\n#q7PlSh .in.m46bin{max-width:980px}\n.m46bw{margin-top:10px}\n.m46bd{border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin:8px 0}\n.m46bd>summary{font-weight:700;cursor:pointer;min-height:32px}\n.m46bd .pview{margin-top:8px}\n", JS = "/* ---------- m46b (owner, 2026-11-17): reception — the «طرح درمان بیمار» sheet (which plan did the patient choose?) now shows what every plan\n   contains: its treatments with the tooth chart, the same summary the surgeon sees, under each plan's name. Before, only the cost stood there. ---------- */\n(function(){\n{const _q=q7PlanSheet;q7PlanSheet=function(snap){const r=_q.apply(this,arguments);try{const s=$('q7PlSh');if(s&&snap&&!s.querySelector('.m46bw')){\n    const all=[{no:1,s:snap.s}].concat(((snap.sx&&snap.sx.length)?snap.sx:(snap.s2?[snap.s2]:[])).map((x,i)=>({no:i+2,s:x})));\n    const h='<div class=\"m46bw\"><p class=\"note\">جزئیات هر طرح (برای انتخاب، دکمه‌ی همان طرح را در بالا بزنید):</p>'+all.map(p=>`<details class=\"m46bd\" open><summary>طرح ${fa(p.no)}</summary><div class=\"pview\">${planViewHTML(p.s)}</div></details>`).join('')+'</div>';\n    const m=s.querySelector('#q7PlMsg');if(m)m.insertAdjacentHTML('beforebegin',h);const inn=s.querySelector('.in');if(inn)inn.classList.add('m46bin')}}catch(e){console.error('m46b',e)}return r}}\n})();\n", SRV = "/* m46b: page only */\n";
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m46a (')) throw new Error('needs the m46a bundle');
  if (h.includes('---------- m46b (')) throw new Error('already m46b');
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
console.log('m46b patched ok');
