// m26 server tests: department «تست لازم» + description, account extra fields (lab_acct.ext), bulk delete of empty boxes
import { start, uuid, REC } from '../audit/A.mjs';
const h = await start(); const J = (x, n = 260) => JSON.stringify(x).slice(0, n); let bad = 0;
const ok = (c, t, x) => { if (!c) { bad++; console.log('FAIL', t, x === undefined ? '' : J(x)) } };
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const toDis = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id, file: String(2000 + Math.floor(Math.random() * 7000)), by: 'منشی' });
  await h.call('staff', 'discharge', { id, by: 'منشی' }); return id };
const lab = lid => { const l = h.sql(`select * from labs where id='${lid}'`)[0]; return l ? Object.assign(l, { data: JSON.parse(l.data || '{}'), log: JSON.parse(l.log || '[]') }) : null };
const inv = lid => h.sql(`select id, kind, total, st, acct, note, fac from lab_inv where lab='${lid}' and kind='manual'`);
const ord = () => { const o = JSON.parse(JSON.stringify(REC.prosSess[0].req.order)); o.for = 'tryin'; return o };
const mk = async name => { const id = await toDis(name); await h.must('surgery', 'prosMap', { id, map: { LR6: 'a', UR6: 'a' }, note: '', by: 'پزشک' }); const lid = uuid();
  await h.appt(id, name, 'impr', h.today(), '', '1' + Math.floor(Math.random() * 8) + ':' + (10 + Math.floor(Math.random() * 49))); const aid = h.appts(id).slice(-1)[0].id; await h.call('staff', 'apptRef', { aid, op: 'set', id, by: 'منشی' });
  const r = await h.call('surgery', 'prosSess', { id, aid, work: 'impr', result: '', note: '', by: 'د. تست', sendId: uuid(), ty: 'impr', sameDay: 1, imp: { meth: 'open', shade: 'A2', abut: '', ret: 'پیچی' }, lid, due: h.today(), order: ord() }); if (!r.ok) throw new Error('impr ' + J(r)); return lid };
