// adds the m46c line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m46c.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m46c زنده شد', '**2026-11-17 — m46c زنده شد** (ایران و Cloudflare). برگه‌ی جراحی: «سایر درمان‌ها» شد «سایر خدمات» و هر ردیف علاوه بر نام و مبلغ، دندان‌ها (جدول دندانی)، تعداد و پزشک انجام‌دهنده می‌گیرد (`session.othx` هم‌ردیف `session.oth`)؛ در مرور جلسه و سیر درمان پرونده دیده می‌شود. سهم پزشک برای این ردیف‌ها خودکار نیست. `work\\m46c\\SPEC.md`؛ t-m46c (۷) و t-m46cui (۱۳) ALL OK. برگشت: `deploy-m46b.sh` + `node cf.mjs put cf-m46b.mjs`.');
