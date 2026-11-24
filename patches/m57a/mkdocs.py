s = open('../m51a/docs-m51a.mjs').read()
i = s.index("add('m51a زنده شد'")
head = s[:i].replace('m51a', 'm57a')
a = "add('m57a زنده شد', '**2026-11-20 — m57a زنده شد** (ایران و Cloudflare؛ روی m55a، بدون m56a). All on X با برند کره‌ای هم (قیمت بدون تغییر)؛ PDF بیمار «می‌خواهد فکر کند» متن پیامک «‹نام› مایل به درمان ‹n› واحد ایمپلنت در یزد می‌باشم.» به شماره‌ی تنظیمات مدیر (kv `m57sms`)؛ مشاور تا ۵ بیمار را در نوار بالای صفحه باز نگه می‌دارد (پیش‌نویس هر بیمار روی دستگاه). `work\\\\m57a\\\\SPEC.md`؛ t-m57a (۲۰) ALL OK. برگشت: `deploy-m55a.sh` + `node cf.mjs put cf-m55a.mjs`.');\n"
open('docs-m57a.mjs', 'w').write(head + a)
print('ok')
