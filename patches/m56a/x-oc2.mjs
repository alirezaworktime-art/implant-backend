// explore the test database tables of «سایر کلینیک‌ها» (fresh test data only)
const A = await import('file:///home/claude/w/audit/A.mjs'); const h = await A.start(); const J = (x, n = 3000) => JSON.stringify(x).slice(0, n);
try {
  await h.call('accountant', 'oc', { op: 'load' });
  console.log(J(h.sql("select name, sql from sqlite_master where type='table' and (name like 'oc%' or sql like '%clinic%')")));
  const t = h.sql("select name from sqlite_master where type='table' and name like 'oc%'").map(x => x.name);
  for (const n of t) console.log(n, J(h.sql(`select * from ${n} limit 2`), 900));
  console.log('kv', J(h.sql("select k, substr(v,1,300) v from kv where k like 'oc%'"), 1500));
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 600)) }
h.stop(); process.exit(0);
