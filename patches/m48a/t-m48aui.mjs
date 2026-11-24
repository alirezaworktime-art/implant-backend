// t-m48aui: m48a page changes. Run: WORKER=<m48a bundle> node t-m48aui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href);
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const PE = []; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const p1 = await h.add('نمونه یک'); await h.plan(p1, 'نمونه یک');                       // waiting for the consultant
const p2 = await h.add('نمونه دو'); await h.plan(p2, 'نمونه دو'); await h.confirm(p2, 'نمونه دو', 'book'); // confirmed
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); p.on('dialog', x => x.dismiss()); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const vis = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.offsetParent !== null }, s);
try {
  // ---------- consultant: form
  const c = await login('consultant');
  ok(await c.evaluate(() => /---------- m48a \(/.test(document.documentElement.innerHTML)), 'm48a marker in the page');
  await c.evaluate(async id => { const j = await api('get', { id }); openForm(fromDoc(id, j.data || {})) }, p1); await W(1200);
  let s = await c.evaluate(() => ({ more: !!document.querySelector('#m11More .m48more'), bar: (document.getElementById('m48BarMore') || {}).textContent || '', gen: !!document.getElementById('m48GenC'), hid: document.querySelectorAll('#viewForm .m11hide:not(.m11show)').length }));
  ok(s.more && s.bar === 'درمان‌های انتخاب‌نشده' && s.hid > 0, '(3) the «not chosen» button is styled and is also in the floating bar', s);
  ok(await vis(c, '#m48BarMore'), '(3) bar button is visible');
  await c.click('#m48BarMore'); await W(400); s = await c.evaluate(() => ({ show: M11_SHOW, bar: document.getElementById('m48BarMore').textContent, hid: document.querySelectorAll('#viewForm .m11hide:not(.m11show)').length }));
  ok(s.show === true && s.hid === 0 && /پنهان/.test(s.bar), '(3) the bar button opens the hidden treatments', s);
  // (2) general dentist flag
  ok(s && await c.evaluate(() => !!document.getElementById('m48GenC') && !document.getElementById('m48GenB')), '(2) the option is in the form, no banner yet');
  await c.check('#m48GenC'); await W(200); await c.fill('#m48GenN', 'ترمیم دو دندان'); await W(200);
  s = await c.evaluate(() => ({ gen: F.h.gen, n: F.h.genN, b: (document.getElementById('m48GenB') || {}).textContent || '' })); ok(s.gen === 1 && s.n === 'ترمیم دو دندان' && /دندانپزشک عمومی/.test(s.b) && /ترمیم دو دندان/.test(s.b) && /پذیرش/.test(s.b), '(2) ticking it shows the banner for the consultant', s);
  // (7) result sheet after a failed attempt
  await c.click('#confirmBtn'); await W(400); ok(await c.evaluate(() => !document.getElementById('outSheet').hidden), '(7) a first press asks the result'); await c.click('#outClose'); await W(200);
  await c.evaluate(() => { F._next = 'book' }); await c.click('#confirmBtn'); await W(400);
  ok(await c.evaluate(() => !document.getElementById('outSheet').hidden), '(7) after a failed attempt the four choices are asked again'); ok(await c.evaluate(() => document.querySelectorAll('#outSheet [data-out]').length === 4 && !F._next), '(7) four choices, old choice forgotten');
  await c.click('#outClose'); await W(200);
  await c.click('#saveBtn'); await W(1800);
  const d1 = JSON.parse(h.sql(`select data from plans where id='${p1}'`)[0].data || '{}'); ok(d1.h && d1.h.gen === 1 && d1.h.genN === 'ترمیم دو دندان', '(2) stored with the plan', d1.h);
  // notes for (5)
  const nr = await c.evaluate(async ([id, png]) => { const o = []; for (const q of [{ op: 'add', id, stage: 'plan', kind: 'text', text: 'NOTETEXT تایپی', by: 'د. تست', author: 'د. تست' }, { op: 'add', id, stage: 'cons', kind: 'pen', img: png, text: 'PENCAP', by: 'د. تست', author: 'د. تست' }]) { try { await api('fxNote', q); o.push('ok') } catch (e) { o.push(e.message) } } return o.join() }, [p2, png]); ok(nr === 'ok,ok', 'notes written', nr);
  // (5) plan PDF
  s = await c.evaluate(async id => { const tx = [], im = []; const ft = CanvasRenderingContext2D.prototype.fillText, di = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.fillText = function (t) { tx.push(String(t)); return ft.apply(this, arguments) }; CanvasRenderingContext2D.prototype.drawImage = function (i) { im.push(String(i && i.src || '').slice(0, 22)); return di.apply(this, arguments) };
    try { const j = await api('get', { id }); const r = fromDoc(id, j.data || {}); r.status = j.status; const o = {}; let a = tx.length, b = im.length; await buildPDF(r, { title: 'طرح درمان', dateLine: '' }); o.plan = { t: tx.slice(a).filter(x => /NOTETEXT|PENCAP|توضیحات پرونده/.test(x)), i: im.slice(b).filter(x => /^data:image\/png/.test(x)).length };
      a = tx.length; b = im.length; await buildPDF(r, { title: 'استعلام', dateLine: '', quote: 1 }); o.quote = tx.slice(a).filter(x => /NOTETEXT/.test(x)).length;
      const j2 = JSON.parse(JSON.stringify(j)); j2.data.arc = { v6: 1, lines: [], other: '', note: '' }; j2.nofin = 1; a = tx.length; b = im.length; await a6Pdf(j2); o.paper = { t: tx.slice(a).filter(x => /NOTETEXT|PENCAP|توضیحات پرونده/.test(x)), i: im.slice(b).filter(x => /^data:image\/png/.test(x)).length };
      a = tx.length; await fullFilePDF(j); o.full = tx.slice(a).filter(x => /NOTETEXT/.test(x)).length; return o } finally { CanvasRenderingContext2D.prototype.fillText = ft; CanvasRenderingContext2D.prototype.drawImage = di } }, p2);
  ok(s.plan && s.plan.t.length === 3, '(5) «PDF طرح» prints the typed comment and the caption of the pen comment', s.plan); ok(s.plan && s.plan.i >= 2, '(5) «PDF طرح» draws the pen comment', s.plan);
  ok(s.quote === 0, '(5) the price-inquiry PDF stays without comments', s.quote);
  ok(s.paper && s.paper.t.length === 3 && s.paper.i >= 2, '(5) the PDF of a paper file prints both comments', s.paper); ok(s.full === 1, '(5) the full PDF still prints them once', s.full);
  // ---------- reception
  const st = await login('staff');
  await st.evaluate(id => openFile(id, 'نمونه یک'), p1); await W(1500);
  ok(await st.evaluate(() => { const b = document.querySelector('#pfBody .m48genb'); return !!b && /دندانپزشک عمومی/.test(b.textContent) && /ویزیت/.test(b.textContent) && /ترمیم دو دندان/.test(b.textContent) }), '(2) reception sees it at the top of the patient file');
  await st.evaluate(id => openFile(id, 'نمونه دو'), p2); await W(1500); ok(await st.evaluate(() => !document.querySelector('#pfBody .m48genb')), '(2) no banner for other patients');
  await st.click('#pfBody [data-pft="cm"]'); await W(500);
  s = await st.evaluate(() => ({ img: document.querySelectorAll('#pfBody .m42bc img.fxn-img').length, pr: !!document.getElementById('m48CmPrint'), n: document.querySelectorAll('#pfBody .m42bc').length })); ok(s.img === 1 && s.pr && s.n >= 2, '(5) «همه‌ی توضیح‌ها»: the pen comment shows its image; a print button', s);
  await st.evaluate(() => { window.__ph = ''; const _p = printHTML; printHTML = function (x) { window.__ph = x } }); await st.click('#m48CmPrint'); await W(300);
  ok(await st.evaluate(() => /NOTETEXT/.test(window.__ph) && /<img/.test(window.__ph) && /نمونه دو/.test(window.__ph)), '(5) the print has the comments with the pen image');
  // (1) money
  await st.evaluate(() => { document.getElementById('pfSheet').hidden = true }); await st.evaluate(async id => { const j = await api('get', { id }); openPostConfirm(fromDoc(id, j.data || {})) }, p2); await W(800);
  ok(await st.evaluate(() => !document.getElementById('pcSheet').hidden), 'the collection sheet is open');
  await st.click('#pc_cash'); await st.keyboard.press('Control+A'); await st.keyboard.type('12500000'); await W(150);
  s = await st.evaluate(() => ({ v: document.getElementById('pc_cash').value, n: PC.rcash, w: (document.querySelector('#pc_cash + .m48w') || {}).textContent || '' }));
  ok(s.v === '12,500,000' && s.n === 12500000 && s.w === '۱۲ میلیون و ۵۰۰ هزار تومان', '(1) separators while typing + the amount in words', s);
  await st.evaluate(() => { const i = document.getElementById('pc_cash'); i.setSelectionRange(2, 2) }); await st.keyboard.type('3'); await W(150);
  s = await st.evaluate(() => ({ v: document.getElementById('pc_cash').value, n: PC.rcash, pos: document.getElementById('pc_cash').selectionStart, w: document.querySelector('#pc_cash + .m48w').textContent }));
  ok(s.v === '123,500,000' && s.n === 123500000 && s.pos === 3 && s.w === '۱۲۳ میلیون و ۵۰۰ هزار تومان', '(1) editing in the middle keeps the caret and regroups', s);
  await st.keyboard.press('Backspace'); await W(150); s = await st.evaluate(() => ({ v: document.getElementById('pc_cash').value, pos: document.getElementById('pc_cash').selectionStart })); ok(s.v === '12,500,000' && s.pos === 2, '(1) deleting a digit regroups', s);
  await st.keyboard.press('Control+A'); await st.keyboard.type('۹۵۰'); await W(100); s = await st.evaluate(() => document.getElementById('pc_cash').value); ok(s === '۹۵۰', '(1) short numbers are left as typed', s);
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
