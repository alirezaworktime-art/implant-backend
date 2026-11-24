// t-m33ui: manager archive «حذف کامل پرونده» + «پرونده‌های حذف‌شده»; reception «بیمار مشابه» dialog. Run: WORKER=<bundle> node t-m33ui.mjs
import { h, A, W, chromium } from '../m24/probe.mjs'; import { uuid } from '../audit/A.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const DOC = 'د. اکبر پور', day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const r0 = await h.call('staff', 'fxArc', { id: '', by: 'منشی', ackDup: 1, ackFile: 1, arc: { v6: 1, name: 'مریم صادقی', phone: '09135556677', nid: '', age: '33', city: 'یزد', doc: DOC, pfile: '6602', pays: [], disc: {}, settled: false, rem: '', open: false,
  lines: [{ id: 'lext9', k: 'ext', day: day(-20), doc: DOC, teeth: ['LL8'], n: 1, price: 800000 }] } });
const pid = r0.id;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1400) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3200); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  // ---- reception: the duplicate question
  const s = await login('staff');
  await s.evaluate(() => fxArcOpen(null)); await W(2000);
  await s.evaluate(() => { const i = [...document.querySelectorAll('#a6Root input')].find(x => x.closest('label') && /نام و نام خانوادگی/.test(x.closest('label').textContent)); i.value = 'مریم صادقی'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })) });
  await s.click('[data-a6k="extg"]'); await W(300); await s.click('[data-a6lv="ext"]'); await W(400);
  const id = await s.evaluate(() => A6.lines[0].id); await s.fill(`[data-a6f="dayJ"][data-l="${id}"]`, '1405/08/01'); await s.keyboard.press('Tab');
  await s.evaluate(id => { const x = document.querySelector(`[data-a6f="doc"][data-l="${id}"]`); x.selectedIndex = 1; x.dispatchEvent(new Event('change', { bubbles: true })) }, id); await s.click(`.a6t[data-l="${id}"][data-a6t="UR8"]`); await W(300);
  await s.click('#a6Save'); await W(1800);
  let D = await s.evaluate(() => UXA ? { t: document.getElementById('uxAskT').textContent, body: document.getElementById('uxAskSh').innerText.replace(/\s+/g, ' '), ok: document.getElementById('uxAskOk').textContent, no: document.getElementById('uxAskNo').textContent, li: document.querySelectorAll('#uxAskSh .m33dup li').length } : null);
  ok(D && /مشابه/.test(D.t) && D.li === 1 && /پرونده ۶۶۰۲/.test(D.body) && /موبایل …۶۶۷۷/.test(D.body) && /یکسان: نام/.test(D.body) && D.ok === 'بیمار دیگری است، ثبت شود' && /همان بیمار/.test(D.no), 'the question lists the found patient (file, mobile end, what matched) with clear buttons', D);
  await s.screenshot({ path: '/tmp/dup.png' });
  await s.click('#uxAskOk'); await W(2500);
  ok(h.sql("select count(*) n from plans where name='مریم صادقی'")[0].n === 2, '«بیمار دیگری است، ثبت شود» saves the namesake');
  ok(s.PE.length === 0, 'no page errors (reception)', s.PE);
  // ---- manager: delete from the archive
  const p = await login('manager');
  await p.evaluate(() => goTile('arch')); await W(1800);
  ok(await p.evaluate(() => !document.getElementById('m33Bar') || document.getElementById('m33Bar').hidden), 'no trash link while the trash is empty');
  await p.evaluate(id => openFile(id, 'مریم صادقی'), pid); await W(2000);
  ok(await p.evaluate(() => !!document.querySelector('#pfActs [data-m33del]')), 'the manager sees «حذف کامل پرونده» in the file');
  await p.click('#pfActs [data-m33del]'); await W(1200);
  D = await p.evaluate(() => UXA ? { t: document.getElementById('uxAskT').textContent, m: document.getElementById('uxAskSh').innerText.replace(/\s+/g, ' ') } : null);
  ok(D && D.t === 'حذف کامل پرونده' && /مریم صادقی/.test(D.m) && /۶۶۰۲/.test(D.m) && /۳۰ روز/.test(D.m), 'the question names the patient and the 30-day trash', D);
  await p.screenshot({ path: '/tmp/del.png' });
  await p.click('#uxAskNo'); await W(500); ok(h.sql(`select count(*) n from plans where id='${pid}'`)[0].n === 1, '«انصراف» deletes nothing');
  await p.click('#pfActs [data-m33del]'); await W(1200); await p.click('#uxAskOk'); await W(2500);
  ok(h.sql(`select count(*) n from plans where id='${pid}'`)[0].n === 0, '«حذف کامل» deletes the file');
  D = await p.evaluate(id => ({ sheet: document.getElementById('pfSheet').hidden, inList: [...document.querySelectorAll('#list [data-id]')].some(x => x.dataset.id === id) || /6602|۶۶۰۲/.test(document.getElementById('list').innerText) && false, bar: document.getElementById('m33Bar') && !document.getElementById('m33Bar').hidden ? document.getElementById('m33Bar').innerText : '', toast: document.getElementById('toast').textContent }), pid);
  ok(D.sheet && /حذف شد/.test(D.toast) && /پرونده‌های حذف‌شده \(۱\)/.test(D.bar), 'the file closes, a message shows and «پرونده‌های حذف‌شده (۱)» appears in the archive', D);
  await p.click('[data-m33trash]'); await W(1200);
  D = await p.evaluate(() => { const s = document.getElementById('m33Sh'); return s && !s.hidden ? { rows: s.querySelectorAll('.m33row').length, t: s.innerText.replace(/\s+/g, ' ') } : null });
  ok(D && D.rows === 1 && /مریم صادقی/.test(D.t) && /۶۶۰۲/.test(D.t), 'the trash lists the deleted file', D);
  await p.screenshot({ path: '/tmp/trash.png' });
  await p.click('[data-m33rest]'); await W(900); await p.click('#uxAskOk'); await W(2500);
  ok(h.sql(`select count(*) n from plans where id='${pid}'`)[0].n === 1, '«بازگردانی» brings it back');
  D = await p.evaluate(() => ({ rows: document.querySelectorAll('#m33Sh .m33row').length, bar: document.getElementById('m33Bar').hidden }));
  ok(D.rows === 0 && D.bar, 'the trash is empty again and the link hides', D);
  ok(p.PE.length === 0, 'no page errors (manager)', p.PE);
  // phone
  const q = await login('manager', 390); await q.evaluate(() => goTile('arch')); await W(1500); await q.evaluate(id => openFile(id, 'مریم صادقی'), pid); await W(2000);
  const w = await q.evaluate(() => { const b = document.querySelector('#pfActs [data-m33del]'); const r = b && b.getBoundingClientRect(); return { has: !!b, r: r ? r.right : 0, iw: innerWidth, sw: document.documentElement.scrollWidth } });
  ok(w.has && w.r <= w.iw && w.sw <= w.iw + 1, 'phone: the button fits', w);
  for (const role of ['staff', 'accountant', 'doctor']) { const x = await login(role); await x.evaluate(id => openFile(id, 'مریم صادقی'), pid); await W(1800); ok(await x.evaluate(() => !document.querySelector('[data-m33del]')), role + ' does not see the delete button') }
} catch (e) { console.log('FAIL exception', e.stack); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
