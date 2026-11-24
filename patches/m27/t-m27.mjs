// m27 server tests: «برون‌سپاری دپارتمان» — lab5 out / outBack / outs, auto-return when the step is completed
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
  const a = await mk('الف برون'); await h.call('lab', 'labStart', { lid: a, wt: '990001', proc: '', from: '', designer: '', box: '', note: '', prio: '' });
  const b = await mk('ب نشده');
  const S = () => h.sql(`select id, dept, dname, st from lab_step where lab='${a}' order by idx`), s0 = S()[0], s1 = S()[1]; ok(S().length >= 2, 'setup: steps', S());
  const O = () => lab(a).data.outs || {};
  let r = await L5('out', { lid: a, sid: s0.id, co: ' ', note: '' }); ok(r.ok === false && /نام شرکت/.test(r.error), 'company name is required', r);
  r = await L5('out', { lid: b, sid: 'x', co: 'لابراتوار تاج' }); ok(r.ok === false && /در حال ساخت/.test(r.error), 'an order that has not started cannot be outsourced', r);
  r = await L5('out', { lid: a, sid: 'nope', co: 'لابراتوار تاج' }); ok(r.ok === false && /مرحله پیدا نشد/.test(r.error), 'unknown step', r);
  r = await L5('out', { lid: a, sid: s0.id, co: 'لابراتوار تاج' }, 'staff'); ok(r.ok === false && !O()[s0.id], 'clinic reception cannot outsource', r);
  r = await L5('out', { lid: a, sid: s0.id, co: '  لابراتوار تاج ', note: 'فریم زیرکونیا' });
  ok(r.ok && O()[s0.id] && O()[s0.id].co === 'لابراتوار تاج' && O()[s0.id].st === 'out' && O()[s0.id].dname === s0.dname && O()[s0.id].note === 'فریم زیرکونیا' && S()[0].st === s0.st, 'outsourced: stored on the order, step untouched', [r, O()]);
  ok(/برون‌سپاری دپارتمان: .* → لابراتوار تاج — فریم زیرکونیا/.test(lab(a).log.slice(-1)[0].note), 'log line', lab(a).log.slice(-1));
  r = await L5('out', { lid: a, sid: s0.id, co: 'دیگری' }); ok(r.ok === false && /همین حالا/.test(r.error), 'twice is refused', r);
  r = await L5('outs', {}); ok(r.ok && r.items.length === 1 && r.items[0].lid === a && r.items[0].sid === s0.id && r.items[0].co === 'لابراتوار تاج' && r.items[0].name === 'الف برون' && r.cos.join() === 'لابراتوار تاج', 'list shows it', r);
  r = await L5('outs', { st: 'back' }); ok(r.ok && r.items.length === 0, 'filter «برگشته» is empty'); r = await L5('outs', { from: day(1) }); ok(r.items.length === 0, 'date filter excludes'); r = await L5('outs', { from: day(-1), to: day(0) }); ok(r.items.length === 1, 'date filter includes');
  r = await L5('outs', {}, 'staff'); ok(r.ok === false, 'list is not for the clinic reception', r);
  { const lb = (await h.must('lab', 'labList', {})).items || []; const x = lb.find(i => i.id === a); ok(!x || (x.data && x.data.outs && x.data.outs[s0.id]), 'the lab list carries data.outs', x && Object.keys(x.data || {})) }
  r = await L5('outBack', { lid: a, sid: s0.id }); ok(r.ok && O()[s0.id].st === 'back' && O()[s0.id].back_at && S()[0].st === s0.st && /برگشت از برون‌سپاری/.test(lab(a).log.slice(-1)[0].note), 'manual return: marked back, step still open', [r, O()[s0.id]]);
  r = await L5('outBack', { lid: a, sid: s0.id }); ok(r.ok === false, 'return twice refused', r);
  r = await L5('out', { lid: a, sid: s0.id, co: 'لابراتوار کلانتری' }); ok(r.ok && O()[s0.id].co === 'لابراتوار کلانتری' && O()[s0.id].st === 'out', 'can be outsourced again after a return', r);
  r = await h.call('lab', 'labStep', { lid: a, sid: s0.id, op: 'quick', text: '' }); ok(r.ok && S()[0].st === 'done' && O()[s0.id].st === 'back' && /با تکمیل مرحله/.test(lab(a).log.map(g => g.note).join('|')), 'completing the step returns it automatically', [r, O()[s0.id]]);
  r = await L5('out', { lid: a, sid: s0.id, co: 'لابراتوار تاج' }); ok(r.ok === false && /تمام شده/.test(r.error), 'a finished step cannot be outsourced', r);
  r = await h.call('lab', 'labStep', { lid: a, sid: s1.id, op: 'quick', text: '' }); ok(r.ok && !O()[s1.id], 'a step that was never outsourced is unaffected', r);
  r = await L5('outs', { st: '' }); ok(r.ok && r.items.length === 1 && r.items[0].st === 'back' && r.items[0].co === 'لابراتوار کلانتری', 'list (all) shows the latest state of the step', r.items);
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 600)) }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
