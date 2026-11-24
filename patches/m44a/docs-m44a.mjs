// adds the m44a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m44a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m44a زنده شد', '**2026-11-17 — m44a زنده شد** (ایران و Cloudflare). برگه‌ی جراحی: «فیل اولیه» + «فیکسچر دوم کاشته شد» روی یک دندان = دو فیکسچر جدا با برند و سایز خودشان (`m.f2`؛ گروه قیمت از فیکسچر کاشته‌شده، `m.g1` گروه اولی). هر دو از قلم خودشان در انبار کم می‌شوند؛ ویرایش همان روز و اصلاح مدیر هم. سه لنگر در سرور (انبار surgSave0، m43bBag، گزارش فیکسچر). `work\\m44a\\SPEC.md`؛ t-m44a (۱۳) و t-m44aui (۱۹) ALL OK. مانده: همین در پرونده‌ی جا مانده (m44b). برگشت: `deploy-m43d.sh` + `node cf.mjs put cf-m43d.mjs`.');
