/* ---------- m46c (owner, 2026-11-17): «سایر خدمات» of a surgery session — beside name and amount (session.oth, m31) every row can carry teeth, a count
   and the doctor who did it: session.othx = [{ teeth, n, doc }], row i of othx belongs to row i of oth. ---------- */
{ const _ss46 = surgSave; surgSave = async function (db, req) {
  try { const ses = req && req.session; if (ses && typeof ses === 'object' && ses.othx !== undefined) {
    const n = Array.isArray(ses.oth) ? ses.oth.filter(o => o && String(o.t || '').trim()).length : 0;
    const L = (Array.isArray(ses.othx) ? ses.othx : []).slice(0, Math.min(20, n)).map(x => { x = x && typeof x === 'object' ? x : {}; const c = Math.round(Number(toEnD(String(x.n == null ? '' : x.n)).replace(/[^\d]/g, ''))) || 0;
      return { teeth: (Array.isArray(x.teeth) ? x.teeth : []).map(String).filter(k => /^[UL][RL][1-8]$/.test(k)).filter((k, i, a) => a.indexOf(k) === i).slice(0, 32), n: c > 0 && c <= 99 ? c : 0, doc: tcut(String(x.doc || '').trim(), 60) }; });
    if (L.some(x => x.teeth.length || x.n || x.doc)) ses.othx = L; else delete ses.othx; } } catch (e) { console.error('m46c', e && e.message); if (req && req.session) delete req.session.othx; }
  return _ss46.apply(this, arguments); }; }
