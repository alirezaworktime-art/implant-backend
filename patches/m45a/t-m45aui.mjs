// t-m45aui: surgery sheet — suture kind, surgical guide, repeated-tooth and far-cost confirmations. Run: WORKER=<m45a bundle> node t-m45aui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
await h.must('manager', 'settings', { settings: { prices: { arc_sgd: { price: '3000000' } } } });
const refer = async (id, nm) => { const tk = h.tasks(id).find(t => t.kind === 'book' && !t.done); await h.appt(id, nm, 'surg', h.today(), tk && tk.id); await h.must('staff', 'toSurgery', { id }) };
const mk = async nm => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await refer(id, nm); return id };
const n1 = 'بیمار منتظر', id1 = await mk(n1); const n2 = 'بیمار دو جلسه', id2 = await mk(n2); await h.surg(id2, n2, false); await refer(id2, n2);
const sg = id => JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg || '{}');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const ask = p => p.evaluate(() => { const s = document.getElementById('uxAskSh'); return s && !s.hidden ? s.innerText.slice(0, 400) : '' });
const answer = (p, re) => p.evaluate(src => { const R = new RegExp(src); const bt = [...document.querySelectorAll('button')].filter(x => x.offsetParent !== null && R.test(x.textContent)).pop(); if (bt) bt.click(); return !!bt }, re.source);
try {
  for (const [vw, vh] of [[1280, 800], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone'; const p = await login('surgery', vw, vh);
    await p.evaluate(nm => { goTile('surg'); openSurg(QITEMS.find(q => q.name === nm)) }, tag === 'desktop' ? n1 : n2); await W(1800);
    await p.evaluate(() => { const a = document.querySelector('#sgAsst [data-sgas]'); if (a) a.click(); Object.keys(SURG.s.imp.sel).filter(k => SURG.s.imp.sel[k] && isTooth(k)).forEach(k => { if (!SURG.imp[k] || !SURG.imp[k].b) SURG.imp[k] = { b: 'IZEN', sys: '', g: 'ko', d: '4', l: '10', ht: 'heal', hs: '', rs: 'new' } }); renderSurg() }); await W(300);
    let s = await p.evaluate(() => ({ sut: document.querySelectorAll('#m45Sut [data-m45sut]').length, on: document.querySelectorAll('#m45Sut [aria-pressed="true"]').length, gd: !!document.querySelector('#sgPick2 [data-m45gd]'), fu: document.querySelector('#viewSurg [data-fu="suture"]').checked }));
    ok(s.sut === 3 && s.on === 0 && s.gd && s.fu, tag + ': the sheet has «بخیه‌ی این جلسه» (nothing chosen) and «سرجیکال گاید» in the list', s);
    await p.click('#m45Sut [data-m45sut="abs"]'); await W(150); s = await p.evaluate(() => ({ v: SURG.sut, fu: document.querySelector('#viewSurg [data-fu="suture"]').checked })); ok(s.v === 'abs' && !s.fu, tag + ': «جذبی» → «دو هفته بعد: کشیدن بخیه» is switched off', s);
    await p.click('#m45Sut [data-m45sut="non"]'); await W(150); s = await p.evaluate(() => ({ v: SURG.sut, fu: document.querySelector('#viewSurg [data-fu="suture"]').checked })); ok(s.v === 'non' && s.fu, tag + ': «غیرجذبی» → the suture follow-up is on again', s);
    await p.evaluate(() => document.querySelector('#sgPick2 [data-m45gd]').click()); await W(250); await p.click('#m45Gd [data-m45j="B"]'); await W(150); await p.click('#m45GdOk'); await W(300);
    s = await p.evaluate(() => ({ row: m45a.gdRow(), chip: document.querySelector('#sgPick2 [data-m45gd]').textContent, oth: !!document.getElementById('m31Oth'), wide: document.documentElement.scrollWidth <= innerWidth + 2 }));
    ok(s.row && s.row.t === 'سرجیکال گاید — هر دو فک' && /✓/.test(s.chip) && s.oth && s.wide, tag + ': guide for both jaws is written as a row of «سایر درمان‌ها»', s);
    if (tag === 'desktop') { await p.screenshot({ path: 'surg.png', fullPage: true }).catch(() => 0);
      await p.evaluate(() => { const bt = document.getElementById('sgSave'); bt.scrollIntoView(); bt.click() }); await W(1000); 
      ok(await p.evaluate(() => { const r = document.getElementById('sgRev'); return r && !r.hidden && /بخیه: /.test(document.getElementById('srBody').textContent) && /سرجیکال گاید/.test(document.getElementById('srBody').textContent) }), 'desktop: the review shows the suture kind and the guide');
      await p.click('#srOk'); await W(4500); const S = sg(id1), ses = (S.sessions || [])[0] || {}; const g = (ses.oth || []).find(o => o.t.startsWith('سرجیکال گاید'));
      ok(ses.sut === 'non' && g && g.amt === 6000000 && (ses.fu || []).includes('suture'), 'desktop: saved — suture kind, guide priced 2 × 3,000,000 by the server, suture follow-up kept', { sut: ses.sut, g, fu: ses.fu });
      const pc = await login('consultant'); await pc.evaluate(({ id }) => openFile(id, 'x'), { id: id1 }); await W(2000); ok(await pc.evaluate(() => /بخیه‌ی غیرجذبی/.test((document.querySelector('#pfBody .tl .m45s') || {}).textContent || '')), 'desktop: the patient file shows the suture kind of the session'); await pc.context().close() }
    else { // second session of a patient: the same tooth again as «جدید»
      const k = await p.evaluate(() => { const prev = SURG.prev[0], k = Object.keys(prev.imp)[0], m = prev.imp[k]; SURG.s.imp.sel[k] = true; SURG.imp[k] = { b: m.b, sys: m.sys || '', g: m.g || '', d: m.d, l: m.l, ht: 'heal', hs: '', rs: 'new' }; renderSurg(); return k });
      ok((await p.evaluate(() => m45a.dups().length)) === 1, 'phone: a tooth implanted in session 1 and recorded «جدید» again is noticed');
      await p.evaluate(() => { const bt = document.getElementById('sgSave'); bt.scrollIntoView(); bt.click() }); await W(700); let t = await ask(p);
      ok(/قبلاً ایمپلنت گرفته/.test(t) && await p.evaluate(() => document.getElementById('sgRev').hidden), 'phone: «ثبت جلسه» asks before the review opens', t);
      await answer(p, /برمی‌گردم/); await W(400); ok(await p.evaluate(() => document.getElementById('sgRev').hidden), 'phone: «برمی‌گردم» stays on the sheet');
      await p.evaluate(k => { SURG.imp[k].rs = 'redo'; renderSurg(); document.getElementById('sgSave').click() }, k); await W(900); t = await ask(p); ok(!/قبلاً ایمپلنت گرفته/.test(t), 'phone: with «کاشت مجدد» there is no question', t.slice(0, 80));
      await p.evaluate(() => { const r = document.getElementById('sgRev'); if (r && !r.hidden) document.getElementById('srBack').click() }); await W(300);
      await p.evaluate(k => { SURG.imp[k].rs = 'new'; renderSurg(); document.getElementById('sgSave').click() }, k); await W(700); await answer(p, /بله، «جدید»/); await W(1200);
      ok(await p.evaluate(() => !document.getElementById('sgRev').hidden), 'phone: «بله، جدید ثبت شود» goes on to the review');
      // far from the plan on finishing
      const far = await p.evaluate(async () => { let asked = ''; const of = window.fetch; let sent = 0; window.fetch = async (u, o) => { try { const j = JSON.parse(o.body); if (j.action === 'surgSave') { sent++; return new Response(JSON.stringify({ ok: false, error: 'test' }), { headers: { 'content-type': 'application/json' } }) } } catch (e) { } return of(u, o) };
        const pr = api('surgSave', { id: SURG.id, session: {}, finish: true, actual: 1000, planned: 50000000, sendId: 'x' }).then(() => 'sent', e => e.message); await new Promise(r => setTimeout(r, 500));
        { const q = document.getElementById('uxAskSh'); asked = q && !q.hidden ? q.innerText : '' } const no = [...document.querySelectorAll('button')].filter(x => x.offsetParent !== null && /برمی‌گردم و نگاه/.test(x.textContent)).pop(); if (no) no.click(); const r1 = await pr;
        const pr2 = api('surgSave', { id: SURG.id, session: {}, finish: true, actual: 49000000, planned: 50000000, sendId: 'y' }).then(() => 'sent', e => e.message); const r2 = await pr2; window.fetch = of; return { asked: asked.slice(0, 200), r1, r2, sent } });
      ok(/فرق زیادی دارد/.test(far.asked) && /بازبینی/.test(far.r1) && far.sent === 1 && /test/.test(far.r2), 'phone: finishing with a cost far from the plan asks first («برمی‌گردم» sends nothing); a normal cost goes straight to the server', far) }
    await p.context().close(); }
} catch (e) { console.log('ERR', e.message.slice(0, 600)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
