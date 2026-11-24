// adds the m43g line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m43g.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m43g زنده شد', '**2026-11-17 — m43g زنده شد** (ایران و Cloudflare؛ فقط صفحه). پرونده‌ی بیمار، «سیر درمان»: زیر «تأیید طرح درمان» و زیر هر جلسه‌ی جراحی، هزینه‌ی ایمپلنت به تفکیک برند («تعداد × تعرفه»)؛ متن خلاصه‌ی بیمار هم. فقط نقش‌های قیمت‌بین؛ مبلغ‌ها دست نخورده. «PDF کامل پرونده» هنوز ندارد. `work\\m43g\\SPEC.md`؛ t-m43gui (۱۱) ALL OK. برگشت: `deploy-m44b.sh` + `node cf.mjs put cf-m44b.mjs`.');
