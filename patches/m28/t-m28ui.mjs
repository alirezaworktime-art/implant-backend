// t-m28ui: fixes from the full-site test — visible error messages outside the patient form, no forbidden posList call, orphan dropdown closed. Run: WORKER=<bundle> node t-m28ui.mjs
import { h, A, W, chromium, mk } from '../m24/probe.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
await mk('الف', true);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role) => { const c = await b.newContext({ viewport: { width: 1400, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.API = []; p.on('pageerror', e => p.PE.push(e.message)); p.on('request', r => { try { if (r.method() === 'POST') p.API.push(JSON.parse(r.postData()).action) } catch (e) { } });
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3200); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const toastT = p => p.evaluate(() => { const t = document.getElementById('toast'); return t.hidden ? '' : t.className + '|' + t.textContent });
try {
  let p = await login('lab');
  ok(await p.evaluate(() => /---------- m28 \(/.test(document.documentElement.innerHTML)), 'm28 marker in the page');
  await p.evaluate(() => l5Go('d/box')); await W(2500);
  await p.evaluate(() => alertMsg('پیام آزمایشی')); await W(200); ok(/err\|پیام آزمایشی/.test(await toastT(p)) && await p.evaluate(() => document.getElementById('editNote').hidden), 'lab view: alertMsg shows a red toast', await toastT(p));
  // a real case: adding boxes with a bad range
  await p.click('#l5bAdd'); await W(500); await p.fill('#uxAskSh [data-ak="0"]', '9'); await p.fill('#uxAskSh [data-ak="1"]', '3'); await p.click('#uxAskOk'); await W(1500);
  ok(/بازه‌ی شماره‌ها درست نیست/.test(await toastT(p)), 'real case: a bad box range now gives a visible message', await toastT(p));
  await p.evaluate(() => document.querySelectorAll('.sheet').forEach(s => { s.hidden = true }));
  // dropdown left open, then the tab is redrawn
  await p.evaluate(() => l5Go('o/all')); await W(2500);
  const has = await p.evaluate(() => { const bt = document.querySelector('#viewLab .l8ssb'); if (!bt) return false; bt.click(); return !!document.getElementById('l8ssP') }); ok(has, 'dropdown opens');
  await p.evaluate(() => l5Go('rep')); await W(900); ok(await p.evaluate(() => !document.getElementById('l8ssP') && !L8.ss), 'the dropdown closes when the tab changes');
  await p.evaluate(() => l5Go('o/all')); await W(2500); await p.evaluate(() => document.querySelector('#viewLab .l8ssb').click()); await W(200);
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll('#l8ssP .l8sso')][1]; if (!o) return 'no option'; const sel = L8.ss.sel; o.click(); return sel.selectedIndex === 1 && !document.getElementById('l8ssP') }) === true, 'picking from a live dropdown still works');
  ok(p.PE.length === 0, 'lab: no page errors', p.PE);
  // form view keeps its banner
  p = await login('doctor'); await p.evaluate(() => { const t = tileList().find(x => x.k === 'new'); goTile(t.k) }); await W(1200);
  const inForm = await p.evaluate(() => !document.getElementById('viewForm').hidden);
  if (inForm) { await p.evaluate(() => alertMsg('پیام فرم')); await W(200); ok(await p.evaluate(() => { const e = document.getElementById('editNote'); return !e.hidden && e.textContent === 'پیام فرم' }) && !/پیام فرم/.test(await toastT(p)), 'patient form: alertMsg still uses the banner in the form') } else ok(false, 'could not open the form');
  await p.evaluate(() => { dirty = false; goTile('q') }); await W(1500); await p.evaluate(() => { try { ensurePos(true) } catch (e) { } }); await W(600);
  ok(!p.API.includes('posList'), 'doctor: the page never asks for the card-reader list', p.API.filter(a => a === 'posList').length);
  p = await login('staff'); await p.evaluate(() => ensurePos(true)); await W(700); ok(p.API.includes('posList'), 'reception: still loads the card-reader list');
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 700)) }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
