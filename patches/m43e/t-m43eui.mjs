// t-m43eui: «تعرفه و سهم پزشکان» opens on «سهم هر پزشک»; two doctors get different shares for the same service. Run: WORKER=<m43e bundle> node t-m43eui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const fee = (svc, payee) => { const r = h.sql(`select amount from fin_fee where svc='${svc}' and payee='${payee}'`)[0]; return r ? r.amount : 0 };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  for (const [vw, vh] of [[1280, 800], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone';
    const p = await login('manager', vw, vh); await W(500); await p.evaluate(() => document.getElementById('m43Open').click()); await W(1800);
    const g = await p.evaluate(() => window.m43c.state().d), D = g.payees.filter(x => x.kind === 'doctor' && x.active !== 0), gbr = g.svc.find(x => /GBR/.test(x.name) && x.rule !== 'clinic');
    let s = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('#m43Body [data-m43t]')].map(x => x.textContent), on: document.querySelector('#m43Body [data-m43t][aria-pressed="true"]').dataset.m43t, who: (document.querySelector('#m43Body [data-m43who][aria-pressed="true"]') || {}).dataset, rows: document.querySelectorAll('#m43Body [data-m43row]').length, over: document.documentElement.scrollWidth > innerWidth + 2 }));
    ok(s.tabs[0] === 'سهم هر پزشک' && s.on === 'exc' && s.who && s.who.m43who === D[0].id && s.rows > 5 && !s.over, tag + ': opens on «سهم هر پزشک» with the first doctor chosen and his table ready', s);
    if (tag === 'desktop') { const f0 = [fee(gbr.id, D[0].id), fee(gbr.id, D[1].id)];
      await p.selectOption(`#m43Body [data-m43row="${gbr.id}"] [data-m43m]`, 'a'); await p.fill(`#m43Body [data-m43row="${gbr.id}"] [data-m43v]`, '1100000'); await p.click('#m43Save'); await W(3500);
      ok(fee(gbr.id, D[0].id) === 1100000 && fee(gbr.id, D[1].id) === f0[1], 'first doctor: ' + gbr.name + ' = 1,100,000; the second doctor is not touched', [fee(gbr.id, D[0].id), fee(gbr.id, D[1].id), f0]);
      await p.click(`#m43Body [data-m43who="${D[1].id}"]`); await W(300); await p.selectOption(`#m43Body [data-m43row="${gbr.id}"] [data-m43m]`, 'a'); await p.fill(`#m43Body [data-m43row="${gbr.id}"] [data-m43v]`, '1700000'); await p.click('#m43Save'); await W(3500);
      ok(fee(gbr.id, D[0].id) === 1100000 && fee(gbr.id, D[1].id) === 1700000, 'second doctor: the same service = 1,700,000; each keeps his own number', [fee(gbr.id, D[0].id), fee(gbr.id, D[1].id)]);
      await p.click(`#m43Body [data-m43who="${D[1].id}"]`); await W(200); ok(await p.evaluate(i => document.querySelector(`#m43Body [data-m43who="${i}"]`).getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#m43Body [data-m43row]').length > 5, D[1].id), 'tapping the chosen doctor again keeps him chosen');
      await p.click('#m43Body [data-m43t="share"]'); await W(300); await p.selectOption(`#m43Body [data-m43row="${gbr.id}"] [data-m43m]`, 'a'); await p.fill(`#m43Body [data-m43row="${gbr.id}"] [data-m43v]`, '900000'); await p.click('#m43Save'); await W(3500);
      ok(fee(gbr.id, D[0].id) === 1100000 && fee(gbr.id, D[1].id) === 1700000 && (D.length < 3 || fee(gbr.id, D[2].id) === 900000), 'optional common share: doctors with their own number keep it, the others take the common one', D.slice(0, 3).map(d => fee(gbr.id, d.id)));
      await p.screenshot({ path: 'per-doctor.png' }) }
    else ok(await p.evaluate(i => { const r = document.querySelector(`#m43Body [data-m43row="${i}"]`); return r.querySelector('[data-m43m]').value === 'a' && /۱٬۱۰۰٬۰۰۰/.test(r.querySelector('[data-m43v]').value) }, gbr.id), 'phone: the first doctor shows his saved number');
    await p.click('#m43Close'); await p.context().close(); }
} catch (e) { console.log('ERR', e.message.slice(0, 500)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
