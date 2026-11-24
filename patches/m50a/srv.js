/* ---------- m50a (owner, 2026-11-18):
   (A) a plan saved with h.gen («بیمار نیاز به مشاوره‌ی دندانپزشک عمومی دارد») makes one reception task of kind «gen» (once per file); unticking closes an open one;
   (B) reception queue: a patient waiting for discharge (surgery done, not discharged) carries «owe» = what the discharge gate still asks for (fx4Short step dis). ---------- */
async function m50Gen(db, id, h, name) {
  const OFF = 'گزینه‌ی مشاوره‌ی عمومی برداشته شد', on = !!(h && h.gen), ex = await db.prepare("SELECT id, done, note FROM tasks WHERE plan=? AND kind='gen' ORDER BY created DESC").bind(id).first();
  if (on && (!ex || (Number(ex.done) && ex.note === OFF))) await db.batch([taskIns(db, { id, name: tcut(name || (h && h.name) || '', 120) }, 'gen', tehranDay(), tcut((h && h.genN) || '', 200), tcut((h && h.phone) || '', 30)), bump(db)]);
  else if (!on && ex && !Number(ex.done)) await db.batch([db.prepare('UPDATE tasks SET done=1, doneAt=?, note=? WHERE id=? AND done=0').bind(nowIso(), OFF, ex.id), bump(db)]);
}
{ const _s50 = save; save = async function (db, rec, extra) { const r = await _s50.apply(this, arguments);
  try { if (r && r.ok && !r.stale && rec && rec.id && rec.data && typeof rec.data === 'object' && rec.data.h) await m50Gen(db, String(rec.id), rec.data.h, rec.name); } catch (e) { console.error('m50a gen', e && e.message); }
  return r; }; }
queue0 = (orig => async function (db, v, sv, role, td) {
  const r = await orig.apply(this, arguments);
  if (role === 'staff' && r && r.ok && Array.isArray(r.items)) { try {
    const L = r.items.filter(x => x && x.sg && x.sg.lastDay && !x.sg.dis).slice(0, 60);
    for (const it of L) { const o = await getRow(db, it.id); if (!o) continue; const s = await fx4Short(db, o, 'dis'); if (s > 0) it.owe = s; }
  } catch (e) { console.error('m50a owe', e && e.message); } }
  return r; })(queue0);
