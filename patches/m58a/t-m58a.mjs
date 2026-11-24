// t-m58a: prosthesis cards — «کار امروز» (file + PDF) and «سفارش لابراتوار» are two separate buttons. Run: WORKER=<m58a bundle> node t-m58a.mjs
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
const st = p => p.evaluate(() => { const v = e => !!e && e.offsetParent !== null, q = s => document.querySelector(s); return { sheet: !q('#pfSheet').hidden, title: (q('#pfTitle') || {}).textContent || '', h3: (q('#pfBody .l5work h3') || {}).textContent || '', go: !!q('#m47Go'), lab: !!q('#pfActs #l5Lab'), save: (q('#pfActs #l5Save') || {}).textContent || '', note: v(q('#pfBody .m58n')), form: v(q('#pfBody .h9form')) || v(q('#pfBody #loSend')), loSend: v(q('#loSend')), chart: v(q('#pfBody .pk4teeth')), msg: (q('#l5Msg') || {}).textContent || '' } });
try {
  const p = await login('surgery');
  ok(await p.evaluate(() => /---------- m58a \(/.test(document.documentElement.innerHTML)), 'm58a marker in the page');
  // 1) the prosthesis-day card has two buttons
  const card = await p.evaluate(id => { const d = document.createElement('div'); d.id = 'm58t'; d.innerHTML = pdCard(id, 'بیمار کار امروز', 'x', { stage: 'impr' }); document.body.append(d); return [...d.querySelectorAll('.acts button')].map(b => b.textContent) }, p1);
  ok(card[0] === 'کار امروز' && card[1] === 'سفارش لابراتوار' && !card.includes('جلسه‌ی پروتز'), 'prosthesis card: «کار امروز» then «سفارش لابراتوار»', card);
  // 2) «کار امروز»: only work + chart + note, one button
  await p.click('#m58t [data-l5]'); await W(1500); let s = await st(p);
  ok(s.sheet && /^کار امروز.+بیمار کار امروز$/.test(s.title) && s.h3 === 'کار امروز' && s.chart, 'the sheet is «کار امروز» with the tooth chart', s);
  ok(!s.go && !s.lab && !s.form && s.save === 'ثبت کار امروز' && s.note, 'no lab order inside; one button «ثبت کار امروز»', s);
  const long = 'قالب‌گیری باز با ترانسفر انجام شد و رنگ A2 انتخاب شد؛ بیمار برای امتحان رزین دو هفته بعد بیاید.';
  await p.click('[data-pk4t="UR6"]'); await W(200); await p.fill('#ps_note', long); await p.click('#pfActs #l5Save'); for (let i = 0; i < 40 && (await st(p)).sheet; i++) await W(250);
  let pr = P(p1); ok(labsOf(p1).length === 0 && pr.sess && pr.sess.length === 1 && pr.sess[0].note === long && pr.sess[0].pt.UR6 === 'a', 'stored in the file without a lab order', pr.sess);
  ok((pr.log || []).some(g => String(g.note).includes(long)), 'the work is in the steps log (PDF «مراحل ثبت‌شده»)', pr.log);
  // 3) PDF of the file: the full note is there
  const pdf = await p.evaluate(async id => { const j = await api('get', { id }); const T = []; const _t = textBlock; textBlock = function (t, L) { T.push([t, (L || []).join(' | ')]); return _t.apply(this, arguments) }; try { ffProsBlocks(j, '2099-01-01') } finally { textBlock = _t } return T }, p1);
  ok(pdf.some(([t, l]) => t === 'مراحل ثبت‌شده') && pdf.some(([t, l]) => t === 'توضیح کامل مراحل' && l.includes(long)), 'PDF: steps table + the full doctor note', pdf);
  // 4) «سفارش لابراتوار» from the card opens the lab order only
  await p.evaluate(id => { const d = $('m58t'); d.innerHTML = pdCard(id, 'بیمار سفارش', 'x', { stage: 'impr' }) }, p2); await p.click('#m58t [data-m58lab]'); await W(2000);
  s = await st(p); const pm = await p.evaluate(() => { const v = e => !!e && e.offsetParent !== null; return v(document.querySelector('#pmSheet')) || [...document.querySelectorAll('.sheet')].some(x => !x.hidden && /پایه/.test(x.textContent) && x.id !== 'pfSheet') });
  ok(s.sheet && (s.loSend || pm) && !s.h3 && !(typeof L5 !== 'undefined' && false), '«سفارش لابراتوار» opens the lab order (or the پایه / پونتیک chart first), not «کار امروز»', { s, pm });
  ok(await p.evaluate(() => !L5 && !!LO), 'lab order state, no session', await p.evaluate(() => ({ L5: !!L5, LO: !!LO })));
  ok(labsOf(p2).length === 0 && !(P(p2).sess || []).length, 'nothing is stored by just opening it');
  // 4b) send a lab order from the card for the patient whose پایه was marked in «کار امروز»
  await p.evaluate(() => { $('pfSheet').hidden = true; LO = null }); await p.evaluate(id => { $('m58t').innerHTML = pdCard(id, 'بیمار کار امروز', 'x', { stage: 'lab' }) }, p1); await p.click('#m58t [data-m58lab]'); await W(2000);
  s = await st(p); ok(s.loSend && !s.h3, 'lab order form opens for a patient with پایه', s);
  const fr = await p.evaluate(() => { const c = s => { const b = document.querySelector(s); if (b) b.click(); return !!b }; return [c('[data-lofor]'), c('[data-h9o="imp"]'), c('[data-h9o="itype"]'), c('[data-h9o="imat"]')] }); await W(300);
  await p.click('#loSend'); for (let i = 0; i < 60 && (await st(p)).loSend; i++) await W(250); s = await st(p);
  let L = labsOf(p1); ok(L.length === 1 && (P(p1).sess || []).length === 1, 'the order is stored alone (no new session)', { n: L.length, msg: await p.evaluate(() => ($('loMsg') || {}).textContent || ''), fr, sess: (P(p1).sess || []).length });
  // 5) referral card (surgeon): «کار امروز» + «سفارش لابراتوار»
  const ref = await p.evaluate(id => { $('pfSheet').hidden = true; show('viewPday'); QPREF = [{ id, name: 'بیمار سفارش', aid: '', at: new Date().toISOString(), by: 'منشی', kind: '', stage: 'impr' }]; l3RenderRef(); return [...document.querySelectorAll('#l3Ref .acts button')].map(b => b.textContent) }, p2);
  ok((ref[0] === 'کار امروز' || ref[0] === 'ادامه درمان') && ref[1] === 'سفارش لابراتوار', 'referral card: «کار امروز» (m61a: «ادامه درمان») then «سفارش لابراتوار»', ref);
  // 6) phone width
  const ph = await login('surgery', 390, 800); await ph.evaluate(id => { const d = document.createElement('div'); d.id = 'm58t'; d.innerHTML = pdCard(id, 'بیمار کار امروز', 'x', { stage: 'impr' }); document.body.prepend(d) }, p1);
  const ov = await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); ok(ov, 'phone: no side scroll');
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
