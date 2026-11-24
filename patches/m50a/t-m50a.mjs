// t-m50a (server + page): general-dentist task, open amount on the discharge card, difference settlement form. Run: WORKER=<m50a bundle> node t-m50a.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid, REC } = A;
let bad = 0; const PE = []; const J = (x, n = 600) => String(JSON.stringify(x)).slice(0, n); const W = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await A.start(); const OLD = REC.queueAdd[0].req.id;
const body = (id, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; return q };
const pre = async nm => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, nm, 'surg', h.today(), tk.id); return id };
const gen = id => h.sql(`select id, done, info, note from tasks where plan='${id}' and kind='gen' order by created`);
const br = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async role => { const c = await br.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); p.on('dialog', x => x.dismiss()); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const open = (p, id) => p.evaluate(id => !document.getElementById(id).hidden, id);
try {
  // ---------- (A) general-dentist task
  const g1 = await h.add('نمونه عمومی'); await h.plan(g1, 'نمونه عمومی');
  const c = await login('consultant'); ok(await c.evaluate(() => /---------- m50a \(/.test(document.documentElement.innerHTML)), 'm50a marker in the page');
  await c.evaluate(async id => { const j = await api('get', { id }); openForm(fromDoc(id, j.data || {})) }, g1); await W(1200);
  await c.check('#m48GenC'); await c.fill('#m48GenN', 'ترمیم'); await c.click('#saveBtn'); await W(1800);
  let T = gen(g1); ok(T.length === 1 && !Number(T[0].done) && T[0].info === 'ترمیم', 'ticking the option and saving makes one reception task', T);
  await c.click('#saveBtn'); await W(1500); ok(gen(g1).length === 1, 'saving again does not repeat it');
  await c.uncheck('#m48GenC'); await c.click('#saveBtn'); await W(1800); T = gen(g1); ok(T.length === 1 && Number(T[0].done) === 1, 'unticking closes the open task', T);
  await c.check('#m48GenC'); await c.click('#saveBtn'); await W(1800); T = gen(g1); ok(T.length === 2 && !Number(T[1].done), 'ticking again asks reception again', T);
  // ---------- patients for (B) and (C)
  const b1 = await pre('نمونه بدهکار'); let r = await h.call('staff', 'toSurgery', { id: b1 }); ok(r.ok === false, 'referral without payment is stopped', r);
  r = await h.call('staff', 'q9Allow', { id: b1, reason: 'تأیید مدیریت در آزمون' }); ok(r.ok === true && r.short > 0, 'management allows the referral', r); await h.must('staff', 'toSurgery', { id: b1 });
  r = await h.call('surgery', 'surgSave', body(b1, true)); ok(r.ok === true, 'operated before paying', r);
  const b2 = await pre('نمونه اختلاف'); await h.must('consultant', 'payAdd', { id: b2, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 90000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id: b2 });
  const q2 = body(b2, true), tot2 = Number(h.sql(`select total from plans where id='${b2}'`)[0].total); q2.actual = tot2 + 3000000; r = await h.call('surgery', 'surgSave', q2);
  const s2 = h.sql(`select settle, surg from plans where id='${b2}'`)[0], d2 = (JSON.parse(s2.surg).diff || 0); ok(r.ok === true && s2.settle === 'pending' && d2 === 3000000, 'a surgery 3,000,000 above the plan waits for settlement', { settle: s2.settle, d2 });
  const Q = await h.call('staff', 'queue', {}); const it1 = (Q.items || []).find(x => x.id === b1), it2 = (Q.items || []).find(x => x.id === b2);
  ok(it1 && it1.owe > 0, 'reception queue: the unpaid operated patient carries the open amount', it1 && { owe: it1.owe, sg: it1.sg }); ok(it2 && !(it2.owe > 3000000), 'the paid patient owes at most the difference', it2 && it2.owe);
  // ---------- reception page
  const p = await login('staff'); await W(800);
  let s = await p.evaluate(() => { const b = document.getElementById('m50GenL'); return b ? { n: b.querySelectorAll('.m50gen').length, t: b.textContent } : null });
  ok(s && s.n === 1 && /نمونه عمومی/.test(s.t) && /نوبت ویزیت/.test(s.t), '(A) reception sees the card «ویزیت دندانپزشک عمومی»', s);
  await p.evaluate(() => { const b = document.querySelector('#m50GenL [data-m50ga]'); b.scrollIntoView(); b.click() }); await W(600);
  s = await p.evaluate(() => (typeof AP === 'object' && AP ? { kind: AP.kind, task: !!AP.task, note: AP.note, plan: !!AP.plan } : null)); ok(s && s.kind === 'other' && s.task && s.plan && /دندانپزشک عمومی/.test(s.note), '(A) «نوبت ویزیت» opens the appointment sheet for a visit', s);
  await p.evaluate(() => document.querySelectorAll('.sheet').forEach(x => { if (!x.hidden && x.id !== 'pfSheet') x.hidden = true }));
  await p.evaluate(() => document.querySelector('#m50GenL [data-tdone]').click()); await W(1800); T = gen(g1); ok(T.every(x => Number(x.done) === 1) && await p.evaluate(() => !document.getElementById('m50GenL')), '(A) «انجام شد» closes it', T);
  // (B)
  s = await p.evaluate(id => { const c = document.querySelector(`#sdList .item.sdone[data-sd="${id}"]`); if (!c) return null; const r = c.querySelector('.m50owe'); return r ? { t: r.textContent, b: !!r.querySelector(`[data-p4rest="${id}"]`) } : { none: 1 } }, b1);
  ok(s && s.b && /مانده‌ی حساب بیمار/.test(s.t), '(B) discharge card shows the open amount with «تعیین تکلیف مالی»', s);
  await p.evaluate(id => document.querySelector(`#sdList .m50owe [data-p4rest="${id}"]`).click(), b1); await W(2500);
  s = await p.evaluate(() => (PC ? { part: PC.part, rcash: PC.rcash, open: !document.getElementById('pcSheet').hidden, h: document.querySelector('#pcSheet h3').textContent } : null));
  ok(s && s.open && /تعیین تکلیف مالی/.test(s.h) && (s.part === 's' || s.part === 'b') && s.rcash > 0, '(B) the same sheet opens, on the part that is still open', s);
  await p.evaluate(() => { document.getElementById('pcSheet').hidden = true; PC = null });
  // (C)
  await p.evaluate(id => { const b = document.querySelector(`[data-settle="${id}"]`); b.scrollIntoView(); b.click() }, b2); await W(2500);
  s = await p.evaluate(() => ({ f: !!document.getElementById('m50F'), old: !!document.getElementById('stForm'), cash: (document.getElementById('m50Cash') || {}).value, pos: document.querySelectorAll('#m50Pos [data-m50pos]').length, btn: document.getElementById('sdSettle').textContent }));
  ok(s.f && !s.old && s.cash === '3,000,000' && s.pos >= 1 && /دریافت/.test(s.btn), '(C) «تعیین تکلیف» opens the new form with the whole difference as cash', s);
  await p.click('#sdSettle'); await W(300); ok(/کارتخوان/.test(await p.evaluate(() => document.getElementById('sdMsg').textContent)), '(C) the way of the cash is asked');
  await p.click('#m50Cash'); await p.keyboard.press('Control+A'); await p.keyboard.type('1000000'); await p.evaluate(() => document.querySelector('#m50Pos [data-m50pos="cash"]').click());
  await p.click('#m50AddC'); await W(200); s = await p.evaluate(() => ({ n: document.querySelectorAll('#m50Chq .m50cq').length, a: (document.querySelector('[data-m50ca="0"]') || {}).value, x: !document.getElementById('m50ChqX').hidden, sum: document.getElementById('m50Sum').textContent }));
  ok(s.n === 1 && s.a === '2,000,000' && s.x && /کامل/.test(s.sum), '(C) «+ چک» takes the rest of the difference', s);
  await p.click('#sdSettle'); await W(300); ok(/نوع چک/.test(await p.evaluate(() => document.getElementById('sdMsg').textContent)), '(C) cheque kind and «در وجه» are asked');
  await p.evaluate(() => { document.querySelector('#m50F [data-m50ct="sayad"]').click(); document.querySelector('#m50F [data-m50pe]').click() });
  await p.fill('[data-m50cd="0"]', '1405/10/15'); await p.fill('[data-m50cn="0"]', '556677'); await p.evaluate(() => document.querySelectorAll('.fx2dp,.m6dp').forEach(x => x.remove()));
  await p.evaluate(() => document.getElementById('sdSettle').click()); for (let i = 0; i < 40 && await p.evaluate(() => !document.getElementById('sgDone').hidden); i++) await W(250);
  const P2 = h.sql(`select kind, amount, due, no, bank, note, st from pays where plan='${b2}' and note like '%اختلاف%' order by kind`), st2 = h.sql(`select settle from plans where id='${b2}'`)[0].settle;
  ok(st2 === 'done' && P2.length === 2, '(C) settlement stored with two receipts', { st2, P2, msg: await p.evaluate(() => document.getElementById('sdMsg').textContent) });
  const pc = P2.find(x => x.kind === 'cash'), pq = P2.find(x => x.kind === 'chq'); ok(pc && Number(pc.amount) === 1000000 && pq && Number(pq.amount) === 2000000 && pq.no === '556677' && pq.bank && /^\d{4}-\d{2}-\d{2}$/.test(pq.due), '(C) cash 1,000,000 + a cheque of 2,000,000 with number, bank and due date', P2);
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await br.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
