// t-m41ui: floating save dock + paper-file balance preview. Run: WORKER=<m41 bundle> node t-m41ui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 400))); if (!c) bad++ };
const name = 'بیمار نمونه', id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 760) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const dock = p => p.evaluate(() => { const d = document.getElementById('m41Dock'); return d && !d.hidden ? [...d.querySelectorAll('button')].map(x => x.textContent.trim()) : null });
try {
  for (const [vw, vh] of [[1280, 760], [390, 740]]) { const p = await login('surgery', vw, vh); const tag = vw > 500 ? 'desktop' : 'phone';
    ok((await dock(p)) === null, tag + ': no dock on the cartable');
    await p.evaluate(() => { goTile('surg'); openSurg(QITEMS.find(q => q.name === 'بیمار نمونه')) }); await W(1500);
    let D = await dock(p); ok(D && D.includes('ثبت جلسه'), tag + ': surgery sheet — dock shows «ثبت جلسه» while the real button is below', D);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), tag + ': no sideways scroll'); if (tag === 'phone') await p.screenshot({ path: 'dock-phone.png' }); else await p.screenshot({ path: 'dock-desktop.png' });
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await W(500); ok((await dock(p)) === null, tag + ': dock hides when the real button is on screen');
    await p.evaluate(() => { scrollTo(0, 0); window.__c = 0; document.getElementById('sgSave').addEventListener('click', () => { window.__c++ }) }); await W(500); await p.click('#m41Dock [data-m41i]'); await W(900);
    const st = await p.evaluate(() => ({ rev: window.__c === 1, toast: !(document.getElementById('toast') || {}).hidden, sheet: [...document.querySelectorAll('.sheet')].some(s => !s.hidden) })); ok(st.rev || st.toast || st.sheet, tag + ': pressing the dock presses the real button', st);
    ok((await dock(p)) === null || !st.sheet, tag + ': no dock over an open window'); await p.context().close(); }
  // paper file preview
  const p = await login('staff'); await p.evaluate(() => a6Open()); await W(1800);
  const prev = async (rem, settled, paid) => p.evaluate(({ rem, settled, paid }) => { A6.lines = []; A6.pays = paid ? [{ id: 'p1', amount: String(paid), day: '', meth: 'cash', note: '' }] : []; A6.rem = rem; A6.settled = settled; const C = a6Calc(), h = a6MoneyHTML(); return { bal: C.bal, hint: /m41hint/.test(h), cred: /بستانکار/.test(h), first: /اول درمان‌های پرونده/.test(h), over: /به جمع پرونده اضافه می‌شود/.test(h) } }, { rem, settled, paid });
  let r = await prev('', true, 16000000); ok(r.bal === 0 && !r.cred && r.hint, 'paper file: «تسویه» with a payment and no treatments shows zero, not «بستانکار»', r);
  r = await prev('16000000', false, 16000000); ok(r.bal === 16000000 && !r.cred && r.first && r.over, 'paper file: remaining 16 + paid 16 shows 16 owed (as the server stores) and says to enter treatments', r);
  r = await prev('', false, 0); ok(r.bal === 0 && r.hint && !r.over, 'paper file: empty file unchanged', r);
} catch (e) { console.log('ERR', e.message.slice(0, 300)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
