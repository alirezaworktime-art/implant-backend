// t-m31ui: surgery sheet — «فیل اولیه» entry and «سایر درمان‌ها». Run: WORKER=<bundle> node t-m31ui.mjs
import { h, A, W, chromium } from '../m24/probe.mjs'; import { uuid } from '../audit/A.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const mkS = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const id = await mkS('بیمار جراحی'), id2 = await mkS('فقط سایر');
const SG = i => JSON.parse(h.sql(`select surg from plans where id='${i}'`)[0].surg || '{}');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1400) => { const c = await b.newContext({ viewport: { width: vw, height: 1000 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3200); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const openS = async (p, name) => { await p.evaluate(() => goTile('surg')); await W(900); await p.evaluate(n => { const x = QITEMS.find(q => q.name === n); openSurg(x) }, name); await W(1500) };
try {
  const p = await login('surgery');
  ok(await p.evaluate(() => /---------- m31 \(/.test(document.documentElement.innerHTML)), 'm31 marker in the page');
  await openS(p, 'بیمار جراحی');
  let C = await p.evaluate(() => ({ a: [...document.querySelectorAll('#sgPick button')].map(x => x.textContent.trim()), b: [...document.querySelectorAll('#sgPick2 button')].map(x => x.textContent.trim()) }));
  ok((C.a.indexOf('فیل اولیه') === C.a.findIndex(x => /^پایه ایمپلنت/.test(x)) + 1 || (C.b[0] === 'فیل اولیه' && !C.a.includes('فیل اولیه'))) && ['سایر درمان‌ها', 'سایر خدمات'].includes(C.b[C.b.length - 1]) && C.a.concat(C.b).filter(x => /فیل اولیه/.test(x)).length === 1, '«فیل اولیه» sits right after «پایه ایمپلنت»; «سایر درمان‌ها» ends the second list', C);
  // ---- (1) فیل اولیه
  await p.click('[data-m31pf]'); await W(500);
  ok(await p.evaluate(() => { const c = document.getElementById('m31Pf'); return !!c && c.querySelectorAll('button.t[data-m31t]').length === 28 && c.querySelectorAll('button.t.pl').length === 2 }), 'the card shows a tooth chart (28 teeth; the two planned implants are marked)');
  await p.click('#m31Pf button.t[data-m31t="LL5"]'); await W(700);
  let S = await p.evaluate(() => ({ open: !document.getElementById('impSheet').hidden, title: document.getElementById('impTitle').textContent, rs: [...document.querySelectorAll('#impSheet [data-rs]')].filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.dataset.rs).join(), rep: !document.getElementById('ex1RepW').hidden }));
  ok(S.open && /پایین چپ: ۵/.test(S.title) && S.rs === 'fail' && S.rep, 'tapping a tooth opens the implant window with «فیل اولیه» chosen and the «دوباره کاشته شد؟» question', S);
  await p.click('#impOk'); await W(300); ok(await p.evaluate(() => !document.getElementById('impSheet').hidden && /قطر و طول|برند/.test(document.getElementById('impMsg').textContent)), 'brand and size are required, like «پایه ایمپلنت»', await p.evaluate(() => document.getElementById('impMsg').textContent));
  await p.evaluate(() => { const c = document.getElementById('imp_cat'); if (c.value === '' || c.value === 'm') { c.value = 'm'; c.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('imp_b').value = 'JD' } const set = (s, i, v) => { const S = document.getElementById(s), I = document.getElementById(i); if (S && !S.hidden && S.options.length > 1) { S.selectedIndex = 1; S.dispatchEvent(new Event('change', { bubbles: true })) } else { I.value = v; I.dispatchEvent(new Event('input', { bubbles: true })) } }; set('imp_dS', 'imp_d', '4.3'); set('imp_lS', 'imp_l', '10') });
  await p.click('#ex1RepW [data-ex1rep="0"]'); await p.click('#impOk'); await W(600);
  S = await p.evaluate(() => ({ m: SURG.imp.LL5, sel: SURG.s.imp.sel.LL5, chip: document.querySelector('[data-m31pf]').textContent, card: document.getElementById('m31Pf').innerText.replace(/\s+/g, ' ').slice(-160), pressed: document.querySelector('#m31Pf button.t[data-m31t="LL5"]').getAttribute('aria-pressed'), list: document.getElementById('sgImps').innerText.replace(/\s+/g, ' '), msg: document.getElementById('impMsg').textContent }));
  ok(S.m && S.m.rs === 'fail' && S.m.rep === 0 && S.m.b && S.m.d && S.m.l && S.sel === true && /✓/.test(S.chip) && S.pressed === 'true' && /پایین چپ: ۵/.test(S.card) && /پایین چپ: ۵/.test(S.list), 'saved as an implant of the session with reason fail; chip ✓, tooth pressed, listed in both places', S);
  await p.screenshot({ path: '/tmp/pf.png', fullPage: true });
  // ---- (2) سایر درمان‌ها
  await p.click('[data-m31oth]'); await W(500); await p.fill('[data-m31on="0"]', 'فرنکتومی'); await p.fill('[data-m31oa="0"]', '1500000'); await p.click('[data-m31oadd]'); await W(300); await p.fill('[data-m31oa="1"]', '200000'); await W(200);
  ok(await p.evaluate(() => document.querySelector('[data-m31oa="0"]').value) === '1,500,000' || /۱٬۵۰۰٬۰۰۰|1٬500٬000/.test(await p.evaluate(() => document.querySelector('[data-m31oa="0"]').value)), 'the amount is formatted while typing', await p.evaluate(() => document.querySelector('[data-m31oa="0"]').value));
  // fill what the sheet needs, then save
  await p.evaluate(() => { for (const k of ['UR6', 'LR6']) SURG.imp[k] = { b: 'JD', sys: '', g: 'ko', d: '4.3', l: '10', ht: 'cover', hs: '', rs: 'new' }; SURG.asst = ASSTS()[0] || 'دستیار'; renderSurg(); if (!document.getElementById('sg_by').value) document.getElementById('sg_by').value = 'دکتر علویکیا' });
  const saveBtn = await p.evaluate(() => { const b = [...document.querySelectorAll('#viewSurg button')].find(x => /ثبت/.test(x.textContent) && x.offsetParent !== null && !x.closest('.m31c')); return b ? (b.id || b.textContent.trim()) : '' });
  await p.evaluate(() => { document.getElementById('sg_fin').checked = false; return surgSave(document.createElement('button')) }); await W(500);
  ok(/برای مبلغ .* نام درمان نوشته نشده/.test(await p.evaluate(() => document.getElementById('sgMsg').textContent)) && await p.evaluate(() => document.getElementById('sgRev').hidden), 'an amount without a name is refused', [saveBtn, await p.evaluate(() => document.getElementById('sgMsg').textContent)]);
  await p.fill('[data-m31on="1"]', 'برداشتن کیست'); await p.evaluate(() => { document.getElementById('sg_fin').checked = false; return surgSave(document.createElement('button')) }); await W(600);
  const rev = await p.evaluate(() => document.getElementById('sgRev').hidden ? 'hidden: ' + document.getElementById('sgMsg').textContent : document.getElementById('srBody').innerText.replace(/\s+/g, ' '));
  ok(/سایر درمان‌ها/.test(rev) && /فرنکتومی — ۱٬۵۰۰٬۰۰۰ تومان/.test(rev) && /برداشتن کیست — ۲۰۰٬۰۰۰ تومان/.test(rev) && /فيل اوليه|فیل اولیه/.test(rev), 'the review lists the other treatments and the failed implant', rev);
  const base = await p.evaluate(() => { const all = SGP.all, a = surgActual(SURG.rec, all), a0 = surgActual(SURG.rec, all.map(s => Object.assign({}, s, { oth: undefined }))); return [a, a0] });
  ok(base[0] - base[1] === 1700000, 'the actual cost grows by exactly the two amounts', base);
  await p.click('#srOk'); await W(3500);
  const ss = (SG(id).sessions || [])[0] || {};
  ok(JSON.stringify(ss.oth) === JSON.stringify([{ t: 'فرنکتومی', amt: 1500000 }, { t: 'برداشتن کیست', amt: 200000 }]) && ss.imp && ss.imp.LL5 && ss.imp.LL5.rs === 'fail' && ss.imp.LL5.rep === 0 && SG(id).actual === base[0], 'stored: session.oth, the failed implant, and the actual cost', [ss.oth, ss.imp && ss.imp.LL5, SG(id).actual, base, await p.evaluate(() => document.getElementById('srMsg').textContent)]);
  ok(await p.evaluate(i => !localStorage.getItem('implantSurgOth:' + i), id), 'the draft of «سایر درمان‌ها» is cleared after saving');
  const mv = h.sql(`select delta, note from inv_moves where refName='بیمار جراحی'`); ok(mv.filter(x => /LL5/.test(x.note)).length === mv.filter(x => /UR6/.test(x.note)).length && !mv.some(x => /فیکسچر دوم/.test(x.note)), 'stock: the failed, removed implant uses the same items as a normal one, no second fixture (existing rule)', mv);
  ok(!h.tasks(id).some(t => t.kind === 'uncover' && /LL5/.test(t.info || '')), 'no uncovering is planned for the removed implant (existing rule)', h.tasks(id).filter(t => t.kind === 'uncover'));
  // ---- a session with only «سایر درمان‌ها»
  await openS(p, 'فقط سایر'); await p.evaluate(() => { Object.keys(SURG.s).forEach(k => { SURG.s[k].sel = {}; }); SURG.imp = {}; renderSurg(); document.getElementById('sg_by').value = 'دکتر علویکیا' });
  await p.evaluate(() => { document.getElementById('sg_fin').checked = false; return surgSave(document.createElement('button')) }); await W(400); ok(/هیچ کاری برای این جلسه/.test(await p.evaluate(() => document.getElementById('sgMsg').textContent)), 'an empty session is still refused');
  await p.click('[data-m31oth]'); await W(400); await p.fill('[data-m31on="0"]', 'پانسمان'); await W(200);
  ok(await p.evaluate(i => /پانسمان/.test(localStorage.getItem('implantSurgOth:' + i) || ''), id2), 'typed rows are kept as a draft in this browser');
  await p.evaluate(() => { document.getElementById('sg_fin').checked = false; return surgSave(document.createElement('button')) }); await W(600); ok(await p.evaluate(() => !document.getElementById('sgRev').hidden && /پانسمان — بدون مبلغ/.test(document.getElementById('srBody').innerText)), 'a session with only «سایر درمان‌ها» can be reviewed', await p.evaluate(() => document.getElementById('sgMsg').textContent));
  await p.click('#srOk'); await W(3500); const s2 = (SG(id2).sessions || [])[0] || {}; ok(JSON.stringify(s2.oth) === JSON.stringify([{ t: 'پانسمان', amt: 0 }]), 'and saved', [s2.oth, await p.evaluate(() => document.getElementById('srMsg').textContent)]);
  ok(p.PE.length === 0, 'surgery: no page errors', p.PE);
  // ---- patient file (reception) shows it
  const q = await login('staff'); await q.fill('#rS', 'بیمار جراحی'); await W(600); await q.click('#rSRes [data-file]'); await W(2500);
  const ft = await q.evaluate(() => { const s = document.getElementById('pfSheet'); return s && !s.hidden ? s.innerText.replace(/\s+/g, ' ') : '' });
  ok(/سایر درمان‌ها: فرنکتومی \(۱٬۵۰۰٬۰۰۰ تومان\)؛ برداشتن کیست/.test(ft) && /فيل اوليه|فیل اولیه/.test(ft), 'the patient file timeline shows the other treatments and the failure', ft.match(/.{0,200}جلسه‌ی ۱ جراحی.{0,500}/));
  ok(q.PE.length === 0, 'reception: no page errors', q.PE);
  // phone
  const id3 = await mkS('گوشی جراحی'); const ph = await login('surgery', 390); await openS(ph, 'گوشی جراحی'); await ph.click('[data-m31pf]'); await W(300); await ph.click('[data-m31oth]'); await W(400);
  ok(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && ph.PE.length === 0, 'phone: both cards fit without sideways scroll', await ph.evaluate(() => [document.documentElement.scrollWidth, innerWidth])); await ph.screenshot({ path: '/tmp/phone.png', fullPage: true });
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 900)) }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
