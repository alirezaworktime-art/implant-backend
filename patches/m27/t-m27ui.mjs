// t-m27ui: «برون‌سپاری دپارتمان» from the workbench row menu, the badge, and the list «دپارتمان‌های برون‌سپاری‌شده». Run: WORKER=<bundle> node t-m27ui.mjs
import { h, A, W, chromium, mk } from '../m24/probe.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const a = await mk('الف برون‌سپار', true);
const O = () => JSON.parse(h.sql(`select data from labs where id='${a}'`)[0].data).outs || {};
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (vw) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click('[data-lrole="lab"]'); await p.fill('#lg_pw', A.PW.lab); await p.click('#lgGo'); await W(3500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const menu = async p => { await p.evaluate(id => { const bt = document.querySelector(`#viewLab [data-l6b="more"][data-lid="${id}"]`); bt.click() }, a); await W(600); return p.evaluate(() => { const s = document.getElementById('l6MenuSh'); return s && !s.hidden ? [...s.querySelectorAll('.l6mbtn button')].map(x => x.textContent.trim()) : null }) };
try {
  const p = await login(1500);
  ok(await p.evaluate(() => /---------- m27 \(/.test(document.documentElement.innerHTML)), 'm27 marker in the page');
  await p.evaluate(() => l5Go('bench')); await W(2500);
  ok(await p.evaluate(id => !!document.querySelector(`#viewLab [data-l6b="more"][data-lid="${id}"]`), a), 'the order is on the workbench');
  let m = await menu(p); ok(m && m.filter(x => x === 'برون‌سپاری دپارتمان').length === 1, 'row menu has «برون‌سپاری دپارتمان» once', m);
  await p.click('[data-m27="out"]'); await W(500);
  let f = await p.evaluate(() => { const s = document.getElementById('uxAskSh'); return s && !s.hidden ? { t: s.querySelector('h3').textContent, lbl: [...s.querySelectorAll('label')].map(l => l.childNodes[0].textContent.trim()), ok: document.getElementById('uxAskOk').textContent, mh: document.getElementById('l6MenuSh').hidden } : null });
  ok(f && /^برون‌سپاری «/.test(f.t) && f.lbl.length === 2 && /نام شرکت/.test(f.lbl[0]) && f.ok === 'ثبت برون‌سپاری' && f.mh, 'sheet: company + note', f);
  await p.click('#uxAskOk'); await W(1000); ok(!Object.keys(O()).length && await p.evaluate(() => { const t = document.getElementById('toast'); return !t.hidden && /نام شرکت/.test(t.textContent) }), 'empty company → message, nothing stored');
  await p.evaluate(() => document.querySelectorAll('.sheet').forEach(s => { s.hidden = true })); m = await menu(p); await p.click('[data-m27="out"]'); await W(500);
  await p.fill('#uxAskSh [data-ak="0"]', 'لابراتوار تاج'); await p.fill('#uxAskSh [data-ak="1"]', 'فریم'); await p.click('#uxAskOk'); await W(2800);
  const sid = Object.keys(O())[0]; ok(sid && O()[sid].co === 'لابراتوار تاج' && O()[sid].st === 'out', 'stored from the page', O());
  /* since m36 the workbench is cards: the badge is on the order's card */
  ok(await p.evaluate(id => { const bt = document.querySelector(`#viewLab [data-l6b="more"][data-lid="${id}"]`), cd = bt && bt.closest('.m36card'), pl = cd && cd.querySelector('.m27o'); return !!pl && /برون‌سپاری: لابراتوار تاج/.test(pl.textContent) }, a), 'the workbench row shows the badge in the department cell');
  await p.screenshot({ path: '/tmp/bench.png' });
  m = await menu(p); ok(m && m.includes('برگشت از برون‌سپاری (لابراتوار تاج)') && !m.includes('برون‌سپاری دپارتمان'), 'menu now offers the return', m); await p.evaluate(() => { document.getElementById('l6MenuSh').hidden = true });
  // ---- list
  ok(await p.evaluate(() => [...document.querySelectorAll('#viewLab [data-l5go],#viewLab nav button,#viewLab .l5nav button')].some(x => /کارهای بیرون‌سپرده/.test(x.textContent)) || /کارهای بیرون‌سپرده/.test(document.getElementById('viewLab').textContent)), 'side menu has the list');
  await p.evaluate(() => l5Go('o/outs')); await W(2500);
  let T = await p.evaluate(() => ({ th: [...document.querySelectorAll('.m27t thead th')].map(t => t.textContent), rows: [...document.querySelectorAll('.m27t tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ')) }));
  ok(T.th.slice(0, 9).join('|') === 'ردیف|نام شرکت|تاریخ ثبت|دپارتمان|سفارش|بیمار|ثبت‌کننده|وضعیت|توضیح' && T.rows.length === 1 && /لابراتوار تاج/.test(T.rows[0]) && /الف برون‌سپار/.test(T.rows[0]) && /نزد شرکت بیرونی/.test(T.rows[0]) && /فریم/.test(T.rows[0]), 'list table like Hani', T);
  await p.screenshot({ path: '/tmp/list.png' });
  await p.selectOption('#m27st', 'back'); await p.click('[data-m27go]'); await W(2000); ok(await p.evaluate(() => document.querySelectorAll('.m27t tbody tr').length === 0 && /موردی نیست/.test(document.getElementById('m27box').textContent)), 'filter «برگشته» → empty');
  await p.selectOption('#m27st', 'out'); await p.fill('#m27f', 'چرت'); await p.click('[data-m27go]'); await W(600); ok(await p.evaluate(() => { const t = document.getElementById('toast'); return !t.hidden && /تاریخ را/.test(t.textContent) }), 'bad date → message');
  await p.fill('#m27f', ''); await p.click('[data-m27go]'); await W(2000);
  await p.click('[data-m27lb]'); await W(500); await p.click('#uxAskOk'); await W(2500);
  ok(O()[sid].st === 'back' && h.sql(`select st from lab_step where id='${sid}'`)[0].st !== 'done', 'return from the list: marked back, step still open', O()[sid]);
  ok(await p.evaluate(() => document.querySelectorAll('.m27t tbody tr').length) === 0, 'it leaves the «نزد شرکت بیرونی» list');
  await p.selectOption('#m27st', ''); await p.click('[data-m27go]'); await W(2000); ok(await p.evaluate(() => { const r = document.querySelector('.m27t tbody tr'); return !!r && /برگشته/.test(r.textContent) && !r.querySelector('[data-m27lb]') }), '«همه» shows it as returned without the button');
  await p.evaluate(() => l5Go('bench')); await W(2500); ok(await p.evaluate(() => !document.querySelector('#viewLab .m27o')), 'badge gone from the workbench');
  // phone
  const q = await login(390); await q.evaluate(() => l5Go('o/outs')); await W(2500); ok(await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'phone: no sideways scroll on the list', await q.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])); await q.screenshot({ path: '/tmp/list-phone.png' });
  ok(p.PE.length === 0 && q.PE.length === 0, 'no page errors', [p.PE, q.PE]);
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 700)) }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
