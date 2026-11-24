// adds the m46a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m46a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m46a زنده شد', '**2026-11-17 — m46a زنده شد** (ایران و Cloudflare؛ فقط صفحه). پذیرش: «ارجاع مستقیم به جراحی» روی کار «نوبت جراحی» (بدون ثبت نوبت؛ همان `toSurgery` با سد پرداخت، برگه‌ی انتخاب طرح، و برند انتخاب‌نشده → «تعیین تکلیف مالی» خودش باز می‌شود). برگه‌ی جراحی و سیر درمان پرونده: «برند ایمپلنت بیمار: …». `work\\m46a\\SPEC.md`؛ t-m46aui (۱۶) ALL OK. برگشت: `deploy-m45b.sh` + `node cf.mjs put cf-m45b.mjs`.');
