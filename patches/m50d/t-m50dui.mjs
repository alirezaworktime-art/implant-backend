// t-m50dui: surgery sheet defaults — «آخرین جلسه» ticked, «چک بی‌حسی» unticked. Run: WORKER=<m50d bundle> node t-m50dui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
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
  ok(await p.evaluate(() => /---------- m50d \(/.test(document.documentElement.innerHTML)), 'm50d marker in the page');
  const st = () => p.evaluate(() => ({ fin: document.getElementById('sg_fin').checked, numb: document.querySelector('#viewSurg [data-fu="numb"]').checked, week: document.querySelector('#viewSurg [data-fu="week"]').checked, sut: document.querySelector('#viewSurg [data-fu="suture"]').checked }));
  await p.evaluate(id => { try { localStorage.removeItem(SGDK(id)) } catch (e) { } openSurg(QITEMS.find(x => x.id === id)) }, id); await W(1200); let s = await st();
  ok(s.fin === true, '«این آخرین جلسه است» starts ticked', s); ok(s.numb === false && s.week === true && s.sut === true, '«چک بی‌حسی» starts unticked; the other follow-ups stay ticked', s);
  // a draft of the same day keeps its own ticks
  await p.evaluate(() => { document.querySelector('#viewSurg [data-fu="numb"]').checked = true; document.querySelector('#viewSurg [data-fu="week"]').checked = false; SURG.dirty = true; sgDraftSave() });
  await p.evaluate(id => openSurg(QITEMS.find(x => x.id === id)), id); await W(1200); s = await st();
  ok(s.numb === true && s.week === false && s.fin === true, 'a draft of today keeps its follow-up ticks', s);
  await p.evaluate(id => { try { localStorage.removeItem(SGDK(id)) } catch (e) { } openSurg(QITEMS.find(x => x.id === id)) }, id); await W(1000); s = await st(); ok(s.fin && !s.numb && s.week, 'without a draft the defaults are back', s);
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
await br.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
