// t-m19: «سایر کلینیک‌ها» plan — nothing the doctor marks is lost on save; guide + notes; PDF downloads with the clinic header and without our clinic's data.
// Run: WORKER=<bundle> node t-m19.mjs   (needs ../audit/A.mjs + rec.json + server-clock.mjs)
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); A.PW.oclin = 'toclin1xx';
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1366, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran', acceptDownloads: true }); await c.route(/googleapis|gstatic/, r => r.abort());
const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(e.message)); p.on('dialog', d => d.dismiss());
try {
  await p.goto(h.url); await p.click('[data-lrole="oclin"]'); await p.fill('#lg_pw', A.PW.oclin); await p.click('#lgGo'); await W(2500);
  await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); await p.click('#ocPickSave'); await W(800);
  await p.evaluate(() => { window.__dl = []; const _d = downloadBlob; downloadBlob = function (blob, name) { window.__dl.push({ name, type: blob.type, size: blob.size }); return _d.apply(this, arguments) }; window.__pr = 0; const _o = openForPrint; openForPrint = function () { window.__pr++ };
    window.__txt = []; const _T = T; T = function (c, str) { if (M19.on) window.__txt.push(String(str)); return _T.apply(this, arguments) } });
  const clickTxt = t => p.evaluate(t => { const L = [...document.querySelectorAll('#viewOc .chip, #viewOc button')].filter(x => x.offsetParent && x.textContent.trim() === t); if (L[0]) L[0].click(); return L.length }, t);
  const newPat = async (cl, nm) => { await p.click('[data-ocseg="tr"]'); await W(700); await p.click(`[data-oc2cl="${cl}"]`).catch(() => { }); await W(600); await p.click('#oc2New'); await W(400); await p.fill('#oc3nm', nm); await p.click('#oc3nmOk'); await W(1500) };
  await newPat('rsh', 'علی آزمایشی');
  ok(await p.evaluate(() => SECTIONS.every(x => !!document.querySelector(`#oc3Form [data-sec="${x.id}"], #oc3Form #sec_${x.id}`) || [...document.querySelectorAll('#oc3Form .card')].length >= SECTIONS.length)), 'every section of the doctor form is in the plan tab', await p.evaluate(() => [document.querySelectorAll('#oc3Form .card').length, SECTIONS.length]));
  ok(await p.evaluate(() => document.querySelectorAll('#q5Card').length === 1 && !!document.querySelector('#viewOc #q5Card') && ![...document.querySelectorAll('#q5Card [data-q5j]')].some(x => x.disabled)), 'one «سرجیکال گاید» card, usable');
  ok(await p.evaluate(() => $('oc3note').tagName === 'TEXTAREA'), 'notes are a multi-line box');
  for (const [sid, k] of [['ext', 'UR6'], ['imp', 'UR6'], ['imp', 'LL6']]) await p.click(`#viewOc button[data-sid="${sid}"][data-k="${k}"]`);
  await clickTxt('نزدیک به عصب'); await clickTxt('سدیشن'); await clickTxt('PMMA'); await p.fill('#tx_imp', 'فاصله‌ی ۳ میلی‌متر');
  await p.evaluate(() => { F.s.imp.sp = [{ k: 'UR6', b: 'Dentium SuperLine', d: '4.5', l: '10' }] });
  await p.click('#viewOc #q5Card [data-q5j="U"]'); await W(300); await p.click('#viewOc #q5Card [data-q5t="UR6"]'); await W(200); await p.fill('#q5Note', 'با اسکن');
  await p.fill('#oc3note', 'سطر اول\nسطر دوم');
  ok(await p.evaluate(() => F.s.imp.sel.UR6 && F.s.imp.sel.LL6 && $('oc3note').value === 'سطر اول\nسطر دوم'), 'guide clicks do not reset the marked teeth or the notes');
  await p.click('#oc3PlanSave'); await W(1800);
  const row = h.sql('select s, note from oc_plan')[0], S = JSON.parse(row.s);
  ok(S.cons && S.cons.sel.includes('0:نزدیک به عصب'), 'server keeps the «رضایت‌نامه» choice (long option name)', S.cons);
  ok(S.imp.sp && S.imp.sp[0].b === 'Dentium SuperLine' && S.imp.text === 'فاصله‌ی ۳ میلی‌متر', 'server keeps the implant «مورد خاص» and the text', S.imp);
  ok(S.anes && S.tmp && S.ext, 'other marked sections saved', Object.keys(S));
  ok(await p.evaluate(() => F.h.sgd && F.h.sgd.j === 'U' && F.h.sgd.t.join() === 'UR6' && F.h.sgd.note === 'با اسکن' && $('oc3note').value === 'سطر اول\nسطر دوم' && !!F.s.cons.sel['0:نزدیک به عصب'] && F.s.imp.sp.length === 1), 'after saving the form shows the same plan, guide and notes', await p.evaluate(() => [F.h.sgd, $('oc3note').value, F.s.cons.sel, F.s.imp.sp]));
  await p.click('#oc3PlanPdf'); await W(4000);
  const dl = await p.evaluate(() => window.__dl), tx = await p.evaluate(() => window.__txt), today = await p.evaluate(() => jalali(new Date()).dash);
  ok(dl.length === 1 && dl[0].type === 'application/pdf' && dl[0].size > 20000 && dl[0].name === `علی آزمایشی - کلینیک روشن‌طلب - ${today}.pdf` && (await p.evaluate(() => window.__pr)) === 0, 'PDF is downloaded (not opened for print), named patient - clinic - date', dl);
  const has = s => tx.some(t => t.includes(s));
  ok(has('کلینیک روشن‌طلب') && has('متخصص فک و صورت سید مجتبی علوی‌کیا') && has('علی آزمایشی') && tx.some(t => /\d|[۰-۹]/.test(t) && t.includes('—') && /[۰-۹]{2}:[۰-۹]{2}/.test(t)), 'header: clinic, doctor line, patient, date and hour', tx.slice(0, 12));
  ok(!has('رهنمون') && !has('تماس جهت هماهنگی') && !has('۰۹۳۹') && !has('کد ملی') && !has('وضعیت عمومی بیمار') && !has('امضای بیمار') && !has('مهر و امضای کلینیک') && !tx.some(t => /^\* قیمت/.test(t)), 'nothing of our clinic: no name, phone, patient table, medical box, signatures, price remarks', tx.filter(t => /رهنمون|تماس|کد ملی|امضا|قیمت‌ها/.test(t)));
  ok(has('قیمت (تومان)') && has('جمع کل (تومان)') && !tx.some(t => /^[۰-۹٬,]{5,}$/.test(t)), 'price column and total row are there, empty', tx.filter(t => /قیمت|جمع/.test(t)));
  ok(has('نزدیک به عصب') && has('سدیشن') && has('PMMA') && !has('دندان سالم') && !has('Essix') && !has('بیهوشی عمومی'), 'only the chosen options are printed', tx.filter(t => /عصب|سدیشن|PMMA|سالم|Essix|عمومی/.test(t)));
  ok(has('سرجیکال گاید') && has('توضیحات پزشک') && has('سطر اول') && has('سطر دوم') && tx.some(t => t.includes('Dentium')), 'guide, notes and the special implant row are printed');
  ok(await p.evaluate(() => M19.on === false && !OC3.pdf && SET.clinic !== 'روشن‌طلب'), 'PDF switches are back to normal afterwards');
  await p.click('[data-oc3tab="work"]'); await W(700); ok(!(await p.evaluate(() => /##sg/.test(document.querySelector('#viewOc').textContent))), 'the guide marker never shows on screen');
  /* another clinic without a photo; empty plan */
  await newPat('taj', 'مریم نمونه'); await p.click('#viewOc button[data-sid="imp"][data-k="LR6"]'); await p.click('#oc3PlanSave'); await W(1500); await p.evaluate(() => { window.__dl = []; window.__txt = [] }); await p.click('#oc3PlanPdf'); await W(3500);
  ok((await p.evaluate(() => window.__dl)).length === 1 && (await p.evaluate(() => window.__txt)).some(t => t.includes('کلینیک تاج')), 'a clinic without a photo: PDF with its own name');
  await newPat('taj', 'خالی'); await p.click('#oc3PlanSave'); await W(1500); await p.evaluate(() => { window.__dl = [] }); await p.click('#oc3PlanPdf'); await W(2500); ok((await p.evaluate(() => window.__dl)).length === 0, 'empty plan: no PDF, a message instead');
  ok(PE.length === 0, 'no page errors', PE);
} catch (e) { console.log('ERR', e.stack); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); await b.close(); h.stop(); process.exit(bad ? 1 : 0);
