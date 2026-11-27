/* ---------- o3s (owner, 2026-11-27): option 3 «۷۰٪ نقد» = the agreed % (default 70) of the SURGERY part, not of the whole plan ---------- */
/* Before surgery (and at discharge, plus a surgery cost difference) reception must have pct% of the surgery part; the rest
   (rest of the surgery part + the prosthesis part) has no cheque and is paid any time, any amount, until the impression day
   ('deliv' = total − paid, unchanged). S is the surgery part rescaled to the plan total, exactly as the base fx4Short does;
   plans without parts fall back to the whole plan. Rounded to 100,000 like the page. Applies to every option-3 plan. */
{ const _fso3 = fx4Short; fx4Short = async function (db, o, step) {
  try { if (o && step !== 'deliv') { const d = parse(o.data, {}) || {}; if (pl10Opt3(d)) {
    const b = await fx4Bal(db, o), T = Math.max(0, Number(o.total) || 0), pt = d.parts && typeof d.parts === 'object' ? d.parts : null;
    const pS = pt ? Math.max(0, Number(pt.S) || 0) : 0, pP = pt ? Math.max(0, Number(pt.P) || 0) : 0;
    const S = pt && pS + pP > 0 && T ? Math.round(pS * T / (pS + pP)) : T;
    const need = Math.min(T, Math.round(S * pl10Pct(d) / 100 / 1e5) * 1e5), got = b.paid + b.wait;
    return Math.max(0, (step === 'dis' ? need + Math.max(0, (b.diff || 0) - (b.waived || 0)) : need) - got); } } } catch (e) { console.error('o3s short', e && e.message); }
  return _fso3.apply(this, arguments); }; }
