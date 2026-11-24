// adds the m50d line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m50d.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m50d زنده شد', '**2026-11-18 — m50d زنده شد** (ایران و Cloudflare؛ فقط صفحه). برگه‌ی روز جراحی: «این آخرین جلسه است» پیش‌فرض تیک‌خورده، «فردا: چک بی‌حسی» پیش‌فرض بدون تیک؛ پیش‌نویس همان روز تیک‌های خودش را نگه می‌دارد. `work\\m50d\\SPEC.md`؛ t-m50dui (۶) ALL OK. برگشت: `deploy-m50c.sh` + `node cf.mjs put cf-m50c.mjs`.');
