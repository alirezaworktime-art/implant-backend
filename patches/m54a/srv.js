/* ---------- m54a (owner, 2026-11-18) — second audit (implant/audits/2026-11-18-full-flow-and-fields.md):
   tick: (W1) a cheque 3 days past its due date and still «در انتظار» → reception task «chqdue»; (W3) a «payok» task open for 3 days → task «payokl»;
   win-back: (W2) an impression / uncovering task 30 days overdue puts the patient in «بازگشت بیماران»;
   (W4) m54Close {id, op: close|open, reason, note}: a file is closed with a reason — its open tasks are closed, future appointments cancelled and
        it leaves the lists; it opens again by itself when the patient is sent into a queue again. Kept in kv (m54c:<id>, index m54closed);
   extra fields, kept in kv and never in the plan: m54Pat {id, op: get|set, x} (patient, medical, cheque owner, warranty, satisfaction, complaint),
   m54Surg {id, n, x} (per surgery session: anaesthesia, complication, graft / membrane lot, per implant lot / expiry / torque / ISQ / bone). ---------- */
const M54_PK = ['g', 'bd', 'ph2', 'emn', 'addr', 'job', 'ins', 'sms', 'smoke', 'antic', 'bis', 'bf', 'own', 'ownPh', 'warM', 'warFrom', 'warNote', 'satS', 'satC', 'compT', 'compDone'];
const M54_LONG = { addr: 1, warNote: 1, satC: 1, compT: 1 };
const M54_WHY = { done: 'درمان تمام شد', dead: 'فوت بیمار', moved: 'مهاجرت / جابه‌جایی', else: 'ادامه‌ی درمان در جای دیگر', other: 'سایر' };
const M54_ACT = ['waiting', 'reviewing', 'consult', 'consulting', 'surgery'];
const m54Clean = (x, keys, long) => { const o = {}; if (!x || typeof x !== 'object') return o; keys.forEach(k => { const v = x[k]; if (v === undefined || v === null || v === '' || v === false || v === 0) return; o[k] = (v === true || v === 1) ? 1 : tcut(String(v), long && long[k] ? 400 : 120); }); return o; };
const m54Who = (req, role) => tcut((req._user && req._user.name) || req.by || ({ staff: 'منشی', consultant: 'مشاور', surgery: 'اتاق جراحی', doctor: 'پزشک' })[role] || '', 60);
const m54Ev = (db, id, who, role, kind, title, detail) => db.prepare("INSERT INTO events (id,plan,at,user,role,kind,cat,title,detail,undo,undone) VALUES (?,?,?,?,?,?,?,?,?,'',0)").bind(uuid(), id, nowIso(), who, role, kind, 'file', title, tcut(detail || '', 300));
const m54Closed = async db => { const a = parse(await kvGet(db, 'm54closed'), null); return Array.isArray(a) ? a : []; };
async function m54Pat(db, req, role) {
  const id = String(req.id || ''), op = String(req.op || 'get'); if (!id) return { ok: false, error: 'بیمار مشخص نیست.' };
  if (op === 'get') { let p = parse(await kvGet(db, 'm54p:' + id), null) || {}; const s = parse(await kvGet(db, 'm54s:' + id), null) || {}, c = parse(await kvGet(db, 'm54c:' + id), null);
    if (role === 'manager') { p = Object.assign({}, p); ['ph2', 'addr', 'ownPh'].forEach(k => delete p[k]); }
    if (role === 'doctor' || role === 'surgery') { p = Object.assign({}, p); ['own', 'ownPh', 'ins', 'satS', 'satC', 'compT', 'compDone', 'warM', 'warFrom', 'warNote'].forEach(k => delete p[k]); }
    return { ok: true, p, s, c }; }
  if (op !== 'set') return { ok: false, error: 'درخواست درست نیست.' };
  if (!['staff', 'consultant'].includes(role)) return { ok: false, error: 'این کار با منشی یا مشاور است.' };
  if (!(await getRow(db, id))) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const p = m54Clean(req.x, M54_PK, M54_LONG);
  await db.batch([kvSet(db, 'm54p:' + id, JSON.stringify(p)), m54Ev(db, id, m54Who(req, role), role, 'm54Pat', 'مشخصات تکمیلی بیمار ثبت شد', Object.keys(p).length + ' مورد')]);
  return { ok: true, p };
}
async function m54Surg(db, req, role) {
  if (!['surgery', 'staff', 'consultant', 'doctor'].includes(role)) return { ok: false, error: 'این کار با این ورود ممکن نیست.' };
  const id = String(req.id || ''), n = Math.round(Number(req.n)); if (!id || !(n >= 1 && n <= 60)) return { ok: false, error: 'جلسه‌ی جراحی مشخص نیست.' };
  if (!(await getRow(db, id))) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const x0 = req.x && typeof req.x === 'object' ? req.x : {}, x = m54Clean(x0, ['an', 'anN', 'comp', 'graft', 'graftLot', 'mem', 'memLot', 'dur', 'bp', 'bs'], { comp: 1 });
  const imp = {}; Object.keys(x0.imp && typeof x0.imp === 'object' ? x0.imp : {}).slice(0, 40).forEach(k => { const v = m54Clean(x0.imp[k], ['lot', 'exp', 'tq', 'isq', 'bone']); if (Object.keys(v).length) imp[tcut(k, 12)] = v; });
  if (Object.keys(imp).length) x.imp = imp;
  const s = parse(await kvGet(db, 'm54s:' + id), null) || {}; if (Object.keys(x).length) { x.by = m54Who(req, role); x.at = nowIso(); s[n] = x; } else delete s[n];
  await db.batch([kvSet(db, 'm54s:' + id, JSON.stringify(s)), m54Ev(db, id, m54Who(req, role), role, 'm54Surg', 'ثبت تکمیلی جراحی · جلسه‌ی ' + n, '')]);
  return { ok: true, s };
}
async function m54Close(db, req, role) {
  if (!['staff', 'consultant'].includes(role)) return { ok: false, error: 'این کار با منشی یا مشاور است.' };
  const id = String(req.id || ''), op = String(req.op || ''), o = await getRow(db, id); if (!o) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const L = await m54Closed(db), who = m54Who(req, role), now = nowIso(), cur = parse(await kvGet(db, 'm54c:' + id), null);
  if (op === 'open') { if (!cur) return { ok: true, same: 1 };
    await db.batch([db.prepare('DELETE FROM kv WHERE k=?').bind('m54c:' + id), kvSet(db, 'm54closed', JSON.stringify(L.filter(x => x !== id))), m54Ev(db, id, who, role, 'm54Close', 'پرونده دوباره باز شد', ''), bump(db)]); return { ok: true, c: null }; }
  if (op !== 'close') return { ok: false, error: 'درخواست درست نیست.' };
  if (M54_ACT.includes(o.queue || '')) return { ok: false, error: 'این بیمار همین الان در صف پزشک، مشاور یا اتاق جراحی است؛ اول کار او را تمام کنید.' };
  const reason = Object.prototype.hasOwnProperty.call(M54_WHY, req.reason) ? req.reason : ''; if (!reason) return { ok: false, error: 'دلیل بستن پرونده را انتخاب کنید.' };
  const note = tcut(req.note, 300); if (reason === 'other' && note.length < 3) return { ok: false, error: 'برای «سایر» دلیل را بنویسید.' };
  const c = { at: now, by: who, reason, why: M54_WHY[reason], note }, txt = 'پرونده بسته شد: ' + M54_WHY[reason];
  await db.batch([kvSet(db, 'm54c:' + id, JSON.stringify(c)), kvSet(db, 'm54closed', JSON.stringify(L.filter(x => x !== id).concat([id]).slice(-5000))),
    db.prepare('UPDATE tasks SET done=1, doneAt=?, note=? WHERE plan=? AND done=0').bind(now, txt, id), db.prepare("UPDATE appts SET st='cancel' WHERE plan=? AND st='set' AND day>=?").bind(id, tehranDay()),
    m54Ev(db, id, who, role, 'm54Close', txt, note), bump(db)]);
  return { ok: true, c };
}
STAFF_ACTIONS.m54Pat = 1; STAFF_ACTIONS.m54Surg = 1; STAFF_ACTIONS.m54Close = 1; SURG_ACTIONS.m54Pat = 1; SURG_ACTIONS.m54Surg = 1; DOC_ACTIONS.m54Pat = 1; DOC_ACTIONS.m54Surg = 1; MGR_ACTIONS.m54Pat = 1; ACC_ACTIONS.m54Pat = 1; AUDIT_SKIP.m54Pat = 1;
{ const _ar54 = arc6Route; arc6Route = async function (db, req, role) { const a = req && req.action;
  if (a === 'm54Pat') return m54Pat(db, req, role); if (a === 'm54Surg') return m54Surg(db, req, role); if (a === 'm54Close') return m54Close(db, req, role);
  return _ar54.apply(this, arguments); }; }
