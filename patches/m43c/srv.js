/* ---------- m43c (owner, 2026-11-17): the manager enters the doctors' tariffs in his own cartable — patient tariff and doctor share apart; the share of
   a service is «مبلغ» or «درصد» (of the service's patient tariff); one table for all doctors, with exceptions for one doctor; implant surgery has its
   own row per brand group (ایرانی، کره‌ای، ایتالیایی، سوئیسی، Root). The rules are kept in fin_share and written into fin_fee — the table the invoices,
   the reports and the paper files already read — so nothing else in accounting changes. First week after rollout: a change is applied to the earlier
   automatic invoices too (owner's rule); after that only new work. ---------- */
const M43_IR = 'هزینه جراحی ایرانی', M43_KO = 'هزینه جراحی کره ای', M43_RT = 'هزینه جراحی رووت';
let M43_READY = false;
async function m43Init(db) { if (M43_READY) return; await finInit(db);
  await db.prepare('CREATE TABLE IF NOT EXISTS fin_share (svc TEXT, payee TEXT, mode TEXT, val REAL, upd TEXT, by TEXT, PRIMARY KEY (svc, payee))').run();
  try { const sv = (await db.prepare('SELECT id, name, price, ord FROM fin_svc').all()).results, by = n => sv.find(x => normN(x.name) === normN(n)), ko = by(M43_KO), ops = [];
    let ir = by(M43_IR); const rt = by(M43_RT);
    if (!ir && ko) { const s = await settings(db), p = m14N((((s.prices || {}).imp || {}).bp || {}).ir) || Number(ko.price) || 0; ir = { id: 'svm43ir' };
      ops.push(db.prepare('INSERT OR IGNORE INTO fin_svc (id,name,cat,price,rule,ord,active) VALUES (?,?,?,?,?,?,1)').bind(ir.id, M43_IR, 's', p, 'doctor', (Number(ko.ord) || 0)),
        db.prepare('INSERT OR IGNORE INTO fin_fee (svc,payee,amount) SELECT ?, payee, amount FROM fin_fee WHERE svc=?').bind(ir.id, ko.id)); }
    if (rt && ko && !(await db.prepare('SELECT 1 y FROM fin_fee WHERE svc=? LIMIT 1').bind(rt.id).first())) ops.push(db.prepare('INSERT OR IGNORE INTO fin_fee (svc,payee,amount) SELECT ?, payee, amount FROM fin_fee WHERE svc=?').bind(rt.id, ko.id));
    if (!(await kvGet(db, 'm43Start'))) ops.push(kvSet(db, 'm43Start', nowIso()));
    if (ops.length) await db.batch(ops); } catch (e) { console.error('m43 init', e && e.message); }
  M43_READY = true; }
try { M1_BR.ir = M43_IR; M14_BR.ir = M43_IR; } catch (e) { }
/* implants of a live surgery session are invoiced on their own brand row (before: Iranian and Root went to the Korean row) */
{ const _fs43 = finSuggest0; finSuggest0 = async function (db, req) { await m43Init(db); return _fs43.apply(this, arguments); }; }
const m43Amt = (r, price) => { const v = Number(r.val) || 0; return r.mode === 'p' ? Math.round((Number(price) || 0) * Math.min(100, Math.max(0, v)) / 100) : Math.max(0, Math.round(v)); };
/* write the rules into fin_fee: an exception for the doctor, else the rule for all doctors; a service without any rule keeps its old per-doctor amounts */
async function m43Mat(db) { await m43Init(db);
  const [sv, pe, sh] = await db.batch([db.prepare('SELECT id, price, rule FROM fin_svc'), db.prepare(`SELECT id FROM fin_payee WHERE kind='doctor'`), db.prepare('SELECT * FROM fin_share')]);
  const R = {}; sh.results.forEach(r => { R[r.svc + '|' + r.payee] = r; }); const ops = []; let n = 0;
  for (const s of sv.results) { if (s.rule === 'clinic') continue; const def = R[s.id + '|*'];
    for (const p of pe.results) { const r = R[s.id + '|' + p.id] || def; if (!r) continue; const a = m43Amt(r, s.price);
      ops.push(a ? db.prepare('INSERT OR REPLACE INTO fin_fee (svc,payee,amount) VALUES (?,?,?)').bind(s.id, p.id, a) : db.prepare('DELETE FROM fin_fee WHERE svc=? AND payee=?').bind(s.id, p.id)); n++; } }
  for (let i = 0; i < ops.length; i += 80) await db.batch(ops.slice(i, i + 80));
  if (n) { try { FIN_FP = ''; FIN_SYNC_AT = 0; } catch (e) { } }
  return n; }
