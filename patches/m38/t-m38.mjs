// m38 server test: surgery appointment «نیامد»/«لغو» while the patient waits in the surgery cartable; resend of the same session is recorded once.
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid, REC } = A; const h = await A.start();
let bad = 0; const ok = (c, t) => { console.log((c ? 'ok   ' : 'FAIL ') + t); if (!c) bad++; };
const OLD = REC.queueAdd[0].req.id;
const ready = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); return id };
const sreq = (id, o = {}) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id)); delete q.action; q.session.at = new Date().toISOString(); q.sendId = uuid(); Object.assign(q, o); return q };
const open = (id, k) => h.tasks(id).filter(t => !t.done && t.kind === k);
const q = id => h.sql(`select queue from plans where id='${id}'`)[0].queue;
try {
for (const st of ['noshow', 'cancel']) { const id = await ready('برگشت ' + st); await h.must('staff', 'toSurgery', { id }); const ap = h.appts(id)[0]; ok(ap.st === 'done', st + ': referral closes the appointment');
  const r = await h.call('staff', 'apptSet', { aid: ap.id, st, by: 'منشی' }); ok(r.ok && r.m38back === 'done', st + ': answer says the patient went back');
  ok(q(id) === 'done', st + ': patient left the surgery cartable'); ok(open(id, 'book').length === 1, st + ': one open booking task'); ok(h.appts(id)[0].st === st, st + ': appointment keeps «' + st + '»');
  const ev = h.sql(`select title, detail from events where plan='${id}' and kind='fx5sc'`); ok(ev.length === 1 && /نوبت جراحی/.test(ev[0].detail), st + ': reason in the treatment log');
  const again = await h.call('staff', 'apptSet', { aid: ap.id, st, by: 'منشی' }); ok(again.ok && !again.m38back && open(id, 'book').length === 1, st + ': repeating changes nothing'); }
{ const id = await ready('نوبت دیگر'), name = 'نوبت دیگر'; await h.appt(id, name, 'surg', new Date(Date.parse(h.today()) + 5 * 864e5).toISOString().slice(0, 10)); await h.must('staff', 'toSurgery', { id }); const fut = h.appts(id).find(a => a.st === 'set');
  ok(!!fut, 'a later surgery appointment stays «set»'); const r = await h.call('staff', 'apptSet', { aid: fut.id, st: 'cancel', by: 'منشی' }); ok(r.ok && !r.m38back && q(id) === 'surgery', 'cancelling another (later) appointment leaves the patient in surgery'); }
{ const id = await ready('بعد از ثبت'); await h.must('staff', 'toSurgery', { id }); const ap = h.appts(id)[0]; await h.must('surgery', 'surgSave', sreq(id, { finish: false })); const r = await h.call('staff', 'apptSet', { aid: ap.id, st: 'noshow', by: 'منشی' }); ok(!r.m38back && q(id) === 'surgpart', 'after a recorded session nothing goes back'); }
{ const id = await ready('جلسه‌ی دوم'), name = 'جلسه‌ی دوم'; await h.must('staff', 'toSurgery', { id }); await h.must('surgery', 'surgSave', sreq(id, { finish: false })); await h.travel(1); const tk = open(id, 'book')[0]; await h.appt(id, name, 'surg', h.today(), tk ? tk.id : ''); await h.must('staff', 'toSurgery', { id });
  const ap = h.appts(id).filter(a => a.day === h.today())[0]; const r = await h.call('staff', 'apptSet', { aid: ap.id, st: 'noshow', by: 'منشی' }); ok(r.ok && r.m38back === 'surgpart' && q(id) === 'surgpart', 'second session: back to «ادامه‌ی جراحی»'); ok(open(id, 'book').length === 1, 'second session: one open booking task'); ok(h.sql(`select surgN from plans where id='${id}'`)[0].surgN === 1, 'second session: the first session is kept'); await h.travel(-1); }
{ const id = await ready('ارسال دوباره'); await h.must('staff', 'toSurgery', { id }); const s = sreq(id, { finish: true }); const a = await h.call('surgery', 'surgSave', s), b = await h.call('surgery', 'surgSave', s);
  ok(a.ok && b.ok, 'the same session sent twice (same operation id) answers ok both times'); ok(h.sql(`select json_array_length(surg,'$.sessions') n from plans where id='${id}'`)[0].n === 1, 'and is recorded once'); ok(h.sql(`select count(*) n from inv_moves where ref='${id}' and type='use'`)[0].n === 4, 'stock is taken once'); }
} catch (e) { console.log('ERR', e.message); bad++; }
const errs = h.log().split('\n').filter(l => /m38|TypeError|SQLITE/i.test(l)); ok(!errs.length, 'no server errors ' + errs.slice(0, 2).join(' | '));
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
