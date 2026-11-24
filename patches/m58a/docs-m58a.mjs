// adds the m58a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m58a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m58a زنده شد', '**2026-11-20 — m58a زنده شد** (ایران و Cloudflare؛ روی m57a). کارت بیمار پروتز در کارتابل پزشک دو دکمه‌ی جدا دارد: «کار امروز» (نوع کار + پایه/پونتیک + توضیح؛ در پرونده و PDF، بدون سفارش؛ بعد کارتابل منشی) و «سفارش لابراتوار» (همان فرم سفارش پرونده). PDF پرونده: «توضیح کامل مراحل». فقط صفحه. `work\\m58a\\SPEC.md`؛ t-m58a (۱۵) ALL OK؛ t-m47aui از رگرسیون برداشته شد. برگشت: `deploy-m57a.sh` + `node cf.mjs put cf-m57a.mjs`.');
