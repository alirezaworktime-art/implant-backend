// m38 browser test: offline surgery session is queued on the device and sent when the connection is back; lost answer is not recorded twice; server refusal is shown; stuck-patient notice.
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid, REC } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms));
let bad = 0; const ok = (c, t) => { console.log((c ? 'ok   ' : 'FAIL ') + t); if (!c) bad++; };
const OLD = REC.queueAdd[0].req.id;
const ready = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const ses = id => JSON.parse(JSON.stringify(REC.surgSave[0].req.session).split(OLD).join(id));
const nses = id => h.sql(`select coalesce(json_array_length(surg,'$.sessions'),0) n from plans where id='${id}'`)[0].n;
await h.travel(-2); const P4 = await ready('جامانده'); await h.travel(2);
const P1 = await ready('آفلاین یک'), P2 = await ready('پاسخ گم‌شده'), P3 = await ready('رد سرور');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (c, role) => { const p = await c.newPage(); p.on('pageerror', e => { console.log('PAGEERR', e.message.slice(0, 200)); bad++; }); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const commit = (p, name, s, fin) => p.evaluate(async ({ name, s, fin }) => { goTile('surg'); openSurg(QITEMS.find(q => q.name === name)); await new Promise(r => setTimeout(r, 600)); SGP = { ses: s, fin, all: SURG.prev.concat([s]) }; const t = document.createElement('button'); await surgCommit(t); return { q: m38.q().length, view: !document.getElementById('viewSurg').hidden, bar: (document.getElementById('m38Bar') || {}).innerText || '', sr: document.getElementById('srMsg').textContent } }, { name, s, fin });
try {
const c = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await login(c, 'surgery');
// 1) offline
await c.setOffline(true); let r = await commit(p, 'آفلاین یک', ses(P1), true);
ok(r.q === 1, 'offline: the session is kept on the device'); ok(!r.view, 'offline: the surgery sheet closes'); ok(/آفلاین یک/.test(r.bar) && /منتظر اینترنت/.test(r.bar), 'offline: the notice names the patient'); ok(nses(P1) === 0, 'offline: nothing on the server yet');
const blocked = await p.evaluate(() => { openSurg(QITEMS.find(q => q.name === 'آفلاین یک')); return document.getElementById('viewSurg').hidden }); ok(blocked, 'offline: a second sheet for the same patient does not open'); await p.evaluate(() => document.querySelectorAll('.sheet').forEach(s => s.hidden = true));
await p.click('[data-m38="det"]'); await W(300); const det = await p.evaluate(() => (document.getElementById('m38DetT') || {}).textContent || ''); ok(/آفلاین یک/.test(det) && /ایمپلنت‌ها/.test(det) && /IZEN/.test(det), 'offline: «جزئیات» lists the session'); await p.click('#m38DetX');
await p.reload().catch(() => { }); // the page itself cannot load offline; the queue must survive in storage
await c.setOffline(false); await p.goto(h.url); await W(1500); const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('implantSgQ') || '[]').length); ok(kept === 1, 'the queue survives closing the page');
await W(9000); ok(nses(P1) === 1, 'online again: the session is recorded by itself'); const after = await p.evaluate(() => ({ q: m38.q().length, bar: !/منتظر اینترنت|ثبت نشد:/.test(document.getElementById('m38Bar').innerText) })); ok(after.q === 0 && after.bar, 'online again: queue and notice are empty');
ok(h.sql(`select queue from plans where id='${P1}'`)[0].queue === 'surgdone', 'online again: the surgery is closed as recorded');
// 2) answer lost on the way back
let n = 0; await c.route('**/*', async route => { const rq = route.request(); if (rq.method() === 'POST' && /"surgSave"/.test(rq.postData() || '') && n++ < 3) { await route.fetch().catch(() => { }); return route.abort(); } return route.continue(); });
r = await commit(p, 'پاسخ گم‌شده', ses(P2), false); ok(r.q === 1 && nses(P2) === 1, 'lost answer: recorded on the server, still queued on the device'); await c.unroute('**/*');
await p.evaluate(() => m38.run(true)); await W(2500); ok(nses(P2) === 1 && (await p.evaluate(() => m38.q().length)) === 0, 'lost answer: sent again, recorded once');
// 3) server refuses (someone took the patient back meanwhile)
await c.setOffline(true); r = await commit(p, 'رد سرور', ses(P3), true); ok(r.q === 1, 'refusal: queued'); await p.screenshot({ path: 'offline-desktop.png' }); await p.setViewportSize({ width: 390, height: 800 }); await p.screenshot({ path: 'offline-phone.png' }); await p.setViewportSize({ width: 1280, height: 900 }); await h.must('staff', 'fx5SurgCancel', { id: P3, reason: 'تست برگشت', sendId: uuid() });
await c.setOffline(false); await p.evaluate(() => m38.run(true)); await W(2500); const e3 = await p.evaluate(() => ({ err: m38.q()[0] && m38.q()[0].err, bar: document.getElementById('m38Bar').innerText })); ok(/کارتابل جراحی نیست/.test(e3.err || '') && /ثبت نشد/.test(e3.bar), 'refusal: the server message is shown, the session is kept'); await p.screenshot({ path: 'refused.png' });
await p.click('[data-m38="del"]'); await W(400); const dlg = await p.evaluate(() => [...document.querySelectorAll('.sheet')].filter(s => !s.hidden).map(s => s.innerText.slice(0, 60)).join('|')); ok(/حذف جلسه/.test(dlg) || /پاک/.test(dlg), 'refusal: «حذف» asks first (' + dlg.slice(0, 40) + ')');
await p.evaluate(() => { const s = [...document.querySelectorAll('.sheet')].find(s => !s.hidden); const bt = [...s.querySelectorAll('button')].find(x => /پاک شود/.test(x.textContent)); bt.click() }); await W(400); ok((await p.evaluate(() => m38.q().length)) === 0, 'refusal: deleted after confirmation');
} catch (e) { console.log('ERR', e.message.slice(0, 300)); bad++; }
// 4) patient left in the surgery cartable (referred two days ago)
try {
for (const role of ['staff', 'surgery']) { const c2 = await b.newContext({ viewport: { width: role === 'staff' ? 1280 : 390, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c2.route(/googleapis|gstatic/, r => r.abort()); const p2 = await login(c2, role); await p2.evaluate(() => m38.bar()); await W(300);
  const t = await p2.evaluate(() => { const el = document.getElementById('m38Bar'); return { txt: el.innerText, btn: !!el.querySelector('[data-fx5sc]'), wide: document.documentElement.scrollWidth > innerWidth + 1 } }); ok(/جامانده/.test(t.txt) && /کارتابل جراحی مانده/.test(t.txt) && t.btn, role + ': notice for the patient left in surgery'); ok(!/آفلاین یک/.test(t.txt), role + ': patients referred today are not listed'); ok(!t.wide, role + ': no sideways scroll');
  if (role === 'staff') { await p2.click('#m38Bar [data-fx5sc]'); await W(400); ok(await p2.evaluate(() => { const s = document.getElementById('fx5ScSheet'); return !!s && !s.hidden }), 'staff: the button opens «امروز جراحی نشد»'); await p2.evaluate(() => { document.getElementById('fx5ScSheet').hidden = true }); await p2.click('[data-m38="later"]'); await W(200); ok(await p2.evaluate(() => document.getElementById('m38Bar').hidden), 'staff: «بعداً» hides the notice'); }
  await c2.close(); }
} catch (e) { console.log('ERR', e.message.slice(0, 300)); bad++; }
await b.close(); const errs = h.log().split('\n').filter(l => /TypeError|SQLITE|m38/i.test(l)); ok(!errs.length, 'no server errors ' + errs.slice(0, 2).join('|'));
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
