/* ---------- m54c (owner, 2026-11-18): the extra fields of m54a are not needed: m54Pat «set» and m54Surg are refused, and «get» gives only the
   closed state of the file (kv m54p: / m54s: are no longer read or written). Closing a file (m54Close) stays. ---------- */
{ const _ar54c = arc6Route; arc6Route = async function (db, req, role) { const a = req && req.action;
  if (a === 'm54Surg' || (a === 'm54Pat' && String(req.op || 'get') !== 'get')) return { ok: false, error: 'این بخش برداشته شده است.' };
  if (a === 'm54Pat') { const id = String(req.id || ''); if (!id) return { ok: false, error: 'بیمار مشخص نیست.' }; return { ok: true, p: {}, s: {}, c: parse(await kvGet(db, 'm54c:' + id), null) }; }
  return _ar54c.apply(this, arguments); }; }
