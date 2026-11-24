// t-m42d (server): same-day edit of a recorded surgery session — stock, tasks, appointments, money, guards. Run: WORKER=<m42d bundle> node t-m42d.mjs
import { start, uuid, REC } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 400) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start(); const OLD = REC.queueAdd[0].req.id;
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const body = (id, name, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id).split('رضا آزمایشی').join(name)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; if (!finish) { q.session.last = 0; q.last = 0 } return q };
const stock = () => Object.fromEntries(h.sql('select id, qty from inv_items').map(r => [r.id, r.qty]));
const diff = (a, b) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (b[k] || 0) - (a[k] || 0); if (d) o[k] = d } return o };
const plan = id => { const o = h.sql(`select surg, surgN, queue, settle, pros from plans where id='${id}'`)[0]; return { sg: JSON.parse(o.surg || 'null') || {}, n: o.surgN, queue: o.queue, settle: o.settle, pros: o.pros ? JSON.parse(o.pros) : null } };
const tsig = id => h.sql(`select kind, due, done, info from tasks where plan='${id}'`).map(t => [t.kind, t.due, t.done, t.info || ''].join('|')).sort().join(' ; ');
const asig = id => h.sql(`select kind, day, st from appts where plan='${id}'`).map(t => [t.kind, t.day, t.st].join('|')).sort().join(' ; ');
const used = id => h.sql(`select coalesce(sum(delta),0) s from inv_moves where ref='${id}'`)[0].s;
try {
  // ---- A: record, list
  const n1 = 'بیمار یک', id = await mk(n1); const S0 = stock(); const q1 = body(id, n1, false);
  let r = await h.call('surgery', 'surgSave', q1); ok(r.ok && r.n === 1, 'session 1 recorded', r);
  const S1 = stock(), P1 = plan(id), T1 = tsig(id), A1 = asig(id), U1 = used(id), nImp = Object.keys(q1.session.imp || {}).length;
  ok(nImp >= 2 && Object.keys(diff(S0, S1)).length > 0, 'the session used fixtures from the store', { nImp, d: diff(S0, S1) });
  ok(h.sql(`select count(*) c from surg_snap where pid='${id}' and n=1`)[0].c === 1, 'a before/after picture of the save is kept');
  r = await h.call('surgery', 'surgEditList', {}); ok(r.ok && r.items.length === 1 && r.items[0].id === id && r.items[0].n === 1 && r.items[0].name === n1, 'today\'s recorded sessions are listed for the doctor login', r);
  r = await h.call('staff', 'surgEditList', {}); ok(r.ok === false, 'reception does not get the list', r);
  for (const role of ['staff', 'consultant', 'manager', 'doctor']) { r = await h.call(role, 'surgEdit', { ...body(id, n1, false), n: 1 }); ok(r.ok === false, role + ' cannot edit a session', r && r.error) }
  ok(J(stock(), 9e6) === J(S1, 9e6) && tsig(id) === T1, 'refused edits change nothing');
  // ---- B: edit with the same content
  r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 1 }); ok(r.ok && r.edit === 1 && r.n === 1, 'edit with the same content accepted', r);
  let P = plan(id); ok(P.n === 1 && P.sg.sessions.length === 1 && P.queue === P1.queue && P.settle === P1.settle, 'still one session, same place in the flow', { n: P.n, q: P.queue });
  ok(P.sg.sessions[0].edited && P.sg.sessions[0].edited.c === 1 && P.sg.sessions[0].at === P1.sg.sessions[0].at, 'session is marked «edited» and keeps its time', P.sg.sessions[0].edited);
  ok(J(diff(S1, stock())) === '{}' && used(id) === U1, 'stock is exactly as after the first save', diff(S1, stock()));
  ok(tsig(id) === T1, 'follow-up tasks are the same set (no duplicates)', { T1, now: tsig(id) }); ok(asig(id) === A1, 'appointments are the same set', { A1, now: asig(id) });
  ok(P.sg.actual === P1.sg.actual && P.sg.planned === P1.sg.planned, 'amounts unchanged', [P.sg.actual, P1.sg.actual]);
  // ---- C: one implant less
  const keys = Object.keys(q1.session.imp), drop = keys[keys.length - 1], m = q1.session.imp[drop];
  const itemOf = mm => h.sql(`select m.item from inv_moves m where m.ref='${id}' and m.note like '%${drop}%' and m.delta<0 order by m.at limit 5`).map(x => x.item);
  const dropItems = [...new Set(itemOf(m))];
  const q2 = body(id, n1, false); delete q2.session.imp[drop]; for (const k of Object.keys(q2.session.s || {})) { const sec = q2.session.s[k]; if (sec && Array.isArray(sec.sel)) sec.sel = sec.sel.filter(t => t !== drop) } q2.actual = Math.max(0, Number(q1.actual) - 1000000);
  r = await h.call('surgery', 'surgEdit', { ...q2, n: 1 }); ok(r.ok, 'edit: one implant removed', r);
  let d = diff(S1, stock()); ok(Object.keys(d).length >= 1 && Object.values(d).every(v => v > 0) && dropItems.every(i => d[i] > 0), 'the removed implant\'s fixture (and its part) went back to the store', { d, dropItems });
  P = plan(id); ok(!P.sg.sessions[0].imp[drop] && Object.keys(P.sg.sessions[0].imp).length === nImp - 1 && P.sg.sessions[0].edited.c === 2, 'the stored session has one implant less', Object.keys(P.sg.sessions[0].imp));
  ok(P.sg.actual === q2.actual, 'the surgery amount follows the edit', [P.sg.actual, q2.actual]);
  // ---- D: put it back with another size
  const q3 = body(id, n1, false); q3.session.imp[drop] = Object.assign({}, q3.session.imp[drop], { d: '5', l: '8' });
  r = await h.call('surgery', 'surgEdit', { ...q3, n: 1 }); ok(r.ok, 'edit: implant back with another size', r);
  P = plan(id); ok(P.sg.sessions[0].imp[drop].d === '5' && P.sg.sessions[0].imp[drop].l === '8', 'new size stored', P.sg.sessions[0].imp[drop]);
  ok(used(id) === U1, 'net stock use of this patient equals a session with all implants', [used(id), U1]);
  d = diff(S1, stock()); ok(Object.values(d).reduce((a, b) => a + b, 0) === 0 && Object.values(d).some(v => v === 1) && Object.values(d).some(v => v === -1), 'old size +1, new size −1 against the first save', d);
  // ---- once: a repeated request does nothing more
  const q4 = { ...body(id, n1, false), n: 1 }; r = await h.call('surgery', 'surgEdit', q4); const Sx = stock(), cnt = h.sql(`select count(*) c from inv_moves where ref='${id}'`)[0].c; const r2 = await h.call('surgery', 'surgEdit', q4);
  ok(r.ok && r2.ok && J(stock(), 9e6) === J(Sx, 9e6) && h.sql(`select count(*) c from inv_moves where ref='${id}'`)[0].c === cnt, 'the same request sent twice is applied once');
  ok(J(diff(S1, stock())) === '{}' && tsig(id) === T1, 'back to the original content → stock and tasks as after the first save', { d: diff(S1, stock()) });
  // ---- bad input: nothing is touched
  const qb = { ...body(id, n1, false), n: 1 }; qb.session.imp[drop] = Object.assign({}, qb.session.imp[drop], { b: '' }); r = await h.call('surgery', 'surgEdit', qb); ok(r.ok === false && /فیکسچر/.test(r.error), 'fixture without brand → refused', r);
  r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 1, actual: 'abc' }); ok(r.ok === false && /مبلغ/.test(r.error), 'bad amount → refused', r);
  r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 2 }); ok(r.ok === false, 'a session number that does not exist → refused', r);
  P = plan(id); ok(J(diff(S1, stock())) === '{}' && P.n === 1 && P.sg.sessions.length === 1 && tsig(id) === T1, 'after refused edits the patient is untouched');
  // ---- something reception did in between is kept
  const numb = h.sql(`select id from tasks where plan='${id}' and kind='numb' and done=0`)[0];
  if (numb) { await h.must('staff', 'taskDone', { id: numb.id, note: 'تماس گرفته شد', by: 'منشی' }); r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 1 }); let t = h.sql(`select done, note from tasks where id='${numb.id}'`)[0]; ok(r.ok && t && t.done === 1 && /تماس/.test(t.note), 'a follow-up that reception already closed stays closed', t);
    r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 1 }); t = h.sql(`select done, note from tasks where id='${numb.id}'`)[0]; ok(r.ok && t && t.done === 1, '… and is still there after a second edit', t);
    ok(h.sql(`select count(*) c from tasks where plan='${id}' and kind='numb' and done=0`)[0].c === 1, 'exactly one open «چک بی‌حسی» task after two edits', tsig(id)) } else ok(false, 'no numb task to test');
  // ---- finish ↔ not finished
  r = await h.call('surgery', 'surgEdit', { ...body(id, n1, true), n: 1 }); P = plan(id); ok(r.ok && P.queue === 'surgdone' && P.sg.finished === true && P.pros && P.pros.stage, 'edit: marked as the last session → surgery finished, prosthesis started', { q: P.queue, pros: P.pros && P.pros.stage });
  r = await h.call('surgery', 'surgEditList', {}); ok(r.items.some(x => x.id === id && x.fin === 1 && x.edits >= 1), 'list shows it as finished and edited', r.items);
  r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 1 }); P = plan(id); ok(r.ok && P.queue === 'surgpart' && !P.sg.finished && !P.pros, 'edit: last-session mark removed → surgery open again, prosthesis not started', { q: P.queue, fin: P.sg.finished, pros: P.pros });
  ok(h.sql(`select count(*) c from tasks where plan='${id}' and kind='book' and done=0`)[0].c === 1, 'one open «نوبت ادامه‌ی جراحی» task (not two)', tsig(id));
  ok(used(id) === U1, 'stock use still equals one session', [used(id), U1]);
  // ---- money: extra cost goes to settlement and comes back
  const n2 = 'بیمار دو', id2 = await mk(n2); const qa = body(id2, n2, true); const planned = Number(h.sql(`select total from plans where id='${id2}'`)[0].total); qa.actual = planned + 2000000;
  r = await h.call('surgery', 'surgSave', qa); let P2 = plan(id2); ok(r.ok && P2.settle === 'pending' && P2.sg.diff === 2000000, 'finished with 2,000,000 more → «منتظر تسویه»', { s: P2.settle, d: P2.sg.diff });
  const qb2 = body(id2, n2, true); qb2.actual = planned; r = await h.call('surgery', 'surgEdit', { ...qb2, n: 1 }); P2 = plan(id2); ok(r.ok && P2.sg.diff === 0 && P2.settle !== 'pending', 'edit to the planned amount → nothing left to settle', { s: P2.settle, d: P2.sg.diff });
  const qc2 = body(id2, n2, true); qc2.actual = planned + 500000; r = await h.call('surgery', 'surgEdit', { ...qc2, n: 1 }); P2 = plan(id2); ok(r.ok && P2.sg.diff === 500000 && P2.settle === 'pending', 'edit that raises the amount → back to «منتظر تسویه»', { s: P2.settle, d: P2.sg.diff });
  // ---- a settlement recorded in between is kept
  r = await h.call('staff', 'settleDone', { id: id2, pays: [{ kind: 'cash', amount: 500000, part: 's', pos: '', acct: '', note: '', by: 'منشی' }], by: 'منشی', sendId: uuid() }); P2 = plan(id2);
  ok(r.ok && P2.settle === 'done' && Number(P2.sg.settledDiff) === 500000, 'reception settles the 500,000', { r: r.ok || r.error, s: P2.settle, sd: P2.sg.settledDiff });
  const paid0 = h.sql(`select coalesce(sum(amount),0) s from pays where plan='${id2}' and st='ok'`)[0].s;
  const qd2 = body(id2, n2, true); qd2.actual = planned + 800000; r = await h.call('surgery', 'surgEdit', { ...qd2, n: 1 }); P2 = plan(id2);
  ok(r.ok && P2.sg.diff === 800000 && Number(P2.sg.settledDiff) === 500000 && P2.settle === 'pending', 'edit after settlement: the settled 500,000 is kept and only the new 300,000 waits in «منتظر تسویه»', { s: P2.settle, d: P2.sg.diff, sd: P2.sg.settledDiff });
  ok(h.sql(`select coalesce(sum(amount),0) s from pays where plan='${id2}' and st='ok'`)[0].s === paid0, 'payments are untouched by the edit');
  const qe2 = body(id2, n2, true); qe2.actual = planned + 500000; r = await h.call('surgery', 'surgEdit', { ...qe2, n: 1 }); P2 = plan(id2);
  ok(r.ok && P2.sg.diff === 500000 && P2.settle === 'done', 'edit back to the settled amount → settled again', { s: P2.settle, d: P2.sg.diff, sd: P2.sg.settledDiff });
  { const tb = await h.call('accountant', 'finTrial', {}); ok(tb && tb.ok !== false, 'accounting still answers after the edits (trial balance)', tb && tb.error);
    const rows = (tb && (tb.rows || tb.items)) || []; const dr = rows.reduce((a, x) => a + (Number(x.dr) || 0), 0), cr = rows.reduce((a, x) => a + (Number(x.cr) || 0), 0); ok(!rows.length || Math.abs(dr - cr) < 1, 'trial balance: debit = credit', { dr, cr, n: rows.length }) }
  // ---- history
  const ev = h.sql(`select title from events where plan='${id}' order by at desc limit 12`).map(e => e.title); ok(ev.some(t => /ویرایش شد/.test(t)), 'patient history says the session was edited', ev.slice(0, 4));
  const au = h.sql(`select action, info from audit where target='${id}' order by n desc limit 3`); ok(au.some(a => /ویرایش جلسه/.test(a.info || '')), 'change log carries «ویرایش جلسه»', au);
  // ---- only the last session
  await h.must('staff', 'toSurgery', { id }).catch(async () => { const tk = h.tasks(id).find(t => t.kind === 'book' && !t.done); if (tk) await h.appt(id, n1, 'surg', h.today(), tk.id); await h.must('staff', 'toSurgery', { id }) });
  r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 1 }); ok(r.ok === false && /وضعیت|جلسه‌ی دیگری/.test(r.error), 'patient sent to surgery again → the earlier session is no longer editable', r);
  r = await h.call('surgery', 'surgSave', body(id, n1, false)); ok(r.ok && r.n === 2, 'session 2 recorded', r);
  r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 1 }); ok(r.ok === false, 'session 1 cannot be edited after session 2', r);
  r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 2 }); ok(r.ok && plan(id).sg.sessions.length === 2, 'session 2 (the last) can be edited', r);
  // ---- next day
  await h.travel(1); r = await h.call('surgery', 'surgEdit', { ...body(id, n1, false), n: 2 }); ok(r.ok === false && /مهلت/.test(r.error), 'next day → refused', r);
  r = await h.call('surgery', 'surgEditList', {}); ok(r.ok && r.items.length === 0, 'next day the list is empty', r.items);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 600)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
