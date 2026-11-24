/* ---------- m42e (surgery-day audit, item 3; 2026-11-17): the time of a surgery session came from the tablet clock, so a tablet with a wrong date put
   the session, its invoice and its accounting voucher on a wrong day. A session time in the future (more than 10 minutes) or older than 7 days is
   replaced by the server time; the tablet's value is kept in «clk». Sessions waiting in the tablet's offline queue (hours, a few days) keep their time. ---------- */
{ const _s42e = surgSave; surgSave = async function (db, req) {
  try { const ses = req && req.session; if (ses && typeof ses === 'object') { const t = Date.parse(ses.at), now = Date.now();
    if (!Number.isFinite(t) || t > now + 10 * 60000 || t < now - 7 * 864e5) { ses.clk = tcut(String(ses.at == null ? '' : ses.at), 40); ses.at = nowIso(); ses.jalali = pr2J(tehranDay()); } } }
  catch (e) { console.error('m42e clock', e && e.message); }
  return _s42e.apply(this, arguments); }; }
