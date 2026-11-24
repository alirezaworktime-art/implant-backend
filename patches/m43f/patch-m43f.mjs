// patch-m43f (owner, 2026-11-17): settings — the new doctor / staff name is chosen from the personal accounts. See SPEC.md.
// Input: the m43e bundle. Usage: node patch-m43f.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = "/* ---------- m43f (2026-11-17): settings — choose the new name from the personal accounts ---------- */\n#m14Box #m43fSel{min-height:44px;width:100%}\n#m14Box #m14Name[hidden]{display:none}\n#m14Box #m43fSel+#m14Name:not([hidden]){margin-top:6px}\n", JS = "/* ---------- m43f (owner, 2026-11-17): manager «تنظیمات» → «پزشکان، کارکنان، سهم پزشک…»: the new name is chosen from the personal accounts of the\n   clinic (the people the manager already defined) instead of being typed; «نام دیگر…» still allows typing. The role box follows the account. ---------- */\n(function(){\nlet USERS=null,asked=false;\nconst nrm=s=>{try{return normN(s)}catch(e){return String(s||'').trim()}};\nconst KIND={doctor:'doc',surgery:'asst',staff:'recep',consultant:'staff',accountant:'staff',inventory:'staff',lab:'staff',manager:'staff'};\nfunction cand(){const have=((typeof M14!=='undefined'&&M14&&M14.payees)||[]).map(p=>p.name),L=[];(USERS||[]).forEach(u=>{const n=String(u.name||'').trim();if(!n||u.active===0||u.active===false||u.lab)return;if(have.some(x=>nrm(x)===nrm(n))||L.some(x=>nrm(x.n)===nrm(n)))return;L.push({n,r:u.role})});return L}\nfunction fit(){const i=$('m14Name');if(!i||!i.closest('#m14Box'))return;const lab=i.closest('label');if(!lab||lab.querySelector('#m43fSel'))return;const L=cand();\n  i.insertAdjacentHTML('beforebegin',`<select id=\"m43fSel\" aria-label=\"نام تازه\"><option value=\"\">— انتخاب کنید —</option>${L.map(x=>`<option value=\"${esc(x.n)}\" data-r=\"${esc(x.r||'')}\">${esc(x.n)}</option>`).join('')}<option value=\"__\">نام دیگر… (نوشتن)</option></select>`);\n  i.hidden=true;i.value='';if(!L.length&&USERS){$('m43fSel').value='__';i.hidden=false}}\n{const _r=m14Render;m14Render=function(){const r=_r.apply(this,arguments);try{fit();if(!USERS&&!asked&&ROLE==='manager'){asked=true;api('userList',{}).then(j=>{USERS=(j&&(j.items||j.users||j.rows))||[];const s=$('m43fSel');if(s){s.remove();fit()}}).catch(()=>{USERS=[];const s=$('m43fSel');if(s){s.remove();fit()}})}}catch(e){console.error('m43f',e)}return r}}\ndocument.addEventListener('change',e=>{const s=e.target;if(!s||s.id!=='m43fSel')return;const i=$('m14Name');if(!i)return;if(s.value==='__'){i.hidden=false;i.value='';i.focus()}else{i.hidden=true;i.value=s.value;const o=s.options[s.selectedIndex],k=KIND[(o&&o.dataset.r)||''],K=$('m14Kind');if(k&&K)K.value=k}});\nwindow.m43f={cand,reset:()=>{USERS=null;asked=false}};\n})();\n", SRV = "/* m43f: page only — no server code */\n";
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m43e (')) throw new Error('needs the m43e bundle');
  if (h.includes('---------- m43f (')) throw new Error('already m43f');
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
console.log('m43f patched ok');
