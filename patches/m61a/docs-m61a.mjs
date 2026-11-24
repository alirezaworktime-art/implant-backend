// adds the m61a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m61a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m61a زنده شد', '**2026-11-23 — m61a زنده شد** (روی m60a). کارت پروتز = «ادامه درمان» + «سفارش لابراتوار». ادامه درمان روی چارت دندان: مرحله‌ی هر دندان (`pros.ts`، مرحله‌ی بیمار = عقب‌ترین)، کار امروز، فیل با ۴ راه (ارجاع به جراح `pros.hold` / توقف / پونتیک / بدون دندان)، مرحله‌ی بعد → کار «نوبت دوباره» منشی (`pros.nxt`)، دستیار. اکشن `m61`. `work\\m61a\\SPEC.md`؛ t-m61a (۲۰) ALL OK. برگشت: `deploy-m60a.sh` + `node cf.mjs put cf-m60a.mjs`.');
