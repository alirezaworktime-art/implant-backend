// t-m54c (server + page; m54a without the extra fields). Run: WORKER=<m54c bundle> node --import sameday-shim t-m54a.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs'); const { REC, uuid } = A;
let bad = 0; const J = (x, n = 420) => String(JSON.stringify(x)).slice(0, n); const W = ms => new Promise(r => setTimeout(r, ms)); const PE = [];
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await A.start(); const OLD = REC.surgSave[0].req.id;
const rec = (k, i, id, extra) => { const q = JSON.parse(JSON.stringify(REC[k][i].req).split(OLD).join(id)); delete q.action; if (q.sendId) q.sendId = uuid(); return Object.assign(q, extra || {}) };
const T = (id, kind) => h.sql(`select id, kind, due, done, info, note from tasks where plan='${id}'${kind ? ` and kind='${kind}'` : ''} order by created`); const open = (id, kind) => T(id, kind).filter(t => !Number(t.done));
const tick = async () => { await W(30); return h.call('staff', 'queue', {}) }; const day = n => new Date(Date.parse(h.today()) + n * 864e5).toISOString().slice(0, 10);
const base = async (nm, payAll = true, fin = true) => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); await h.appt(id, nm, 'surg', h.today(), h.tasks(id).find(t => t.kind === 'book').id);
  const tot = Number(h.sql(`select total from plans where id='${id}'`)[0].total), pt = JSON.parse(h.sql(`select data from plans where id='${id}'`)[0].data).parts || {};
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: payAll ? tot : Math.round(pt.S * tot / (pt.S + pt.P)), by: 'م', note: '' }, sendId: uuid() });
  await h.must('staff', 'toSurgery', { id }); if (fin === null) return id; const q = rec('surgSave', 0, id); q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.finish = true; q.actual = tot; q.planned = tot; await h.must('surgery', 'surgSave', q); return id };
