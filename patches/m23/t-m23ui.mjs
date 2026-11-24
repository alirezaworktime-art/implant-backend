// t-m23ui: the page asks before a past delivery date / a same-day impression, shows the paused-prosthesis warning on lab orders, and names «اصلاح» before the lab starts an edit. Run: WORKER=<bundle> node t-m23ui.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); const { uuid, REC } = A;
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const toDis = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date().toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id, file: String(2000 + Math.floor(Math.random() * 7000)), by: 'منشی' }); await h.call('staff', 'discharge', { id, by: 'منشی' }); return id };
const ord = (f = 'tryin') => { const o = JSON.parse(JSON.stringify(REC.prosSess[0].req.order)); o.for = f; return o };
const labsOf = id => h.sql(`select id, st, due from labs where plan='${id}' order by created`);
const day = n => new Date(Date.parse(h.today() + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const pat = await toDis('بیمار تأیید'); await h.must('surgery', 'prosMap', { id: pat, map: { LR6: 'a', UR6: 'a' }, note: '', by: 'پزشک' });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1366) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message)); p.on('dialog', x => x.dismiss());
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const ask = async p => { for (let i = 0; i < 40; i++) { const t = await p.evaluate(() => { const s = document.getElementById('uxAskSh'); return s && !s.hidden ? { title: document.getElementById('uxAskT').textContent, msg: (s.querySelector('.uxmsg') || {}).textContent || '', ok: document.getElementById('uxAskOk').textContent, no: document.getElementById('uxAskNo').textContent } : null }); if (t) return t; await W(150) } return null };
try {
  let p = await login('surgery');
  ok(await p.evaluate(() => /---------- m23 \(/.test(document.documentElement.innerHTML)), 'm23 marker in the page');
  // ---- same-day impression: «نه» keeps everything, «بله» stores
  const sess = (extra) => ({ id: pat, aid: '', work: 'impr', result: '', note: '', by: 'د. تست', ty: 'impr', imp: { meth: 'open', shade: 'A2', abut: '', ret: 'پیچی' }, lid: uuid(), due: h.today(), order: ord(), sendId: uuid(), ...extra });
  await p.evaluate(q => { window.__r = null; api('prosSess', q).then(r => { window.__r = { ok: true, r } }, e => { window.__r = { ok: false, m: e.message } }) }, sess({}));
  let d = await ask(p); ok(d && /روز جراحی/.test(d.title) && /بارگذاری فوری/.test(d.msg) && /امروز قالب گرفته شد/.test(d.ok), 'same-day impression: the page asks', d);
  await p.click('#uxAskNo'); await W(500); let r = await p.evaluate(() => window.__r); ok(r && r.ok === false && r.m === 'ثبت نشد.' && labsOf(pat).length === 0, '«نه»: nothing stored, plain message', [r, labsOf(pat)]);
  // ---- same day + past date: two questions in a row
  await p.evaluate(q => { window.__r = null; api('prosSess', q).then(r => { window.__r = { ok: true, r } }, e => { window.__r = { ok: false, m: e.message } }) }, sess({ due: day(-2) }));
  d = await ask(p); ok(d && /روز جراحی/.test(d.title), 'first question: same day', d); await p.click('#uxAskOk'); await W(700);
  d = await ask(p); ok(d && /تاریخ تحویل گذشته/.test(d.title) && /همین تاریخ ثبت شود/.test(d.ok), 'second question: past delivery date', d); await p.click('#uxAskOk'); await W(1200);
  r = await p.evaluate(() => window.__r); ok(r && r.ok === true && labsOf(pat).length === 1 && labsOf(pat)[0].due === day(-2), 'both confirmed → session and order stored with the typed date', [r, labsOf(pat)]);
  // ---- labNew with a past date; «نه» → readable message
  await p.evaluate(q => { window.__r = null; api('labNew', q).then(r => { window.__r = { ok: true, r } }, e => { window.__r = { ok: false, m: e.message } }) }, { id: pat, lid: uuid(), order: ord('deliv'), due: day(-1), sendId: uuid() });
  d = await ask(p); ok(d && /تاریخ تحویل گذشته/.test(d.title), 'labNew past date: the page asks', d); await p.click('#uxAskNo'); await W(500);
  r = await p.evaluate(() => window.__r); ok(r && r.ok === false && /تاریخ تحویل را اصلاح کنید/.test(r.m) && !/DUEPAST/.test(r.m) && labsOf(pat).length === 1, '«نه»: no order, clean message', [r, labsOf(pat).length]);
  // ---- «اصلاح» before the lab starts → toast says it is an edit
  const lid = labsOf(pat)[0].id;
  await p.evaluate(async lid => { await labSet(lid, 'redo', 'رنگ A3 شود') }, lid); await W(600);
  const t = await p.evaluate(() => document.getElementById('toast').textContent); ok(/ویرایش سفارش ثبت شد/.test(t) && /برگشتی حساب نمی‌شود/.test(t), 'toast: edit, not a return', t); ok(labsOf(pat)[0].st === 'new', 'order still «جدید»', labsOf(pat));
  // ---- paused prosthesis: badge for the clinic and the lab
  ok(await p.evaluate(() => labSpecs({ for: 'tryin' }).indexOf('m23pz') < 0), 'no badge without a pause');
  await h.must('surgery', 'prosAct', { id: pat, op: 'pause', until: day(15), note: 'سفر', by: 'د' });
  ok(p.PE.length === 0, 'doctor: no page errors', p.PE); await p.context().close();
  p = await login('lab'); await W(1500);
  const L = await p.evaluate(async lid => { try { await pollLab(true) } catch (e) { } const x = (LB.items || []).find(i => i.id === lid); const all = [...document.querySelectorAll('.m23pz')].map(e => e.textContent); return { pz: x && x.data && x.data.pz, spec: x ? labSpecs(x.data) : '', bd: x && typeof l5Badges === 'function' ? l5Badges(x) : '', dom: all } }, lid);
  ok(L.pz && L.pz.note === 'سفر' && /پروتز بیمار متوقف است/.test(L.spec) && /تماس دوباره/.test(L.spec) && /m23pz/.test(L.bd), 'lab: the order carries the warning (card + table badge)', L);
  ok(L.dom.length > 0 && /پروتز بیمار متوقف است/.test(L.dom[0]), 'lab: the warning is visible on the cartable', L.dom);
  const wide = await p.evaluate(() => { const e = document.querySelector('.m23pz'); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), vis: !!e.offsetParent, over: document.documentElement.scrollWidth > innerWidth + 2 } }); ok(wide && wide.vis && !wide.over, 'badge is visible and the page does not overflow', wide);
  await p.screenshot({ path: '/home/claude/w/m23/lab-paused.png' });
  ok(p.PE.length === 0, 'lab: no page errors', p.PE); await p.context().close();
  p = await login('lab', 390); await W(1500); await p.evaluate(async () => { try { await pollLab(true) } catch (e) { } }); await W(500);
  const mob = await p.evaluate(() => { const e = document.querySelector('.m23pz'); return { has: !!e, over: document.documentElement.scrollWidth - innerWidth } }); console.log('  mobile lab: badge', mob.has, 'overflow px', mob.over); await p.screenshot({ path: '/home/claude/w/m23/lab-paused-mobile.png' }); await p.context().close();
} catch (e) { console.log('ERR', e.stack); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); await b.close(); h.stop(); process.exit(bad ? 1 : 0);
