// t-m35fin: the manager edits a doctor tariff and a service price from «تنظیمات مالی»
import { h, A, W, chromium } from '../m24/probe.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1400, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
await p.goto(h.url); await p.click('[data-lrole="manager"]'); await p.fill('#lg_pw', A.PW.manager); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
try {
  const tiles = await p.evaluate(() => tileList().map(t => t.k + ':' + t.l)); console.log(tiles.join(' | '));
  await p.evaluate(() => goTile('dr')); await W(1500); await p.click('[data-drfee]'); await W(3000);
  let s = await p.evaluate(() => ({ fee: !!document.getElementById('feeSave'), inp: document.querySelectorAll('[data-fee]').length, txt: (document.querySelector('#viewFin, #finRoot, main') || document.body).innerText.slice(0, 200) }));
  console.log(JSON.stringify(s));
  ok(s.fee && s.inp > 0, 'manager sees the doctor-tariff table with «ذخیره‌ی تعرفه‌ها»', s);
  if (s.inp) { const k = await p.evaluate(() => { const i = document.querySelector('[data-fee]'); i.value = '7٬777٬000'; i.dispatchEvent(new Event('input', { bubbles: true })); return i.dataset.fee });
    await p.click('#feeSave'); await W(2000); const [sv, py] = k.split('|'); const v = h.sql(`select amount from fin_fee where svc='${sv}' and payee='${py}'`)[0]; ok(v && v.amount === 7777000, 'saved', v) }
  ok(p.PE.length === 0, 'no page errors', p.PE);
} catch (e) { console.log('FAIL exception', e.stack); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
