// t-m58b: «سفارش لابراتوار» from the prosthesis card — nothing is mandatory. Run: WORKER=<m58b bundle> node t-m58b.mjs
import { createRequire } from 'node:module'; import fs from 'node:fs';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
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
const st = p => p.evaluate(() => { const v = e => !!e && e.offsetParent !== null, q = s => document.querySelector(s); return { sheet: !q('#pfSheet').hidden, loSend: v(q('#loSend')), note: v(q('#pfBody .m58o')), star: [...document.querySelectorAll('#pfBody .l8req')].some(v), msg: (q('#loMsg') || {}).textContent || '', pm: [...document.querySelectorAll('.sheet')].some(x => !x.hidden && x.id !== 'pfSheet') } });
const open = async (p, id, nm) => { await p.evaluate(([id, nm]) => { $('pfSheet').hidden = true; LO = null; let d = $('m58t'); if (!d) { d = document.createElement('div'); d.id = 'm58t'; document.body.append(d) } d.innerHTML = pdCard(id, nm, 'x', { stage: 'heal' }) }, [id, nm]); await p.click('#m58t [data-m58lab]'); await W(2200) };
for (const id of [p1, p2]) await h.must('surgery', 'prosSess', { id, aid: '', work: 'impr', ty: 'impr', pt: { UR6: 'a' }, result: '', note: 'قالب', by: 'د', sendId: uuid() });
try {
  const p = await login('surgery');
  ok(await p.evaluate(() => /---------- m58b \(/.test(document.documentElement.innerHTML)), 'm58b marker in the page');
  // 1) nothing filled: the empty order goes
  await open(p, p1, 'بیمار کار امروز'); let s = await st(p);
  ok(s.sheet && s.loSend && s.note && !s.star && !s.pm, 'order form opens, no chart sheet, no stars, the note says nothing is mandatory', s);
  await p.evaluate(() => { $('lo_due').value = '' }); await p.click('#loSend'); for (let i = 0; i < 60 && (await st(p)).loSend; i++) await W(250); s = await st(p);
  let L = labsOf(p1); ok(L.length === 1, 'an empty order is stored', { n: L.length, s });
  ok(L[0] && L[0].data.for && L[0].due > h.today(), 'empty «ساخت برای» = first step of the route; empty date = later day', L[0] && { for: L[0].data.for, due: L[0].due });
  ok(L[0] && (P(p1).stage === 'lab'), 'prosthesis stage → lab', P(p1).stage);
  ok(L[0] && (L[0].data.teeth || []).join() === 'UR6', 'empty teeth = the پایه of the file', L[0] && L[0].data.teeth);
  // 2) the old path (reception / file «ثبت سفارش») still asks the sheet fields
  const r = await h.call('surgery', 'labNew', { id: p2, lid: uuid(), order: { m47: 1, for: '', teeth: [] }, due: '', sendId: uuid() });
  ok(!(r && r.ok), 'a direct labNew with only m47 is still checked', r);
  const r2 = await h.call('surgery', 'labNew', { id: p2, lid: uuid(), order: { m58: 1, for: '', teeth: [] }, due: '', sendId: uuid() });
  ok(r2 && r2.ok, 'labNew with m58 is free', r2);
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
