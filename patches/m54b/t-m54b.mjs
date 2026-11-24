// t-m54b (server + page). Run: WORKER=<m54b bundle> node --import sameday-shim t-m54b.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); const { REC, uuid } = A;
let bad = 0; const J = (x, n = 420) => String(JSON.stringify(x)).slice(0, n); const W = ms => new Promise(r => setTimeout(r, ms)); const PE = [];
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await A.start(); const OLD = REC.surgSave[0].req.id;
const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async role => { const c = await br.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); p.on('dialog', x => x.dismiss()); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  const nm = 'نمونه اختلاف', id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); await h.appt(id, nm, 'surg', h.today(), h.tasks(id).find(t => t.kind === 'book').id);
  const tot = Number(h.sql(`select total from plans where id='${id}'`)[0].total); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: tot, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id)); delete q.action; q.session.at = new Date().toISOString(); q.sendId = uuid(); q.finish = true; q.planned = tot; q.actual = tot + 3000000;
  let r = await h.call('surgery', 'surgSave', q); ok(r.ok && r.settle === 'pending', 'a surgery 3,000,000 above the plan waits for settlement', r);
  const qs = await h.call('staff', 'queue', {}), qc = await h.call('consultant', 'queue', {});
  ok((qs.settle || []).some(x => x.id === id) && (qs.items || []).some(x => x.id === id), 'reception has the patient in «تسویه‌ی اختلاف جراحی»', { n: (qs.settle || []).length });
  ok(!(qc.items || []).some(x => x.id === id), 'the consultant\'s cartable no longer carries the patient', (qc.items || []).filter(x => x.id === id));
  const w = await h.add('منتظر مشاور'); await h.plan(w, 'منتظر مشاور'); const qc2 = await h.call('consultant', 'queue', {}); ok((qc2.items || []).some(x => x.id === w), 'patients waiting for a consultation are still there');
  const cp = await login('consultant'); let v = await cp.evaluate(id => ({ mark: /---------- m54b \(/.test(document.documentElement.innerHTML), inQ: QITEMS.some(x => x.id === id), kpi: document.body.innerText.includes('تسویه اختلاف') }), id);
  ok(v.mark && !v.inQ && !v.kpi, 'consultant page: not in the queue, no «تسویه اختلاف» counter', v);
  await cp.evaluate(() => { show('list'); return loadList() }); await W(2500); ok(await cp.evaluate(id => !!document.querySelector(`#viewList [data-settle="${id}"]`), id), 'the consultant can still open the settlement from the archive');
  const sp = await login('staff'); await W(800); v = await sp.evaluate(id => ({ setl: !!document.querySelector(`#setlList [data-settle="${id}"]`), n: QSET.length }), id); ok(v.setl && v.n === 1, 'reception page lists the patient with «تعیین تکلیف»', v);
  r = await h.call('staff', 'settleDone', { id, by: 'منشی', pays: [{ kind: 'cash', amount: 3000000, part: 's', by: 'منشی', note: '', pos: '', acct: '' }] }); ok(r.ok === true && h.sql(`select settle from plans where id='${id}'`)[0].settle === 'done', 'reception settles it', r);
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await br.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
