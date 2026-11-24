// adds the m43c line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m43c.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m43c زنده شد', '**2026-11-17 — m43c زنده شد** (ایران و Cloudflare). کارتابل مدیر کاشی «تعرفه و سهم پزشکان»: تعرفه‌ی بیمار هر خدمت؛ سهم پزشک برای همه (مبلغ یا درصد از تعرفه‌ی بیمار) + استثنا برای یک پزشک؛ جراحی ایمپلنت ۵ ردیف برند (ایرانی تازه؛ ایرانی و Root دیگر روی ردیف کره‌ای نمی‌روند). قاعده‌ها در `fin_share` و نوشته در `fin_fee`. هفته‌ی اول (kv `m43Start`) هر ذخیره روی صورتحساب‌های خودکار قبلی هم اعمال می‌شود. `work\\m43c\\SPEC.md`؛ t-m43c (۳۲) و t-m43cui (۲۵) ALL OK. برگشت: `deploy-m43b.sh` + `node cf.mjs put cf-m43b.mjs`.');
