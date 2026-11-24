// m22 server tests: lab ↔ prosthesis, re-delivery, hand-over, Root group, paper file balance
import { start, uuid, REC } from '../audit/A.mjs';
const h = await start(); const J = (x, n = 240) => JSON.stringify(x).slice(0, n); let bad = 0;
const ok = (c, t, x) => { if (!c) { bad++; console.log('FAIL', t, x === undefined ? '' : J(x)) } };
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const toDis = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id, file: String(2000 + Math.floor(Math.random() * 7000)), by: 'منشی' });
  await h.call('staff', 'discharge', { id, by: 'منشی' }); return id };
const P = id => JSON.parse(h.sql(`select pros from plans where id='${id}'`)[0].pros || '{}');
const labs = id => h.sql(`select id, st, no from labs where plan='${id}' order by created`);
const open = (id, k) => h.tasks(id).filter(t => !t.done && t.kind === k).length;
const ord = (f = 'tryin') => { const o = JSON.parse(JSON.stringify(REC.prosSess[0].req.order)); o.for = f; return o };
const map = id => h.must('surgery', 'prosMap', { id, map: { LR6: 'a', UR6: 'a' }, note: '', by: 'پزشک' });
const sess = async (id, name, work, extra = {}) => { const kind = work === 'impr' ? 'impr' : work.startsWith('deliv') ? 'deliv' : 'tryin'; await h.appt(id, name, kind, h.today(), '', '1' + Math.floor(Math.random() * 8) + ':' + (10 + Math.floor(Math.random() * 49))); const aid = h.appts(id).slice(-1)[0].id; await h.call('staff', 'apptRef', { aid, op: 'set', id, by: 'منشی' }); return h.call('surgery', 'prosSess', Object.assign({ id, aid, work, result: '', note: '', by: 'د. تست', sendId: uuid(), ty: work }, extra)) };
const impr = (id, name, lid) => sess(id, name, 'impr', { imp: { meth: 'open', shade: 'A2', abut: '', ret: 'پیچی' }, lid, due: h.today(), order: ord() });
const labGo = async lid => { await h.call('lab', 'labStart', { lid, wt: '990001', proc: '', from: '', designer: '', box: '', note: '', prio: '' }); for (const s of h.sql(`select id from lab_step where lab='${lid}' order by idx`)) await h.call('lab', 'labStep', { lid, sid: s.id, op: 'quick', text: '' }); return h.call('lab', 'labSet', { lid, st: 'ready', note: '', by: 'لابراتوار' }) };
try {
  // ---- lab ↔ prosthesis
  const B = await toDis('B دو سفارش'); await map(B); await impr(B, 'B', uuid());
  let r = await h.call('surgery', 'labNew', { id: B, lid: uuid(), order: ord(), due: h.today() }); ok(r.ok === false && r.dup2 === 1 && /^DUP2\|/.test(r.error), 'second open order for the same step asks first', r); ok(labs(B).length === 1, 'no second order yet');
  r = await h.call('surgery', 'labNew', { id: B, lid: uuid(), order: ord(), due: h.today(), dup2: 1 }); ok(r.ok === true && labs(B).length === 2, 'confirmed second order is stored', r);
  r = await h.call('surgery', 'labNew', { id: B, lid: uuid(), order: ord('deliv'), due: h.today() }); ok(r.ok === true, 'an order for another step is not blocked', r);
  const C = await toDis('C توقف'); await map(C); const lc = uuid(); await impr(C, 'C', lc); await h.must('surgery', 'prosAct', { id: C, op: 'pause', until: '', note: 'سفر', by: 'د' }); r = await labGo(lc); ok(r.ok && open(C, 'labready') === 0, 'ready while paused: no booking task yet', r);
  r = await h.call('surgery', 'prosAct', { id: C, op: 'resume', by: 'د' }); ok(r.ok && P(C).stage === 'tryin' && open(C, 'labready') === 1, 'resume with a ready order → «کار لابراتوار آماده» task', [P(C).stage, open(C, 'labready')]);
  const D = await toDis('D لغو'); await map(D); const ld = uuid(); await impr(D, 'D', ld); r = await h.call('surgery', 'labSet', { lid: ld, st: 'cancel', note: 'اشتباه', by: 'د' }); ok(r.ok && P(D).stage === 'lab' && /سفارش تازه لازم است/.test(P(D).log.slice(-1)[0].note), 'cancel of the only order is written in the file', P(D).log.slice(-1)[0]);
  { const q = await h.call('surgery', 'queue', { ver: '', qh: '' }); const hit = Object.keys(q).filter(k => Array.isArray(q[k]) && q[k].some(x => x && (x.id === D || x.plan === D))); console.log('  D (stage lab, no open order) is listed for the doctor in:', hit.join(',') || 'NOTHING'); ok(hit.length > 0, 'cancelled-order patient is visible to the doctor', hit) }
  const A = await toDis('A برگشت'); await map(A); const la = uuid(); await impr(A, 'A', la); await labGo(la); ok(P(A).stage === 'tryin' && open(A, 'labready') === 1, 'setup: ready → tryin + task');
  r = await h.call('surgery', 'labSet', { lid: la, st: 'new', note: '', by: 'د' }); ok(r.ok && P(A).stage === 'lab' && P(A).after === 'tryin' && open(A, 'labready') === 0 && labs(A)[0].st === 'new', 'ready → «جدید»: stage back to lab, booking task closed', [P(A).stage, P(A).after, open(A, 'labready')]);
  r = await labGo(la); ok(r.ok && P(A).stage === 'tryin' && open(A, 'labready') === 1, 'the lab finishes again → tryin + task', [r, P(A).stage]);
  // ---- re-delivery
  r = await sess(A, 'A', 'deliv2', { pt: { LR6: 'a', UR6: 'a' }, amt: '500000' }); ok(r.ok === false && /بعد از اولین تحویل/.test(r.error), 're-delivery before the first delivery is refused', r);
  r = await sess(A, 'A', 'rscr', { result: 'ok', lid: uuid(), due: h.today(), order: ord('deliv') }); const l2 = labs(A).slice(-1)[0]; await labGo(l2.id);
  r = await sess(A, 'A', 'deliv', { pt: { LR6: 'a', UR6: 'a' }, redo: false, cem: '', amt: '', payAck: 'تست تحویل' }); if (r.ok === false) console.log('  deliv →', J(r, 300));
  if (P(A).stage !== 'done') { r = await h.call('surgery', 'prosSet', { id: A, stage: 'done', by: 'د', payAck: 'تست', f6: 1 }); console.log('  prosSet done →', J(r, 200), P(A).stage) }
  ok(P(A).stage === 'done', 'setup: delivered', P(A).stage);
  const nS = (P(A).sess || []).length;
  r = await sess(A, 'A', 'deliv2', { pt: { LR6: 'a', UR6: 'p' }, amt: '1500000', note: 'شکستگی' }); ok(r.ok === true && r.re2 === 1, 're-delivery is stored', r);
  { const s = P(A).sess.slice(-1)[0]; ok(P(A).sess.length === nS + 1 && s.ty === 'deliv2' && s.amt === 1500000 && s.re2 === 1 && s.pt.UR6 === 'p' && P(A).stage === 'done', 're-delivery session: kind, amount, teeth; stage stays «تحویل شد»', s); ok(/تحویل مجدد روکش نهایی/.test(P(A).log.slice(-1)[0].note), 'log line', P(A).log.slice(-1)[0]) }
  r = await sess(A, 'A', 'deliv2', { amt: '' }); ok(r.ok && r.re2 === 2 && P(A).sess.slice(-1)[0].amt === 0, 'a second re-delivery without amount (teeth from the map)', r);
  // ---- hand-over
  r = await h.call('surgery', 'prosAct', { id: B, op: 'doc', doc: 'دکتر جدید تست', note: '', by: 'د' }); ok(r.ok === false && /دلیل/.test(r.error), 'hand-over needs a reason', r);
  r = await h.call('surgery', 'prosAct', { id: B, op: 'doc', doc: 'دکتر جدید تست', note: 'مرخصی پزشک', by: 'د. قبلی' }); ok(r.ok && P(B).pdoc.name === 'دکتر جدید تست' && P(B).pdocs.length === 1 && /واگذاری ادامه‌ی پروتز/.test(P(B).log.slice(-1)[0].note), 'hand-over stored with history', r);
  r = await h.call('surgery', 'prosAct', { id: B, op: 'doc', doc: 'دکتر جدید تست', note: 'دوباره', by: 'د' }); ok(r.ok === false, 'same doctor again is refused', r);
  { const it = (await h.call('surgery', 'prosList', {})).items.find(x => x.id === B); ok(it && it.pdoc === 'دکتر جدید تست' && it.doc === 'دکتر جدید تست' && it.doc0, 'prosthesis list shows the new doctor', it && [it.doc, it.doc0, it.pdoc]) }
  ok((await h.call('surgery', 'prosAct', { id: C, op: 'pause', until: '', note: 'x', by: 'د' })).ok === true, 'other prosAct ops still work');
  // ---- Root group
  { const s0 = (await h.call('manager', 'settings', {})); const S = s0.settings || s0; const prices = JSON.parse(JSON.stringify(S.prices || {})); prices.imp = prices.imp || { price: '', bp: {} }; prices.imp.bp = Object.assign({}, prices.imp.bp, { rt: '21000000' });
    r = await h.call('manager', 'settings', { settings: { prices } }); const s1 = await h.call('manager', 'settings', {}); const b = ((s1.settings || s1).prices || {}).imp; ok(b && String(b.bp.rt) === '21000000' && String(b.bp.ko) === String(((S.prices || {}).imp || { bp: {} }).bp.ko || ''), 'settings keep the Root tariff', [r && r.ok, b && b.bp]) }

  // ---- paper file: earlier payments never make a credit; new line kinds
  { const yd = new Date(Date.now() - 3 * 864e5 + 3.5 * 36e5).toISOString().slice(0, 10), old = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
    const mk = (name, extra, lines, pays) => h.call('staff', 'fxArc', { id: '', by: 'منشی', ackDup: 1, ackFile: 1, arc: Object.assign({ v6: 1, name, phone: '0913' + String(1000000 + Math.floor(Math.random() * 8999999)), nid: '', age: '40', city: 'یزد', doc: 'دکتر سید مجتبی علویکیا', pfile: '', lines, pays, disc: {}, settled: false, rem: '' }, extra) });
    const L1 = () => [{ id: 'l' + uuid().slice(0, 10), k: 'imp', day: old, doc: 'دکتر سید مجتبی علویکیا', teeth: ['UR6'], n: 1, price: 10000000, imp: { UR6: { b: 'Root', d: '4', l: '10' } } }];
    const pay = a => [{ id: 'p' + uuid().slice(0, 12), amount: a, day: yd, meth: 'cash', note: '' }];
    const bal = id => { const o = h.sql(`select total, data from plans where id='${id}'`)[0], a = JSON.parse(o.data).arc, paid = h.sql(`select coalesce(sum(amount),0) s from pays where plan='${id}' and st='ok'`)[0].s; return { total: o.total, paid, credit: Math.max(0, paid - o.total), rest: o.total - paid, vt: a.vt, imp: a.imp, over: a.over, net: a.net } };
    let r = await mk('کاغذی تسویه بیشتر', { settled: true }, L1(), pay(15000000)); ok(r.ok, 'paper file saved', r); if (r.ok) { const b = bal(r.id); ok(b.credit === 0 && b.rest === 0 && b.total === 15000000 && b.over === 5000000, 'settled file, paid more than today tariff → no credit', b) }
    r = await mk('کاغذی بدون علامت بیشتر', {}, L1(), pay(13000000)); if (r.ok) { const b = bal(r.id); ok(b.credit === 0 && b.rest === 0 && b.over === 3000000, 'no mark, paid more → no credit', b) } else ok(false, 'save 2', r);
    r = await mk('کاغذی مانده دارد', { rem: '2000000' }, L1(), pay(12000000)); if (r.ok) { const b = bal(r.id); ok(b.credit === 0 && b.rest === 2000000 && b.total === 14000000, 'remaining debt of the file is kept (2,000,000)', b) } else ok(false, 'save 3', r);
    r = await mk('کاغذی کمتر پرداخته', {}, L1(), pay(4000000)); if (r.ok) { const b = bal(r.id); ok(b.rest === 6000000 && b.total === 10000000 && !b.over, 'paid less, no mark → debt as before', b) } else ok(false, 'save 4', r);
    r = await mk('کاغذی تسویه کمتر', { settled: true }, L1(), pay(4000000)); if (r.ok) { const b = bal(r.id); ok(b.rest === 0 && b.total === 4000000 && !b.over, 'settled, paid less → as before', b) } else ok(false, 'save 5', r);
    r = await mk('کاغذی هیلینگ مجدد', { settled: true }, L1().concat([{ id: 'l' + uuid().slice(0, 10), k: 'heal2', day: old, doc: 'پزشک کلینیک', teeth: [], n: 2, price: 300000 }, { id: 'l' + uuid().slice(0, 10), k: 'heal2', day: old, doc: 'پزشک کلینیک', teeth: [], n: 1, price: 0 },
      { id: 'l' + uuid().slice(0, 10), k: 'pros', day: old, doc: 'دکتر سید مجتبی علویکیا', ty: 'deliv2', teeth: ['UR6'], pt: { UR6: 'a' }, n: 1, price: 700000 }]), pay(11300000));
    ok(r.ok, 'paper file with «بستن هیلینگ مجدد» and «تحویل مجدد روکش نهایی»', r); if (r.ok) { const a = JSON.parse(h.sql(`select data from plans where id='${r.id}'`)[0].data).arc; const k = a.lines.map(l => l.k + (l.ty ? ':' + l.ty : '') + '=' + l.amt).join(','); ok(/heal2=600000/.test(k) && /heal2=0/.test(k) && /pros:deliv2=700000/.test(k) && a.net === 11300000, 'new lines keep their optional amounts', k) }
  }
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 500)) }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
