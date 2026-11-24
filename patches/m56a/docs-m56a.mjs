// adds the m56a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m56a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m56a زنده شد', '**2026-11-18 — m56a زنده شد** (ایران و Cloudflare). تعرفه‌ی «کلینیک باصری» و «کلینیک دانشگاه» از اکسل مالک (دستمزد ما، فقط در «انجام کار»؛ تومان × ۱۰ = ریال) یک بار در `oc_clinic.svc` (kv `m56seed`؛ قیمتِ واردشده عوض نمی‌شود)؛ خدمت‌های ایمپلنتی چندگانه (IMP، فیکسچر JD/نازال/تریگوئید/زایگوما، جراحی زایگوما/نازال/تریگوئید) با شمارش از «موارد خاص» کارت ایمپلنت. `work\\m56a\\SPEC.md`؛ t-m56a (۱۳) ALL OK. برگشت: `deploy-m55a.sh` + `node cf.mjs put cf-m55a.mjs` (تعرفه‌های نوشته‌شده می‌مانند).');
