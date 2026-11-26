// m39 browser test: lab side sections — group tiles, lists as cards, old table on request, nothing lost, no sideways scroll on a phone.
import { createRequire } from 'node:module'; import * as A from '../audit/A.mjs';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const raw = async (pw, action, body = {}) => (await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: pw, ...body }) })).json();
const D0 = await h.call('lab', 'labDefs', { op: 'get' }); const wt = (D0.wts || D0.wt || [])[0];
for (const n of ['بیمار نمونه یک', 'بیمار نمونه دو', 'بیمار نمونه سه']) await raw(A.PW.lab, 'lab4New', { id: '', name: n, clinic: 'کلینیک نمونه', lid: A.uuid(), sendId: A.uuid(), order: { teeth: ['UR6', 'UR5'], note: '' } });
await h.must('manager', 'userSave', { u: { name: 'کارمند ساده', role: 'lab', pw: 'plain-test-11', lab: { depts: [103] } } });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (pw, vw) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200)));
  await p.goto(h.url); await p.click('[data-lrole="lab"]'); await p.fill('#lg_pw', pw); await p.click('#lgGo'); await W(3500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return { p, c } };
const go = async (p, s) => { await p.evaluate(s => l5Go(s), s); await W(1300) };
const tabs = p => p.evaluate(() => [...document.querySelectorAll('#m39tabs .m39tab')].map(t => t.dataset.l5sec + (t.getAttribute('aria-current') === 'true' ? '*' : '')));
try {
  let { p, c } = await login(A.PW.lab, 1366);
  ok((await tabs(p)).length === 0, 'workbench has no group tiles');
  await go(p, 'o/all'); let T = await tabs(p);
  ok(T.includes('o/all*') && T.includes('o/active') && T.includes('o/outs') && !T.includes('o/new'), 'orders group: tiles for every list, current one marked', T);
  let S = await p.evaluate(() => { const t = document.querySelector('#l5ol table'); const r = t.tBodies[0].rows[0]; return { card: t.classList.contains('m39c'), disp: getComputedStyle(r).display, head: getComputedStyle(t.tHead).display, lab: [...r.cells].filter(c => !c.classList.contains('m39e')).map(c => c.dataset.l || ''), h: (r.querySelector('.m39h') || {}).textContent, rows: t.tBodies[0].rows.length, bar: !document.getElementById('m39bar').hidden } });
  ok(S.card && S.disp === 'grid' && S.head === 'none' && S.rows === 3, 'order list drawn as cards', S); ok(/بیمار نمونه/.test(S.h || '') && S.lab.includes('وضعیت') && S.lab.includes('تحویل'), 'card: patient on top, every value under its column name', S);
  ok(!S.lab.includes('ردیف'), 'row number column is left out of the card'); ok(S.bar, 'wide screen: «کارت / جدول» choice is shown');
  await p.click('#l5ol table tbody tr [data-l4open]'); await W(1200); ok(await p.evaluate(() => [...document.querySelectorAll('.sheet')].some(s => !s.hidden)), '«مشاهده» on a card opens the order'); await p.evaluate(() => document.querySelectorAll('.sheet').forEach(s => s.hidden = true));
  await p.click('#m39tabs [data-l5sec="o/active"]'); await W(1300); T = await tabs(p); ok(T.includes('o/active*') && await p.evaluate(() => L5.sec === 'o/active'), 'a tile moves to its list', T);
  await go(p, 'o/all'); await p.click('[data-m39v="t"]'); await W(300);
  S = await p.evaluate(() => { const t = document.querySelector('#l5ol table'); return { card: t.classList.contains('m39c'), head: getComputedStyle(t.tHead).display, row: getComputedStyle(t.tBodies[0].rows[0]).display, ls: localStorage.getItem('m39view') } }); ok(!S.card && S.head !== 'none' && S.row === 'table-row' && S.ls === 't', '«جدول» brings the old table back and is remembered', S);
  await go(p, 'd/acct'); S = await p.evaluate(() => !document.querySelector('#lbList table').classList.contains('m39c')); ok(S, 'the choice holds in other sections');
  await p.click('[data-m39v="c"]'); await W(300); ok(await p.evaluate(() => document.querySelector('#lbList table').classList.contains('m39c') && localStorage.getItem('m39view') === 'c'), '«کارت» goes back to cards');
  T = await tabs(p); ok(T.join() === 'd/wt,d/col,d/dept,d/proc,d/staff,d/acct*,d/box,d/plist', 'definitions group: eight tiles', T);
  await go(p, 'rep'); S = await p.evaluate(() => ({ n: document.querySelectorAll('#lbList table.m39c').length, s: document.querySelectorAll('#lbList .l5tw.m39s').length, bar: document.getElementById('m39bar').hidden })); ok(S.n === 0 && S.s >= 3 && S.bar, 'reports keep their tables (inside cards), no card/table choice', S);
  await go(p, 'bench'); ok((await tabs(p)).length === 0 && await p.evaluate(() => !!document.querySelector('.m36tile')), 'back on the workbench: tiles of the workbench only');
  await c.close();
  // phone: every section, no sideways scroll
  ({ p, c } = await login(A.PW.lab, 390)); const secs = await p.evaluate(() => L5MENU.flatMap(g => g.items.map(i => i[0])).filter(s => s !== 'o/new')); const wide = [];
  for (const s of secs) { await go(p, s); const w = await p.evaluate(() => ({ w: document.documentElement.scrollWidth > innerWidth + 1, bar: !!document.getElementById('m39bar') && !document.getElementById('m39bar').hidden, tbl: [...document.querySelectorAll('#lbList table.tbl')].filter(t => !t.classList.contains('m39c') && !t.closest('.m39s') && !t.closest('.l8ev')).length })); if (w.w || w.bar || w.tbl) wide.push(s + JSON.stringify(w)); }
  ok(!wide.length, 'phone: ' + secs.length + ' sections — no sideways scroll, no table left, no table choice', wide);
  await go(p, 'o/all'); S = await p.evaluate(() => { const el = document.getElementById('m39tabs'); return { sc: el.scrollWidth > el.clientWidth, n: el.children.length } }); ok(S.sc && S.n >= 6, 'phone: the tiles scroll sideways inside their own row', S);
  await c.close();
  // plain employee: since m40 he has no side sections at all (t-m40ui covers his cartable)
  ({ p, c } = await login('plain-test-11', 1366)); await go(p, 'o/all'); T = await tabs(p); ok(T.length === 0 && await p.evaluate(() => L5.sec === 'bench'), 'employee: no group tiles, stays on his own cartable', T); await c.close();
} catch (e) { console.log('ERR', e.message.slice(0, 300)); bad++; }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
