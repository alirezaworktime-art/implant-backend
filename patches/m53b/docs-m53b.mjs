// adds the m53b line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m53b.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m53b زنده شد', '**2026-11-18 — m53b زنده شد** (ایران و Cloudflare؛ فقط سرور). کار `nodis` ۶۰ روز بعد از جراحی خودکار بسته می‌شود؛ `pweek` بعد از ۳۰ روز دیرکرد. ممیزی کامل دوم: `implant/audits/2026-11-18-full-flow-and-fields.md` (پیشنهادها منتظر مالک). `work\\m53b\\SPEC.md`. برگشت: `deploy-m53a.sh` + `node cf.mjs put cf-m53a.mjs`.');
