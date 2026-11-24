// adds the m42c line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m42c.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const text = '**2026-11-17 — m42c زنده شد** (ایران و Cloudflare؛ فقط صفحه). نوار شناور دکمه‌های ثبت (m41) در ویرایشگر پرونده‌ی کاغذی روی موبایل/تبلت نمی‌آمد (چشمک می‌زد و پنهان می‌ماند)؛ اصلاح شد. فرم طرح درمان نوار ثابت خودش را دارد (بررسی شد، درست). `work\\m42c\\SPEC.md`؛ تست t-m42cui (۱۶) ALL OK روی نسخه‌ی پاک‌شده. برگشت: `deploy-m42b.sh` + `node cf.mjs put cf-m42b.mjs`.';
console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), 'm42c زنده شد', text], { encoding: 'utf8' }));
