// t-m22ui: Root as the fifth group in the plan form; hand-over sheet; re-delivery / re-heal choices. Run: WORKER=<bundle> node t-m22ui.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); const { uuid, REC } = A;
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const toDis = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date().toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id, file: String(2000 + Math.floor(Math.random() * 7000)), by: 'منشی' }); await h.call('staff', 'discharge', { id, by: 'منشی' }); return id };
const wait = await h.add('روت در طرح'); await h.plan(wait, 'روت در طرح'); const pat = await toDis('واگذاری پروتز');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1366) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message)); p.on('dialog', x => x.dismiss());
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  // ---- doctor: plan form
  let p = await login('consultant');
  ok(await p.evaluate(() => BRANDS.length === 5 && BRANDS[4].k === 'rt' && BRANDS[4].n === 'Root'), 'five brand groups, the fifth is Root');
  const T = await p.evaluate(() => { const S = blankSections(); S.imp.sel.UR6 = true; S.imp.sel.UR5 = true; const t = totals({ s: S, brand: 'rt', pay: {} }); return { rt: t.surg.rt, ko: t.surg.ko, it: t.surg.it, bp: S.imp.bp } });
  ok(T.rt === 42000000 && T.ko === 2 * Number(String(T.bp.ko).replace(/\D/g, '')), 'two implants: Root = 2 × 21,000,000; Korean unchanged', T);
  await p.evaluate(id => { const x = [...document.querySelectorAll('.qitem')].find(v => (v.dataset.qid || v.dataset.id || v.getAttribute('data-q') || '') === id) || document.querySelector('.qitem'); if (x) x.click() }, wait); await W(2500);
  await p.evaluate(() => { AS().imp.sel.UR6 = true; recalc() }); await W(400);
  const form = await p.evaluate(() => { const bt = document.getElementById('brandTotals'); return { open: !document.getElementById('viewForm').hidden, n: bt ? bt.querySelectorAll('[data-brand]').length : -1, rt: bt ? !!bt.querySelector('[data-brand="rt"]') : false, inp: !!document.getElementById('bp_imp_rt'), val: (document.getElementById('bp_imp_rt') || {}).value } });
  ok(form.open && form.n >= 5 && form.rt && form.inp && /21,000,000/.test(String(form.val)), 'plan form: Root total button and Root tariff box (21,000,000)', form);
  await p.evaluate(() => { const el = document.getElementById('brandTotals'); if (el) el.scrollIntoView({ block: 'center' }) }); await W(300); await p.screenshot({ path: '/home/claude/w/oc/m22-totals.png' });
  const ov = await p.evaluate(() => { const bt = document.getElementById('brandTotals'); if (!bt) return null; const r = bt.getBoundingClientRect(); return { w: Math.round(r.width), sw: bt.scrollWidth, vw: innerWidth, right: Math.round(r.right), left: Math.round(r.left) } });
  ok(ov && ov.sw <= ov.w + 2 && ov.left >= 0 && ov.right <= ov.vw + 1, 'five totals fit the row (no overflow)', ov);
  ok(await p.evaluate(() => { const r = { s: AS(), brand: 'rt', pay: (F && F.pay) || {} }; const tb = totalsBlock(Object.assign({}, F, { brand: 'rt' })); return tb && tb.h > 44 * 6 }), 'PDF totals block has a row for every brand incl. Root');
  ok(p.PE.length === 0, 'consultant: no page errors', p.PE); await p.context().close();
  // ---- phone width
  p = await login('consultant', 390); await p.evaluate(() => { const x = document.querySelector('.qitem'); if (x) x.click() }); await W(2500); await p.evaluate(() => { AS().imp.sel.UR6 = true; recalc() }); await W(400);
  const ph = await p.evaluate(() => { const bt = document.getElementById('brandTotals'); if (!bt) return null; return { sw: bt.scrollWidth, w: Math.round(bt.getBoundingClientRect().width), doc: document.documentElement.scrollWidth, vw: innerWidth } });
  ok(ph && ph.sw <= ph.w + 2 && ph.doc <= ph.vw + 2, 'phone: totals wrap, page does not scroll sideways', ph); await p.context().close();
  // ---- prosthesis doctor: hand-over + re-delivery choice
  p = await login('surgery');
  await p.evaluate(([id, n]) => openFile(id, n, 'pros'), [pat, 'واگذاری پروتز']); await W(2500);
  ok(await p.evaluate(() => { const d = document.querySelector('#pfBody .m22doc'); return !!d && /پزشک پروتز/.test(d.textContent) && !!d.querySelector('[data-m22doc]') }), 'prosthesis file shows «پزشک پروتز» and the hand-over button', await p.evaluate(() => (document.getElementById('pfBody') || {}).textContent.slice(0, 200)));
  await p.evaluate(() => document.querySelector('[data-m22doc]').click()); await W(400);
  await p.evaluate(() => document.getElementById('m22DocGo').click()); await W(300);
  ok(await p.evaluate(() => /پزشک تازه/.test(document.getElementById('m22DocMsg').textContent)), 'empty form: message, nothing sent');
  await p.selectOption('#m22DocSel', '__o'); await p.fill('#m22DocO', 'دکتر تازه آزمایشی'); await p.fill('#m22DocWhy', 'مرخصی پزشک'); await p.evaluate(() => document.getElementById('m22DocGo').click()); await W(2000);
  const pr = JSON.parse(h.sql(`select pros from plans where id='${pat}'`)[0].pros);
  ok(pr.pdoc && pr.pdoc.name === 'دکتر تازه آزمایشی' && pr.pdoc.note === 'مرخصی پزشک', 'hand-over saved', pr.pdoc);
  ok(await p.evaluate(() => document.getElementById('m22DocSh').hidden && /دکتر تازه آزمایشی/.test((document.querySelector('#pfBody .m22doc') || {}).textContent || '')), 'sheet closed; the file shows the new doctor', await p.evaluate(() => (document.querySelector('#pfBody .m22doc') || {}).textContent));
  const blk = await p.evaluate(() => { const keep = L5; L5 = { work: 'deliv2', pt: { UR6: 'a' }, redo: true, cem: '', amt: '', pk4: 1 }; let h = ''; try { h = pk4Block() } finally { L5 = keep } return { chip: L5W.deliv2, redo: /مجدد بوده/.test(h), dis: /id="pk4_amt"[^>]*disabled/.test(h), note: /بار دوم/.test(h), teeth: /data-pk4t/.test(h) } });
  ok(blk.chip === 'تحویل مجدد روکش نهایی' && !blk.redo && !blk.dis && blk.note && blk.teeth, 'session choice «تحویل مجدد روکش نهایی»: teeth + optional amount, no «مجدد؟» question', blk);
  ok(p.PE.length === 0, 'prosthesis doctor: no page errors', p.PE); await p.context().close();
  // ---- reception: paper file choices
  p = await login('staff');
  const arc = await p.evaluate(() => { const i = A6CAT.findIndex(x => x.k === 'heal'), j = A6CAT.findIndex(x => x.k === 'heal2'), d = A13_TY.findIndex(x => x[0] === 'deliv'), d2 = A13_TY.findIndex(x => x[0] === 'deliv2'); return { heal2: j === i + 1 && A6C.heal2.t, side: A6CAT[j].s === A6CAT[i].s, d2: d2 === d + 1 && A13_TN.deliv2, grp: GRP.Root + GRP['روت'], arcG: arcG('Root') + arcG('روت') + arcG('JD') + arcG('Dentium') } });
  ok(arc.heal2 === 'بستن هیلینگ مجدد' && arc.side && arc.d2 === 'تحویل مجدد روکش نهایی' && arc.grp === 'rtrt' && arc.arcG === 'rtrtitko', 'paper file: «بستن هیلینگ مجدد» after «بستن هیلینگ», «تحویل مجدد روکش نهایی» after «تحویل روکش»; Root recognised', arc);
  await p.evaluate(() => fxArcOpen(null)); await W(2000);
  const a6 = await p.evaluate(() => { if (typeof A6 === 'undefined' || !A6) return { open: false }; A6.op.add('heal2'); const l1 = a6NewLine('heal2'); A6.op.add('pros'); const l2 = a6NewLine('pros'); l2.ty = 'deliv2'; l2.redo = true; a6Render(); const R = document.getElementById('a6Root'), q = id => R.querySelector(`[data-a6f="price"][data-l="${id}"]`); return { open: true, btn: !!R.querySelector('[data-a6k="heal2"]'), p1: q(l1.id) ? !q(l1.id).disabled : null, p2: q(l2.id) ? !q(l2.id).disabled : null, redoQ: /مجدد بوده/.test(R.querySelector(`.a6l[data-l="${l2.id}"]`).innerHTML), redo: l2.redo, lab: a6Lab(l2) } });
  ok(a6.open && a6.btn && a6.p1 === true && a6.p2 === true && !a6.redoQ && a6.redo === false && /تحویل مجدد روکش نهایی/.test(a6.lab), 'paper file form: both new lines have an editable amount', a6);
  await p.screenshot({ path: '/home/claude/w/oc/m22-arc.png' });
  ok(p.PE.length === 0, 'reception: no page errors', p.PE); await p.context().close();
} catch (e) { console.log('ERR', e.stack); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); await b.close(); h.stop(); process.exit(bad ? 1 : 0);
