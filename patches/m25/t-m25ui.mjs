// t-m25ui: «مرجوع سفارش» from the ☰ menu of the orders list, the «مرجوعی» badge and status filter, and the Hani-style «سفارشات تجدیدشده» table. Run: WORKER=<bundle> node t-m25ui.mjs
import { h, A, W, chromium, mk } from '../m24/probe.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const fin = async lid => { for (const s of h.sql(`select id from lab_step where lab='${lid}' order by idx`)) await h.call('lab', 'labStep', { lid, sid: s.id, op: 'quick', text: '' }); return h.call('lab', 'labSet', { lid, st: 'ready', note: '', by: 'لابراتوار' }) };
const a = await mk('الف مرجوعی', true), b2 = await mk('ب تجدیدی', true), c0 = await mk('ج در حال ساخت', true); await fin(a); await fin(b2);
await h.must('lab', 'lab5', { op: 'renew', lid: b2, from: '', reason: 'رنگ اشتباه بود' });
const D = lid => JSON.parse(h.sql(`select data from labs where id='${lid}'`)[0].data);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (vw) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click('[data-lrole="lab"]'); await p.fill('#lg_pw', A.PW.lab); await p.click('#lgGo'); await W(3500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const menu = async (p, lid) => { await p.evaluate(id => l6Menu(id), lid); await W(500); return p.evaluate(() => { const s = document.getElementById('l6MenuSh'); return s && !s.hidden ? [...s.querySelectorAll('.l6mbtn button')].map(x => x.textContent.trim()) : null }) };
try {
  let p = await login(1500);
  ok(await p.evaluate(() => /---------- m25 \(/.test(document.documentElement.innerHTML)), 'm25 marker in the page');
  await p.evaluate(() => l5Go('o/all')); await W(2500);
  ok(await p.evaluate(() => [...document.querySelectorAll('#l6fst option')].some(o => o.value === 'mrj' && o.textContent === 'مرجوعی')), 'status filter has «مرجوعی»');
  let m = await menu(p, c0); ok(m && !m.includes('مرجوع سفارش') && !m.includes('لغو مرجوعی'), 'an order in production has no «مرجوع سفارش»', m); await p.evaluate(() => { document.getElementById('l6MenuSh').hidden = true });
  m = await menu(p, a); ok(m && m.includes('مرجوع سفارش') && m.filter(x => x === 'مرجوع سفارش').length === 1, 'a sent order has «مرجوع سفارش» once', m);
  await p.click('[data-m25ret]'); await W(500);
  const f = await p.evaluate(() => { const s = document.getElementById('uxAskSh'); return s && !s.hidden ? { t: s.querySelector('h3').textContent, lbl: [...s.querySelectorAll('label')].map(l => l.childNodes[0].textContent.trim()), payer: [...s.querySelectorAll('[data-ak="2"] option')].map(o => o.textContent), ok: document.getElementById('uxAskOk').textContent, menuHidden: document.getElementById('l6MenuSh').hidden } : null });
  ok(f && /مرجوع سفارش #/.test(f.t) && f.lbl.length === 4 && /رایگان/.test(f.lbl[0]) && /هزینه/.test(f.lbl[1]) && /پرداخت‌کننده/.test(f.lbl[2]) && f.payer.includes('لابراتوار') && f.ok === 'ثبت مرجوعی' && f.menuHidden, 'return sheet: free / cost / payer / note', f);
  await p.click('#uxAskOk'); await W(900); ok(!D(a).mrj && await p.evaluate(() => { const t = document.getElementById('toast'); return !t.hidden && /هزینه‌ی بازگشت را بنویسید/.test(t.textContent) }), 'no cost and not free → refused with a message', D(a).mrj);
  await p.screenshot({ path: '/tmp/ret-refused.png' }); await p.evaluate(() => { const b = [...document.querySelectorAll('.sheet:not([hidden]) button')].find(x => /^(باشه|بستن|متوجه شدم|تأیید)$/.test(x.textContent.trim())); if (b) b.click(); document.querySelectorAll('.sheet').forEach(s => { s.hidden = true }) }); 
  m = await menu(p, a); await p.click('[data-m25ret]'); await W(500); await p.fill('#uxAskSh [data-ak="1"]', '۲۵۰۰۰۰'); await p.selectOption('#uxAskSh [data-ak="2"]', 'lab'); await p.fill('#uxAskSh [data-ak="3"]', 'شکستگی'); await p.click('#uxAskOk'); await W(2500);
  ok(D(a).mrj && D(a).mrj.cost === 250000 && D(a).mrj.payer === 'lab' && D(a).mrj.note === 'شکستگی', 'return stored from the page (Persian digits)', D(a).mrj);
  ok(await p.evaluate(id => { const r = [...document.querySelectorAll('#l5ol tbody tr')].find(tr => tr.querySelector(`[data-l6menu="${id}"]`)); return !!r && /مرجوعی/.test(r.textContent) }, a), 'the row shows the «مرجوعی» badge after the refresh');
  m = await menu(p, a); ok(m && m.includes('لغو مرجوعی') && !m.includes('مرجوع سفارش'), 'menu now offers «لغو مرجوعی»', m); await p.evaluate(() => { document.getElementById('l6MenuSh').hidden = true });
  await p.selectOption('#l6fst', 'mrj'); await p.evaluate(() => { const b = [...document.querySelectorAll('#viewLab button')].find(x => x.textContent.trim() === 'فیلتر'); if (b) b.click() }); await W(2000);
  ok(await p.evaluate(() => document.querySelectorAll('#l5ol tbody tr').length) === 1, 'filtering by «مرجوعی» leaves the one order');
  m = await menu(p, a); await p.click('[data-m25undo]'); await W(400); await p.click('#uxAskOk'); await W(2000); ok(!D(a).mrj, 'undo from the page');
  // ---- renewed
  await p.evaluate(() => l5Go('o/renewed')); await W(2500);
  const T = await p.evaluate(() => { const t = document.querySelector('.m25t'); return t ? { th: [...t.querySelectorAll('thead th')].map(x => x.textContent), rows: t.querySelectorAll('tbody tr').length, row: t.querySelector('tbody tr').textContent, staff: [...document.querySelectorAll('#m25by option')].map(o => o.textContent), oldFilter: !!document.getElementById('l6fst') } : null });
  ok(T && T.th.slice(0, 6).join('|') === 'ردیف|نام پزشک|نام بیمار|شماره سفارش|تاریخ تجدید|تجدید شده توسط' && T.rows === 1 && /ب تجدیدی/.test(T.row) && /رنگ اشتباه بود/.test(T.row) && T.staff.length === 2 && !T.oldFilter, '«تجدیدشده»: Hani columns, one row per renewal, employee list', T);
  await p.fill('#m25f', '۱۴۰۰/۰۱/۰۱'); await p.fill('#m25t', '۱۴۰۰/۰۱/۰۵'); await p.click('[data-m25go]'); await W(1500); ok(await p.evaluate(() => !document.querySelector('.m25t') && /ثبت نشده/.test(document.getElementById('m25box').textContent) && document.getElementById('m25f').value !== ''), 'date filter: an empty range says so and keeps the dates');
  await p.click('[data-m25rs]'); await W(1500); ok(await p.evaluate(() => document.querySelectorAll('.m25t tbody tr').length === 1 && document.getElementById('m25f').value === ''), '«بازنشانی» clears the filter');
  await p.selectOption('#m25by', { index: 1 }); await p.click('[data-m25go]'); await W(1500); ok(await p.evaluate(() => document.querySelectorAll('.m25t tbody tr').length === 1 && document.getElementById('m25by').selectedIndex === 1), 'employee filter keeps its row and its selection');
  await p.evaluate(() => l5Go('o/active')); await W(2000); ok(await p.evaluate(() => !!document.getElementById('l6fst') && !document.getElementById('m25box')), 'other order tabs still use the normal list');
  await p.screenshot({ path: '/tmp/renewed.png' });
  ok(p.PE.length === 0, 'desktop: no page errors', p.PE); await p.context().close();
  p = await login(390); await p.evaluate(() => l5Go('o/renewed')); await W(2500);
  const mob = await p.evaluate(async () => { window.scrollTo(-700, 0); await new Promise(r => setTimeout(r, 150)); const x = window.scrollX; window.scrollTo(0, 0); return { x, has: !!document.querySelector('.m25t') } }); ok(mob.has && mob.x === 0, 'phone: renewed table present, page does not scroll sideways', mob);
  await p.screenshot({ path: '/tmp/renewed-phone.png', fullPage: true }); ok(p.PE.length === 0, 'phone: no page errors', p.PE); await p.context().close();
} catch (e) { console.log('ERR', e.stack); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); await b.close(); h.stop(); process.exit(bad ? 1 : 0);
