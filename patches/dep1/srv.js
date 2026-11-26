/* ---------- dep1 (owner, 2026-11-26): editing a confirmed plan corrects the recorded deposit (بیعانه) ---------- */
/* The deposit typed at the consultation becomes a pays row only once (pl10Dep, pid 'dep-<id36>-f'); editing the plan later
   never touched it, so the patient PDF and the debt kept the first amount. depEdit(id, amount = the new total deposit):
   - higher: one more row «بیعانه (تکمیلی)» for the difference, today (the first day's cash report stays as it was);
   - lower / 0: the newest deposit rows are voided with the usual guards (closed cash day, locked period, refunds) and a
     corrected row with the remainder keeps the original date; if anything fails, every voided row is put back.
   The debt follows by itself (fx4Bal counts pays). Roles: consultant, manager, reception. Written to the patient history. */
async function depEdit(db, req, role) {
  const o = await getRow(db, req.id); if (!o) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const amt = Number(req.amount); if (!Number.isFinite(amt) || amt < 0 || amt !== Math.floor(amt)) return { ok: false, error: 'مبلغ بیعانه درست نیست.' };
  const pre = 'dep-' + o.id.slice(0, 36) + '-', by = tcut((req.pay || {}).by, 40) || '';
  const rows = (await db.prepare(`SELECT * FROM pays WHERE plan=? AND st<>'del' AND kind<>'chq' AND substr(id,1,?)=? AND note LIKE '%بیعانه%' ORDER BY at, id`).bind(o.id, pre.length, pre).all()).results || [];
  const old = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0), d = amt - old;
  if (!d) return { ok: true, same: 1, from: old, to: amt };
  const done = async (txt, extra) => { FIN_SYNC_AT = 0; FIN_FP = ''; await bump(db).run(); try { await fx7Ev(db, o.id, 'dep1', 'بیعانه اصلاح شد', evMoney(old) + ' → ' + evMoney(amt) + (txt ? ' — ' + txt : ''), by, role).run(); } catch (e) { } return Object.assign({ ok: true, from: old, to: amt }, extra); };
  if (d > 0) {
    const r = await payAdd(db, { id: o.id, pid: pre + 'x' + Date.now().toString(36), pay: Object.assign({}, req.pay || {}, { amount: d, part: 's', note: 'بیعانه (تکمیلی)' }) });
    if (!r || !r.ok) return r || { ok: false, error: 'ثبت بیعانه ناموفق بود.' };
    return done('بیعانه‌ی تکمیلی ' + evMoney(d), { added: d, id: r.id });
  }
  let need = -d; const voided = [];
  const undo = async () => { for (const v of voided) await db.prepare('UPDATE pays SET st=?, note=?, upd=? WHERE id=?').bind(v.st, v.note, nowIso(), v.id).run(); if (voided.length) { FIN_SYNC_AT = 0; FIN_FP = ''; await bump(db).run(); } };
  for (const r of rows.slice().reverse()) {
    if (need <= 0) break;
    const x = await fx4PaySet(db, { pid: r.id, st: 'del', note: 'اصلاح بیعانه: ' + old + ' → ' + amt }, role);
    if (!x || !x.ok) { await undo(); return { ok: false, error: x && x.rfAck ? 'این بیعانه پشتوانه‌ی استرداد ثبت‌شده‌ی بیمار است؛ اول استرداد را بررسی کنید.' : (x && x.error) || 'اصلاح بیعانه ممکن نشد.' }; }
    voided.push(r); need -= Number(r.amount) || 0;
  }
  const rest = -need, last = voided[voided.length - 1]; let nid = '';
  if (rest > 0 && last) {
    const r = await payAdd(db, { id: o.id, pid: pre + 'c' + Date.now().toString(36), pay: { kind: last.kind, pos: last.pos || '', acct: last.bank || '', bank: last.bank || '', part: last.part || 's', amount: rest, by: last.by || by, note: 'بیعانه' } });
    if (!r || !r.ok) { await undo(); return r || { ok: false, error: 'ثبت بیعانه‌ی اصلاح‌شده ناموفق بود.' }; }
    nid = r.id; await db.prepare('UPDATE pays SET at=? WHERE id=?').bind(last.at, nid).run(); /* the corrected deposit keeps its original day */
  }
  return done(amt ? '' : 'بیعانه حذف شد', { voided: voided.length, id: nid });
}
STAFF_ACTIONS.depEdit = 1; MGR_ACTIONS.depEdit = 1;
{ const _ardep = arc6Route; arc6Route = async function (db, req, role) { if (req && req.action === 'depEdit') { if (!['consultant', 'manager', 'staff'].includes(role)) return { ok: false, error: 'اصلاح بیعانه با مشاور، مدیر یا پذیرش است.' }; return once(db, req.sendId, () => depEdit(db, req, role), 'depEdit'); } return _ardep.apply(this, arguments); }; }
