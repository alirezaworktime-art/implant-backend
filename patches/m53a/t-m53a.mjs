// t-m53a (server + page labels). Run: WORKER=<m53a bundle> node --import sameday-shim t-m53a.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { REC, uuid } = A;
let bad = 0; const J = (x, n = 400) => String(JSON.stringify(x)).slice(0, n); const W = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await A.start(); const OLD = REC.surgSave[0].req.id;
const body = (id, finish) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = !!finish; if (!finish) { q.session.last = 0; q.last = 0 } return q };
const rec = (k, i, id, extra) => { const q = JSON.parse(JSON.stringify(REC[k][i].req).split(OLD).join(id)); delete q.action; if (q.sendId) q.sendId = uuid(); return Object.assign(q, extra || {}) };
const T = (id, kind) => h.sql(`select id, kind, due, done, info, note from tasks where plan='${id}'${kind ? ` and kind='${kind}'` : ''} order by created`);
const open = (id, kind) => T(id, kind).filter(t => !Number(t.done));
const tick = async () => { await h.travel(0); await W(50); return h.call('staff', 'queue', {}) };
const mk = async nm => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); await h.appt(id, nm, 'surg', h.today(), h.tasks(id).find(t => t.kind === 'book').id);
  const tot = Number(h.sql(`select total from plans where id='${id}'`)[0].total); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: tot, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
