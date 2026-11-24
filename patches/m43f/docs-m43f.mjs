// adds the m43f line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m43f.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m43f زنده شد', '**2026-11-17 — m43f زنده شد** (ایران و Cloudflare؛ فقط صفحه). تنظیمات مدیر → «پزشکان، کارکنان، سهم پزشک…»: «نام تازه» از روی حساب‌های شخصی فعال انتخاب می‌شود (نقش از روی حساب پر می‌شود)؛ «نام دیگر…» برای نوشتن می‌ماند. `work\\m43f\\SPEC.md`؛ t-m43fui (۱۰) ALL OK. برگشت: `deploy-m43e.sh` + `node cf.mjs put cf-m43e.mjs`.');
