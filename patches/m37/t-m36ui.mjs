// t-m36ui: new lab workbench in the page. Run: WORKER=<m36 bundle> node t-m36ui.mjs
import { createRequire } from 'node:module'; import * as A from '../audit/A.mjs';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const raw = async (pw, action, body = {}) => (await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: pw, ...body }) })).json();
const P = { R: 'recep-test-11', S: 'scan-test-111', A: 'design-test-1', B: 'make-test-b11', C: 'make-test-c11', D: 'finish-test-1' };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (pw, vw = 1366) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click('[data-lrole="lab"]'); await p.fill('#lg_pw', pw); await p.click('#lgGo'); await W(3500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return { p, c } };
const bench = p => p.evaluate(() => ({ tiles: [...document.querySelectorAll('.m36tile')].map(t => [t.dataset.m36tile, t.querySelector('.m36n').textContent, t.classList.contains('on')]), cards: [...document.querySelectorAll('.m36card')].map(c => ({ no: c.querySelector('.m36no').textContent, btn: [...c.querySelectorAll('.m36acts .btn')].map(x => x.textContent.trim()), st: [...c.querySelectorAll('.m36st')].map(s => s.className.replace('m36st m36st-', '') + ':' + s.textContent), bk: (c.querySelector('.m36bk') || {}).textContent || '' })), h: (document.querySelector('.m36h') || document.querySelector('#viewLab .qhead h2') || {}).textContent, old: !!document.querySelector('.l6bt'), tilesHidden: !document.querySelector('#tiles') || getComputedStyle(document.querySelector('#tiles')).display === 'none' }));
try {
  let D0 = await h.call('lab', 'labDefs', { op: 'get' });
  for (const d of D0.depts.filter(d => d.flags.upload && d.id !== 102)) await h.must('lab', 'labDefs', { op: 'dept', x: { id: d.id, name: d.name, active: true, sort: d.sort, flags: {} } });
  const mk = (name, pw, lab) => h.must('manager', 'userSave', { u: { name, role: 'lab', pw, lab } });
  await mk('پذیرش آزمایشی', P.R, { depts: [], recep: 1 }); await mk('اسکن آزمایشی', P.S, { depts: [101] }); await mk('طراح آزمایشی', P.A, { depts: [102], designer: 1 });
  await mk('ساخت ب', P.B, { depts: [103] }); await mk('ساخت ج', P.C, { depts: [103] }); await mk('پرداخت آزمایشی', P.D, { depts: [104] });
  let r = await raw(P.R, 'lab4New', { id: '', name: 'بیمار نمونه یک', clinic: 'کلینیک نمونه', lid: A.uuid(), sendId: A.uuid(), order: { teeth: ['UR6', 'UR5', 'LL6'], note: 'x' } }); const lid = r.id;
  // ---- reception
  let { p, c } = await login(P.R);
  let B = await bench(p);
  ok(B.h === 'میز کار' && !B.old && B.tilesHidden, 'new workbench replaces the old table', B);
  ok(B.tiles.map(t => t[0]).join() === 'new,ref,hands,back,ready' && B.tiles[0][1] === '۱' && B.tiles[0][2], 'five tiles with counters; «کار تازه» selected when it is the only one with work', B.tiles);
  ok(B.cards.length === 1 && B.cards[0].btn[0] === 'دریافت و شروع کار', 'a new order shows one primary action', B.cards);
  ok(await p.evaluate(() => !!document.querySelector('.m36card .l6x')), 'teeth shown as the plus-shaped chart');
  await p.click('.m36card [data-l2start]'); await W(900);
  let S = await p.evaluate(() => { const s = document.getElementById('m36asg'); return s ? { v: s.value, n: document.getElementById('m36asgN').textContent, opts: [...s.options].map(o => o.textContent) } : null });
  ok(S && /اول نوع کار/.test(S.opts[0]), 'start window asks who gets the first step (waits for the work type)', S);
  await p.selectOption('#l2wt', '101'); await W(300);
  S = await p.evaluate(() => { const s = document.getElementById('m36asg'); return { v: s.value, t: s.selectedOptions[0].textContent, n: document.getElementById('m36asgN').textContent } });
  ok(/اسکن آزمایشی/.test(S.t) && /«اسکن»/.test(S.n), 'the only person of the first department is chosen automatically', S);
  await p.click('#l2StOk'); await W(2500); B = await bench(p);
  ok(B.cards.length === 1 && B.tiles.find(t => t[0] === 'hands')[1] === '۱' && B.tiles.find(t => t[0] === 'hands')[2], 'order moved to «در دست کارمندان»', B.tiles);
  ok(B.cards[0].st.length === 5 && /^c:۱\. اسکنارجاع به اسکن آزمایشی/.test(B.cards[0].st[0]) && /با پذیرش/.test(B.cards[0].st[4]), 'step path on the card', B.cards[0].st);
  ok(B.cards[0].btn.includes('تغییر انجام‌دهنده') && !B.cards[0].btn.includes('شروع کار'), 'reception may change the person, cannot do the work', B.cards[0].btn);
  await p.screenshot({ path: '/tmp/s-recep.png', fullPage: true });
  await c.close();
  // ---- scan person, then designer sends back
  ({ p, c } = await login(P.S)); B = await bench(p);
  ok(B.h === 'کارهای من' && (B.tiles.map(t => t[0]).join() === 'm_new,m_do,m_late' || B.tiles.length === 3 /* since m40: «برای من آمده / نیمه‌تمام / تمام‌کرده‌ام» */) && B.cards.length === 1 && B.cards[0].btn[0] === 'شروع کار', 'employee sees only own work with «شروع کار»', B);
  await p.click('[data-m36="acc"]'); await W(2200); B = await bench(p);
  ok(B.cards[0].btn[0] === 'پایان و فرستادن به نفر بعد' && B.cards[0].btn.includes('برگشت به پذیرش'), 'after start: finish / send back', B.cards[0].btn);
  await p.click('[data-m36="done"]'); await W(700);
  let Dn = await p.evaluate(() => ({ t: document.querySelector('#m36DoneSh h3').textContent, nx: (document.getElementById('m36nx') || {}).value, txt: document.querySelector('#m36DoneSh .fields').innerText }));
  ok(/پایان «اسکن»/.test(Dn.t) && /طراحی/.test(Dn.txt) && Dn.nx, 'finish window names the next step and preselects its only person', Dn);
  await p.click('#m36DoneOk'); await W(2500); B = await bench(p); ok(B.cards.length === 0, 'the work left this person', B.cards); ok(p.PE.length === 0, 'no page errors (employee)', p.PE); await c.close();
  ({ p, c } = await login(P.A)); B = await bench(p); ok(B.cards.length === 1 && B.cards[0].btn[0] === 'شروع کار', 'designer got the work', B.cards);
  await p.click('[data-m36="back"]'); await W(600); await p.fill('.sheet:not([hidden]) textarea', 'اسکن ناقص است'); await p.click('.sheet:not([hidden]) .btns .btn:not(.ghost)'); await W(2500);
  B = await bench(p); ok(B.cards.length === 0, 'sent back: gone from the designer', B.cards); await c.close();
  ({ p, c } = await login(P.R)); B = await bench(p);
  ok(B.tiles.find(t => t[0] === 'ref')[1] === '۱' && B.tiles.find(t => t[0] === 'back')[1] === '۱' && /برگشت از طراح آزمایشی \(طراحی\): اسکن ناقص است/.test(B.cards[0].bk) && B.cards[0].btn[0] === 'ارجاع دوباره', 'reception sees the return with its reason and «ارجاع دوباره»', B);
  await p.screenshot({ path: '/tmp/s-back.png', fullPage: true });
  await p.click('.m36card [data-l4open]'); await W(2500);
  const Sh = await p.evaluate(() => ({ rows: [...document.querySelectorAll('#l2In table.l2st tbody tr')].map(tr => tr.querySelector('td:nth-child(3)').textContent.trim() + ' | ' + [...tr.querySelectorAll('.acts button')].map(b => b.textContent.trim()).join(',')), bk: (document.querySelector('#l2In .m36bk') || {}).textContent || '' }));
  ok(Sh.rows.length === 5 && /منتظر ارجاع \| ارجاع/.test(Sh.rows[1]) && !Sh.rows.some(x => /(^|,)(پذیرش|انجام شد|تکمیل)(,|$)/.test(x.split(' | ')[1] || '')) && /با پذیرش \| $/.test(Sh.rows[4]) && /اسکن ناقص است/.test(Sh.bk), 'order sheet: same rules (referral button, no old accept buttons, final-send row has no action, return reason)', Sh);
  await p.evaluate(() => { const s = document.getElementById('l2Sheet'); if (s) s.hidden = true });
  await p.click('.m36card [data-m36="ref"]'); await W(700); await p.click('.sheet:not([hidden]) .btns .btn:not(.ghost)'); await W(2500); B = await bench(p);
  ok(B.tiles.find(t => t[0] === 'ref')[1] === '۰' && /ارجاع به طراح آزمایشی/.test(B.cards[0].st[1]), 'referred again', B.cards[0] && B.cards[0].st);
  await c.close();
  // designer: file required for «طراحی»
  ({ p, c } = await login(P.A)); await p.click('[data-m36="acc"]'); await W(2200); await p.click('[data-m36="done"]'); await W(700);
  Dn = await p.evaluate(() => ({ req: /لازم است/.test(document.querySelector('#m36DoneSh').innerText), opts: [...document.getElementById('m36nx').options].map(o => o.textContent), v: document.getElementById('m36nx').value }));
  ok(Dn.req && Dn.v === '' && Dn.opts[0] === 'پذیرش تعیین کند' && Dn.opts.length === 7, 'file marked as needed; two people next → must choose or leave to reception', Dn);
  await p.click('#m36DoneOk'); await W(1800); ok(/فایل/.test(await p.evaluate(() => document.getElementById('m36DoneM').textContent)), 'without the file the finish is refused');
  await p.setInputFiles('#m36file', { name: 'design.stl', mimeType: 'model/stl', buffer: Buffer.from('solid x\nendsolid x\n') });
  await p.selectOption('#m36nx', { label: 'ساخت ج · همین دپارتمان' }); await p.click('#m36DoneOk'); await W(4000);
  let st = (await raw(P.R, 'labOrder', { lid })).steps; ok(st[1].st === 'done' && st[2].asg_name === 'ساخت ج', 'finished with the file; next step sits with the chosen person', st[2]); ok(p.PE.length === 0, 'no page errors (designer)', p.PE); await c.close();
  await raw(P.C, 'labStep', { lid, sid: st[2].id, op: 'quick' }); await raw(P.D, 'labStep', { lid, sid: st[3].id, op: 'quick' });
  // shared lab password (supervisor): ready tile, label 90x15, send
  ({ p, c } = await login(A.PW.lab)); B = await bench(p);
  ok(B.tiles.find(t => t[0] === 'ready')[1] === '۱' && B.cards[0].btn[0] === 'خروج و ارسال به کلینیک' && B.cards[0].btn.includes('چاپ برچسب'), 'ready order: «خروج و ارسال به کلینیک» + label', B);
  await p.click('[data-l2lbl]'); await W(1500);
  const Lb = await p.evaluate(() => ({ note: document.querySelector('#l8LbSh .note').textContent, css: /size:90mm 15mm/.test(M36.labelHtml), w: document.querySelector('.l8lbf').style.width }));
  ok(Lb.css && /۹ × ۱٫۵/.test(Lb.note), 'label is 90 × 15 mm', Lb); await p.screenshot({ path: '/tmp/s-label.png' }); await p.click('#l8LbX');
  await p.click('[data-l2send]'); await W(600); await p.click('.sheet:not([hidden]) .btns .btn:not(.ghost)'); await W(2500);
  ok((await raw(P.R, 'labOrder', { lid })).order.st === 'ready', 'sent to the clinic');
  // menu names + new-work form
  const M = await p.evaluate(() => L5MENU.map(g => g.g + ':' + g.items.map(i => i[1]).join('|')).join(' / ')); ok(/همه‌ی سفارش‌ها/.test(M) && /مسیرهای ساخت/.test(M) && !/دفتر معین/.test(M), 'lab menu with our own names', M);
  await p.evaluate(() => l5Go('o/all')); await W(2500); ok(await p.evaluate(() => document.querySelectorAll('#lbList table .l6x .l6xg').length > 0), 'orders list shows the teeth as the plus-shaped chart'); await p.screenshot({ path: '/tmp/s-list.png' });
  await p.evaluate(() => l5Go('o/new')); await W(1200); await p.click('[data-l4m="ext"]'); await W(600);
  const F = await p.evaluate(() => { const f = document.querySelector('#l4nBody .h9form'), st = document.querySelector('.l4stage'), due = document.getElementById('lo_due'); return { stageIn: !!(f && st && f.contains(st)), dueHidden: !!(due && due.closest('.h9sch').hidden), scan: (document.querySelector('[data-lometh="scan"]') || {}).getAttribute && document.querySelector('[data-lometh="scan"]').getAttribute('aria-pressed'), pk: [...document.querySelectorAll('[data-m36pk]')].map(x => x.textContent + ':' + x.getAttribute('aria-pressed')), free: !!document.getElementById('m36free') } });
  ok(F.stageIn && F.dueHidden && F.scan === 'true' && F.pk.length === 2 && F.free, 'another-clinic form: stage inside the sheet, no lab delivery date, digital scan by default, photo kind', F);
  await p.screenshot({ path: '/tmp/s-new.png', fullPage: true });
  const n0 = h.sql('select count(*) c from labs')[0].c; await p.click('#l4nSave'); await W(3500);
  const n1 = h.sql('select count(*) c from labs')[0].c, last = h.sql(`select name, data from labs order by created desc limit 1`)[0];
  ok(n1 === n0 + 1 && last.name === 'بدون نام' && JSON.parse(last.data).meth === 'scan', 'saved with nothing filled in', { n0, n1, last, msg: await p.evaluate(() => (document.getElementById('l4nMsg') || {}).textContent) });
  ok(p.PE.length === 0, 'no page errors (supervisor)', p.PE); await c.close();
  // mobile width
  ({ p, c } = await login(P.R, 390)); const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2); ok(!ov, 'no sideways scroll on a phone'); await p.screenshot({ path: '/tmp/s-mobile.png', fullPage: true }); await c.close();
} catch (e) { console.log('ERR', e && e.stack); bad++ } finally { await b.close(); h.stop() }
console.log(bad ? 'FAILED ' + bad : 'ALL OK');
