// patch-m58a (owner, 2026-11-20): prosthesis card — «کار امروز» (file + PDF) and «سفارش لابراتوار» are two separate buttons. See SPEC.md.
// Input: the m57a bundle. Usage: node patch-m58a.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const src = fs.readFileSync(inp, 'utf8');
const NL = String.fromCharCode(10);
const CSS = "/* m58a */ .l5work .m58n{margin:0}\n", JS = "\n/* ---------- m58a (2026-11-20): prosthesis card — «کار امروز» (file + PDF) and «سفارش لابراتوار» are two separate buttons ---------- */\n/* 1. prosthesis-day cards: «جلسه‌ی پروتز» → «کار امروز»; + «سفارش لابراتوار» right after it */\n(function(){const _p=pdCard;pdCard=function(id,name){const h=_p.apply(this,arguments);if(!id)return h;\n  return h.replace('>جلسه‌ی پروتز</button>',`>کار امروز</button><button class=\"btn sm\" type=\"button\" data-m58lab=\"${esc(id)}\" data-m58n=\"${esc(name)}\">سفارش لابراتوار</button>`)}})();\n/* 2. referral cards (surgery doctor): the l5 button becomes «کار امروز»; + «سفارش لابراتوار» */\n(function(){const _r=l3RenderRef;l3RenderRef=function(){const r=_r.apply(this,arguments);const b=$('l3Ref');if(b)b.querySelectorAll('[data-l5]').forEach(x=>{x.textContent='کار امروز';if(x.parentNode.querySelector('[data-m58lab]'))return;\n  const l=document.createElement('button');l.type='button';l.className='btn sm';l.dataset.m58lab=x.dataset.l5;l.dataset.m58n=x.dataset.l5n||'';l.dataset.aid=x.dataset.aid||'';l.textContent='سفارش لابراتوار';x.after(l);\n  const n=x.parentNode.querySelector('[data-adoc]');if(n)n.textContent='انجام بدون سفارش (بدون ثبت کار)'});return r}})();\ndocument.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-m58lab]');if(!t)return;e.stopImmediatePropagation();\n  l3OpenLab(t.dataset.m58lab,t.dataset.m58n||'',t.dataset.aid||'')},true);\n/* 3. the «کار امروز» sheet: only the work of today + note; no lab order inside */\n(function(){const _r=l5Render;l5Render=function(){const r=_r.apply(this,arguments);try{\n  const name=(fromDoc(PF.id,PF.j.data||{}).h||{}).name||'';$('pfTitle').textContent='کار امروز · '+name;\n  const h=document.querySelector('.l5work h3');if(h)h.textContent='کار امروز';\n  const s=$('l5Save');if(s)s.textContent='ثبت کار امروز';\n  const w=document.querySelector('.l5work');if(w&&!w.querySelector('.m58n')){const p=document.createElement('p');p.className='note m58n';p.textContent='در پرونده و PDF پرونده ثبت می‌شود. برای سفارش لابراتوار دکمه‌ی «سفارش لابراتوار» روی کارت بیمار را بزنید.';const m=$('l5Msg');if(m)m.before(p);else w.append(p)}}catch(e){}return r}})();\n/* 4. PDF of the file: full doctor notes of the prosthesis steps (the table cuts them) */\n(function(){const _f=ffProsBlocks;ffProsBlocks=function(j){const B=_f.apply(this,arguments);try{const lg=((j.pros||{}).log||[]).filter(g=>String(g.note||'').replace(/\\s+/g,' ').trim().length>50);\n  if(lg.length)B.push(textBlock('توضیح کامل مراحل',lg.map(g=>jt(g.at)+' · '+(PSTN[g.k]||g.k)+': '+String(g.note).replace(/\\s+/g,' ').trim())))}catch(e){}return B}})();\n", SRV = "/* ---------- m58a: no server change ---------- */\n";
const rep = (s, a, b, label, n = 1) => { const c = s.split(a).length - 1; if (c !== n) throw new Error('anchor ' + label + ': ' + c + ' (want ' + n + ')'); return s.split(a).join(b); };
const CODE_SKIP = [];
function patchHtml(h) {
  if (!h.includes('---------- m57a (')) throw new Error('needs the m57a bundle');
  if (h.includes('---------- m58a (')) throw new Error('already m58a');
  h = rep(h, '</style>' + NL + '</head>', CSS + '</style>' + NL + '</head>', 'css');
  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');
  h = rep(h, "if(s.work){if(!LO)loInit(j);let lf=''", "if(false){if(!LO)loInit(j);let lf=''", 'l5 no lab form');
  h = rep(h, "const A=[];if(s.work)A.push(", "const A=[];if(false)A.push(", 'l5 one button');
  h = rep(h, "L5.res='';if(L5.work&&!LO)loInit(PF.j);", "L5.res='';", 'l5 chip no lab');
  h = rep(h, "if(L5.work&&!LO)loInit(PF.j);renderFile();try{", "LO=null;renderFile();try{", 'l5 open no lab');
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
console.log('m58a patched ok');
