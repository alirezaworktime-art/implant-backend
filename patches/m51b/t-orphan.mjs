// audit: at each stage, if nobody acts, on whose desk is the patient after N days? WORKER=<bundle> node t-orphan.mjs
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { REC, uuid } = A;
const h = await A.start(); const OLD = REC.surgSave[0].req.id; const J = x => JSON.stringify(x);
const body = (id, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; if (!finish) { q.session.last = 0; q.last = 0 } return q };
const show = async (tag, id) => console.log(tag.padEnd(34), '|', h.state(id), '|', (await h.where(id)).join(' ') || '*** NOWHERE ***', '| open tasks:', h.tasks(id).filter(t => !t.done).map(t => t.kind + '@' + t.due.slice(5)).join(',') || '-');
const pay = (id, amt) => h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: amt, by: 'م', note: '' }, sendId: uuid() });
try {
  const ids = {};
  ids.s1 = await h.add('فقط پذیرش');
  ids.s2 = await h.add('باز شده'); await h.call('doctor', 'queueOpen', { id: ids.s2 });
  ids.s3 = await h.add('نزد مشاور'); await h.plan(ids.s3, 'نزد مشاور');
  ids.s4 = await h.add('تأیید بدون نوبت'); await h.plan(ids.s4, 'تأیید بدون نوبت'); await h.confirm(ids.s4, 'تأیید بدون نوبت', 'book');
  ids.s5 = await h.add('نوبت جراحی'); await h.plan(ids.s5, 'نوبت جراحی'); await h.confirm(ids.s5, 'نوبت جراحی', 'book'); await h.appt(ids.s5, 'نوبت جراحی', 'surg', h.today(), h.tasks(ids.s5).find(t => t.kind === 'book').id);
  const mk = async nm => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); await h.appt(id, nm, 'surg', h.today(), h.tasks(id).find(t => t.kind === 'book').id); await pay(id, 200000000); await h.must('staff', 'toSurgery', { id }); return id };
  ids.s6 = await mk('در اتاق جراحی');
  ids.s7 = await mk('جراحی ناتمام'); console.log('partial', J(await h.call('surgery', 'surgSave', body(ids.s7, false))).slice(0, 120));
  ids.s8 = await mk('جراحی بدون ترخیص'); await h.must('surgery', 'surgSave', body(ids.s8, true));
  ids.s9 = await mk('ترخیص شده'); await h.must('surgery', 'surgSave', body(ids.s9, true)); await h.call('staff', 'fxFile', { op: 'set', id: ids.s9, file: '9009', by: 'منشی' });
  let r = await h.call('staff', 'discharge', { id: ids.s9, by: 'منشی' }); console.log('discharge', J(r).slice(0, 260));
  if (!r.ok) { r = await h.call('staff', 'rxGive', { id: ids.s9, by: 'منشی' }); console.log('rxGive', J(r).slice(0, 200)); r = await h.call('staff', 'discharge', { id: ids.s9, by: 'منشی', rx: 1, rxc: 'x' }); console.log('discharge2', J(r).slice(0, 260)) }
  ids.s10 = await mk('اختلاف تسویه‌نشده'); { const q = body(ids.s10, true); q.actual = Number(h.sql(`select total from plans where id='${ids.s10}'`)[0].total) + 4000000; await h.call('surgery', 'surgSave', q) }
  const names = { s1: 'S1 پذیرش، پزشک باز نکرد', s2: 'S2 پزشک باز کرد، نفرستاد', s3: 'S3 نزد مشاور، تأیید نشد', s4: 'S4 تأیید، نوبت نگرفت', s5: 'S5 نوبت جراحی، نیامد/ارجاع نشد', s6: 'S6 ارجاع به جراحی، ثبت نشد', s7: 'S7 جراحی ناتمام', s8: 'S8 جراحی تمام، ترخیص نشد', s9: 'S9 ترخیص شد', s10: 'S10 اختلاف هزینه، تسویه نشد' };
  for (const d of [0, 1, 7, 30, 75, 200]) { if (d) await h.travel(d - h.off()); console.log('\n===== روز +' + d); for (const k of Object.keys(ids)) await show(names[k], ids[k]) }
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)) }
h.stop(); process.exit(0);
