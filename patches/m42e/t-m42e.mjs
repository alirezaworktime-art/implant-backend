// t-m42e (server): surgery session time — a wrong tablet clock is replaced by the server time. Run: WORKER=<m42e bundle> node t-m42e.mjs
import { start, uuid, REC } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 300) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start(); const OLD = REC.queueAdd[0].req.id;
const mk = async name => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }); return id };
const save = async (id, name, at) => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id).split('رضا آزمایشی').join(name)); delete q.action; q.session.at = at; q.sendId = uuid(); q.finish = true; const r = await h.call('surgery', 'surgSave', q); const s = JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg).sessions[0]; return { r, s } };
const near = t => Math.abs(Date.parse(t) - Date.now()) < 120000;
try {
  let id = await mk('ساعت آینده'), x = await save(id, 'ساعت آینده', '2027-03-01T10:00:00.000Z');
  ok(x.r.ok && near(x.s.at) && x.s.clk === '2027-03-01T10:00:00.000Z' && /^[۰-۹]{4}\/[۰-۹]{2}\/[۰-۹]{2}$/.test(x.s.jalali), 'tablet clock in 2027 → session dated by the server, tablet value kept in «clk»', x.s && { at: x.s.at, clk: x.s.clk, j: x.s.jalali });
  const inv = h.sql(`select day from fin_inv where plan='${id}' and st='ok'`); ok(!inv.length || inv.every(v => v.day === h.today()), 'the automatic invoice of the day is on today, not on the tablet date', inv);
  const fl = h.sql(`select distinct l.day from fin_line l join fin_doc d on d.id=l.doc where d.ref like '%${id}%' or l.party like '%${id.slice(0, 8)}%'`); ok(!fl.some(v => String(v.day).startsWith('2027')), 'no accounting line on the tablet date', fl);
  id = await mk('ساعت درست'); const now = new Date().toISOString(); x = await save(id, 'ساعت درست', now); ok(x.r.ok && x.s.at === now && !x.s.clk, 'a correct time is left alone', x.s && x.s.at);
  id = await mk('سه روز پیش'); const d3 = new Date(Date.now() - 3 * 864e5).toISOString(); x = await save(id, 'سه روز پیش', d3); ok(x.r.ok && x.s.at === d3 && !x.s.clk, 'three days old (tablet offline queue) keeps its own time', x.s && x.s.at);
  id = await mk('خیلی قدیمی'); x = await save(id, 'خیلی قدیمی', '2020-01-01T00:00:00.000Z'); ok(x.r.ok && near(x.s.at) && x.s.clk, 'years in the past → server time', x.s && x.s.at);
  id = await mk('بی‌تاریخ'); x = await save(id, 'بی‌تاریخ', 'چرت'); ok(x.r.ok && near(x.s.at), 'unreadable time → server time', x.s && x.s.at);
  id = await mk('پنج دقیقه جلو'); const f5 = new Date(Date.now() + 5 * 60000).toISOString(); x = await save(id, 'پنج دقیقه جلو', f5); ok(x.r.ok && x.s.at === f5, 'five minutes ahead is tolerated', x.s && x.s.at);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 500)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
