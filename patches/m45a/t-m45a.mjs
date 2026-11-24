// t-m45a (server): suture kind kept with the session; surgical-guide row priced from the manager's tariff; history line when the cost is far from the plan. Run: WORKER=<m45a bundle> node t-m45a.mjs
import { start, uuid, REC } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 500) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start(); const OLD = REC.queueAdd[0].req.id;
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const body = (id, name, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id).split('رضا آزمایشی').join(name)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; return q };
const sg = id => JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg), ev = id => h.sql(`select title, detail from events where plan='${id}' and kind='surgAmt'`);
try {
  await h.must('manager', 'settings', { settings: { prices: { arc_sgd: { price: '3000000' } } } });
  let nm = 'بیمار گاید', id = await mk(nm), q = body(id, nm, true); const planned = Number(h.sql(`select total from plans where id='${id}'`)[0].total); q.actual = planned; q.planned = planned; q.session.sut = 'abs'; q.session.oth = [{ t: 'سرجیکال گاید — هر دو فک', amt: '' }, { t: 'کار دیگر', amt: 500000 }];
  let r = await h.call('surgery', 'surgSave', q); ok(r.ok, 'session with suture kind and a guide row without amount saved', r); let s = sg(id);
  ok(s.sessions[0].sut === 'abs', 'the session keeps «بخیه‌ی جذبی»', s.sessions[0].sut);
  const g = (s.sessions[0].oth || []).find(o => o.t.startsWith('سرجیکال گاید')), o2 = (s.sessions[0].oth || []).find(o => o.t === 'کار دیگر');
  ok(g && g.amt === 6000000 && o2 && o2.amt === 500000, 'guide for both jaws = 2 × the manager tariff; the other row is untouched', s.sessions[0].oth);
  ok(s.actual === planned + 6000000 && s.diff === 6000000, 'the guide amount is added to the session cost (difference goes to settlement)', { a: s.actual, d: s.diff });
  ok(ev(id).length === 0, 'a difference of 6,000,000 on a 50,000,000 plan leaves no «far from plan» line', ev(id));
  nm = 'بیمار مبلغ‌دار'; id = await mk(nm); q = body(id, nm, true); q.actual = planned; q.planned = planned; q.session.sut = 'zz'; q.session.oth = [{ t: 'سرجیکال گاید — فک بالا', amt: 1000000 }];
  r = await h.call('surgery', 'surgSave', q); s = sg(id); ok(r.ok && s.sessions[0].sut === undefined && s.sessions[0].oth[0].amt === 1000000 && s.actual === planned, 'unknown suture value dropped; a guide with its own amount is kept as typed and not added twice', { sut: s.sessions[0].sut, oth: s.sessions[0].oth, a: s.actual });
  nm = 'بیمار بدون تعرفه'; await h.must('manager', 'settings', { settings: { prices: { arc_sgd: { price: '' } } } }); id = await mk(nm); q = body(id, nm, false); q.actual = planned; q.planned = planned; q.session.oth = [{ t: 'سرجیکال گاید — فک پایین', amt: '' }];
  r = await h.call('surgery', 'surgSave', q); s = sg(id); ok(r.ok && s.sessions[0].oth[0].amt === 0, 'no tariff in settings → the row stays without amount', s.sessions[0].oth);
  nm = 'بیمار مبلغ دور'; id = await mk(nm); q = body(id, nm, true); q.actual = 1000; q.planned = planned; r = await h.call('surgery', 'surgSave', q); const E = ev(id);
  ok(r.ok && E.length === 1 && /اختلاف زیاد/.test(E[0].title) && E[0].detail.includes(String(planned)), 'a finished surgery far from the plan leaves a line in the patient history', E);
  nm = 'بیمار ناتمام'; id = await mk(nm); q = body(id, nm, false); q.actual = 1000; q.planned = planned; r = await h.call('surgery', 'surgSave', q); ok(r.ok && ev(id).length === 0, 'an unfinished surgery is not judged yet', ev(id));
  nm = 'بیمار عادی'; id = await mk(nm); q = body(id, nm, true); q.actual = planned; q.planned = planned; r = await h.call('surgery', 'surgSave', q); s = sg(id); ok(r.ok && ev(id).length === 0 && s.sessions[0].sut === undefined && !s.sessions[0].oth, 'a normal session is exactly as before', { s: s.sessions[0].sut, o: s.sessions[0].oth });
  // same-day edit keeps working with the new fields
  const qe = body(id, nm, true); qe.actual = planned; qe.planned = planned; qe.session.sut = 'non'; r = await h.call('surgery', 'surgEdit', { ...qe, n: 1 }); s = sg(id); ok(r.ok && s.sessions[0].sut === 'non', 'same-day edit can set the suture kind', { r: r.ok || r.error, s: s.sessions[0].sut });
  { const tb = await h.call('accountant', 'finTrial', {}); const rows = (tb && (tb.rows || tb.items)) || []; const dr = rows.reduce((a, x) => a + (Number(x.dr) || 0), 0), cr = rows.reduce((a, x) => a + (Number(x.cr) || 0), 0); ok(tb && tb.ok !== false && Math.abs(dr - cr) < 1, 'accounting trial balance still balanced', { dr, cr }) }
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
