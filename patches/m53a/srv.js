/* ---------- m53a (owner, 2026-11-18): gaps of the patient flow (audit 2026-11-18-flow-gaps-m52a):
   (1) a patient still «منتظر پزشک / نزد پزشک / منتظر مشاور» from an earlier day → reception task «stuckq» (once a week while it lasts);
   (2) a patient sent to the surgery room on an earlier day with no session recorded → reception task «stucks»;
   (3) a surgery session that is not the last one: the impression task / appointment is held (kv m53impr:<id>) and comes back, with all the
       teeth, when the surgery is finished or stopped;
   (4) prosthesis work recorded while the surgery is not settled or not discharged (last 60 days) → reception task «nodis»;
   (5) open «numb / week / suture» follow-ups are closed when prosthesis work starts, or when they are 30 (suture: 60) days overdue.
   Tasks (1), (2), (4) close by themselves when the patient has moved on. The tick runs with reception's queue, at most once a minute. ---------- */
const M53_MOVED = 'خودکار: بیمار از این مرحله گذشت', M53_PROS = 'خودکار: بیمار به مرحله‌ی پروتز رسید', M53_OLD = 'خودکار: سررسید خیلی گذشته بود';
const M53_WHY = { waiting: 'منتظر پزشک مانده', reviewing: 'پزشک پرونده را باز کرده ولی طرح را نفرستاده', consult: 'منتظر مشاور مانده', consulting: 'نزد مشاور مانده؛ ثبت نهایی یا «تصمیم نگرفت» نخورده', surgery: 'جلسه‌ی جراحی ثبت نشده' };
let M53_T = 0;
async function m53Tick(db) {
  const td = tehranDay(), cut = new Date(td + 'T00:00:00+03:30').toISOString(), now = nowIso(), wk = new Date(Date.parse(cut) - 7 * 864e5).toISOString();
  let ch = 0; const run = async st => { const r = await st.run(); ch += (r && r.meta && r.meta.changes) || 0; };
  const Q = (await db.prepare(`SELECT id, name, data, queue FROM plans WHERE (queue IN ('waiting','reviewing') AND COALESCE(queuedAt,'')<>'' AND queuedAt<?) OR (queue IN ('consult','consulting') AND COALESCE(NULLIF(consultAt,''),queuedAt,'')<>'' AND COALESCE(NULLIF(consultAt,''),queuedAt)<?) OR (queue='surgery' AND COALESCE(surgAt,'')<>'' AND surgAt<?) LIMIT 300`).bind(cut, cut, cut).all()).results;
  if (Q.length) { const H = new Set((await db.prepare(`SELECT plan, kind FROM tasks WHERE kind IN ('stuckq','stucks') AND (done=0 OR created>=?)`).bind(wk).all()).results.map(t => t.kind + '|' + t.plan));
    for (const o of Q) { const kind = o.queue === 'surgery' ? 'stucks' : 'stuckq'; if (H.has(kind + '|' + o.id)) continue; await run(taskIns(db, o, kind, td, M53_WHY[o.queue] || '')); } }
  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND kind='stuckq' AND plan NOT IN (SELECT id FROM plans WHERE queue IN ('waiting','reviewing','consult','consulting'))`).bind(now, M53_MOVED));
  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND kind='stucks' AND plan NOT IN (SELECT id FROM plans WHERE queue='surgery')`).bind(now, M53_MOVED));
  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND kind='nodis' AND plan NOT IN (SELECT id FROM plans WHERE COALESCE(settle,'')='pending' OR (surg IS NOT NULL AND json_valid(surg) AND COALESCE(json_extract(surg,'$.dis'),'')=''))`).bind(now, M53_MOVED));
  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND ((kind IN ('numb','week') AND due<?) OR (kind='suture' AND due<?))`).bind(now, M53_OLD, addDays(-30), addDays(-60)));
  if (ch) await db.batch([db.prepare(`UPDATE appts SET st='cancel' WHERE st='set' AND kind='suture' AND task IN (SELECT id FROM tasks WHERE done=1 AND kind='suture' AND note=?)`).bind(M53_OLD), bump(db)]);
}
queue0 = (orig => async function (db, v, sv, role, td) {
  if (role === 'staff' && Date.now() - M53_T > 60000) { M53_T = Date.now(); try { await m53Tick(db); } catch (e) { console.error('m53a tick', e && e.message); } }
  return orig.apply(this, arguments); })(queue0);
