// t-m36mig: one-time removal of «QC» and «مجوز خروج» from processes and from running orders. Run: WORKER=<m36 bundle> node t-m36mig.mjs
import * as A from '../audit/A.mjs';
const h = await A.start(); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
try {
  // a database as the live one looks before m36: departments with QC / مجوز خروج, a running order waiting at QC
  h.sql(`CREATE TABLE IF NOT EXISTS lab_dept (id INTEGER PRIMARY KEY, name TEXT, flags TEXT, active INTEGER, sort INTEGER)`);
  h.sql(`CREATE TABLE IF NOT EXISTS lab_proc (id INTEGER PRIMARY KEY, name TEXT, steps TEXT, active INTEGER)`);
  h.sql(`CREATE TABLE IF NOT EXISTS lab_wt (id INTEGER PRIMARY KEY, name TEXT, proc INTEGER, active INTEGER, sort INTEGER)`);
  h.sql(`CREATE TABLE IF NOT EXISTS lab_step (id TEXT PRIMARY KEY, lab TEXT, idx INTEGER, dept INTEGER, dname TEXT, grp INTEGER, st TEXT, asg TEXT, asg_name TEXT, acc_by TEXT, acc_name TEXT, acc_at TEXT, done_by TEXT, done_name TEXT, done_at TEXT, note TEXT)`);
  for (const [id, n] of [[301, 'ساخت'], [302, 'QC'], [303, 'مجوز خروج'], [304, 'ارسال کار نهایی'], [305, 'پرداخت']]) h.sql(`INSERT INTO lab_dept VALUES (${id}, '${n}', '{}', 1, ${id})`);
  h.sql(`INSERT INTO lab_proc VALUES (301, 'قدیمی', '[{"d":301,"g":0},{"d":302,"g":0},{"d":305,"g":0},{"d":303,"g":0},{"d":304,"g":0}]', 1)`);
  h.sql(`INSERT INTO lab_wt VALUES (301, 'قدیمی', 301, 1, 1)`);
  const now = new Date().toISOString(), cols = h.sql(`PRAGMA table_info(labs)`).map(c => c.name);
  ok(cols.includes('data'), 'labs table exists before the first lab call', cols);
  const ins = (id, st) => h.sql(`INSERT INTO labs (id,plan,name,st,data,due,created,upd,log) VALUES ('${id}','','بیمار','${st}','{"for":"tryin"}','2030-01-01','${now}','${now}','[]')`);
  ins('L1', 'making'); ins('L2', 'done');
  const step = (lab, i, d, n, st, x = '') => h.sql(`INSERT INTO lab_step (id,lab,idx,dept,dname,grp,st${x ? ',acc_by,acc_name,acc_at' : ''}) VALUES ('${lab}-${i}','${lab}',${i},${d},'${n}',0,'${st}'${x ? `,'u1','کارمند','${now}'` : ''})`);
  step('L1', 0, 301, 'ساخت', 'done'); step('L1', 1, 302, 'QC', 'acc', 1); step('L1', 2, 305, 'پرداخت', 'pend'); step('L1', 3, 303, 'مجوز خروج', 'pend'); step('L1', 4, 304, 'ارسال کار نهایی', 'pend');
  step('L2', 0, 302, 'QC', 'done');
  const D = await h.call('lab', 'labDefs', { op: 'get' });
  const p = D.procs.find(x => x.id === 301); ok(p && p.steps.map(s => s.d).join() === '301,305,304', 'QC and مجوز خروج left the process', p);
  ok(D.depts.find(d => d.id === 302).active === 0 && D.depts.find(d => d.id === 303).active === 0 && D.depts.find(d => d.id === 301).active === 1, 'both departments are inactive, others untouched');
  const S = h.sql(`select idx, st, done_name, note from lab_step where lab='L1' order by idx`);
  ok(S[1].st === 'skip' && S[3].st === 'skip' && S[1].done_name === 'سامانه' && S[2].st === 'pend' && S[4].st === 'pend', 'open QC / مجوز خروج steps of the running order are passed; the rest waits', S);
  ok(h.sql(`select st from lab_step where id='L2-0'`)[0].st === 'done', 'history of closed orders is kept');
  const cur = JSON.parse(h.sql(`select data from labs where id='L1'`)[0].data).cur; ok(cur && cur.d === 'پرداخت' && !cur.all, 'the order now stands at the next real step', cur);
  const D2 = await h.call('lab', 'labDefs', { op: 'get' }); ok(D2.procs.find(x => x.id === 301).steps.length === 3, 'runs once');
} catch (e) { console.log('ERR', e && e.stack); bad++ } finally { h.stop() }
console.log(bad ? 'FAILED ' + bad : 'ALL OK');