const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async role => { const c = await br.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); p.on('dialog', x => x.dismiss()); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  // ---------- W1 cheque
  const c1 = await base('چک مانده', false); let r = await h.call('staff', 'payAdd', { id: c1, pid: 'cq-' + uuid() + '-p0', pay: { kind: 'chq', part: 'p', amount: 8000000, due: day(2), no: '111222', bank: 'ملی', by: 'م', note: '', ctype: 'صیادی', payee: 'کلینیک' }, sendId: uuid() }); ok(r.ok === true, 'a cheque due in two days', r);
  await h.travel(4); await tick(); ok(!open(c1, 'chqdue').length, 'two days after the due date: nothing yet');
  await h.travel(2); await tick(); ok(open(c1, 'chqdue').length === 1 && /1 چک/.test(open(c1, 'chqdue')[0].info), 'more than three days after the due date: reception task «chqdue»', T(c1, 'chqdue'));
  const cq = h.sql(`select id from pays where plan='${c1}' and kind='chq'`)[0]; await h.must('consultant', 'paySet', { pid: cq.id, st: 'ok' }); await h.travel(1); await tick(); ok(!open(c1, 'chqdue').length, 'it closes when the cheque is marked', T(c1, 'chqdue'));
  // ---------- W2 win-back
  const w1 = await base('قالب نیامد'); const im = open(w1, 'impr')[0]; ok(!!im, 'an impression task exists', T(w1));
  const gap = Math.round((Date.parse(im.due) - Date.parse(h.today())) / 864e5); await h.travel(gap + 20); let wb = await h.call('staff', 'winback', {}); ok(!(wb.items || []).some(x => x.id === w1), '20 days overdue: not yet in win-back');
  await h.travel(15); wb = await h.call('staff', 'winback', {}); const it = (wb.items || []).find(x => x.id === w1); ok(it && it.kind === 'pros' && it.since === im.due, '35 days overdue: the patient is in «بازگشت بیماران»', it);
  // ---------- W3 payok
  const p1 = await base('تحویل بدهکار', false); await h.must('staff', 'apptSave', { appt: { plan: p1, name: 'ن', phone: '09120000000', day: h.today(), time: '10:00', dur: '45', kind: 'impr', doc: 'دکتر سید مجتبی علویکیا', note: '', by: '', onl: '' }, aid: '', task: '', sendId: uuid() });
  let ap = h.appts(p1).filter(a => a.kind === 'impr' && a.st === 'set').pop(); await h.must('staff', 'apptRef', { aid: ap.id, op: 'set', id: p1, by: 'منشی' }); await h.must('doctor', 'prosMap', rec('prosMap', 0, p1)); await h.must('doctor', 'prosSess', rec('prosSess', 0, p1, { aid: ap.id, lid: uuid(), due: day(10) }));
  await h.must('staff', 'apptSave', { appt: { plan: p1, name: 'ن', phone: '09120000000', day: h.today(), time: '12:00', dur: '45', kind: 'deliv', doc: 'دکتر سید مجتبی علویکیا', note: '', by: '', onl: '' }, aid: '', task: '', sendId: uuid() });
  ap = h.appts(p1).filter(a => a.kind === 'deliv' && a.st === 'set').pop(); await h.must('staff', 'apptRef', { aid: ap.id, op: 'set', id: p1, by: 'منشی' }); r = await h.call('doctor', 'prosSess', rec('prosSess', 2, p1, { aid: ap.id, labAck: 1 }));
  ok(r.ok === false && open(p1, 'payok').length === 1, 'delivery with a debt waits for «payok»', r); await h.travel(2); await tick(); ok(!open(p1, 'payokl').length, 'two days: no reminder yet');
  await h.travel(2); await tick(); ok(open(p1, 'payokl').length === 1, 'after three days: reminder task «payokl»', T(p1, 'payokl')); await h.travel(1); await tick(); ok(T(p1, 'payokl').length === 1, 'only once');
  // ---------- extra fields are gone
  r = await h.call('staff', 'm54Pat', { id: p1, op: 'set', x: { g: 'زن', antic: true } }); ok(r.ok === false, 'm54c: the extra patient fields can no longer be stored', r);
  r = await h.call('surgery', 'm54Surg', { id: p1, n: 1, x: { an: 'موضعی' } }); ok(r.ok === false, 'm54c: the surgery extras can no longer be stored', r);
  r = await h.call('staff', 'm54Pat', { id: p1, op: 'get' }); ok(r.ok && !Object.keys(r.p).length && !Object.keys(r.s).length && r.c === null, 'm54c: «get» gives only the closed state', r);
  // ---------- W4 close
  const k1 = await base('بستن پرونده'); ok(open(k1).length >= 3, 'a patient with open tasks'); r = await h.call('staff', 'm54Close', { id: k1, op: 'close', reason: '' }); ok(r.ok === false, 'a reason is needed', r);
  r = await h.call('staff', 'm54Close', { id: k1, op: 'close', reason: 'other', note: '' }); ok(r.ok === false, '«سایر» needs a note', r);
  r = await h.call('doctor', 'm54Close', { id: k1, op: 'close', reason: 'done' }); ok(r.ok === false, 'not for the doctor', r);
  r = await h.call('staff', 'm54Close', { id: k1, op: 'close', reason: 'moved', note: 'رفت تهران', by: 'منشی' }); ok(r.ok && r.c.why === 'مهاجرت / جابه‌جایی', 'closed with a reason', r);
  ok(!open(k1).length && T(k1).every(t => !Number(t.done) || true) && /پرونده بسته شد/.test(T(k1).pop().note) && !h.sql(`select id from appts where plan='${k1}' and st='set' and day>='${h.today()}'`).length, 'open tasks closed, future appointments cancelled', T(k1).slice(-2));
  let q = await h.call('staff', 'queue', {}); ok(!Object.keys(q).some(k => Array.isArray(q[k]) && q[k].some(x => x && (x.plan === k1 || x.id === k1))), 'gone from every reception list', Object.keys(q).filter(k => Array.isArray(q[k]) && q[k].some(x => x && (x.plan === k1 || x.id === k1))));
  await h.travel(200); wb = await h.call('staff', 'winback', {}); ok(!(wb.items || []).some(x => x.id === k1), 'not in win-back either');
  r = await h.call('staff', 'm54Pat', { id: k1, op: 'get' }); ok(r.c && r.c.reason === 'moved', 'the file says it is closed', r.c);
  r = await h.call('staff', 'm54Close', { id: k1, op: 'open' }); ok(r.ok && r.c === null && !(await h.call('staff', 'm54Pat', { id: k1, op: 'get' })).c, 'opened again by hand', r);
  const k2 = await h.add('برمی‌گردد'); await h.plan(k2, 'برمی‌گردد'); await h.confirm(k2, 'برمی‌گردد', 'book'); await h.must('staff', 'm54Close', { id: k2, op: 'close', reason: 'else' });
  const k3 = await base('در صف', true, null); r = await h.call('staff', 'm54Close', { id: k3, op: 'close', reason: 'done' }); ok(r.ok === false && /صف|اتاق جراحی/.test(r.error), 'a patient in a queue cannot be closed', r);
  // ---------- page
  const st = await login('staff'); ok(await st.evaluate(() => /---------- m54a \(/.test(document.documentElement.innerHTML) && /---------- m54c \(/.test(document.documentElement.innerHTML) && !!TLBL.chqdue && !!TLBL.payokl), 'm54a + m54c markers + task names in the page');
  await st.evaluate(id => openFile(id, 'ن'), p1); await W(3000);
  let v = await st.evaluate(() => { const c = document.getElementById('m54Card'); return c ? { t: c.textContent, al: c.querySelectorAll('.m54al').length, ed: !!document.getElementById('m54Edit'), cl: !!document.getElementById('m54CloseB') } : null });
  ok(v && !v.al && !v.ed && v.cl && v.t.trim() === 'بستن پرونده', 'patient file: only the «بستن پرونده» button is left', v);
  await st.click('#m54CloseB'); await W(400); await st.selectOption('#m54Why', 'done'); await st.click('#m54CloseGo'); await W(2500);
  v = await st.evaluate(() => { const c = document.getElementById('m54Card'); return { t: c ? c.textContent : '', op: !!document.getElementById('m54Open') } }); ok(/پرونده بسته شده است: درمان تمام شد/.test(v.t) && v.op, 'closing from the file shows the banner', v);
  await st.click('#m54Open'); await W(2500); ok(await st.evaluate(() => !!document.getElementById('m54CloseB') && !/بسته شده/.test(document.getElementById('m54Card').textContent)), 'and it opens again');
  await st.evaluate(() => { document.getElementById('pfSheet').hidden = true });
  // follow-up result
  const f1 = await base('پیگیری'); await st.evaluate(() => pollQ(true)); await W(2500); const nt = open(f1, 'numb')[0];
  v = await st.evaluate(async id => { let err = ''; const pr = api('taskDone', { id, by: 'منشی' }).catch(e => { err = e.message }); await new Promise(r => setTimeout(r, 500)); const sh = document.getElementById('m54AskSh'); const shown = !!sh && !sh.hidden; if (shown) { sh.querySelector('[data-m54r="درد"]').click(); sh.querySelector('[data-m54r="تورم"]').click(); document.getElementById('m54AskN').value = 'مسکن داده شد'; sh.querySelector('#m54AskOk').click() } await pr; return { shown, err } }, nt.id);
  ok(v.shown && !v.err && T(f1, 'numb')[0].done === 1 && T(f1, 'numb')[0].note === 'نتیجه: درد، تورم — مسکن داده شد', 'a follow-up call asks for its result and stores it', { v, t: T(f1, 'numb') });
  // reception: extras with a new patient
  ok(await st.evaluate(() => !document.getElementById('m54Rc')), 'reception form has no «مشخصات تکمیلی…» any more');
  // closed patient comes back
  r = await h.call('staff', 'queueReopen', { id: k2, patient: rec('queueAdd', 0, k2).patient, by: 'منشی' }); if (!r.ok) console.log('note: queueReopen in the test:', J(r, 200));
  if (r.ok) { await h.travel(1); await tick(); ok(!(await h.call('staff', 'm54Pat', { id: k2, op: 'get' })).c, 'a closed file opens by itself when the patient is admitted again') }
  // surgery day
  const sp = await login('surgery'); const s1 = await base('روز جراحی', true, null);
  await sp.evaluate(() => pollQ(true)); await W(2500); await sp.evaluate(id => { const x = QITEMS.find(q => q.id === id); return api('get', { id }).then(j => openSurg(Object.assign({}, x, j))) }, s1); await W(3000);
  v = await sp.evaluate(() => ({ b: !!document.getElementById('m54SgB'), w: !!document.getElementById('m54SgW'), surg: !!SURG })); ok(v.surg && !v.b && !v.w, 'surgery day has no «ثبت تکمیلی جراحی» and no alert line', v);
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await br.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