/* (3) */
const m53Teeth = (a, b) => [...new Set(String(a || '').split(',').concat(String(b || '').split(',')).filter(Boolean))].join(',');
async function m53Hold(db, id) {
  const t = await db.prepare(`SELECT id, due, info FROM tasks WHERE plan=? AND kind='impr' AND done=0`).bind(id).first(); if (!t) return;
  const k = parse(await kvGet(db, 'm53impr:' + id), null) || {}, due = k.due && k.due > t.due ? k.due : t.due;
  await db.batch([kvSet(db, 'm53impr:' + id, JSON.stringify({ due, info: m53Teeth(k.info, t.info) })), db.prepare(`UPDATE appts SET st='cancel' WHERE task=? AND st='set'`).bind(t.id), db.prepare('DELETE FROM tasks WHERE id=?').bind(t.id), bump(db)]);
}
async function m53Release(db, id) {
  const k = parse(await kvGet(db, 'm53impr:' + id), null); if (!k || !k.due) return;
  const o = await getRow(db, id), ops = [db.prepare('DELETE FROM kv WHERE k=?').bind('m53impr:' + id)];
  const t = await db.prepare(`SELECT id, due, info FROM tasks WHERE plan=? AND kind='impr' AND done=0`).bind(id).first();
  if (t) { const due = t.due > k.due ? t.due : k.due; ops.push(db.prepare('UPDATE tasks SET due=?, info=? WHERE id=?').bind(due, m53Teeth(k.info, t.info), t.id), db.prepare(`UPDATE appts SET day=? WHERE task=? AND st='set'`).bind(due, t.id)); }
  else if (o) { const tid = uuid(), now = nowIso(), h = (parse(o.data, {}) || {}).h || {}, ph = tcut(h.phone, 30);
    ops.push(db.prepare("INSERT INTO tasks (id,plan,name,phone,kind,due,done,doneAt,note,by,created,info) VALUES (?,?,?,?,?,?,0,'','','',?,?)").bind(tid, o.id, o.name || '', ph, 'impr', k.due, now, tcut(k.info, 300)),
      db.prepare('INSERT INTO appts (id,plan,name,phone,day,time,dur,kind,doc,note,st,sms,created,by,task) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(uuid(), o.id, o.name || '', ph, k.due, '', 30, 'impr', tcut(h.doc, 80), 'قالب‌گیری', 'set', '', now, 'خودکار', tid)); }
  ops.push(bump(db)); await db.batch(ops);
}
{ const _s53 = surgSave; surgSave = async function (db, req) { const r = await _s53.apply(this, arguments);
  try { if (r && r.ok && req && req.id) { if (r.finished === false) await m53Hold(db, String(req.id)); else if (r.finished === true) await m53Release(db, String(req.id)); } } catch (e) { console.error('m53a impr', e && e.message); }
  return r; }; }
{ const _st53 = surgStop; surgStop = async function (db, req) { const r = await _st53.apply(this, arguments);
  try { if (r && r.ok && req && req.id) await m53Release(db, String(req.id)); } catch (e) { console.error('m53a stop', e && e.message); }
  return r; }; }
/* (4) + (5) */
async function m53Pros(db, id) {
  const o = await getRow(db, id); if (!o) return; const sg = parse(o.surg, null), ops = [];
  const open = await db.prepare(`SELECT COUNT(*) c FROM tasks WHERE plan=? AND done=0 AND kind IN ('numb','week','suture')`).bind(id).first();
  if (open && Number(open.c) > 0) ops.push(closeTasks(db, id, ['numb', 'week', 'suture'], M53_PROS), db.prepare(`UPDATE appts SET st='cancel' WHERE plan=? AND st='set' AND kind='suture' AND task IN (SELECT id FROM tasks WHERE plan=? AND kind='suture')`).bind(id, id));
  if (sg && !sg.arc && (sg.sessions || []).length) { const pend = o.settle === 'pending', nd = !sg.dis && sg.lastDay && String(sg.lastDay) >= addDays(-60);
    if ((pend || nd) && !(await db.prepare("SELECT id FROM tasks WHERE plan=? AND kind='nodis' AND done=0").bind(id).first())) ops.push(taskIns(db, o, 'nodis', tehranDay(), pend ? 'اختلاف هزینه‌ی جراحی تسویه نشده' + (nd ? ' و ترخیص ثبت نشده' : '') : 'ترخیص ثبت نشده')); }
  if (ops.length) { ops.push(bump(db)); await db.batch(ops); }
}
{ const _p53 = prosSess; prosSess = async function (db, req) { const r = await _p53.apply(this, arguments);
  try { if (r && r.ok !== false && req && req.id) await m53Pros(db, String(req.id)); } catch (e) { console.error('m53a pros', e && e.message); }
  return r; }; }
