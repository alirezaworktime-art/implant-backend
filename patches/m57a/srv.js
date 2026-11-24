/* ---------- m57a (owner, 2026-11-20): the number the patient texts when they decide to be treated (printed in the PDF of a patient who wants
   to think). Kept in kv m57sms; m57Sms {op: get|set, v}: everyone who prints the plan may read it, only the manager sets it. ---------- */
async function m57Sms(db, req, role) {
  const op = String(req.op || 'get');
  if (op === 'get') return { ok: true, v: String((await kvGet(db, 'm57sms')) || '') };
  if (op !== 'set') return { ok: false, error: 'درخواست درست نیست.' };
  if (role !== 'manager') return { ok: false, error: 'این تنظیم با مدیر است.' };
  const v = toEnD(String(req.v || '')).replace(/[^\d]/g, '').slice(0, 13);
  if (v && !(v.length >= 8 && v.length <= 13)) return { ok: false, error: 'شماره‌ی پیامک درست نیست.' };
  await db.batch([kvSet(db, 'm57sms', v)]); return { ok: true, v };
}
STAFF_ACTIONS.m57Sms = 1; MGR_ACTIONS.m57Sms = 1; DOC_ACTIONS.m57Sms = 1; AUDIT_SKIP.m57Sms = 1;
{ const _ar57 = arc6Route; arc6Route = async function (db, req, role) { if (req && req.action === 'm57Sms') return m57Sms(db, req, role); return _ar57.apply(this, arguments); }; }
