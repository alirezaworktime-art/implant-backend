c = open('client.js').read()
a = "`هر وقت تصمیم به انجام درمان گرفتید، متن زیر را به شماره‌ی ${fa(no)} پیامک کنید:`"
assert a in c
c = c.replace(a, "`هر وقت تصمیم به انجام درمان گرفتید، متن زیر را به شماره‌ی ${faD(no)} پیامک کنید:`")
open('client.js', 'w').write(c)
t = open('t-m57a.mjs').read()
a = t[t.index("  await openQ(ids[0]); await p.evaluate(() => { const S = AS(); S.aox.chips"):t.index("  ok(v.aox && v.ko.startsWith('false')")]
b = """  await openQ(ids[0]);
  v = await p.evaluate(() => { const S = AS(); const k = (SEC.aox.groups || []).flatMap(g => g.items || g.opts || []).map(o => o.k || o)[0] || 'U'; S.aox.sel[typeof k === 'string' ? k : 'U'] = true; recalc(); m11Brands(); const B = k => { const e = document.querySelector(`#brandTotals [data-brand="${k}"]`); return e ? e.disabled + ':' + (e.title || '') : 'none' }; return { aox: m11Aox(AS()), it: B('it'), ko: B('ko'), ir: B('ir'), sw: B('sw'), note: (document.querySelector('[data-sec="aox"] .note') || {}).textContent } });
"""
t = t.replace(a, b)
t = t.replace("ok(v.ko === 'ko' && v.it === 'it' && v.ir === 'it', 'surgery day", "ok(v.ko === 'کره‌ای' && v.it === 'ایتالیایی' && v.ir === 'ایتالیایی', 'surgery day")
open('t-m57a.mjs', 'w').write(t)
print('ok')
