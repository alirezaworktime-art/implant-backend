/* ---------- m43d (owner, 2026-11-17): temporary prosthesis — PMMA tooth by tooth, Essix and denture by jaw, each with its own tariff.
   Paper files: two new treatments «روکش موقت Essix» (esx) and «روکش موقت دنچر» (dnt), counted by jaw (scan U / L / B like the surgical guide);
   in «مراحل پروتز» the PMMA steps carry teeth and the Essix step carries the jaw. Accounting: two services so the manager can set tariff and
   doctor share for each. ---------- */
const M43D_ES = 'روکش موقت Essix', M43D_DN = 'روکش موقت دنچر';
try { ARC6_K.esx = 1; ARC6_K.dnt = 1; M2_NO_I.esx = 1; M2_NO_I.dnt = 1; M1_ARC_NM.esx = M43D_ES; M1_ARC_NM.dnt = M43D_DN; M14_SVC.tmp_es = M43D_ES; M14_SVC.tmp_dn = M43D_DN;
  if (!M35_KEYS.includes('esx')) M35_KEYS.push('esx', 'dnt'); A13_TEETH.pmma = 1; A13_TEETH.pmmail = 1; } catch (e) { console.error('m43d maps', e && e.message); }
let M43D_READY = false;
{ const _fi43d = finInit; finInit = async function (db) { const r = await _fi43d.apply(this, arguments);
  if (!M43D_READY) { M43D_READY = true; try { const s = await settings(db), P = (s && s.prices) || {}, tmp = await db.prepare(`SELECT ord FROM fin_svc WHERE name=?`).bind(M1_ARC_NM.tmp).first(), ord = (tmp && Number(tmp.ord)) || 900;
    await db.batch([['svm43es', M43D_ES, 'tmp_es'], ['svm43dn', M43D_DN, 'tmp_dn']].map(([id, n, k]) => db.prepare('INSERT OR IGNORE INTO fin_svc (id,name,cat,price,rule,ord,active) SELECT ?,?,?,?,?,?,1 WHERE NOT EXISTS (SELECT 1 FROM fin_svc WHERE name=?)').bind(id, n, 'p', m14N((P[k] || {}).price) || 0, 'doctor', ord, n))); } catch (e) { M43D_READY = false; console.error('m43d init', e && e.message); } }
  return r; }; }
const M43D_J = ['U', 'L', 'B'];
{ const _l043d = a6Lines0; a6Lines0 = function (L, td) { const r = _l043d.apply(this, arguments);
  try { if (r && Array.isArray(r.lines) && Array.isArray(L) && r.lines.length === L.length) r.lines.forEach((o, i) => { const x = L[i] || {};
    if (o.k === 'esx' || o.k === 'dnt') { o.scan = M43D_J.includes(x.scan) ? x.scan : 'U'; o.n = o.scan === 'B' ? 2 : 1; o.amt = o.n * o.price; o.teeth = []; }
    else if (o.k === 'pros' && o.ty === 'essix' && M43D_J.includes(x.scan)) o.scan = x.scan; }); } catch (e) { console.error('m43d lines', e && e.message); }
  return r; }; }
/* a PMMA step saved before this patch has no teeth; it can still be saved again */
{ const _c43d = a13Chk; a13Chk = function (x) { if (x && x.k === 'pros' && (x.ty === 'pmma' || x.ty === 'pmmail') && !(Array.isArray(x.teeth) && x.teeth.length)) return ''; return _c43d.apply(this, arguments); }; }
