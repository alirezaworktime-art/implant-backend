// patch-m43g (owner, 2026-11-17): patient file — implant cost split by brand in the timeline. See SPEC.md.
// Input: the m44b bundle. Usage: node patch-m43g.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = "/* ---------- m43g (2026-11-17): implant cost split by brand in the patient file ---------- */\n.tl .m43g{margin-top:4px;font-size:.84rem;color:var(--muted)}\n.tl .m43g bdi{color:var(--text,inherit);font-weight:600;unicode-bidi:isolate}\n", JS = "/* ---------- m43g (owner, 2026-11-17): the patient file shows the implant cost split by brand — «count × tariff» for every brand group — in «سیر درمان»:\n   under «تأیید طرح درمان» (the plan: plan brand + the special teeth of other brands) and under every surgery session (the fixtures that were really\n   placed). Before, only one brand name stood beside the total. Only for the roles that see prices. The totals themselves are not changed. ---------- */\n(function(){\nconst GN=g=>{const b=BRANDS.find(x=>x.k===g);return b?b.n:g};\nconst canSee=()=>['consultant','staff','manager','accountant'].includes(ROLE);\nconst txt=G=>{const K=Object.keys(G).filter(g=>G[g].n>0).sort((a,b)=>BRANDS.findIndex(x=>x.k===a)-BRANDS.findIndex(x=>x.k===b));if(!K.length)return '';const sum=K.reduce((a,g)=>a+G[g].n*G[g].p,0);\n  return K.map(g=>`${GN(g)} ${fa(G[g].n)} × ${fa(G[g].p)}`).join(' + ')+(K.length>1?' = '+fa(sum):'')};\nfunction planSplit(r){try{const s=r&&r.s&&r.s.imp;if(!s||!r.brand||r.brand==='ref')return null;const q=qty(s,SEC.imp);if(!q)return null;const b=effBrand(r),M=(window.m43a&&window.m43a.mix(s))||{n:0,by:{}},G={};\n  if(q-M.n>0)G[b]={n:q-M.n,p:num(s.bp[b])};Object.keys(M.by||{}).forEach(g=>{G[g]=G[g]||{n:0,p:num(s.bp[g])};G[g].n+=M.by[g]});return G}catch(e){return null}}\nfunction sesSplit(r,ss){try{const b=effBrand(r),P=r.s,S=secFrom(ss.s||{}),im=ss.imp||{},G={};let redo=0;\n  Object.keys(S.imp.sel).filter(k=>S.imp.sel[k]&&isTooth(k)).forEach(k=>{const m=im[k]||{};if(m.rs==='redo'){redo++;return}const g=m.g&&num(P.imp.bp[m.g])?m.g:b;G[g]=G[g]||{n:0,p:num(P.imp.bp[g])};G[g].n++});\n  const jc=['U','L'].reduce((a,j)=>a+num(S.imp.jc[j]),0);if(jc){G[b]=G[b]||{n:0,p:num(P.imp.bp[b])};G[b].n+=jc}return {G,redo}}catch(e){return null}}\n{const _r=renderFile;renderFile=function(){const out=_r.apply(this,arguments);try{if(PF&&PF.j&&(PF.tab||'tl')==='tl'&&canSee()&&!((PF.j.surg||{}).arc)){const j=PF.j,r=fromDoc(PF.id,j.data||{}),box=document.querySelector('#pfBody .tl');\n    if(box){const items=[...box.querySelectorAll('.tl-i')],find=t=>items.find(x=>{const b=x.querySelector('b');return b&&b.textContent.trim()===t}),add=(el,label,t)=>{if(el&&t&&!el.querySelector('.m43g'))el.querySelector('div').insertAdjacentHTML('beforeend',`<p class=\"m43g\">${esc(label)}: <bdi dir=\"ltr\">${esc(t)}</bdi></p>`)};\n      const G=planSplit(r);if(G)add(find('تأیید طرح درمان'),'ایمپلنت در طرح به تفکیک برند',txt(G));\n      ((j.surg||{}).sessions||[]).forEach(ss=>{const o=sesSplit(r,ss);if(!o)return;const t=txt(o.G);add(find(`جلسه‌ی ${fa(ss.n||0)} جراحی`),'ایمپلنت‌های کاشته‌شده به تفکیک برند',t+(o.redo?(t?' · ':'')+`کاشت مجدد ${fa(o.redo)} (رایگان)`:''))})}}}catch(e){console.error('m43g',e)}return out}}\n/* the text the consultant gives the patient */\n{const _p=patientSummary;patientSummary=function(){let t=_p.apply(this,arguments);try{const G=planSplit(F);if(G&&Object.keys(G).filter(g=>G[g].n>0).length>1){const L=t.split('\\n'),i=L.findIndex(x=>x.startsWith('جمع کل'));if(i>=0){L.splice(i,0,'ایمپلنت به تفکیک برند: '+txt(G));t=L.join('\\n')}}}catch(e){}return t}}\nwindow.m43g={planSplit,sesSplit,txt};\n})();\n", SRV = "/* m43g: page only — no server code */\n";
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m44b (')) throw new Error('needs the m44b bundle');
  if (h.includes('---------- m43g (')) throw new Error('already m43g');
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
console.log('m43g patched ok');
