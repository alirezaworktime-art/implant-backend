/* ---------- m49a (owner, 2026-11-18): manager report «ایمپلنت‌های مصرفی» — each row carries the file id and the kind of the fixture
   (rs: new = placed, redo = re-implant, fail = early failure), read from the surgery session of that tooth (plans.surg; paper files have sessions too).
   The second fixture placed in the same session after an early failure counts as placed. ---------- */
{ const _m49 = m1Rep; m1Rep = async function (db, req, role) { const r = await _m49.apply(this, arguments);
  try { if (r && r.ok && r.imp && Array.isArray(r.imp.rows) && r.imp.rows.length) {
    const ids = [...new Set(r.imp.rows.map(x => x.id).filter(Boolean))], M = {};
    for (let i = 0; i < ids.length; i += 80) { const part = ids.slice(i, i + 80);
      const q = await db.prepare('SELECT id, surg FROM plans WHERE id IN (' + part.map(() => '?').join(',') + ')').bind(...part).all();
      for (const p of (q.results || [])) { const sg = parse(p.surg, null), T = M[p.id] = {};
        ((sg && sg.sessions) || []).forEach(ss => { const d = String((ss && ss.at) || '').slice(0, 10); Object.keys((ss && ss.imp) || {}).forEach(k => { const m = ss.imp[k] || {}, kk = String(k).replace(/b+$/, ''); (T[kk] = T[kk] || []).push({ d, rs: m.rs === 'fail' ? 'fail' : (m.rs === 'redo' || Number(m.ri) > 0) ? 'redo' : 'new' }); }); }); } }
    r.imp.rows.forEach(x => { let rs = x.fail && !x.second ? 'fail' : 'new'; const L = (M[x.id] || {})[x.tooth];
      if (L && L.length) { let best = L[0], bd = Infinity; const t0 = Date.parse(x.day); L.forEach(c => { const dd = Math.abs(Date.parse(c.d) - t0); if (dd < bd) { bd = dd; best = c; } }); rs = best.rs; }
      if (x.second) rs = 'new'; x.rs = rs; });
  } } catch (e) { console.error('m49a imp', e && e.message); }
  return r; }; }
