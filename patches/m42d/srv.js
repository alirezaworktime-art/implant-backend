/* ---------- m42d (owner, 2026-11-17): the surgery assistant may correct a session on the day it was recorded (everything: teeth, fixtures, materials,
   doctors, follow-ups, last-session mark). How: every recorded session keeps a picture of the patient just before and just after the save (plan state,
   tasks, appointments, open refunds, stock moves; table surg_snap, keyed by «pid» so the patient-delete tool, which sweeps every table with a «plan»
   column, leaves it alone — the pictures expire by themselves after 7 days). An edit puts back exactly what that save changed and nobody touched since, returns the fixtures to
   the store, and records the corrected session through the same surgSave path (stock, follow-ups, prosthesis start, money, accounting). Only the last
   session, only the same day, only the «پزشک» login. A settlement done in between is kept, so a changed amount goes back to «منتظر تسویه». ---------- */
let M42D_READY = false;
async function m42dInit(db) { if (M42D_READY) return; await db.prepare('CREATE TABLE IF NOT EXISTS surg_snap (pid TEXT, n INTEGER, at TEXT, day TEXT, by TEXT, name TEXT, edits INTEGER DEFAULT 0, before TEXT, after TEXT, PRIMARY KEY (pid, n))').run(); M42D_READY = true; }
const M42D_T = ['tasks', 'appts', 'refunds'];
async function m42dSnap(db, id) {
  const o = await db.prepare('SELECT id, name, surg, surgN, queue, settle, pros, surgAt FROM plans WHERE id=?').bind(id).first(); if (!o) return null;
  const S = { plan: o }; for (const t of M42D_T) S[t] = (await db.prepare(`SELECT * FROM ${t} WHERE plan=?`).bind(id).all()).results;
  S.moves = (await db.prepare('SELECT id FROM inv_moves WHERE ref=?').bind(id).all()).results.map(r => r.id); return S;
}
{ const _h42d = handle; handle = async function (req, env) { let pre = null, id = '';
  try { if (req && (req.action === 'surgSave' || req.action === 'surgEdit') && env && env.DB && typeof req.id === 'string' && req.id && req.id.length < 80) { id = req.id; await m42dInit(env.DB); pre = await m42dSnap(env.DB, id); } } catch (e) { console.error('m42d pre', e && e.message); pre = null; }
  const r = await _h42d.apply(this, arguments);
  try { if (pre && r && r.ok && req._role === 'surgery') { const db = env.DB, post = await m42dSnap(db, id), now = nowIso();
    if (post && req._m42dEdit) { if (req._m42dEdit.before) await db.prepare('UPDATE surg_snap SET before=?, after=?, edits=COALESCE(edits,0)+1 WHERE pid=? AND n=?').bind(JSON.stringify(req._m42dEdit.before), JSON.stringify(post), id, req._m42dEdit.n).run(); else await db.prepare('UPDATE surg_snap SET after=?, edits=COALESCE(edits,0)+1 WHERE pid=? AND n=?').bind(JSON.stringify(post), id, req._m42dEdit.n).run(); }
    else if (post && Number(post.plan.surgN) === Number(pre.plan.surgN) + 1) await db.batch([
      db.prepare('INSERT OR REPLACE INTO surg_snap (pid,n,at,day,by,name,edits,before,after) VALUES (?,?,?,?,?,?,0,?,?)').bind(id, Number(post.plan.surgN), now, tehranDay(), tcut(req.by || (req.session && req.session.by), 60), tcut(post.plan.name, 80), JSON.stringify(pre), JSON.stringify(post)),
      db.prepare('DELETE FROM surg_snap WHERE at<?').bind(new Date(Date.now() - 7 * 864e5).toISOString())]); } }
  catch (e) { console.error('m42d snap', e && e.message); }
  return r; }; }
async function m42dList(db) { await m42dInit(db);
  const { results } = await db.prepare(`SELECT s.pid id, s.name, s.n, s.at, s.by, s.edits, p.queue FROM surg_snap s JOIN plans p ON p.id=s.pid WHERE s.day=? AND p.surgN=s.n ORDER BY s.at DESC LIMIT 80`).bind(tehranDay()).all();
  return { ok: true, items: results.map(x => ({ id: x.id, name: x.name, n: x.n, at: x.at, by: x.by, edits: Number(x.edits) || 0, fin: x.queue === 'surgdone' ? 1 : 0 })) }; }
