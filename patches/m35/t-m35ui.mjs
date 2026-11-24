// t-m35ui: manager «گزارش پزشکان» tile, daily sheet / detail / per doctor; drug code at discharge; level tariffs. Run: WORKER=<bundle> node t-m35ui.mjs
import { h, A, W, chromium } from '../m24/probe.mjs'; import { uuid } from '../audit/A.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 900))); if (!c) bad++ };
const td = new Date(Date.now() + 3.5 * 36e5).toISOString().slice(0, 10);
const L = (k, doc, n, price, ds) => ({ id: 'l' + uuid().slice(0, 8), k, day: td, doc, teeth: [], n, price, ds: ds || {} });
await h.call('manager', 'm1Rep', {});
let r = await h.call('staff', 'fxArc', { id: '', by: 'م', ackDup: 1, ackFile: 1, arc: { v6: 1, name: 'بیمار گزارش', phone: '', nid: '', age: '40', city: 'یزد', doc: 'د. اکبر پور', pfile: '', pays: [], disc: {}, settled: false, rem: '', open: false,
  lines: [L('gbr1', 'د. اکبر پور', 3, 10500000, { t: { m: 'a', v: '2000000' } }), L('hard1', 'د.صادقی', 2, 8000000), L('gbr2', 'د.صادقی', 1, 10500000)] } });
