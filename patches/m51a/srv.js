/* ---------- m51a (owner, 2026-11-18): paper files («پرونده‌ی جا مانده») — the page asks while the file number / national id is typed whether another file already has it.
   Action m51Dup {id, file, nid} → { file: {id, name} | null, nid: [{id, name, f}] }. Read only; reception and the consultant. ---------- */
async function m51Dup(db, req, role) {
  if (!['staff', 'consultant'].includes(role)) return { ok: false, error: 'این کار با منشی یا مشاور است.' };
  const id = String(req.id || ''), file = tcut(toEnD(String(req.file == null ? '' : req.file)).trim(), 20), nid = toEnD(String(req.nid == null ? '' : req.nid)).replace(/[^\d]/g, '');
  const out = { ok: true, file: null, nid: [] };
  if (file) { let ex = await fxFileUsed(db, file, id);
    if (!ex) ex = await db.prepare("SELECT id, name FROM plans WHERE json_valid(data) AND CAST(json_extract(data,'$.h.pfile') AS TEXT)=? AND id<>? LIMIT 1").bind(file, id).first();
    if (ex) out.file = { id: ex.id || '', name: ex.name || '' }; }
  if (nid.length >= 8) { const q = await db.prepare("SELECT id, name, CASE WHEN json_valid(data) THEN COALESCE(json_extract(data,'$.h.file'), json_extract(data,'$.h.pfile')) END f FROM plans WHERE nid=? AND id<>? LIMIT 5").bind(nid, id).all();
    out.nid = (q.results || []).map(r => ({ id: r.id, name: r.name || '', f: r.f == null ? '' : String(r.f) })); }
  return out;
}
STAFF_ACTIONS.m51Dup = 1; AUDIT_SKIP.m51Dup = 1;
{ const _ar51 = arc6Route; arc6Route = async function (db, req, role) { if (req && req.action === 'm51Dup') return m51Dup(db, req, role); return _ar51.apply(this, arguments); }; }
