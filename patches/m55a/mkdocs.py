s = open('../m51a/docs-m51a.mjs').read()
i = s.index("add('m51a زنده شد'")
head = s[:i].replace('m51a', 'm55a')
a = "add('m55a زنده شد', '**2026-11-18 — m55a زنده شد** (ایران و Cloudflare؛ فقط صفحه). «موارد خاص» پایه ایمپلنت: نوع از فهرست (روت، اشترومن، زایگوما، نازال، تریگوئید)، هرکدام با تعرفه‌ی خودش + بقیه با برند طرح؛ تعرفه‌های تازه‌ی تنظیمات `sp_z/sp_n/sp_t` (خالی = All on X همان نوع)، در طرح `imp.ip.spz/spn/spt`؛ روز جراحی همان تعرفه. `work\\\\m55a\\\\SPEC.md`؛ t-m55a (۱۹) ALL OK. برگشت: `deploy-m54c.sh` + `node cf.mjs put cf-m54c.mjs`.');\n"
open('docs-m55a.mjs', 'w').write(head + a)
print('ok')
