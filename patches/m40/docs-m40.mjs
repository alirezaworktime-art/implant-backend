// adds the m40 line to CLAUDE.md and HANDOFF (idempotent). node docs-m40.mjs [live "<text about the publish>"]
import fs from 'node:fs';
const R = 'C:/Users/Admin/Desktop/implant-cowork/';
const live = process.argv[2] === 'live' ? (process.argv[3] || '') : '';
const built = '- **2026-11-17 - m40: ساخته و تست شده (هنوز منتشر نشده؛ زنده = m39).** کارمند ساده‌ی لابراتوار (هر حسابی جز سرپرست و پذیرش؛ طراح هم) فقط به کارهایی که به او ارجاع شده دسترسی دارد (`claude-code-kit\\work\\m40\\SPEC.md`). سرور: `labList` فقط سفارش‌های باز با مرحله‌ی باز به نام او و بدون `acct/acctName/pay`؛ `labOrder`/`labFile`/`labStep` فقط روی کار او؛ `lab5` فقط `perf`، `seen`، `m40mine` (تازه: مرحله‌هایی که تمام کرده) و `boot`/`bstats` خالی‌شده؛ `labDefs get` فقط نام‌ها؛ `labSet`/`labStart`/`lab4New`/`lab4Pats`/`lab4Find`/`labRet` بسته. پاسخ‌های محدودشده `m40:1` دارند. صفحه: بدون منوی کناری؛ سه کاشی «برای من آمده»، «نیمه‌تمام»، «تمام‌کرده‌ام» (۳۰ روز + قدیمی‌ترها). تست: `t-m40` (۳۸) و `t-m40ui` (۲۱) ALL OK؛ رگرسیون `work\\audit\\reg-m40.sh` (۴۱ تست) ALL OK؛ `t-m36`، `t-m36ui`، `t-m39ui` برای قانون تازه به‌روز شدند (قبلی `*.pre-m40.mjs`). باندل‌ها: `iran-server\\iran-worker-m40.mjs` (md5 `79a62a82317d88d292b6b816e28f2c35`)، `Desktop\\implant\\iran-server\\cf-m40.mjs`. ساخت `claude-code-kit\\build-m40.sh`؛ انتشار `work\\m40\\pub-m40.sh` (فقط بعد از تأیید مالک)؛ برگشت m39. شمارش زنده قبل از انتشار (`iran-server\\82-labusers-check.sh`): ۱۷ حساب فعال لابراتوار = ۱ سرپرست، ۴ پذیرش، ۱۲ کارمند ساده.';
const line = live ? '- **2026-11-17 - m40 زنده است.** ' + live : built;
const key = live ? 'm40 زنده است' : 'm40: ساخته و تست شده';
for (const f of ['CLAUDE.md', 'claude-code-kit/HANDOFF-2026-11-06.md']) {
  const p = R + f; const s = fs.readFileSync(p, 'utf8'); if (s.includes(key)) { console.log(f, 'already'); continue; }
  const L = s.split('\n'); const i = L.findIndex(x => x.startsWith('- **2026-11-1')); if (i < 0) throw new Error('anchor not found in ' + f);
  L.splice(i, 0, line); fs.writeFileSync(p, L.join('\n')); console.log(f, 'ok at line', i + 1);
}
