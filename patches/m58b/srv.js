
/* ---------- m58b (owner, 2026-11-20): the lab order from the prosthesis card («سفارش لابراتوار») has no mandatory field.
   The page marks it with order.m58 = 1 (action labNew only). It is handled like the m47a work order (order.m47): no sheet fields, teeth or
   base-pontic map are required; an empty «ساخت برای» becomes the first step that fits the patient's route; empty teeth = the base-pontic map;
   a missing date = 10 days (labNew). Route rules (f7cForErr) stay for a chosen «ساخت برای». ---------- */
{ const _n58 = labNew; labNew = async function (db, req) {
  try { const ord = req && req.action === 'labNew' && req.order && typeof req.order === 'object' && req.order.m58 ? req.order : null;
    if (ord) { ord.m47 = 1; if (!isDay(req.due)) delete req.due;
      const o = await getRow(db, String(req.id || '')), pr = o ? parse(o.pros, null) : null;
      if (pr && pr.stage && !['pause', 'fail'].includes(pr.stage)) {
        const t = pr2Type(pr);
        if (!String(ord.for || '')) { const c = (F7C_FOR[t] || F7C_FOR.fix).concat(['tmp']).find(f => !f7cForErr(pr, f)); if (c) ord.for = c; }
        const TK = v => /^([UL][RL][1-8]|[1-4][1-8])$/.test(String(v));
        if (!(Array.isArray(ord.teeth) ? ord.teeth : []).some(TK) && pr.map && typeof pr.map === 'object') { const M = pk4Pt(pr.map); ord.teeth = Object.keys(M); ord.pon = Object.keys(M).filter(k => M[k] === 'p'); }
      }
    }
  } catch (e) { console.error('m58b labNew', e && e.message); }
  return _n58.apply(this, arguments); }; }
