// t-m43b (server): the manager corrects a recorded surgery session on a later day. Run: WORKER=<m43b bundle> node t-m43b.mjs
import { start, uuid, REC } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 400) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start(); const OLD = REC.queueAdd[0].req.id;
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const body = (id, name, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id).split('رضا آزمایشی').join(name)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; return q };
const stock = () => Object.fromEntries(h.sql('select id, qty from inv_items').map(r => [r.id, r.qty]));
const diff = (a, b) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (b[k] || 0) - (a[k] || 0); if (d) o[k] = d } return o };
const plan = id => { const o = h.sql(`select surg, surgN, queue, settle, pros from plans where id='${id}'`)[0]; return { sg: JSON.parse(o.surg || 'null') || {}, n: o.surgN, queue: o.queue, settle: o.settle, pros: o.pros } };
const tsig = id => h.sql(`select kind, due, done, info from tasks where plan='${id}'`).map(t => [t.kind, t.due, t.done, t.info || ''].join('|')).sort().join(' ; ');
const asig = id => h.sql(`select kind, day, st from appts where plan='${id}'`).map(t => [t.kind, t.day, t.st].join('|')).sort().join(' ; ');
try {
  const nm = 'بیمار یک', id = await mk(nm); const q1 = body(id, nm, true); const planned = Number(h.sql(`select total from plans where id='${id}'`)[0].total); q1.actual = planned;
  let r = await h.call('surgery', 'surgSave', q1); ok(r.ok, 'session recorded and surgery finished', r);
  await h.travel(3);
  const S1 = stock(), P1 = plan(id), T1 = tsig(id), A1 = asig(id), fix = (ses, extra = {}) => ({ id, n: 1, session: ses, actual: planned, sendId: uuid(), ...extra });
  for (const role of ['surgery', 'staff', 'consultant', 'accountant']) { r = await h.call(role, 'surgFix', fix(body(id, nm, true).session)); ok(r.ok === false, role + ' cannot use the manager correction', r && r.error) }
  r = await h.call('surgery', 'surgEdit', { ...body(id, nm, true), n: 1 }); ok(r.ok === false && /مهلت/.test(r.error), 'three days later the assistant edit is closed', r);
  // same content
  r = await h.call('manager', 'surgFix', fix(body(id, nm, true).session)); ok(r.ok && r.moved === 0, 'manager: correction with the same content', r);
  let P = plan(id); ok(J(diff(S1, stock())) === '{}' && tsig(id) === T1 && asig(id) === A1 && P.queue === P1.queue && P.pros === P1.pros && P.settle === P1.settle, 'nothing moves: stock, follow-ups, appointments, prosthesis, settlement');
  ok(P.sg.sessions[0].edited && P.sg.sessions[0].edited.mgr === 1 && P.sg.sessions[0].at === P1.sg.sessions[0].at && P.sg.sessions[0].jalali === P1.sg.sessions[0].jalali && J(P.sg.sessions[0].fu) === J(P1.sg.sessions[0].fu), 'session keeps its date and follow-up marks, is marked as corrected by the manager', P.sg.sessions[0].edited);
  // one implant less, amount lower
  const keys = Object.keys(q1.session.imp), drop = keys[keys.length - 1]; const s2 = body(id, nm, true).session; delete s2.imp[drop]; for (const k of Object.keys(s2.s || {})) { const sec = s2.s[k]; if (sec && Array.isArray(sec.sel)) sec.sel = sec.sel.filter(t => t !== drop) }
  r = await h.call('manager', 'surgFix', fix(s2, { actual: planned - 3000000 })); let d = diff(S1, stock()); P = plan(id);
  ok(r.ok && Object.keys(d).length >= 1 && Object.values(d).every(v => v > 0), 'one implant removed → its fixture (and part) returns to the store', { r, d });
  ok(!P.sg.sessions[0].imp[drop] && P.sg.actual === planned - 3000000 && P.sg.diff === -3000000 && P.settle === 'pending', 'amount replaced; the finished surgery now shows 3,000,000 to give back → «منتظر تسویه»', { a: P.sg.actual, d: P.sg.diff, s: P.settle });
  ok(tsig(id) === T1 && asig(id) === A1 && P.queue === P1.queue, 'follow-ups, appointments and the place in the flow stay');
  // back, other size, amount back
  const s3 = body(id, nm, true).session; s3.imp[drop] = Object.assign({}, s3.imp[drop], { d: '5', l: '8' }); r = await h.call('manager', 'surgFix', fix(s3)); d = diff(S1, stock()); P = plan(id);
  ok(r.ok && Object.values(d).reduce((a, b) => a + b, 0) === 0 && Object.values(d).some(v => v === 1) && Object.values(d).some(v => v === -1), 'implant back with another size → old size +1, new size −1', d);
  ok(P.sg.diff === 0 && P.settle !== 'pending' && P.sg.sessions[0].edited.c === 3, 'amount back to the plan → nothing to settle', { d: P.sg.diff, s: P.settle });
  r = await h.call('manager', 'surgFix', fix(body(id, nm, true).session)); ok(r.ok && J(diff(S1, stock())) === '{}', 'original content again → stock as at the start', diff(S1, stock()));
  // guards
  r = await h.call('manager', 'surgFix', fix(body(id, nm, true).session, { n: 5 })); ok(r.ok === false, 'unknown session number → refused', r);
  const sb = body(id, nm, true).session; sb.imp[drop] = Object.assign({}, sb.imp[drop], { l: '' }); r = await h.call('manager', 'surgFix', fix(sb)); ok(r.ok === false && /فیکسچر/.test(r.error), 'fixture without length → refused', r);
  r = await h.call('manager', 'surgFix', fix(body(id, nm, true).session, { actual: 'x' })); ok(r.ok === false, 'bad amount → refused', r);
  const qo = fix(body(id, nm, true).session); r = await h.call('manager', 'surgFix', qo); const c1 = h.sql(`select count(*) c from events where plan='${id}' and kind='surgFix'`)[0].c; await h.call('manager', 'surgFix', qo); ok(h.sql(`select count(*) c from events where plan='${id}' and kind='surgFix'`)[0].c === c1, 'the same request twice is applied once');
  ok(h.sql(`select title from events where plan='${id}' and kind='surgFix' limit 1`)[0].title.includes('مدیر'), 'history: «توسط مدیر اصلاح شد»'); const au = h.sql(`select action, role from audit where target='${id}' and action='surgFix' limit 1`)[0]; ok(au && au.role === 'manager', 'change log has the correction', au);
  // a middle session of two
  const n2 = 'بیمار دو', id2 = await mk(n2); await h.call('surgery', 'surgSave', body(id2, n2, false)); const tk = h.tasks(id2).find(t => t.kind === 'book' && !t.done); if (tk) await h.appt(id2, n2, 'surg', h.today(), tk.id); await h.must('staff', 'toSurgery', { id: id2 });
  r = await h.call('surgery', 'surgSave', body(id2, n2, true)); ok(r.ok && r.n === 2, 'second patient: two sessions', r); await h.travel(1); const Sb = stock();
  r = await h.call('manager', 'surgFix', { id: id2, n: 1, session: body(id2, n2, false).session, actual: plan(id2).sg.actual, sendId: uuid() }); ok(r.ok && plan(id2).sg.sessions.length === 2 && plan(id2).sg.sessions[0].edited && !plan(id2).sg.sessions[1].edited && J(diff(Sb, stock())) === '{}', 'the first of two sessions can be corrected; the second is untouched', r);
  // same day: manager correction, then the assistant edit still works and the store stays right
  const n3 = 'بیمار سه', id3 = await mk(n3); const q3 = body(id3, n3, false); await h.must('surgery', 'surgSave', q3); const Sc = stock();
  const s4 = body(id3, n3, false).session; const dk = Object.keys(s4.imp).pop(); delete s4.imp[dk]; r = await h.call('manager', 'surgFix', { id: id3, n: 1, session: s4, actual: q3.actual, sendId: uuid() }); ok(r.ok && r.moved >= 1, 'same day: manager removes one implant', r);
  r = await h.call('surgery', 'surgEdit', { ...body(id3, n3, false), n: 1 }); ok(r.ok && J(diff(Sc, stock())) === '{}', 'then the assistant edits back to the full session → store exactly as after the first save', { r: r.ok || r.error, d: diff(Sc, stock()) });
  { const tb = await h.call('accountant', 'finTrial', {}); const rows = (tb && (tb.rows || tb.items)) || []; const dr = rows.reduce((a, x) => a + (Number(x.dr) || 0), 0), cr = rows.reduce((a, x) => a + (Number(x.cr) || 0), 0); ok(tb && tb.ok !== false && Math.abs(dr - cr) < 1, 'accounting trial balance still balanced', { dr, cr }) }
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 600)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
