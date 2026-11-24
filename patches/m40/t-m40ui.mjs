// t-m40ui: cartable of a plain lab employee (browser). Run: WORKER=<m40 bundle> node t-m40ui.mjs
import { createRequire } from 'node:module'; import * as A from '../audit/A.mjs';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const raw = async (pw, action, body = {}) => (await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: pw, ...body }) })).json();
const P = { R: 'recep-test-11', A: 'make-test-a11', B: 'make-test-b11' };
let D0 = await h.call('lab', 'labDefs', { op: 'get' }); for (const d of D0.depts.filter(d => d.flags.upload)) await h.must('lab', 'labDefs', { op: 'dept', x: { id: d.id, name: d.name, active: true, sort: d.sort, flags: {} } });
const mk = (name, pw, lab) => h.must('manager', 'userSave', { u: { name, role: 'lab', pw, lab } });
await mk('پذیرش آزمایشی', P.R, { depts: [], recep: 1 }); await mk('ساخت الف', P.A, { depts: [101, 102, 103] }); await mk('ساخت ب', P.B, { depts: [101, 102, 103] });
D0 = await h.call('lab', 'labDefs', { op: 'get' }); const U = n => D0.staff.find(s => s.name === n).id;
const mkO = async (name, who) => { const r = await raw(P.R, 'lab4New', { id: '', name, clinic: 'کلینیک نمونه', lid: A.uuid(), sendId: A.uuid(), order: { teeth: ['UR6', 'UR5'] } }); await raw(P.R, 'labStart', { lid: r.id, wt: 101, proc: '', from: '', designer: '', box: '', note: '', prio: '' }); if (who) { const st = (await raw(P.R, 'labOrder', { lid: r.id })).steps; await raw(P.R, 'labStep', { lid: r.id, sid: st[0].id, op: 'assign', uid: U(who) }) } return r.id };
const O1 = await mkO('بیمار نمونه یک', 'ساخت الف'), O2 = await mkO('بیمار نمونه دو', 'ساخت الف'), O3 = await mkO('بیمار نمونه سه', 'ساخت ب'), O4 = await mkO('بیمار نمونه چهار', '');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [], DENY = [];
const login = async (pw, vw) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200)));
  p.on('response', async r => { try { if (r.request().method() === 'POST') { const j = await r.json(); if (j && j.m40 === 1 && j.ok === false) { const q = JSON.parse(r.request().postData()); DENY.push(q.action + ':' + (q.op || '')) } } } catch (e) { } });
  await p.goto(h.url); await p.click('[data-lrole="lab"]'); await p.fill('#lg_pw', pw); await p.click('#lgGo'); await W(4000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return { p, c } };
