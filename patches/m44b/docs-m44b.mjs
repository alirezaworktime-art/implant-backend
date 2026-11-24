// adds the m44b line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m44b.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m44b زنده شد', '**2026-11-17 — m44b زنده شد** (ایران و Cloudflare؛ فقط صفحه). پرونده‌ی جا مانده: در پنجره‌ی دندان با «فیل اولیه» → «بله، فیکسچر دوم کاشته شد» فیکسچر دوم یک ردیف جدای «پایه ایمپلنت» (همان تاریخ/پزشک/دندان) با برند، سایز و تعرفه‌ی خودش می‌شود؛ تعرفه‌ی فیل اولیه‌ی خالی صفر می‌شود. سرور از قبل دندانِ دو ردیفی را دو بار از انبار کم می‌کرد. `work\\m44b\\SPEC.md`؛ t-m44bui (۱۹) ALL OK. برگشت: `deploy-m43f.sh` + `node cf.mjs put cf-m43f.mjs`.');
