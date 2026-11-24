// m23 server tests: paused-prosthesis warning on lab orders, «اصلاح» before the lab starts, past delivery date, impression on the day of surgery
import { start, uuid, REC } from '../audit/A.mjs';
const h = await start(); const J = (x, n = 260) => JSON.stringify(x).slice(0, n); let bad = 0;
const ok = (c, t, x) => { if (!c) { bad++; console.log('FAIL', t, x === undefined ? '' : J(x)) } };
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const toDis = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id, file: String(2000 + Math.floor(Math.random() * 7000)), by: 'منشی' });
  await h.call('staff', 'discharge', { id, by: 'منشی' }); return id };
const P = id => JSON.parse(h.sql(`select pros from plans where id='${id}'`)[0].pros || '{}');
const lab = lid => { const l = h.sql(`select * from labs where id='${lid}'`)[0]; return l ? Object.assign(l, { data: JSON.parse(l.data || '{}'), log: JSON.parse(l.log || '[]') }) : null };
const labsOf = id => h.sql(`select id, st, due from labs where plan='${id}' order by created`);
const rets = lid => h.sql(`select kind from lab_ret where lab='${lid}'`).length;
const ord = (f = 'tryin') => { const o = JSON.parse(JSON.stringify(REC.prosSess[0].req.order)); o.for = f; return o };
const map = id => h.must('surgery', 'prosMap', { id, map: { LR6: 'a', UR6: 'a' }, note: '', by: 'پزشک' });
const sess = async (id, name, work, extra = {}) => { const kind = work === 'impr' ? 'impr' : work.startsWith('deliv') ? 'deliv' : 'tryin'; await h.appt(id, name, kind, h.today(), '', '1' + Math.floor(Math.random() * 8) + ':' + (10 + Math.floor(Math.random() * 49))); const aid = h.appts(id).slice(-1)[0].id; await h.call('staff', 'apptRef', { aid, op: 'set', id, by: 'منشی' }); return h.call('surgery', 'prosSess', Object.assign({ id, aid, work, result: '', note: '', by: 'د. تست', sendId: uuid(), ty: work }, extra)) };
const impr = (id, name, lid, extra = {}) => sess(id, name, 'impr', Object.assign({ imp: { meth: 'open', shade: 'A2', abut: '', ret: 'پیچی' }, lid, due: h.today(), order: ord() }, extra));
const labGo = async lid => { await h.call('lab', 'labStart', { lid, wt: '990001', proc: '', from: '', designer: '', box: '', note: '', prio: '' }); for (const s of h.sql(`select id from lab_step where lab='${lid}' order by idx`)) await h.call('lab', 'labStep', { lid, sid: s.id, op: 'quick', text: '' }); return h.call('lab', 'labSet', { lid, st: 'ready', note: '', by: 'لابراتوار' }) };
const day = n => new Date(Date.parse(h.today() + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
try {
  // ---- (4) impression on the day of the surgery
  const A = await toDis('A همان روز'); await map(A); const la = uuid();
  let r = await impr(A, 'A', la, { sameDay: 0 }); ok(r.ok === false && r.sameDay === 1 && /^SAMEDAY\|/.test(r.error), 'impression on the surgery day asks first', r); ok(labsOf(A).length === 0 && !(P(A).sess || []).length, 'nothing is stored before the confirmation', [labsOf(A), P(A).stage]);
  r = await impr(A, 'A', la, { sameDay: 1 }); ok(r.ok === true && labsOf(A).length === 1, 'confirmed same-day impression is stored', r);
  const B = await toDis('B فردا'); await map(B); await h.travel(1); const lb = uuid();
  r = await impr(B, 'B', lb, { sameDay: 0 }); ok(r.ok === true && labsOf(B).length === 1, 'impression on a later day is not asked', r);
  // ---- (3) delivery date in the past
  const C = await toDis('C تاریخ'); await map(C); await h.travel(1);
  r = await impr(C, 'C', uuid(), { sameDay: 0, due: day(-3) }); ok(r.ok === false && r.duePast === 1 && /^DUEPAST\|/.test(r.error), 'session with an order due in the past asks first', r); ok(labsOf(C).length === 0, 'no order stored yet');
  const lc = uuid(); r = await impr(C, 'C', lc, { sameDay: 0, due: day(-3), duePast: 1 }); ok(r.ok === true && labsOf(C).length === 1 && labsOf(C)[0].due === day(-3), 'confirmed past date is stored as typed', [r, labsOf(C)]);
  r = await h.call('surgery', 'labNew', { id: C, lid: uuid(), order: ord('deliv'), due: day(-1) }); ok(r.ok === false && r.duePast === 1 && /^DUEPAST\|/.test(r.error), 'labNew with a past date asks first', r);
  r = await h.call('surgery', 'labNew', { id: C, lid: uuid(), order: ord('deliv'), due: day(-1), duePast: 1 }); ok(r.ok === true, 'labNew with a confirmed past date', r);
  r = await h.call('surgery', 'labNew', { id: C, lid: uuid(), order: ord('rabt'), due: h.today() }); ok(r.ok === true, 'today as the delivery date is not asked', r);
  r = await h.call('surgery', 'labSet', { lid: lc, st: '', note: 'تاریخ', due: day(-10), by: 'د' }); ok(r.ok === false && r.duePast === 1, 'changing the date of an order to the past asks first', r);
  r = await h.call('surgery', 'labSet', { lid: lc, st: '', note: 'تاریخ', due: day(5), by: 'د' }); ok(r.ok === true && lab(lc).due === day(5), 'a future date is stored', [r, lab(lc).due]);
  // ---- (2) «اصلاح» before the lab starts
  const D = await toDis('D اصلاح'); await map(D); await h.travel(1); const ld = uuid(); await impr(D, 'D', ld);
  r = await h.call('surgery', 'labSet', { lid: ld, st: 'redo', note: '', by: 'د' }); ok(r.ok === false && /چه اصلاحی/.test(r.error), '«اصلاح» before the start needs a text', r);
  r = await h.call('surgery', 'labSet', { lid: ld, st: 'redo', note: 'رنگ A3 شود', by: 'د' });
  { const l = lab(ld); ok(r.ok === true && r.edit0 === 1 && l.st === 'new' && rets(ld) === 0, '«اصلاح» on a not-started order: stays «جدید», no return row', [r, l.st, rets(ld)]);
    ok(/اصلاح: رنگ A3 شود/.test(l.data.note) && l.data.edits === 1 && l.data.editLog.length === 1 && !l.data.redo, 'the correction is in the order text and the edit log, no redo counter', l.data);
    ok(!l.log.some(g => g.st === 'redo') && /برگشتی نیست/.test(l.log.slice(-1)[0].note), 'log has a message, not a «اصلاح» status', l.log.slice(-1)); ok(P(D).stage === 'lab' && !(P(D).redo && Object.keys(P(D).redo).length), 'prosthesis stage untouched', P(D)); }
  { const rp = await h.call('lab', 'lab5', { op: 'rep', from: day(-2), to: day(2) }); const q = await h.call('lab', 'lab5', { op: 'list', view: 'renewed' }); ok(q.ok && !(q.items || []).some(x => x.id === ld), 'not in the lab «برگشتی / تجدید» list', (q.items || []).length); }
  r = await labGo(ld); ok(r.ok && lab(ld).st === 'ready', 'the lab builds it normally', r);
  r = await h.call('surgery', 'labSet', { lid: ld, st: 'redo', note: 'کوتاه است', by: 'د' }); ok(r.ok === true && !r.edit0 && lab(ld).st === 'redo' && rets(ld) === 1, 'after the lab worked on it «اصلاح» is a return as before', [r, lab(ld).st, rets(ld)]);
  // ---- (1) paused prosthesis → warning only
  const E = await toDis('E توقف'); await map(E); await h.travel(1); const le = uuid(); await impr(E, 'E', le);
  const pz = async (role = 'lab') => { const a = await h.call(role, 'labList', { ver: '' }); const b = await h.call('lab', 'lab5', { op: 'list', view: 'all' }); const c = await h.call(role, 'labOrder', { lid: le }); return [((a.items || []).find(x => x.id === le) || {}).data, ((b.items || []).find(x => x.id === le) || {}).data, (c.order || {}).data].map(d => d && d.pz ? d.pz : null) };
  let z = await pz(); ok(z.every(x => x === null), 'no flag before the pause', z);
  const v0 = (await h.call('lab', 'labList', { ver: '' })).ver;
  r = await h.call('surgery', 'prosAct', { id: E, op: 'pause', until: day(20), note: 'سفر', by: 'د' }); ok(r.ok, 'pause', r);
  z = await pz(); ok(z.every(x => x && x.until === day(20) && x.note === 'سفر' && !x.stop), 'paused → flag on labList, lab table and the order sheet', z);
  ok((await h.call('lab', 'labList', { ver: v0 })).same !== true, 'the lab list is refreshed after the pause');
  ok(/پروتز بیمار متوقف شد/.test(lab(le).log.slice(-1)[0].note) && !lab(le).data.pz, 'the order log has the message; the flag is not stored', lab(le).log.slice(-1));
  z = await pz('surgery'); ok(z[0] && z[2], 'the clinic sees the same flag', z);
  r = await h.call('lab', 'labStart', { lid: le, wt: '990001', proc: '', from: '', designer: '', box: '', note: '', prio: '' }); ok(r.ok === true && lab(le).st === 'making', 'the lab can still start the paused order', r);
  r = await h.call('surgery', 'prosAct', { id: E, op: 'resume', by: 'د' }); ok(r.ok, 'resume', r); z = await pz(); ok(z.every(x => x === null) && /ادامه پیدا کرد/.test(lab(le).log.slice(-1)[0].note), 'resume clears the flag and tells the lab', [z, lab(le).log.slice(-1)]);
  { const F = await toDis('F آماده'); await map(F); await h.travel(1); const lf = uuid(); await impr(F, 'F', lf); await labGo(lf); await h.call('surgery', 'prosAct', { id: F, op: 'pause', until: day(20), note: '', by: 'د' });
    const a = await h.call('lab', 'labList', { ver: '' }); ok(!((a.items || []).find(x => x.id === lf) || { data: {} }).data.pz, 'a finished (ready) order gets no warning'); }
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 600)) }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
