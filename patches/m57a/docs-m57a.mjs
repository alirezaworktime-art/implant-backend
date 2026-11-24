// adds the m57a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m57a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m57a زنده شد', '**2026-11-20 — m57a زنده شد** (ایران و Cloudflare؛ روی m55a، بدون m56a). All on X با برند کره‌ای هم (قیمت بدون تغییر)؛ PDF بیمار «می‌خواهد فکر کند» متن پیامک «‹نام› مایل به درمان ‹n› واحد ایمپلنت در یزد می‌باشم.» به شماره‌ی تنظیمات مدیر (kv `m57sms`)؛ مشاور تا ۵ بیمار را در نوار بالای صفحه باز نگه می‌دارد (پیش‌نویس هر بیمار روی دستگاه). `work\\m57a\\SPEC.md`؛ t-m57a (۲۰) ALL OK. برگشت: `deploy-m55a.sh` + `node cf.mjs put cf-m55a.mjs`.');
