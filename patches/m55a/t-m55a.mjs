// t-m55a: «موارد خاص» — kind picked from a list, each priced with its own tariff. Run: WORKER=<m55a bundle> node t-m55a.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const PE = [];
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); p.on('dialog', d => d.dismiss()); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  // ---- settings: the three tariffs
  let p = await login('manager'); ok(await p.evaluate(() => /---------- m55a \(/.test(document.documentElement.innerHTML)), 'm55a marker in the page');
  const st = await p.evaluate(async () => { const s = await api('ping'); const P = Object.assign({}, (s.settings || SET).prices || {}); P.sp_z = { price: '45000000', bp: {} }; P.sp_n = { price: '38000000', bp: {} }; P.aox_t = { price: '33000000', bp: {} };
    let r; try { r = await api('settings', { settings: { prices: P } }) } catch (e) { r = { err: e.message } } const s2 = await api('ping'); return { r, z: ((s2.settings || {}).prices || {}).sp_z, n: ((s2.settings || {}).prices || {}).sp_n, t: ((s2.settings || {}).prices || {}).aox_t } });
  ok(st.z && st.z.price === '45000000' && st.n && st.n.price === '38000000', 'the server keeps the new tariffs (sp_z, sp_n)', st);
  await p.evaluate(async () => { const s2 = await api('ping'); SET.prices = (s2.settings || {}).prices || SET.prices; try { renderPriceSettings() } catch (e) { } }); await W(600);
  const sv = await p.evaluate(() => { const el = document.getElementById('set_prices'); return el ? ['z', 'n', 't'].map(k => { const i = el.querySelector(`[data-tp="sp_${k}"]`); return i ? i.closest('.grp').textContent.trim().slice(0, 60) + '|' + i.value : null }) : null });
  ok(sv && sv.every(Boolean) && /زایگوما/.test(sv[0]) && /۴۵٬۰۰۰٬۰۰۰|45,000,000/.test(sv[0]), 'settings page shows the three tariffs', sv);
  await p.context().close();
  // ---- arithmetic
  const id = await h.add('بیمار خاص'); p = await login('doctor'); await p.evaluate(() => pollQ(true)); await W(2000);
  const r = await p.evaluate(() => { const mk = sp => { const S = blankSections(); ['UR6', 'UR5', 'LR6', 'LL6', 'UL6'].forEach(k => S.imp.sel[k] = true); S.imp.bp = { ir: '10,000,000', ko: '12,000,000', it: '15,000,000', sw: '20,000,000', rt: '21,000,000' }; S.imp.sp = sp; return S };
    const T = S => { const t = totals({ s: S, brand: 'ir', pay: {} }); return { ir: t.surg.ir, ko: t.surg.ko } };
    const S0 = blankSections(); const def = ['z', 'n', 't'].map(k => num(S0.imp.ip['sp' + k]));
    const base = T(mk([])), all = T(mk([{ k: 'UR6', b: 'روت' }, { k: 'UR5', b: 'اشترومن' }, { k: 'LR6', b: 'زایگوما' }, { k: 'LL6', b: 'نازال' }, { k: 'UL6', b: 'تریگوئید' }]));
    const zOnly = T(mk([{ k: 'LR6', b: 'زایگوما' }])), zUnsel = T(mk([{ k: 'UL3', b: 'زایگوما' }])), zDup = T(mk([{ k: 'LR6', b: 'زایگوما' }, { k: 'LR6', b: 'نازال' }])), zRegion = T(mk([{ k: 'UR', b: 'زایگوما' }]));
    const Sx = mk([{ k: 'LR6', b: 'زایگوما' }]); Sx.imp.ip.spz = '50,000,000'; const edited = T(Sx);
    const S1 = mk([{ k: 'UR6', b: 'روت' }, { k: 'LR6', b: 'زایگوما' }]); const L = priceLines({ s: S1, brand: 'ir', pay: {} }, SEC.imp).map(o => o.t);
    const back = secFrom(secDoc(Sx)).imp.ip.spz;
    const ses = { s: secDoc(mk([])), imp: { UR6: { g: 'rt' }, UR5: { g: 'ir' }, LR6: { g: 'it' }, LL6: { g: 'ir' }, UL6: { g: 'ir' } } }, rec = { s: S1, brand: 'ir', pay: {}, h: {} };
    let act = null; try { act = surgActual(rec, [ses]) } catch (e) { act = String(e.message) } const plan = totals(rec).surg.ir + totals(rec).pros;
    return { def, base, all, zOnly, zUnsel, zDup, zRegion, edited, L, back, act, plan } });
  ok(r.def[0] === 45000000 && r.def[1] === 38000000 && r.def[2] === 33000000, 'a new form takes the tariffs from settings (تریگوئید empty → All on X تریگوئید)', r.def);
  ok(r.base.ir === 50000000, 'five implants, no special row: 5 × the brand tariff', r.base);
  ok(r.all.ir === 21000000 + 20000000 + 45000000 + 38000000 + 33000000 && r.all.ko === r.all.ir, 'all five special kinds: each with its own tariff (the brand does not matter for them)', r.all);
  ok(r.zOnly.ir === 40000000 + 45000000 && r.zOnly.ko === 48000000 + 45000000, 'one zygoma + four of the brand', r.zOnly);
  ok(r.zUnsel.ir === r.base.ir && r.zRegion.ir === r.base.ir, 'a row on a tooth that is not in the implant row, or on a region, does not change the price', [r.zUnsel, r.zRegion]);
  ok(r.zDup.ir === r.zOnly.ir, 'two rows on one tooth: the first counts', r.zDup);
  ok(r.edited.ir === 40000000 + 50000000 && r.back === '50,000,000', 'the tariff changed for one patient is used and saved with the plan', [r.edited, r.back]);
  ok(r.L.some(t => /ایرانی: .*۳ × ۱۰٬۰۰۰٬۰۰۰ \+ خاص = ۹۶٬۰۰۰٬۰۰۰/.test(t)) && r.L.some(t => /خاص: .*Root ۱ × ۲۱٬۰۰۰٬۰۰۰/.test(t)) && r.L.some(t => /خاص: .*زایگوما ۱ × ۴۵٬۰۰۰٬۰۰۰/.test(t)), 'PDF price column: «3 × tariff + خاص» and both special lines', r.L);
  ok(r.act === r.plan, 'surgery day with the same implants: amount equals the plan (no false difference)', { act: r.act, plan: r.plan });
  // ---- in the form
  await p.evaluate(id => { const bt = document.querySelector('[data-open="' + id + '"],[data-qopen="' + id + '"]'); bt.click() }, id); await W(2500);
  await p.evaluate(() => { const S = AS(); ['UR6', 'UR5', 'LR6'].forEach(k => S.imp.sel[k] = true); reSec('imp') }); await W(300);
  await p.click('[data-sec="imp"] [data-spadd]'); await W(300);
  const opts = await p.evaluate(() => [...document.querySelectorAll('[data-sec="imp"] select[data-spf="b"] option')].map(o => o.value));
  ok(JSON.stringify(opts) === JSON.stringify(['', 'روت', 'اشترومن', 'زایگوما', 'نازال', 'تریگوئید']), 'the kind is a list of the five', opts);
  await p.selectOption('[data-sec="imp"] select[data-spf="k"]', 'LR6'); await p.selectOption('[data-sec="imp"] select[data-spf="b"]', 'زایگوما'); await W(500);
  let f = await p.evaluate(() => { const S = AS(), el = document.getElementById('calc_imp'), pi = document.querySelector('[data-sec="imp"] [data-m55p="z"]'); return { sp: S.imp.sp, calc: el ? el.textContent : '', pin: pi ? pi.value : null, bp: num(S.imp.bp.ir), ir: rowTotals({ s: S, brand: 'ir' }, SEC.imp).brand.ir } });
  ok(f.sp[0].k === 'LR6' && f.sp[0].b === 'زایگوما' && /زایگوما ۱ × ۴۵٬۰۰۰٬۰۰۰/.test(f.calc) && f.pin && f.ir === 2 * f.bp + 45000000, 'picking «زایگوما» prices it at once and shows its tariff box', f);
  ok(await p.evaluate(() => { const b = document.querySelector('[data-sec="imp"] .m55p'); return !!b && getComputedStyle(b).display === 'none' }), 'the doctor does not see the tariff box (no prices for the doctor)');
  await p.context().close(); p = await login('consultant'); await p.evaluate(async id => { const j = await api('get', { id }); openForm(fromDoc(id, j.data || {})) }, id); await W(1500);
  await p.evaluate(() => { const S = AS(); ['UR6', 'UR5', 'LR6'].forEach(k => S.imp.sel[k] = true); S.imp.sp = [{ k: 'LR6', b: 'زایگوما', d: '', l: '' }]; reSec('imp') }); await W(300);
  await p.fill('[data-sec="imp"] [data-m55p="z"]', '47000000'); await W(400); f = await p.evaluate(() => { const S = AS(); return { ip: num(S.imp.ip.spz), ir: rowTotals({ s: S, brand: 'ir' }, SEC.imp).brand.ir, bp: num(S.imp.bp.ir), calc: document.getElementById('calc_imp').textContent } });
  ok(f.ip === 47000000 && f.ir === 2 * f.bp + 47000000 && /۴۷٬۰۰۰٬۰۰۰/.test(f.calc), 'the tariff can be changed for this patient', f);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll');
  await p.context().close();
  p = await login('doctor', 390, 740); await p.evaluate(id => { const bt = document.querySelector('[data-open="' + id + '"],[data-qopen="' + id + '"]'); bt.click() }, id); await W(2500);
  const m = await p.evaluate(() => { const S = AS(); ['UR6', 'LR6'].forEach(k => S.imp.sel[k] = true); S.imp.sp = [{ k: 'LR6', b: 'نازال', d: '', l: '' }]; reSec('imp'); const el = document.querySelector('[data-sec="imp"] .sp'); if (el) el.scrollIntoView(); return { wide: document.documentElement.scrollWidth <= innerWidth + 1, box: !!document.querySelector('[data-m55p="n"]') } });
  ok(m.wide && m.box, 'phone: the box fits', m); await p.context().close();
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
