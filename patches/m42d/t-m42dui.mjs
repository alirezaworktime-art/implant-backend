// t-m42dui: surgery-day cartable — «جلسه‌های ثبت‌شده‌ی امروز», «ویرایش جلسه», the sheet filled with the recorded session, save replaces it. Run: WORKER=<m42d bundle> node t-m42dui.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); const { uuid, REC } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const stock = () => JSON.stringify(h.sql('select id, qty from inv_items order by id'));
const plan = id => { const o = h.sql(`select surg, surgN, queue, settle from plans where id='${id}'`)[0]; return { sg: JSON.parse(o.surg || 'null') || {}, n: o.surgN, queue: o.queue, settle: o.settle } };
const tsig = id => h.sql(`select kind, due, done from tasks where plan='${id}'`).map(t => [t.kind, t.due, t.done].join('|')).sort().join(';');
const nm = 'بیمار ویرایش', id = await mk(nm); await h.surg(id, nm, false); const P1 = plan(id), S1 = stock(), T1 = tsig(id);
const nm0 = 'بیمار منتظر', id0 = await mk(nm0);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3200); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const boxSt = p => p.evaluate(() => { const bx = document.getElementById('m42dBox'); return { ex: !!bx, vis: !!(bx && !bx.hidden && bx.offsetParent !== null), rows: bx ? [...bx.querySelectorAll('.m42row')].map(x => x.textContent.trim().slice(0, 80)) : [], wide: document.documentElement.scrollWidth <= innerWidth + 1 } });
try {
  for (const [vw, vh] of [[1280, 800], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone';
    let p = await login('surgery', vw, vh); await p.evaluate(() => goTile('surg')); await W(1200);
    let bx = await boxSt(p); ok(bx.vis && bx.rows.length === 1 && /بیمار ویرایش/.test(bx.rows[0]) && /ویرایش جلسه/.test(bx.rows[0]) && bx.wide, tag + ': the surgery tile lists today\'s recorded session with «ویرایش جلسه»', bx); if (tag === 'phone') await p.screenshot({ path: 'list-phone.png' });
    await p.click('[data-m42de]'); await W(2500);
    let s = await p.evaluate(() => ({ view: !document.getElementById('viewSurg').hidden, ban: (document.getElementById('m42dBan') || {}).textContent || '', title: document.getElementById('sgName').textContent, imp: Object.keys((SURG && SURG.imp) || {}).sort(), prev: SURG ? SURG.prev.length : -1, fin: document.getElementById('sg_fin').checked, edit: !!(window.m42d.state().edit), wide: document.documentElement.scrollWidth <= innerWidth + 1 }));
    ok(s.view && /در حال ویرایش جلسه/.test(s.ban) && /ویرایش/.test(s.title) && s.edit && s.wide, tag + ': the sheet opens in edit mode with the notice', s);
    ok(s.imp.join() === Object.keys(P1.sg.sessions[0].imp).sort().join() && s.prev === 0 && s.fin === false, tag + ': filled with the recorded implants; counted as session 1 again', s); if (tag === 'desktop') await p.screenshot({ path: 'edit-desktop.png' });
    if (tag === 'desktop') { // leave without saving: nothing changes
      await p.evaluate(() => show('queue')); await W(1200); ok(stock() === S1 && plan(id).sg.sessions.length === 1 && !plan(id).sg.sessions[0].edited && await p.evaluate(() => !window.m42d.state().edit), 'leaving without «ثبت جلسه» changes nothing');
      await p.evaluate(() => goTile('surg')); await W(800); await p.click('[data-m42de]'); await W(2500); }
    // save → review → confirm
    await p.evaluate(() => { const bt = document.getElementById('sgSave'); bt.scrollIntoView(); bt.click() }); await W(1200);
    const rev = await p.evaluate(() => { const r = document.getElementById('sgRev'); return { open: r && !r.hidden, msg: (document.getElementById('sgMsg') || {}).textContent || '', txt: r ? r.textContent.slice(0, 160) : '' } }); ok(rev.open, tag + ': «ثبت جلسه» opens the review as usual', rev);
    await p.click('#srOk'); await W(3500);
    const P = plan(id), e = P.sg.sessions[0].edited; ok(P.n === 1 && P.sg.sessions.length === 1 && e && e.c === (tag === 'desktop' ? 1 : 2), tag + ': confirmed → the session is replaced (marked edited)', { n: P.n, e });
    ok(JSON.stringify(P.sg.sessions[0].imp) === JSON.stringify(P1.sg.sessions[0].imp) && P.sg.actual === P1.sg.actual && P.queue === P1.queue, tag + ': same implants, same amount (the page computes what the server had), same place in the flow', { a: P.sg.actual, a1: P1.sg.actual, q: P.queue });
    ok(stock() === S1 && tsig(id) === T1, tag + ': stock and follow-ups unchanged by an edit without changes');
    const after = await p.evaluate(() => ({ queue: !document.getElementById('viewQueue').hidden, edit: !!window.m42d.state().edit, err: [...document.querySelectorAll('.msg.err')].filter(x => x.offsetParent !== null).map(x => x.textContent).join('|') })); ok(after.queue && !after.edit && !after.err, tag + ': back on the cartable, edit mode off', after);
    // a normal new session is not turned into an edit
    await p.evaluate(() => { goTile('surg'); openSurg(QITEMS.find(q => q.name === 'بیمار منتظر')) }); await W(1500);
    ok(await p.evaluate(() => !window.m42d.state().edit && !document.getElementById('m42dBan') && !/ویرایش/.test(document.getElementById('sgName').textContent)), tag + ': opening another patient is a normal new session');
    await p.context().close(); }
  // finish through the edit
  let p = await login('surgery'); await p.evaluate(() => goTile('surg')); await W(1000); await p.click('[data-m42de]'); await W(2500); await p.evaluate(() => { document.getElementById('sg_fin').checked = true; document.getElementById('sgSave').click() }); await W(1200); await p.click('#srOk'); await W(3500);
  let P = plan(id); ok(P.queue === 'surgdone' && P.sg.finished === true && P.sg.sessions.length === 1, 'edit with «این آخرین جلسه است» → surgery finished', { q: P.queue, f: P.sg.finished }); ok(stock() === S1, 'stock unchanged');
  await p.context().close();
  p = await login('staff'); ok(await p.evaluate(() => !document.getElementById('m42dBox') || document.getElementById('m42dBox').hidden), 'reception does not see the edit list'); await p.context().close();
} catch (e) { console.log('ERR', e.message.slice(0, 400)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
