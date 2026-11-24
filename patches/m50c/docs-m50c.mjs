// adds the m50c line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m50c.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m50c زنده شد', '**2026-11-18 — m50c زنده شد** (ایران و Cloudflare؛ فقط صفحه). برگه‌ی روز جراحی: دکمه‌ی «فیل اولیه» از «درمان‌های طرح» (راست) به اول فهرست «خارج از طرح» (چپ) رفت. `work\\m50c\\SPEC.md`؛ t-m50cui (۵) ALL OK. برگشت: `deploy-m50b.sh` + `node cf.mjs put cf-m50b.mjs`.');
