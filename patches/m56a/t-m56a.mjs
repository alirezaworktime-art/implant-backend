// t-m56a: «سایر کلینیک‌ها» — tariffs of Baseri and University (our fee), counted in «انجام کار» only. Run: WORKER=<m56a bundle> node t-m56a.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); A.PW.oclin = 'toclin1xx';
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const PE = [];
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1366, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort());
const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); p.on('dialog', d => d.dismiss());
const svcOf = id => JSON.parse(h.sql(`select svc from oc_clinic where id='${id}'`)[0].svc);
const P = (id, k) => (svcOf(id).find(s => s.k === k) || {}).p;
try {
  await h.call('accountant', 'oc', { op: 'load' }); await h.call('accountant', 'oc', { op: 'load' });
  ok(!!h.sql("select v from kv where k='m56seed'")[0], 'the tariffs are written once the clinics exist', h.sql("select k from kv where k like 'm56%'"));
  const B = svcOf('bsr'), U = svcOf('uni');
  ok(P('bsr', 'imp') === 45000000 && P('bsr', 'fx_jd') === 115000000 && P('bsr', 'fx_z') === 300000000 && P('bsr', 'fx_n') === 155000000 && P('bsr', 'fx_t') === 155000000 && P('bsr', 'open') === 60000000 && P('bsr', 'close') === 30000000 && P('bsr', 'gbr') === 30000000 && P('bsr', 'vip') === 50000000 && P('bsr', 'hard') === 10000000 && P('bsr', 'soft') === 5000000 && P('bsr', 'alv') === 55000000 && P('bsr', 'unc') === 5000000 && P('bsr', 'staff') === 2240000, 'Baseri: all tariffs of the sheet (toman x 10 = rial)', B);
  ok(P('uni', 'imp') === 60000000 && P('uni', 'fx_jd') === 160000000 && P('uni', 'fx_z') === 400000000 && P('uni', 'sg_z') === 400000000 && P('uni', 'sg_n') === 120000000 && P('uni', 'sg_t') === 120000000 && P('uni', 'hard') === 25000000 && P('uni', 'soft') === 10000000 && P('uni', 'alv') === 50000000 && P('uni', 'gbr') === 20000000 && P('uni', 'vip') === 40000000 && P('uni', 'close') === 30000000, 'University: all tariffs of the sheet', U);
  ok(['ext', 'ridge'].every(k => B.some(s => s.k === k)) && B.find(s => s.k === 'ext').p === 0, 'nothing removed; services that are not on the sheet stay as they were', B.map(s => s.k));
  ok(JSON.stringify(svcOf('rsh')).includes('"p":60000000') && !svcOf('rsh').some(s => s.k === 'fx_jd'), 'other clinics are not touched');
  h.sql("update oc_clinic set svc=replace(svc,'\"p\":45000000','\"p\":47000000') where id='bsr'");
  // ---- «انجام کار» at University with 4 implants: 1 zygoma, 1 nasal, 2 normal + hard tissue 2
  await p.goto(h.url); await p.click('[data-lrole="oclin"]'); await p.fill('#lg_pw', A.PW.oclin); await p.click('#lgGo'); await W(2500);
  await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); await p.click('#ocPickSave').catch(() => { }); await W(800);
  await p.click('[data-ocseg="tr"]'); await W(700); await p.click('[data-oc2cl="uni"]').catch(() => { }); await W(600); await p.click('#oc2New'); await W(400); await p.fill('#oc3nm', 'بیمار آزمایشی'); await p.click('#oc3nmOk'); await W(1800);
  ok(await p.evaluate(() => !!(OC2.v && OC2.v.pat && OC2.v.pat.clinic === 'uni')), 'a patient of the University clinic');
  // the plan tab has no prices
  ok(await p.evaluate(() => !document.querySelector('#oc3Body [data-oc3l]')), 'the plan tab shows no tariff lines');
  await p.evaluate(() => { OC3.tab = 'work'; ocRender(); oc3New('work', null) }); await W(1200);
  let v = await p.evaluate(() => ({ cards: document.querySelectorAll('#oc3Form [data-sec="imp"]').length, lines: [...document.querySelectorAll('[data-oc3l]')].map(e => e.dataset.oc3l) }));
  ok(v.cards === 1 && ['imp', 'fx_jd', 'fx_n', 'fx_t', 'fx_z', 'sg_z', 'sg_n', 'sg_t'].every(k => v.lines.includes(k)), 'the implant card is shown once with a line for each implant service', v);
  await p.evaluate(() => { const S = OC3.f.s.imp; ['UR6', 'UR5', 'LR6', 'UL3'].forEach(k => S.sel[k] = true); S.sp = [{ k: 'UR6', b: 'زایگوما', d: '', l: '' }, { k: 'UR5', b: 'نازال', d: '', l: '' }]; recalc() }); await W(400);
  v = await p.evaluate(() => { const o = {}; oc3Lines('work').forEach(l => o[l.k] = l.q + '×' + l.p); return { o, sum: $('oc3Sum').textContent, line: (document.querySelector('[data-oc3l="fx_jd"] b.pl9m') || {}).textContent } });
  ok(v.o.imp === '2×60000000' && v.o.sg_z === '1×400000000' && v.o.sg_n === '1×120000000' && v.o.fx_jd === '2×160000000' && v.o.fx_z === '1×400000000' && v.o.fx_n === '1×250000000' && !v.o.sg_t && !v.o.fx_t, 'two normal + one zygoma + one nasal: surgery and fixture each with its own tariff', v);
  const want = 2 * 60000000 + 400000000 + 120000000 + 2 * 160000000 + 400000000 + 250000000; ok(v.sum.includes(want.toLocaleString('fa-IR')) && /۲ × ۱۶۰٬۰۰۰٬۰۰۰/.test(v.line || ''), 'the session sum and the lines on the screen', v);
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-oc3q="hard"][data-d="1"]')][0]; b.click(); [...document.querySelectorAll('[data-oc3q="hard"][data-d="1"]')][0].click() }); await W(300);
  await p.click('#oc3Save'); await W(2000);
  const w = h.sql("select clinic, amount, items from oc_work order by at desc limit 1")[0];
  ok(w && w.clinic === 'uni' && Number(w.amount) === want + 2 * 25000000, 'saved as our income from the clinic (work of the clinic)', w);
  // Baseri: no special surgery → IMP counts all four teeth
  await p.click('[data-ocseg="tr"]'); await W(700); await p.click('[data-oc2cl="bsr"]').catch(() => { }); await W(600); await p.click('#oc2New'); await W(400); await p.fill('#oc3nm', 'بیمار دوم'); await p.click('#oc3nmOk'); await W(1800);
  await p.evaluate(() => { OC3.tab = 'work'; ocRender(); oc3New('work', null) }); await W(1200);
  await p.evaluate(() => { const S = OC3.f.s.imp; ['UR6', 'UR5', 'LR6', 'UL3'].forEach(k => S.sel[k] = true); S.sp = [{ k: 'UR6', b: 'زایگوما', d: '', l: '' }]; recalc() }); await W(300);
  v = await p.evaluate(() => { const o = {}; oc3Lines('work').forEach(l => o[l.k] = l.q + '×' + l.p); return o });
  ok(v.imp === '4×47000000' && v.fx_jd === '3×115000000' && v.fx_z === '1×300000000', 'Baseri: surgery for all four, fixture JD 3 + zygoma 1', v);
  // an old clinic works as before
  await p.click('[data-ocseg="tr"]'); await W(700); await p.click('[data-oc2cl="rsh"]').catch(() => { }); await W(600); await p.click('#oc2New'); await W(400); await p.fill('#oc3nm', 'بیمار سوم'); await p.click('#oc3nmOk'); await W(1800);
  await p.evaluate(() => { OC3.tab = 'work'; ocRender(); oc3New('work', null) }); await W(1200);
  await p.evaluate(() => { const S = OC3.f.s.imp; ['UR6', 'UR5'].forEach(k => S.sel[k] = true); S.sp = [{ k: 'UR6', b: 'زایگوما', d: '', l: '' }]; recalc() }); await W(300);
  v = await p.evaluate(() => { const o = {}; oc3Lines('work').forEach(l => o[l.k] = l.q + '×' + l.p); return { o, box: !!document.querySelector('#oc3Form .m55p') && getComputedStyle(document.querySelector('#oc3Form .m55p')).display } });
  ok(v.o.imp === '2×60000000' && Object.keys(v.o).length === 1 && (v.box === false || v.box === 'none'), 'Roshan-Talab: unchanged (2 × IMP), no tariff box of the plan form', v);
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
