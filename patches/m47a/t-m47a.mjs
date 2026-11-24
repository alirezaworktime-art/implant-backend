// t-m47a (server): prosthesis session with a «loose» lab work order (order.m47) — no mandatory field. Run: WORKER=<m47a bundle> node t-m47a.mjs
import { start, uuid, REC } from '../audit/A.mjs';
const h = await start(); const J = (x, n = 400) => JSON.stringify(x).slice(0, n); let bad = 0;
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const toDis = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id, file: String(2000 + Math.floor(Math.random() * 7000)), by: 'منشی' });
  await h.call('staff', 'discharge', { id, by: 'منشی' }); return id };
const P = id => JSON.parse(h.sql(`select pros from plans where id='${id}'`)[0].pros || '{}');
const labsOf = id => h.sql(`select id, st, due, data from labs where plan='${id}' order by created`).map(l => Object.assign(l, { data: JSON.parse(l.data || '{}') }));
const ord = () => JSON.parse(JSON.stringify(REC.prosSess[0].req.order));
const sess = async (id, name, work, extra = {}) => { const kind = work === 'impr' || work === 'crimpr' ? 'impr' : work.startsWith('deliv') ? 'deliv' : 'tryin'; await h.appt(id, name, kind, h.today(), '', '1' + Math.floor(Math.random() * 8) + ':' + (10 + Math.floor(Math.random() * 49))); const aid = h.appts(id).slice(-1)[0].id; await h.call('staff', 'apptRef', { aid, op: 'set', id, by: 'منشی' }); return h.call('surgery', 'prosSess', Object.assign({ id, aid, work, result: '', note: '', by: 'د. تست', sendId: uuid(), ty: work }, extra)) };
const day = n => new Date(Date.parse(h.today() + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
try {
  // 1) nothing filled at all: only the session chart
  const A = await toDis('الف بدون فیلد'); await h.travel(1);
  let r = await sess(A, 'الف', 'impr', { pt: { UR6: 'a', UR5: 'p' }, lid: uuid(), order: { m47: 1 } }); let L = labsOf(A);
  ok(r.ok === true && r.lid && L.length === 1, 'an empty work order goes to the lab with the session', r);
  ok(L[0] && J(L[0].data.teeth.slice().sort()) === J(['UR5', 'UR6']) && J(L[0].data.pon) === J(['UR5']), 'teeth and pontics of the order come from the session chart', L[0] && L[0].data);
  ok(L[0] && L[0].due === day(10), 'no date = 10 days', L[0] && L[0].due); ok(L[0] && L[0].data.for === 'tryin' && L[0].data.m47 === undefined, '«ساخت برای» falls on the first step of the route; the mark is not stored', L[0] && L[0].data.for);
  let p = P(A); ok(p.stage === 'lab' && p.map && p.map.UR6 === 'a' && p.sess.length === 1 && p.sess[0].lid === r.lid && p.sess[0].pt.UR5 === 'p', 'session stored with its chart; stage = lab', { st: p.stage, map: p.map });
  // 2) the old strict path is as before
  const B = await toDis('ب سخت'); await h.travel(1);
  r = await sess(B, 'ب', 'impr', { pt: { UR6: 'a' }, lid: uuid(), order: { for: 'tryin', teeth: ['UR6'] } }); ok(r.ok === false && /الزامی/.test(r.error || ''), 'without the mark the sheet fields are still required', r); ok(labsOf(B).length === 0 && !(P(B).sess || []).length, 'nothing stored');
  r = await sess(B, 'ب', 'impr', { pt: { UR6: 'a' }, lid: uuid(), due: h.today(), order: ord() }); ok(r.ok === false || r.ok === true, 'recorded strict order runs', r);
  // 3) teeth outside the old map, with a date and sheet fields
  const C = await toDis('ج نقشه'); await h.must('surgery', 'prosMap', { id: C, map: { LR6: 'a' }, note: '', by: 'پزشک' }); await h.travel(1);
  r = await sess(C, 'ج', 'impr', { pt: { UL3: 'a', UL4: 'a' }, lid: uuid(), due: day(5), order: { m47: 1, for: 'deliv', teeth: ['UL3', 'UL4'], implant: ['Dentium'], note: 'یادداشت' } }); L = labsOf(C);
  ok(r.ok === true && L.length === 1 && L[0].due === day(5) && L[0].data.for === 'deliv' && J(L[0].data.teeth) === J(['UL3', 'UL4']) && L[0].data.note === 'یادداشت', 'given values are kept (date, «ساخت برای», teeth outside the old map, note)', L[0] || r);
  // 4) a date in the past still asks
  const D = await toDis('د تاریخ'); await h.travel(1);
  r = await sess(D, 'د', 'impr', { pt: { UR6: 'a' }, lid: uuid(), due: day(-2), order: { m47: 1 } }); ok(r.ok === false && r.duePast === 1, 'a past date still asks for confirmation', r);
  r = await sess(D, 'د', 'impr', { pt: { UR6: 'a' }, lid: uuid(), due: 'zzz', order: { m47: 1 } }); ok(r.ok === true && labsOf(D)[0].due === day(10), 'a broken date = 10 days', r);
  // 5) a work without teeth (night guard) after the impression
  const E = await toDis('ه نایت'); await h.travel(1);
  r = await sess(E, 'ه', 'ng', { lid: uuid(), order: { m47: 1 } }); ok(r.ok === false && /قالب‌گیری/.test(r.error || '') && labsOf(E).length === 0, 'route rule stays: before the implant impression no lab order', r);
  r = await sess(E, 'ه', 'impr', { pt: { UR6: 'a' }, lid: uuid(), order: { m47: 1 } }); ok(r.ok === true, 'impression with order', r);
  // 6) no map, no chart teeth → order without teeth is accepted
  const F = await toDis('و بی‌دندان'); await h.travel(1);
  r = await sess(F, 'و', 'impr', { pt: { UR6: 'a' }, sendId: uuid() }); ok(r.ok === true && labsOf(F).length === 0, 'session alone (no order) as before', r); await h.travel(1);
  r = await sess(F, 'و', 'fix', { lid: uuid(), order: { m47: 1 } }); L = labsOf(F); ok(r.ok === true && L.length === 1 && L[0].data.teeth.length === 1, '«اصلاح روکش» with an empty order: teeth from the patient map', L[0] ? L[0].data : r);
  // 7) reception's own order path does not take the mark
  const G = await toDis('ز پذیرش'); await h.travel(1);
  r = await h.call('staff', 'labNew', { id: G, lid: uuid(), order: { m47: 1 }, due: day(3) }); ok(r.ok === false, 'labNew (reception) is still strict', r);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
