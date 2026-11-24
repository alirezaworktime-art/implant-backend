// t-m34ui: paper file «پایه ایمپلنت» — «جدید / کاشت مجدد اول / دوم» are independent tabs. Run: WORKER=<bundle> node t-m34ui.mjs
import { h, A, W, chromium } from '../m24/probe.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 900))); if (!c) bad++ };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1400, height: 1000 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
await p.goto(h.url); await p.click('[data-lrole="staff"]'); await p.fill('#lg_pw', A.PW.staff); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
const pickBrand = async () => { const st = await p.evaluate(() => ({ b: document.querySelectorAll('#arbSh [data-arbb]').length }));
  await p.evaluate(() => { const x = document.querySelector('#arbSh [data-arbb]'); if (x) x.click() }); await W(200);
  await p.evaluate(() => { const x = document.querySelector('#arbSh [data-arbd]'); if (x) x.click() }); await W(200);
  await p.evaluate(() => { const x = document.querySelector('#arbSh [data-arbl]'); if (x) x.click() }); await W(200);
  for (const [k, v] of [['arbbi', 'JD'], ['arbdi', '4.3'], ['arbli', '10']]) { const el = await p.$(`#arbSh [data-${k}]`); if (el && await el.isVisible()) { await el.fill(v); await el.dispatchEvent('input'); await el.dispatchEvent('change'); await W(120) } }
  await p.click('#arbOk'); await W(350); const m = await p.evaluate(() => !document.getElementById('arbSh').hidden ? document.getElementById('arbMsg').textContent : '');
  if (m) { console.log('arb msg', m, JSON.stringify(st)); await p.evaluate(() => arbClose()) } };
