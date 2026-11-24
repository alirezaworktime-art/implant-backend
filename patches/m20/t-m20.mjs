// t-m20: «تعامل لابراتوار و پزشک» — lab opens a case, observer login (read only), report. Run: WORKER=<bundle> node t-m20.mjs
// The observer's first password = the first password of user «doctor»; the test swaps that built-in hash for a test one in a temp copy of the bundle (no real password is used here).
import { createRequire } from 'node:module'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const SRC = process.env.WORKER, TMP = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'm20-')), 'w.mjs');
{ let s = fs.readFileSync(SRC, 'utf8'); const m = s.match(/const LF_DEF = \{ lfdoc: '([^']+)'/); if (!m) throw new Error('LF_DEF not found'); s = s.split(m[1]).join(sha('ipk|lf|doctor|test-doc-0')); fs.writeFileSync(TMP, s) }
process.env.WORKER = TMP; const A = await import(new URL('../audit/A.mjs', import.meta.url).href);
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const post = async (pw, action, body = {}) => (await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: pw, ...body }) })).json();
h.sql(`insert or replace into kv (k, v, t) values ('pw:lflab', '${sha('ipk|lf|lab|test-lab-0')}', 0) returning k`);
const DOC = 'lf|doctor|test-doc-0', LAB = 'lf|lab|test-lab-0', NAZ = 'lf|nazer|test-doc-0';
const base = { clinic: 'روشن‌طلب', patient: 'بیمار یک', part: 'کار نهایی', teeth: [16, 15], pt: { 15: 'p' }, desc: 'توضیح', pri: 'normal', images: [] };
try {
  ok((await post(DOC, 'ping')).role === 'lfdoc' && (await post(LAB, 'ping')).role === 'lflab', 'doctor and lab still log in');
  let r = await post(NAZ, 'ping'); ok(r.role === 'lfnazer' && r.user === 'ناظر', 'observer logs in with the first doctor password (no password of its own yet)', r);
  ok((await post('lf|nazer|wrong-pw', 'ping')).ok === false, 'observer: wrong password refused');
  /* lab opens a case */
  r = await post(LAB, 'lf', Object.assign({ op: 'new', issue: 'کانتکت باز' }, base)); ok(r.ok === false, 'lab case needs one of the lab issue kinds', r);
  r = await post(LAB, 'lf', Object.assign({ op: 'new', issue: 'اسکن ناقص یا بی‌کیفیت' }, base)); ok(r.ok && r.no === 1, 'lab opens a case for the doctor', r); const id1 = r.id;
  let L = (await post(DOC, 'lf', { op: 'list' })); let c = L.cases.find(x => x.id === id1);
  ok(c && c.from === 'lab' && c.st === 'doc' && c.thread[0].role === 'lflab' && c.pt['15'] === 'p' && c.pt['16'] === 'a' && Array.isArray(L.lists.labIssues), 'doctor sees it: from the lab, waiting for the doctor, abutment/pontic kept', c);
  r = await post(DOC, 'lf', { op: 'act', id: id1, k: 'toLab', text: 'اسکن دوباره فرستاده شد', images: [] }); ok(r.ok && r.st === 'lab', 'doctor answers → back to the lab', r);
  r = await post(LAB, 'lf', { op: 'act', id: id1, k: 'close', cause: 'خطای پزشک', outcome: 'اصلاح شد', text: '', images: [] }); ok(r.ok && r.st === 'closed', 'lab closes it', r);
  r = await post(DOC, 'lf', { op: 'act', id: id1, k: 'ok', text: '', images: [] }); ok(r.ok, 'doctor confirms', r);
  /* doctor's own cases still work */
  r = await post(DOC, 'lf', Object.assign({ op: 'new', issue: 'کانتکت باز' }, base, { patient: 'بیمار دو', clinic: 'ارکیده' })); ok(r.ok && r.no === 2, 'doctor opens a case as before', r); const id2 = r.id;
  r = await post(DOC, 'lf', Object.assign({ op: 'new', issue: 'اسکن ناقص یا بی‌کیفیت' }, base)); ok(r.ok === false, 'doctor cannot use a lab issue kind', r);
  await post(DOC, 'lf', Object.assign({ op: 'new', issue: 'رنگ نامناسب' }, base, { patient: 'بیمار دو', clinic: 'ارکیده' })); await post(DOC, 'lf', Object.assign({ op: 'new', issue: 'کانتکت باز' }, base, { patient: 'بیمار سه', clinic: 'ارکیده' }));
  /* observer: read only */
  L = await post(NAZ, 'lf', { op: 'list' }); ok(L.ok && L.cases.length === 4 && L.me === 'lfnazer', 'observer sees every case', [L.ok, (L.cases || []).length]);
  for (const [op, body] of [['new', Object.assign({ issue: 'کانتکت باز' }, base)], ['act', { id: id2, k: 'toDoc', cause: 'مواد', text: 'x' }], ['ship', { id: id2, field: 'received' }], ['seen', { id: id2 }]]) { r = await post(NAZ, 'lf', Object.assign({ op }, body)); ok(r.ok === false, 'observer cannot: ' + op, r) }
  for (const a of ['queue', 'list', 'settings', 'lfPw', 'save', 'backup']) { r = await post(NAZ, a, { who: 'doctor', pw: 'abcdef' }); ok(r.ok === false, 'observer cannot reach action: ' + a, r) }
  ok((await post(DOC, 'ping')).role === 'lfdoc', 'doctor password untouched by the attempts');
  /* manager sets the observer's own password */
  r = await h.call('manager', 'lfPw', { who: 'nazer', pw: 'test-naz-1' }); ok(r.ok, 'manager sets the observer password', r);
  ok((await post('lf|nazer|test-naz-1', 'ping')).role === 'lfnazer' && (await post(NAZ, 'ping')).ok === false, 'new observer password works, the first one no longer does');
  ok((await post('lf|doctor|test-naz-1', 'ping')).ok === false && (await post('lf|lab|test-naz-1', 'ping')).ok === false, 'the observer password opens nothing else');
  /* screens */
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const login = async (u, pw, vp = { width: 1366, height: 900 }) => { const cx = await b.newContext({ viewport: vp, locale: 'fa-IR', timezoneId: 'Asia/Tehran', acceptDownloads: true }); await cx.route(/googleapis|gstatic/, x => x.abort()); const p = await cx.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message)); p.on('dialog', d => d.dismiss());
    await p.goto(h.url); await p.click('[data-lrole="lf"]'); await W(300); await p.fill('#lf_user', u); await p.fill('#lg_pw', pw); await p.click('#lgGo'); await W(2500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
  const lab = await login('lab', 'test-lab-0');
  ok(await lab.evaluate(() => ROLE === 'lflab' && tileList().some(t => t.k === 'lfnew2')), 'lab: tile «ثبت ایراد برای پزشک»', await lab.evaluate(() => [ROLE, tileList().map(t => t.k)]));
  await lab.evaluate(() => goTile('lfnew2')); await W(800);
  ok(await lab.evaluate(() => /ثبت ایراد برای پزشک/.test($('lfRoot').textContent) && /دستور کار ناقص/.test($('lfRoot').textContent) && !/کانتکت باز/.test($('lfRoot').textContent) && !$('lfShip') && /ارسال به پزشک/.test($('lfSend').textContent)), 'lab form: own issue kinds, no «کار فیزیکی», button «ارسال به پزشک»');
  const chip = (p, g, v) => p.evaluate(([g, v]) => { const x = [...document.querySelectorAll(`[data-lfch="${g}"] [data-lfc]`)].find(z => z.dataset.lfc === v); x.click() }, [g, v]);
  await chip(lab, 'clinic', 'مطب رازان'); await lab.fill('#lfPat', 'بیمار از صفحه'); await chip(lab, 'part', 'اباتمنت'); await chip(lab, 'issue', 'دستور کار ناقص یا نامشخص'); await lab.click('[data-lft="36"]'); await lab.fill('#lfDesc', 'رنگ و نوع متریال نوشته نشده'); await lab.click('#lfSend'); await W(2000);
  c = (await post(DOC, 'lf', { op: 'list' })).cases.find(x => x.patient === 'بیمار از صفحه'); ok(c && c.from === 'lab' && c.st === 'doc' && c.clinic === 'مطب رازان', 'lab form saved the case', c);
  ok(await lab.evaluate(() => LF.seg === 'doc' && /بیمار از صفحه/.test($('lfRoot').textContent) && /از لابراتوار/.test($('lfRoot').textContent)), 'lab lands on «نزد پزشک» with the new case tagged «از لابراتوار»', await lab.evaluate(() => [LF.seg, $('lfRoot').textContent.slice(0, 200)]));
  const doc = await login('doctor', 'test-doc-0'); await doc.evaluate(() => goTile('lfrep')); await W(800); await doc.evaluate(id => lfOpen(id), c.id); await W(600);
  ok(await doc.evaluate(() => /ثبت‌کننده/.test($('lfRoot').textContent) && /لابراتوار \(ایراد از کار پزشک\)/.test($('lfRoot').textContent) && !!document.querySelector('[data-lfact="toLab"]')), 'doctor: case shows who opened it and the answer box');
  const nz = await login('Nazer', 'test-naz-1');
  ok(await nz.evaluate(() => ROLE === 'lfnazer' && tileList().map(t => t.k).join() === 'lfrpt,lfall' && LF.seg === 'rpt'), 'observer signs in as «Nazer» and lands on the report', await nz.evaluate(() => [ROLE, tileList().map(t => t.k), LF.seg]));
  const tbl = () => nz.evaluate(() => [...document.querySelectorAll('.m20t')].map(t => [...t.rows].map(r => [...r.cells].map(c => toEn(c.textContent)))));
  let T = await tbl(); const row = (t, k) => (t.find(r => r[0] === k) || []);
  ok(T.length === 2 && row(T[0], 'ارکیده').slice(-1)[0] === '2' && row(T[0], 'جمع').slice(-1)[0] === '4' && T[0][0].includes('کانتکت باز') && T[0][0].includes('اسکن ناقص یا بی‌کیفیت'), 'report: patients per clinic × issue (ارکیده = 2 patients in 3 cases, total 4)', T[0]);
  ok(await nz.evaluate(() => toEn(document.querySelector('.lfkp').textContent).replace(/\s+/g, ' ')).then(t => /4\s*بیمار/.test(t) && /5\s*پرونده/.test(t)), 'report totals: 4 patients, 5 cases', await nz.evaluate(() => document.querySelector('.lfkp').textContent));
  await nz.selectOption('#m20Dir', 'lab'); await W(400); T = await tbl(); ok(row(T[0], 'جمع').slice(-1)[0] === '2' && !T[0][0].includes('کانتکت باز'), 'filter «ثبت‌کننده: لابراتوار»', T[0]);
  await nz.selectOption('#m20Dir', ''); await nz.selectOption('#m20Cl', 'ارکیده'); await W(400); T = await tbl(); ok(T[0].length === 3 && row(T[0], 'جمع').slice(-1)[0] === '2', 'filter by clinic', T[0]);
  await nz.selectOption('#m20Cl', ''); await nz.fill('#m20From', '1404/01/01'); await nz.press('#m20From', 'Tab'); await nz.fill('#m20To', '1404/01/02'); await nz.press('#m20To', 'Tab'); await W(500);
  ok(await nz.evaluate(() => /پرونده‌ای نیست/.test($('lfRoot').textContent)), 'date range without cases → empty message');
  await nz.evaluate(() => document.querySelector('[data-m20p="today"]').click()); await W(400); T = await tbl(); ok(row(T[0], 'جمع').slice(-1)[0] === '4' && T[1].length === 2, '«امروز»: all four patients, one date row', T);
  await nz.evaluate(() => { window.__x = null; const _x = xlsx; xlsx = function (sheets, file) { window.__x = { n: sheets.length, file, heads: sheets.map(s => s.head.length), rows: sheets.map(s => s.rows.length) }; return _x.apply(this, arguments) } }); await nz.click('#m20Xl'); await W(1200);
  ok(await nz.evaluate(() => window.__x && window.__x.n === 3 && window.__x.rows[2] === 5), 'Excel output: three sheets, 5 cases', await nz.evaluate(() => window.__x));
  await nz.evaluate(() => goTile('lfall')); await W(800); await nz.evaluate(id => lfOpen(id), c.id); await W(600);
  ok(await nz.evaluate(() => !document.querySelector('[data-lfact]') && !document.querySelector('[data-lfship]') && !document.querySelector('[data-lfgo="lfnew"]')), 'observer: a case has no action buttons');
  const mg = await login('doctor', 'test-doc-0', { width: 390, height: 844 }); await mg.evaluate(() => goTile('lfall')); await W(600);
  ok(await mg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2), 'phone width: no sideways scroll on the list');
  const nm = await login('nazer', 'test-naz-1', { width: 390, height: 844 }); await W(300); ok(await nm.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2 && !!document.querySelector('.m20t')), 'phone width: report fits (tables scroll inside)', await nm.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
  await nz.screenshot({ path: '/tmp/nz-case.png', fullPage: true }); await nz.evaluate(() => goTile('lfrpt')); await W(600); await nz.evaluate(() => document.querySelector('[data-m20p="all"]').click()); await W(400); await nz.screenshot({ path: '/tmp/nz-report.png', fullPage: true }); await nm.screenshot({ path: '/tmp/nz-report-m.png', fullPage: true });
  ok([lab, doc, nz, mg, nm].every(p => p.PE.length === 0), 'no page errors', [lab.PE, doc.PE, nz.PE, mg.PE, nm.PE]);
  await b.close();
} catch (e) { console.log('ERR', e.stack); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); h.stop(); process.exit(bad ? 1 : 0);
