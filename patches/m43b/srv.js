/* ---------- m43b (owner, 2026-11-17): the manager corrects a recorded surgery session on any later day (the assistant only on the same day, m42d).
   A later-day correction changes what was recorded — implants, fixtures, parts, doctors, materials — and its consequences in numbers: the store gets
   the difference of fixtures/parts, the surgery amount is replaced, and a changed amount of a finished surgery goes to «منتظر تسویه». It does NOT
   redo the follow-ups, appointments, the «last session» mark or the prosthesis stage: those already happened in the days since. ---------- */
const m43bBag = ses => { const B = []; for (const k of Object.keys((ses && ses.imp) || {}).slice(0, 40)) { const m = ses.imp[k] || {};
  if (m.b && m.d && m.l && m.src !== 'loan') B.push([{ kind: 'fix', b: m.b, sys: m.sys, d: m.d, l: m.l }, (m.rs === 'fail' && Number(m.rep)) ? 2 : 1]);
  if ((m.ht === 'heal' || m.ht === 'cover') && m.b) B.push([{ kind: m.ht, b: m.b, sys: m.sys, d: m.hs || '-' }, 1]); } return B; };
async function m43bFix(db, req, role) {
  if (role !== 'manager') return { ok: false, error: 'اصلاح جلسه‌ی جراحی در روزهای بعد فقط با مدیر است.' };
  const id = String(req.id || ''), n = Math.round(Number(req.n) || 0), o = await getRow(db, id); if (!o) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const sg = parse(o.surg, null) || {}, S = Array.isArray(sg.sessions) ? sg.sessions : [], old = S[n - 1];
  if (!old) return { ok: false, error: 'این جلسه در پرونده پیدا نشد.' };
  if (sg.arc) return { ok: false, error: 'جلسه‌های پرونده‌ی کاغذی از «ویرایش پرونده‌ی کاغذی» اصلاح می‌شوند.' };
  const ses = req.session && typeof req.session === 'object' ? req.session : null; if (!ses) return { ok: false, error: 'اطلاعات جلسه نرسید.' };
  if (JSON.stringify(ses).length > 200000) return { ok: false, error: 'اطلاعات جلسه بیش از حد بزرگ است.' };
  { const imp = ses.imp && typeof ses.imp === 'object' ? ses.imp : {}; const bad = Object.keys(imp).filter(k => { const m = imp[k] || {}; return !String(m.b == null ? '' : m.b).trim() || !String(m.d == null ? '' : m.d).trim() || !String(m.l == null ? '' : m.l).trim(); });
    if (bad.length) return { ok: false, error: 'برند، قطر و طول فیکسچر این دندان‌ها ثبت نشده: ' + bad.slice(0, 12).map(k => tcut(k, 4)).join('، ') }; }
  const actual = Math.round(Number(toEnD(req.actual))); if (!Number.isFinite(actual) || actual < 0 || actual > 1e13) return { ok: false, error: 'مبلغ جلسه نامعتبر است.' };
  const by = tcut(req.by, 60) || 'مدیر', now = nowIso(), ops = [];
  const neu = Object.assign({}, ses, { n, at: old.at, jalali: old.jalali, savedAt: old.savedAt, fu: old.fu, unc: old.unc, tmp: old.tmp });
  neu.st = p5CleanSt(neu.st); if (!Object.keys(neu.st).length) delete neu.st;
  if (neu.oth !== undefined) { const L = (Array.isArray(neu.oth) ? neu.oth : []).slice(0, 200).map(x => { const t = tcut(String((x && x.t) || '').trim(), 80), raw = toEnD(String(x && x.amt != null ? x.amt : '')).trim(), v = /^-/.test(raw) ? 0 : Math.round(Number(raw.replace(/[^\d.]/g, ''))); return t ? { t, amt: Number.isFinite(v) && v > 0 && v <= 1e10 ? v : 0 } : null; }).filter(Boolean).slice(0, 20); if (L.length) neu.oth = L; else delete neu.oth; }
  if (old.clk) neu.clk = old.clk;
  neu.edited = { at: now, by, c: ((old.edited && Number(old.edited.c)) || 0) + 1, mgr: 1 };
  /* store: the difference between what was recorded and what is recorded now */
  const net = {}; for (const [bag, sign] of [[m43bBag(old), 1], [m43bBag(neu), -1]]) for (const [spec, q] of bag) { const it = await invFind(db, spec); net[it.id] = (net[it.id] || 0) + sign * q; }
  let moved = 0; for (const item of Object.keys(net)) { const d = net[item]; if (!d) continue; ops.push(...invMoveOps(db, item, d, 'use', by, 'اصلاح جلسه‌ی ' + n + ' جراحی توسط مدیر — ' + (d > 0 ? 'برگشت به انبار' : 'مصرف اضافه'), o.id, o.name)); moved += Math.abs(d); }
  if (moved) ops.push(invBump(db));
  S[n - 1] = neu; const was = Number(sg.actual) || 0; sg.actual = actual; let settle = o.settle || '';
  if (sg.finished) { sg.diff = sg.actual - (Number(sg.planned) || 0); const nd = sg.diff - (Number(sg.settledDiff) || 0); settle = nd ? 'pending' : (o.settle === 'done' || Number(sg.settledDiff) ? 'done' : ''); }
  if (JSON.stringify(sg).length > 1500000) return { ok: false, error: 'اطلاعات جراحی این بیمار بیش از حد بزرگ است.' };
  ops.push(db.prepare('UPDATE plans SET surg=?, settle=?, updatedAt=? WHERE id=?').bind(JSON.stringify(sg), settle, now, o.id),
    fx7Ev(db, o.id, 'surgFix', 'جلسه‌ی ' + n + ' جراحی توسط مدیر اصلاح شد', [moved ? 'انبار: ' + moved + ' قلم جابه‌جا شد' : 'انبار بدون تغییر', was !== actual ? 'هزینه‌ی جراحی از ' + was + ' به ' + actual + ' تومان' : ''].filter(Boolean).join(' · '), by, role), bump(db));
  await db.batch(ops);
  let out = { ok: true, n, settle, moved };
  try { if (settle === 'pending') { const x = await fx7NetPlan(db, o.id, by, 'manager'); if (x && x.used) { out.settle = x.settle; out.fx7net = x.used; } } } catch (e) { console.error('m43b net', e && e.message); }
  try { await xlAuto(db, o.id, tehranDay(old.at), by); } catch (e) { console.error('m43b xl', e && e.message); }
  try { FIN_FP = ''; FIN_SYNC_AT = 0; } catch (e) { }
  req.note = 'اصلاح جلسه‌ی ' + n + ' توسط مدیر';
  return out;
}
MGR_ACTIONS.surgFix = 1;
{ const _ar43b = arc6Route; arc6Route = async function (db, req, role) {
  if (req && req.action === 'surgFix') return once(db, req.sendId, () => m43bFix(db, req, role), 'surgFix');
  return _ar43b.apply(this, arguments); }; }
