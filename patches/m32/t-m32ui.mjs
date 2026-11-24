// t-m32ui: every drop-down opens a searchable picker. Run: WORKER=<bundle> node t-m32ui.mjs
import { h, A, W, chromium } from '../m24/probe.mjs'; import { uuid } from '../audit/A.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const mkS = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
await mkS('بیمار جستجو');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1400, touch = false) => { const c = await b.newContext({ viewport: { width: vw, height: touch ? 780 : 1000 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran', hasTouch: touch, isMobile: touch }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3200); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const openImpSheet = async p => { await p.evaluate(() => goTile('surg')); await W(900); await p.evaluate(n => { const x = QITEMS.find(q => q.name === n); openSurg(x) }, 'بیمار جستجو'); await W(1500); await p.click('[data-m31pf]'); await W(400); await p.click('#m31Pf button.t[data-m31t="LL5"]'); await W(700) };
const pk = p => p.evaluate(() => { const o = document.querySelector('.m32ov'); if (!o) return null; return { title: o.querySelector('.m32t').textContent, n: o.querySelectorAll('.m32o').length, vis: [...o.querySelectorAll('.m32o')].filter(x => !x.hidden).map(x => x.textContent), cur: (o.querySelector('.m32o.cur') || {}).textContent || '', act: (o.querySelector('.m32o.act') || {}).textContent || '', none: !o.querySelector('.m32n').hidden, focus: document.activeElement && document.activeElement.className } });
try {
  const p = await login('lab');
  ok(await p.evaluate(() => /---------- m32 \(/.test(document.documentElement.innerHTML)), 'm32 marker in the page');
  /* since m36 the workbench has no page-size list; the real list under test is the widest one in the filters of «همه‌ی سفارش‌ها» */
  await p.evaluate(() => l5Go('o/all')); await W(1500); await p.evaluate(() => { const d = document.getElementById('l6fp'); if (d) d.open = true; const c = [...document.querySelectorAll('#l6fp select')].filter(x => x.offsetParent !== null).sort((a, b) => b.options.length - a.options.length)[0]; c.setAttribute('data-t32', '1') }); await W(200);
  const before = await p.evaluate(() => { const c = document.querySelector('[data-t32]'); window.__ev = []; c.addEventListener('change', () => __ev.push('change:' + c.value)); c.addEventListener('input', () => __ev.push('input:' + c.value)); return { v: c.value, opts: [...c.options].map(o => o.textContent.trim()), vals: [...c.options].map(o => o.value) } });
  // (1) mouse
  await p.click('[data-t32]'); await W(300); let S = await pk(p);
  ok(S && S.n === before.opts.length && S.vis.length === S.n && S.focus === 'm32q', 'a click on a real list (lab cartable, #l6bp) opens the picker with all options and the cursor in the search box', S);
  ok(S && S.title && S.title !== 'انتخاب', 'the picker carries the field label as its title', S && S.title);
  const target = before.opts.findIndex((t, i) => before.vals[i] !== before.v && t.length > 1); const word = before.opts[target].split(' ')[0].slice(0, 3);
  await p.keyboard.type(word); await W(200); S = await pk(p);
  ok(S && S.vis.length >= 1 && S.vis.length <= S.n && S.vis.every(t => t.includes(word)) && S.vis.includes(before.opts[target]), 'typing narrows the list to matching names', { word, S });
  await p.keyboard.type('zzzqq'); await W(150); S = await pk(p); ok(S && S.vis.length === 0 && S.none, 'no match → «موردی پیدا نشد»', S);
  await p.fill('.m32q', word); await W(150);
  await p.click(`.m32o:not([hidden]) >> text="${before.opts[target]}"`); await W(400);
  S = await p.evaluate(() => ({ open: !!document.querySelector('.m32ov'), v: document.querySelector('[data-t32]').value, ev: __ev.slice(), foc: document.activeElement && (document.activeElement.hasAttribute('data-t32') ? 'l6bp' : document.activeElement.id) }));
  ok(!S.open && S.v === before.vals[target] && S.ev.join() === `input:${S.v},change:${S.v}` && S.foc === 'l6bp', 'picking sets the value, fires input+change once, closes the picker and returns focus', S);
  // same value → no event
  await p.click('[data-t32]'); await W(250); S = await pk(p); ok(S && S.cur === before.opts[target] && S.act === S.cur, 'reopening marks the current choice', S);
  await p.keyboard.press('Enter'); await W(250); ok(await p.evaluate(() => !document.querySelector('.m32ov') && __ev.length === 2), 'choosing the same item again fires nothing');
  // (2) Esc closes only the picker
  await p.click('[data-t32]'); await W(200); await p.keyboard.press('Escape'); await W(250);
  ok(await p.evaluate(() => !document.querySelector('.m32ov') && __ev.length === 2), 'Esc closes the picker without choosing');
  await p.click('[data-t32]'); await W(200); await p.mouse.click(8, 8); await W(250);
  ok(await p.evaluate(() => !document.querySelector('.m32ov') && __ev.length === 2), 'a click on the dark area closes the picker without choosing');
  // (3) keyboard
  await p.focus('[data-t32]'); await p.keyboard.press('ArrowDown'); await W(250); S = await pk(p); ok(!!S, 'keyboard: ArrowDown on a focused list opens the picker');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await W(100); const act = (await pk(p)).act;
  await p.keyboard.press('Enter'); await W(300); S = await p.evaluate(() => { const c = document.querySelector('[data-t32]'); return { open: !!document.querySelector('.m32ov'), t: c.options[c.selectedIndex].textContent.trim() } });
  ok(!S.open && S.t === act, 'arrows move, Enter chooses the highlighted item', { S, act });
  await p.focus('[data-t32]'); if (/^[\x20-\x7e]$/.test(word[0])) await p.keyboard.press(word[0]); else await p.evaluate(k => document.querySelector('[data-t32]').dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })), word[0]); /* a Persian letter cannot be pressed by the test driver */ await W(250); S = await p.evaluate(() => { const q = document.querySelector('.m32q'); return q && q.value });
  ok(S === word[0], 'typing a letter on a focused list opens the picker with that letter in the search box', S); await p.keyboard.press('Escape'); await W(150);
  // (4) synthetic list: groups, duplicates, disabled, Arabic letters, digits, re-render
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'tWrap'; d.style.cssText = 'position:fixed;top:4px;left:4px;z-index:5000;background:#fff;padding:6px';
    let o = '<option value="">انتخاب پزشک…</option><optgroup label="جراحان">'; for (let i = 0; i < 300; i++) o += `<option value="d${i}">دکتر ${['علی', 'كاظم', 'يوسف', 'آرش', 'مهدی'][i % 5]} شماره ${i}</option>`; o += '</optgroup><optgroup label="پروتز"><option value="x" disabled>غیرفعال</option><option value="dup">تکراری</option><option value="dup">تکراری دوم</option></optgroup>';
    d.innerHTML = `<label>پزشک معالج<select id="tSel">${o}</select></label><select id="tDis" disabled><option>الف</option></select><select id="tMul" multiple><option>الف</option><option>ب</option></select>`; document.body.appendChild(d);
    window.__t = []; document.addEventListener('change', e => { if (e.target.id === 'tSel') __t.push(e.target.value + '|' + e.target.selectedIndex) }) });
  await p.click('#tSel'); await W(300); S = await pk(p);
  ok(S && S.title === 'پزشک معالج' && S.n === 304, 'a 300-name list: title from its label, every option listed', S && { t: S.title, n: S.n });
  await p.keyboard.type('کاظم ۲۱'); await W(200); S = await pk(p);
  ok(S && S.vis.length > 0 && S.vis.every(t => /كاظم/.test(t) && /21/.test(t)), 'search ignores Arabic/Persian letter forms and digit forms, and matches every typed word', S && S.vis.slice(0, 5));
  await p.fill('.m32q', 'ارش 7'); await W(150); S = await pk(p); ok(S && S.vis.length > 0 && S.vis.every(t => /آرش/.test(t)), '«ارش» finds «آرش»', S && S.vis.slice(0, 3));
  await p.fill('.m32q', 'پروتز'); await W(150); S = await pk(p); ok(S && S.vis.length === 3, 'the group name finds the items of that group', S && S.vis);
  await p.fill('.m32q', 'غیرفعال'); await W(150); await p.keyboard.press('Enter'); await W(200); ok(await p.evaluate(() => !!document.querySelector('.m32ov') && __t.length === 0), 'a disabled option cannot be chosen');
  await p.fill('.m32q', 'تکراری دوم'); await W(150); await p.keyboard.press('Enter'); await W(250);
  ok(await p.evaluate(() => { const s = document.getElementById('tSel'); return __t.join() === 'dup|303' && s.selectedIndex === 303 }), 'two options with the same value: the one that was chosen is selected', await p.evaluate(() => __t));
  await p.click('#tSel'); await W(200); await p.evaluate(() => { const s = document.getElementById('tSel'); const n = s.cloneNode(true); s.replaceWith(n) }); await p.fill('.m32q', 'شماره 17'); await W(150); await p.click('.m32o:not([hidden])'); await W(250);
  ok(await p.evaluate(() => document.getElementById('tSel').value === 'd17' && __t.slice(-1)[0] === 'd17|18'), 'if the page redraws the list while the picker is open, the choice still lands on the new list', await p.evaluate(() => __t));
  await p.click('#tDis', { force: true }); await W(200); const dis = await pk(p); await p.click('#tMul option', { force: true }).catch(() => {}); await W(200);
  ok(!dis && !(await pk(p)), 'disabled and multi-select lists are left alone');
  await p.evaluate(() => document.getElementById('tWrap').remove());
  // (4b) a list inside a confirm dialog (lab «＋ نوع کار تازه»): Esc closes the picker only; Enter on the list still confirms the dialog
  await p.evaluate(() => l5Go('d/wt')); await W(1500); await p.evaluate(() => { const x = [...document.querySelectorAll('#viewLab .acts button.main')].filter(x => x.offsetParent !== null)[0]; x.click() }); await W(800);
  const dlg = await p.evaluate(() => { const s = [...document.querySelectorAll('select[data-ak]')].find(s => s.offsetParent !== null && s.getBoundingClientRect().width > 30 && !s.hasAttribute('data-l8ss')); if (!s) return { all: [...document.querySelectorAll('[data-ak]')].map(e => e.tagName + (e.hasAttribute('data-l8ss') ? '*' : '')).join() }; s.id = s.id || 'tAk'; return { id: s.id, n: s.options.length, ux: !!UXA } });
  ok(dlg && dlg.ux && dlg.n > 1, 'a confirm dialog with a list is open', dlg);
  if (dlg) { await p.click('#' + dlg.id); await W(250); ok(!!(await pk(p)), 'the list inside the dialog opens the picker'); await p.keyboard.press('Escape'); await W(250);
    S = await p.evaluate(() => ({ pk: !!document.querySelector('.m32ov'), ux: !!UXA && !UXA.s.hidden })); ok(!S.pk && S.ux, 'Esc closes the picker and the dialog stays', S);
    await p.click('#' + dlg.id); await W(250); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await W(250);
    S = await p.evaluate(id => ({ pk: !!document.querySelector('.m32ov'), ux: !!UXA && !UXA.s.hidden, i: document.getElementById(id).selectedIndex }), dlg.id); ok(!S.pk && S.ux && S.i >= 0, 'Enter in the picker chooses; the dialog stays open', S);
    await p.keyboard.press('Escape'); await W(300); ok(await p.evaluate(() => !UXA), 'a second Esc closes the dialog as before') }
  ok(p.PE.length === 0, 'no page errors (desktop)', p.PE);
  await p.screenshot({ path: '/tmp/desk.png' });
  // (5) phone, touch
  const q = await login('surgery', 390, true); await openImpSheet(q);
  await q.tap('#imp_cat'); await W(400); S = await pk(q);
  ok(S && S.n === 1 && S.focus !== 'm32q', 'phone: a tap on a list inside a window opens the picker (short list: the keyboard does not pop up)', S);
  const box = await q.evaluate(() => { const r = document.querySelector('.m32p').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth } });
  ok(box.l >= 0 && box.r <= box.w && box.b <= box.h && box.sw <= box.w, 'phone: the picker fits the screen', box);
  await q.screenshot({ path: '/tmp/phone.png' });
  await q.tap('.m32x'); await W(300); ok(await q.evaluate(() => !document.querySelector('.m32ov') && !document.getElementById('impSheet').hidden), 'phone: closing the picker leaves the window under it open');
  await q.tap('#imp_cat'); await W(300); await q.tap('.m32o'); await W(400);
  ok(await q.evaluate(() => !document.querySelector('.m32ov') && document.getElementById('imp_cat').value === 'm' && !document.getElementById('impSheet').hidden), 'phone: a tap on an item chooses it');
  await q.evaluate(() => { const s = document.getElementById('imp_cat'); let o = ''; for (let i = 0; i < 40; i++) o += `<option value="b${i}">برند ${i}</option>`; s.insertAdjacentHTML('beforeend', o) }); await q.tap('#imp_cat'); await W(400); S = await pk(q);
  ok(S && S.n === 41 && S.focus === 'm32q', 'phone: a long list puts the cursor in the search box', S); await q.keyboard.type('برند ۳۷'); await W(200); S = await pk(q); ok(S && S.vis.join() === 'برند 37', 'phone: search works', S && S.vis);
  await q.screenshot({ path: '/tmp/phone2.png' }); await q.keyboard.press('Escape'); await W(200); ok(await q.evaluate(() => !document.querySelector('.m32ov') && !document.getElementById('impSheet').hidden), 'phone: Esc closes only the picker');
  ok(q.PE.length === 0, 'no page errors (phone)', q.PE);
} catch (e) { console.log('FAIL exception', e.stack) ; bad++ }
await b.close(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
