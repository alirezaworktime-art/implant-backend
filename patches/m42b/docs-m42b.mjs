// adds the m42b line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m42b.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const text = '**2026-11-17 — m42b زنده شد** (ایران و Cloudflare؛ فقط صفحه). پرونده‌ی بیمار: خانه‌ی «طرح درمان» در نوار مرحله‌ها و ردیف «طرح درمان نوشته شد» در سیر درمان از وقتی طرح به مشاور می‌رود پر می‌شود (قبلاً تا تأیید نهایی خالی بود؛ بیمار مردد)؛ زبانه‌ی «همه‌ی توضیح‌ها» برای همه‌ی نقش‌ها (مالی فقط مدیر، مشاور، پذیرش). `work\\m42b\\SPEC.md`؛ تست t-m42bui (۱۹) ALL OK روی نسخه‌ی پاک‌شده. برگشت: `deploy-m42.sh` + `node cf.mjs put cf-m42.mjs`.';
console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), 'm42b زنده شد', text], { encoding: 'utf8' }));
