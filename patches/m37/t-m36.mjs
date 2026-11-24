// t-m36: lab flow by referral (API). Run: WORKER=<m36 bundle> node t-m36.mjs
import * as A from '../audit/A.mjs';
const h = await A.start(); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const raw = async (pw, action, body = {}) => (await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: pw, ...body }) })).json();
const P = { R: 'recep-test-11', S: 'scan-test-111', A: 'design-test-1', B: 'make-test-b11', C: 'make-test-c11', D: 'finish-test-1' };
try {
  let D0 = await h.call('lab', 'labDefs', { op: 'get' });
  ok(D0.ok && D0.depts.length === 5 && D0.procs.length === 1 && D0.wts.length === 1 && D0.staff.length === 0, 'fresh site starts with the neutral starter only (5 departments, 1 process, 1 work type, no staff)', { d: D0.depts && D0.depts.map(d => d.name), s: D0.staff && D0.staff.length });
  const B5 = await h.call('lab', 'lab5', { op: 'boot' }); ok(B5.ok && B5.accts.length === 0 && B5.plists.length === 0 && !B5.set.def_acct, 'no embedded accounts / price lists', B5.set);
  for (const d of D0.depts.filter(d => d.flags.upload)) await h.must('lab', 'labDefs', { op: 'dept', x: { id: d.id, name: d.name, active: true, sort: d.sort, flags: {} } });
  const mk = (name, pw, lab) => h.must('manager', 'userSave', { u: { name, role: 'lab', pw, lab } });
  await mk('پذیرش آزمایشی', P.R, { depts: [], recep: 1 }); await mk('اسکن آزمایشی', P.S, { depts: [101] }); await mk('طراح آزمایشی', P.A, { depts: [102], designer: 1 });
  await mk('ساخت ب', P.B, { depts: [103] }); await mk('ساخت ج', P.C, { depts: [103] }); await mk('پرداخت آزمایشی', P.D, { depts: [104] });
  D0 = await h.call('lab', 'labDefs', { op: 'get' }); const U = n => D0.staff.find(s => s.name === n).id;
  // (1) new work for another clinic: nothing required
  let r = await raw(P.R, 'lab4New', { id: '', name: '', clinic: '', lid: A.uuid(), sendId: A.uuid(), order: {} });
  ok(r.ok && r.id, 'another-clinic work is saved with every field empty', r); const lid = r.id;
  let o = await raw(P.R, 'labOrder', { lid }); ok(o.order.name === 'بدون نام' && o.order.data.clinic === 'نامشخص' && o.order.data.for === 'tryin', 'placeholders for the empty name / clinic', o.order);
  r = await raw(P.R, 'lab4New', { id: A.uuid(), name: 'x', lid: A.uuid(), sendId: A.uuid(), order: {} }); ok(!r.ok, 'a site patient still goes through the normal checks', r);
  // start: the first step goes to the only person of its department
  r = await raw(P.R, 'labStart', { lid, wt: 101, proc: '', from: '', designer: '', box: '', note: '', prio: '' }); ok(r.ok, 'reception starts the order', r);
  const S = async () => (await raw(P.R, 'labOrder', { lid })).steps;
  let st = await S(); ok(st.length === 5 && st[0].asg === U('اسکن آزمایشی'), 'first step referred automatically (one person in the department)', st[0]);
  let L = await raw(P.R, 'labList', {}); ok(L.m36 && L.m36.stwt && L.m36.stwt.tryin === 101, 'work type remembered for this stage', L.m36);
  r = await raw(P.A, 'labStep', { lid, sid: st[0].id, op: 'quick' }); ok(!r.ok, 'another person cannot do a step referred to someone else', r);
  r = await raw(P.S, 'labStep', { lid, sid: st[0].id, op: 'quick', text: '' }); ok(r.ok, 'the referred person completes the step', r);
  st = await S(); ok(st[0].st === 'done' && st[1].asg === U('طراح آزمایشی'), 'next step goes to the only designer', st[1]);
  // back to reception
  r = await raw(P.A, 'labStep', { lid, sid: st[1].id, op: 'back', text: '' }); ok(!r.ok, 'sending back needs a reason', r);
  r = await raw(P.B, 'labStep', { lid, sid: st[1].id, op: 'back', text: 'نمی‌دانم' }); ok(!r.ok, 'only the referred person can send back', r);
  r = await raw(P.A, 'labStep', { lid, sid: st[1].id, op: 'back', text: 'اسکن ناقص است' }); ok(r.ok, 'designer sends the work back with a reason', r);
  st = await S(); o = await raw(P.R, 'labOrder', { lid });
  ok(st[1].st === 'pend' && !st[1].asg && o.order.data.back && o.order.data.back.text === 'اسکن ناقص است' && o.order.log.some(g => /برگشت «طراحی» به پذیرش/.test(g.note)), 'step waits at reception, not auto-referred again; reason kept', { s: st[1], b: o.order.data.back });
  r = await raw(P.A, 'labStep', { lid, sid: st[1].id, op: 'accept' }); ok(!r.ok && (r.needAsg || r.m40), 'no work without a referral', r); /* since m40 a plain employee is refused even earlier: the order is not his */
  r = await h.call('lab', 'labStep', { lid, sid: st[1].id, op: 'quick' }); ok(!r.ok && r.needAsg, 'the supervisor (shared password) cannot complete an unreferred step either', r);
  r = await h.call('lab', 'lab5', { op: 'acceptFor', lid, sid: st[1].id, uid: '' }); ok(!r.ok, 'accepting for someone needs the person', r);
  r = await h.call('lab', 'lab5', { op: 'finishAll', lid }); ok(!r.ok && r.needAsg && /طراحی/.test(r.error), '«complete all» refuses while a step is not referred', r);
  r = await raw(P.A, 'labStep', { lid, sid: st[1].id, op: 'assign', uid: U('طراح آزمایشی') }); ok(!r.ok, 'an ordinary employee cannot refer', r);
  r = await raw(P.R, 'labStep', { lid, sid: st[1].id, op: 'assign', uid: U('طراح آزمایشی') }); ok(r.ok, 'reception refers the step again', r);
  o = await raw(P.R, 'labOrder', { lid }); ok(!o.order.data.back && o.steps[1].asg === U('طراح آزمایشی'), 'the open return is closed by the new referral', o.order.data.back);
  r = await raw(P.A, 'labStep', { lid, sid: st[1].id, op: 'accept' }); ok(r.ok, 'designer starts', r);
  // two people in the next department: the person chooses
  r = await raw(P.A, 'labStep', { lid, sid: st[1].id, op: 'done', text: '', next: U('ساخت ج') }); ok(r.ok && !r.all, 'designer finishes and names the next person', r);
  st = await S(); ok(st[2].asg === U('ساخت ج'), 'the step sits with the chosen person', st[2]);
  r = await raw(P.B, 'labStep', { lid, sid: st[2].id, op: 'quick' }); ok(!r.ok, 'the colleague of the same department cannot take it', r);
  r = await raw(P.C, 'labStep', { lid, sid: st[2].id, op: 'quick' }); ok(r.ok && !r.all, 'chosen person completes', r);
  st = await S(); ok(st[3].asg === U('پرداخت آزمایشی'), 'next single-person department is automatic', st[3]);
  r = await raw(P.D, 'labStep', { lid, sid: st[4].id, op: 'accept' }); ok(!r.ok, 'the final-send step has no acceptance', r);
  r = await raw(P.D, 'labStep', { lid, sid: st[3].id, op: 'quick' }); ok(r.ok && r.all === 1, 'last real step: the order is ready to leave', r);
  st = await S(); o = await raw(P.R, 'labOrder', { lid }); ok(st[4].st === 'done' && st[4].done_name === 'سامانه' && o.order.data.cur.all === 1 && o.order.st === 'making', '«ارسال کار نهایی» closed itself; order waits for reception', st[4]);
  r = await raw(P.D, 'labSet', { lid, st: 'ready', by: 'x' }); ok(!r.ok, 'an ordinary employee cannot send to the clinic', r);
  r = await raw(P.R, 'labSet', { lid, st: 'ready', by: 'x' }); ok(r.ok, 'reception sends to the clinic', r);
  st = await S(); ok(st[4].done_name === 'پذیرش آزمایشی', 'the final-send step carries the name of who sent it', st[4]);
  // two candidates and nobody chosen -> waits at reception; reception's own account may take a step itself
  r = await raw(P.R, 'lab4New', { id: '', name: 'دوم', clinic: 'ک', lid: A.uuid(), sendId: A.uuid(), order: { note: 'x' } }); const l2 = r.id;
  r = await raw(P.R, 'labStart', { lid: l2, from: '' }); ok(r.ok, 'start without choosing the work type uses the remembered one', r);
  let s2 = (await raw(P.R, 'labOrder', { lid: l2 })).steps; ok(s2.length === 5, 'steps of the remembered work type', s2.length);
  await raw(P.S, 'labStep', { lid: l2, sid: s2[0].id, op: 'quick' }); await raw(P.A, 'labStep', { lid: l2, sid: s2[1].id, op: 'quick' });
  s2 = (await raw(P.R, 'labOrder', { lid: l2 })).steps; ok(s2[1].st === 'done' && s2[2].st === 'pend' && !s2[2].asg, 'two people and none chosen: the step waits for reception', s2[2]);
  r = await h.call('lab', 'lab5', { op: 'acceptFor', lid: l2, sid: s2[2].id, uid: U('ساخت ب') }); ok(r.ok, 'supervisor refers by accepting for a person', r);
  s2 = (await raw(P.R, 'labOrder', { lid: l2 })).steps; ok(s2[2].st === 'acc' && s2[2].asg === U('ساخت ب'), 'accepted for that person', s2[2]);
  r = await raw(P.R, 'labStep', { lid: l2, sid: s2[2].id, op: 'assign', uid: U('ساخت ج') }); s2 = (await raw(P.R, 'labOrder', { lid: l2 })).steps;
  ok(r.ok && s2[2].st === 'pend' && s2[2].asg === U('ساخت ج'), 'referring an accepted step to someone else reopens it for the new person', s2[2]);
  r = await h.call('lab', 'lab5', { op: 'finishAll', lid: l2 }); ok(r.ok && r.all === 1, '«complete all» works once every open step is referred', r);
  // older rules still hold under referral: required test-send (m26/m30) and outsourcing (m27)
  await h.must('lab', 'labDefs', { op: 'dept', x: { id: 103, name: 'ساخت', active: true, sort: 3, flags: { test: 1 } } });
  r = await raw(P.R, 'lab4New', { id: '', name: 'سوم', clinic: 'ک', lid: A.uuid(), sendId: A.uuid(), order: { note: 'x' } }); const l3 = r.id; await raw(P.R, 'labStart', { lid: l3, wt: 101 });
  let s3 = (await raw(P.R, 'labOrder', { lid: l3 })).steps; await raw(P.S, 'labStep', { lid: l3, sid: s3[0].id, op: 'quick' }); await raw(P.A, 'labStep', { lid: l3, sid: s3[1].id, op: 'quick', next: U('ساخت ب') });
  r = await raw(P.R, 'lab5', { op: 'out', lid: l3, sid: s3[2].id, co: 'لابراتوار بیرونی' }); ok(r.ok, 'a referred waiting step can be outsourced', r);
  r = await raw(P.B, 'labStep', { lid: l3, sid: s3[2].id, op: 'quick' }); ok(!r.ok && /تست/.test(r.error || ''), 'required test-send still blocks completion', r);
  await raw(P.R, 'lab5', { op: 'test', lid: l3, items: ['تست'], note: '' });
  r = await raw(P.B, 'labStep', { lid: l3, sid: s3[2].id, op: 'quick' }); ok(r.ok, 'after the test send the referred person completes it', r);
  const o3 = (await raw(P.R, 'labOrder', { lid: l3 })).order; ok(o3.data.outs && o3.data.outs[s3[2].id] && o3.data.outs[s3[2].id].st === 'back', 'completing returns the outsourced step automatically', o3.data.outs);
  await h.must('lab', 'labDefs', { op: 'dept', x: { id: 103, name: 'ساخت', active: true, sort: 3, flags: {} } });
  // photo kinds
  r = await raw(P.R, 'labFile', { op: 'begin', lid: l2, kind: 'pphoto', name: 'a.jpg', size: 10, gz: 0, n: 1 }); ok(r.ok, 'patient photo kind accepted', r);
  const f = h.sql(`select kind from lab_file where id='${r.id}'`)[0]; ok(f && f.kind === 'pphoto', 'kind stored', f);
} catch (e) { console.log('ERR', e && e.stack); bad++ } finally { h.stop() }
console.log(bad ? 'FAILED ' + bad : 'ALL OK');
