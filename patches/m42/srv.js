/* ---------- m42 (owner, 2026-11-17): clinic staff accounts — one person may hold several roles with one password and picks the cartable after login
   (request field «as»); the manager may switch off the shared password of a cartable (never the manager's own). Roles: the eight existing ones. ---------- */
const M42_SHARED = ['staff', 'doctor', 'consultant', 'surgery', 'lab', 'inventory'];
let M42_READY = false;
async function m42Init(db) { if (M42_READY) return; try { await db.prepare('ALTER TABLE users ADD COLUMN roles TEXT').run(); } catch (e) { } M42_READY = true; }
const m42Roles = u => { let r = []; try { r = JSON.parse((u && u.roles) || '[]'); } catch (e) { } r = (Array.isArray(r) ? r : []).filter(x => USER_ROLES.includes(x)); if (u && USER_ROLES.includes(u.role) && !r.includes(u.role)) r.unshift(u.role); return [...new Set(r)]; };
async function m42Off(db) { try { const o = JSON.parse((await kvGet(db, 'pwoff')) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
/* login: a shared password that is switched off no longer opens its cartable; a personal account carries all its roles */
{ const _l42 = p7Login; p7Login = async function (db, pw) { await m42Init(db); const r = await _l42.apply(this, arguments);
  if (r && r.role && !r.user) { if (M42_SHARED.includes(r.role) && (await m42Off(db))[r.role]) return { role: '', user: null }; return r; }
  if (r && r.user) { const u = await db.prepare('SELECT role, roles FROM users WHERE id=?').bind(r.user.id).first(); const R = u ? m42Roles(u) : [r.role]; r.user.roles = R.length ? R : [r.role]; if (!r.user.roles.includes(r.role)) r.role = r.user.roles[0]; }
  return r; }; }
/* ping tells the page which roles this person holds */
{ const _h42 = handle; handle = async function (req, env) { const r = await _h42.apply(this, arguments);
  try { if (req && req.action === 'ping' && r && r.ok && req._user && Array.isArray(req._user.roles)) { r.roles = req._user.roles; r.uid = req._user.id; } } catch (e) { }
  return r; }; }
{ const _ul42 = userList; userList = async function (db) { await m42Init(db); const r = await _ul42.apply(this, arguments);
  try { const m = new Map((await db.prepare('SELECT id, role, roles FROM users').all()).results.map(u => [u.id, m42Roles(u)])); (r.items || []).forEach(x => { x.roles = m.get(x.id) || [x.role]; }); } catch (e) { console.error('m42 list', e && e.message); }
  return r; }; }
{ const _us42 = userSave; userSave = async function (db, req) { await m42Init(db); const u = (req && req.u) || {}; let roles = null;
  if (Array.isArray(u.roles)) { roles = [...new Set(u.roles.filter(x => USER_ROLES.includes(x)))]; if (!roles.length) return { ok: false, error: 'دست‌کم یک نقش انتخاب کنید.' };
    u.role = roles.includes('lab') ? 'lab' : roles[0]; }
  const r = await _us42.apply(this, arguments);
  try { if (r && r.ok && roles) { const row = u.id ? { id: String(u.id) } : await db.prepare('SELECT id FROM users WHERE name=? AND role=? ORDER BY created DESC LIMIT 1').bind(tcut(String(u.name || '').trim(), 60), u.role).first();
    if (row) { await db.prepare('UPDATE users SET roles=? WHERE id=?').bind(JSON.stringify(roles), row.id).run(); PW_CACHE.clear(); } } } catch (e) { console.error('m42 save', e && e.message); return { ok: false, error: 'نقش‌ها ذخیره نشد. دوباره تلاش کنید.' }; }
  return r; }; }
/* shared passwords of the cartables: state and switch (manager only) */
async function m42Shared(db, req) { await m42Init(db); const off = await m42Off(db), cnt = {};
  (await db.prepare('SELECT role, roles FROM users WHERE active=1').all()).results.forEach(u => m42Roles(u).forEach(r => { cnt[r] = (cnt[r] || 0) + 1; }));
  if (req.action === 'pwShared') { const role = String(req.role || '');
    if (!M42_SHARED.includes(role)) return { ok: false, error: role === 'manager' ? 'رمز مشترک مدیر همیشه روشن می‌ماند.' : 'این کارتابل رمز مشترکِ قابل خاموش کردن ندارد.' };
    const turnOff = !!req.off;
    if (turnOff && !(cnt[role] > 0) && !req.ack) return { ok: false, error: 'هیچ حساب شخصی فعالی با این نقش نیست. اگر رمز مشترک خاموش شود، تا ساختن حساب شخصی کسی نمی‌تواند وارد این کارتابل شود.' };
    if (turnOff) off[role] = { at: nowIso(), by: tcut(req.by, 60) }; else delete off[role];
    await kvSet(db, 'pwoff', JSON.stringify(off)).run(); PW_CACHE.clear(); req.st = role; req.note = turnOff ? 'رمز مشترک خاموش شد' : 'رمز مشترک روشن شد'; }
  return { ok: true, roles: M42_SHARED, off: Object.fromEntries(M42_SHARED.map(r => [r, off[r] ? 1 : 0])), count: cnt }; }
MGR_ACTIONS.pwShared = 1; MGR_ACTIONS.pwSharedGet = 1; AUDIT_SKIP.pwSharedGet = 1;
{ const _ar42 = arc6Route; arc6Route = async function (db, req, role) {
  if (req && (req.action === 'pwShared' || req.action === 'pwSharedGet')) return role === 'manager' ? m42Shared(db, req) : { ok: false, error: 'فقط مدیر رمزهای مشترک را خاموش و روشن می‌کند.' };
  return _ar42.apply(this, arguments); }; }