async function m42dEdit(db, req, role) {
  await m42dInit(db); const id = String(req.id || ''), n = Math.round(Number(req.n) || 0);
  const sn = await db.prepare('SELECT * FROM surg_snap WHERE pid=? AND n=?').bind(id, n).first();
  if (!sn) return { ok: false, error: 'این جلسه قابل ویرایش نیست (پیش از فعال شدن «ویرایش جلسه» ثبت شده یا مهلتش گذشته است).' };
  if (sn.day !== tehranDay()) return { ok: false, error: 'مهلت ویرایش این جلسه (همان روز ثبت) گذشته است. برای اصلاح به مدیر بگویید.' };
  const B = parse(sn.before, null), A = parse(sn.after, null), cur = await m42dSnap(db, id);
  if (!B || !A || !B.plan || !A.plan) return { ok: false, error: 'اطلاعات این جلسه برای ویرایش کامل نیست.' };
  if (!cur) return { ok: false, error: 'این بیمار پیدا نشد.' };
  if (Number(cur.plan.surgN) !== n) return { ok: false, error: 'بعد از این جلسه، جلسه‌ی دیگری برای این بیمار ثبت شده است؛ فقط آخرین جلسه ویرایش می‌شود.' };
  if (cur.plan.queue !== A.plan.queue) return { ok: false, error: 'وضعیت این بیمار بعد از ثبت جلسه عوض شده است (دوباره به جراحی فرستاده شده یا جای دیگری رفته)؛ ویرایش این جلسه ممکن نیست.' };
  const cs = parse(cur.plan.surg, null) || {}, as = parse(A.plan.surg, null) || {}, bs = parse(B.plan.surg, null);
  if (cs.dis) return { ok: false, error: 'این بیمار ترخیص شده است؛ ویرایش جلسه ممکن نیست.' };
  const oldSes = (cs.sessions || [])[n - 1]; if (!oldSes) return { ok: false, error: 'این جلسه در پرونده پیدا نشد.' };
  const ses = req.session && typeof req.session === 'object' ? req.session : null; if (!ses) return { ok: false, error: 'اطلاعات جلسه نرسید.' };
  { const imp = ses.imp && typeof ses.imp === 'object' ? ses.imp : {}; const bad = Object.keys(imp).filter(k => { const m = imp[k] || {}; return !String(m.b == null ? '' : m.b).trim() || !String(m.d == null ? '' : m.d).trim() || !String(m.l == null ? '' : m.l).trim(); });
    if (bad.length) return { ok: false, error: 'برند، قطر و طول فیکسچر این دندان‌ها ثبت نشده: ' + bad.slice(0, 12).map(k => tcut(k, 4)).join('، ') }; }
  { const amt = v => { const x = Math.round(Number(toEnD(v))); return Number.isFinite(x) && x >= 0 && x <= 1e13; }, t = await db.prepare('SELECT total FROM plans WHERE id=?').bind(id).first();
    if (!amt(req.actual) || !(Number(t && t.total) > 0 || amt(req.planned))) return { ok: false, error: 'مبلغ‌های جلسه نامعتبر است.' }; }
  if (JSON.stringify(ses).length > 200000) return { ok: false, error: 'اطلاعات جلسه بیش از حد بزرگ است.' };
  const by = tcut(req.by || ses.by, 60), ops = [], J = x => JSON.stringify(x === undefined ? null : x);
  /* the plan as it was before the session; what others changed since (settlement, prosthesis) is kept */
  const SKIP = ['sessions', 'actual', 'planned', 'diff', 'finished', 'finishedAt', 'lastDay', 'brand'];
  let ns = bs ? JSON.parse(JSON.stringify(bs)) : null, keptSettle = false;
  for (const k of Object.keys(cs)) if (!SKIP.includes(k) && J(cs[k]) !== J(as[k])) { ns = ns || { sessions: [] }; ns[k] = cs[k]; if (/settle/i.test(k)) keptSettle = true; }
  const settle = cur.plan.settle === A.plan.settle ? (B.plan.settle || '') : (cur.plan.settle || ''); if (cur.plan.settle !== A.plan.settle) keptSettle = true;
  const pros = cur.plan.pros === A.plan.pros ? B.plan.pros : cur.plan.pros;
  ops.push(db.prepare('UPDATE plans SET surg=?, surgN=?, queue=?, settle=?, pros=?, surgAt=? WHERE id=?').bind(ns ? JSON.stringify(ns) : null, n - 1, B.plan.queue || 'surgery', settle, pros == null ? null : pros, B.plan.surgAt || '', id));
  for (const t of M42D_T) { if (t === 'refunds' && keptSettle) continue;
    const bm = new Map((B[t] || []).map(r => [r.id, r])), cm = new Map((cur[t] || []).map(r => [r.id, r]));
    for (const ar of (A[t] || [])) { const br = bm.get(ar.id), cr = cm.get(ar.id); if (!cr) continue;
      if (!br) { if (J(cr) === J(ar)) ops.push(db.prepare(`DELETE FROM ${t} WHERE id=?`).bind(ar.id)); continue; }
      const set = Object.keys(ar).filter(c => c !== 'id' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(c) && J(ar[c]) !== J(br[c]) && J(cr[c]) === J(ar[c]));
      if (set.length) ops.push(db.prepare(`UPDATE ${t} SET ${set.map(c => c + '=?').join(', ')} WHERE id=?`).bind(...set.map(c => br[c] === undefined ? null : br[c]), ar.id)); } }
  /* fixtures and parts of this session go back to the store */
  { const b0 = new Set(B.moves || []), mine = (cur.moves || []).filter(x => !b0.has(x)); let back = 0;
    for (let i = 0; i < mine.length; i += 80) { const part = mine.slice(i, i + 80); const { results } = await db.prepare(`SELECT id, item, delta FROM inv_moves WHERE id IN (${part.map(() => '?').join(',')})`).bind(...part).all();
      for (const m of results) { const d = Number(m.delta) || 0; if (!d) continue; ops.push(...invMoveOps(db, m.item, -d, 'use', by, 'ویرایش جلسه‌ی ' + n + ' جراحی — برگشت ثبت قبلی', id, cur.plan.name)); back++; } }
    if (back) ops.push(invBump(db)); }
  ops.push(bump(db));
  await db.batch(ops);
  const B2 = await m42dSnap(db, id); /* the patient without this session, with what others did since: the new «before» */
  /* the corrected session, through the normal path */
  const req2 = { id, session: Object.assign({}, ses, { n, at: oldSes.at, jalali: oldSes.jalali }), finish: !!req.finish, actual: req.actual, planned: req.planned, brand: req.brand, by: req.by, _role: req._role, _user: req._user };
  let r = null; try { r = await surgSave(db, req2); } catch (e) { console.error('m42d save', e && e.message); r = { ok: false, error: 'ثبت جلسه‌ی اصلاح‌شده انجام نشد.' }; }
  if (!r || r.ok === false) { let rr = null; try { const o0 = Object.assign({}, oldSes); delete o0.savedAt; rr = await surgSave(db, { id, session: o0, finish: !!as.finished, actual: as.actual, planned: as.planned, brand: as.brand, by: oldSes.by, _role: req._role, _user: req._user }); } catch (e) { console.error('m42d restore', e && e.message); }
    try { await xlAuto(db, id, tehranDay(oldSes.at), by); } catch (e) { }
    try { const post = await m42dSnap(db, id); if (B2 && post) await db.prepare('UPDATE surg_snap SET before=?, after=? WHERE pid=? AND n=?').bind(JSON.stringify(B2), JSON.stringify(post), id, n).run(); } catch (e) { console.error('m42d resnap', e && e.message); }
    return { ok: false, error: ((r && r.error) || 'ویرایش ثبت نشد.') + (rr && rr.ok !== false ? ' جلسه‌ی قبلی بدون تغییر ماند.' : ' جلسه‌ی قبلی هم برنگشت؛ همین حالا به مدیر خبر بدهید.') }; }
  try { const o = await getRow(db, id), sg = parse(o && o.surg, null); if (sg && Array.isArray(sg.sessions) && sg.sessions[n - 1]) { const e0 = (oldSes.edited && Number(oldSes.edited.c)) || 0; sg.sessions[n - 1].edited = { at: nowIso(), by, c: e0 + 1 }; sg.sessions[n - 1].savedAt = oldSes.savedAt || sg.sessions[n - 1].savedAt;
    await db.batch([db.prepare('UPDATE plans SET surg=? WHERE id=?').bind(JSON.stringify(sg), id), fx7Ev(db, id, 'surgEdit', 'جلسه‌ی ' + n + ' جراحی ویرایش شد', 'ثبت قبلی برگشت و جلسه‌ی اصلاح‌شده جایگزین شد؛ انبار و مبلغ دوباره حساب شد.', by, role), bump(db)]); } } catch (e) { console.error('m42d mark', e && e.message); }
  try { await xlAuto(db, id, tehranDay(oldSes.at), by); } catch (e) { console.error('m42d xl', e && e.message); }
  try { FIN_FP = ''; FIN_SYNC_AT = 0; } catch (e) { }
  /* the rest of the request is treated as a recorded session (follow-up hooks, history, change log) */
  req.action = 'surgSave'; req.session = req2.session; req.finish = req2.finish; req.note = 'ویرایش جلسه‌ی ' + n; req._m42dEdit = { n, before: B2 };
  return Object.assign({}, r, { edit: 1 });
}
SURG_ACTIONS.surgEdit = 1; SURG_ACTIONS.surgEditList = 1; AUDIT_SKIP.surgEditList = 1;
{ const _ar42d = arc6Route; arc6Route = async function (db, req, role) {
  if (req && req.action === 'surgEditList') return role === 'surgery' ? m42dList(db) : { ok: false, error: 'این فهرست برای ورود پزشک است.' };
  if (req && req.action === 'surgEdit') { if (role !== 'surgery') return { ok: false, error: 'ویرایش جلسه‌ی جراحی فقط با ورود پزشک (کارتابل روز جراحی) ممکن است.' };
    return once(db, req.sendId, () => m42dEdit(db, req, role), 'surgEdit'); }
  return _ar42d.apply(this, arguments); }; }
