// adds the m54a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m54a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m54a زنده شد', '**2026-11-18 — m54a زنده شد** (ایران و Cloudflare). ممیزی دوم: کار `chqdue` (چک ۳ روز سررسیدگذشته)، `payokl` (یادآوری payok بعد از ۳ روز)، قالب/آنکاوری ۳۰ روز دیرکرد در «بازگشت بیماران»؛ بستن پرونده با دلیل (`m54Close`، kv `m54c:`/`m54closed`)؛ فیلدهای تکمیلی بیمار (`m54Pat`، kv `m54p:`) و ثبت تکمیلی جراحی (`m54Surg`، kv `m54s:`: LOT، تورک، ISQ، عارضه…)؛ نتیجه‌ی تماس‌های پیگیری. `work\\m54a\\SPEC.md`؛ t-m54a (۴۱) ALL OK. برگشت: `deploy-m53b.sh` + `node cf.mjs put cf-m53b.mjs`.');
