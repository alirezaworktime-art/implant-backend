// adds the m60a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m60a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m60a زنده شد', '**2026-11-23 — m60a زنده شد** (روی m59a). روز جراحی: دکمه‌ی «موجودی فیکسچر» (بالای صفحه + برگه‌ی ایمپلنت): «نداریم» به تفکیک برند و جدول قطر × طول با تعداد؛ فقط خواندن از انبار. `work\\m60a\\SPEC.md`؛ t-m60a (۱۲) ALL OK. برگشت: `deploy-m59a.sh` + `node cf.mjs put cf-m59a.mjs`.');
