// m30 server tests: cross-feature scenarios on what was published (m24…m29) + the m30 fixes (doctors report, reopened step needs a new test send)
import { h, mk } from '../m24/probe.mjs'; import { uuid } from '../audit/A.mjs';
 const J = (x, n = 500) => JSON.stringify(x).slice(0, n); let bad = 0;
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c ? '' : ' ' + (x === undefined ? '' : J(x)))); if (!c) bad++ };
const day = n => new Date(Date.now() + 3.5 * 36e5 + (h.off() + n) * 864e5).toISOString().slice(0, 10);
const DOC = 'دکتر سید مجتبی علویکیا';
const save = (id, arc, role = 'staff', x = {}) => h.call(role, 'fxArc', Object.assign({ id, by: 'منشی', ackDup: 1, ackFile: 1, arc: Object.assign({ v6: 1, phone: '0913' + String(1000000 + Math.floor(Math.random() * 8999999)), nid: '', age: '40', city: 'یزد', doc: DOC, pfile: '', pays: [], disc: {}, settled: false, rem: '' }, arc) }, x));
const T = id => h.sql(`select id, kind, due, done, note, info from tasks where plan='${id}' order by created, id`);
const D = id => JSON.parse(h.sql(`select data from plans where id='${id}'`)[0].data);
try {
  // ---- A) the failure line in the doctors' work report (m1Rep) and the money of the file
  let r = await save('', { name: 'گزارش فیلد', open: false, lines: [{ id: 'la1', k: 'imp', day: day(-5), doc: DOC, teeth: ['LL6'], n: 1, price: 9000000, imp: { LL6: { b: 'JD', d: '4.3', l: '10' } } }, { id: 'la2', k: 'ifail', day: day(-2), doc: DOC, teeth: ['LL6'], n: 1, price: 0, rm: 3 }] });
  ok(r.ok, 'setup file', r); const a = r.id;
  const rep = await h.call('accountant', 'm1Rep', { from: day(-30), to: day(0) }); const rs = JSON.stringify(rep);
  ok(rep.ok && !/فیلد شدن ایمپلنت/.test(rs), 'A1 the failure is NOT counted as a paid service in the doctors report', rs.match(/.{80}فیلد شدن ایمپلنت.{120}/));
  const pl = h.sql(`select total, surgN from plans where id='${a}'`)[0]; ok(pl.total === 9000000, 'A2 patient total = implant only', pl);
  for (const [role, act, body] of [['accountant', 'finSuggest', { id: a }], ['staff', 'get', { id: a }], ['doctor', 'get', { id: a }], ['manager', 'get', { id: a }], ['accountant', 'finInvList', {}]]) { const q = await h.call(role, act, body); ok(q.ok !== false || /دسترسی|برای|نیست|ورود/.test(q.error || ''), 'A3 ' + role + '/' + act + ' does not break on the file', q.error); if (/undefined|NaN/.test(JSON.stringify(q))) ok(false, 'A3 undefined/NaN in ' + act, JSON.stringify(q).match(/.{60}(undefined|NaN).{60}/)) }
  // ---- B) tasks → appointments
  const tk = T(a).find(t => t.kind === 'book' && t.info === 'reimp'); ok(!!tk, 'B0 re-implant task exists', T(a));
  h.sql(`update tasks set due='${day(0)}' where id='${tk.id}'`);
  let ap = await h.call('staff', 'apptSave', { appt: { plan: a, name: 'گزارش فیلد', phone: '09120000000', day: day(1), time: '10:00', dur: '120', kind: 'surg', doc: DOC, note: '', by: 'منشی', onl: '0' }, aid: '', task: tk.id, sendId: uuid() });
  ok(ap.ok, 'B1 reception can book a surgery appointment from the re-implant task', ap);
  ok(T(a).find(t => t.id === tk.id).done === 1 || h.sql(`select count(*) c from appts where task='${tk.id}'`)[0].c === 1, 'B2 the task is linked to / closed by the appointment', [T(a), h.sql(`select id, task, st from appts where plan='${a}'`)]);
  r = await save('', { name: 'معاینه نوبت', open: true, type: 'fix', stage: 'exam', due: day(0), lines: [{ id: 'lb1', k: 'cbct', day: day(-3), doc: DOC, teeth: [], n: 1, price: 0 }] }); const b = r.id; ok(r.ok, 'setup exam file', r);
  const te = T(b).find(t => t.kind === 'aexam');
  ap = await h.call('staff', 'apptSave', { appt: { plan: b, name: 'معاینه نوبت', phone: '09120000000', day: day(1), time: '11:00', dur: '20', kind: 'check', doc: DOC, note: '', by: 'منشی', onl: '0' }, aid: '', task: te.id, sendId: uuid() });
  ok(ap.ok, 'B3 «تعیین نوبت» for the exam task (kind check)', ap);
  const te2 = T(b).find(t => t.id === te.id), apx = h.sql(`select id, task, st, kind from appts where plan='${b}'`);
  ok(te2.done === 1 || apx.some(x => x.task === te.id), 'B4 exam task linked/closed', [te2, apx]);
  ok(!T(b).some(t => t.kind === 'recall'), 'B5 no periodic «چکاپ» is spawned by the exam', T(b));
  r = await h.call('staff', 'taskDone', { id: te.id, note: '', by: 'منشی' }); ok(r.ok && !T(b).some(t => t.kind === 'recall'), 'B6 marking the exam done spawns nothing', [r, T(b)]);
  // doctor may not close reception tasks of these kinds? (existing rule: doctor only numb/week/suture/uncover)
  r = await save('', { name: 'پیگیری پزشک', open: true, type: 'fix', stage: 'fup', due: day(0), lines: [{ id: 'lc1', k: 'cbct', day: day(-3), doc: DOC, teeth: [], n: 1, price: 0 }] }); const tf = T(r.id).find(t => t.kind === 'afup');
  r = await h.call('doctor', 'taskDone', { id: tf.id, note: '', by: 'پزشک' }); ok(r.ok === false, 'B7 a doctor cannot close the reception follow-up (same rule as other reception tasks)', r);
  // ---- C) lab: «تست لازم» and a reopened step
  const lab = id => { const x = h.sql(`select * from labs where id='${id}'`)[0]; return x && Object.assign(x, { data: JSON.parse(x.data || '{}'), log: JSON.parse(x.log || '[]') }) };
  const lid = await mk('تست بازگشت', true);
  const S = () => h.sql(`select id, dept, dname, st from lab_step where lab='${lid}' order by idx`), s0 = S()[0];
  if (s0) { const D0 = (await h.must('lab', 'labDefs', { op: 'get' })).depts.find(d => d.id === Number(s0.dept));
    await h.must('lab', 'labDefs', { op: 'dept', x: { id: D0.id, name: D0.name, active: true, sort: D0.sort || 0, flags: Object.assign({}, D0.flags, { test: true }) } });
    await h.must('lab', 'lab5', { op: 'test', lid, items: ['تست'], note: '' }); r = await h.call('lab', 'labStep', { lid, sid: s0.id, op: 'quick', text: '' }); ok(r.ok, 'C1 done after a test send', r);
    r = await h.call('lab', 'labStep', { lid, sid: s0.id, op: 'reopen', text: 'اصلاح' }); console.log('     reopen →', J(r, 160), J(S().slice(0, 2), 200));
    if (r.ok) { await new Promise(z => setTimeout(z, 1100)); const sx = S().find(x => x.st === 'pend' || x.st === 'acc'); r = await h.call('lab', 'labStep', { lid, sid: sx.id, op: 'quick', text: '' }); ok(sx.dept !== s0.dept || (r.ok === false && /ارسال جهت تست/.test(r.error)), 'C2 after a reopen the same department needs a NEW test send', [sx, r]);
      if (sx.dept === s0.dept) { await h.must('lab', 'lab5', { op: 'test', lid, items: ['تست دوم'], note: '' }); r = await h.call('lab', 'labStep', { lid, sid: sx.id, op: 'quick', text: '' }); ok(r.ok, 'C3 with a new test send it completes', r) } } }
  else console.log('     (C skipped: no steps)');
  { const D0 = (await h.must('lab', 'labDefs', { op: 'get' })).depts.find(d => d.flags && d.flags.test); if (D0) await h.must('lab', 'labDefs', { op: 'dept', x: { id: D0.id, name: D0.name, active: true, sort: D0.sort || 0, flags: Object.assign({}, D0.flags, { test: false }) } }) }
  // ---- D) outsourcing + renew / reopen
  const l2 = await mk('برون بازگشت', true);
  const S2 = () => h.sql(`select id, st from lab_step where lab='${l2}' order by idx`); const q0 = S2()[1] || S2()[0];
  await h.must('lab', 'lab5', { op: 'out', lid: l2, sid: q0.id, co: 'بیرونی' });
  for (const s of S2()) { const z = await h.call('lab', 'labStep', { lid: l2, sid: s.id, op: 'quick', text: '' }); if (!z.ok) console.log('     quick refused', J(z, 200)) }
  ok(lab(l2).data.outs[q0.id].st === 'back', 'D1 finishing all steps returns the outsourced one', lab(l2).data.outs);
  await h.call('lab', 'labSet', { lid: l2, st: 'ready', note: '', by: 'لابراتوار' }); r = await h.call('lab', 'lab5', { op: 'renew', lid: l2, from: '', reason: 'رنگ' });
  const ol = await h.must('lab', 'lab5', { op: 'outs', st: 'out' }); ok(r.ok !== undefined && !ol.items.some(x => x.lid === l2), 'D2 after a renewal nothing stays «نزد شرکت بیرونی»', [r, ol.items]);
  // ---- E) «مرجوع» then renewal / delete
  const l3 = await mk('مرجوع تجدید', true);
  for (const s of h.sql(`select id from lab_step where lab='${l3}' order by idx`)) await h.call('lab', 'labStep', { lid: l3, sid: s.id, op: 'quick', text: '' }); await h.call('lab', 'labSet', { lid: l3, st: 'ready', note: '', by: 'لابراتوار' });
  r = await h.call('lab', 'lab5', { op: 'ret', lid: l3, free: 0, cost: 500000, payer: 'lab', note: '' }); ok(r.ok, 'E1 return recorded', r);
  r = await h.call('lab', 'lab5', { op: 'ret', lid: l3, free: 1 }); ok(r.ok === false, 'E2 a second return on the same order is refused', r);
  r = await h.call('lab', 'lab5', { op: 'list', view: 'all', stat: 'mrj' }); ok(r.ok && (r.items || []).some(x => x.id === l3), 'E3 status filter «مرجوعی» finds it', r.ok ? (r.items || []).length : r);
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 700)) }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