/* tick */
{ const _t54 = m53Tick; m53Tick = async function (db) { await _t54.apply(this, arguments);
  const td = tehranDay(), now = nowIso(); let ch = 0; const run = async st => { const r = await st.run(); ch += (r && r.meta && r.meta.changes) || 0; };
  const wk = new Date(Date.now() - 7 * 864e5).toISOString(), d3 = new Date(Date.now() - 3 * 864e5).toISOString();
  /* closed files: back in a queue → open again; otherwise nothing is made for them */
  let CL = await m54Closed(db); if (CL.length) { const back = (await db.prepare(`SELECT id FROM plans WHERE queue IN ('waiting','reviewing','consult','consulting','surgery') AND id IN (${CL.map(() => '?').join(',')})`).bind(...CL).all()).results.map(x => x.id);
    if (back.length) { CL = CL.filter(x => !back.includes(x)); const ops = back.map(id => db.prepare('DELETE FROM kv WHERE k=?').bind('m54c:' + id)); ops.push(kvSet(db, 'm54closed', JSON.stringify(CL))); await db.batch(ops); ch++; } }
  const CS = new Set(CL);
  /* W1 */
  const cq = (await db.prepare(`SELECT plan, COUNT(*) n, MIN(due) d FROM pays WHERE kind='chq' AND st='wait' AND COALESCE(due,'')<>'' AND due<? GROUP BY plan LIMIT 300`).bind(addDays(-3)).all()).results.filter(x => !CS.has(x.plan));
  if (cq.length) { const H = new Set((await db.prepare(`SELECT plan FROM tasks WHERE kind='chqdue' AND (done=0 OR created>=?)`).bind(wk).all()).results.map(t => t.plan));
    for (const c of cq) { if (H.has(c.plan)) continue; const o = await db.prepare('SELECT id, name, data FROM plans WHERE id=?').bind(c.plan).first(); if (o) await run(taskIns(db, o, 'chqdue', td, c.n + ' چک · قدیمی‌ترین سررسید ' + c.d)); } }
  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND kind='chqdue' AND plan NOT IN (SELECT plan FROM pays WHERE kind='chq' AND st='wait' AND COALESCE(due,'')<>'' AND due<?)`).bind(now, M53_MOVED, td));
  /* W3 */
  const pk = (await db.prepare(`SELECT t.plan, t.created FROM tasks t WHERE t.kind='payok' AND t.done=0 AND t.created<? AND NOT EXISTS (SELECT 1 FROM tasks x WHERE x.plan=t.plan AND x.kind='payokl' AND x.created>=t.created) LIMIT 100`).bind(d3).all()).results.filter(x => !CS.has(x.plan));
  for (const t of pk) { const o = await db.prepare('SELECT id, name, data FROM plans WHERE id=?').bind(t.plan).first(); if (o) await run(taskIns(db, o, 'payokl', td, 'از ' + tehranDay(Date.parse(t.created)) + ' مانده است')); }
  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND kind='payokl' AND plan NOT IN (SELECT plan FROM tasks WHERE kind='payok' AND done=0)`).bind(now, M53_MOVED));
  if (ch) await db.batch([bump(db)]); }; }
