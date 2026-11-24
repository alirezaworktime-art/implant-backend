// t-m42 (server): several roles with one password, «as», shared password off/on. Run: WORKER=<m42 bundle> node t-m42.mjs
import { start, uuid, PW, REC } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 300) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start();
const raw = async (pw, action, body = {}) => (await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: pw, ...body }) })).json();
try {
  const P1 = 'pers0na1x', P2 = 'pers0na2y', P3 = 'pers0na3z';
  let r = await h.call('manager', 'userSave', { u: { name: 'کارمند چندنقشی', roles: ['staff', 'consultant'], pw: P1 } }); ok(r.ok, 'manager creates an account with two roles', r);
  r = await h.call('manager', 'userSave', { u: { name: 'کارمند تک‌نقشی', role: 'surgery', pw: P2 } }); ok(r.ok, 'account saved the old way (one role, no roles field)', r);
  r = await h.call('manager', 'userSave', { u: { name: 'بی‌نقش', roles: [], pw: P3 } }); ok(r.ok === false && /نقش/.test(r.error), 'no role → refused', r);
  r = await h.call('manager', 'userSave', { u: { name: 'نقش ناشناس', roles: ['oclin', 'root'], pw: P3 } }); ok(r.ok === false, 'unknown roles → refused', r);
  let L = await h.call('manager', 'userList', {}); const U1 = L.items.find(u => u.name === 'کارمند چندنقشی'), U2 = L.items.find(u => u.name === 'کارمند تک‌نقشی');
  ok(U1 && J(U1.roles) === J(['staff', 'consultant']) && U1.role === 'staff', 'list shows both roles', U1); ok(U2 && J(U2.roles) === J(['surgery']), 'old-style account lists its one role', U2);
  // login
  r = await raw(P1, 'ping'); ok(r.ok && r.role === 'staff' && J(r.roles) === J(['staff', 'consultant']) && r.user === 'کارمند چندنقشی' && r.uid, 'ping: first role + the list of roles', { role: r.role, roles: r.roles });
  r = await raw(P1, 'ping', { as: 'consultant' }); ok(r.ok && r.role === 'consultant', '«as consultant» → consultant cartable', r.role);
  r = await raw(P1, 'ping', { as: 'manager' }); ok(r.ok && r.role === 'staff', '«as manager» for someone without that role → ignored', r.role);
  r = await raw(P1, 'userList', { as: 'manager' }); ok(r.ok === false, 'cannot reach the manager list through «as»', r);
  r = await raw(PW.staff, 'ping', { as: 'manager' }); ok(r.ok && r.role === 'staff' && !r.roles, 'shared password ignores «as»', r.role);
  r = await raw(P1, 'undecided', { as: 'staff', id: 'x' }); ok(r.ok === false, 'staff cartable cannot do a consultant-only action', r && r.error);
  r = await raw(P2, 'ping'); ok(r.ok && r.role === 'surgery' && J(r.roles) === J(['surgery']), 'one-role account as before', r.role);
  // work is recorded under the person's own name, in the chosen role
  { const nid = uuid(), q = JSON.parse(JSON.stringify(REC.queueAdd[0].req).split(REC.queueAdd[0].req.id).join(nid)); delete q.action; q.patient.nid = '1234567891'; q.patient.phone = '09120000000';
    const qa = await raw(P1, 'queueAdd', { as: 'staff', ...q }); ok(qa.ok, 'the person registers a patient in the staff cartable', qa);
    const au = h.sql(`select user, role, action from audit order by n desc limit 1`)[0]; ok(au && au.user === 'کارمند چندنقشی' && au.role === 'staff' && au.action === 'queueAdd', 'change log carries the person and the chosen role', au); }
  // edit roles
  r = await h.call('manager', 'userSave', { u: { id: U1.id, name: U1.name, roles: ['consultant', 'accountant', 'manager'] } }); ok(r.ok, 'manager changes the roles', r);
  r = await raw(P1, 'ping', { as: 'staff' }); ok(r.ok && r.role === 'consultant' && !r.roles.includes('staff'), 'removed role no longer reachable (cache cleared)', { role: r.role, roles: r.roles });
  r = await raw(P1, 'userList', { as: 'manager' }); ok(r.ok && Array.isArray(r.items), 'a person given the manager role reaches the manager list', r && r.error);
  r = await h.call('manager', 'userSave', { u: { id: U1.id, name: U1.name, role: 'consultant', active: false } }); r = await raw(P1, 'ping'); ok(r.ok === false, 'switched-off account cannot log in', r);
  await h.call('manager', 'userSave', { u: { id: U1.id, name: U1.name, role: 'consultant', active: true } }); r = await raw(P1, 'ping'); ok(r.ok && r.roles.length === 3, 'switching on keeps the roles', r.roles);
  // lab among the roles keeps the lab profile
  r = await h.call('manager', 'userSave', { u: { name: 'لابراتوار و انبار', roles: ['inventory', 'lab'], pw: P3, lab: { depts: [], sup: 1, recep: 0, designer: 0 } } }); ok(r.ok, 'account with lab + inventory', r);
  r = await raw(P3, 'ping', { as: 'lab' }); ok(r.ok && r.role === 'lab', 'lab cartable for that person', r.role); r = await raw(P3, 'ping', { as: 'inventory' }); ok(r.ok && r.role === 'inventory', 'inventory cartable for that person', r.role);
  // shared passwords
  let S = await h.call('manager', 'pwSharedGet', {}); ok(S.ok && S.roles.length === 6 && !S.roles.includes('manager') && S.off.staff === 0 && S.count.surgery === 1, 'state of shared passwords + counts', S);
  r = await h.call('staff', 'pwSharedGet', {}); ok(r.ok === false, 'only the manager sees it', r); r = await h.call('consultant', 'pwShared', { role: 'staff', off: 1, ack: 1 }); ok(r.ok === false, 'only the manager switches', r);
  r = await h.call('manager', 'pwShared', { role: 'manager', off: 1, ack: 1 }); ok(r.ok === false && /مدیر/.test(r.error), 'manager shared password can never be switched off', r);
  r = await h.call('manager', 'pwShared', { role: 'doctor', off: 1 }); ok(r.ok === false && /حساب شخصی/.test(r.error), 'no personal account for that role → warning first', r);
  ok((await h.call('doctor', 'ping')).ok, 'doctor shared password still works after the refused switch');
  r = await h.call('manager', 'pwShared', { role: 'doctor', off: 1, ack: 1 }); ok(r.ok && r.off.doctor === 1, 'with confirmation it is switched off', r);
  r = await h.call('doctor', 'ping'); ok(r.ok === false && r.error === 'auth', 'shared doctor password no longer logs in', r);
  ok((await h.call('staff', 'ping')).ok && (await h.call('manager', 'ping')).ok, 'other shared passwords unaffected');
  r = await h.call('manager', 'pwShared', { role: 'surgery', off: 1 }); ok(r.ok && r.off.surgery === 1, 'role with a personal account: switched off without the warning', r);
  r = await h.call('surgery', 'ping'); ok(r.ok === false, 'shared surgery password off'); r = await raw(P2, 'ping'); ok(r.ok && r.role === 'surgery', 'personal surgery account still works', r.role);
  r = await h.call('manager', 'pwShared', { role: 'doctor', off: 0 }); ok(r.ok && r.off.doctor === 0, 'switched on again', r); ok((await h.call('doctor', 'ping')).ok, 'shared doctor password works again');
  r = await h.call('manager', 'pwShared', { role: 'surgery', off: 0 }); ok((await h.call('surgery', 'ping')).ok, 'shared surgery password works again');
  r = await h.call('manager', 'pwShared', { role: 'oclin', off: 1, ack: 1 }); ok(r.ok === false, '«سایر کلینیک‌ها» is out of scope', r);
  const al = h.sql(`select action, info from audit where action='pwShared' order by n desc limit 1`)[0]; ok(al && /خاموش|روشن/.test(al.info || ''), 'switching is in the change log', al);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 500)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