ok(r.ok, 'paper file saved', r);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1400) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3200); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return { p, c } };
try {
  const { p, c } = await login('manager');
  ok(await p.evaluate(() => tileList().some(t => t.k === 'dr' && t.l === 'گزارش پزشکان')), 'the manager has the «گزارش پزشکان» tile');
  await p.evaluate(() => goTile('dr')); await W(2200);
  let D = await p.evaluate(() => { const t = document.querySelector('[data-ft="drDayT"]'); if (!t) return null; const th = [...t.querySelectorAll('thead th')].map(x => x.textContent); const rows = [...t.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim())); const ft = [...t.querySelectorAll('tfoot td')].map(x => x.textContent.trim()); return { th, rows, ft, title: document.querySelector('.drttl b').textContent } });
  ok(D && D.th[0] === 'نام خدمت' && D.th.includes('د. اکبر پور') && D.th.includes('د.صادقی') && D.th[D.th.length - 1] === 'جمع کل', 'daily sheet: services × doctors with «جمع کل»', D && D.th);
  const row = n => D.rows.find(x => x[0] === n); const ia = D.th.indexOf('د. اکبر پور'), is = D.th.indexOf('د.صادقی');
  ok(row('GBR 1') && row('GBR 1')[ia] === '۳' && row('GBR 2')[is] === '۱' && row('نسج سخت 1')[is] === '۲' && D.ft[D.ft.length - 1] === '۶', 'counts are units per doctor; total ۶', D);
  ok(D.rows.findIndex(x => x[0] === 'GBR 1') < D.rows.findIndex(x => x[0] === 'GBR 2') && D.rows.findIndex(x => x[0] === 'GBR 2') < D.rows.findIndex(x => x[0] === 'نسج سخت 1'), 'rows follow the order of the clinic sheet');
  ok(/شهید رهنمون/.test(D.title), 'yellow title like the sheet');
  const [pop] = await Promise.all([c.waitForEvent('page'), p.click('[data-drprint]')]); await pop.waitForLoadState(); await W(500);
  const P = await pop.evaluate(() => ({ y: !!document.querySelector('.y'), th: [...document.querySelectorAll('thead tr:last-child th')].map(x => x.textContent), foot: [...document.querySelectorAll('tfoot td')].map(x => x.textContent) }));
  ok(P.y && P.th[0] === 'نام خدمت' && P.foot[0] === 'جمع کل' && P.foot[P.foot.length - 1] === '۶', 'print page like the Excel sheet', P); await pop.close();
  await p.click('[data-drtab="det"]'); await W(500);
  D = await p.evaluate(() => { const t = document.querySelector('[data-ft="drDetT"]'); const th = [...t.querySelectorAll('thead th')].map(x => x.textContent); const tr = [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(x => x.textContent.trim())); return { th, tr } });
  const ix = n => D.th.indexOf(n); const g = D.tr.find(x => x[ix('خدمت')] === 'GBR 1');
  ok(g && g[ix('تخفیف کل')] === '۲٬۰۰۰٬۰۰۰' && g[ix('سهم پزشک')] === '۳۱٬۵۰۰٬۰۰۰' && g[ix('کسر از سهم پزشک')] === '۱٬۰۰۰٬۰۰۰' && g[ix('قابل پرداخت به پزشک')] === '۳۰٬۵۰۰٬۰۰۰' && g[ix('مبلغ گرفته‌شده از بیمار')] === '۲۹٬۵۰۰٬۰۰۰', 'detail row: total discount, doctor share, deduction, payable', { th: D.th, g });
  await p.selectOption('#drDoc', 'د.صادقی'); await W(400);
  D = await p.evaluate(() => [...document.querySelectorAll('[data-ft="drDetT"] tbody tr')].length); ok(D === 2, 'doctor filter', D);
  await p.click('[data-drtab="sum"]'); await W(500);
  D = await p.evaluate(() => ({ kpi: (document.querySelector('.kpis .kpi b') || {}).textContent || '', rows: [...document.querySelectorAll('[data-ft="drSumD"] tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ')) }));
  ok(/۲۶٬۵۰۰٬۰۰۰/.test(D.kpi) && D.rows.length === 1, 'per doctor: «قابل پرداخت به د.صادقی» = 16,000,000 + 10,500,000', D);
  await p.selectOption('#drDoc', ''); await W(300);
  D = await p.evaluate(() => [...document.querySelectorAll('[data-ft="drSumD"] tbody tr')].map(r => r.innerText.replace(/\s+/g, ' '))); ok(D.length === 2 && /۳۰٬۵۰۰٬۰۰۰/.test(D.join()), 'all doctors with what to pay each', D);
  await p.click('[data-drmap]'); await W(800); D = await p.evaluate(() => document.querySelectorAll('#drMapSh [data-drmk]').length); ok(D > 20, 'mapping table opens', D); await p.click('[data-drmapx]');
  await p.click('[data-drpre="w"]'); await W(1500); ok(await p.evaluate(() => DR.pk === 'w' && DR.d && DR.d.ok), 'period chips reload');
  ok(p.PE.length === 0, 'no page errors (manager)', p.PE);
  await p.screenshot({ path: '/home/claude/w/m35/dr.png' });
  // level tariffs in settings
  await p.evaluate(() => { const t = document.getElementById('tabSet'); if (t) t.click() }); await W(1000);
  D = await p.evaluate(() => [...document.querySelectorAll('#set_prices [data-tp^="lv_"]')].map(i => i.dataset.tp)); ok(D.length === 12 && D.includes('lv_gbrb'), 'level tariffs listed in settings', D);
  // phone
  const q = (await login('manager', 390)).p; await q.evaluate(() => goTile('dr')); await W(2000);
  const w = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); ok(w.sw <= w.iw + 1, 'phone: no sideways page scroll', w);
  for (const role of ['accountant', 'staff']) { const x = (await login(role)).p; ok(await x.evaluate(() => !tileList().some(t => t.k === 'dr')), role + ' has no «گزارش پزشکان» tile') }
  // a paper file uses the level tariff
  const s = (await login('staff')).p; h.sql(`update kv set v=json_set(v,'$.prices.lv_gbrb',json('{"price":"12000000","bp":{}}')) where k='settings'`);
  await s.reload(); await W(3000); D = await s.evaluate(() => { SET.prices.lv_gbrb = { price: '12000000', bp: {} }; return [A6C.gbr2.p({}), A6C.gbr1.p({}) ] }); ok(D[0] === 12000000 && D[1] !== 12000000, 'GBR ۲ takes its own tariff; GBR ۱ keeps the base', D);
} catch (e) { console.log('FAIL exception', e.stack); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
