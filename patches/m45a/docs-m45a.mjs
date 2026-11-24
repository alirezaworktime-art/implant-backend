// adds the m45a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m45a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m45a زنده شد', '**2026-11-17 — m45a زنده شد** (ایران و Cloudflare). برگه‌ی جراحی: «بخیه‌ی این جلسه» (`ses.sut`)؛ «سرجیکال گاید» با انتخاب فک به‌صورت ردیف «سایر درمان‌ها» (مبلغ خالی → سرور `arc_sgd` × فک را می‌گذارد و به هزینه اضافه می‌کند)؛ پرسش برای دندانی که قبلاً ایمپلنت گرفته و دوباره «جدید» ثبت می‌شود؛ پرسش هنگام پایان جراحی اگر مبلغ بیش از ۳۰٪ و ۵ میلیون با طرح فرق دارد + خط `surgAmt` در تاریخچه. `work\\m45a\\SPEC.md`؛ t-m45a (۱۲) و t-m45aui (۱۷) ALL OK. برگشت: `deploy-m43g.sh` + `node cf.mjs put cf-m43g.mjs`.');
