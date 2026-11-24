// t-m18 (API): booking tasks need a decision; changed confirmed plan → consultant; win-back without limits; «وصول مانده» closes when paid.
// Run: WORKER=<bundle> node t-m18.mjs   (needs ../audit/A.mjs + rec.json + server-clock.mjs)
import { start, uuid, REC } from '../audit/A.mjs';
const h = await start(); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + JSON.stringify(x).slice(0, 400))); if (!c) bad++ };
const OLD = REC.queueAdd[0].req.id, sub = (o, id) => JSON.parse(JSON.stringify(o).split(OLD).join(id));
const pay = (id, amount, part = 's') => h.call('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part, amount, by: 'م', note: '' }, sendId: uuid() });
const mk = async n => { const id = await h.add(n); await h.plan(id, n); await h.confirm(id, n, 'book'); return id };
const open = (id, kind) => h.tasks(id).find(t => t.kind === kind && !t.done);
const wb = async id => ((await h.call('staff', 'winback', {})).items || []).find(x => x.id === id);
try {
  /* 1 — booking task */
  const a = await mk('الف نوبت'); let t = open(a, 'book');
  let r = await h.call('staff', 'taskDone', { id: t.id, by: 'منشی' }); ok(r.ok === false && !!open(a, 'book'), 'bare «انجام شد» on a booking task is refused, task stays open', r);
  r = await h.call('staff', 'taskDone', { id: t.id, how: 'later', days: 7, by: 'منشی' }); ok(r.ok && r.later === new Date(Date.parse(h.today()) + 7 * 864e5).toISOString().slice(0, 10) && open(a, 'book').due === r.later, '«پیگیری یک هفته بعد» moves the due day, task stays open', r);
  r = await h.call('staff', 'taskDone', { id: t.id, how: 'later', days: 400 }); ok(r.ok === false, 'later: more than 90 days refused', r);
  r = await h.call('staff', 'taskDone', { id: t.id, how: 'no', why: '' }); ok(r.ok === false && !!open(a, 'book'), '«بیمار نمی‌آید» without a reason refused', r);
  ok(!(await wb(a)), 'not in win-back before');
  r = await h.call('staff', 'taskDone', { id: t.id, how: 'no', why: 'هزینه ندارد', by: 'منشی' }); ok(r.ok !== false && !open(a, 'book'), '«بیمار نمی‌آید» + reason closes the task', r);
  let w = await wb(a); ok(w && w.kind === 'nosurg' && w.info === 'هزینه ندارد', 'patient is in «بازگشت بیماران» at once, with the reason', w);
  ok((await h.where(a)).some(x => x.startsWith('staff:winback')), 'visible somewhere (win-back)', await h.where(a));
  r = await h.call('staff', 'taskDone', { id: t.id, undo: 1 }); ok(r.ok !== false && !!open(a, 'book') && !(await wb(a)), 'undo reopens the task and removes the win-back row', r);
  await h.call('staff', 'taskDone', { id: t.id, how: 'no', why: 'سفر است', by: 'منشی' }); await h.appt(a, 'الف نوبت', 'surg', new Date(Date.parse(h.today()) + 3 * 864e5).toISOString().slice(0, 10), ''); ok(!(await wb(a)), 'a later appointment removes the win-back row', await wb(a));
  /* other kinds */
  const b = await mk('ب پس از جراحی'); await h.appt(b, 'ب پس از جراحی', 'surg', h.today(), open(b, 'book').id); await pay(b, 60000000); await h.must('staff', 'toSurgery', { id: b }); { const R0 = REC.surgSave[0].req, q0 = JSON.parse(JSON.stringify(R0).split(R0.id).join(b)); delete q0.action; q0.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q0.sendId = uuid(); q0.finish = true; await h.must('surgery', 'surgSave', q0) } /* m53a: the impression task is made when the surgery is finished */
  const K = Object.fromEntries(h.tasks(b).filter(x => !x.done).map(x => [x.kind, x]));
  ok(K.numb && K.suture && K.impr, 'after surgery: numb, suture, impr tasks exist', Object.keys(K));
  r = await h.call('staff', 'taskDone', { id: K.numb.id, by: 'منشی' }); ok(r.ok !== false, 'a call task (numb) still closes with a bare «انجام شد»', r);
  r = await h.call('staff', 'taskDone', { id: K.impr.id, by: 'منشی' }); ok(r.ok === false, 'impr: bare done refused', r);
  r = await h.call('staff', 'taskDone', { id: K.impr.id, how: 'did', by: 'منشی' }); ok(r.ok === false && !!open(b, 'impr'), 'impr: «انجام شد» (did) refused — the prosthesis session closes it', r);
  r = await h.call('surgery', 'taskDone', { id: K.suture.id, by: 'پزشک' }); ok(r.ok === false, 'suture: bare done refused (doctor)', r);
  r = await h.call('surgery', 'taskDone', { id: K.suture.id, how: 'did', by: 'پزشک' }); ok(r.ok !== false && !open(b, 'suture') && h.appts(b).some(x => x.kind === 'suture' && x.st === 'done'), 'suture: «بیمار آمد؛ انجام شد» closes the task and its appointment', [r, h.appts(b)]);
  r = await h.call('staff', 'taskDone', { id: K.impr.id, how: 'no', why: 'جای دیگر پروتز می‌کند', by: 'منشی' }); w = await wb(b); ok(r.ok !== false && w && w.kind === 'pros', 'impr «بیمار نمی‌آید» → win-back (pros) at once, not five months later', [r, w]);
  /* 2 — changed confirmed plan */
  const c = await mk('ج ویرایش'); const edit = async (id, chg) => { const q = sub(REC.toConsult[0].req, id); q.record.data._v = h.sql(`select json_extract(data,'$.updatedAt') v from plans where id='${id}'`)[0].v; q.record.data.updatedAt = new Date(Date.now() + 5000 + h.off() * 864e5).toISOString(); chg(q.record); return h.call('doctor', 'save', { record: q.record, sendId: uuid() }) };
  const cur = id => JSON.parse(h.sql(`select data from plans where id='${id}'`)[0].data), row = id => h.sql(`select queue, status, total from plans where id='${id}'`)[0];
  r = await edit(c, rec => { const d = cur(c); Object.assign(rec.data, d, { updatedAt: rec.data.updatedAt, _v: rec.data._v }); rec.data.h = Object.assign({}, d.h, { phone: '09139999999' }); rec.total = row(c).total }); ok(row(c).queue === 'done' && !cur(c).fx4chg, 'header-only edit of a confirmed plan stays where it is', [r, row(c)]);
  r = await edit(c, rec => { const d = cur(c); Object.assign(rec.data, d, { updatedAt: rec.data.updatedAt, _v: rec.data._v }); rec.data.s = JSON.parse(JSON.stringify(d.s)); rec.data.s.imp.sel = ['UR6']; }); ok(r.ok && r.toConsult === 1 && row(c).queue === 'consult' && row(c).status === 'modified' && !!cur(c).fx4chg, 'treatment change of a confirmed plan → consultant inbox', [r, row(c)]);
  const W = await h.where(c); ok(W.includes('consultant:card') && W.includes('staff:tasks'), 'consultant sees it; reception keeps the booking task', W);
  const si = ((await h.call('staff', 'queue', { ver: '', qh: '' })).items || []).find(x => x.id === c); ok(si && si.status === 'modified' && si.queue === 'consult', 'reception queue row carries status=modified (label)', si);
  r = await h.call('staff', 'toSurgery', { id: c }); ok(r.ok === false, 'surgery referral still refused until the consultant confirms', r);
  await h.confirm(c, 'ج ویرایش', ''); ok(row(c).queue === 'done' && row(c).status === 'confirmed' && !cur(c).fx4chg && h.tasks(c).filter(x => x.kind === 'book' && !x.done).length === 1, 'consultant confirms again → back to booking, one booking task', [row(c), h.tasks(c)]);
  const before = row(b); r = await edit(b, rec => { rec.data.s.imp.sel = ['UR6']; }); ok(row(b).queue === before.queue, 'a plan already in surgery is not moved', [before, row(b), r]);
  /* 4 — collect */
  const d = await mk('د وصول'); h.sql(`insert into tasks (id,plan,name,phone,kind,due,done,doneAt,note,by,created,info) values ('tc-1','${d}','د وصول','','collect','${h.today()}',0,'','','','${new Date().toISOString()}','تست') returning id`);
  const tot = row(d).total; r = await pay(d, 1000000); ok(r.ok && !r.collectClosed && !!open(d, 'collect'), 'part payment: «وصول مانده» stays open', r);
  r = await pay(d, tot - 1000000); ok(r.ok && r.collectClosed === 1 && !open(d, 'collect'), 'balance paid: «وصول مانده» closes by itself', [r, h.tasks(d).filter(x => x.kind === 'collect')]);
  /* 3 — win-back limits */
  const e = await mk('ه قدیمی'); await h.travel(421); w = await wb(e); const all = await h.call('staff', 'winback', {});
  ok(w && w.kind === 'nosurg', 'confirmed, never operated, 421 days old: still in win-back', w); ok(typeof all.total === 'number' && all.total >= all.items.length, 'win-back returns the total', all.total);
} catch (err) { console.log('ERR', err.stack); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); h.stop(); process.exit(bad ? 1 : 0);
