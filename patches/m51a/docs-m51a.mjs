// adds the m51a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m51a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m51a زنده شد', '**2026-11-18 — m51a زنده شد** (ایران و Cloudflare). پرونده‌ی کاغذی: شماره پرونده یا کد ملی تکراری همان موقع تایپ هشدار می‌دهد (جعبه‌ی قرمز زیر مشخصات + دکمه‌ی «پرونده»؛ اکشن فقط‌خواندنی `m51Dup`). کنترل‌های موقع ذخیره مثل قبل. `work\\m51a\\SPEC.md`؛ t-m51a (۱۵) ALL OK. برگشت: `deploy-m50e.sh` + `node cf.mjs put cf-m50e.mjs`.');
