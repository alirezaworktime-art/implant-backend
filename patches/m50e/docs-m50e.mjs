// adds the m50e line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m50e.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m50e زنده شد', '**2026-11-18 — m50e زنده شد** (ایران و Cloudflare؛ فقط صفحه). روز جراحی، پنجره‌ی ایمپلنت: دندانِ بدون برند روی آخرین برند انتخاب‌شده‌ی همین جلسه باز می‌شود (قبلاً به اولین برند گروه طرح / JD Plus برمی‌گشت). `work\\m50e\\SPEC.md`؛ t-m50eui (۹) ALL OK. برگشت: `deploy-m50d.sh` + `node cf.mjs put cf-m50d.mjs`.');