const vis = () => p.evaluate(() => { const L = [...document.querySelectorAll('[data-a6p="imp"] .a6l')].filter(x => !x.hidden); return L.map(el => { const id = el.dataset.l, l = A6.lines.find(y => y.id === id); return { id, ri: +l.ri || 0, teeth: l.teeth.slice().sort().join(','), head: el.querySelector('.a6lh b').textContent, tabs: [...el.querySelectorAll('[data-m34ri]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join('|') } }) });
const tap = async (id, t) => { await p.click(`.a6l[data-l="${id}"] .a6t[data-a6t="${t}"]`); await W(350); if (await p.evaluate(() => !document.getElementById('arbSh').hidden)) await pickBrand() };
try {
  await p.evaluate(() => fxArcOpen(null)); await W(2000);
  await p.click('[data-a6k="imp"]'); await W(500);
  let V = await vis(); const id0 = V[0].id;
  await p.fill(`[data-a6f="dayJ"][data-l="${id0}"]`, '1405/07/01'); await p.keyboard.press('Tab');
  await p.evaluate(id => { const s = document.querySelector(`[data-a6f="doc"][data-l="${id}"]`); s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })) }, id0);
  for (const t of ['UR6', 'UL6', 'LL6']) await tap(id0, t);
  V = await vis(); ok(V.length === 1 && V[0].ri === 0 && V[0].teeth === 'LL6,UL6,UR6' && /جدید \(۳\)\*/.test(V[0].tabs), '«جدید» has the 3 teeth', V);
  await p.click(`.a6l[data-l="${id0}"] [data-m34ri="1"]`); await W(500);
  V = await vis(); const id1 = V[0].id;
  ok(V.length === 1 && id1 !== id0 && V[0].ri === 1 && V[0].teeth === '' && /کاشت مجدد اول\*/.test(V[0].tabs) && /جدید \(۳\)/.test(V[0].tabs), '«کاشت مجدد اول» opens empty, «جدید (۳)» stays', V);
  const L1 = await p.evaluate(id => { const l = A6.lines.find(x => x.id === id); return { day: l.day, doc: l.doc } }, id1); ok(L1.day && L1.doc, 'the new tab took the date and doctor', L1);
  await tap(id1, 'LR7');
  await p.click(`.a6l[data-l="${id1}"] [data-m34ri="2"]`); await W(500); V = await vis(); const id2 = V[0].id;
  await tap(id2, 'UR5'); await tap(id2, 'UL5');
  const all = await p.evaluate(() => A6.lines.filter(l => l.k === 'imp').map(l => [+l.ri || 0, l.teeth.slice().sort().join(','), l.grp]));
  ok(all.length === 3 && all[0][1] === 'LL6,UL6,UR6' && all[1][1] === 'LR7' && all[2][1] === 'UL5,UR5' && new Set(all.map(x => x[2])).size === 1, 'each tab keeps its own teeth (same session group)', all);
  await p.click(`.a6l[data-l="${id2}"] [data-m34ri="0"]`); await W(500); V = await vis();
  ok(V.length === 1 && V[0].id === id0 && V[0].teeth === 'LL6,UL6,UR6' && /جدید \(۳\)\*/.test(V[0].tabs) && /اول \(۱\)/.test(V[0].tabs) && /دوم \(۲\)/.test(V[0].tabs), 'back to «جدید»: its 3 teeth are untouched; tab counts shown', V);
  await p.click(`.a6l[data-l="${id0}"] .a6t[data-a6t="UL6"]`); await W(350); await p.click('#arbDel'); await W(400); if (await p.evaluate(() => !!UXA)) { await p.click('#uxAskOk'); await W(300) } const t0 = await p.evaluate(id => A6.lines.find(x => x.id === id).teeth.slice().sort().join(','), id0);
  const t1 = await p.evaluate(id => A6.lines.find(x => x.id === id).teeth.join(','), id1); ok(t0 === 'LL6,UR6' && t1 === 'LR7', 'changing «جدید» does not touch «کاشت مجدد اول»', { t0, t1 });
  const bill = await p.evaluate(() => [...document.querySelectorAll('#a6Tab tbody tr')].map(t => t.innerText.replace(/\s+/g, ' ')).filter(t => /ایمپلنت|مجدد/.test(t)));
  ok(bill.length >= 3, 'the bill has a row per tab', bill); ok(await p.evaluate(() => /پایه ایمپلنت ✓$/.test(document.querySelector('[data-a6k="imp"]').textContent.trim())), 'the side list shows one session', await p.evaluate(() => document.querySelector('[data-a6k="imp"]').textContent));
  await p.screenshot({ path: '/tmp/tabs.png', fullPage: false });
  // save and reopen
  await p.evaluate(() => { const i = [...document.querySelectorAll('#a6Root input')].find(x => x.closest('label') && /نام و نام خانوادگی/.test(x.closest('label').textContent)); i.value = 'تست تب‌ها'; i.dispatchEvent(new Event('input', { bubbles: true })) });
  await p.click('#a6Save'); await W(2500); if (await p.evaluate(() => !!UXA)) { await p.click('#uxAskOk'); await W(2500) }
  const msg = await p.evaluate(() => ($('a6Msg') || {}).textContent || ''); const row = h.sql("select id, data from plans where name='تست تب‌ها'")[0];
  ok(!!row, 'saved', msg);
  if (row) { const L = JSON.parse(row.data).arc.lines.filter(l => l.k === 'imp').map(l => [l.ri || 0, l.teeth.slice().sort().join(','), l.grp]);
    ok(L.length === 3 && L.find(x => x[0] === 0)[1] === 'LL6,UR6' && L.find(x => x[0] === 1)[1] === 'LR7' && L.find(x => x[0] === 2)[1] === 'UL5,UR5' && new Set(L.map(x => x[2])).size === 1 && L[0][2], 'server stored three lines with one group', L);
    const j = await p.evaluate(async id => { const j = await api('get', { id }); fxArcOpen(j); return 1 }, row.id); await W(2500); await p.evaluate(() => { A6.op.add('imp'); a6Render() }); await W(400);
    V = await vis(); ok(V.length === 1 && /جدید \(۲\)\*/.test(V[0].tabs) && /اول \(۱\)/.test(V[0].tabs) && /دوم \(۲\)/.test(V[0].tabs), 'reopening shows one session with three tabs', V) }
  // empty single session: just switches kind
  await p.evaluate(() => fxArcOpen(null)); await W(1500); if (await p.evaluate(() => !!UXA)) { await p.click('#uxAskOk'); await W(1500) }
  await p.click('[data-a6k="imp"]'); await W(400); V = await vis(); await p.click(`.a6l[data-l="${V[0].id}"] [data-m34ri="1"]`); await W(400);
  const n = await p.evaluate(() => A6.lines.filter(l => l.k === 'imp').map(l => +l.ri || 0)); ok(n.length === 1 && n[0] === 1, 'an empty session just changes to «کاشت مجدد اول» (no extra empty line)', n);
  ok(p.PE.length === 0, 'no page errors', p.PE);
} catch (e) { console.log('FAIL exception', e.stack); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
