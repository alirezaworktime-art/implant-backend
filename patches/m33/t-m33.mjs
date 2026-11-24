// t-m33: manager «حذف کامل پرونده» (trash + restore + stock) and the clearer «بیمار مشابه» answer. Run: WORKER=<bundle> node t-m33.mjs
import { h, A, W, mk } from '../m24/probe.mjs'; import { uuid } from '../audit/A.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const DOC = 'د. اکبر پور', day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const arc = (name, extra) => Object.assign({ v6: 1, name, phone: '09131112233', nid: '4420099887', age: '40', city: 'یزد', doc: DOC, pfile: '', pays: [], disc: {}, settled: false, rem: '', open: false,
  lines: [{ id: 'l' + uuid().slice(0, 8), k: 'imp', day: day(-40), doc: DOC, teeth: ['LL6', 'LR6'], n: 2, price: 14500000, b: 'JD', imp: { LL6: { b: 'JD', d: '4.3', l: '10' }, LR6: { b: 'JD', d: '4.3', l: '10' } } },
    { id: 'l' + uuid().slice(0, 8), k: 'ext', day: day(-40), doc: DOC, teeth: ['UR8'], n: 1, price: 800000 }] }, extra || {});
const cnt = id => { const q = t => h.sql(`select count(*) n from ${t} where plan='${id}'`)[0].n; return { plans: h.sql(`select count(*) n from plans where id='${id}'`)[0].n, pays: q('pays'), tasks: q('tasks'), appts: q('appts'), events: q('events') } };
const stockOf = id => h.sql(`select coalesce(sum(delta),0) s from inv_moves where ref='${id}'`)[0].s;
const qtyJD = () => h.sql(`select coalesce(sum(qty),0) q from inv_items where b like '%JD%'`)[0].q;
// ---- (1) dup answer
let r = await h.call('staff', 'fxArc', { id: '', by: 'منشی', ackFile: 1, arc: arc('حسن کریمی', { pfile: '5501' }) }); ok(r.ok, 'first paper file saved', r);
const pid = r.id;
await h.call('staff', 'fxArc', { id: '', by: 'منشی', ackDup: 1, ackFile: 1, arc: arc('حسن کریمی', { phone: '09170000000', nid: '', pfile: '' }) }).then(x => ok(x.ok, 'a namesake saved with ackDup (as before)', x));
r = await h.call('staff', 'fxArc', { id: '', by: 'منشی', arc: arc('حسن کريمي', { phone: '', nid: '', lines: [] }) });
ok(r.ok === false && /^A6DUP\|/.test(r.error) && /پرونده 5501/.test(r.error) && /موبایل …2233/.test(r.error) && /یکسان: نام/.test(r.error) && / ؛ /.test(r.error), 'the duplicate answer lists each match with file no., mobile end and what matched (Arabic ي/ك still match)', r.error);
r = await h.call('staff', 'fxArc', { id: '', by: 'منشی', arc: arc('کسی دیگر', { phone: '0913 111 2233', nid: '', lines: [] }) });
ok(r.ok === false && /یکسان: موبایل/.test(r.error) && !/یکسان: نام/.test(r.error), 'a match by mobile says «موبایل»', r.error);
// ---- (2) delete
await h.must('staff', 'payAdd', { id: pid, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 3000000, by: 'م', note: '' }, sendId: uuid() });
await h.appt(pid, 'حسن کریمی', 'chk', day(5));
const before = cnt(pid), st0 = stockOf(pid), q0 = qtyJD();
ok(before.plans === 1 && before.pays >= 1 && before.appts >= 1 && st0 === -2, 'setup: file with payment, appointment and 2 implants out of stock', { before, st0 });
r = await h.call('accountant', 'm1Rep', { op: 'ptDel', id: pid, by: 'x' }); ok(r.ok === false && /مدیر/.test(r.error), 'only the manager can delete', r);
r = await h.call('staff', 'm1Rep', { op: 'ptDel', id: pid, by: 'x' }); ok(r.ok === false, 'reception cannot', r);
r = await h.call('manager', 'm1Rep', { op: 'ptInfo', id: pid }); ok(r.ok && r.name === 'حسن کریمی' && r.file === '5501' && r.info.stock === 2 && r.info.pays === 3000000 && r.info.txt.some(t => /پرداخت/.test(t)) && r.info.txt.some(t => /نوبت/.test(t)), 'ptInfo tells what will be removed', r);
r = await h.call('manager', 'm1Rep', { op: 'ptDel', id: pid, by: 'مدیر' }); ok(r.ok && r.trash, 'deleted', r);
const after = cnt(pid); ok(after.plans === 0 && after.pays === 0 && after.tasks === 0 && after.appts === 0 && after.events === 0, 'every row of the patient is gone', after);
ok(stockOf(pid) === 0 && qtyJD() === q0 + 2, 'the 2 implants went back to stock', { s: stockOf(pid), q: qtyJD(), q0 });
r = await h.call('manager', 'list', {}); ok(r.ok && !(r.items || []).some(x => x.id === pid), 'not in the archive any more');
r = await h.call('manager', 'get', { id: pid }); ok(!r.ok, 'opening it says not found', r);
r = await h.call('manager', 'm1Rep', { op: 'ptDel', id: pid, by: 'مدیر' }); ok(r.ok === false, 'deleting twice is refused', r);
r = await h.call('manager', 'm1Rep', { op: 'ptTrash' }); const T = (r.items || []).find(x => x.plan === pid);
ok(r.ok && T && T.name === 'حسن کریمی' && T.by === 'مدیر' && r.days === 30, 'listed in the trash', r);
r = await h.call('staff', 'fxArc', { id: '', by: 'منشی', arc: arc('حسن کریمی', { phone: '', nid: '', lines: [] }) });
ok(r.ok === false && !/پرونده 5501/.test(r.error || ''), 'the deleted file is no longer offered as a duplicate', r.error);
// ---- restore
r = await h.call('manager', 'm1Rep', { op: 'ptRest', tid: T.id, by: 'مدیر' }); ok(r.ok && r.id === pid && !(r.skipped || []).length, 'restored', r);
const back = cnt(pid); ok(back.plans === 1 && back.pays === before.pays && back.appts === before.appts && back.tasks === before.tasks && back.events >= before.events, 'every row is back', { back, before });
ok(stockOf(pid) === -2 && qtyJD() === q0, 'the 2 implants are taken from stock again', { s: stockOf(pid), q: qtyJD() });
r = await h.call('manager', 'get', { id: pid }); ok(r.ok && ((r.data || {}).h || {}).name === 'حسن کریمی', 'the file opens with its data', r.ok);
r = await h.call('manager', 'm1Rep', { op: 'ptTrash' }); ok(r.ok && !(r.items || []).some(x => x.id === T.id), 'gone from the trash');
r = await h.call('manager', 'm1Rep', { op: 'ptRest', tid: T.id, by: 'مدیر' }); ok(r.ok === false, 'restoring twice is refused', r);
// ---- 30 days
r = await h.call('manager', 'm1Rep', { op: 'ptDel', id: pid, by: 'مدیر' }); h.sql(`update m33_trash set at='${new Date(Date.now() - 31 * 864e5).toISOString()}' where id='${r.trash}'`);
r = await h.call('manager', 'm1Rep', { op: 'ptTrash' }); ok(r.ok && !(r.items || []).some(x => x.plan === pid), 'after 30 days it is purged');
// ---- a normal (non-paper) patient with lab work
const id2 = await h.add('بیمار لاب'); await h.plan(id2, 'بیمار لاب'); await h.confirm(id2, 'بیمار لاب', 'book');
const t0 = h.sql(`select count(*) n from tasks where plan='${id2}'`)[0].n;
r = await h.call('manager', 'm1Rep', { op: 'ptDel', id: id2, by: 'مدیر' }); ok(r.ok && h.sql(`select count(*) n from tasks where plan='${id2}'`)[0].n === 0 && t0 > 0, 'a confirmed patient with tasks can be deleted', r);
r = await h.call('manager', 'm1Rep', { op: 'ptRest', tid: r.trash, by: 'مدیر' }); ok(r.ok && h.sql(`select count(*) n from tasks where plan='${id2}'`)[0].n === t0, '... and restored', r);
// ---- a patient with a lab order (steps, events) and a file
const lid = await mk('بیمار سفارش', true); const id3 = h.sql(`select plan from labs where id='${lid}'`)[0].plan;
await h.call('staff', 'fileAdd', { id: id3, file: { kind: 'img', name: 'x.png', mime: 'image/png', data: 'data:image/png;base64,iVBORw0KGgo=' }, sendId: uuid(), by: 'م' });
const L = () => ({ labs: h.sql(`select count(*) n from labs where plan='${id3}'`)[0].n, steps: h.sql(`select count(*) n from lab_step where lab='${lid}'`)[0].n, ev: h.sql(`select count(*) n from lab_ev where lab='${lid}'`)[0].n, files: h.sql(`select count(*) n from files where plan='${id3}'`)[0].n });
const L0 = L(); ok(L0.labs === 1 && L0.steps > 0, 'setup: patient with a lab order', L0);
r = await h.call('manager', 'm1Rep', { op: 'ptDel', id: id3, by: 'مدیر' }); const L1 = L(); ok(r.ok && L1.labs === 0 && L1.steps === 0 && L1.ev === 0 && L1.files === 0, 'lab order, its steps, lab events and files are removed', { L1, r });
r = await h.call('lab', 'labList', {}); ok(r.ok !== false && !JSON.stringify(r).includes(lid), 'gone from the lab cartable');
r = await h.call('manager', 'm1Rep', { op: 'ptRest', tid: r.trash || (await h.call('manager', 'm1Rep', { op: 'ptTrash' })).items.find(x => x.plan === id3).id, by: 'مدیر' }); const L2 = L();
ok(r.ok && L2.labs === L0.labs && L2.steps === L0.steps && L2.ev === L0.ev && L2.files === L0.files, 'restored with the lab order', { L2, L0 });
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
