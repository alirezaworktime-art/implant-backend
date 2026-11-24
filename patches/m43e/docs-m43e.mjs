// adds the m43e line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m43e.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m43e زنده شد', '**2026-11-17 — m43e زنده شد** (ایران و Cloudflare؛ فقط صفحه). کاشی «تعرفه و سهم پزشکان» روی «سهم هر پزشک» باز می‌شود: هر پزشک برای هر خدمت عدد خودش (مثلاً GBR برای دو پزشک دو عدد). «سهم مشترک» اختیاری شد و عدد خود پزشک بر آن مقدم است. `work\\m43e\\SPEC.md`؛ t-m43eui (۸) ALL OK. برگشت: `deploy-m44a.sh` + `node cf.mjs put cf-m44a.mjs`.');
