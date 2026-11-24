import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms));
const n1 = 'بیمار عادی', id1 = await h.add(n1); await h.plan(id1, n1); const id0 = await h.add('فقط پذیرش'); const n2='بیمار تاییدشده', id2 = await h.add(n2); await h.plan(id2,n2); await h.confirm(id2,n2,'book');
const old = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10), yd = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
const ar = await h.call('staff', 'fxArc', { id: '', by: 'منشی', ackDup: 1, ackFile: 1, arc: { v6: 1, name: 'بیمار کاغذی', phone: '09131112233', nid: '', age: '40', city: 'یزد', doc: 'دکتر نمونه', pfile: '', lines: [{ id: 'l1', k: 'imp', day: old, doc: 'دکتر نمونه', teeth: ['UR6'], n: 1, price: 10000000, imp: { UR6: { b: 'Root', d: '4', l: '10' } } }], pays: [{ id: 'p1', amount: 4000000, day: yd, meth: 'cash', note: '' }], disc: {}, settled: false, rem: '' } });
console.log('arc', ar.ok, ar.id);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const role of ['staff', 'consultant']) { const c = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => console.log('PE', e.message.slice(0, 200)));
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(2500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
  for (const [nm, id] of [['plan sent', id1], ['intake only', id0], ['confirmed', id2], ['paper', ar.id]]) { await p.evaluate(({ id }) => openFile(id, 'x'), { id }); await W(1500);
    const o = await p.evaluate(() => { const b = document.getElementById('pfBody'); const hs = [...b.querySelectorAll('h3.pf-h')].map(x => x.textContent); const pv = b.querySelector('.pview'); return { hs, pview: pv ? pv.textContent.trim().slice(0, 120) : null, tl: [...b.querySelectorAll('.tl-i b')].map(x => x.textContent).slice(0, 8), tabs: [...document.querySelectorAll('#pfSheet [data-pftab]')].map(x => x.textContent.trim()) } });
    console.log(role, nm, JSON.stringify(o).slice(0, 700)); }
  if (role === 'staff') { await p.screenshot({ path: 'file-paper.png' }) } await c.close(); }
await b.close(); h.stop();
