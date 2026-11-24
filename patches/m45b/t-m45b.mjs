// t-m45b (server): discharge has no 60-day limit; prosthesis still frees itself after day 60. Run: WORKER=<m45b bundle> OLD=<m45a bundle> node t-m45b.mjs
import { start, uuid, REC } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 400) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start(); const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const pre = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; const tot = Number(h.sql(`select total from plans where id='${id}'`)[0].total); q.actual = tot; q.planned = tot; await h.must('surgery', 'surgSave', q); return id };
const inList = async id => { const r = await h.call('staff', 'queue', {}); const it = (r.items || []).find(x => x.id === id); return !!it };
const dis = id => { const s = JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg); return s.dis || null };
try {
  const a = await pre('بیمار دیر با نسخه'), b = await pre('بیمار دیر بی نسخه'), c = await pre('بیمار به‌موقع');
  await h.must('staff', 'rxGive', { id: a, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id: a, file: '4101', by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id: b, file: '4102', by: 'منشی' });
  await h.must('staff', 'rxGive', { id: c, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id: c, file: '4103', by: 'منشی' });
  let r = await h.call('staff', 'discharge', { id: c, by: 'منشی' }); ok(r.ok && dis(c), 'discharge inside 60 days works as before', r);
  ok(await inList(a), 'day 0: the patient is in the reception discharge list');
  await h.travel(75);
  ok(await inList(a) && await inList(b), 'day 75: the patients are still in the reception list (before: they dropped out after 60 days)');
  r = await h.call('staff', 'discharge', { id: b, by: 'منشی' }); ok(r.ok === false && /نسخه/.test(r.error || ''), 'day 75: the other conditions still hold (no prescription → refused with that reason)', r);
  r = await h.call('staff', 'discharge', { id: a, by: 'منشی' }); ok(r.ok && dis(a), 'day 75: discharge is accepted', r);
  ok(!(await inList(a)), 'after discharge the patient leaves the list');
  r = await h.call('staff', 'discharge', { id: a, by: 'منشی' }); ok(r.ok, 'a second click is harmless', r);
  r = await h.call('staff', 'discharge', { id: 'nope', by: 'منشی' }); ok(r.ok === false, 'unknown patient refused', r);
  const w = await h.add('بیمار بدون جراحی'); r = await h.call('staff', 'discharge', { id: w, by: 'منشی' }); ok(r.ok === false, 'a patient without surgery is refused', r);
  r = await h.call('surgery', 'discharge', { id: b, by: 'x' }); ok(r.ok === false, 'only reception / manager discharge', r);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
