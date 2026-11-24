// adds the m55a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m55a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m55a زنده شد', '**2026-11-18 — m55a زنده شد** (ایران و Cloudflare؛ فقط صفحه). «موارد خاص» پایه ایمپلنت: نوع از فهرست (روت، اشترومن، زایگوما، نازال، تریگوئید)، هرکدام با تعرفه‌ی خودش + بقیه با برند طرح؛ تعرفه‌های تازه‌ی تنظیمات `sp_z/sp_n/sp_t` (خالی = All on X همان نوع)، در طرح `imp.ip.spz/spn/spt`؛ روز جراحی همان تعرفه. `work\\m55a\\SPEC.md`؛ t-m55a (۱۹) ALL OK. برگشت: `deploy-m54c.sh` + `node cf.mjs put cf-m54c.mjs`.');
