/* ---------- m50b (owner, 2026-11-18): reception (or the consultant) changes the way of payment of a confirmed plan at «تعیین تکلیف مالی»:
   mode «cash» = everything in cash with the cash discount (5% unless the plan has its own), mode «plan» = back to the consultant's terms.
   The consultant's terms are kept in pay.m50o. Like pl10Brand, the new total and the two parts are sent by the page (same formulas as the plan form). ---------- */
const M50_K = ['cs', 'cp', 'cash', 'n1', 'n3', 'disc', 'opt', 'mode'];
async function m50PayMode(db, req, role) {
  if (!['staff', 'consultant'].includes(role)) return { ok: false, error: 'این کار با منشی یا مشاور است.' };
  const o = await getRow(db, String(req.id || '')); if (!o) return { ok: false, error: 'این بیمار پیدا نشد.' };
  if (!['confirmed', 'modified'].includes(o.status)) return { ok: false, error: 'طرح این بیمار تأیید نشده است.' };
  const d = parse(o.data, {}) || {}; if (!d.pay || typeof d.pay !== 'object') d.pay = {};
  if (d.pay.blater && d.brand === 'ref') return { ok: false, error: 'اول برند ایمپلنت بیمار را ثبت کنید.' };
  const mode = String(req.mode || ''); if (mode !== 'cash' && mode !== 'plan') return { ok: false, error: 'روش پرداخت را انتخاب کنید.' };
  const on = !!(d.pay.m50o && typeof d.pay.m50o === 'object');
  if (mode === 'cash' && on) return { ok: true, same: 1, total: Number(o.total) || 0 };
  if (mode === 'plan' && !on) return { ok: true, same: 1, total: Number(o.total) || 0 };
  const N = v => Math.round(Number(v)), total = N(req.total), S0 = N(req.parts && req.parts.S), P0 = N(req.parts && req.parts.P);
  if (![total, S0, P0].every(v => Number.isFinite(v) && v >= 0 && v < 1e13) || !total) return { ok: false, error: 'مبلغ طرح درست نیست.' };
  const old = Number(o.total) || 0;
  if (mode === 'cash') {
    if (total > old) return { ok: false, error: 'مبلغ نقدی نباید از جمع طرح بیشتر باشد؛ صفحه را تازه کنید.' };
    const cq = await db.prepare("SELECT COUNT(*) c FROM pays WHERE plan=? AND kind='chq' AND st IN ('wait','ok')").bind(o.id).first();
    if (cq && Number(cq.c) > 0) return { ok: false, error: 'برای این بیمار چک ثبت شده است؛ اول چک‌ها را در «پرداخت‌ها» حذف کنید، بعد «نقدی کامل» را بزنید.' };
    const keep = {}; M50_K.forEach(k => { if (d.pay[k] !== undefined) keep[k] = d.pay[k]; }); d.pay.m50o = keep;
    d.pay.cs = '100'; d.pay.cp = '100'; d.pay.cash = ''; d.pay.n1 = ''; d.pay.n3 = ''; d.pay.mode = 'cash';
    if (!(Number(toEnD(String(d.pay.disc == null ? '' : d.pay.disc)).replace(/[^\d.]/g, '')) > 0)) d.pay.disc = '5';
    if (String(d.pay.opt) === '3') d.pay.opt = '2';
  } else { const k0 = d.pay.m50o; M50_K.forEach(k => { if (k0[k] !== undefined) d.pay[k] = k0[k]; else delete d.pay[k]; }); delete d.pay.m50o; }
  if (S0 + P0 > 0) { const s2 = Math.round(S0 * total / (S0 + P0)); d.parts = { S: s2, P: total - s2 }; }
  const now = nowIso(), who = tcut((req._user && req._user.name) || req.by || ({ staff: 'منشی', consultant: 'مشاور' })[role], 60);
  d.pay.m50By = who; d.pay.m50At = now;
  await db.batch([db.prepare('UPDATE plans SET data=?, total=?, updatedAt=? WHERE id=?').bind(JSON.stringify(d), total, now, o.id),
    db.prepare("INSERT INTO events (id,plan,at,user,role,kind,cat,title,detail,undo,undone) VALUES (?,?,?,?,?,?,?,?,?,'',0)").bind(uuid(), o.id, now, who, role, 'm50PayMode', 'fin', mode === 'cash' ? 'روش پرداخت: نقدی کامل با تخفیف' : 'روش پرداخت: برگشت به شرایط طرح', tcut('جمع طرح از ' + old + ' به ' + total, 300)), bump(db)]);
  return { ok: true, mode, total };
}
STAFF_ACTIONS.m50PayMode = 1;
{ const _ar50 = arc6Route; arc6Route = async function (db, req, role) { if (req && req.action === 'm50PayMode') return m50PayMode(db, req, role); return _ar50.apply(this, arguments); }; }
/* «ارجاع به پزشک دیگر» (h.rdoc, h.rdocN): reception gets the same task as for the general-dentist visit; the text says what it is */
{ const _g50 = m50Gen; m50Gen = async function (db, id, h, name) { const h2 = Object.assign({}, h || {});
  if (h2.rdoc) { const rd = 'ارجاع به پزشک دیگر' + (h2.rdocN ? ': ' + tcut(h2.rdocN, 80) : ''); h2.genN = [h2.gen ? 'ویزیت دندانپزشک عمومی' + (h2.genN ? ' (' + tcut(h2.genN, 80) + ')' : '') : '', rd].filter(Boolean).join(' · '); h2.gen = 1; }
  return _g50.call(this, db, id, h2, name); }; }
