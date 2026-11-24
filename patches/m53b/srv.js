/* ---------- m53b (owner, 2026-11-18): tidy-up of m53a after the second audit:
   the «nodis» task also closes by itself 60 days after the last surgery day (when no cost difference is open) — nobody discharges that late;
   «pweek» (call one week after delivery) closes when it is 30 days overdue, like «numb» and «week». ---------- */
{ const _t53 = m53Tick; m53Tick = async function (db) { await _t53.apply(this, arguments);
  const now = nowIso(); let ch = 0; const run = async st => { const r = await st.run(); ch += (r && r.meta && r.meta.changes) || 0; };
  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND kind='nodis' AND plan IN (SELECT id FROM plans WHERE COALESCE(settle,'')<>'pending' AND surg IS NOT NULL AND json_valid(surg) AND COALESCE(json_extract(surg,'$.lastDay'),'')<>'' AND json_extract(surg,'$.lastDay')<?)`).bind(now, 'خودکار: بیش از ۶۰ روز از جراحی گذشت', addDays(-60)));
  await run(db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=? WHERE done=0 AND kind='pweek' AND due<?`).bind(now, M53_OLD, addDays(-30)));
  if (ch) await db.batch([bump(db)]); }; }
