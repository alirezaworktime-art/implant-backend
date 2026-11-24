// t-m50eui: surgery day, implant window — the last brand picked stays for the next tooth. Run: WORKER=<m50e bundle> node t-m50eui.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); const { uuid } = A;
let bad = 0; const PE = []; const W = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const h = await A.start();
await h.call('manager', 'settings', { settings: { catalog: [{ b: 'IZEN', sys: '', g: 'ko', d: ['4', '4.5'], l: ['8', '10', '11.5'], h: [] }, { b: 'Dentium', sys: 'SuperLine', g: 'ko', d: ['4', '4.5'], l: ['8', '10'], h: [] }, { b: 'JD', sys: 'Plus', g: 'it', d: ['3.7', '4.3'], l: ['8', '10'], h: [] }, { b: 'JD', sys: 'Icon', g: 'it', d: ['3.7', '4.3'], l: ['8', '10'], h: [] }] } });
const id = await h.add('نمونه برند'); await h.plan(id, 'نمونه برند'); await h.confirm(id, 'نمونه برند', 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, 'نمونه برند', 'surg', h.today(), tk.id);
await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 90000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
try {
  const c = await br.newContext({ viewport: { width: 1180, height: 820 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200)));
  await p.goto(h.url); await p.click('[data-lrole="surgery"]'); await p.fill('#lg_pw', A.PW.surgery); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
  ok(await p.evaluate(() => /---------- m50e \(/.test(document.documentElement.innerHTML)), 'm50e marker in the page');
  await p.evaluate(id => { try { localStorage.removeItem(SGDK(id)) } catch (e) { } openSurg(QITEMS.find(x => x.id === id)) }, id); await W(1200);
  const K = await p.evaluate(() => Object.keys(SURG.s.imp.sel).filter(k => SURG.s.imp.sel[k] && isTooth(k))); const grp = await p.evaluate(() => SURG.rec.brand);
  const cur = () => p.evaluate(() => (document.getElementById('imp_cat').selectedOptions[0] || {}).textContent || '');
  const pick = async re => { await p.evaluate(src => { const S = document.getElementById('imp_cat'), o = [...S.options].find(o => new RegExp(src).test(o.textContent)); S.value = o.value; S.dispatchEvent(new Event('change', { bubbles: true })); const d = document.getElementById('imp_dS'); d.selectedIndex = 1; d.dispatchEvent(new Event('change', { bubbles: true })); const l = document.getElementById('imp_lS'); l.selectedIndex = 1; l.dispatchEvent(new Event('change', { bubbles: true })) }, re); await W(200); await p.evaluate(() => document.getElementById('impOk').click()); await W(500) };
  ok(K.length >= 2 && grp === 'ko', 'two implant teeth, Korean plan', { K, grp });
  await p.evaluate(k => openImp(k, 'imp'), K[0]); await W(300); ok(/^IZEN/.test(await cur()), 'the first tooth opens on the first brand of the plan group, as before', await cur());
  await pick('JD · Icon'); ok(await p.evaluate(k => SURG.imp[k] && SURG.imp[k].b === 'JD' && SURG.imp[k].sys === 'Icon', K[0]), 'a brand of another group is stored for the first tooth');
  await p.evaluate(k => openImp(k, 'imp'), K[1]); await W(300); ok(/^JD · Icon/.test(await cur()), 'the next tooth opens on the brand just picked (was: back to the first brand)', await cur());
  ok(await p.evaluate(k => !SURG.imp[k], K[1]), 'nothing is stored for the second tooth until «ثبت»');
  await pick('Dentium'); await p.evaluate(k => openImp(k, 'imp'), K[0]); await W(300); ok(/^JD · Icon/.test(await cur()), 'a tooth already recorded keeps its own brand', await cur());
  await p.evaluate(() => { document.getElementById('impSheet').hidden = true; delete SURG.lastCat }); await p.evaluate(k => { delete SURG.imp[k]; openImp(k, 'imp') }, K[1]); await W(300);
  ok(/^JD · Icon/.test(await cur()), 'after a reload the brand of the last recorded implant is used', await cur());
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
await br.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
