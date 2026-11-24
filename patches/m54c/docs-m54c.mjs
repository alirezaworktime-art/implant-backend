// adds the m54c line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m54c.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m54b زنده شد', '**2026-11-18 — m54b زنده شد** (با m54c منتشر شد). بیماران منتظر تسویه‌ی اختلاف هزینه‌ی جراحی فقط در کارتابل پذیرش؛ از صف و شمارنده‌ی مشاور برداشته شدند (مشاور از بایگانی/پرونده هنوز می‌تواند تسویه کند). `work\\m54b\\SPEC.md`؛ t-m54b (۹) ALL OK.');
add('m54c زنده شد', '**2026-11-18 — m54c زنده شد** (ایران و Cloudflare). فیلدهای تکمیلی m54a به خواست مالک برداشته شد (مشخصات تکمیلی، هشدار پزشکی، چک/گارانتی/رضایت، ثبت تکمیلی جراحی)؛ «بستن پرونده»، نتیجه‌ی تماس‌ها و کارهای خودکار ماند. `work\\m54c\\SPEC.md`؛ t-m54c (۳۴) ALL OK. برگشت: `deploy-m54a.sh` + `node cf.mjs put cf-m54a.mjs`.');
