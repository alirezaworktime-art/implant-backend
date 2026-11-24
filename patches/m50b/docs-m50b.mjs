// adds the m50b line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m50b.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m50b زنده شد', '**2026-11-18 — m50b زنده شد** (ایران و Cloudflare). (۱) پذیرش در «تعیین تکلیف مالی» روش پرداخت را عوض می‌کند: «نقدی کامل با ۵٪ تخفیف» / «طبق طرح مشاور» (اکشن `m50PayMode`؛ شرایط مشاور در `pay.m50o`؛ با چک ثبت‌شده رد می‌شود)؛ (۲) «پزشک کلینیک» در دستیاران روز جراحی (بدون سهم پزشک)؛ (۳) طرح درمان: «ارجاع به پزشک دیگر» با نام پزشک (`h.rdoc`، `h.rdocN`) + کار پذیرش. `work\\m50b\\SPEC.md`؛ t-m50b (۲۳) ALL OK. برگشت: `deploy-m50a.sh` + `node cf.mjs put cf-m50a.mjs`.');
