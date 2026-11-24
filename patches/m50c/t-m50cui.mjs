// t-m50cui: surgery sheet — «فیل اولیه» is the last (far-left) choice of the treatment row. Run: WORKER=<m50c bundle> node t-m50cui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A;
let bad = 0; const PE = []; const W = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const h = await A.start();
const id = await h.add('نمونه جراحی'); await h.plan(id, 'نمونه جراحی'); await h.confirm(id, 'نمونه جراحی', 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, 'نمونه جراحی', 'surg', h.today(), tk.id);
await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 90000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
const br = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
try {
  const c = await br.newContext({ viewport: { width: 1180, height: 820 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200)));
  await p.goto(h.url); await p.click('[data-lrole="surgery"]'); await p.fill('#lg_pw', A.PW.surgery); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
  ok(await p.evaluate(() => /---------- m50c \(/.test(document.documentElement.innerHTML)), 'm50c marker in the page');
  await p.evaluate(id => openSurg(QITEMS.find(x => x.id === id)), id); await W(1500);
  const s = await p.evaluate(() => { const B = document.getElementById('sgPick2'), A2 = document.getElementById('sgPick'), L = [...B.querySelectorAll('button.chip')], pf = B.querySelector('[data-m31pf]'), imp = A2.querySelector('[data-sgsec="imp"]') || A2.querySelector('button.chip'), r = e => e.getBoundingClientRect();
    return { one: document.querySelectorAll('[data-m31pf]').length, inPlan: !!A2.querySelector('[data-m31pf]'), first: L.length ? L[0].textContent.trim() : '', left: pf && imp ? r(pf).left < r(imp).left : false, vis: pf ? r(pf).top >= 0 && r(pf).bottom <= innerHeight - 80 : false } });
  ok(s.one === 1 && !s.inPlan && /^فیل اولیه/.test(s.first), '«فیل اولیه» left the plan treatments and is the first out-of-plan choice', s); ok(s.left && s.vis, 'it is in the left panel and visible', s);
  await p.evaluate(() => document.querySelector('#sgPick2 [data-m31pf]').click()); await W(500); ok(await p.evaluate(() => !!document.getElementById('m31Pf') && document.querySelector('#sgPick2 [data-m31pf]').getAttribute('aria-pressed') === 'true' && document.querySelector('#sgPick2 button.chip').matches('[data-m31pf]')), 'a tap still opens the early-failure card, and the choice stays in its place');
  await p.screenshot({ path: '/tmp/pick.png' });
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
await br.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
