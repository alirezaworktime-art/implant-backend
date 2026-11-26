// t-m59a: the doctor lab order = «یک نگاه» (design 1), filled from the history; nothing mandatory. Run: WORKER=<m59a bundle> node t-m59a.mjs
import { createRequire } from 'node:module'; import fs from 'node:fs';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid, REC } = A;
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const PE = []; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const toDis = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id, file: String(2000 + Math.floor(Math.random() * 7000)), by: 'منشی' }); await h.call('staff', 'discharge', { id, by: 'منشی' }); return id };
const P = id => JSON.parse(h.sql(`select pros from plans where id='${id}'`)[0].pros || '{}');
const labsOf = id => h.sql(`select id, st, due, data from labs where plan='${id}' order by created`).map(l => Object.assign(l, { data: JSON.parse(l.data || '{}') }));
const p1 = await toDis("بیمار کار امروز"), p2 = await toDis("بیمار سفارش"); await h.travel(1);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const st = p => p.evaluate(() => { const v = e => !!e && e.offsetParent !== null, q = s => document.querySelector(s), on = s => [...document.querySelectorAll(s + '[aria-pressed="true"]')].map(b => b.textContent);
  return { blk: v(q('#pfBody .m59')), sheetV: v(q('#pfBody .h9sheet')), loSend: v(q('#loSend')), star: [...document.querySelectorAll('#pfBody .l8req')].some(v), facts: [...document.querySelectorAll('#pfBody .m59f')].map(f => f.textContent.replace(/\s+/g, ' ').trim()), hd: (q('#pfBody .m59hd') || {}).textContent || '', kind: on('#pfBody [data-m59k]'), shade: on('#pfBody [data-m59s]'), for: on('#pfBody .m59 [data-lofor]'), a: [...document.querySelectorAll('#pfBody .m59t.a')].map(b => b.dataset.m59t), p: [...document.querySelectorAll('#pfBody .m59t.p')].map(b => b.dataset.m59t), msg: (q('#loMsg') || {}).textContent || '' } });
const open = async (p, id, nm) => { await p.evaluate(([id, nm]) => { $('pfSheet').hidden = true; LO = null; let d = $('m58t'); if (!d) { d = document.createElement('div'); d.id = 'm58t'; document.body.append(d) } d.innerHTML = pdCard(id, nm, 'x', { stage: 'impr' }) }, [id, nm]); await p.click('#m58t [data-m58lab]'); await W(2200) };
const send = async p => { await p.click('#loSend'); for (let i = 0; i < 60 && (await st(p)).loSend; i++) await W(250) };
for (const id of [p1, p2]) await h.must('surgery', 'prosSess', { id, aid: '', work: 'impr', ty: 'impr', pt: { UR6: 'a' }, result: '', note: 'قالب', by: 'د', sendId: uuid() });
try {
  const p = await login('surgery');
  ok(await p.evaluate(() => /---------- m59a \(/.test(document.documentElement.innerHTML)), 'm59a marker in the page');
  // 1) first order: the compact form, from the file
  await open(p, p1, 'بیمار کار امروز'); let s = await st(p);
  ok(s.blk && !s.sheetV && s.loSend && !s.star, 'compact «یک نگاه» form; the full sheet is closed; no stars', s);
  ok(/بیمار کار امروز/.test(s.hd) && /پرونده‌ی/.test(s.hd) && s.facts.some(f => /^پزشک/.test(f) && !/—/.test(f)), 'patient, file number and doctor are filled', { hd: s.hd, f: s.facts });
  ok(s.a.join() === 'UR6' && s.for.length === 1, 'chart = پایه of the file; «ساخت برای» = next step', s);
  await p.click('#pfBody [data-m59k="zs"]'); await W(300); await p.click('#pfBody [data-m59s="A2"]'); await W(300);
  await p.click('#pfBody [data-m59t="UR5"]'); await W(250); await p.click('#pfBody [data-m59t="UR5"]'); await W(300); s = await st(p);
  ok(s.kind.join() === 'زیرکونیا پیچ‌شونده' && s.shade.join() === 'A2' && s.p.join() === 'UR5', 'kind, shade and a pontic are picked', s);
  await p.click('#pfBody [data-m59more]'); await W(400); s = await st(p); ok(s.sheetV && s.blk, '«جزئیات بیشتر» opens the full sheet', s);
  const sh = await p.evaluate(() => ({ it: LO.h9.itype.slice(), sh: (document.querySelector('[data-h9f="shade"]') || {}).value })); ok(sh.it.includes('پیچ شونده') && sh.sh === 'A2', 'the full sheet has the same choices', sh);
  await send(p); let L = labsOf(p1); ok(L.length === 1, 'order 1 stored', { n: L.length, msg: (await st(p)).msg });
  const d = (L[0] || {}).data || {}; ok((d.ctype || []).includes('Implant (zirconia)') && (d.cmat || []).includes('مونولیتیک') && d.shade === 'A2' && (d.teeth || []).sort().join() === 'UR5,UR6' && (d.pon || []).join() === 'UR5', 'the order carries kind, shade, پایه and پونتیک', d);
  // 2) next order: filled from the last order
  await open(p, p1, 'بیمار کار امروز'); s = await st(p);
  ok(s.kind.join() === 'زیرکونیا پیچ‌شونده' && s.shade.join() === 'A2', 'second order: kind and shade from the last order', s);
  ok(s.a.join() === 'UR6' && s.p.join() === 'UR5', 'second order: پایه / پونتیک of the file', s);
  // 3) nothing filled at all (another patient): goes
  await open(p, p2, 'بیمار سفارش'); await p.evaluate(() => { const b = document.querySelector('#pfBody .m59 [data-lofor][aria-pressed="true"]'); if (b) b.click() }); await W(300);
  await p.evaluate(() => { LO.h9.base = []; LO.h9.pon = []; LO.h9.shade = ''; LO.shade = ''; const i = document.querySelector('#lo_due'); if (i) i.value = '' }); await send(p);
  L = labsOf(p2); ok(L.length === 1, 'an order with nothing chosen is stored', { n: L.length, msg: (await st(p)).msg });
  // 4) from the file tab too (the doctor's «ثبت سفارش» path = loForm in the file)
  const f = await p.evaluate(async id => { $('pfSheet').hidden = true; LO = null; await openFile(id, 'بیمار سفارش', 'pros'); loInit(PF.j); renderFile(); await new Promise(r => setTimeout(r, 400)); return !!document.querySelector('#pfBody .m59') }, p2); ok(f, 'the file order form is «یک نگاه» too');
  // 5) phone
  const ph = await login('surgery', 390, 800); await open(ph, p1, 'بیمار کار امروز'); const ov = await ph.evaluate(() => { const i = document.querySelector('#pfSheet .in'); return [document.documentElement.scrollWidth <= innerWidth + 1, i ? i.scrollWidth <= i.clientWidth + 1 : false] });
  await ph.screenshot({ path: '/tmp/phone.png', fullPage: false }); ok(ov[0] && ov[1], 'phone: no side scroll', ov);
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
