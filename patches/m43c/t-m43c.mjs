// t-m43c (server): manager enters patient tariffs and doctor shares. Run: WORKER=<m43c bundle> node t-m43c.mjs
import { start, uuid, REC } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 400) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start(); const OLD = REC.queueAdd[0].req.id;
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const body = (id, name, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id).split('رضا آزمایشی').join(name)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; return q };
const fee = (svc, payee) => { const r = h.sql(`select amount from fin_fee where svc='${svc}' and payee='${payee}'`)[0]; return r ? r.amount : 0 };
const lines = id => h.sql(`select id, lines, total, by, st from fin_inv where plan='${id}' and st='ok'`).flatMap(v => JSON.parse(v.lines || '[]'));
try {
  for (const role of ['surgery', 'staff', 'consultant', 'accountant', 'lab']) { const r = await h.call(role, 'm43Get', {}); ok(r.ok === false, role + ' cannot open tariffs and shares', r && r.error) }
  let g = await h.must('manager', 'm43Get', {}); const by = n => g.svc.find(s => s.name === n);
  const ko = by('هزینه جراحی کره ای'), ir = by('هزینه جراحی ایرانی'), rt = by('هزینه جراحی رووت'), it = by('هزینه جراحی ایتالیایی');
  ok(ko && ir && rt && it, 'implant surgery has a row per brand, Iranian included', g.svc.map(s => s.name).filter(n => /جراحی/.test(n)));
  ok(g.brandSvc.length === 5 && g.weekLeft === 7 && Array.isArray(g.shares) && g.shares.length === 0, 'first week counter, no rules yet', { w: g.weekLeft, s: g.shares.length });
  const D = g.payees.filter(p => p.kind === 'doctor' && p.active !== 0); ok(D.length >= 2, 'doctors listed', D.length); const d1 = D[0].id, d2 = D[1].id;
  const f0 = fee(ko.id, d1); ok(fee(ir.id, d1) === f0, 'Iranian row starts with the Korean share', { ir: fee(ir.id, d1), ko: f0 });
  // amount for all doctors
  let r = await h.call('manager', 'm43Save', { rows: [{ svc: ko.id, payee: '*', mode: 'a', val: 1500000 }] }); ok(r.ok && r.saved === 1, 'rule for all doctors saved', r && r.error);
  ok(D.every(p => fee(ko.id, p.id) === 1500000), 'every doctor now has 1,500,000 on the Korean row'); ok(fee(ir.id, d1) === f0, 'other rows untouched');
  // percent
  r = await h.call('manager', 'm43Save', { rows: [{ svc: it.id, payee: '*', mode: 'p', val: 30 }] }); const pIt = Number(by('هزینه جراحی ایتالیایی').price);
  ok(r.ok && pIt > 0 && fee(it.id, d1) === Math.round(pIt * .3), '30 percent of the patient tariff', { p: pIt, f: fee(it.id, d1) });
  // exception
  r = await h.call('manager', 'm43Save', { rows: [{ svc: ko.id, payee: d2, mode: 'p', val: 50 }] }); ok(r.ok && fee(ko.id, d2) === Math.round(Number(ko.price) * .5) && fee(ko.id, d1) === 1500000, 'exception for one doctor; the others keep the common rule', { d2: fee(ko.id, d2), d1: fee(ko.id, d1) });
  r = await h.call('manager', 'm43Save', { rows: [{ svc: ko.id, payee: d2, mode: '', val: '' }] }); ok(r.ok && fee(ko.id, d2) === 1500000, 'exception removed → back to the common rule', fee(ko.id, d2));
  // patient tariff change moves percent share
  const sIt = r.svc.find(s => s.id === it.id); r = await h.call('manager', 'm14Save', { t: 'svc', x: Object.assign({}, sIt, { price: pIt + 1000000, active: true }) });
  g = await h.must('manager', 'm43Get', {}); const pIt2 = Number(g.svc.find(s => s.id === it.id).price);
  ok(fee(it.id, d1) === Math.round(pIt2 * .3), 'percent share follows the patient tariff (' + pIt + ' → ' + pIt2 + ')', { f: fee(it.id, d1) });
  // guards
  r = await h.call('manager', 'm43Save', { rows: [{ svc: ko.id, payee: '*', mode: 'p', val: 120 }] }); ok(r.ok === false, 'percent above 100 refused', r);
  r = await h.call('manager', 'm43Save', { rows: [{ svc: 'nope', payee: '*', mode: 'a', val: 5 }] }); ok(r.ok === false, 'unknown service refused', r);
  r = await h.call('manager', 'm43Save', { rows: [{ svc: ko.id, payee: 'nope', mode: 'a', val: 5 }] }); ok(r.ok === false, 'unknown doctor refused', r);
  r = await h.call('surgery', 'm43Save', { rows: [{ svc: ko.id, payee: '*', mode: 'a', val: 5 }] }); ok(r.ok === false && fee(ko.id, d1) === 1500000, 'other roles cannot save', r);
  const cl = g.svc.find(s => s.rule === 'clinic'); if (cl) { const c0 = fee(cl.id, d1); r = await h.call('manager', 'm43Save', { rows: [{ svc: cl.id, payee: '*', mode: 'a', val: 999 }] }); ok(r.ok && fee(cl.id, d1) === c0, 'a clinic service (کار مجدد) is not touched by a share rule', fee(cl.id, d1)) }
  // a surgery → automatic invoice uses the share; then a change is applied to the earlier invoice
  const nm = 'بیمار تعرفه', id = await mk(nm); const q = body(id, nm, true); r = await h.call('surgery', 'surgSave', q); ok(r.ok, 'surgery recorded', r);
  let L = lines(id); ok(L.length > 0, 'automatic invoice exists', L.length); const sum = () => lines(id).reduce((a, l) => a + (Number(l.fee) || 0), 0), s1 = sum();
  const used = [...new Set(L.map(l => l.svc))], names = used.map(u => (g.svc.find(s => s.id === u) || {}).name); console.log('     invoice services:', names.join(' | '), ' fee sum', s1);
  const tgt = L.find(l => (Number(l.fee) || 0) > 0 && l.payee) || L.find(l => l.payee);
  if (tgt) { const before = Number(tgt.fee) || 0, qy = Number(tgt.q) || 1;
    r = await h.call('manager', 'm43Save', { rows: [{ svc: tgt.svc, payee: '*', mode: 'a', val: 777000 }] }); ok(r.ok && r.autoInv >= 1, 'share changed after the surgery', r && r.autoInv);
    ok(sum() === s1, 'the earlier invoice is not changed by the save alone');
    let a = await h.call('manager', 'm43Apply', { after: '' }); ok(a.ok && a.done >= 1 && !a.next, 'apply to earlier automatic invoices', a);
    const t2 = lines(id).find(l => l.svc === tgt.svc && l.payee === tgt.payee); ok(t2 && Number(t2.fee) === 777000 * qy, 'earlier invoice now has the new share (' + before + ' → ' + (t2 && t2.fee) + ')', t2);
    a = await h.call('surgery', 'm43Apply', { after: '' }); ok(a.ok === false, 'only the manager applies', a) } else ok(false, 'no doctor line on the invoice to test', L);
  { const tb = await h.call('accountant', 'finTrial', {}); const rows = (tb && (tb.rows || tb.items)) || []; const dr = rows.reduce((a, x) => a + (Number(x.dr) || 0), 0), cr = rows.reduce((a, x) => a + (Number(x.cr) || 0), 0); ok(tb && tb.ok !== false && Math.abs(dr - cr) < 1, 'accounting trial balance still balanced', { dr, cr }) }
  await h.travel(8); g = await h.must('manager', 'm43Get', {}); ok(g.weekLeft === 0, 'after a week the automatic apply is off', g.weekLeft);
  const au = h.sql(`select count(*) c from audit where action='m43Save'`)[0].c; ok(au >= 4, 'changes are in the change log', au);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
