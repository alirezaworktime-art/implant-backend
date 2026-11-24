// adds the m53a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m53a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m53a زنده شد', '**2026-11-18 — m53a زنده شد** (ایران و Cloudflare). پنج شکاف روند بیمار: کار پذیرش `stuckq` (مانده در صف پزشک/مشاور از روز قبل) و `stucks` (مانده در اتاق جراحی)، نگه داشتن کار قالب‌گیری تا پایان جراحی (kv `m53impr:`)، کار `nodis` وقتی پروتز قبل از ترخیص/تسویه شروع شود، بستن خودکار numb/week/suture (شروع پروتز یا ۳۰/۶۰ روز دیرکرد). `work\\m53a\\SPEC.md`؛ t-m53a (۲۴) ALL OK. برگشت: `deploy-m52a.sh` + `node cf.mjs put cf-m52a.mjs`.');