try {
  // ---------- (1) (2)
  const s1 = await h.add('فقط پذیرش'), s2 = await h.add('باز شده'); await h.call('doctor', 'queueOpen', { id: s2 });
  const s3 = await h.add('نزد مشاور'); await h.plan(s3, 'نزد مشاور'); const s6 = await mk('در اتاق جراحی');
  await tick(); ok(!open(s1, 'stuckq').length && !open(s3, 'stuckq').length && !open(s6, 'stucks').length, 'the same day nothing is made');
  await h.travel(1); await tick();
  ok(open(s1, 'stuckq').length === 1 && /منتظر پزشک/.test(open(s1, 'stuckq')[0].info) && open(s2, 'stuckq').length === 1 && /نفرستاده/.test(open(s2, 'stuckq')[0].info) && open(s3, 'stuckq').length === 1 && /مشاور/.test(open(s3, 'stuckq')[0].info), 'next day: a reception task for each patient left in a queue', [open(s1), open(s2), open(s3)]);
  ok(open(s6, 'stucks').length === 1 && /ثبت نشده/.test(open(s6, 'stucks')[0].info), 'and for the patient left in the surgery room', open(s6));
  const q = await h.call('staff', 'queue', {}); ok((q.tasks || []).some(t => t.plan === s1 && t.kind === 'stuckq') && (q.tasks || []).some(t => t.plan === s6 && t.kind === 'stucks'), 'reception sees them in its tasks');
  await h.travel(1); await tick(); ok(T(s1, 'stuckq').length === 1 && T(s6, 'stucks').length === 1, 'not repeated the day after');
  await h.must('staff', 'taskDone', { id: open(s1, 'stuckq')[0].id, note: 'تماس گرفته شد', by: 'منشی' }); await h.travel(1); await tick(); ok(T(s1, 'stuckq').length === 1, 'a task closed by reception does not come back within a week');
  await h.travel(7); await tick(); ok(T(s1, 'stuckq').length === 2 && open(s1, 'stuckq').length === 1, 'after a week still in the queue: asked again');
  await h.plan(s2, 'باز شده'); await h.confirm(s2, 'باز شده', 'book'); await h.must('surgery', 'surgSave', body(s6, true)); await h.travel(1); await tick();
  ok(!open(s2, 'stuckq').length && T(s2, 'stuckq')[0].note === 'خودکار: بیمار از این مرحله گذشت' && !open(s6, 'stucks').length, 'the task closes by itself when the patient moves on', [T(s2, 'stuckq'), T(s6, 'stucks')]);
  // ---------- (3)
  const p1 = await mk('جراحی دو جلسه'); let r = await h.call('surgery', 'surgSave', body(p1, false)); ok(r.ok && r.finished === false, 'a session that is not the last one', r);
  let kv = h.sql(`select v from kv where k='m53impr:${p1}'`)[0]; ok(!open(p1, 'impr').length && !!kv && !h.sql(`select id from appts where plan='${p1}' and kind='impr' and st='set'`).length, 'no impression task / appointment while the surgery is unfinished', { t: open(p1), kv });
  const held = JSON.parse(kv.v); ok(open(p1, 'book').length === 1 && held.due > h.today() && held.info.length > 0, 'the «ادامه‌ی جراحی» task is there and the impression is remembered', held);
  await h.must('staff', 'toSurgery', { id: p1 }).catch(async () => { await h.must('staff', 'q9Allow', { id: p1, reason: 'جلسه‌ی دوم در آزمون' }); await h.must('staff', 'toSurgery', { id: p1 }) });
  await h.travel(10); r = await h.call('surgery', 'surgSave', body(p1, true)); ok(r.ok && r.finished === true, 'the last session', r);
  let im = open(p1, 'impr'); const ap = h.sql(`select day, st from appts where plan='${p1}' and kind='impr' and st='set'`);
  ok(im.length === 1 && im[0].due >= held.due && held.info.split(',').every(t => im[0].info.split(',').includes(t)) && ap.length === 1 && ap[0].day === im[0].due && !h.sql(`select v from kv where k='m53impr:${p1}'`).length, 'now one impression task + appointment, with the teeth of both sessions and the later date', { im, ap, held });
  const p2 = await mk('جراحی ادامه نداد'); await h.must('surgery', 'surgSave', body(p2, false)); ok(!open(p2, 'impr').length, 'held again for another patient');
  r = await h.call('staff', 'surgStop', { id: p2, by: 'منشی', note: 'بیمار ادامه نمی‌دهد' }); im = open(p2, 'impr'); ok(r.ok === true && im.length === 1, 'when the surgery is stopped the impression task comes back', { r, im });
  // ---------- (4) (5)
  const p3 = await mk('قالب قبل از ترخیص'); await h.must('surgery', 'surgSave', body(p3, true));
  ok(open(p3, 'numb').length + open(p3, 'week').length + open(p3, 'suture').length === 3, 'post-op follow-ups are open');
  await h.must('staff', 'apptSave', { appt: { plan: p3, name: 'ن', phone: '09131234567', day: h.today(), time: '10:00', dur: '45', kind: 'impr', doc: 'دکتر سید مجتبی علویکیا', note: '', by: '', onl: '' }, aid: '', task: '', sendId: uuid() });
  const a3 = h.appts(p3).filter(a => a.kind === 'impr' && a.st === 'set').pop(); await h.must('staff', 'apptRef', { aid: a3.id, op: 'set', id: p3, by: 'منشی' }); await h.must('doctor', 'prosMap', rec('prosMap', 0, p3));
  r = await h.call('doctor', 'prosSess', rec('prosSess', 0, p3, { aid: a3.id, lid: uuid(), due: new Date(Date.parse(h.today()) + 10 * 864e5).toISOString().slice(0, 10) })); ok(r.ok === true, 'impression recorded before discharge', r);
  const st3 = h.sql(`select settle, json_extract(surg,'$.dis') dis from plans where id='${p3}'`)[0];
  ok(open(p3, 'nodis').length === 1 && /ترخیص|تسویه/.test(open(p3, 'nodis')[0].info), 'reception gets «ترخیص یا تسویه مانده»', { t: open(p3, 'nodis'), st3 });
  ok(!open(p3, 'numb').length && !open(p3, 'week').length && !open(p3, 'suture').length && T(p3, 'suture')[0].note === 'خودکار: بیمار به مرحله‌ی پروتز رسید' && !h.sql(`select id from appts where plan='${p3}' and kind='suture' and st='set'`).length, 'the post-op follow-ups are closed (and the automatic suture appointment)', T(p3));
  const p4 = await mk('پیگیری قدیمی'); await h.must('surgery', 'surgSave', body(p4, true)); await h.travel(25); await tick(); ok(open(p4, 'numb').length === 1 && open(p4, 'suture').length === 1, '25 days later the follow-ups are still open');
  await h.travel(13); await tick(); ok(!open(p4, 'numb').length && !open(p4, 'week').length && open(p4, 'suture').length === 1 && T(p4, 'numb')[0].note === 'خودکار: سررسید خیلی گذشته بود', '30 days overdue: «numb» and «week» close, «suture» not yet', T(p4));
  await h.travel(45); await tick(); ok(!open(p4, 'suture').length && !h.sql(`select id from appts where plan='${p4}' and kind='suture' and st='set'`).length && open(p4, 'impr').length === 1, '60 days overdue: «suture» closes too; the impression task stays', T(p4));
  // ---------- page labels
  const br = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const c = await br.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, x => x.abort()); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(e.message.slice(0, 200)));
  await p.goto(h.url); await p.click('[data-lrole="staff"]'); await p.fill('#lg_pw', A.PW.staff); await p.click('#lgGo'); await W(3500);
  const v = await p.evaluate(() => ({ mark: /---------- m53a \(/.test(document.documentElement.innerHTML), l: [TLBL.stuckq && TLBL.stuckq[0], TLBL.stucks && TLBL.stucks[0], TLBL.nodis && TLBL.nodis[0]], g: [TGRP.stuckq, TGRP.stucks, TGRP.nodis], n: TASKS.filter(t => ['stuckq', 'stucks', 'nodis'].includes(t.kind) && !t.done).length, txt: document.body.innerText.includes('بیمار از روزهای قبل در صف مانده') }));
  ok(v.mark && v.l.every(Boolean) && v.g.every(Boolean) && v.n >= 2, 'the page knows the three new tasks', v); ok(!PE.length, 'no page errors', PE); await br.close();
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
