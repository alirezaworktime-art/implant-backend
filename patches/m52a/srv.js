/* ---------- m52a (owner, 2026-11-18): after the surgery day the cash discount is only on the surgery part.
   m52SurgDisc {id, op: info|on|off} (reception, consultant): «on» takes pct% (the plan's own discount percent, else 5) of the surgery part off the
   patient's account (surg.waived, like «رایگان»), remembered in surg.m52d so that «off» gives it back. The plan, its total and the prosthesis part
   are not changed. Refused before surgery, when the plan has its own cash discount, or when a cheque of the surgery part is registered. ---------- */
const m52Rnd = v => v >= 1e6 ? Math.round(v / 1e6) * 1e6 : Math.round(v);
const M52_NOTE = /( · )?تخفیف [\d.]+٪ پرداخت نقدی پارت جراحی/;
async function m52SurgDisc(db, req, role) {
  if (!['staff', 'consultant'].includes(role)) return { ok: false, error: 'این کار با منشی یا مشاور است.' };
  const o = await getRow(db, String(req.id || '')); if (!o) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const d = parse(o.data, {}) || {}, sg = parse(o.surg, null) || null, op = String(req.op || 'info'), pay = d.pay && typeof d.pay === 'object' ? d.pay : {};
  const cur = sg && sg.m52d && typeof sg.m52d === 'object' ? sg.m52d : null, N = v => Number(toEnD(String(v == null ? '' : v)).replace(/[^\d.]/g, ''));
  let why = '';
  if (!['confirmed', 'modified'].includes(o.status)) why = 'طرح این بیمار تأیید نشده است.';
  else if (!sg || !(sg.sessions || []).length) why = 'این تخفیف برای بعد از روز جراحی است.';
  else if (pay.m50o || String(pay.mode) === 'cash' || (N(pay.cs) >= 100 && N(pay.cp) >= 100)) why = 'طرح این بیمار خودش تخفیف پرداخت نقدی دارد.';
  const pt = d.parts && typeof d.parts === 'object' ? d.parts : null, T = Math.max(0, Number(o.total) || 0), s0 = pt ? Math.max(0, Number(pt.S) || 0) : 0, p0 = pt ? Math.max(0, Number(pt.P) || 0) : 0;
  const S = s0 + p0 > 0 && T ? Math.round(s0 * T / (s0 + p0)) : s0, pv = N(pay.disc), pct = pv > 0 && pv <= 100 ? pv : 5, amt = m52Rnd(S * pct / 100);
  if (!why && !(amt > 0)) why = 'پارت جراحی این طرح مبلغی ندارد.';
  if (op === 'info') return { ok: true, on: cur ? 1 : 0, amt: cur ? Number(cur.amt) || 0 : amt, pct: cur ? Number(cur.pct) || pct : pct, S, can: why ? 0 : 1, why };
  if (op !== 'on' && op !== 'off') return { ok: false, error: 'درخواست درست نیست.' };
  if ((op === 'on') === !!cur) return { ok: true, same: 1, on: cur ? 1 : 0 };
  const now = nowIso(), who = tcut((req._user && req._user.name) || req.by || ({ staff: 'منشی', consultant: 'مشاور' })[role], 60);
  let a;
  if (op === 'on') { if (why) return { ok: false, error: why };
    const cq = await db.prepare("SELECT COUNT(*) c FROM pays WHERE plan=? AND kind='chq' AND st IN ('wait','ok') AND COALESCE(part,'s')<>'p'").bind(o.id).first();
    if (cq && Number(cq.c) > 0) return { ok: false, error: 'برای پارت جراحی این بیمار چک ثبت شده است؛ تخفیف نقدی فقط وقتی است که پارت جراحی نقد پرداخت شود.' };
    a = amt; sg.waived = (Number(sg.waived) || 0) + a; sg.m52d = { amt: a, pct, at: now, by: who };
    sg.waiveNote = tcut((sg.waiveNote ? sg.waiveNote + ' · ' : '') + 'تخفیف ' + pct + '٪ پرداخت نقدی پارت جراحی', 300);
  } else { a = Number(cur.amt) || 0; sg.waived = Math.max(0, (Number(sg.waived) || 0) - a); delete sg.m52d; sg.waiveNote = String(sg.waiveNote || '').replace(M52_NOTE, '').replace(/^ · /, ''); }
  await db.batch([db.prepare('UPDATE plans SET surg=?, updatedAt=? WHERE id=?').bind(JSON.stringify(sg), now, o.id),
    db.prepare("INSERT INTO events (id,plan,at,user,role,kind,cat,title,detail,undo,undone) VALUES (?,?,?,?,?,?,?,?,?,'',0)").bind(uuid(), o.id, now, who, role, 'm52SurgDisc', 'fin', op === 'on' ? 'تخفیف نقدی پارت جراحی' : 'برداشتن تخفیف نقدی پارت جراحی', tcut((op === 'on' ? pct + '٪ از پارت جراحی ' + S + ' = ' : 'برگشت ') + a + ' تومان', 300)), bump(db)]);
  return { ok: true, on: op === 'on' ? 1 : 0, amt: a };
}
STAFF_ACTIONS.m52SurgDisc = 1; AUDIT_SKIP.m52SurgDisc = 1; FX4_SGM.push('m52d');
{ const _ar52 = arc6Route; arc6Route = async function (db, req, role) { if (req && req.action === 'm52SurgDisc') return m52SurgDisc(db, req, role); return _ar52.apply(this, arguments); }; }
