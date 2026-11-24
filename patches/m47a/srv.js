/* ---------- m47a (owner, 2026-11-17): prosthesis session — «ارسال کار برای لابراتوار» opens the work order with no mandatory field.
   The page marks such an order with order.m47 = 1. For that order: the sheet fields (implant / type / material), the teeth and the base-pontic map are not required,
   a missing «ساخت برای» becomes the first step that fits the patient's route, missing teeth come from the teeth of the session, a missing date = 10 days (labNew).
   Route rules (f7cForErr: paused, All-on-X temporary first, impression first) stay. Other order paths (reception, the lab's own order) are unchanged. ---------- */
{ const _e47 = l8OrdErr; l8OrdErr = function (o) { if (o && o.m47) return ''; return _e47.apply(this, arguments); }; }
{ const _f47 = f7cOrderErr; f7cOrderErr = function (pr, ord, asImpr) {
  if (!(ord && ord.m47)) return _f47.apply(this, arguments);
  const d = cleanOrder(ord), p = asImpr && ['heal', 'tmpd'].includes(pr.stage) && d.for !== 'tmp' ? Object.assign({}, pr, { stage: 'impr' }) : pr;
  return f7cForErr(p, d.for); }; }
{ const _p47 = prosSess; prosSess = async function (db, req) {
  try { const ord = req && req.order && typeof req.order === 'object' && req.order.m47 ? req.order : null;
    if (ord) { ord.m47 = 1; if (!isDay(req.due)) delete req.due;
      const o = await getRow(db, String(req.id || '')), pr = o ? parse(o.pros, null) : null;
      if (pr && pr.stage && !['pause', 'fail'].includes(pr.stage)) {
        const asImpr = req.work === 'impr' || req.work === 'crimpr', t = pr2Type(pr);
        const P = f => asImpr && ['heal', 'tmpd'].includes(pr.stage) && f !== 'tmp' ? Object.assign({}, pr, { stage: 'impr' }) : pr;
        const cur = String(ord.for || '');
        if (!cur || f7cForErr(P(cur), cur)) { const c = ['tmp'].concat(F7C_FOR[t] || F7C_FOR.fix).find(f => !f7cForErr(P(f), f)); if (c) ord.for = c; }
        const TK = v => /^([UL][RL][1-8]|[1-4][1-8])$/.test(String(v));
        if (!(Array.isArray(ord.teeth) ? ord.teeth : []).some(TK)) { const pt = pk4Pt(req.pt), K = Object.keys(pt); if (K.length) { ord.teeth = K; ord.pon = K.filter(k => pt[k] === 'p'); } else if (pr.map && typeof pr.map === 'object') { const M = pk4Pt(pr.map); ord.teeth = Object.keys(M); ord.pon = Object.keys(M).filter(k => M[k] === 'p'); } }
      }
    }
  } catch (e) { console.error('m47a prosSess', e && e.message); }
  return _p47.apply(this, arguments); }; }
{ const _n47 = labNew; labNew = async function (db, req) { try { if (req && req.action && req.order && typeof req.order === 'object') delete req.order.m47; } catch (e) { } return _n47.apply(this, arguments); }; }
