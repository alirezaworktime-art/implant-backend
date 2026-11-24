// explore: does the clinic save keep custom keys / several «imp» sections / a sec on count services?
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const h = await A.start(); const J = (x, n = 3000) => JSON.stringify(x).slice(0, n);
try {
  let r = await h.call('accountant', 'oc', { op: 'load' }); const c = r.clinics.find(x => x.id === 'uni');
  const svc = c.svc.map(s => Object.assign({}, s)).concat([{ k: 'fx_z', n: 'فیکسچر زایگوما', p: 400000000, sec: 'imp' }, { k: 'sg_z', n: 'جراحی زایگوما', p: 400000000, sec: 'imp' }, { k: '', n: 'نسج نرم', p: 10000000, sec: '' }, { k: 'staff', n: 'پرسنل (ساعت)', p: 2240000, sec: '', zz: 1 }]);
  r = await h.call('accountant', 'oc', { op: 'clinic', c: { id: 'uni', name: c.name, ob: 0, obDay: '', active: 1, svc } }); console.log('save', J(r, 300));
  r = await h.call('accountant', 'oc', { op: 'load' }); console.log('after', J(r.clinics.find(x => x.id === 'uni').svc.map(s => s.k + '|' + s.n + '|' + s.p + '|' + (s.sec || '') + '|' + Object.keys(s).join('.'))));
  console.log('ord', J(h.sql("select id, ord, active from oc_clinic order by ord")));
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 600)) }
h.stop(); process.exit(0);
