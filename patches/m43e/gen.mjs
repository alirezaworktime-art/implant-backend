// builds patch-m43e.mjs (page only). Input: the m44a bundle.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const D = path.dirname(fileURLToPath(import.meta.url));
const R = [
  ["const M={d:null,tab:'share',who:'',busy:false};", "const M={d:null,tab:'exc',who:'',busy:false};/* m43e: per-doctor first */", 'default tab'],
  ["<button type=\"button\" data-m43t=\"price\" aria-pressed=\"${M.tab==='price'}\">تعرفه‌ی بیمار</button><button type=\"button\" data-m43t=\"share\" aria-pressed=\"${M.tab==='share'}\">سهم پزشک — همه‌ی پزشکان</button><button type=\"button\" data-m43t=\"exc\" aria-pressed=\"${M.tab==='exc'}\">استثنا برای یک پزشک</button>",
   "<button type=\"button\" data-m43t=\"exc\" aria-pressed=\"${M.tab==='exc'}\">سهم هر پزشک</button><button type=\"button\" data-m43t=\"price\" aria-pressed=\"${M.tab==='price'}\">تعرفه‌ی بیمار</button><button type=\"button\" data-m43t=\"share\" aria-pressed=\"${M.tab==='share'}\">سهم مشترک (اختیاری)</button>", 'tabs'],
  ["const D=docs();if(M.who&&!D.some(p=>p.id===M.who))M.who='';", "const D=docs();if(M.who&&!D.some(p=>p.id===M.who))M.who='';if(!M.who&&D.length)M.who=D[0].id;", 'first doctor'],
  ["<p class=\"note\">فقط برای پزشکی که سهمش با بقیه فرق دارد. خانه‌ی خالی یعنی «طبق همه».</p>", "<p class=\"note\">پزشک را انتخاب کنید و سهم او را برای هر خدمت بنویسید (مبلغ یا درصد). هر پزشک عدد خودش را دارد. ردیفی که دست نزنید همان مبلغ فعلی آن پزشک می‌ماند.</p>", 'doctor note'],
  ["<p class=\"note\">سهم پزشک از هر خدمت، برای همه‌ی پزشکان. «مبلغ»", "<p class=\"note\">اختیاری: اگر سهم یک خدمت برای همه‌ی پزشکان یکی است، اینجا یک بار بنویسید؛ عدد خودِ هر پزشک (بخش «سهم هر پزشک») بر این مقدم است. «مبلغ»", 'common note'],
  ["<option value=\"\">${payee==='*'?'—':'طبق همه'}</option>", "<option value=\"\">${payee==='*'?'—':'بدون تغییر'}</option>", 'option'],
  ["if(t.dataset.m43who!==undefined){M.who=M.who===t.dataset.m43who?'':t.dataset.m43who;draw();return}", "if(t.dataset.m43who!==undefined){M.who=t.dataset.m43who;draw();return}", 'doctor click'],
];
const tpl = `// patch-m43e (owner, 2026-11-17): «تعرفه و سهم پزشکان» opens on «سهم هر پزشک» — every doctor has his own share per service; the common rule is optional. Page only.
// Input: the m44a bundle. Usage: node patch-m43e.mjs <in> <out>
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2); const src = fs.readFileSync(inp, 'utf8'); const NL = String.fromCharCode(10);
const R = ${JSON.stringify(R)};
const MARK = '/* ---------- m43e (owner, 2026-11-17): doctor shares are entered per doctor first ---------- */';
const lines = src.split(NL); const ai = lines.findIndex(l => l.startsWith('const ASSETS='));
const A = JSON.parse(lines[ai].slice('const ASSETS='.length).replace(/;\\s*$/, ''));
if (A['/'].d !== A['/index.html'].d) throw new Error('index copies differ');
let h = A['/'].d; if (!h.includes('---------- m44a (')) throw new Error('needs the m44a bundle'); if (h.includes('---------- m43e (')) throw new Error('already m43e');
for (const [a, b, l] of R) { const c = h.split(a).length - 1; if (c !== 1) throw new Error('anchor ' + l + ': ' + c); h = h.split(a).join(b); }
const a2 = NL + '</body>'; if (h.split(a2).length !== 2) throw new Error('anchor body'); h = h.split(a2).join(NL + '<script>' + MARK + '</script>' + NL + '</body>');
A['/'].d = A['/index.html'].d = h; lines[ai] = 'const ASSETS=' + JSON.stringify(A) + ';'; fs.writeFileSync(out, lines.join(NL)); console.log('m43e patched ok');
`;
fs.writeFileSync(path.join(D, 'patch-m43e.mjs'), tpl); console.log('wrote', tpl.length);
