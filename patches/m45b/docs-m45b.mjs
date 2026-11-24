// adds the m45b line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m45b.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m45b زنده شد', '**2026-11-17 — m45b زنده شد** (ایران و Cloudflare). ترخیص مهلت ۶۰ روز ندارد: بیمار ترخیص‌نشده در فهرست پذیرش می‌ماند و هر زمان ترخیص می‌شود (شرط‌های شماره پرونده، تسویه و نسخه سر جایشان). پروتز مثل قبل از روز ۶۰ خودش آزاد می‌شود. چهار لنگر سرور + `sdItems` صفحه. `work\\m45b\\SPEC.md`؛ t-m45b (۱۰) ALL OK. برگشت: `deploy-m45a.sh` + `node cf.mjs put cf-m45a.mjs`.');
