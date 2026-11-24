// explore: what «سایر کلینیک‌ها» holds in a fresh test database (no patient data)
const A = await import('file:///home/claude/w/audit/A.mjs'); const h = await A.start(); const J = (x, n = 1500) => JSON.stringify(x).slice(0, n);
try {
  for (const role of ['manager', 'staff', 'oclin', 'accountant']) { const r = await h.call(role, 'oc', { op: 'load' }); console.log(role, r.ok, r.error || '', r.ok ? J({ keys: Object.keys(r), clinics: (r.clinics || []).filter(c => /باصری|دانشگاه/.test(c.name)).map(c => ({ id: c.id, name: c.name, active: c.active, ob: c.ob, svc: c.svc.map(s => s.k + "|" + s.n + "|" + s.p + "|" + (s.sec || "") + (s.fixed ? "|F" : "")) })), order: (r.clinics || []).map(c => c.id), kinds: r.kinds, catalog: r.catalog, g: r.g, secs: r.secs, pros: r.pros }, 2500) : '') }
  console.log('PW roles', Object.keys(A.PW).join(','));
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 600)) }
h.stop(); process.exit(0);
