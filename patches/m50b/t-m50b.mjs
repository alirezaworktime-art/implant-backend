// t-m50b (server + page): way of payment at reception (cash with discount / plan terms); «پزشک کلینیک» as assistant doctor. Run: WORKER=<m50b bundle> node t-m50b.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid, REC } = A;
let bad = 0; const PE = []; const J = (x, n = 600) => String(JSON.stringify(x)).slice(0, n); const W = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await A.start(); const OLD = REC.queueAdd[0].req.id;
const body = (id, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; return q };
const pre = async nm => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, nm, 'surg', h.today(), tk.id); return id };
const row = id => { const x = h.sql(`select total, data from plans where id='${id}'`)[0], d = JSON.parse(x.data); return { total: Number(x.total), pay: d.pay || {}, parts: d.parts || null } };
const br = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async role => { const c = await br.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); p.on('dialog', x => x.dismiss()); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  const a = await pre('نمونه نقدی'), r0 = row(a); console.log('     plan: total ' + r0.total + ' · terms ' + J({ opt: r0.pay.opt, cs: r0.pay.cs, cp: r0.pay.cp, n1: r0.pay.n1, n3: r0.pay.n3, disc: r0.pay.disc, cash: r0.pay.cash }));
  const p = await login('staff'); ok(await p.evaluate(() => /---------- m50b \(/.test(document.documentElement.innerHTML)), 'm50b marker in the page');
  const openSheet = async () => { await p.evaluate(async id => { const j = await api('get', { id }); openPostConfirm(fromDoc(id, j.data || {})) }, a); await W(2200) };
  const st = () => p.evaluate(() => { const b = document.getElementById('m50Pm'); return b ? { plan: b.querySelector('[data-m50pm="plan"]').getAttribute('aria-pressed'), cash: b.querySelector('[data-m50pm="cash"]').getAttribute('aria-pressed'), dis: b.querySelector('[data-m50pm="cash"]').disabled, note: document.getElementById('m50PmN').textContent, chq: PC ? ((PC._o || PC).chq || []).length : -1, pcCash: PC ? (PC._o || PC).cash : -1 } : null });
  await openSheet(); let s = await st(); ok(s && s.plan === 'true' && s.cash === 'false' && !s.dis && /نقد/.test(s.note), 'the sheet shows «روش پرداخت بیمار» on the consultant terms', s);
  const chq0 = s.chq;
  await p.click('#m50Pm [data-m50pm="cash"]'); await W(500); ok(await p.evaluate(() => !document.getElementById('uxAskSh').hidden && /تخفیف/.test(document.getElementById('uxAskSh').textContent)), 'the change is confirmed first');
  await p.click('#uxAskOk'); await W(3500); let r1 = row(a); s = await st();
  const want = await p.evaluate(async id => { const j = await api('get', { id }); const r = fromDoc(id, j.data || {}); return { total: planTotal(r), on: discOn(r), pct: discPct(r) } }, a);
  ok(r1.total < r0.total && r1.total === want.total && want.on && r1.pay.m50o && r1.pay.cs === '100' && r1.pay.cp === '100', 'cash with discount: the plan total drops and the terms are 100% cash', { t0: r0.total, t1: r1.total, want, pay: r1.pay });
  ok(Math.abs(r1.total - Math.round(r0.total * (100 - want.pct) / 100)) <= Math.max(2000, r0.total * 0.03), 'the drop is the cash discount (' + want.pct + '%)', { t0: r0.total, t1: r1.total });
  ok(r1.parts && r1.parts.S + r1.parts.P === r1.total, 'the two parts add up to the new total', r1.parts);
  ok(s && s.cash === 'true' && s.chq === 0 && s.pcCash === r1.total, 'the sheet reopens: no cheques, all cash', s);
  const ev = h.sql(`select title, detail from events where plan='${a}' and kind='m50PayMode'`); ok(ev.length === 1 && /نقدی/.test(ev[0].title), 'the change is in the history of the file', ev);
  let r = await h.call('staff', 'm50PayMode', { id: a, mode: 'cash', total: r1.total, parts: r1.parts }); ok(r.ok && r.same === 1 && row(a).total === r1.total, 'a repeat changes nothing', r);
  // back to the plan terms
  await p.click('#m50Pm [data-m50pm="plan"]'); await W(500); await p.click('#uxAskOk'); await W(3500); const r2 = row(a); s = await st();
  ok(r2.total === r0.total && !r2.pay.m50o && ['cs', 'cp', 'cash', 'n1', 'n3', 'disc', 'opt', 'mode'].every(k => String(r2.pay[k] === undefined ? '' : r2.pay[k]) === String(r0.pay[k] === undefined ? '' : r0.pay[k])), 'back to the consultant terms: total and terms as before', { t: r2.total, pay: r2.pay });
  ok(s && s.plan === 'true' && s.chq === chq0, 'the sheet shows the plan terms again', s);
  // guards
  r = await h.call('surgery', 'm50PayMode', { id: a, mode: 'cash', total: r1.total, parts: r1.parts }); ok(r.ok === false, 'only reception and the consultant', r);
  await h.must('staff', 'payAdd', { id: a, pid: 'cq-' + uuid(), pay: { kind: 'chq', part: 's', amount: 5000000, due: h.today(), no: '1122', bank: 'ملی', by: 'منشی', note: '' }, sendId: uuid() });
  r = await h.call('staff', 'm50PayMode', { id: a, mode: 'cash', total: r1.total, parts: r1.parts }); ok(r.ok === false && /چک/.test(r.error || '') && row(a).total === r0.total, 'with a cheque on file the change to cash is refused', r);
  r = await h.call('staff', 'm50PayMode', { id: a, mode: 'cash', total: r0.total + 5, parts: r1.parts }); ok(r.ok === false, 'a higher total is refused', r);
  // ---------- «پزشک کلینیک»
  const d = await login('surgery'); ok(await d.evaluate(() => ASSTS().includes('پزشک کلینیک') && ASSTS().indexOf('پزشک کلینیک') === ASSTS().length - 1), '«پزشک کلینیک» is the last assistant doctor of the surgery day');
  const b = await pre('نمونه کلینیک'); await h.must('consultant', 'payAdd', { id: b, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 90000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id: b });
  const q = body(b, true); q.session.asst = 'پزشک کلینیک'; q.session.sa = {}; q.session.sa2 = {}; r = await h.call('surgery', 'surgSave', q); ok(r.ok === true, 'a session with «پزشک کلینیک» as the assistant is stored', r);
  const M = await h.call('manager', 'm1Rep', { from: h.today(), to: h.today() }); const by = ((M.docs || {}).by || []).find(x => /پزشک کلینیک/.test(x.name || ''));
  ok(M.ok && !(by && by.fee > 0), 'the manager report gives «پزشک کلینیک» no doctor share', by || 'no row');
  // ---------- «ارجاع به پزشک دیگر»
  const g = await h.add('نمونه ارجاع'); await h.plan(g, 'نمونه ارجاع'); const c = await login('consultant');
  await c.evaluate(async id => { const j = await api('get', { id }); openForm(fromDoc(id, j.data || {})) }, g); await W(1200);
  ok(await c.evaluate(() => !!document.getElementById('m50RdC') && document.getElementById('m50RdN').closest('label').hidden && !document.getElementById('m50RdB')), 'plan form has «ارجاع به پزشک دیگر», name box closed');
  await c.check('#m50RdC'); await W(200); await c.fill('#m50RdN', 'دکتر نمونه ارتودنسی'); await W(200);
  ok(await c.evaluate(() => F.h.rdoc === 1 && F.h.rdocN === 'دکتر نمونه ارتودنسی' && /ارجاع به پزشک دیگر/.test(document.getElementById('m50RdB').textContent) && /ارتودنسی/.test(document.getElementById('m50RdB').textContent)), 'ticking it asks for the doctor and shows the banner');
  await c.click('#saveBtn'); await W(1800); const dg = JSON.parse(h.sql(`select data from plans where id='${g}'`)[0].data); const tg = h.sql(`select info, done from tasks where plan='${g}' and kind='gen'`);
  ok(dg.h.rdoc === 1 && dg.h.rdocN === 'دکتر نمونه ارتودنسی' && tg.length === 1 && /ارجاع به پزشک دیگر: دکتر نمونه ارتودنسی/.test(tg[0].info), 'stored with the plan; reception gets a task with the name', { h: dg.h.rdocN, tg });
  await p.evaluate(() => pollQ(true)); await W(2000); ok(await p.evaluate(() => { const b = document.getElementById('m50GenL'); return !!b && /ارجاع به پزشک دیگر: دکتر نمونه ارتودنسی/.test(b.textContent) && /نمونه ارجاع/.test(b.textContent) }), 'reception sees the referral card');
  await p.evaluate(id => openFile(id, 'نمونه ارجاع'), g); await W(1500); ok(await p.evaluate(() => { const b = document.querySelector('#pfBody .m50rdb'); return !!b && /ارتودنسی/.test(b.textContent) }), 'the patient file shows the referral');
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await br.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