/* closed files leave the lists (cards of patients who are in a queue again stay) */
queue0 = (orig => async function (db, v, sv, role, td) { const r = await orig.apply(this, arguments);
  try { if (r && r.ok) { const CL = await m54Closed(db); if (CL.length) { const S = new Set(CL);
    for (const k of Object.keys(r)) { const L = r[k]; if (!Array.isArray(L) || !L.length || typeof L[0] !== 'object' || !L[0]) continue;
      r[k] = L.filter(x => !x || !(k === 'items' ? (S.has(x.id) && !M54_ACT.includes(x.queue || '')) : (S.has(x.plan) || (x.plan === undefined && S.has(x.id))))); } } } } catch (e) { console.error('m54a closed', e && e.message); }
  return r; })(queue0);
/* win-back */
{ const _w54 = winback; winback = async function (db) { const r = await _w54.apply(this, arguments);
  try { if (r && r.ok && Array.isArray(r.items)) { const S = new Set(await m54Closed(db)), have = new Set(r.items.map(x => x.id));
    const sn = new Set((await db.prepare('SELECT plan, kind FROM wb WHERE until > ?').bind(nowIso()).all()).results.map(x => x.plan + '|' + x.kind));
    const late = (await db.prepare(`SELECT t.plan, t.name, t.phone, MIN(t.due) due, t.kind FROM tasks t JOIN plans p ON p.id=t.plan WHERE t.done=0 AND t.kind IN ('impr','uncover') AND t.due<? AND COALESCE(p.queue,'') NOT IN ('lost','surgery','surgpart') GROUP BY t.plan`).bind(addDays(-30)).all()).results;
    for (const t of late) { if (have.has(t.plan) || sn.has(t.plan + '|pros')) continue; r.items.push({ kind: 'pros', id: t.plan, name: t.name || '', phone: t.phone || '', since: t.due, info: 'heal' }); }
    r.items = r.items.filter(x => !S.has(x.id)); r.items.sort((a, b) => String(b.since).localeCompare(String(a.since))); r.total = r.items.length; } } catch (e) { console.error('m54a winback', e && e.message); }
  return r; }; }
