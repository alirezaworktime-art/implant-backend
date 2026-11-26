// t-m49a (server + page): manager report «ایمپلنت‌های مصرفی» — kind per fixture, by brand, files on tap, period. Run: WORKER=<m49a bundle> node t-m49a.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid, REC } = A;
let bad = 0; const PE = []; const J = (x, n = 600) => String(JSON.stringify(x)).slice(0, n); const W = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await A.start(); const OLD = REC.queueAdd[0].req.id, OLDN = REC.queueAdd[0].req.patient ? REC.queueAdd[0].req.patient.name : '';
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const body = (id, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; return q };
try {
  const a = await mk('نمونه الف'), b = await mk('نمونه ب'), c = await mk('نمونه ج');
  let q = body(a, true); const K = Object.keys(q.session.imp), k0 = K[0], k1 = K[1]; ok((await h.call('surgery', 'surgSave', q)).ok === true, 'A: two placed fixtures');
  q = body(b, true); { const m = q.session.imp[k0]; m.rs = 'fail'; m.rep = 1; m.f2 = { b: m.b, sys: m.sys || '', g: m.g || '', d: String(m.d) === '5' ? '4.5' : '5', l: String(m.l) === '8' ? '10' : '8' } } let r = await h.call('surgery', 'surgSave', q); ok(r.ok === true, 'B: early failure + second fixture on one tooth, one placed', r);
  q = body(c, true); { const m = q.session.imp[k0]; m.rs = 'redo'; m.ri = 1; m.rp = 0; delete q.session.imp[k1] } r = await h.call('surgery', 'surgSave', q); ok(r.ok === true, 'C: one re-implant', r);
  const R = await h.call('manager', 'm1Rep', { from: h.today(), to: h.today() }); const rows = (R.imp || {}).rows || [];
  ok(R.ok && rows.length === 6 && R.imp.n === 6, 'six fixtures in the period', { n: (R.imp || {}).n, l: rows.length });
  const of = id => rows.filter(x => x.id === id), kinds = L => L.map(x => x.rs + (x.second ? '+2' : '')).sort().join();
  ok(kinds(of(a)) === 'new,new', 'A rows: placed, placed', of(a)); ok(kinds(of(b)) === 'fail,new,new+2', 'B rows: early failure, its second fixture (placed), placed', of(b)); ok(kinds(of(c)) === 'redo', 'C row: re-implant', of(c));
  ok(rows.every(x => x.id && x.pat && x.tooth), 'every row has the file id, patient and tooth', rows[0]);
  ok((await h.call('staff', 'm1Rep', { from: h.today(), to: h.today() })).ok === false, 'still only for the manager and the accountant');
  // ---------- page
  const br = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const cx = await br.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await cx.route(/googleapis|gstatic/, x => x.abort()); const p = await cx.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200)));
  await p.goto(h.url); await p.click('[data-lrole="manager"]'); await p.fill('#lg_pw', A.PW.manager); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
  ok(await p.evaluate(() => /---------- m49a \(/.test(document.documentElement.innerHTML)), 'm49a marker in the page');
  await p.evaluate(() => goTile('m1')); await W(2500); await p.evaluate(() => { M1.sec = 'imp'; m1Render() }); await W(400);
  const tbl = id => p.evaluate(id => { const t = document.querySelector(`[data-ft="${id}"]`); if (!t) return null; return { head: [...t.querySelectorAll('thead th')].map(x => x.textContent.trim()), rows: [...t.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim())), foot: [...t.querySelectorAll('tfoot td')].map(x => x.textContent.trim()), sub: (t.querySelector('.fth small') || {}).textContent || '' } }, id);
  let B = await tbl('m49br'), S = await tbl('m5isz'), F = await tbl('m5imp');
  ok(B && B.head.join('|') === 'برند|تعداد|کاشت موفق|کاشت مجدد|فیل اولیه|تعداد بیمار', 'brand table with the three columns', B && B.head);
  ok(B && B.rows.length === 1 && B.foot.slice(1, 5).join('|') === '۶|۴|۱|۱', 'brand totals: 6 = 4 placed + 1 re-implant + 1 early failure', B);
  ok(S && S.head.slice(1, 5).join('|') === 'تعداد|کاشت موفق|کاشت مجدد|فیل اولیه' && S.foot.slice(1, 5).join('|') === '۶|۴|۱|۱', 'size table with the three columns', S && S.foot);
  ok(F && F.rows.length === 6 && F.head.includes('نوع') && F.rows.every(x => /پرونده/.test(x[x.length - 1])), 'file list: six rows, kind column, a «پرونده» button on each', F && F.head);
  const szRow = S.rows.find(x => x[4] === '۱') || S.rows[0]; await p.click(`[data-ft="m5isz"] tbody tr[data-m5s="${szRow[0]}"]`); await W(400); F = await tbl('m5imp');
  ok(F.rows.length === Number(szRow[1].replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))) && await p.evaluate(() => !!document.getElementById('m49Clr')), 'a tap on a size lists only the files with that size', { sz: szRow, n: F.rows.length });
  await p.click('#m49Clr'); await W(300); await p.click('[data-ft="m49br"] tbody tr.m5pick'); await W(400); F = await tbl('m5imp'); ok(F.rows.length === 6 && await p.evaluate(() => M1.ibr !== '' && document.querySelector('[data-ft="m49br"] tr.m49on') !== null), 'a tap on a brand lists the files of that brand', F.rows.length);
  await p.click('[data-ft="m5imp"] tbody tr [data-file]'); await W(1500); ok(await p.evaluate(() => !document.getElementById('pfSheet').hidden && /نمونه/.test(document.getElementById('pfTitle').textContent)), '«پرونده» opens the patient file'); await p.evaluate(() => { document.getElementById('pfSheet').hidden = true });
  // period: the last choice wins even while a load is running
  const d0 = h.today(), dA = new Date(Date.parse(d0 + 'T12:00:00Z') - 40 * 864e5).toISOString().slice(0, 10), dB = new Date(Date.parse(d0 + 'T12:00:00Z') - 35 * 864e5).toISOString().slice(0, 10);
  await p.evaluate(([dA, dB, d0]) => { M1.per = { from: dA, to: d0 }; M1.pk = 'c'; m1Load(); M1.per = { from: dA, to: dB }; m1Load() }, [dA, dB, d0]); await W(2500);
  let s = await p.evaluate(() => ({ f: M1.d.from, t: M1.d.to, per: M1.per, busy: M1.busy, n: M1.d.imp.n })); ok(s.f === dA && s.t === dB && s.n === 0 && !s.busy, 'two quick choices: the tables show the last period', s);
  F = await tbl('m5imp'); ok(F && /تا/.test(F.sub) && await p.evaluate(dB => document.querySelector('[data-ft="m5imp"] .fth small').textContent.includes(jDay(dB)), dB), 'the dates above the table are the chosen period', F && F.sub);
  await p.evaluate(d0 => { M1.pk = 'c'; m1Render(); const i = document.getElementById('m1To'); i.value = jDay(d0); i.dispatchEvent(new Event('change', { bubbles: true })) }, d0); await W(2500);
  s = await p.evaluate(() => ({ t: M1.d.to, n: M1.d.imp.n })); ok(s.t === d0 && s.n === 6, 'choosing a date loads the report without «نمایش»', s);
  ok(!PE.length, 'no page errors', PE); await br.close();
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
