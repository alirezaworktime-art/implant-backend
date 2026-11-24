// t-m37: corrections after m36. Run: WORKER=<m37 bundle> node t-m37.mjs
import * as A from '../audit/A.mjs';
const h = await A.start(); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const raw = async (pw, action, body = {}) => (await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: pw, ...body }) })).json();
const P = { R: 'recep-test-11', S: 'scan-test-111', A: 'design-test-1', B: 'make-test-b11', C: 'make-test-c11' };
try {
  let D0 = await h.call('lab', 'labDefs', { op: 'get' });
  for (const d of D0.depts.filter(d => d.flags.upload)) await h.must('lab', 'labDefs', { op: 'dept', x: { id: d.id, name: d.name, active: true, sort: d.sort, flags: {} } });
  const mk = (name, pw, lab) => h.must('manager', 'userSave', { u: { name, role: 'lab', pw, lab } });
  await mk('پذیرش', P.R, { depts: [], recep: 1 }); await mk('اسکن', P.S, { depts: [101] }); await mk('طراح', P.A, { depts: [102] }); await mk('ساخت ب', P.B, { depts: [103] }); await mk('ساخت ج', P.C, { depts: [103] });
  D0 = await h.call('lab', 'labDefs', { op: 'get' }); const U = n => D0.staff.find(s => s.name === n).id;
  const neu = async n => (await raw(P.R, 'lab4New', { id: '', name: n, clinic: 'ک', lid: A.uuid(), sendId: A.uuid(), order: { note: 'x' } })).id, S = async lid => (await raw(P.R, 'labOrder', { lid })).steps;
  // parallel first steps: the chosen person gets the step of his own department, the single-person department is automatic
  const pg = await h.must('lab', 'labDefs', { op: 'proc', x: { name: 'موازی', steps: [{ d: 102, g: 1 }, { d: 103, g: 1 }, { d: 104, g: 0 }] } }), wg = await h.must('lab', 'labDefs', { op: 'wt', x: { name: 'موازی', proc: pg.id } });
  let l = await neu('موازی'); await raw(P.R, 'labStart', { lid: l, wt: wg.id, asg: U('ساخت ب') }); let s = await S(l);
  ok(s[0].asg_name === 'طراح' && s[1].asg_name === 'ساخت ب', 'parallel start: each step with the right person', s.map(x => [x.dname, x.asg_name]));
  l = await neu('موازی۲'); await raw(P.R, 'labStart', { lid: l, wt: wg.id, asg: U('اسکن') }); s = await S(l);
  ok(s[0].asg_name === 'طراح' && s[1].asg_name === 'اسکن', 'a person outside the departments gets the step that is still free', s.map(x => [x.dname, x.asg_name]));
  // an employee who is switched off no longer holds waiting work
  l = await neu('غیرفعال'); await raw(P.R, 'labStart', { lid: l, wt: 101 }); s = await S(l); ok(s[0].asg_name === 'اسکن', 'setup: referred to the scan person', s[0]);
  const su = (await h.call('manager', 'userList', {})).items.find(u => u.name === 'اسکن'); let r = await h.call('manager', 'userSave', { u: { id: su.id, name: su.name, role: 'lab', active: false } });
  s = await S(l); ok(r.ok && !s[0].asg && s[0].st === 'pend', 'switching the employee off frees his waiting step', s[0]);
  r = await raw(P.R, 'labStep', { lid: l, sid: s[0].id, op: 'assign', uid: su.id }); ok(!r.ok, 'an inactive employee cannot be chosen', r);
  r = await raw(P.R, 'labStep', { lid: l, sid: s[0].id, op: 'assign', uid: U('طراح') }); ok(r.ok, 'reception refers it to someone else', r);
} catch (e) { console.log('ERR', e && e.stack); bad++ } finally { h.stop() }
console.log(bad ? 'FAILED ' + bad : 'ALL OK');
