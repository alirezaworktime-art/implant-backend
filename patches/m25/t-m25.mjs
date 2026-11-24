// m25 server tests: «مرجوع سفارش» (lab5 ret / retUndo), status filter «مرجوعی», renewals list (lab5 renewals)
import { start, uuid, REC } from '../audit/A.mjs';
const h = await start(); const J = (x, n = 260) => JSON.stringify(x).slice(0, n); let bad = 0;
const ok = (c, t, x) => { if (!c) { bad++; console.log('FAIL', t, x === undefined ? '' : J(x)) } };
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const toDis = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id, file: String(2000 + Math.floor(Math.random() * 7000)), by: 'منشی' });
  await h.call('staff', 'discharge', { id, by: 'منشی' }); return id };
const lab = lid => { const l = h.sql(`select * from labs where id='${lid}'`)[0]; return l ? Object.assign(l, { data: JSON.parse(l.data || '{}'), log: JSON.parse(l.log || '[]') }) : null };
const inv = lid => h.sql(`select id, kind, total, st, acct, note, fac from lab_inv where lab='${lid}' and kind='manual'`);
const ord = () => { const o = JSON.parse(JSON.stringify(REC.prosSess[0].req.order)); o.for = 'tryin'; return o };
const mk = async name => { const id = await toDis(name); await h.must('surgery', 'prosMap', { id, map: { LR6: 'a', UR6: 'a' }, note: '', by: 'پزشک' }); const lid = uuid();
  await h.appt(id, name, 'impr', h.today(), '', '1' + Math.floor(Math.random() * 8) + ':' + (10 + Math.floor(Math.random() * 49))); const aid = h.appts(id).slice(-1)[0].id; await h.call('staff', 'apptRef', { aid, op: 'set', id, by: 'منشی' });
  const r = await h.call('surgery', 'prosSess', { id, aid, work: 'impr', result: '', note: '', by: 'د. تست', sendId: uuid(), ty: 'impr', sameDay: 1, imp: { meth: 'open', shade: 'A2', abut: '', ret: 'پیچی' }, lid, due: h.today(), order: ord() }); if (!r.ok) throw new Error('impr ' + J(r)); return lid };
