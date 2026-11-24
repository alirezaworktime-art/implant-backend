t = open('t-m56a.mjs').read()
a = t[t.index("  // ---- a clinic whose tariffs"):t.index("  // ---- «انجام کار» at University")]
b = """  await h.call('accountant', 'oc', { op: 'load' }); await h.call('accountant', 'oc', { op: 'load' });
  ok(!!h.sql("select v from kv where k='m56seed'")[0], 'the tariffs are written once the clinics exist', h.sql("select k from kv where k like 'm56%'"));
  const B = svcOf('bsr'), U = svcOf('uni');
  ok(P('bsr', 'imp') === 45000000 && P('bsr', 'fx_jd') === 115000000 && P('bsr', 'fx_z') === 300000000 && P('bsr', 'fx_n') === 155000000 && P('bsr', 'fx_t') === 155000000 && P('bsr', 'open') === 60000000 && P('bsr', 'close') === 30000000 && P('bsr', 'gbr') === 30000000 && P('bsr', 'vip') === 50000000 && P('bsr', 'hard') === 10000000 && P('bsr', 'soft') === 5000000 && P('bsr', 'alv') === 55000000 && P('bsr', 'unc') === 5000000 && P('bsr', 'staff') === 2240000, 'Baseri: all tariffs of the sheet (toman x 10 = rial)', B);
  ok(P('uni', 'imp') === 60000000 && P('uni', 'fx_jd') === 160000000 && P('uni', 'fx_z') === 400000000 && P('uni', 'sg_z') === 400000000 && P('uni', 'sg_n') === 120000000 && P('uni', 'sg_t') === 120000000 && P('uni', 'hard') === 25000000 && P('uni', 'soft') === 10000000 && P('uni', 'alv') === 50000000 && P('uni', 'gbr') === 20000000 && P('uni', 'vip') === 40000000 && P('uni', 'close') === 30000000, 'University: all tariffs of the sheet', U);
  ok(['ext', 'ridge'].every(k => B.some(s => s.k === k)) && B.find(s => s.k === 'ext').p === 0, 'nothing removed; services that are not on the sheet stay as they were', B.map(s => s.k));
  ok(JSON.stringify(svcOf('rsh')).includes('"p":60000000') && !svcOf('rsh').some(s => s.k === 'fx_jd'), 'other clinics are not touched');
  h.sql("update oc_clinic set svc=replace(svc,'\\"p\\":45000000','\\"p\\":47000000') where id='bsr'");
"""
t = t.replace(a, b)
t = t.replace("  ok(P('bsr', 'imp') === 47000000, 'a price entered by hand is never overwritten (seed ran again after restart)', P('bsr', 'imp'));\n", "")
t = t.replace("""await p.evaluate(() => { const b = document.querySelector('[data-oc3new="work"]'); b.click() }); await W(1200);""", "await p.evaluate(() => oc3New('work', null)); await W(1200);")
open('t-m56a.mjs', 'w').write(t)
print(t.count("oc3New('work'"))
