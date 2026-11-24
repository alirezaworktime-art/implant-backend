// t-m44bui: paper file — «فیل اولیه» + second fixture on the same tooth as its own implant row. Run: WORKER=<m44b bundle> node t-m44bui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
await h.must('manager', 'settings', { settings: { catalog: [{ b: 'IZEN', sys: '', g: 'ko', d: ['4', '4.5'], l: ['8', '10'], h: [] }, { b: 'Root', sys: '', g: 'rt', d: ['4', '5'], l: ['9', '11'], h: [] }], prices: { imp: { price: '', bp: { ir: '8000000', ko: '10000000', it: '15000000', sw: '20000000', rt: '21000000' } } } } });
const stock = () => Object.fromEntries(h.sql(`select b, d, l, qty from inv_items where kind='fix'`).map(r => [[r.b, r.d, r.l].join('/'), r.qty]));
const diff = (a, b) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (b[k] || 0) - (a[k] || 0); if (d) o[k] = d } return o };
const old = new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 10);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const setFix = (p, b, d, l) => p.evaluate(({ b, d, l }) => { const P = ARB.p; P.b = b; P.c = arbCat(b); P.ob = P.c ? '' : b; P.d = d; P.len = l }, { b, d, l });
try {
  for (const [vw, vh] of [[1280, 800], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone'; const p = await login('staff', vw, vh); await p.evaluate(() => a6Open()); await W(1800);
    const id1 = await p.evaluate(old => { const l = a6NewLine('imp'); A6.op.add('imp'); l.day = old; l.dayJ = jDay(old); l.doc = 'دکتر نمونه'; a6Render(); return l.id }, old); await W(150);
    // a normal implant on UR5
    await p.evaluate(id => arbOpen(a6L(id), 'UR5'), id1); await W(150); let s = await p.evaluate(() => ({ row: !!document.getElementById('m44bRow'), hid: document.getElementById('m44bRow').hidden })); ok(s.row && s.hid, tag + ': «کاشت موفق» shows no second-fixture question', s);
    await setFix(p, 'IZEN', '4', '10'); await p.click('#arbOk'); await W(250);
    // failed on UR6, with a second fixture
    await p.evaluate(id => arbOpen(a6L(id), 'UR6'), id1); await W(150); await setFix(p, 'IZEN', '4', '10');
    await p.evaluate(() => document.querySelector('#arbSh [data-m3f="1"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await W(100);
    ok(await p.evaluate(() => !document.getElementById('m44bRow').hidden), tag + ': «فیل اولیه» shows «دوباره کاشته شد؟»');
    await p.evaluate(() => document.querySelector('#arbSh [data-m44b="1"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await p.click('#arbOk'); await W(500);
    s = await p.evaluate(id => ({ open: !document.getElementById('arbSh').hidden, title: document.querySelector('#arbSh h3').textContent, t: ARB.p && ARB.p.t, other: ARB.p && ARB.p.lid !== id, n: A6.lines.filter(l => l.k === 'imp').length, fp: a6L(id).fp, f: !!a6L(id).imp.UR6.f }), id1);
    ok(s.open && /فیکسچر دوم/.test(s.title) && s.t === 'UR6' && s.other && s.n === 2 && s.fp === 0 && s.f, tag + ': «ثبت» keeps the failed fixture and opens the window of the second fixture in a new row', s);
    await setFix(p, 'Root', '5', '11'); await p.click('#arbOk'); await W(400);
    s = await p.evaluate(id => { const l = a6L(id), c = m44b.comp(l, 'UR6'); return { c: c && { day: c.day === l.day, doc: c.doc === l.doc, teeth: c.teeth, imp: c.imp.UR6 }, amt1: arbAmt(l), amt2: c && arbAmt(c), note: !!document.querySelector('.m44bn'), tag: [...document.querySelectorAll(`[data-arbt="UR6"][data-l="${id}"]`)].map(x => x.textContent).join(' '), wide: document.documentElement.scrollWidth <= innerWidth + 2 } }, id1);
    ok(s.c && s.c.day && s.c.doc && s.c.teeth.join() === 'UR6' && s.c.imp.b === 'Root' && s.c.imp.d === '5' && !s.c.imp.f, tag + ': second row has the same date and doctor, tooth UR6 with its own brand and size', s.c);
    ok(s.amt1 === 10000000 && s.amt2 === 21000000 && s.note && /فیکسچر دوم/.test(s.tag) && s.wide, tag + ': failed fixture not charged (0), UR5 at the Korean tariff, second fixture at the Root tariff; both rows are labelled', s);
    // reopening the failed tooth: «بله» is remembered; no third row
    await p.evaluate(id => arbOpen(a6L(id), 'UR6'), id1); await W(150); s = await p.evaluate(() => ({ yes: document.querySelector('#arbSh [data-m44b="1"]').getAttribute('aria-pressed'), hid: document.getElementById('m44bRow').hidden })); await p.click('#arbOk'); await W(400);
    ok(s.yes === 'true' && !s.hid && await p.evaluate(() => A6.lines.filter(l => l.k === 'imp').length === 2 && document.getElementById('arbSh').hidden), tag + ': reopening the failed tooth remembers the second fixture and makes no third row', s);
    // cancelling the second window removes the empty row
    await p.evaluate(id => arbOpen(a6L(id), 'UR4'), id1); await W(150); await setFix(p, 'IZEN', '4', '8'); await p.evaluate(() => { document.querySelector('#arbSh [data-m3f="1"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.querySelector('#arbSh [data-m44b="1"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })) }); await p.click('#arbOk'); await W(500); await p.click('#arbNo'); await W(400);
    ok(await p.evaluate(() => A6.lines.filter(l => l.k === 'imp').length === 2), tag + ': «انصراف» in the second window leaves no empty row');
    if (tag === 'desktop') { await p.screenshot({ path: 'arc-two.png', fullPage: true }).catch(() => 0);
      // what goes to the server, then the real save and the store
      const lines = await p.evaluate(async () => { const of = window.fetch; let body = null; window.fetch = async (u, o) => { try { const j = JSON.parse(o.body); if (j.action === 'fxArc') { body = j; return new Response(JSON.stringify({ ok: false, error: 'test' }), { headers: { 'content-type': 'application/json' } }) } } catch (e) { } return of(u, o) };
        try { await api('fxArc', { arc: { v6: 1, lines: A6.lines.map(l => ({ id: l.id, k: l.k, day: l.day, doc: l.doc, teeth: l.teeth, n: num(l.n), price: num(l.price), sut: l.sut || '', txt: '', note: '', fp: l.fp, imp: Object.fromEntries(l.teeth.map(t => [t, { b: (l.imp[t] || {}).b, d: (l.imp[t] || {}).d, l: (l.imp[t] || {}).l }])) })) } }) } catch (e) { } window.fetch = of; return body && body.arc.lines });
      const S0 = stock(); const r = await h.call('staff', 'fxArc', { id: '', by: 'منشی', ackDup: 1, ackFile: 1, arc: { v6: 1, name: 'بیمار دو فیکسچر', phone: '09131112233', nid: '', age: '40', city: 'یزد', doc: 'دکتر نمونه', pfile: '', lines, pays: [], disc: {}, settled: false, rem: '' } });
      ok(r.ok, 'the rows built by the page are accepted by the server', r); const d = diff(S0, stock());
      ok(d['IZEN/4/10'] === -2 && d['Root/5/11'] === -1 && d['IZEN/4/8'] === -1 && Object.keys(d).length === 3, 'store: failed fixtures and the second fixture each leave their own item', d);
      const tot = h.sql(`select total from plans where id='${r.id}'`)[0].total; ok(tot === 31000000, 'file total: 10,000,000 (UR5) + 21,000,000 (second fixture); failed ones 0', tot);
      const back = await p.evaluate(async id => { const j = await api('get', { id }); const S = a6From(j); A6 = Object.assign(A6, { lines: S.lines }); const I = S.lines.filter(l => l.k === 'imp'); const f = I.find(l => (l.imp.UR6 || {}).f), c = f && m44b.comp(f, 'UR6'); return { n: I.length, f: !!f, c: c && c.imp.UR6.b, tw: c ? m44b.twins(c) : [] } }, r.id);
      ok(back.n === 2 && back.f && back.c === 'Root' && back.tw.join() === 'UR6', 'reopened file: two rows, the second fixture is recognised again', back) }
    await p.context().close(); }
} catch (e) { console.log('ERR', e.message.slice(0, 600)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
