// m31 server tests + a data check for the manager reports: a surgery session with a primary failure and «سایر درمان‌ها», then every report-type action must answer without an error.
import { h } from '../m24/probe.mjs'; import { uuid, REC } from '../audit/A.mjs';
const J = (x, n = 500) => JSON.stringify(x).slice(0, n); let bad = 0; const NOTE = [];
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c ? '' : ' ' + (x === undefined ? '' : J(x)))); if (!c) bad++ };
const mkS = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const SG = i => JSON.parse(h.sql(`select surg from plans where id='${i}'`)[0].surg || '{}');
const ses = (id, name, x = {}) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id).split(REC.queueAdd[0].req.record ? '\u0000' : '\u0000').join('')); delete q.action; q.session.at = new Date().toISOString(); q.sendId = uuid(); Object.assign(q.session, x.session || {}); if (x.finish !== undefined) { q.finish = x.finish; q.session.last = x.finish ? 1 : 0 } return q };
try {
  const a = await mkS('گزارش جراحی');
  // ---- session.oth is cleaned by the server
  let q = ses(a, 'گزارش جراحی', { finish: false, session: { oth: [{ t: '  فرنکتومی  ', amt: '۱٬۵۰۰٬۰۰۰' }, { t: '', amt: 5 }, { t: 'x'.repeat(200), amt: -4 }, { t: 'رایگان', amt: 'abc' }, null, 7].concat(Array.from({ length: 30 }, (_, i) => ({ t: 'ردیف ' + i, amt: 1 }))) } });
  q.session.imp = Object.assign({}, q.session.imp); const k0 = Object.keys(q.session.imp)[0]; if (k0) q.session.imp[k0] = Object.assign({}, q.session.imp[k0], { rs: 'fail', rep: 1 });
  let r = await h.call('surgery', 'surgSave', q); ok(r.ok !== false, 'session with a primary failure and other treatments is saved', r);
  const s1 = SG(a).sessions[0];
  ok(Array.isArray(s1.oth) && s1.oth.length === 20 && s1.oth[0].t === 'فرنکتومی' && s1.oth[0].amt === 1500000 && s1.oth[1].t.length === 80 && s1.oth[1].amt === 0 && s1.oth[2].t === 'رایگان' && s1.oth[2].amt === 0, 'oth: trimmed, Persian digits read, nameless rows dropped, bad amounts → 0, max 20 rows', s1.oth && s1.oth.slice(0, 4));
  ok(!k0 || (s1.imp[k0].rs === 'fail' && s1.imp[k0].rep === 1), 'the failure reason is stored on the implant', s1.imp);
  if (k0) { const mv = h.sql(`select note, delta from inv_moves where refName='گزارش جراحی'`); ok(mv.some(m => /فیکسچر دوم/.test(m.note)), 'stock: the second fixture of a same-session re-implant is taken (existing rule)', mv) }
  // sessions without oth stay as before
  const b = await mkS('بدون سایر'); r = await h.call('surgery', 'surgSave', ses(b, 'بدون سایر', { finish: true })); ok(r.ok !== false && !('oth' in SG(b).sessions[0]), 'a session without «سایر» has no oth key', [r, Object.keys(SG(b).sessions[0])]);
  r = await h.call('surgery', 'surgSave', ses(await mkS('سایر خالی'), 'سایر خالی', { finish: true, session: { oth: 'junk' } })); ok(r.ok !== false, 'junk in oth does not break the save', r);
  // ---- finish, then every report-type action
  r = await h.call('staff', 'toSurgery', { id: a }); if (r.ok === false) console.log('     toSurgery again →', J(r, 200));
  r = await h.call('surgery', 'surgSave', ses(a, 'گزارش جراحی', { finish: true })); ok(r.ok !== false && SG(a).finished === true, 'second session closes the surgery', r);
  const d0 = h.today(), from = new Date(Date.parse(d0) - 40 * 864e5).toISOString().slice(0, 10);
  const R = [['manager', 'mgrReport', {}], ['manager', 'stats', {}], ['manager', 'perf', {}], ['manager', 'events', {}], ['accountant', 'm1Rep', { from, to: d0 }], ['accountant', 'finXl', { from, to: d0 }], ['accountant', 'finDash', {}], ['accountant', 'finProfit', { from, to: d0 }], ['accountant', 'finSuggest', { id: a }], ['manager', 'invReport', {}], ['accountant', 'accReport', { from, to: d0 }], ['manager', 'attReport', {}], ['accountant', 'finPayroll', { from, to: d0 }], ['accountant', 'finLedger', {}], ['accountant', 'finTrial', {}]];
  for (const [role, act, body] of R) { const x = await h.call(role, act, body), s = JSON.stringify(x); const srv = /خطای سرور/.test(x.error || ''), und = /undefined|NaN|\[object Object\]/.test(s);
    ok(!srv && !und, role + '/' + act + ' answers cleanly', (x.error || '') + ' ' + (s.match(/.{50}(undefined|NaN|\[object Object\]).{50}/) || [''])[0]);
    const has = /فرنکتومی/.test(s), fail = /فيل|فیل|fail/.test(s); NOTE.push(act + ': ' + (x.ok === false ? 'refused (' + String(x.error).slice(0, 40) + ')' : 'ok') + (has ? ' · shows «سایر درمان‌ها»' : '') + (fail ? ' · has the failure' : '')) }
  console.log('--- which reports already carry the new data:'); NOTE.forEach(n => console.log('     ' + n));
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 700)) }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