const labGo = async lid => { await h.call('lab', 'labStart', { lid, wt: '990001', proc: '', from: '', designer: '', box: '', note: '', prio: '' }); for (const s of h.sql(`select id from lab_step where lab='${lid}' order by idx`)) await h.call('lab', 'labStep', { lid, sid: s.id, op: 'quick', text: '' }); return h.call('lab', 'labSet', { lid, st: 'ready', note: '', by: 'لابراتوار' }) };
const L5 = (op, b = {}, role = 'lab') => h.call(role, 'lab5', Object.assign({ op }, b));
const day = n => new Date(Date.parse(h.today() + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
try {
  const a = await mk('الف تست'); await h.call('lab', 'labStart', { lid: a, wt: '990001', proc: '', from: '', designer: '', box: '', note: '', prio: '' });
  const S = () => h.sql(`select id, dept, dname, st from lab_step where lab='${a}' order by idx`); ok(S().length >= 2, 'setup: order has steps', S());
  const D0 = (await h.must('lab', 'labDefs', { op: 'get' })).depts, s0 = S()[0], d0 = D0.find(d => d.id === Number(s0.dept));
  // ---- department flags
  let r = await h.call('lab', 'labDefs', { op: 'dept', x: { id: d0.id, name: d0.name, active: true, sort: d0.sort || 0, flags: Object.assign({}, d0.flags, { test: true, desc: '  کنترل نهایی فریم  ' }) } }); ok(r.ok, 'dept saved', r);
  let d1 = (await h.must('lab', 'labDefs', { op: 'get' })).depts.find(d => d.id === d0.id); ok(d1.flags.test === 1 && d1.flags.desc === 'کنترل نهایی فریم' && Object.keys(d0.flags || {}).every(k => d1.flags[k] === d0.flags[k]), 'flags test + desc stored, others kept', d1.flags);
  r = await h.call('lab', 'labStep', { lid: a, sid: s0.id, op: 'quick', text: '' }); ok(r.ok === false && /ارسال جهت تست/.test(r.error) && S()[0].st === s0.st, 'quick-complete refused before a test send', r);
  r = await h.call('lab', 'labStep', { lid: a, sid: s0.id, op: 'accept' }); const accOk = r.ok; ok(r.ok, 'accepting is still allowed', r);
  r = await h.call('lab', 'labStep', { lid: a, sid: s0.id, op: 'done', text: '' }); ok(r.ok === false && /ارسال جهت تست/.test(r.error), 'done refused before a test send', r);
  r = await L5('test', { lid: a, items: ['تست فریم'], note: '' }); ok(r.ok, 'test send recorded', r);
  r = await h.call('lab', 'labStep', { lid: a, sid: s0.id, op: accOk ? 'done' : 'quick', text: '' }); ok(r.ok === true && S()[0].st === 'done', 'after the test send the step completes', [r, S()[0]]);
  r = await h.call('lab', 'labStep', { lid: a, sid: S()[1].id, op: 'quick', text: '' }); ok(r.ok === true, 'a department without the flag is not affected', r);
  r = await h.call('lab', 'labDefs', { op: 'dept', x: { id: d0.id, name: d0.name, active: true, sort: d0.sort || 0, flags: Object.assign({}, d0.flags, { test: false, desc: '' }) } }); d1 = (await h.must('lab', 'labDefs', { op: 'get' })).depts.find(d => d.id === d0.id); ok(r.ok && !d1.flags.test && !d1.flags.desc, 'flag and description can be cleared', d1.flags);
  // a test send from an earlier turn does not count: flag on again, send the step back (redo) if the bundle supports it
  // ---- account extra fields
  r = await L5('acctSave', { x: { name: 'دکتر نمونه', kind: 'doctor', clinic: '', phone: '۰۹۱۳۱۱۱۲۲۳۳', code: '', plist: '', active: '1', note: '', e_tel: '۰۳۵-۳۶۲۰۰۰۰۰', e_m2: '09130000002', e_m3: '', e_m4: '', e_t2: 'abc', e_t3: '', e_t4: '', e_email: 'Dr@Example.com', e_region: 'صفائیه', e_prov: 'یزد', e_city: 'یزد', e_addr: 'بلوار دانشجو' } }); ok(r.ok && r.id, 'account saved with extras', r);
  const aid = r.id, ext = () => JSON.parse(h.sql(`select ext from lab_acct where id='${aid}'`)[0].ext || 'null');
  ok(ext() && ext().tel === '035-36200000' && ext().m2 === '09130000002' && !('t2' in ext()) && !('m3' in ext()) && ext().email === 'Dr@Example.com' && ext().region === 'صفائیه' && ext().city === 'یزد' && ext().addr === 'بلوار دانشجو', 'ext: digits normalised, letters dropped from numbers, empties omitted', ext());
  r = await L5('boot'); { const A2 = (r.accts || []).find(x => x.id === aid); ok(A2 && A2.ext && JSON.parse(A2.ext).email === 'Dr@Example.com' && A2.phone === '09131112233', 'boot returns ext', A2) }
  r = await L5('acctSave', { x: { id: aid, name: 'دکتر نمونه', kind: 'doctor', phone: '09131112233', active: '1', e_email: 'bad mail' } }); ok(r.ok === false && /ایمیل/.test(r.error) && ext().email === 'Dr@Example.com', 'bad e-mail refused, nothing changed', r);
  r = await L5('acctSave', { x: { id: aid, name: 'دکتر نمونه ۲', kind: 'doctor', phone: '09131112233', active: '1' } }); ok(r.ok && ext() && ext().email === 'Dr@Example.com' && h.sql(`select name from lab_acct where id='${aid}'`)[0].name === 'دکتر نمونه ۲', 'a save without extra keys (old page) keeps ext', ext());
  r = await L5('acctSave', { x: { id: aid, name: 'دکتر نمونه ۲', kind: 'doctor', phone: '09131112233', active: '1', e_tel: '', e_email: '' } }); ok(r.ok && ext() === null, 'clearing all extras empties ext', ext());
  r = await L5('acctSave', { x: { name: 'نباید', e_email: 'a@b.co' } }, 'staff'); ok(r.ok === false, 'clinic reception cannot save accounts', r);
  // ---- boxes
  r = await L5('boxAdd', { from: '701', to: '706' }); ok(r.ok, 'boxes added', r);
  h.sql(`update labs set data=json_set(data,'$.box','703') where id='${a}'`);
  const act = () => h.sql(`select no from lab_box where active=1 and cast(no as integer) between 701 and 706 order by cast(no as integer)`).map(x => x.no).join(',');
  r = await L5('boxDelMany', { nos: [] }); ok(r.ok === false, 'nothing selected → refused', r);
  r = await L5('boxDelMany', { nos: ['701'] }, 'staff'); ok(r.ok === false && act() === '701,702,703,704,705,706', 'clinic reception cannot delete boxes', r);
  r = await L5('boxDelMany', { nos: ['۷۰۱', '702', '703', '999', '702'] }); ok(r.ok && r.n === 2 && r.busy.join() === '703' && act() === '703,704,705,706', 'empty ones removed, the box in use stays, unknown ignored', [r, act()]);
  r = await L5('boxes'); ok(r.ok && !r.boxes.some(b => b.active && ['701', '702'].includes(String(b.no))) && r.boxes.some(b => String(b.no) === '703' && b.works.length === 1), 'box list reflects it', (r.boxes || []).filter(b => b.active).map(b => b.no));
  r = await L5('boxDelMany', { nos: ['701'] }); ok(r.ok && r.n === 0, 'deleting an already deleted box is a no-op', r);
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 600)) }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
