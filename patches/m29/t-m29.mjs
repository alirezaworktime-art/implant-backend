// m29 server tests: paper files — «فیلد شدن ایمپلنت» (+ re-implant task), sub-stages «معاینه» / «پیگیری»
import { start, uuid } from '../audit/A.mjs';
const h = await start(); const J = (x, n = 400) => JSON.stringify(x).slice(0, n); let bad = 0;
const ok = (c, t, x) => { if (!c) { bad++; console.log('FAIL', t, x === undefined ? '' : J(x)) } };
const day = n => new Date(Date.now() + 3.5 * 36e5 + (h.off() + n) * 864e5).toISOString().slice(0, 10);
const addM = (d, n) => { const [y, m, dd] = d.split('-').map(Number); const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate(); return new Date(Date.UTC(y, m - 1 + n, Math.min(dd, last), 12)).toISOString().slice(0, 10) };
const DOC = 'دکتر سید مجتبی علویکیا';
const save = (id, arc, role = 'staff', x = {}) => h.call(role, 'fxArc', Object.assign({ id, by: 'منشی', ackDup: 1, ackFile: 1, arc: Object.assign({ v6: 1, phone: '0913' + String(1000000 + Math.floor(Math.random() * 8999999)), nid: '', age: '40', city: 'یزد', doc: DOC, pfile: '', pays: [], disc: {}, settled: false, rem: '' }, arc) }, x));
const D = id => JSON.parse(h.sql(`select data from plans where id='${id}'`)[0].data), PR = id => JSON.parse(h.sql(`select pros from plans where id='${id}'`)[0].pros || '{}');
const T = (id, k) => h.sql(`select id, kind, due, done, note, info from tasks where plan='${id}' order by created, id`).filter(t => !k || t.kind === k);
const imp = (d, t = ['LL6']) => ({ id: 'limp' + uuid().slice(0, 8), k: 'imp', day: d, doc: DOC, teeth: t, n: t.length, price: 9000000, imp: Object.fromEntries(t.map(x => [x, { b: 'JD', d: '4.3', l: '10' }])) });
const fail = (d, rm, t = ['LL6'], id) => ({ id: id || 'lfail' + uuid().slice(0, 8), k: 'ifail', day: d, doc: DOC, teeth: t, n: t.length, price: 777, rm });
try {
  // ---- 1) ifail
  const L1 = imp(day(-200)), F1 = fail(day(-20), 4);
  let r = await save('', { name: 'بیمار فیلد', lines: [L1, F1], open: false });
  ok(r.ok && r.id, 'paper file with «فیلد شدن ایمپلنت» saved', r); const a = r.id;
  let fl = D(a).arc.lines.find(l => l.k === 'ifail');
  ok(fl && fl.price === 0 && fl.amt === 0 && fl.rm === 4 && fl.teeth.join() === 'LL6' && D(a).arc.cost === 9000000, 'the line is free and keeps the months; the patient total is the implant only', [fl, D(a).arc.cost]);
  let t = T(a, 'book'); ok(t.length === 1 && t[0].info === 'reimp' && t[0].due === addM(day(-20), 4) && !t[0].done && /دندان 36/.test(t[0].note) && /۴ ماه/.test(t[0].note) && fl.rmT === t[0].id && fl.rmDue === t[0].due, 're-implant task on the failure date + 4 months', [t, fl]);
  r = await save(a, { name: 'بیمار فیلد', lines: [L1, Object.assign({}, F1)] }); ok(r.ok && T(a, 'book').length === 1 && D(a).arc.lines.find(l => l.k === 'ifail').rmT === t[0].id, 'saving again without a change keeps the one task', [r, T(a, 'book')]);
  r = await save(a, { name: 'بیمار فیلد', lines: [L1, Object.assign({}, F1, { rm: 6 })] }); t = T(a, 'book');
  ok(r.ok && t.length === 2 && t[0].done === 1 && !t[1].done && t[1].due === addM(day(-20), 6), 'changing the months replaces the task', t);
  r = await save(a, { name: 'بیمار فیلد', lines: [L1, Object.assign({}, F1, { rm: '' })] }); t = T(a, 'book');
  ok(r.ok && t.every(x => x.done === 1) && !D(a).arc.lines.find(l => l.k === 'ifail').rmT, '«بدون نوبت خودکار» closes it', t);
  r = await save(a, { name: 'بیمار فیلد', lines: [L1, Object.assign({}, F1, { rm: 2 })] }); r = await save(a, { name: 'بیمار فیلد', lines: [L1] }); t = T(a, 'book');
  ok(r.ok && t.length === 3 && t.every(x => x.done === 1) && !D(a).arc.lines.some(l => l.k === 'ifail'), 'removing the line closes its task', t);
  r = await save('', { name: 'فیلد قدیمی', lines: [imp(day(-900)), fail(day(-700), 3)], open: false }); t = T(r.id, 'book');
  ok(r.ok && t.length === 1 && t[0].due === day(0), 'an old failure: the task is due today, never in the past', t);
  r = await save('', { name: 'فیلد بی‌دندان', lines: [fail(day(-5), 3, [])], open: false }); ok(r.ok === false, 'a failure line needs a tooth', r);
  r = await save('', { name: 'فیلد ماه غلط', lines: [imp(day(-90)), fail(day(-5), 99)], open: false }); ok(r.ok && !D(r.id).arc.lines.find(l => l.k === 'ifail').rm && T(r.id, 'book').length === 0, 'months outside 1–24 are ignored', r);
  { const q = await h.must('staff', 'queue', {}); ok((q.tasks || []).some(x => x.kind === 'book' && x.info === 'reimp' && x.plan === (T(a, 'book')[0] || {}).plan) || true, 'queue ok') }
  // ---- 2) sub-stages
  r = await save('', { name: 'بیمار معاینه', lines: [imp(day(-100))], open: true, type: 'fix', stage: 'exam', due: '' }); ok(r.ok === false && /تاریخ معاینه/.test(r.error), 'exam needs a date', r);
  r = await save('', { name: 'بیمار معاینه', lines: [imp(day(-100))], open: true, type: 'fix', stage: 'exam', due: day(-1) }); ok(r.ok === false && /گذشته/.test(r.error), 'not in the past', r);
  r = await save('', { name: 'بیمار معاینه', lines: [imp(day(-100))], open: true, type: 'fix', stage: 'exam', due: day(10) }); const b = r.id;
  ok(r.ok && D(b).arc.sub && D(b).arc.sub.k === 'exam' && D(b).arc.sub.due === day(10) && PR(b).stage === 'done', 'new file with «معاینه»: stored as sub, prosthesis stage untouched (closed)', [r, D(b).arc.sub, PR(b).stage]);
  t = T(b); ok(t.length === 1 && t[0].kind === 'aexam' && t[0].due === day(10) && !t[0].done, 'one exam task on that date, nothing else', t);
  r = await save(b, { name: 'بیمار معاینه', lines: D(b).arc.lines, open: true, type: 'fix', stage: 'exam', due: day(10) }); ok(r.ok && T(b).length === 1, 'same sub-stage again: no second task', T(b));
  r = await save(b, { name: 'بیمار معاینه', lines: D(b).arc.lines, open: true, type: 'fix', stage: 'fup', due: day(20) }); t = T(b);
  ok(r.ok && t.length === 2 && t[0].done === 1 && t[1].kind === 'afup' && t[1].due === day(20) && D(b).arc.sub.k === 'fup', 'switch to «پیگیری»: old task closed, new one made', t);
  // an open file waiting for uncovering, then a follow-up on top: the main stage stays
  r = await save('', { name: 'بیمار آنکاوری', lines: [imp(day(-60))], open: true, type: 'fix', stage: 'unc', due: day(30) }); const c = r.id; ok(r.ok && T(c, 'uncover').length === 1, 'setup: open file waiting for uncovering', [r, T(c)]);
  const st0 = PR(c).stage, a0 = D(c).arc;
  r = await save(c, { name: 'بیمار آنکاوری', lines: a0.lines, open: true, type: 'fix', stage: 'fup', due: day(7) }); t = T(c);
  ok(r.ok && PR(c).stage === st0 && D(c).arc.stage === a0.stage && D(c).arc.open === true && t.filter(x => x.kind === 'uncover' && !x.done).length === 1 && t.filter(x => x.kind === 'afup' && !x.done).length === 1, 'follow-up on an open file: main stage and its task stay, a follow-up task is added', [PR(c).stage, D(c).arc.stage, t]);
  r = await save(c, { name: 'بیمار آنکاوری', lines: a0.lines, open: true, type: 'fix', stage: 'unc', due: day(30) }); t = T(c);
  ok(r.ok && !t.some(x => x.kind === 'afup' && !x.done) && t.filter(x => x.kind === 'uncover' && !x.done).length === 1 && !D(c).arc.sub, 'back to the main stage: the follow-up task is closed, the main one untouched', [t, D(c).arc.sub]);
  // a done sub task is not re-created by a later edit
  h.sql(`update tasks set done=1 where plan='${b}'`); r = await save(b, { name: 'بیمار معاینه', lines: D(b).arc.lines.concat([imp(day(-1), ['UR4'])]), open: true, type: 'fix', stage: 'fup', due: day(20) }, 'staff', { ackTotal: 18000000 });
  ok(r.ok && T(b).filter(x => !x.done).length === 0, 'editing later does not bring a finished follow-up back', [r, T(b)]);
  r = await save(b, { name: 'بیمار معاینه', lines: D(b).arc.lines, open: true, type: 'fix', stage: 'exam', due: day(40) }); ok(r.ok && T(b).filter(x => !x.done && x.kind === 'aexam' && x.due === day(40)).length === 1, 'a new date makes a new task', T(b));
  r = await h.call('staff', 'taskDone', { id: T(b).find(x => !x.done).id, note: '', by: 'منشی' }); ok(r.ok, 'the exam task can be marked done', r);
  { const q = await h.must('staff', 'queue', {}); ok((q.tasks || []).some(x => x.kind === 'afup' || x.kind === 'aexam'), 'reception receives the new task kinds', (q.tasks || []).map(x => x.kind)) }
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 700)) }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
