/* ---------- m54b (owner, 2026-11-18): patients whose surgery cost difference waits for settlement belong to reception's cartable, not the consultant's:
   the consultant's queue no longer carries them (unless the patient is in the consultant's own queue for a plan). Reception already has the list
   «تسویه‌ی اختلاف جراحی» and the full settlement form (m50a). ---------- */
queue0 = (orig => async function (db, v, sv, role, td) { const r = await orig.apply(this, arguments);
  try { if (role === 'consultant' && r && r.ok && Array.isArray(r.items)) r.items = r.items.filter(x => !(x && x.settle === 'pending' && x.queue !== 'consult' && x.queue !== 'consulting')); } catch (e) { console.error('m54b', e && e.message); }
  return r; })(queue0);
