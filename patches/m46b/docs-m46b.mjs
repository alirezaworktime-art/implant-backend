// adds the m46b line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m46b.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m46b زنده شد', '**2026-11-17 — m46b زنده شد** (ایران و Cloudflare؛ فقط صفحه). برگه‌ی «طرح درمان بیمار» پذیرش (انتخاب طرح وقتی مشاور «ارجاع به پذیرش» زده) زیر دکمه‌ها جزئیات هر طرح را نشان می‌دهد: درمان‌ها با نمودار دندان و شرح. `work\\m46b\\SPEC.md`؛ t-m46bui (۵) ALL OK. برگشت: `deploy-m46a.sh` + `node cf.mjs put cf-m46a.mjs`.');
