// audit 2: discharge → impression → delivery → recall, and money left alone. WORKER=<bundle> node t-orphan3.mjs
const A = await import('file:///home/claude/w/audit/A.mjs'); const { REC, uuid } = A;
const h = await A.start(); const OLD = REC.surgSave[0].req.id; const J = (x, n = 260) => JSON.stringify(x).slice(0, n);
const rec = (k, i, id, extra) => { const q = JSON.parse(JSON.stringify(REC[k][i].req).split(OLD).join(id)); delete q.action; if (q.sendId) q.sendId = uuid(); return Object.assign(q, extra || {}) };
const show = async (tag, id) => console.log(tag.padEnd(36), '|', h.state(id), '|', (await h.where(id)).join(' ') || '*** NOWHERE ***', '| tasks:', h.tasks(id).filter(t => !t.done).map(t => t.kind + '@' + t.due.slice(2)).join(',') || '-');
const day = n => new Date(Date.parse(h.today()) + n * 864e5).toISOString().slice(0, 10);
let fno = 8100;
const base = async (nm, payAll = true) => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); await h.appt(id, nm, 'surg', h.today(), h.tasks(id).find(t => t.kind === 'book').id);
  const tot = Number(h.sql(`select total from plans where id='${id}'`)[0].total), pt = JSON.parse(h.sql(`select data from plans where id='${id}'`)[0].data).parts || {};
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: payAll ? tot : Math.round(pt.S * tot / (pt.S + pt.P)), by: 'م', note: '' }, sendId: uuid() });
  await h.must('staff', 'toSurgery', { id }); const q = rec('surgSave', 0, id); q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.finish = true; q.actual = tot; q.planned = tot; const r = await h.call('surgery', 'surgSave', q); if (!r.ok || r.settle) console.log('surg', J(r)); return id };
const dis = async id => { await h.call('staff', 'fxFile', { op: 'set', id, file: String(++fno), by: 'منشی' }); const g = await h.call('staff', 'rxGet', { id }); const L = g.items || g.list || g.rx || []; let r = await h.call('staff', 'rxGive', { id, ids: L.slice(0, 1).map(x => x.id), by: 'منشی' }); if (!r.ok) console.log('rxGive', J(r), 'rxGet keys', Object.keys(g).join(','), J(g, 200)); r = await h.call('staff', 'discharge', { id, care: true, note: '', by: 'منشی' }); if (!r.ok) console.log('discharge', J(r)); return r };
const appt = async (id, kind, d) => { await h.must('staff', 'apptSave', { appt: { plan: id, name: 'ن', phone: '09120000000', day: d || h.today(), time: '10:00', dur: '45', kind, doc: 'دکتر سید مجتبی علویکیا', note: '', by: '', onl: '' }, aid: '', task: '', sendId: uuid() }); return h.appts(id).filter(a => a.kind === kind && a.st === 'set').pop() };
const impr = async id => { const ap = await appt(id, 'impr'); await h.must('staff', 'apptRef', { aid: ap.id, op: 'set', id, by: 'منشی' }); await h.must('doctor', 'prosMap', rec('prosMap', 0, id)); const r = await h.call('doctor', 'prosSess', rec('prosSess', 0, id, { aid: ap.id, lid: uuid(), due: day(10) })); if (!r.ok) console.log('impr', J(r)); return r };
const deliv = async (id, extra) => { const ap = await appt(id, 'deliv'); await h.must('staff', 'apptRef', { aid: ap.id, op: 'set', id, by: 'منشی' }); return h.call('doctor', 'prosSess', rec('prosSess', 2, id, Object.assign({ aid: ap.id, labAck: 1 }, extra || {}))) };
try {
  const N = {}, add = (k, t, id) => { N[k] = { t, id } };
  add('Q1', 'Q1 ترخیص شد، دیگر نیامد', await base('ترخیص')); console.log('dis', J(await dis(N.Q1.id)));
  add('Q2', 'Q2 نوبت قالب داشت، نیامد (ثبت نشد)', await base('قالب نیامد')); await dis(N.Q2.id); await appt(N.Q2.id, 'impr', day(3));
  add('Q3', 'Q3 قالب شد، سفارش لابراتوار ماند', await base('قالب شد')); await dis(N.Q3.id); await impr(N.Q3.id);
  add('Q4', 'Q4 تحویل شد (همه پرداخت شده)', await base('تحویل')); await dis(N.Q4.id); await impr(N.Q4.id); console.log('deliv paid:', J(await deliv(N.Q4.id)));
  add('Q5', 'Q5 تحویل با بدهی پروتز', await base('تحویل بدهکار', false)); await dis(N.Q5.id); await impr(N.Q5.id); let r = await deliv(N.Q5.id); console.log('deliv with debt:', J(r));
  add('F1', 'F1 چک سررسید گذشته، ثبت نشده', await base('چک', false)); r = await h.call('staff', 'payAdd', { id: N.F1.id, pid: 'cq-' + uuid() + '-p0', pay: { kind: 'chq', part: 'p', amount: 8000000, due: day(5), no: '111222', bank: 'ملی', by: 'م', note: '', ctype: 'صیادی', payee: 'کلینیک' }, sendId: uuid() }); console.log('chq', J(r, 120));
  add('F2', 'F2 چک برگشت خورد', await base('چک برگشتی', false)); const pid2 = 'cq-' + uuid() + '-p0'; await h.call('staff', 'payAdd', { id: N.F2.id, pid: pid2, pay: { kind: 'chq', part: 'p', amount: 8000000, due: day(2), no: '333444', bank: 'ملی', by: 'م', note: '', ctype: 'صیادی', payee: 'کلینیک' }, sendId: uuid() });
  const cq = h.sql(`select id from pays where plan='${N.F2.id}' and kind='chq'`)[0]; r = cq ? await h.call('consultant', 'paySet', { pid: cq.id, st: 'bounce' }) : { ok: false, error: 'no cheque row' }; console.log('bounce', J(r, 160));
  add('F3', 'F3 انصراف بعد از بیعانه', await (async () => { const id = await h.add('انصراف'); await h.plan(id, 'انصراف'); await h.confirm(id, 'انصراف', 'book'); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 5000000, by: 'م', note: 'بیعانه' }, sendId: uuid() }); const t = h.tasks(id).find(t => t.kind === 'book'); const x = await h.call('staff', 'taskDone', { id: t.id, how: 'lost', why: 'منصرف شد', by: 'منشی' }); console.log('lost', J(x, 160)); return id })());
  for (const d of [0, 2, 9, 16, 40, 130, 200, 400]) { if (d) await h.travel(d - h.off()); await h.call('staff', 'queue', {}); console.log('\n===== روز +' + d); for (const k of Object.keys(N)) await show(N[k].t, N[k].id) }
  console.log('\npays F1/F2', J(h.sql(`select plan=='${N.F1.id}' f1, kind, st, due from pays where plan in ('${N.F1.id}','${N.F2.id}') and kind='chq'`)));
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)) }
h.stop(); process.exit(0);
