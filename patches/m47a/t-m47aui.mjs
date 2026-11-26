// t-m47aui: «جلسه‌ی پروتز» — the lab work order opens with «ارسال کار برای لابراتوار», nothing in it is mandatory, files go with it. Run: WORKER=<m47a bundle> node t-m47aui.mjs
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
const p1 = await toDis('بیمار دستورکار'), p2 = await toDis('بیمار بی‌سفارش'), p3 = await toDis('بیمار کامل'); await h.travel(1);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const st = p => p.evaluate(() => { const v = e => !!e && e.offsetParent !== null, q = s => document.querySelector(s); return { go: v(q('#m47Go')), form: v(q('#pfBody .h9form')), hd: v(q('#m47Hd')), lab: (q('#pfActs #l5Lab') || {}).textContent || '', save: (q('#pfActs #l5Save') || {}).textContent || '', star: [...document.querySelectorAll('#pfBody .l8req')].some(v), drop: v(q('#h9Drop')), msg: (q('#l5Msg') || {}).textContent || '', sheet: !q('#pfSheet').hidden, chart: v(q('#pfBody .pk4teeth')), base: (typeof LO !== 'undefined' && LO && LO.h9 ? LO.h9.base : []).join(','), pon: (typeof LO !== 'undefined' && LO && LO.h9 ? LO.h9.pon : []).join(',') } });
try {
  const p = await login('surgery');
  ok(await p.evaluate(() => /---------- m47a \(/.test(document.documentElement.innerHTML)), 'm47a marker in the page');
  // ---- 1) work first, then the button, then an empty work order with a file
  await p.evaluate(id => l5Open(id, 'بیمار دستورکار', ''), p1); await W(1200); let s = await st(p);
  ok(s.sheet && s.chart && s.go && !s.form && !s.hd && !s.lab && s.save === 'ثبت جلسه', 'session page: work + chart first, the work order is closed, one button «ثبت جلسه»', s);
  await p.click('[data-pk4t="UR6"]'); await p.click('[data-pk4t="UR5"]'); await p.click('[data-pk4t="UR5"]'); await W(200);
  await p.fill('#ps_note', 'قالب گرفته شد'); await p.click('#m47Go'); await W(500); s = await st(p);
  ok(!s.go && s.form && s.hd && s.drop && !s.star && s.lab === 'ثبت جلسه و ارسال به لابراتوار' && /بدون ارسال/.test(s.save), '«ارسال کار برای لابراتوار» opens the work order: no star, file box in place', s);
  ok(s.base === 'UR6' && s.pon === 'UR5', 'the sheet starts with the پایه / پونتیک of the session', s);
  ok(await p.evaluate(() => document.getElementById('ps_note').value === 'قالب گرفته شد'), 'typed note is kept');
  fs.writeFileSync('/tmp/m47-scan.stl', 'solid x\nendsolid x\n'); await p.setInputFiles('#lo_files', '/tmp/m47-scan.stl'); await W(400);
  await p.screenshot({ path: '/tmp/open.png', fullPage: false });
  await p.click('#pfActs #l5Lab'); for (let i = 0; i < 60 && (await st(p)).sheet; i++) await W(250); s = await st(p);
  let L = labsOf(p1), pr = P(p1); ok(!s.sheet && L.length === 1, 'empty work order is stored and goes to the lab', { s, n: L.length });
  ok(L[0] && L[0].data.teeth.slice().sort().join() === 'UR5,UR6' && (L[0].data.pon || []).join() === 'UR5', 'order teeth = session teeth', L[0] && L[0].data);
  ok(pr.sess && pr.sess.length === 1 && pr.sess[0].lid === (L[0] || {}).id && pr.sess[0].pt.UR6 === 'a' && pr.sess[0].note === 'قالب گرفته شد' && pr.stage === 'lab', 'session is in the prosthesis file with its chart', pr.sess);
  const F = L[0] ? h.sql(`select name from lab_file where lab='${L[0].id}'`).map(x => x.name) : []; ok(F.some(n => /m47-scan\.stl/.test(n)) && F.some(n => /^برگه-دستورکار-/.test(n)), 'the uploaded file and the sheet image are with the order', F);
  // ---- 2) session alone
  await p.evaluate(id => l5Open(id, 'بیمار بی‌سفارش', ''), p2); await W(1200); await p.click('[data-pk4t="LL6"]'); await W(200); await p.click('#pfActs #l5Save'); for (let i = 0; i < 40 && (await st(p)).sheet; i++) await W(250);
  pr = P(p2); ok(labsOf(p2).length === 0 && pr.sess && pr.sess.length === 1 && pr.sess[0].pt.LL6 === 'a', '«ثبت جلسه» stores the session without an order', pr.sess);
  // ---- 3) open, close, open; session checks stay
  await p.evaluate(id => l5Open(id, 'بیمار کامل', ''), p3); await W(1200); await p.click('#m47Go'); await W(400); await p.click('#pfActs #l5Lab'); await W(600); s = await st(p);
  ok(s.sheet && /پایه \/ پونتیک/.test(s.msg) && labsOf(p3).length === 0, 'the chart of the session is still asked', s);
  await p.click('#m47No'); await W(300); s = await st(p); ok(s.go && !s.form && s.save === 'ثبت جلسه', '«بستن دستورکار» closes it again', s);
  await p.click('[data-pk4t="UL1"]'); await W(200); await p.click('#m47Go'); await W(400); s = await st(p); ok(s.base === 'UL1', 'chart → sheet on reopen', s);
  await p.click('[data-pk4t="UL2"]'); await W(300); s = await st(p); ok(s.form && s.base.split(',').sort().join() === 'UL1,UL2', 'a tooth added while the order is open follows', s);
  await p.click('#pfActs #l5Lab'); for (let i = 0; i < 60 && (await st(p)).sheet; i++) await W(250); L = labsOf(p3); ok(L.length === 1 && L[0].data.teeth.length === 2, 'order stored', L[0] && L[0].data);
  // ---- 4) the lab sees it
  const lp = await login('lab'); await W(1500); const seen = await lp.evaluate(async () => { try { await pollLab(true) } catch (e) { } return (LB.items || []).length }); ok(seen >= 2, 'the lab list shows the orders', seen);
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
