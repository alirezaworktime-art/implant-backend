// t-m43gui: patient file — implant cost split by brand under the plan approval and under each surgery session. Run: WORKER=<m43g bundle> node t-m43gui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const nm = 'بیمار هزینه', id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); { const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, nm, 'surg', h.today(), tk.id); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); await h.surg(id, nm, true) }
const total = h.sql(`select total from plans where id='${id}'`)[0].total;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  let p = await login('consultant');
  const u = await p.evaluate(() => { const S = blankSections(); ['UR6', 'UR5', 'LR6', 'LL6'].forEach(k => S.imp.sel[k] = true); S.imp.bp = { ir: '8,000,000', ko: '12,000,000', it: '15,000,000', sw: '20,000,000', rt: '21,000,000' }; S.imp.sp = [{ k: 'UR6', b: 'Root', d: '4', l: '10' }];
    const r = { s: S, brand: 'ko', pay: {}, h: {} }, plan = m43g.txt(m43g.planSplit(r)), one = (() => { const S2 = blankSections(); S2.imp.sel.UR6 = true; S2.imp.bp = S.imp.bp; return m43g.txt(m43g.planSplit({ s: S2, brand: 'ko', pay: {}, h: {} })) })(), ref = m43g.planSplit({ s: S, brand: 'ref', pay: {}, h: {} });
    const ses = { s: secDoc((() => { const X = blankSections(); ['UR6', 'UR5', 'LR6', 'LL6'].forEach(k => X.imp.sel[k] = true); return X })()), imp: { UR6: { b: 'Root', g: 'rt' }, UR5: { b: 'IZEN', g: 'ko' }, LR6: { b: 'JD', g: 'it' }, LL6: { b: 'IZEN', g: 'ko', rs: 'redo' } } }, o = m43g.sesSplit(r, ses);
    return { plan, one, ref, ses: m43g.txt(o.G), redo: o.redo, sum: Object.values(o.G).reduce((a, g) => a + g.n * g.p, 0), act: surgActual(r, [ses]) - surgActual(r, [{ s: secDoc(blankSections()), imp: {} }]) } });
  ok(u.plan === 'کره‌ای ۳ × ۱۲٬۰۰۰٬۰۰۰ + Root ۱ × ۲۱٬۰۰۰٬۰۰۰ = ۵۷٬۰۰۰٬۰۰۰', 'plan: brand of the plan + the special tooth of another brand', u.plan);
  ok(u.one === 'کره‌ای ۱ × ۱۲٬۰۰۰٬۰۰۰' && u.ref === null, 'one brand → one «count × tariff»; a plan without a chosen brand shows nothing', [u.one, u.ref]);
  ok(u.ses === 'کره‌ای ۱ × ۱۲٬۰۰۰٬۰۰۰ + ایتالیایی ۱ × ۱۵٬۰۰۰٬۰۰۰ + Root ۱ × ۲۱٬۰۰۰٬۰۰۰ = ۴۸٬۰۰۰٬۰۰۰' && u.redo === 1, 'session: fixtures really placed, by brand; a re-implant is listed apart as free', [u.ses, u.redo]);
  console.log('     implant part of the actual cost in the same case:', u.act, 'split sum:', u.sum);
  for (const [vw, vh] of [[1280, 800], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone'; if (tag === 'phone') { await p.context().close(); p = await login('consultant', vw, vh) }
    await p.evaluate(({ id }) => openFile(id, 'x'), { id }); await W(2000);
    const s = await p.evaluate(() => { const I = [...document.querySelectorAll('#pfBody .tl .tl-i')].map(x => ({ t: x.querySelector('b').textContent.trim(), g: (x.querySelector('.m43g') || {}).textContent || '' })); return { conf: I.find(x => x.t === 'تأیید طرح درمان'), ses: I.filter(x => /جلسه‌ی .* جراحی/.test(x.t)), n: document.querySelectorAll('#pfBody .m43g').length, over: document.documentElement.scrollWidth > innerWidth + 2 } });
    ok(s.conf && /ایمپلنت در طرح به تفکیک برند: .*[۰-۹] × [۰-۹٬]+/.test(s.conf.g) && s.ses.length === 1 && /ایمپلنت‌های کاشته‌شده به تفکیک برند: .*[۰-۹] × [۰-۹٬]+/.test(s.ses[0].g) && s.n === 2 && !s.over, tag + ': the file shows «count × tariff» under the plan approval and under the surgery session', s);
    await p.evaluate(() => renderFile()); await W(200); ok(await p.evaluate(() => document.querySelectorAll('#pfBody .m43g').length === 2), tag + ': drawing again does not repeat the lines');
    if (tag === 'desktop') await p.screenshot({ path: 'file.png' }) }
  ok(h.sql(`select total from plans where id='${id}'`)[0].total === total, 'the stored total is untouched');
  await p.context().close(); p = await login('surgery'); await p.evaluate(({ id }) => openFile(id, 'x'), { id }); await W(1800); ok(await p.evaluate(() => document.querySelectorAll('#pfBody .m43g').length === 0), 'roles that do not see prices get no cost lines'); await p.context().close();
} catch (e) { console.log('ERR', e.message.slice(0, 600)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
