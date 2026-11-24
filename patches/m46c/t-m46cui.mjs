// t-m46cui: surgery sheet «سایر خدمات» — name, amount, teeth, count, doctor. Run: WORKER=<m46c bundle> node t-m46cui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const mk = async nm => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, nm, 'surg', h.today(), tk.id); await h.must('staff', 'toSurgery', { id }); return id };
const n1 = 'بیمار منتظر', id1 = await mk(n1), n2 = 'بیمار موبایل', id2 = await mk(n2);
const ses = id => (JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg || '{}').sessions || [])[0] || {};
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  for (const [vw, vh] of [[1280, 800], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone', nm = tag === 'desktop' ? n1 : n2, id = tag === 'desktop' ? id1 : id2; const p = await login('surgery', vw, vh);
    await p.evaluate(nm => { goTile('surg'); openSurg(QITEMS.find(q => q.name === nm)) }, nm); await W(1800);
    await p.evaluate(() => { const a = document.querySelector('#sgAsst [data-sgas]'); if (a) a.click(); Object.keys(SURG.s.imp.sel).filter(k => SURG.s.imp.sel[k] && isTooth(k)).forEach(k => { if (!SURG.imp[k] || !SURG.imp[k].b) SURG.imp[k] = { b: 'IZEN', sys: '', g: 'ko', d: '4', l: '10', ht: 'heal', hs: '', rs: 'new' } }); renderSurg() }); await W(300);
    let s = await p.evaluate(() => ({ chip: (document.querySelector('#sgPick2 [data-m31oth]') || {}).textContent || '' })); ok(/سایر خدمات/.test(s.chip), tag + ': the treatment list has «سایر خدمات»', s);
    await p.evaluate(() => document.querySelector('#sgPick2 [data-m31oth]').click()); await W(400);
    s = await p.evaluate(() => ({ h: (document.querySelector('#m31Oth .h2t') || {}).textContent, x: document.querySelectorAll('#m31Oth .m46x').length, rows: document.querySelectorAll('#m31Oth .m31or').length, docs: [...document.querySelectorAll('#m31Oth [data-m46d="0"] option')].length }));
    ok(s.h === 'سایر خدمات' && s.x === s.rows && s.rows >= 1 && s.docs >= 2, tag + ': the card has, for every row, teeth, count and a doctor list', s);
    await p.fill('#m31Oth [data-m31on="0"]', 'برداشتن کیست'); await p.fill('#m31Oth [data-m31oa="0"]', '2000000'); await p.click('#m31Oth [data-m46t="0"]'); await W(250);
    await p.click('#m46T [data-m46k="UR6"]'); await p.click('#m46T [data-m46k="UR5"]'); await p.click('#m46T [data-m46k="LL8"]'); await W(100); await p.click('#m46TOk'); await W(300);
    const dn = await p.evaluate(() => { const S = document.querySelector('#m31Oth [data-m46d="0"]'); S.value = S.options[1].value; S.dispatchEvent(new Event('change', { bubbles: true })); return S.value });
    s = await p.evaluate(() => ({ x: SURG.oth[0].x, btn: document.querySelector('#m31Oth [data-m46t="0"]').textContent, n: document.querySelector('#m31Oth [data-m46n="0"]').value, wide: document.documentElement.scrollWidth <= innerWidth + 2 }));
    ok(s.x.teeth.join() === 'LL8,UR5,UR6' && s.x.n === '3' && s.x.doc === dn && /دندان‌ها: /.test(s.btn) && s.n === '۳' && s.wide, tag + ': three teeth chosen on the chart → count 3 by itself; doctor chosen; no sideways scroll', s);
    await p.fill('#m31Oth [data-m46n="0"]', '5'); await W(100); ok(await p.evaluate(() => SURG.oth[0].x.n === '5'), tag + ': the count can be typed over');
    if (tag === 'desktop') { await p.evaluate(() => document.getElementById('m31Oth').scrollIntoView()); await p.screenshot({ path: 'oth.png' });
      await p.evaluate(() => { const bt = document.getElementById('sgSave'); bt.scrollIntoView(); bt.click() }); await W(1000);
      s = await p.evaluate(() => ({ rev: !document.getElementById('sgRev').hidden, txt: document.getElementById('srBody').innerText.split('\n').filter(l => /کیست|سایر/.test(l)).join(' | '), msg: document.getElementById('sgMsg').textContent }));
      ok(s.rev && /سایر خدمات/.test(s.txt) && /برداشتن کیست/.test(s.txt) && /۵ عدد/.test(s.txt) && s.txt.includes(dn), 'desktop: the review lists the service with teeth, count and doctor', s);
      await p.click('#srOk'); await W(4500); const S = ses(id); ok(S.oth && S.oth[0].t === 'برداشتن کیست' && S.oth[0].amt === 2000000 && S.othx && S.othx[0].teeth.length === 3 && S.othx[0].n === 5 && S.othx[0].doc === dn, 'desktop: saved with the session', { oth: S.oth, othx: S.othx });
      const pc = await login('consultant'); await pc.evaluate(({ id }) => openFile(id, 'x'), { id }); await W(2000); const ft = await pc.evaluate(() => (document.querySelector('#pfBody .tl .m46o') || {}).textContent || ''); ok(/سایر خدمات: برداشتن کیست/.test(ft) && /۵ عدد/.test(ft) && ft.includes(dn) && /۲٬۰۰۰٬۰۰۰/.test(ft), 'desktop: the patient file lists it under the session', ft); await pc.context().close() }
    else { // a draft comes back with its details when the sheet is reopened
      await p.evaluate(nm => { show('queue'); openSurg(QITEMS.find(q => q.name === nm)) }, nm); await W(1500); s = await p.evaluate(() => ({ oth: (SURG.oth || []).map(o => [o.t, o.x && o.x.teeth.length, o.x && o.x.n]) })); ok(s.oth[0] && s.oth[0][0] === 'برداشتن کیست' && s.oth[0][1] === 3 && s.oth[0][2] === '5', 'phone: leaving and reopening the sheet keeps the row with its details', s) }
    await p.context().close(); }
} catch (e) { console.log('ERR', e.message.slice(0, 600)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
