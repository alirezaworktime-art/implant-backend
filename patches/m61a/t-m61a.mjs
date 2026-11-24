// t-m61a: prosthesis «ادامه درمان» (stage per tooth, failure choices, next step) + two buttons on the cards. Run: WORKER=<m61a bundle> node t-m61a.mjs
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
const S = p => p.evaluate(() => { const s = document.querySelector('#m61Sheet'); return { open: !!s && !s.hidden, txt: s ? s.innerText.replace(/\s+/g, ' ') : '', msg: (document.querySelector('#m61Msg') || {}).textContent || '', im: [...document.querySelectorAll('#m61Sheet .m61t.im')].map(b => b.dataset.m61t) } });
const save = async p => { await p.click('#m61Save'); for (let i = 0; i < 60 && (await S(p)).open; i++) await W(250); return S(p) };
const tk = id => h.sql(`select kind, info, note, done, due from tasks where plan='${id}' and kind='reno'`);
try {
  const p = await login('surgery');
  ok(await p.evaluate(() => /---------- m61a \(/.test(document.documentElement.innerHTML)), 'm61a marker in the page');
  // 0) cards: only two buttons
  const cards = await p.evaluate(async () => { show('pday'); await loadPday(); return [...document.querySelectorAll('#pdAll .item .acts')].map(a => [...a.querySelectorAll('button')].map(b => b.textContent)) });
  ok(cards.length >= 2 && cards.every(c => c.join() === 'ادامه درمان,سفارش لابراتوار'), 'every prosthesis card: «ادامه درمان» + «سفارش لابراتوار» only', cards.slice(0, 3));
  // 1) impression for all teeth + next step
  await p.evaluate(id => document.querySelector(`#pdAll [data-m61="${id}"]`).click(), p1); await W(1500); let s = await S(p);
  ok(s.open && s.im.length === 2, 'sheet opens with the implants on the chart', s.im);
  await p.click('#m61Sheet [data-m61g="work"][data-v="impr"]'); await W(200);
  s = await p.evaluate(() => ({ nx: M61.nx, wt: M61.wt.length })); ok(s.nx === 'tryin' && s.wt === 2, 'next step suggested (تست رزین); all teeth chosen', s);
  await p.click('#m61Sheet [data-m61g="asst"]'); await W(150); s = await save(p);
  let pr = P(p1); ok(!s.open && pr.sess && pr.sess.length === 1 && pr.stage === 'lab', 'session stored, stage → lab', { st: pr.stage, n: (pr.sess || []).length, msg: s.msg });
  ok(Object.values(pr.ts || {}).length === 2 && Object.values(pr.ts).every(v => v === 'lab'), 'both teeth at lab', pr.ts);
  ok(/دستیار/.test(pr.sess[0].note), 'assistant in the session note', pr.sess[0].note);
  let T = tk(p1); ok(pr.nxt && pr.nxt.st === 'tryin' && T.filter(t => !t.done && t.info === 'tryin').length === 1, 'next step stored + reception task', { nxt: pr.nxt, T });
  // 2) one tooth ahead: overall = earliest
  await p.evaluate(id => m61Open(id, 'بیمار کار امروز'), p1); await W(1500);
  const t1 = (await S(p)).im[0]; await p.click(`#m61Sheet [data-m61t="${t1}"]`); await W(200); await p.click('#m61Sheet [data-m61st="tryin"]'); await W(200); s = await save(p);
  pr = P(p1); ok(pr.ts[t1] === 'tryin' && Object.values(pr.ts).includes('lab') && pr.stage === 'lab', 'per-tooth stage; patient = earliest tooth', { ts: pr.ts, st: pr.stage });
  // 3) failure → pontic, removed today, re-implant in 3 months
  await p.evaluate(id => m61Open(id, 'بیمار کار امروز'), p1); await W(1500);
  const t2 = (await S(p)).im[1]; await p.click(`#m61Sheet [data-m61t="${t2}"]`); await W(150); await p.click('#m61Sheet [data-m61g="ft"]'); await W(200);
  await p.click('#m61Sheet [data-m61g="fo"][data-v="pon"]'); await W(150); await p.click('#m61Sheet [data-m61g="rem"][data-v="y"]'); await W(150); s = await save(p);
  pr = P(p1); ok(!s.open && (pr.fails || []).some(f => f.cont && f.teeth.includes(t2) && f.pon) && pr.map && pr.map[t2] === 'p', 'failure → pontic in the map, the rest continue', { fails: pr.fails, map: pr.map, msg: s.msg });
  ok(!(t2 in (pr.ts || {})) && pr.stage !== 'fail', 'the failed tooth leaves the stages; no stop', { ts: pr.ts, st: pr.stage });
  ok(h.sql(`select count(*) n from tasks where plan='${p1}' and kind='book' and done=0`)[0].n >= 1, 're-implant booking task');
  // 4) another patient: referral to the surgeon
  await p.evaluate(id => m61Open(id, 'بیمار سفارش'), p2); await W(1500); const u = (await S(p)).im[0];
  await p.click(`#m61Sheet [data-m61t="${u}"]`); await W(150); await p.click('#m61Sheet [data-m61g="ft"]'); await W(150); await p.click('#m61Sheet [data-m61g="fo"][data-v="surg"]'); await W(150);
  s = await p.evaluate(() => document.querySelector('#m61Sheet').innerText.includes('منتظر معاینه‌ی جراح')); ok(s, 'next step waits for the surgeon');
  s = await save(p); pr = P(p2); ok(pr.hold && pr.hold.teeth.includes(u) && tk(p2).some(t => !t.done && t.info === 'check'), 'hold + reception task «معاینه‌ی جراح»', { hold: pr.hold, T: tk(p2), msg: s.msg });
  const r1 = await h.call('surgery', 'prosSess', { id: p2, work: 'impr', note: 'x', by: 'د', sendId: uuid() }), r2 = await h.call('surgery', 'labNew', { id: p2, lid: uuid(), order: { m58: 1 }, due: '', sendId: uuid() });
  ok(r1 && r1.ok === false && r2 && r2.ok === false, 'no session, no lab order while waiting', { r1, r2 });
  const hl = await p.evaluate(async () => { await loadPday(); return [...document.querySelectorAll('#m61Hl [data-m61hold]')].map(b => b.dataset.m61hold) }); ok(hl.includes(p2), 'surgeon list «منتظر معاینه‌ی جراح»', hl);
  await p.evaluate(id => document.querySelector(`#m61Hl [data-m61hold="${id}"]`).click(), p2); await W(1500); await p.click('#m61Sheet [data-m61g="dec"][data-v="ok"]'); await W(150); s = await save(p);
  pr = P(p2); ok(!pr.hold && (pr.holds || []).length === 1 && !tk(p2).some(t => !t.done && t.info === 'check'), 'surgeon: «مشکلی ندارد» → back to prosthesis; task closed', { holds: pr.holds, msg: s.msg });
  // 5) PDF of the file
  const pdf = await p.evaluate(async id => { const j = await api('get', { id }); const T = []; const _t = textBlock; textBlock = function (t, L) { T.push([t, (L || []).join(' | ')]); return _t.apply(this, arguments) }; try { ffProsBlocks(j, '2099-01-01') } finally { textBlock = _t } return T.filter(x => x[0] === 'ادامه درمان') }, p1);
  ok(pdf.length === 1 && /مرحله‌ی دندان‌ها/.test(pdf[0][1]) && /مرحله‌ی بعد/.test(pdf[0][1]), 'PDF: stages per tooth + next step', pdf);
  // 6) phone
  const ph = await login('surgery', 390, 800); await ph.evaluate(id => m61Open(id, 'بیمار کار امروز'), p1); await W(1500); await ph.click('#m61Sheet .m61t.im'); await W(200);
  await ph.screenshot({ path: '/tmp/phone.png' }); ok(await ph.evaluate(() => { const i = document.querySelector('#m61Sheet .in'); return document.documentElement.scrollWidth <= innerWidth + 1 && i.scrollWidth <= i.clientWidth + 1 }), 'phone: no side scroll');
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
