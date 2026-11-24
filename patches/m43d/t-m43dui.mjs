// t-m43dui: temporary prosthesis — plan form (PMMA teeth, Essix / denture jaws), manager settings, paper-file editor. Run: WORKER=<m43d bundle> node t-m43dui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const nW = 'بیمار منتظر', idW = await h.add(nW);
await h.must('manager', 'settings', { settings: { prices: { tmp: { price: '900000' }, tmp_es: { price: '2500000' }, tmp_dn: { price: '6000000' }, pr_pmma: { price: '350000' }, pr_essix: { price: '800000' }, pr_ng: { price: '1200000' } } } });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  let p = await login('doctor');
  // ---- arithmetic
  const r = await p.evaluate(() => { const T = S => rowTotals({ s: S, brand: 'ko', pay: {} }, SEC.tmp).flat;
    const S0 = blankSections(), base = T(S0), d0 = { p: S0.tmp.price, es: S0.tmp.ip.es, dn: S0.tmp.ip.dn, f: S0.tmp.ip.m43d };
    const S1 = blankSections(); ['UR1', 'UR2', 'UL1'].forEach(k => S1.tmp.sel[k] = true); const pm = T(S1) - base;
    const S2 = blankSections(); S2.tmp.sel['1:بالا'] = true; S2.tmp.sel['1:پایین'] = true; const es = T(S2) - base;
    const S3 = blankSections(); S3.tmp.sel['2:پایین'] = true; const dn = T(S3) - base;
    const S4 = blankSections(); ['UR1', 'UR2'].forEach(k => S4.tmp.sel[k] = true); S4.tmp.sel['1:بالا'] = true; S4.tmp.sel['2:پایین'] = true; S4.tmp.ip.es = '3,000,000'; const mix = T(S4) - base, L = priceLines({ s: S4, brand: 'ko', pay: {} }, SEC.tmp).map(o => o.t), typ = ['0:PMMA', '0:Essix', '0:دنچر'].map(k => !!S4.tmp.sel[k]);
    const S5 = blankSections(); S5.tmp.jc.U = '4'; const cnt = T(S5) - base;
    const doc = secDoc(S4), back = secFrom(doc), backT = T(back) - base;
    const oldDoc = { tmp: { sel: ['UR1', 'UR2', '0:Essix'], price: '500,000', ip: {} } }, O = secFrom(oldDoc), oldT = T(O);
    const empty = fromDoc('x1', { h: {}, s: { tmp: { sel: [], price: '', ip: {} } }, status: 'new' }), usedD = fromDoc('x2', { h: {}, s: oldDoc, status: 'new' }), conf = fromDoc('x3', { h: {}, s: { tmp: { sel: [], price: '', ip: {} } }, status: 'confirmed' });
    return { d0, pm, es, dn, mix, L, typ, cnt, flagDoc: doc.tmp.ip.m43d, backT, oldFlag: O.tmp.ip.m43d, oldT, oldEssix: !!O.tmp.sel['0:Essix'], empty: empty.s.tmp.ip.m43d, usedD: usedD.s.tmp.ip.m43d, conf: conf.s.tmp.ip.m43d } });
  ok(r.d0.f === '1' && num0(r.d0.p) === 900000 && num0(r.d0.es) === 2500000 && num0(r.d0.dn) === 6000000, 'a new form takes the three tariffs from the manager settings', r.d0);
  ok(r.pm === 3 * 900000, 'PMMA: three teeth × 900,000', r.pm); ok(r.es === 2 * 2500000, 'Essix: two jaws × 2,500,000', r.es); ok(r.dn === 6000000, 'denture: one jaw × 6,000,000', r.dn);
  ok(r.mix === 2 * 900000 + 3000000 + 6000000, 'together, with the Essix price changed for this patient', r.mix); ok(r.cnt === 4 * 900000, '«تعداد کل» of a jaw counts as PMMA units', r.cnt);
  ok(r.L.some(t => /PMMA: .*۲ واحد × ۹۰۰٬۰۰۰/.test(t)) && r.L.some(t => /Essix: .*۱ فک × ۳٬۰۰۰٬۰۰۰/.test(t)) && r.L.some(t => /دنچر: .*۱ فک × ۶٬۰۰۰٬۰۰۰/.test(t)) && r.L[r.L.length - 1] === '۱۰٬۸۰۰٬۰۰۰', 'PDF price column lists each kind and the sum', r.L);
  ok(r.typ.every(Boolean), 'the «نوع» marks follow what was chosen', r.typ);
  ok(r.flagDoc === '1' && r.backT === r.mix, 'saved and read back with the same price', [r.flagDoc, r.backT]);
  ok(r.oldFlag === '' && r.oldT === 2 * 500000 && r.oldEssix, 'a stored plan without the mark keeps the old single price and its type', [r.oldFlag, r.oldT, r.oldEssix]);
  ok(r.empty === '1' && r.usedD === '' && r.conf === '', 'not-approved plan with an empty row moves to the new way; a filled or approved one does not', [r.empty, r.usedD, r.conf]);
  // ---- in the form
  await p.evaluate(() => { const q = QITEMS.find(x => x.name === 'بیمار منتظر'); const bt = document.querySelector('[data-open="' + q.id + '"],[data-qopen="' + q.id + '"]'); bt.click() }); await W(2500);
  let f = await p.evaluate(() => { const c = document.querySelector('[data-sec="tmp"]'); return { chips: [...c.querySelectorAll('.chip')].map(x => x.dataset.k), es: !!c.querySelector('[data-ip="tmp"][data-ik="es"]'), dn: !!c.querySelector('[data-ip="tmp"][data-ik="dn"]'), lab: c.textContent.includes('قیمت PMMA هر واحد'), teeth: c.querySelectorAll('.t[data-sid="tmp"]').length } });
  ok(f.chips.join() === '1:بالا,1:پایین,2:بالا,2:پایین' && f.es && f.dn && f.lab && f.teeth === 28, 'form: tooth chart for PMMA, jaw chips for Essix and denture, three prices', f);
  await p.click('[data-sec="tmp"] .t[data-k="UR1"]'); await p.click('[data-sec="tmp"] .t[data-k="UL2"]'); await p.click('[data-sec="tmp"] .chip[data-k="1:بالا"]'); await p.click('[data-sec="tmp"] .chip[data-k="2:پایین"]'); const vis = await p.evaluate(() => { const v = q => { const e = document.querySelector(q); return !!(e && e.offsetParent) }; const i = document.querySelector('[data-ip="tmp"][data-ik="dn"]'); i.value = '5000000'; i.dispatchEvent(new Event('input', { bubbles: true })); return { main: v('#pr_tmp'), mine: v('[data-ip="tmp"][data-ik="dn"]') } }); ok(vis.main === vis.mine, 'the two new price boxes are shown exactly where the PMMA price box is (same role rule)', vis); await W(400);
  f = await p.evaluate(() => ({ calc: document.getElementById('m43dCalc').textContent, pros: rowTotals({ s: AS(), brand: F.brand, pay: F.pay }, SEC.tmp).flat, wide: document.documentElement.scrollWidth <= innerWidth + 1 }));
  ok(/PMMA: ۲ × ۹۰۰٬۰۰۰/.test(f.calc) && /Essix: ۱ × ۲٬۵۰۰٬۰۰۰/.test(f.calc) && /دنچر: ۱ × ۵٬۰۰۰٬۰۰۰/.test(f.calc) && /۹٬۳۰۰٬۰۰۰/.test(f.calc) && f.wide, 'form: clicking teeth and jaws and typing a price shows «count × tariff» and the sum', f);
  await p.screenshot({ path: 'plan-tmp.png', fullPage: false, clip: await p.evaluate(() => { const r = document.querySelector('[data-sec="tmp"]').getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y + scrollY), width: Math.min(1280, r.width), height: Math.min(900, r.height) } }).catch(() => undefined) }).catch(() => 0);
  await p.context().close();
  // ---- manager settings
  p = await login('manager'); const st = await p.evaluate(() => { renderPriceSettings(); const w = document.getElementById('set_prices'); const v = k => { const i = w.querySelector(`[data-tp="${k}"]`); return i ? i.value : null }; const P = readPriceSettings(); return { es: v('tmp_es'), dn: v('tmp_dn'), pm: v('pr_pmma'), n: w.querySelectorAll('[data-tp^="pr_"]').length, lab: w.querySelector('[data-tp="tmp"]').closest('.grp').textContent, read: [P.tmp_es && P.tmp_es.price, P.pr_essix && P.pr_essix.price], twice: (renderPriceSettings(), document.querySelectorAll('#set_prices [data-tp="tmp_es"]').length) } });
  ok(num0(st.es) === 2500000 && num0(st.dn) === 6000000 && num0(st.pm) === 350000 && st.n >= 11 && /PMMA/.test(st.lab) && st.read[0] === '2500000' && st.read[1] === '800000' && st.twice === 1, 'manager settings: PMMA / Essix / denture tariffs and a default for every prosthesis step', st);
  await p.context().close();
  // ---- paper-file editor
  for (const [vw, vh] of [[1280, 800], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone'; p = await login('staff', vw, vh); await p.evaluate(() => a6Open()); await W(1800);
    const e = await p.evaluate(() => { const cat = ['tmp', 'esx', 'dnt'].map(k => A6C[k] && A6C[k].t); const l1 = a6NewLine('esx'), l2 = a6NewLine('dnt'), l3 = a6NewLine('pros'), l4 = a6NewLine('pros'), l5 = a6NewLine('pros'); A6.op.add('esx'); A6.op.add('dnt'); A6.op.add('pros'); l3.ty = 'pmma'; l4.ty = 'essix'; l5.ty = 'ng'; a6Render();
      return { cat, ids: [l1.id, l2.id, l3.id, l4.id, l5.id], p1: l1.price, p2: l2.price, p5: l5.price, jw1: document.querySelectorAll(`[data-m43scan][data-l="${l1.id}"]`).length, noCnt: !document.querySelector(`.a6l[data-l="${l1.id}"] [data-a6f="n"]`), teeth3: document.querySelectorAll(`.a13ch [data-a6t][data-l="${l3.id}"]`).length, jw4: document.querySelectorAll(`[data-m43scan][data-l="${l4.id}"]`).length, jw5: document.querySelectorAll(`[data-m43scan][data-l="${l5.id}"]`).length } });
    ok(e.cat.join('|') === 'روکش موقت PMMA|روکش موقت Essix|روکش موقت دنچر' && e.p1 === 2500000 && e.p2 === 6000000 && e.jw1 === 3 && e.noCnt, tag + ': paper file — Essix and denture are treatments chosen by jaw, with their tariffs', e);
    ok(e.teeth3 === 32 && e.jw4 === 3 && e.jw5 === 0 && e.p5 === 1200000, tag + ': «مراحل پروتز» — PMMA shows the tooth chart, Essix the jaw; a per-session step takes its default amount', e);
    const [i1, i2, i3, i4] = e.ids;
    await p.click(`[data-m43scan="B"][data-l="${i1}"]`); await W(150); await p.click(`.a13ch [data-a6t="UR1"][data-l="${i3}"]`); await W(100); await p.click(`.a13ch [data-a6t="UR2"][data-l="${i3}"]`); await W(100); await p.click(`[data-m43scan="L"][data-l="${i4}"]`); await W(200);
    let s = await p.evaluate(ids => { const L = ids.map(i => a6L(i)); return { n1: L[0].n, amt1: a6Amt(L[0]), pr3: L[2].price, pr4: L[3].price, lab4: a13Lab(L[3]), wide: document.documentElement.scrollWidth <= innerWidth + 1 } }, e.ids);
    ok(s.n1 === 2 && s.amt1 === 5000000 && s.pr3 === 700000 && s.pr4 === 800000 && /فک پایین/.test(s.lab4) && s.wide, tag + ': both jaws → 2 × tariff; PMMA step = 2 teeth × 350,000; Essix step = 1 jaw × 800,000', s);
    await p.fill(`[data-a6f="price"][data-l="${i3}"]`, '999000'); await W(100); await p.click(`.a13ch [data-a6t="UR3"][data-l="${i3}"]`); await W(200);
    s = await p.evaluate(ids => ({ pr3: a6L(ids[2]).price, teeth: a6L(ids[2]).teeth.length }), e.ids); ok(num0(s.pr3) === 999000 && s.teeth === 3, tag + ': an amount typed by hand is kept when teeth change', s);
    const sent = await p.evaluate(async ids => { const of = window.fetch; let body = null; window.fetch = async (u, o) => { try { const j = JSON.parse(o.body); if (j.action === 'fxArc') { body = j; return new Response(JSON.stringify({ ok: false, error: 'test' }), { headers: { 'content-type': 'application/json' } }) } } catch (e) { } return of(u, o) };
      try { await api('fxArc', { arc: { v6: 1, lines: A6.lines.map(l => ({ id: l.id, k: l.k, teeth: l.teeth, n: num(l.n), price: num(l.price) })) } }) } catch (e) { } window.fetch = of; const L = (body && body.arc.lines) || [], g = i => L.find(x => x.id === ids[i]) || {}; return { e: [g(0).scan, g(0).n], d: [g(1).scan, g(1).n], pm: [g(2).ty, (g(2).teeth || []).length, g(2).price], es: [g(3).ty, g(3).scan, g(3).price], ng: [g(4).ty, g(4).scan === undefined] } }, e.ids);
    ok(sent.e.join() === 'B,2' && sent.d.join() === 'U,1' && sent.pm.join() === 'pmma,3,999000' && sent.es.join() === 'essix,L,800000' && sent.ng.join() === 'ng,true', tag + ': what goes to the server on save carries jaws, teeth and amounts', sent);
    if (tag === 'desktop') await p.screenshot({ path: 'arc-desktop.png', fullPage: true }).catch(() => 0);
    await p.context().close(); }
} catch (e) { console.log('ERR', e.message.slice(0, 600)); bad++ }
function num0(v) { return Number(String(v == null ? '' : v).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^\d]/g, '')) || 0 }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
