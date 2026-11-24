// t-m44a (server): early failure + implant on one tooth = two fixtures, each from its own stock item. Run: WORKER=<m44a bundle> node t-m44a.mjs
import { start, uuid, REC } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 500) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start(); const OLD = REC.queueAdd[0].req.id;
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const body = (id, name, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id).split('رضا آزمایشی').join(name)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; return q };
const stock = () => Object.fromEntries(h.sql(`select kind, b, sys, d, l, qty from inv_items where kind='fix'`).map(r => [[r.b, r.sys || '', r.d, r.l].join('/'), r.qty]));
const diff = (a, b) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (b[k] || 0) - (a[k] || 0); if (d) o[k] = d } return o };
try {
  // 1) failed fixture and placed fixture of different size
  let nm = 'بیمار دو فیکسچر', id = await mk(nm), q = body(id, nm, true); const keys = Object.keys(q.session.imp), k0 = keys[0], m0 = q.session.imp[k0]; console.log('     first fixture:', J(m0));
  const d2 = String(m0.d) === '5' ? '4.5' : '5', l2 = String(m0.l) === '8' ? '10' : '8'; m0.rs = 'fail'; m0.rep = 1; m0.f2 = { b: m0.b, sys: m0.sys || '', g: m0.g || '', d: d2, l: l2 };
  const S0 = stock(); let r = await h.call('surgery', 'surgSave', q); ok(r.ok, 'session with «فیل اولیه + کاشت» on one tooth saved', r); let d = diff(S0, stock());
  const k1 = [m0.b, m0.sys || '', m0.d, m0.l].join('/'), k2 = [m0.b, m0.sys || '', d2, l2].join('/'), others = keys.length - 1;
  ok(d[k2] === -1, 'the placed fixture (its own size) leaves the store once', d); ok(Object.values(d).reduce((a, b) => a + b, 0) === -(keys.length + 1), 'in all: one fixture per implant + one more for the failed one', d);
  const sg = JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg); ok(sg.sessions[0].imp[k0].f2 && sg.sessions[0].imp[k0].f2.d === d2, 'the session keeps both fixtures', sg.sessions[0].imp[k0]);
  const mv = h.sql(`select note, delta from inv_moves where ref='${id}'`).filter(x => /فیکسچر دوم/.test(x.note || '')); ok(mv.length === 1 && mv[0].delta === -1, 'store history names the second fixture', mv);
  // same day edit: back to one normal implant → both come back as needed
  const q2 = body(id, nm, true); r = await h.call('surgery', 'surgEdit', { ...q2, n: 1 }); ok(r.ok, 'same-day edit to a normal implant', r); d = diff(S0, stock());
  ok(Object.values(d).reduce((a, b) => a + b, 0) === -keys.length && !d[k2], 'store after the edit: one fixture per implant, the second one is back', d);
  // manager correction on a later day: second fixture again, other size
  await h.travel(2); const S1 = stock(), q3 = body(id, nm, true), a3 = JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg).actual; q3.session.imp[k0] = Object.assign({}, q3.session.imp[k0], { rs: 'fail', rep: 1, f2: { b: m0.b, sys: m0.sys || '', g: m0.g || '', d: d2, l: l2 } });
  r = await h.call('manager', 'surgFix', { id, n: 1, session: q3.session, actual: a3, sendId: uuid() }); d = diff(S1, stock()); ok(r.ok && d[k2] === -1 && Object.keys(d).length === 1, 'manager correction adds the second fixture: only that item moves', { r: r.ok || r.error, d });
  r = await h.call('manager', 'surgFix', { id, n: 1, session: body(id, nm, true).session, actual: a3, sendId: uuid() }); ok(r.ok && J(diff(S1, stock())) === '{}', 'correction back → store as before', diff(S1, stock()));
  // 2) as before: no second fixture chosen → the same item twice
  nm = 'بیمار همان فیکسچر'; id = await mk(nm); q = body(id, nm, true); const mA = q.session.imp[Object.keys(q.session.imp)[0]]; mA.rs = 'fail'; mA.rep = 1; const S2 = stock(); r = await h.call('surgery', 'surgSave', q); d = diff(S2, stock());
  const kA = [mA.b, mA.sys || '', mA.d, mA.l].join('/'); ok(r.ok && Object.values(d).reduce((a, b) => a + b, 0) === -(keys.length + 1) && d[kA] <= -2, 'no second fixture chosen → the same item twice (unchanged)', d);
  // 3) removed, not placed again: f2 is ignored
  nm = 'بیمار برداشته'; id = await mk(nm); q = body(id, nm, true); const mB = q.session.imp[Object.keys(q.session.imp)[0]]; mB.rs = 'fail'; mB.rep = 0; mB.f2 = { b: mB.b, d: d2, l: l2 }; const S3 = stock(); r = await h.call('surgery', 'surgSave', q); d = diff(S3, stock());
  ok(r.ok && Object.values(d).reduce((a, b) => a + b, 0) === -keys.length && !d[k2], '«برداشته شد، کاشت دوباره بعداً» → no second fixture leaves the store', d);
  // 4) a broken f2 falls back to the first item
  nm = 'بیمار ناقص'; id = await mk(nm); q = body(id, nm, true); const mC = q.session.imp[Object.keys(q.session.imp)[0]]; mC.rs = 'fail'; mC.rep = 1; mC.f2 = { b: mC.b, d: '', l: '' }; const S4 = stock(); r = await h.call('surgery', 'surgSave', q); d = diff(S4, stock());
  ok(r.ok && Object.values(d).reduce((a, b) => a + b, 0) === -(keys.length + 1), 'second fixture without size → counted as the same item', d);
  // report
  const rep = await h.call('manager', 'xlReport', { from: '2000-01-01', to: '2999-01-01' }).catch(() => null) || await h.call('inventory', 'xlReport', { from: '2000-01-01', to: '2999-01-01' }).catch(() => null);
  if (rep && rep.fixtures) { const tot = rep.fixtures.reduce((a, f) => a + f.n, 0); console.log('     fixtures in report:', tot) }
  { const tb = await h.call('accountant', 'finTrial', {}); const rows = (tb && (tb.rows || tb.items)) || []; const dr = rows.reduce((a, x) => a + (Number(x.dr) || 0), 0), cr = rows.reduce((a, x) => a + (Number(x.cr) || 0), 0); ok(tb && tb.ok !== false && Math.abs(dr - cr) < 1, 'accounting trial balance still balanced', { dr, cr }) }
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
