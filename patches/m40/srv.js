/* ---------- m40 (owner, 2026-11-17): a plain lab employee (not supervisor, not reception, not the shared password) reaches only the orders that were
   referred to him: a step assigned to him, started by him or finished by him. He sees the sheet, files and steps of those orders without the customer
   account and money; lists, search, reports, definitions-editing, ledger and settings answer «دسترسی ندارید». Checked here, not only hidden in the page. ---------- */
const m40Plain = me => !!(me && me.id && me.id !== 'shared' && !me.sup && !me.recep);
const M40_NO = { ok: false, error: 'این بخش برای حساب شما باز نیست. فقط کارهایی که به شما ارجاع شده در دسترس است.', m40: 1 };
const M40_NOT = { ok: false, error: 'این کار به شما ارجاع نشده است.', m40: 1 };
async function m40Mine(db, me, lid) { if (!lid) return false;
  return !!(await db.prepare('SELECT 1 AS y FROM lab_step WHERE lab=? AND (asg=? OR acc_by=? OR done_by=?) LIMIT 1').bind(String(lid), me.id, me.id, me.id).first()); }
function m40Data(d) { if (!d || typeof d !== 'object') return d; const o = {}; for (const k of Object.keys(d)) if (!/^(acct|acctName|pay|price|cost|inv|fac|plist|disc)/.test(k)) o[k] = d[k]; return o; }
const m40Log = L => (Array.isArray(L) ? L : []).filter(e => !/تومان|مبلغ|قیمت|فاکتور|صورت.?حساب|تعرفه/.test(JSON.stringify(e)));
async function m40Me(db, req) { if (!req || req._role !== 'lab') return null; const me = await l2Me(db, req); return m40Plain(me) ? me : null; }
/* work list: only my open orders, without money */
{ const _h40 = handle; handle = async function (req, env) {
  if (req && typeof req === 'object') delete req._m40in;
  const r = await _h40.apply(this, arguments);
  try { if (req && req.action === 'labList' && r && r.ok && Array.isArray(r.items) && m40Plain(r.me)) { const id = r.me.id;
    r.items = r.items.filter(x => !['done', 'cancel'].includes(x.st) && (x.steps || []).some(s => (s.st === 'pend' || s.st === 'acc') && (s.asg === id || s.acc_by === id))).map(x => Object.assign({}, x, { data: m40Data(x.data), log: m40Log(x.log) })); r.m40 = 1; } }
  catch (e) { console.error('m40 list', e && e.message); if (req && req.action === 'labList' && r && m40Plain(r.me)) return { ok: false, error: 'فهرست کارها آماده نشد. دوباره تلاش کنید.' }; }
  return r; }; }
/* one order */
{ const _o40 = labOrder; labOrder = async function (db, req, role) { const me = role === 'lab' ? await m40Me(db, req) : null;
  if (me && !(await m40Mine(db, me, req.lid))) return M40_NOT;
  const r = await _o40.apply(this, arguments); if (me && r && r.ok && r.order) { r.order.data = m40Data(r.order.data); r.order.log = m40Log(r.order.log); r.m40 = 1; } return r; }; }
/* files of an order */
{ const _f40 = labFile; labFile = async function (db, req, role) { const me = role === 'lab' ? await m40Me(db, req) : null;
  if (me) { let lid = String(req.lid || ''); if (!lid && req.fid) { const f = await db.prepare('SELECT lab FROM lab_file WHERE id=?').bind(String(req.fid)).first(); lid = f ? f.lab : ''; }
    if (!(await m40Mine(db, me, lid))) return M40_NOT; }
  return _f40.apply(this, arguments); }; }
/* steps: only on my orders; referring others stays with reception */
{ const _s40 = labStep; labStep = async function (db, req) { const me = await m40Me(db, req);
  if (me && !req._m40in) { if (String(req.op || '') === 'assign') return M40_NO; if (!(await m40Mine(db, me, req.lid))) return M40_NOT; req._m40in = 1; }
  return _s40.apply(this, arguments); }; }
/* the rest of the lab operations */
const M40_OPS = { perf: 1, seen: 1 };
{ const _l40 = lab5; lab5 = async function (db, req, role) { const op = String((req && req.op) || '');
  if (role === 'lab' && op === 'm40mine') { const me = await l2Me(db, req); if (!me.id) return { ok: true, items: [], days: 0 };
    const days = Math.max(0, Math.min(3650, Number(req.days) || 0)), since = days ? new Date(Date.now() - days * 864e5).toISOString() : '';
    const { results } = await db.prepare(`SELECT s.id AS sid, s.lab, s.dname, s.done_at, s.part, l.no, l.name, l.st, l.due, l.data FROM lab_step s JOIN labs l ON l.id=s.lab WHERE s.done_by=? AND s.st='done' AND COALESCE(s.done_at,'')>=? ORDER BY s.done_at DESC LIMIT 400`).bind(me.id, since).all();
    return { ok: true, days, items: results.map(x => { const d = parse(x.data, {}) || {}, p = x.part && (d.parts || []).find(v => v.p === x.part); return { sid: x.sid, lid: x.lab, no: x.no || null, name: x.name, st: x.st, due: x.due, dname: x.dname, at: x.done_at, part: p ? p.label : '', teeth: Array.isArray(d.teeth) ? d.teeth : [], wt: d.wtName || d.type || '', del: d.del ? 1 : 0 }; }) }; }
  const me = role === 'lab' ? await m40Me(db, req) : null;
  if (me) {
    if (op === 'boot') { const r = await _l40.apply(this, arguments); if (!r || !r.ok) return r; return { ok: true, set: { lab_name: (r.set || {}).lab_name || '' }, accts: [], plists: [], boxes: [], me: r.me, m40: 1 }; }
    if (op === 'bstats') return { ok: true, today: 0, month: 0, all: 0, docs: 0, accts: 0, m40: 1 };
    if (!M40_OPS[op]) return M40_NO; if (!req.lid || !(await m40Mine(db, me, req.lid))) return M40_NOT; req._m40in = 1; }
  return _l40.apply(this, arguments); }; }
/* definitions: names only (needed for department names and choosing the next person) */
{ const _d40 = labDefs; labDefs = async function (db, req, role) { const me = role === 'lab' ? await m40Me(db, req) : null;
  if (me && String(req.op || 'get') !== 'get') return M40_NO;
  const r = await _d40.apply(this, arguments);
  if (me && r && r.ok) { for (const k of Object.keys(r)) if (/^(plist|plists|acct|accts|price|prices|inv|ledger|set)$/.test(k)) delete r[k];
    if (Array.isArray(r.staff)) r.staff = r.staff.map(s => ({ id: s.id, name: s.name, active: s.active, depts: s.depts, sup: s.sup, recep: s.recep, designer: s.designer })); r.m40 = 1; }
  return r; }; }
/* starting, creating, searching patients, changing the order state, returns from the clinic: not for a plain employee when called directly
   (req._m40in marks a call made from inside an allowed step operation; the dispatcher removes that mark from every incoming request) */
{ const wrap1 = f => async function (db, req) { if (req && !req._m40in && await m40Me(db, req)) return M40_NO; return f.apply(this, arguments); };
  labSet = wrap1(labSet); labStart = wrap1(labStart); lab4Start = wrap1(lab4Start); lab4New = wrap1(lab4New); lab4Pats = wrap1(lab4Pats); lab4Find = wrap1(lab4Find); labRet = wrap1(labRet); }
