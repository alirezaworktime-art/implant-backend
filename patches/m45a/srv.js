/* ---------- m45a (owner, 2026-11-17): surgery day — (1) the session keeps the suture kind (ses.sut: no / abs / non); (2) a «سرجیکال گاید» row of
   «سایر درمان‌ها» without an amount (the surgery tablet does not know the tariffs) gets the manager's tariff × jaws, added to the session cost;
   (3) a finished surgery whose cost is far from the plan (more than 30% and more than 5,000,000) leaves a line in the patient's history. ---------- */
const M45_GD = 'سرجیکال گاید';
{ const _ss45 = surgSave; surgSave = async function (db, req) {
  try { const ses = req && req.session; if (ses && typeof ses === 'object') {
    if (ses.sut !== undefined && !['no', 'abs', 'non'].includes(ses.sut)) delete ses.sut;
    if (Array.isArray(ses.oth)) { let price = null;
      for (const o of ses.oth.slice(0, 20)) { if (!o || typeof o.t !== 'string' || !o.t.trim().startsWith(M45_GD)) continue;
        const a = Number(toEnD(String(o.amt == null ? '' : o.amt)).replace(/[^\d.]/g, '')) || 0; if (a > 0) continue;
        if (price === null) { const s = await settings(db); price = m14N(((((s || {}).prices) || {}).arc_sgd || {}).price) || 0; } if (!price) continue;
        const n = /هر دو/.test(o.t) ? 2 : 1; o.amt = price * n; if (req.actual !== undefined && req.actual !== null && Number.isFinite(Number(req.actual))) req.actual = Number(req.actual) + price * n; } } } } catch (e) { console.error('m45a pre', e && e.message); }
  const r = await _ss45.apply(this, arguments);
  try { if (r && r.ok && req && req.finish) { const o = await getRow(db, req.id), sg = o && parse(o.surg, null);
    if (sg && sg.finished) { const p = Number(sg.planned) || 0, a = Number(sg.actual) || 0;
      if (p > 0 && Math.abs(a - p) > Math.max(0.3 * p, 5e6)) await fx7Ev(db, o.id, 'surgAmt', 'اختلاف زیاد هزینه‌ی جراحی با طرح', 'طرح ' + p + ' تومان · انجام‌شده ' + a + ' تومان · اختلاف ' + (a - p), tcut(req.by || (req.session || {}).by, 60), req._role || 'surgery').run(); } } } catch (e) { console.error('m45a post', e && e.message); }
  return r; }; }