const labGo = async lid => { await h.call('lab', 'labStart', { lid, wt: '990001', proc: '', from: '', designer: '', box: '', note: '', prio: '' }); for (const s of h.sql(`select id from lab_step where lab='${lid}' order by idx`)) await h.call('lab', 'labStep', { lid, sid: s.id, op: 'quick', text: '' }); return h.call('lab', 'labSet', { lid, st: 'ready', note: '', by: 'لابراتوار' }) };
const L5 = (op, b = {}, role = 'lab') => h.call(role, 'lab5', Object.assign({ op }, b));
const day = n => new Date(Date.parse(h.today() + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
try {
  const a = await mk('الف مرجوع'), b = await mk('ب تجدید');
  // ---- return
  let r = await L5('ret', { lid: a, free: 1 }); ok(r.ok === false && /ارسال یا تحویل/.test(r.error), 'an order still at the lab cannot be returned', r);
  await labGo(a); ok(lab(a).st === 'ready', 'setup: order a is ready');
  r = await L5('ret', { lid: a, free: 0, cost: '', payer: 'lab' }); ok(r.ok === false && /هزینه‌ی بازگشت/.test(r.error), 'not free and no cost → refused', r);
  r = await L5('ret', { lid: a, free: 0, cost: '250000', payer: 'acct' }); ok(r.ok === false && /طرف حساب/.test(r.error) && !lab(a).data.mrj, 'payer = account but the order has no account → refused', r);
  r = await L5('ret', { lid: a, free: 0, cost: '250000', payer: 'acct' }, 'staff'); ok(r.ok === false, 'reception of the clinic cannot return a lab order', r);
  r = await L5('ret', { lid: a, free: 0, cost: '۲۵۰۰۰۰', payer: 'lab', note: 'شکستگی پرسلن' });
  { const d = lab(a).data; ok(r.ok === true && d.mrj && d.mrj.cost === 250000 && d.mrj.payer === 'lab' && d.mrj.free === 0 && d.mrj.note === 'شکستگی پرسلن' && !d.mrj.inv && inv(a).length === 0, 'returned, lab pays: stored on the order, no ledger row', [r, d.mrj, inv(a)]); ok(/مرجوع سفارش: هزینه 250000 — پرداخت‌کننده: لابراتوار — شکستگی پرسلن/.test(lab(a).log.slice(-1)[0].note) && lab(a).st === 'ready', 'log line; status untouched', lab(a).log.slice(-1)) }
  r = await L5('ret', { lid: a, free: 1 }); ok(r.ok === false && /قبلاً مرجوع/.test(r.error), 'a second return is refused', r);
  r = await L5('list', { view: 'all', stat: 'mrj' }); ok(r.ok && r.items.length === 1 && r.items[0].id === a && r.items[0].data.mrj, 'status filter «مرجوعی» lists it', (r.items || []).map(x => x.id));
  r = await L5('list', { view: 'all' }); ok(r.ok && r.items.length === 2, 'the plain list still shows both', (r.items || []).length);
  r = await L5('retUndo', { lid: a }); ok(r.ok === true && !lab(a).data.mrj && /لغو مرجوعی/.test(lab(a).log.slice(-1)[0].note), 'undo removes the mark', r);
  r = await L5('retUndo', { lid: a }); ok(r.ok === false, 'undo twice is refused', r);
  r = await L5('ret', { lid: a, free: 1, cost: '999', payer: 'acct' }); ok(r.ok === true && lab(a).data.mrj.free === 1 && lab(a).data.mrj.cost === 0 && lab(a).data.mrj.payer === '' && inv(a).length === 0, 'free return: no cost, no ledger row even with a number typed', lab(a).data.mrj);
  await L5('retUndo', { lid: a });
  h.sql(`update labs set data=json_set(data,'$.acct','ACC1','$.acctName','مرکز تست') where id='${a}'`);
  r = await L5('ret', { lid: a, free: 0, cost: '300000', payer: 'acct' });
  { const d = lab(a).data, I = inv(a); ok(r.ok === true && d.mrj.payer === 'acct' && I.length === 1 && I[0].total === 300000 && I[0].st === 'open' && I[0].acct === 'ACC1' && d.mrj.inv === I[0].id && /هزینه‌ی مرجوعی سفارش/.test(I[0].note), 'account pays: one open ledger row for the cost', [d.mrj, I]); ok(/پرداخت‌کننده: مرکز تست/.test(lab(a).log.slice(-1)[0].note), 'log names the account', lab(a).log.slice(-1)) }
  h.sql(`update lab_inv set fac='F1' where lab='${a}' and kind='manual'`); r = await L5('retUndo', { lid: a }); ok(r.ok === false && /فاکتور صادرشده/.test(r.error) && lab(a).data.mrj, 'undo is refused once the cost is on an issued invoice', r);
  h.sql(`update lab_inv set fac=NULL where lab='${a}' and kind='manual'`); r = await L5('retUndo', { lid: a }); ok(r.ok === true && inv(a)[0].st === 'void' && !lab(a).data.mrj, 'undo voids the ledger row', [r, inv(a)]);
  h.sql(`update labs set data=json_set(data,'$.del',json('{"reason":"x"}')) where id='${a}'`); r = await L5('ret', { lid: a, free: 1 }); ok(r.ok === false && /حذف شده/.test(r.error), 'a deleted order cannot be returned', r);
  // ---- renewals
  r = await L5('renewals', {}); ok(r.ok && r.items.length === 0 && Array.isArray(r.staff), 'no renewals yet', r);
  await labGo(b); r = await L5('renew', { lid: b, from: '', reason: 'رنگ اشتباه' }); ok(r.ok, 'setup: renew order b', r);
  r = await L5('renewals', {}); const row = (r.items || [])[0] || {};
  ok(r.ok && r.items.length === 1 && row.lab === b && row.name === 'ب تجدید' && row.no === lab(b).no && row.reason === 'رنگ اشتباه' && row.by && r.staff.includes(row.by) && row.day === h.today(), 'one row per renewal with order, patient, date and who', r);
  r = await L5('renewals', { by: row.by }); ok(r.items.length === 1, 'filter by employee'); r = await L5('renewals', { by: 'کسی دیگر' }); ok(r.items.length === 0, 'other employee → empty');
  r = await L5('renewals', { from: day(1), to: day(5) }); ok(r.items.length === 0, 'date range without it → empty'); r = await L5('renewals', { from: day(-1), to: h.today() }); ok(r.items.length === 1, 'date range with it');
  await labGo(b); await L5('renew', { lid: b, from: '', reason: 'بار دوم' }); r = await L5('renewals', {}); ok(r.items.length === 2 && r.items[0].reason === 'بار دوم', 'a second renewal is a second row, newest first', (r.items || []).map(x => x.reason));
  r = await L5('renewals', {}, 'staff'); ok(r.ok === false, 'the clinic reception has no access', r);
  r = await L5('list', { view: 'renewed' }); ok(r.ok && r.items.some(x => x.id === b), 'the old «renewed» list op still works', (r.items || []).length);
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 600)) }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
