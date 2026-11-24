// t-m43bui: manager — «اصلاح جلسه‌ی جراحی» in the patient file opens the surgery sheet of a recorded session. Run: WORKER=<m43b bundle> node t-m43bui.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const stock = () => JSON.stringify(h.sql('select id, qty from inv_items order by id'));
const plan = id => { const o = h.sql(`select surg, surgN, queue, settle from plans where id='${id}'`)[0]; return { sg: JSON.parse(o.surg || 'null') || {}, n: o.surgN, queue: o.queue, settle: o.settle } };
const tsig = id => h.sql(`select kind, due, done from tasks where plan='${id}'`).map(t => [t.kind, t.due, t.done].join('|')).sort().join(';');
const nm = 'بیمار اصلاح', id = await mk(nm); await h.surg(id, nm, true); await h.travel(2); const P1 = plan(id), S1 = stock(), T1 = tsig(id);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3200); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  for (const [vw, vh] of [[1280, 800], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone';
    const p = await login('manager', vw, vh); await p.evaluate(({ id }) => openFile(id, 'x'), { id }); await W(1800);
    ok(await p.evaluate(() => !!document.querySelector('#pfActs [data-m43bfix]')), tag + ': the manager sees «اصلاح جلسه‌ی جراحی» in the patient file');
    await p.click('#pfActs [data-m43bfix]'); await W(2800);
    const s = await p.evaluate(() => ({ view: !document.getElementById('viewSurg').hidden, ban: (document.getElementById('m43bBan') || {}).textContent || '', title: document.getElementById('sgName').textContent, imp: Object.keys((SURG && SURG.imp) || {}).sort(), finDis: document.getElementById('sg_fin').disabled, fuDis: [...document.querySelectorAll('[data-fu]')].every(c => c.disabled), file: !document.getElementById('pfSheet').hidden, wide: document.documentElement.scrollWidth <= innerWidth + 1 }));
    ok(s.view && /توسط مدیر/.test(s.ban) && /اصلاح مدیر/.test(s.title) && !s.file && s.wide, tag + ': the surgery sheet opens with the manager notice', s);
    ok(s.imp.join() === Object.keys(P1.sg.sessions[0].imp).sort().join() && s.finDis && s.fuDis, tag + ': filled with the recorded implants; «آخرین جلسه» and follow-ups are locked', s); if (tag === 'desktop') await p.screenshot({ path: 'mgr-desktop.png' });
    await p.evaluate(() => { const bt = document.getElementById('sgSave'); bt.scrollIntoView(); bt.click() }); await W(1200);
    ok(await p.evaluate(() => { const r = document.getElementById('sgRev'); return r && !r.hidden }), tag + ': «ثبت جلسه» opens the review'); await p.click('#srOk'); await W(4000);
    const P = plan(id), e = P.sg.sessions[0].edited; ok(e && e.mgr === 1 && P.n === 1 && P.queue === P1.queue && P.sg.finished === P1.sg.finished, tag + ': saved as a manager correction; flow and «finished» unchanged', { e, q: P.queue });
    ok(P.sg.actual === P1.sg.actual && P.settle === P1.settle, tag + ': the amount computed in the manager\'s browser equals what was recorded → nothing to settle', { a: P.sg.actual, a1: P1.sg.actual, s: P.settle });
    ok(stock() === S1 && tsig(id) === T1, tag + ': stock and follow-ups unchanged');
    const af = await p.evaluate(() => ({ surg: !document.getElementById('viewSurg').hidden, file: !document.getElementById('pfSheet').hidden, edit: !!window.m43b.state().edit, finDis: document.getElementById('sg_fin').disabled })); ok(!af.surg && af.file && !af.edit && !af.finDis, tag + ': back to the patient file; the sheet locks are released', af);
    await p.context().close(); }
  let p = await login('consultant'); await p.evaluate(({ id }) => openFile(id, 'x'), { id }); await W(1500); ok(await p.evaluate(() => !document.querySelector('#pfActs [data-m43bfix]')), 'other roles do not get the button'); await p.context().close();
} catch (e) { console.log('ERR', e.message.slice(0, 400)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
