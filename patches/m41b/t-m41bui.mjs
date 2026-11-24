// t-m41bui: paper-file form shows the credit the server stores. Run: WORKER=<m41b bundle> node t-m41bui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 400))); if (!c) bad++ };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
try {
  for (const [vw, vh] of [[1280, 760], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone';
    const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200)));
    await p.goto(h.url); await p.click('[data-lrole="staff"]'); await p.fill('#lg_pw', A.PW.staff); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
    await p.evaluate(() => a6Open()); await W(1800);
    const prev = (rem, settled, paid) => p.evaluate(({ rem, settled, paid }) => { A6.lines = []; A6.pays = paid ? [{ id: 'p1', amount: String(paid), day: '', meth: 'cash', note: '' }] : []; A6.rem = rem; A6.settled = settled; const C = a6Calc(), hh = a6MoneyHTML(); const d = document.createElement('div'); d.innerHTML = hh; const big = d.querySelector('.a6sum.big b'); return { bal: C.bal, big: big ? big.textContent : '', cr: !!d.querySelector('#m41bCr'), crTxt: (d.querySelector('#m41bCr') || {}).textContent || '', over: /به جمع پرونده اضافه می‌شود/.test(hh) } }, { rem, settled, paid });
    let r = await prev('', false, 540000); ok(r.bal === -540000 && /بستانکار/.test(r.big) && r.cr && /۵۴۰/.test(r.crTxt) && !r.over, tag + ': paid 540,000 above the cost → «بستانکار ۵۴۰٬۰۰۰» and the hint', r);
    r = await prev('', true, 540000); ok(r.bal === 0 && !/بستانکار/.test(r.big) && !r.cr, tag + ': «حساب تسویه است» → zero, no credit', r);
    r = await prev('16000000', false, 16000000); ok(r.bal === 16000000 && !r.cr && r.over, tag + ': remaining debt given → as m41 (16 owed)', r);
    r = await prev('', false, 0); ok(r.bal === 0 && !r.cr, tag + ': empty file → zero', r);
    // the live line under the form follows typing
    const live = await p.evaluate(() => { A6.lines = []; A6.pays = [{ id: 'p1', amount: '700000', day: '', meth: 'cash', note: '' }]; A6.rem = ''; A6.settled = false; const m = document.getElementById('a6Money'); if (!m) return null; m.innerHTML = a6MoneyHTML(); if (typeof a6MoneyLite === 'function') a6MoneyLite(); const big = m.querySelector('.a6sum.big b'); return { big: big ? big.textContent : '', wide: document.documentElement.scrollWidth <= innerWidth + 1 } });
    ok(live && /بستانکار/.test(live.big) && live.wide, tag + ': the form itself shows the credit, no sideways scroll', live);
    await c.close(); }
} catch (e) { console.log('ERR', e.message.slice(0, 300)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
