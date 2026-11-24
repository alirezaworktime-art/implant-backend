/* ---------- m41b (owner, 2026-11-17): a paper file whose earlier payments are more than its cost after discount leaves the patient in credit
   (the owner's new rule; it replaces the 22 Aban rule that raised the file total to the payments). Only when the file neither says «حساب تسویه است»
   nor gives a remaining debt: those two still fix the balance the file states. Files stored under the old rule are recomputed once. ---------- */
arc6Sync = async function (db, id) {
  const o = await getRow(db, String(id || '')); if (!o) return; const d = parse(o.data, {}) || {}, a = d.arc; if (!a || !a.v6) return;
  const entry = tehranDay(a.at || o.createdAt) || tehranDay();
  const p = await db.prepare(`SELECT kind, amount, st, at FROM pays WHERE plan=? AND st<>'del'`).bind(o.id).all();
  let paid = 0; for (const x of p.results) { if (!(x.kind === 'arc' || tehranDay(x.at) < entry)) continue; const v = Number(x.amount) || 0; if (x.st === 'ok') paid += v; else if (x.st === 'wait' && x.kind === 'chq') paid += v; }
  const net = Number(a.net) || 0, rem = a.rem == null || a.rem === '' ? null : Number(a.rem) || 0;
  const stated = !!a.settled || rem != null;
  const imp = a.settled ? Math.max(0, net - paid) : rem != null ? Math.max(0, net - paid - rem) : 0, want = paid + (!a.settled && rem != null ? rem : 0), vt = Math.max(net - imp, stated && want > net ? want : 0), over = vt - (net - imp);
  if (a.imp === imp && a.vt === vt && (Number(a.over) || 0) === over && (d.fx4c || Number(o.total) === vt)) return;
  a.imp = imp; a.vt = vt; a.over = over;
  const ops = [db.prepare('UPDATE plans SET data=?, updatedAt=? WHERE id=?').bind(JSON.stringify(d), nowIso(), o.id), bump(db)];
  if (!d.fx4c) ops.push(db.prepare('UPDATE plans SET total=? WHERE id=?').bind(vt, o.id));
  await db.batch(ops); FIN_FP = ''; FIN_SYNC_AT = 0;
};
/* once: the files stored with a raised total */
let M41B_DONE = false;
async function m41bMig(db) {
  if (M41B_DONE) return; M41B_DONE = true;
  try { if (await kvGet(db, 'm41bArc')) return;
    const ids = (await db.prepare(`SELECT id FROM plans WHERE id LIKE 'arc-%' AND data LIKE '%"over":%'`).all()).results.map(r => r.id); let n = 0;
    for (const id of ids) { try { const o = await getRow(db, id), a = ((parse(o && o.data, {}) || {}).arc) || {}; if ((Number(a.over) || 0) > 0) { await arc6Sync(db, id); n++; } } catch (e) { console.error('m41b mig', id, e && e.message); } }
    await kvSet(db, 'm41bArc', nowIso() + ' ' + n).run();
  } catch (e) { M41B_DONE = false; console.error('m41b mig', e && e.message); }
}
{ const _h41b = handle; handle = async function (req, env) { try { if (env && env.DB && req && req.password) await m41bMig(env.DB); } catch (e) { } return _h41b.apply(this, arguments); }; }
