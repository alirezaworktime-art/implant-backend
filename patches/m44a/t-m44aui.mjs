// t-m44aui: implant window — «فیل اولیه» + second fixture with its own brand and size. Run: WORKER=<m44a bundle> node t-m44aui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const nm = 'بیمار منتظر', id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); { const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, nm, 'surg', h.today(), tk.id); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }) }
{ const r = await h.call('manager', 'settings', { settings: { catalog: [{ b: 'IZEN', sys: '', g: 'ko', d: ['4', '4.5'], l: ['8', '10', '11.5'], h: [] }, { b: 'JD', sys: 'Plus', g: 'it', d: ['3.7', '4.3'], l: ['8', '10'], h: [] }, { b: 'Root', sys: '', g: 'rt', d: ['4', '5'], l: ['9', '11'], h: [] }] } }); if (!r || r.ok === false) console.log('catalog seed failed', r && r.error) }
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  for (const [vw, vh] of [[1280, 800], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone';
    const p = await login('surgery', vw, vh); await p.evaluate(() => { goTile('surg'); openSurg(QITEMS.find(q => q.name === 'بیمار منتظر')) }); await W(1800);
    const k = await p.evaluate(() => { const ks = Object.keys(SURG.s.imp.sel).filter(k => SURG.s.imp.sel[k] && isTooth(k)); const k = ks[0] || 'UR6'; openImp(k, 'imp'); return k }); await W(400);
    let s = await p.evaluate(() => ({ w: !!document.getElementById('m44W'), hid: document.getElementById('m44W') ? document.getElementById('m44W').hidden : null, cats: catM().length }));
    ok(s.w && s.hid === true && s.cats > 1, tag + ': a normal implant shows no second-fixture box', s);
    // pick the first fixture from the catalogue
    await p.evaluate(() => { const C = catM(), i = C.findIndex(c => c.d && c.d.length); const S = document.getElementById('imp_cat'); S.value = String(i); S.dispatchEvent(new Event('change', { bubbles: true })); impSync(); const c = C[i]; const dS = document.getElementById('imp_dS'); dS.value = c.d[0]; dS.dispatchEvent(new Event('change', { bubbles: true })); impSync(); const lS = document.getElementById('imp_lS'), LL = catLens(c, c.d[0]); lS.value = LL[0]; lS.dispatchEvent(new Event('change', { bubbles: true })); impSync() }); await W(200);
    await p.click('#impSheet [data-rs="fail"]'); await W(200);
    s = await p.evaluate(() => ({ hid: document.getElementById('m44W').hidden, v: document.getElementById('m44cat').value, opts: document.getElementById('m44cat').options.length, g: document.getElementById('m44G').hidden }));
    ok(s.hid === false && s.v === '' && s.opts === s2n(await p.evaluate(() => catM().length)) + 2 && s.g === true, tag + ': «فیل اولیه» + «فیکسچر دوم کاشته شد» shows the box, default «همان برند و سایز»', s);
    await p.click('#ex1RepW [data-ex1rep="0"]'); await W(150); ok(await p.evaluate(() => document.getElementById('m44W').hidden), tag + ': «برداشته شد» hides the box'); await p.click('#ex1RepW [data-ex1rep="1"]'); await W(150);
    // choose another catalogue entry for the second fixture, no size yet → refused
    const c2 = await p.evaluate(() => { const C = catM(), first = Number(document.getElementById('imp_cat').value); let i = C.findIndex((c, j) => j !== first && c.d && c.d.length && c.g && c.g !== C[first].g); if (i < 0) i = C.findIndex((c, j) => j !== first && c.d && c.d.length); const S = document.getElementById('m44cat'); S.value = String(i); S.dispatchEvent(new Event('change', { bubbles: true })); const c = C[i]; return { i, b: c.b, sys: c.sys || '', g: c.g, d: c.d[0], l: catLens(c, c.d[0])[0], g1: C[first].g } }); await W(150);
    await p.evaluate(() => impSave()); await W(200); s = await p.evaluate(() => ({ open: !document.getElementById('impSheet').hidden, msg: document.getElementById('impMsg').textContent })); ok(s.open && /فیکسچر دوم/.test(s.msg), tag + ': second fixture without size is refused with a clear message', s);
    await p.fill('#m44d', String(c2.d)); await p.fill('#m44l', String(c2.l)); await W(200);
    s = await p.evaluate(() => ({ st: document.getElementById('m44St').textContent, lens: document.getElementById('m44lL').options.length, wide: document.documentElement.scrollWidth <= innerWidth + 1 })); ok(/فیکسچر دوم/.test(s.st) && s.lens > 0 && s.wide, tag + ': stock line for the second fixture, length list follows the diameter, no sideways scroll', s);
    if (tag === 'desktop') await p.screenshot({ path: 'imp-desktop.png' });
    await p.evaluate(() => impSave()); await W(300);
    s = await p.evaluate(k => { const m = SURG.imp[k]; return { closed: document.getElementById('impSheet').hidden, m, tag: (document.querySelector(`#sgImps [data-impedit="${k}"]`) || {}).textContent || '' } }, k);
    ok(s.closed && s.m.rs === 'fail' && s.m.rep === 1 && s.m.f2 && s.m.f2.b === c2.b && String(s.m.f2.d) === String(c2.d) && String(s.m.f2.l) === String(c2.l), tag + ': saved — the record keeps the failed fixture and the placed one', s.m);
    ok(s.m.g === (c2.g || s.m.g) && (!c2.g || s.m.g1 === c2.g1) && /فیکسچر دوم: /.test(s.tag) && s.tag.includes(c2.b), tag + ': price group follows the placed fixture; the list shows the second fixture', { g: s.m.g, g1: s.m.g1, tag: s.tag.slice(0, 200) });
    // reopen: the choice is back
    await p.evaluate(k => openImp(k, 'imp'), k); await W(300); s = await p.evaluate(() => ({ v: document.getElementById('m44cat').value, d: document.getElementById('m44d').value, l: document.getElementById('m44l').value, hid: document.getElementById('m44W').hidden }));
    ok(!s.hid && s.v === String(c2.i) && s.d === String(c2.d) && s.l === String(c2.l), tag + ': reopening shows the second fixture again', s);
    // back to «همان» → f2 gone; then normal implant → no f2
    await p.evaluate(() => { const S = document.getElementById('m44cat'); S.value = ''; S.dispatchEvent(new Event('change', { bubbles: true })); impSave() }); await W(300);
    s = await p.evaluate(k => SURG.imp[k], k); ok(s.rs === 'fail' && s.rep === 1 && !s.f2 && !s.g1, tag + ': «همان برند و سایز» → one record, counted twice as before', s);
    await p.context().close(); }
} catch (e) { console.log('ERR', e.message.slice(0, 600)); bad++ }
function s2n(v) { return Number(v) || 0 }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