const m43Week = async db => { const t = Date.parse((await kvGet(db, 'm43Start')) || ''); return Number.isFinite(t) ? Math.max(0, Math.ceil((t + 7 * 864e5 - Date.now()) / 864e5)) : 0; };
async function m43Get(db) { await m43Mat(db);
  const [sv, pe, fe, sh] = await db.batch([db.prepare('SELECT * FROM fin_svc ORDER BY ord, name'), db.prepare('SELECT * FROM fin_payee ORDER BY ord, name'), db.prepare('SELECT * FROM fin_fee'), db.prepare('SELECT svc, payee, mode, val FROM fin_share')]);
  const n = await db.prepare(`SELECT COUNT(*) c FROM fin_inv WHERE st='ok' AND by='خودکار'`).first();
  return { ok: true, svc: sv.results, payees: pe.results, fees: fe.results, shares: sh.results, weekLeft: await m43Week(db), autoInv: (n && n.c) || 0, brandSvc: [M43_IR, M43_KO, M14_BR.it, M14_BR.sw, M43_RT] }; }
async function m43Save(db, req) { await m43Init(db); const rows = (Array.isArray(req.rows) ? req.rows : []).slice(0, 2000), by = tcut(req.by, 60) || 'مدیر', now = nowIso(), ops = [];
  const sv = new Set((await db.prepare('SELECT id FROM fin_svc').all()).results.map(x => x.id)), pe = new Set((await db.prepare(`SELECT id FROM fin_payee WHERE kind='doctor'`).all()).results.map(x => x.id)); let n = 0;
  for (const r of rows) { const svc = tcut(r && r.svc, 40), payee = r && r.payee === '*' ? '*' : tcut(r && r.payee, 40); if (!sv.has(svc) || !(payee === '*' || pe.has(payee))) return { ok: false, error: 'خدمت یا پزشک ناشناخته است؛ صفحه را تازه کنید.' };
    const mode = r.mode === 'p' ? 'p' : r.mode === 'a' ? 'a' : '', raw = toEnD(String(r.val == null ? '' : r.val)).replace(/[^\d.]/g, ''), val = raw === '' ? NaN : Number(raw);
    if (!mode || !Number.isFinite(val)) { ops.push(db.prepare('DELETE FROM fin_share WHERE svc=? AND payee=?').bind(svc, payee)); n++; continue; }
    if (mode === 'p' && val > 100) return { ok: false, error: 'درصد سهم پزشک نمی‌تواند بیشتر از ۱۰۰ باشد.' };
    if (mode === 'a' && val > 1e12) return { ok: false, error: 'مبلغ سهم پزشک نامعتبر است.' };
    ops.push(db.prepare('INSERT OR REPLACE INTO fin_share (svc,payee,mode,val,upd,by) VALUES (?,?,?,?,?,?)').bind(svc, payee, mode, mode === 'p' ? Math.round(val * 100) / 100 : Math.round(val), now, by)); n++; }
  for (let i = 0; i < ops.length; i += 80) await db.batch(ops.slice(i, i + 80));
  const mat = await m43Mat(db); req.note = n + ' ردیف سهم پزشک';
  return Object.assign(await m43Get(db), { saved: n, mat }); }
/* earlier automatic invoices are built again with today's tariffs and shares (hand-made invoices and closed days are left) */
async function m43Apply(db, req) { await m43Init(db); const after = tcut(req.after, 80), lim = 25;
  const { results } = await db.prepare(`SELECT id, plan, day FROM fin_inv WHERE st='ok' AND by='خودکار' AND id>? ORDER BY id LIMIT ?`).bind(after, lim).all(); let done = 0, skip = 0;
  for (const v of results) { try { if (!v.plan || String(v.plan).startsWith('x:') || await fx7Closed(db, v.day)) { skip++; continue; } await xlAuto(db, v.plan, v.day, 'خودکار'); done++; } catch (e) { skip++; console.error('m43 apply', e && e.message); } }
  try { FIN_FP = ''; FIN_SYNC_AT = 0; } catch (e) { }
  return { ok: true, done, skip, next: results.length === lim ? results[results.length - 1].id : '' }; }
/* a changed patient tariff moves the percent shares with it */
{ const _ms43 = m14Sync; m14Sync = async function (db) { const r = await _ms43.apply(this, arguments); try { await m43Mat(db); } catch (e) { console.error('m43 sync', e && e.message); } return r; }; }
{ const _cs43 = finCatSave; finCatSave = async function (db, req) { const r = await _cs43.apply(this, arguments); try { if (r && r.ok !== false && req && (req.t === 'svc' || req.t === 'payee')) await m43Mat(db); } catch (e) { console.error('m43 cat', e && e.message); } return r; }; }
Object.assign(MGR_ACTIONS, { m43Get: 1, m43Save: 1, m43Apply: 1 }); AUDIT_SKIP.m43Get = 1; AUDIT_SKIP.m43Apply = 1;
{ const _ar43c = arc6Route; arc6Route = async function (db, req, role) {
  if (req && ['m43Get', 'm43Save', 'm43Apply'].includes(req.action)) { if (role !== 'manager') return { ok: false, error: 'تعرفه و سهم پزشکان فقط با ورود مدیر است.' };
    return req.action === 'm43Get' ? m43Get(db) : req.action === 'm43Save' ? m43Save(db, req) : m43Apply(db, req); }
  return _ar43c.apply(this, arguments); }; }
