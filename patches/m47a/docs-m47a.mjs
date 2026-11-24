// adds the m47a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m47a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m47a زنده شد', '**2026-11-17 — m47a زنده شد** (ایران و Cloudflare). «جلسه‌ی پروتز»: اول کار جلسه با جدول دندانی پایه/پونتیک؛ دستورکار لابراتوار فقط با دکمه‌ی «ارسال کار برای لابراتوار» باز می‌شود، هیچ فیلدش اجباری نیست (سفارش با `order.m47`؛ دندان از جدول جلسه، «ساخت برای» = اولین مرحله‌ی مسیر، تاریخ خالی = ۱۰ روز) و فایل همان‌جا بارگذاری می‌شود. قواعد مسیر و مسیرهای دیگر سفارش مثل قبل. `work\\m47a\\SPEC.md`؛ t-m47a (۱۶) و t-m47aui (۱۷) ALL OK. برگشت: `deploy-m46c.sh` + `node cf.mjs put cf-m46c.mjs`.');
