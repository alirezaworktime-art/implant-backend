// t-m40: a plain lab employee reaches only the work referred to him (API). Run: WORKER=<m40 bundle> node t-m40.mjs
import * as A from '../audit/A.mjs';
const h = await A.start(); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const raw = async (pw, action, body = {}) => (await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: pw, ...body }) })).json();
const P = { R: 'recep-test-11', S: 'sup-test-1111', A: 'make-test-a11', B: 'make-test-b11', D: 'design-test-1', F: 'finish-test-1' };
try {
  let D0 = await h.call('lab', 'labDefs', { op: 'get' });
  for (const d of D0.depts.filter(d => d.flags.upload)) await h.must('lab', 'labDefs', { op: 'dept', x: { id: d.id, name: d.name, active: true, sort: d.sort, flags: {} } });
  const mk = (name, pw, lab) => h.must('manager', 'userSave', { u: { name, role: 'lab', pw, lab } });
  await mk('پذیرش آزمایشی', P.R, { depts: [], recep: 1 }); await mk('سرپرست آزمایشی', P.S, { depts: [], sup: 1 }); await mk('ساخت الف', P.A, { depts: [101, 102, 103] }); await mk('ساخت ب', P.B, { depts: [101, 102, 103] });
  await mk('طراح آزمایشی', P.D, { depts: [102], designer: 1 }); await mk('پرداخت آزمایشی', P.F, { depts: [104] });
  D0 = await h.call('lab', 'labDefs', { op: 'get' }); const U = n => D0.staff.find(s => s.name === n).id;
  const mkO = async name => { const r = await raw(P.R, 'lab4New', { id: '', name, clinic: 'کلینیک نمونه', lid: A.uuid(), sendId: A.uuid(), order: { teeth: ['UR6'] } }); await raw(P.R, 'labStart', { lid: r.id, wt: 101, proc: '', from: '', designer: '', box: '', note: '', prio: '' }); return r.id };
  const steps = async lid => (await raw(P.R, 'labOrder', { lid })).steps;
  const refer = async (lid, i, who) => { const st = await steps(lid); const r = await raw(P.R, 'labStep', { lid, sid: st[i].id, op: 'assign', uid: U(who) }); if (!r.ok) console.log('refer', r.error); return st[i].id };
  const O1 = await mkO('کار الف'), O2 = await mkO('کار ب'), O3 = await mkO('کار بی‌ارجاع');
  const s1 = await refer(O1, 0, 'ساخت الف'), s2 = await refer(O2, 0, 'ساخت ب');
  // ---- list
  let L = await raw(P.A, 'labList', {}); ok(L.ok && L.m40 === 1 && L.items.length === 1 && L.items[0].id === O1, 'employee A: the work list holds only his order', L.items && L.items.map(x => x.name));
  ok(L.items[0].data.acct === undefined && L.items[0].data.acctName === undefined && L.items[0].data.teeth.length === 1, 'his order comes without the customer account', L.items[0].data);
  L = await raw(P.B, 'labList', {}); ok(L.items.length === 1 && L.items[0].id === O2, 'employee B: only his own', L.items.map(x => x.name));
  L = await raw(P.F, 'labList', {}); ok(L.ok && L.items.length === 0, 'an employee with nothing referred sees an empty list', L.items.length);
  for (const [k, n] of [['R', 'reception'], ['S', 'supervisor']]) { L = await raw(P[k], 'labList', {}); ok(L.items.length === 3 && !L.m40, n + ' still sees every order', L.items.length); }
  L = await h.call('lab', 'labList', {}); ok(L.items.length === 3 && !L.m40, 'the shared lab password still sees every order');
  L = await h.call('staff', 'labList', {}); ok(L.ok && L.items.length === 3, 'the clinic side is untouched');
  // ---- one order, files
  let r = await raw(P.A, 'labOrder', { lid: O1 }); ok(r.ok && r.m40 === 1 && r.steps.length === 5 && r.order.data.acct === undefined, 'A opens his order (sheet and steps), without the account', r.error);
  for (const lid of [O2, O3]) { r = await raw(P.A, 'labOrder', { lid }); ok(!r.ok && r.m40 === 1 && /ارجاع نشده/.test(r.error), 'A cannot open an order that is not his', r); }
  r = await raw(P.A, 'labFile', { op: 'begin', lid: O2, name: 'x.stl', size: 10, n: 1, kind: 'design' }); ok(!r.ok && r.m40 === 1, 'A cannot add a file to another order', r);
  r = await raw(P.A, 'labFile', { op: 'begin', lid: O1, name: 'x.stl', size: 10, n: 1, kind: 'design' }); ok(r.ok || !r.m40, 'A can start a file on his own order', r);
  // ---- steps
  r = await raw(P.A, 'labStep', { lid: O2, sid: s2, op: 'accept' }); ok(!r.ok && r.m40 === 1, 'A cannot touch a step of another order', r);
  r = await raw(P.A, 'labStep', { lid: O1, sid: s1, op: 'assign', uid: U('ساخت ب') }); ok(!r.ok && r.m40 === 1, 'A cannot refer work to someone else', r);
  r = await raw(P.A, 'labStep', { lid: O1, sid: s1, op: 'accept' }); ok(r.ok, 'A starts his step', r);
  L = await raw(P.A, 'labList', {}); ok(L.items.length === 1 && L.items[0].steps.some(s => s.st === 'acc' && s.acc_by === U('ساخت الف')), 'the started work stays in his list (half-done)');
  r = await raw(P.A, 'labStep', { lid: O1, sid: s1, op: 'done', text: '', next: U('ساخت ب') }); ok(r.ok, 'A finishes and names the next person', r);
  L = await raw(P.A, 'labList', {}); ok(L.items.length === 0, 'after finishing, the order leaves his open list', L.items.length);
  L = await raw(P.B, 'labList', {}); ok(L.items.length === 2, 'the next person now has it', L.items.map(x => x.name));
  // ---- finished list
  r = await raw(P.A, 'lab5', { op: 'm40mine', days: 30 }); ok(r.ok && r.items.length === 1 && r.items[0].lid === O1 && r.items[0].name === 'کار الف' && r.items[0].dname && !('acct' in r.items[0]), '«تمام‌کرده‌ام»: his finished step', r);
  r = await raw(P.B, 'lab5', { op: 'm40mine', days: 30 }); ok(r.ok && r.items.length === 0, 'B has finished nothing yet', r.items);
  r = await raw(P.A, 'labOrder', { lid: O1 }); ok(r.ok && r.m40 === 1, 'A can still open the sheet of work he finished');
  await h.travel(40); r = await raw(P.A, 'lab5', { op: 'm40mine', days: 30 }); ok(r.items.length === 0, 'older than 30 days is outside the default window'); r = await raw(P.A, 'lab5', { op: 'm40mine', days: 0 }); ok(r.items.length === 1, '«قدیمی‌ترها» brings it back'); await h.travel(-40);
  // ---- everything else is closed
  const NO = [['lab5', { op: 'list', view: 'all' }], ['lab5', { op: 'report' }], ['lab5', { op: 'files' }], ['lab5', { op: 'acctSave', x: { name: 'x' } }], ['lab5', { op: 'setSave', set: {} }], ['lab5', { op: 'del', lid: O1 }], ['lab5', { op: 'edit', lid: O1 }], ['lab5', { op: 'finishAll', lid: O1 }], ['lab5', { op: 'acceptFor', lid: O2, sid: s2, uid: U('ساخت الف') }],
    ['labSet', { lid: O1, st: 'ready' }], ['labSet', { lid: O1, st: 'cancel' }], ['labStart', { lid: O3, wt: 101 }], ['lab4New', { id: '', name: 'x', lid: A.uuid(), sendId: A.uuid(), order: {} }], ['lab4Pats', { q: 'نمونه' }], ['lab4Find', { q: 'کار' }], ['labRet', { lid: O1 }], ['labDefs', { op: 'dept', x: { name: 'تازه' } }], ['labDefs', { op: 'staffSave', x: {} }]];
  const leak = []; for (const [a, b] of NO) { r = await raw(P.A, a, b); if (r.ok !== false || r.m40 !== 1) leak.push(a + ':' + (b.op || b.st || '') + ' → ' + JSON.stringify(r).slice(0, 80)); }
  ok(!leak.length, NO.length + ' other lab operations answer «دسترسی ندارید» for a plain employee', leak);
  r = await raw(P.A, 'lab5', { op: 'boot' }); ok(r.ok && r.accts.length === 0 && r.plists.length === 0 && r.boxes.length === 0 && Object.keys(r.set).join() === 'lab_name', 'start-up data carries no accounts, price lists or settings', r);
  r = await raw(P.A, 'labDefs', { op: 'get' }); ok(r.ok && r.depts.length === 5 && r.staff.length === 6 && !r.plists && !r.accts && Object.keys(r.staff[0]).every(k => ['id', 'name', 'active', 'depts', 'sup', 'recep', 'designer'].includes(k)), 'definitions: department and staff names only', Object.keys(r));
  r = await raw(P.A, 'labStep', { lid: O1, sid: s1, op: 'accept', _m40in: 1 }); r = await raw(P.A, 'labSet', { lid: O1, st: 'cancel', _m40in: 1 }); ok(!r.ok && r.m40 === 1, 'the inner mark cannot be sent from outside', r);
  // ---- designer is a plain employee too; reception and supervisor keep everything
  r = await raw(P.D, 'labList', {}); ok(r.m40 === 1 && r.items.length === 0, 'designer: only what is referred to him');
  r = await raw(P.R, 'lab5', { op: 'list', view: 'all' }); ok(r.ok, 'reception: lists still open', r.error); r = await raw(P.S, 'lab5', { op: 'report' }); ok(r.ok !== false || !r.m40, 'supervisor: reports not blocked by m40', r);
  r = await raw(P.R, 'labOrder', { lid: O2 }); ok(r.ok && !r.m40, 'reception opens any order');
  // ---- whole chain to the end with plain employees only
  let st = await steps(O1); r = await raw(P.B, 'labStep', { lid: O1, sid: st[1].id, op: 'quick', text: '' }); ok(r.ok, 'next employee completes step 2', r);
  st = await steps(O1); for (let i = 2; i < 4; i++) { st = await steps(O1); if (!st[i].asg) await refer(O1, i, i === 3 ? 'پرداخت آزمایشی' : 'ساخت الف'); st = await steps(O1); const pw = Object.entries({ A: 'ساخت الف', B: 'ساخت ب', F: 'پرداخت آزمایشی' }).find(([k, n]) => U(n) === st[i].asg); r = await raw(P[pw[0]], 'labStep', { lid: O1, sid: st[i].id, op: 'quick', text: '' }); ok(r.ok, 'step ' + (i + 1) + ' completed by its employee', r); }
  const o = await raw(P.R, 'labOrder', { lid: O1 }); ok(o.steps.every(s => s.st === 'done' || s.st === 'skip') || o.steps.slice(0, 4).every(s => s.st === 'done'), 'the order reaches the end (final send closes itself)', o.steps.map(s => s.st));
} catch (e) { console.log('ERR', e.stack); bad++ }
const errs = h.log().split('\n').filter(l => /m40|TypeError|SQLITE/i.test(l)); ok(!errs.length, 'no server errors', errs.slice(0, 3));
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); h.stop(); process.exit(bad ? 1 : 0);
