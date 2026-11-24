// t-m30ui: the lab status answer is a normal toast; the patient file of a paper file shows the sub-stage and the re-implant months. Run: WORKER=<bundle> node t-m30ui.mjs
import { h, A, W, chromium } from '../m24/probe.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const day = n => new Date(Date.now() + 3.5 * 36e5 + (h.off() + n) * 864e5).toISOString().slice(0, 10), DOC = 'د.علوی کیا';
let r = await h.call('staff', 'fxArc', { id: '', by: 'منشی', ackDup: 1, ackFile: 1, arc: { v6: 1, name: 'نمایش فرعی', phone: '09131230000', nid: '', age: '50', city: 'یزد', doc: DOC, pfile: '6611', pays: [], disc: {}, settled: false, rem: '', open: true, type: 'fix', stage: 'fup', due: day(9),
  lines: [{ id: 'li1', k: 'imp', day: day(-200), doc: DOC, teeth: ['UR4'], n: 1, price: 9000000, imp: { UR4: { b: 'JD', d: '4.3', l: '10' } } }, { id: 'lf1', k: 'ifail', day: day(-10), doc: DOC, teeth: ['UR4'], n: 1, price: 0, rm: 5 }] } });
if (!r.ok) { console.log('setup failed', r); process.exit(1) } const pid = r.id;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async role => { const c = await b.newContext({ viewport: { width: 1400, height: 950 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3200); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  let p = await login('staff');
  ok(await p.evaluate(() => /---------- m30 \(/.test(document.documentElement.innerHTML)), 'm30 marker in the page');
  await p.fill('#rS', '6611'); await W(500); await p.click('#rSRes [data-file]'); await W(2500);
  const T = await p.evaluate(() => { const s = document.getElementById('pfSheet'); const e = s && !s.hidden && s.querySelector('.m30sub'); return e ? e.innerText.replace(/\s+/g, ' ') : (s && !s.hidden ? 'no box: ' + s.innerText.slice(0, 200) : 'no sheet') });
  ok(/مرحله‌ی بعد \(فرعی\): پیگیری — /.test(T) && /فیلد شدن ایمپلنت .*: کاشت مجدد ۵ ماه بعد/.test(T), 'the patient file shows the sub-stage with its date and the re-implant months', T);
  await p.screenshot({ path: '/tmp/file.png' });
  ok(p.PE.length === 0, 'reception: no page errors', p.PE);
  p = await login('lab'); await p.evaluate(() => l5Go('bench')); await W(2000);
  await p.evaluate(() => alertMsg('#۱۰۰۲ بیمار آزمایشی — در حال ساخت')); await W(200); let t = await p.evaluate(() => { const e = document.getElementById('toast'); return e.hidden ? '' : e.className + '|' + e.textContent });
  ok(/#۱۰۰۲/.test(t) && !/err/.test(t.split('|')[0]), 'lab: a status answer is a normal (not red) toast', t);
  await W(300); await p.evaluate(() => alertMsg('این مرحله پیدا نشد.')); await W(200); t = await p.evaluate(() => { const e = document.getElementById('toast'); return e.className + '|' + e.textContent }); ok(/err/.test(t.split('|')[0]) && /پیدا نشد/.test(t), 'lab: a real error is still red', t);
  ok(p.PE.length === 0, 'lab: no page errors', p.PE);
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 700)) }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
