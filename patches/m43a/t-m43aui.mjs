// t-m43aui: «موارد خاص» implants priced by their own brand group. Run: WORKER=<m43a bundle> node t-m43aui.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const nW = 'بیمار منتظر', idW = await h.add(nW); const nC = 'بیمار تاییدشده', idC = await h.add(nC); await h.plan(idC, nC); await h.confirm(idC, nC, 'book'); const nS = 'بیمار مشاوره', idS = await h.add(nS); await h.plan(idS, nS);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  let p = await login('doctor');
  // ---- arithmetic on a fresh plan
  const r = await p.evaluate(() => { const mk = (sp, flag = true) => { const S = blankSections(); ['UR6', 'UR5', 'LR6', 'LL6'].forEach(k => S.imp.sel[k] = true); S.imp.bp = { ir: '10,000,000', ko: '12,000,000', it: '15,000,000', sw: '20,000,000', rt: '21,000,000' }; S.imp.sp = sp; if (!flag) S.imp.ip.m43 = ''; return S };
    const T = S => { const t = totals({ s: S, brand: 'ir', pay: {} }); return { ir: t.surg.ir, ko: t.surg.ko, rt: t.surg.rt, pros: t.pros } };
    const base = T(mk([])), one = T(mk([{ k: 'UR6', b: 'Root', d: '4', l: '10' }])), two = T(mk([{ k: 'UR6', b: 'Root', d: '4', l: '10' }, { k: 'LR6', b: 'JD Evolution', d: '4', l: '10' }])),
      region = T(mk([{ k: 'UR', b: 'Root', d: '', l: '' }])), unsel = T(mk([{ k: 'UL3', b: 'Root', d: '', l: '' }])), unknown = T(mk([{ k: 'UR6', b: 'برند ناشناس', d: '', l: '' }])), dup = T(mk([{ k: 'UR6', b: 'Root', d: '4', l: '10' }, { k: 'UR6', b: 'Root', d: '5', l: '8' }])), old = T(mk([{ k: 'UR6', b: 'Root', d: '4', l: '10' }], false));
    const S1 = mk([{ k: 'UR6', b: 'Root', d: '4', l: '10' }]); const L = priceLines({ s: S1, brand: 'ir', pay: {} }, SEC.imp).map(o => o.t);
    const rec = { s: S1, brand: 'ir', pay: {}, h: {} }; const ses = { s: secDoc((() => { const X = mk([]); return X })()), imp: { UR6: { b: 'Root', g: 'rt', d: '4', l: '10' }, UR5: { b: 'x', g: 'ir' }, LR6: { b: 'x', g: 'ir' }, LL6: { b: 'x', g: 'ir' } } };
    let act = null; try { act = surgActual(rec, [ses]) } catch (e) { act = String(e.message) }
    const doc = secDoc(S1), back = secFrom(doc); return { base, one, two, region, unsel, unknown, dup, old, L, act, plan: totals(rec).surg.ir + totals(rec).pros, flagDoc: doc.imp.ip.m43, flagBack: back.imp.ip.m43, blankOldDoc: secFrom({ imp: { sel: ['UR6'], sp: [{ k: 'UR6', b: 'Root' }], bp: { ir: '1', rt: '5' }, ip: {} } }).imp.ip.m43 } });
  ok(r.base.ir === 40000000 && r.base.ko === 48000000, 'four implants, no special row: 4 × the brand tariff', r.base);
  ok(r.one.ir === 30000000 + 21000000 && r.one.ko === 36000000 + 21000000 && r.one.rt === 84000000, 'one tooth «Root»: 3 × brand + 1 × 21,000,000 (Root plan unchanged)', r.one);
  ok(r.two.ir === 20000000 + 21000000 + 15000000, 'two special teeth of two brands (Root, JD → Italian group)', r.two);
  ok(r.region.ir === r.base.ir && r.unsel.ir === r.base.ir && r.unknown.ir === r.base.ir, 'a region row, a tooth not selected, or an unknown brand does not change the price', { region: r.region.ir, unsel: r.unsel.ir, unknown: r.unknown.ir });
  ok(r.dup.ir === r.one.ir, 'two rows for the same tooth count once', r.dup); ok(r.old.ir === r.base.ir, 'a plan without the new mark (approved before) keeps the old price', r.old);
  ok(r.L.some(t => /ایرانی: .*۳ × ۱۰٬۰۰۰٬۰۰۰ \+ خاص = ۵۱٬۰۰۰٬۰۰۰/.test(t)) && r.L.some(t => /خاص: .*Root ۱ × ۲۱٬۰۰۰٬۰۰۰/.test(t)), 'PDF price column: «3 × tariff + خاص = sum» and the special line', r.L);
  ok(r.act === r.plan, 'surgery cost with the same fixtures equals the plan (nothing left to settle)', { act: r.act, plan: r.plan });
  ok(r.flagDoc === '1' && r.flagBack === '1' && r.blankOldDoc === '', 'the mark is saved with the plan and read back; an old stored plan has none', [r.flagDoc, r.flagBack, r.blankOldDoc]);
  // ---- in the form
  await p.evaluate(() => { const q = QITEMS.find(x => x.name === 'بیمار منتظر'); const bt = document.querySelector('[data-open="' + q.id + '"],[data-qopen="' + q.id + '"]'); bt.click() }); await W(2500);
  const f = await p.evaluate(() => { const S = AS(); ['UR6', 'UR5', 'LR6'].forEach(k => S.imp.sel[k] = true); S.imp.sp = [{ k: 'UR6', b: 'Root', d: '4', l: '10' }]; reSec('imp'); if (typeof touch === 'function') touch(); pl9Calc(); const el = document.getElementById('calc_imp'); const bt = document.getElementById('brandTotals'); return { flag: S.imp.ip.m43, calc: el ? el.textContent : '', wide: document.documentElement.scrollWidth <= innerWidth + 1, ir: totals({ s: S, brand: 'ir', pay: F.pay }).surg.ir, bpIr: num(S.imp.bp.ir), bpRt: num(S.imp.bp.rt), bt: bt ? bt.textContent.slice(0, 200) : '' } });
  ok(f.flag === '1' && /خاص/.test(f.calc) && /Root ۱ ×/.test(f.calc) && f.wide, 'new form: the implant line shows the split', f); ok(f.bpRt > 0 && f.ir >= 2 * f.bpIr + f.bpRt, 'form total for the Iranian plan = 2 × Iranian + 1 × Root (+ other rows)', f);
  await p.context().close();
  // ---- which stored plans follow the new rule
  p = await login('consultant'); const g = await p.evaluate(async ({ idC, idS }) => { const a = await api('get', { id: idC }), b = await api('get', { id: idS }); return { conf: fromDoc(idC, a.data).s.imp.ip.m43 || '', sent: fromDoc(idS, b.data).s.imp.ip.m43 || '', st: [a.data.status, b.data.status] } }, { idC, idS });
  ok(g.conf === '' && g.sent === '1', 'an approved plan keeps the old rule; a plan still waiting for the consultant gets the new one', g); await p.context().close();
  // phone layout of the calc line
  p = await login('doctor', 390, 740); await p.evaluate(() => { const q = QITEMS.find(x => x.name === 'بیمار منتظر'); const bt = document.querySelector('[data-open="' + q.id + '"],[data-qopen="' + q.id + '"]'); bt.click() }); await W(2500);
  const m = await p.evaluate(() => { const S = AS(); ['UR6', 'UR5', 'LR6'].forEach(k => S.imp.sel[k] = true); S.imp.sp = [{ k: 'UR6', b: 'Root', d: '4', l: '10' }]; reSec('imp'); pl9Calc(); const el = document.getElementById('calc_imp'); if (el) el.scrollIntoView(); return { calc: el ? el.textContent.slice(0, 120) : '', wide: document.documentElement.scrollWidth <= innerWidth + 1 } }); await p.screenshot({ path: 'calc-phone.png' });
  ok(/خاص/.test(m.calc) && m.wide, 'phone: split line fits, no sideways scroll', m); await p.context().close();
} catch (e) { console.log('ERR', e.message.slice(0, 400)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
