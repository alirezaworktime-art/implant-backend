// t-dep1: editing a confirmed plan corrects the recorded deposit (بیعانه); the patient PDF receipts and the debt follow.
// Run: WORKER=<bundle> node t-dep1.mjs   (or: node scripts/run-test.mjs patches/dep1/t-dep1.mjs)
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A;
const h = await A.start(); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 400))); if (!c) bad++ };
const W = ms => new Promise(r => setTimeout(r, ms));
const name = 'بیمار بیعانه', id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book');
const pre = 'dep-' + id.slice(0, 36) + '-';
const live = () => h.sql(`select id, amount, at, st, note from pays where plan='${id}' and st<>'del' and note like '%بیعانه%' order by at, id`);
const depSum = () => live().reduce((s, r) => s + Number(r.amount), 0);
const rest = async () => (await h.call('consultant', 'get', { id })).bal.rest;
const dep = (role, amount, extra = {}) => h.call(role, 'depEdit', Object.assign({ id, amount, pay: { kind: 'cash', pos: '', acct: '', by: 'مشاور' }, sendId: uuid() }, extra));
// the consultation deposit as pl10Dep posts it
await h.must('consultant', 'payAdd', { id, pid: pre + 'f', pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 10000000, by: 'مشاور', note: 'بیعانه' }, sendId: uuid() });
const r0 = await rest(), at0 = live()[0].at;
ok(depSum() === 10000000, 'first deposit 10,000,000 recorded', live());

let q = await dep('consultant', 15000000);
ok(q.ok && q.added === 5000000 && depSum() === 15000000 && live().length === 2, 'higher (15M): a second row «بیعانه (تکمیلی)» for 5M; total 15M', [q, live()]);
ok(live()[0].at === at0 && /تکمیلی/.test(live()[1].note), 'the first row keeps its day; the extra row is today', live());
ok(await rest() === r0 - 5000000, 'debt went down by 5,000,000', [r0, await rest()]);
q = await dep('consultant', 15000000);
ok(q.ok && q.same === 1 && live().length === 2, 'same amount again: nothing changes', q);
const sid = uuid(); const a1 = await dep('consultant', 15000000, { sendId: sid }), a2 = await dep('consultant', 15000000, { sendId: sid });
ok(a1.ok && a2.ok && live().length === 2, 'a repeated request (same sendId) does nothing twice', [a1, a2]);

q = await dep('consultant', 12000000);
const L12 = live();
ok(q.ok && depSum() === 12000000 && L12.length === 2 && L12.some(r => Number(r.amount) === 2000000 && r.at === L12[1].at), 'lower (12M): the 5M row is voided, a corrected 2M row keeps its date; total 12M', [q, L12]);
ok(h.sql(`select count(*) n from pays where plan='${id}' and st='del' and note like '%اصلاح بیعانه%'`)[0].n === 1, 'the voided row is kept with an «اصلاح بیعانه» note');
ok(await rest() === r0 - 2000000, 'debt follows: new total − 12M − other payments', [r0, await rest()]);

q = await dep('staff', 4000000);
ok(q.ok && depSum() === 4000000, 'reception may correct too (12M → 4M, across two rows)', [q, live()]);
q = await dep('manager', 4500000, { pay: { kind: 'cash', pos: '', acct: '', by: 'مدیر' } });
ok(q.ok && depSum() === 4500000, 'manager may correct too (4M → 4.5M)', [q, live()]);
q = await dep('doctor', 1000000);
ok(!q.ok && depSum() === 4500000, 'the treatment-plan doctor may not', q);

h.sql(`insert into cash (day) values ('${h.today()}')`);
const before = JSON.stringify(live()); q = await dep('consultant', 1000000);
ok(!q.ok && /صندوق/.test(q.error || '') && JSON.stringify(live()) === before, 'closed cash day: lowering is refused and nothing changes (all rows put back)', [q, live()]);
h.sql(`delete from cash where day='${h.today()}'`);

q = await dep('consultant', 0);
ok(q.ok && depSum() === 0 && await rest() === r0 + 10000000, 'deposit 0: every deposit row voided; debt = total − other payments', [q, live(), await rest()]);
ok(h.sql(`select count(*) n from events where plan='${id}' and kind='dep1'`)[0].n >= 5, 'each correction is in the patient history');
ok(!(await h.call('consultant', 'depEdit', { id, amount: -5, pay: { kind: 'cash' }, sendId: uuid() })).ok, 'a negative amount is refused');

// page: the block is there, finalize calls depEdit, and the PDF receipts show the corrected deposit
await dep('consultant', 7000000);
const pays = (await h.call('consultant', 'get', { id })).pays;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext(); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
await p.goto(h.url); await W(1500);
const s = await p.evaluate(P => ({ mark: /---------- dep1 \(/.test(document.documentElement.innerHTML), fin: String(finalize).includes('depEdit'), lines: (() => { const _tb = textBlock; let got = []; textBlock = (t, L) => { got = L; return _tb(t, L) }; try { q8Receipts({ pays: P, pay: {} }) } finally { textBlock = _tb } return got.join(' | ') })(), want: fa(7000000) }), pays);
ok(s.mark && s.fin, 'page has the dep1 block and finalize uses depEdit', s);
ok(s.lines.includes('بیعانه: ' + s.want), 'patient PDF «دریافتی‌ها از بیمار» shows the corrected deposit (7,000,000)', s.lines.slice(0, 300));
ok(!PE.length, 'no page errors', PE);
await b.close(); h.stop();
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
