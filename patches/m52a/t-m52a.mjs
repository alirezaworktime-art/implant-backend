// t-m52a (server + page). Run: WORKER=<m52a bundle> node --import sameday-shim t-m52a.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { REC, uuid } = A;
let bad = 0; const PE = []; const J = (x, n = 500) => String(JSON.stringify(x)).slice(0, n); const W = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await A.start(); const OLD = REC.surgSave[0].req.id;
const body = (id, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; return q };
const pre = async nm => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, nm, 'surg', h.today(), tk.id); return id };
const sg = id => JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg || '{}');
const br = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async role => { const c = await br.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); p.on('dialog', x => x.dismiss()); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  // ---------- (1) server
  const p0 = await pre('نمونه قبل جراحی'); let r = await h.call('staff', 'm52SurgDisc', { id: p0, op: 'info' }); ok(r.ok && r.can === 0 && !r.on, 'before surgery the surgery-only discount is not offered', r);
  r = await h.call('staff', 'm52SurgDisc', { id: p0, op: 'on' }); ok(r.ok === false, 'and «on» is refused', r);
  const b1 = await pre('نمونه بدهکار'); await h.must('staff', 'q9Allow', { id: b1, reason: 'تأیید مدیریت در آزمون' }); await h.must('staff', 'toSurgery', { id: b1 }); r = await h.call('surgery', 'surgSave', body(b1, false)); ok(r.ok === true, 'operated (not the last session) before paying', r);
  const row = h.sql(`select total, data from plans where id='${b1}'`)[0], pt = JSON.parse(row.data).parts, T = Number(row.total), S = Math.round(pt.S * T / (pt.S + pt.P)), want = S * 0.05 >= 1e6 ? Math.round(S * 0.05 / 1e6) * 1e6 : Math.round(S * 0.05);
  r = await h.call('staff', 'm52SurgDisc', { id: b1, op: 'info' }); ok(r.ok && r.can === 1 && r.amt === want && r.pct === 5 && r.S === S && want > 0, 'after surgery: 5% of the surgery part only', { r, S, want });
  r = await h.call('doctor', 'm52SurgDisc', { id: b1, op: 'on' }); ok(r.ok === false, 'not for the doctor', r);
  const owe0 = (await h.call('staff', 'queue', {})).items; const o0 = (owe0 || []).find(x => x.id === b1) || {};
  r = await h.call('staff', 'm52SurgDisc', { id: b1, op: 'on', by: 'منشی' }); let s = sg(b1); ok(r.ok && r.on === 1 && s.waived === want && s.m52d && s.m52d.amt === want && /تخفیف 5٪ پرداخت نقدی پارت جراحی/.test(s.waiveNote || ''), '«on» takes it off the account', { r, w: s.waived, n: s.waiveNote });
  ok(Number(h.sql(`select total from plans where id='${b1}'`)[0].total) === T && JSON.stringify(JSON.parse(h.sql(`select data from plans where id='${b1}'`)[0].data).parts) === JSON.stringify(pt), 'the plan total and the parts are untouched');
  const o1 = ((await h.call('staff', 'queue', {})).items || []).find(x => x.id === b1) || {}; ok(o0.owe > 0 && o1.owe === o0.owe - want, 'what is asked at discharge drops by the discount', { a: o0.owe, b: o1.owe });
  r = await h.call('staff', 'm52SurgDisc', { id: b1, op: 'on' }); ok(r.ok && r.same === 1 && sg(b1).waived === want, 'a second «on» changes nothing', r);
  r = await h.call('surgery', 'get', { id: b1 }); ok(r.ok && r.surg && r.surg.m52d === undefined && r.surg.waived === undefined, 'the surgery room does not see it', Object.keys(r.surg || {}));
  await h.must('staff', 'toSurgery', { id: b1, payAck: 'ادامه‌ی جراحی در آزمون' }).catch(async () => { await h.must('staff', 'q9Allow', { id: b1, reason: 'جلسه‌ی دوم در آزمون' }); await h.must('staff', 'toSurgery', { id: b1 }) });
  r = await h.call('surgery', 'surgSave', body(b1, true)); s = sg(b1); ok(r.ok === true && s.waived === want && s.m52d && s.m52d.amt === want && s.sessions.length === 2, 'a later surgery session keeps the discount', { r, w: s.waived, n: (s.sessions || []).length });
  r = await h.call('staff', 'm52SurgDisc', { id: b1, op: 'off' }); s = sg(b1); ok(r.ok && r.on === 0 && !s.waived && !s.m52d && !/تخفیف/.test(s.waiveNote || ''), '«off» gives it back', { r, w: s.waived, n: s.waiveNote });
  ok(h.sql(`select count(*) c from events where plan='${b1}' and kind='m52SurgDisc'`)[0].c === 2, 'both steps are in the file history');
  // a cheque of the surgery part
  const b2 = await pre('نمونه چکی'); await h.must('staff', 'q9Allow', { id: b2, reason: 'تأیید مدیریت در آزمون' }); await h.must('staff', 'toSurgery', { id: b2 }); await h.must('surgery', 'surgSave', body(b2, true));
  r = await h.call('staff', 'payAdd', { id: b2, pid: 'cq-' + uuid() + '-s0', pay: { kind: 'chq', part: 's', amount: 5000000, due: h.today(), no: '123456', bank: 'ملی', by: 'م', note: '', ctype: 'صیادی', payee: 'کلینیک' }, sendId: uuid() });
  if (r.ok) { r = await h.call('staff', 'm52SurgDisc', { id: b2, op: 'on' }); ok(r.ok === false && /چک/.test(r.error || ''), 'with a cheque of the surgery part it is refused', r) } else console.log('note: cheque could not be registered in the test', J(r, 200));
  // ---------- (1) page
  const st = await login('staff'); ok(await st.evaluate(() => /---------- m52a \(/.test(document.documentElement.innerHTML)), 'm52a marker in the page');
  const sheet = async id => { await st.evaluate(async id => { const j = await api('get', { id }); openPostConfirm(fromDoc(id, j.data || {})) }, id); await W(3000) };
  const see = () => st.evaluate(() => ({ both: (b => !!b && !b.hidden)(document.querySelector('#pl11Pt [data-pl11pt="b"]')), part: (document.querySelector('#pl11Pt [aria-pressed="true"]') || { dataset: {} }).dataset.pl11pt, m52: [...document.querySelectorAll('[data-m52pm]')].map(b => b.dataset.m52pm + ':' + b.getAttribute('aria-pressed') + ':' + b.disabled), m50: document.querySelectorAll('[data-m50pm]').length, note: (document.getElementById('m50PmN') || {}).textContent || '', sep: !!document.getElementById('m52Sep'), cashS: PC && PC._o && PC._o.cashS, pn: (document.getElementById('pl11Note') || {}).textContent || '' }));
  await sheet(p0); let v = await see(); ok(v.both && v.m52.length === 0 && v.m50 === 2 && !v.sep, 'before surgery the sheet is as before («هر دو», «نقدی کامل»)', v);
  await st.evaluate(() => { document.getElementById('pcSheet').hidden = true });
  await sheet(b1); v = await see(); ok(!v.both && v.part === 's' && v.sep && v.m52.join() === 'off:true:false,on:false:false' && v.m50 === 0 && v.note.includes(want.toLocaleString('fa-IR')), 'after surgery: no «هر دو», surgery part first, «نقد جراحی با ۵٪ تخفیف»', v);
  const cash0 = v.cashS;
  await st.click('[data-m52pm="on"]'); await W(600); await st.click('#uxAskOk'); await W(4500); v = await see(); s = sg(b1);
  ok(s.waived === want && v.m52.join() === 'off:false:false,on:true:false' && v.part === 's' && /کم شده/.test(v.note), 'the chip records the discount and the sheet comes back', { v, w: s.waived });
  const snapS = await st.evaluate(() => chqFor(PC.m52r).S); ok(v.cashS === snapS - want && new RegExp(String((snapS - want).toLocaleString('fa-IR'))).test(v.pn), 'cash expected for the surgery part = part − discount, no surgery cheque', { cashS: v.cashS, snapS, want, pn: v.pn, cash0 });
  await st.click('[data-pl11pt="p"]'); await W(400); v = await see(); ok(v.part === 'p' && /پروتز/.test(v.pn), 'the prosthesis part is settled on its own', v.pn);
  await st.click('[data-m52pm="off"]'); await W(600); await st.click('#uxAskOk'); await W(4500); v = await see(); s = sg(b1); ok(!s.waived && v.m52.join() === 'off:true:false,on:false:false', 'back to the plan terms', { v, w: s.waived });
  await st.evaluate(() => { document.getElementById('pcSheet').hidden = true });
  // ---------- (2)
  const w1 = await h.add('نمونه منتظر'); r = await h.call('doctor', 'queueOpen', { id: w1 }); ok(h.sql(`select queue from plans where id='${w1}'`)[0].queue === 'reviewing', 'the doctor opened the patient (reviewing)', r);
  await st.evaluate(() => pollQ(true)); await W(2500);
  v = await st.evaluate(id => { const x = QITEMS.find(q => q.id === id); return x ? { q: x.queue, pill: qPill(x), wait: waitPill(x), txt: document.body.innerText.includes('نزد پزشک\n') } : null }, w1);
  ok(v && v.q === 'reviewing' && /منتظر پزشک/.test(v.pill) && !/نزد پزشک/.test(v.pill) && /class="wt/.test(v.wait), 'reception still sees «منتظر پزشک» with the waiting time', v);
  const dc = await login('doctor'); v = await dc.evaluate(id => { const x = QITEMS.find(q => q.id === id); return x ? { pill: qPill(x), wait: waitPill(x) } : null }, w1); ok(v && /منتظر پزشک/.test(v.pill) && /class="wt/.test(v.wait), 'the doctor too', v);
  // ---------- (3)
  await dc.evaluate(() => { show('list'); return loadList() }); await W(2500);
  const n = h.sql("select count(*) c from plans where consultAt is not null and consultAt<>'' and (json_extract(data,'$.h.arc') is null)")[0].c;
  v = await dc.evaluate(() => (document.getElementById('m52Cnt') || {}).textContent || ''); ok(n >= 3 && v.includes('طرح درمان‌های ثبت‌شده') && new RegExp(': ' + n.toLocaleString('fa-IR') + '\\D+این ماه ' + n.toLocaleString('fa-IR') + '\\D+امروز ' + n.toLocaleString('fa-IR') + '$').test(v), 'the doctor archive counts the plans sent to the consultant', { v, n });
  await st.evaluate(() => { show('list'); return loadList() }); await W(1500); ok(await st.evaluate(() => !document.getElementById('m52Cnt')), 'reception has no such line');
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await br.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
