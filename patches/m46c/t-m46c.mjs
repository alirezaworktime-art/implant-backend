// t-m46c (server): «سایر خدمات» rows keep teeth, count and doctor (session.othx). Run: WORKER=<m46c bundle> node t-m46c.mjs
import { start, uuid, REC } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 500) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start(); const OLD = REC.queueAdd[0].req.id;
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const body = (id, name, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id).split('رضا آزمایشی').join(name)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; return q };
const ses = id => JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg).sessions[0];
try {
  let nm = 'بیمار خدمت دیگر', id = await mk(nm), q = body(id, nm, false); q.session.oth = [{ t: 'برداشتن کیست', amt: 2000000 }, { t: 'بخیه‌ی اضافه', amt: '' }];
  q.session.othx = [{ teeth: ['UR6', 'UR6', 'ZZ9', 'LL8'], n: '۳', doc: '  دکتر الف  ' }, {}, { teeth: ['UL1'], n: 5, doc: 'اضافه' }];
  let r = await h.call('surgery', 'surgSave', q); ok(r.ok, 'session with «سایر خدمات» details saved', r); let s = ses(id);
  ok(s.oth.length === 2 && s.oth[0].amt === 2000000, 'name and amount as before', s.oth);
  ok(s.othx && s.othx.length === 2 && J(s.othx[0]) === J({ teeth: ['UR6', 'LL8'], n: 3, doc: 'دکتر الف' }) && J(s.othx[1]) === J({ teeth: [], n: 0, doc: '' }), 'teeth (valid, once each), count and doctor are kept row by row; a row beyond the services is dropped', s.othx);
  nm = 'بیمار بدون جزئیات'; id = await mk(nm); q = body(id, nm, false); q.session.oth = [{ t: 'کار ساده', amt: 100000 }]; q.session.othx = [{ teeth: [], n: 0, doc: '' }]; r = await h.call('surgery', 'surgSave', q); s = ses(id); ok(r.ok && s.oth.length === 1 && s.othx === undefined, 'rows without details store nothing extra', s.othx);
  nm = 'بیمار بد'; id = await mk(nm); q = body(id, nm, false); q.session.othx = 'zzz'; r = await h.call('surgery', 'surgSave', q); s = ses(id); ok(r.ok && s.othx === undefined && !s.oth, 'details without services are dropped; a broken value does not stop the save', { o: s.oth, x: s.othx });
  nm = 'بیمار عادی'; id = await mk(nm); q = body(id, nm, true); r = await h.call('surgery', 'surgSave', q); s = ses(id); ok(r.ok && s.othx === undefined, 'a normal session is as before', s.othx);
  nm = 'بیمار ویرایش'; id = await mk(nm); q = body(id, nm, false); q.session.oth = [{ t: 'کار', amt: 1 }]; q.session.othx = [{ teeth: ['UR1'], n: 1, doc: 'د' }]; await h.must('surgery', 'surgSave', q);
  const qe = body(id, nm, false); qe.session.oth = [{ t: 'کار', amt: 1 }]; qe.session.othx = [{ teeth: ['UR1', 'UR2'], n: 2, doc: 'د' }]; r = await h.call('surgery', 'surgEdit', { ...qe, n: 1 }); s = ses(id); ok(r.ok && s.othx[0].n === 2 && s.othx[0].teeth.length === 2, 'same-day edit changes the details', { r: r.ok || r.error, x: s.othx });
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