const tiles = p => p.evaluate(() => [...document.querySelectorAll('.m36tile')].map(t => t.querySelector('.m36l').textContent + '=' + t.querySelector('.m36n').textContent + (t.classList.contains('on') ? '*' : '')));
const names = p => p.evaluate(() => [...document.querySelectorAll('#lbList .m36card .m36nm, #lbList .m40d .m40m b')].map(x => x.textContent.trim()));
const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none' }, sel);
try {
  let { p, c } = await login(P.A, 1366); await W(800);
  ok(await p.evaluate(() => document.body.classList.contains('m40plain') && m40.plain()), 'employee: the limited cartable is on');
  ok(!(await vis(p, '#l5Nav')) && !(await vis(p, '#l4Fab')) && !(await vis(p, '#m39tabs')), 'no side menu, no «کار جدید / جست‌وجو» buttons, no group tiles');
  let T = await tiles(p); ok(T.join() === 'برای من آمده=۲*,نیمه‌تمام=۰,تمام‌کرده‌ام=۰', 'three tiles with their counts', T);
  let N = await names(p); ok(N.length === 2 && N.every(n => /نمونه (یک|دو)/.test(n)), 'only the two orders referred to him are listed', N);
  ok(!/نمونه سه|نمونه چهار/.test(await p.evaluate(() => document.body.innerText)), 'orders of others appear nowhere on the page');
  ok(!DENY.length, 'opening the cartable asks the server for nothing forbidden', DENY);
  await p.screenshot({ path: 'emp-desktop.png' });
  await p.evaluate(() => l5Go('o/all')); await W(600); ok(await p.evaluate(() => L5.sec === 'bench' && !!document.querySelector('.m36tile')), 'trying to go to «همه‌ی سفارش‌ها» stays on his cartable');
  // start → half-done
  await p.click(`.m36card[data-m36card="${O1}"] [data-m36="acc"]`); await W(2500); T = await tiles(p); ok(/برای من آمده=۱/.test(T[0]) && /نیمه‌تمام=۱/.test(T[1]), 'after «شروع کار» the order moves to «نیمه‌تمام»', T);
  await p.click('[data-m40tile="m_do"]'); await W(500); N = await names(p); ok(N.length === 1 && /نمونه یک/.test(N[0]), '«نیمه‌تمام» lists the started order', N);
  // sheet: no account, no money
  await p.click(`.m36card[data-m36card="${O1}"] [data-l4open]`); await W(1800); const sh = await p.evaluate(() => { const s = [...document.querySelectorAll('.sheet')].find(x => !x.hidden); return s ? s.innerText : '' }); ok(/نمونه یک/.test(sh) && !/تومان|صورت‌حساب|فاکتور/.test(sh), 'the order sheet opens, without money', sh.slice(0, 200)); await p.evaluate(() => document.querySelectorAll('.sheet').forEach(s => { s.hidden = true }));
  // finish → done list
  await p.click(`.m36card[data-m36card="${O1}"] [data-m36="done"]`); await W(900); ok(await vis(p, '#m36DoneSh'), '«پایان» opens the finish dialog');
  await p.evaluate(() => { const s = document.getElementById('m36DoneSh'); const sel = s.querySelector('select'); if (sel && sel.options.length > 1 && !sel.value) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', { bubbles: true })) } const nb = s.querySelector('input[type=number],input[inputmode=numeric]'); if (nb && !nb.value) { nb.value = '2'; nb.dispatchEvent(new Event('input', { bubbles: true })) } });
  await p.evaluate(() => { const s = document.getElementById('m36DoneSh'); const bt = [...s.querySelectorAll('button')].find(x => /ثبت|پایان|تأیید/.test(x.textContent) && !/انصراف|بستن/.test(x.textContent)); bt.click() }); await W(3500);
  const st1 = (await raw(P.R, 'labOrder', { lid: O1 })).steps[0]; ok(st1.st === 'done', 'the step is finished from the page', await p.evaluate(() => (document.getElementById('toast') || {}).textContent));
  T = await tiles(p); ok(/نیمه‌تمام=۰/.test(T[1]) && /تمام‌کرده‌ام=۱/.test(T[2]), 'the count of «تمام‌کرده‌ام» goes up', T);
  await p.click('[data-m40tile="m_done"]'); await W(1500); N = await names(p); ok(N.length === 1 && /نمونه یک/.test(N[0]) && await vis(p, '[data-m40old]'), '«تمام‌کرده‌ام» lists it, with «نمایش قدیمی‌ترها»', N);
  await p.screenshot({ path: 'emp-done.png' });
  await p.click('.m40d [data-l4open]'); await W(1800); ok(await p.evaluate(() => [...document.querySelectorAll('.sheet')].some(s => !s.hidden && /نمونه یک/.test(s.innerText))), 'the sheet of finished work still opens'); await p.evaluate(() => document.querySelectorAll('.sheet').forEach(s => { s.hidden = true }));
  await p.fill('#m36q', 'نمونه دو'); await W(700); ok((await names(p)).length === 0, 'search looks only inside the open tile'); await p.fill('#m36q', ''); await W(600);
  ok(!DENY.length, 'the whole round asked for nothing forbidden', DENY); await c.close();
  // phone
  ({ p, c } = await login(P.A, 390)); await W(600); ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && (await tiles(p)).length === 3, 'phone: three tiles, no sideways scroll'); await p.screenshot({ path: 'emp-phone.png', fullPage: true }); await c.close();
  // reception on the same site: nothing changed
  ({ p, c } = await login(P.R, 1366)); ok(await p.evaluate(() => !document.body.classList.contains('m40plain')) && await vis(p, '#l5Nav') && (await tiles(p)).length >= 5, 'reception: full cartable as before', await tiles(p));
  await p.evaluate(() => l5Go('o/all')); await W(1300); ok(await p.evaluate(() => L5.sec === 'o/all' && document.querySelectorAll('#l5ol table tbody tr').length === 4), 'reception: «همه‌ی سفارش‌ها» lists all four'); await c.close();
} catch (e) { console.log('ERR', e.message.slice(0, 400)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
