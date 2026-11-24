// nightly-arc6 (2026-11-04: sheet summary counts paper-file (arc6) implants from arc.lines; pays.meth is copied by SELECT * — the Cloudflare worker must be arc6 too so import keeps it)
// nightly-fx5 (2026-11-03: + audit table)
// nightly (00:00 Tehran): 1) copy all data Iran -> Cloudflare (backup copy)  2) patient summary -> Google Sheet
import { DatabaseSync } from 'node:sqlite';
const DBF = process.env.DB_FILE || '/opt/implant/data/implant.db';
const CF = 'https://implant-api.implant-yazd.workers.dev/';
const db = new DatabaseSync(DBF, { readOnly: true });
const rows = t => { try { return db.prepare(`SELECT * FROM ${t}`).all().map(r => ({ ...r })); } catch (e) { return []; } };
const log = (...a) => console.log(new Date().toISOString(), ...a);
let bad = 0;

async function post(url, body, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain' }, redirect: 'follow', signal: AbortSignal.timeout(90000) });
      const j = JSON.parse(await r.text()); if (j.ok) return j; throw new Error(j.error || 'not ok');
    } catch (e) { if (i === tries) throw e; await new Promise(r => setTimeout(r, 5000 * i)); }
  }
}
const chunks = (arr, maxN, maxB = 1.5e6) => { const out = []; let cur = [], b = 0;
  for (const x of arr) { const s = JSON.stringify(x).length; if (cur.length && (cur.length >= maxN || b + s > maxB)) { out.push(cur); cur = []; b = 0; } cur.push(x); b += s; }
  if (cur.length) out.push(cur); return out; };

/* 1) Iran -> Cloudflare */
if (process.env.CF_IMPORT_KEY) {
  const key = process.env.CF_IMPORT_KEY;
  try {
    const kv = rows('kv').filter(r => !/^(sid|fail):/.test(r.k));
    await post(CF, { action: 'import', key, tables: { kv } });
    // each table is replaced as a whole on the backup (first chunk wipes it), so deletions and revoked patient links reach the copy too
    const send = async (t, arr, n, asItems) => { const cs = chunks(arr, n); if (!cs.length) cs.push([]);
      for (let i = 0; i < cs.length; i++) await post(CF, Object.assign({ action: 'import', key }, i === 0 ? { wipe: [t] } : {}, asItems ? { items: cs[i] } : { tables: { [t]: cs[i] } })); };
    for (const t of ['inv_items', 'tasks', 'pays', 'labs', 'appts', 'exp', 'cash', 'att', 'rxlog', 'wb', 'refunds', 'users', 'intake', 'events', 'audit', 'files', 'fin_acc', 'fin_svc', 'fin_payee', 'fin_fee', 'fin_bank', 'fin_emp', 'fin_budget', 'fin_cost', 'fin_inv', 'fin_chqo', 'fin_payroll', 'fin_doc', 'fin_line', 'lab_dept', 'lab_proc', 'lab_wt', 'lab_step', 'lab_ret', 'lab_file', 'inv_sup', 'inv_cnt', 'inv_po', 'inv_po_line', 'lab_acct', 'lab_plist', 'lab_inv', 'lab_pay', 'inv_asset', 'inv_asset_log', 'inv_kit', 'inv_kitlog', 'inv_loan', 'inv_cset', 'xl_work', 'fx_note', 'oc_clinic', 'oc_work', 'oc_pay']) { let r8 = []; try { r8 = rows(t); } catch (e) { continue; } await send(t, r8, 300, false); } /* sec8 AR1 (lab_box, inv_budget and lab file contents stay in the server snapshots) */
    const plans = rows('plans'); const n = plans.length;
    await send('plans', plans, 40, true);
    await send('inv_moves', rows('inv_moves'), 300, false);
    log('cloudflare copy ok: plans', n);
  } catch (e) { bad++; log('cloudflare copy FAILED', String(e.message || e)); }
} else log('cloudflare copy skipped (no CF_IMPORT_KEY)');

/* 2) summary -> Google Sheet */
const BR = { ir: 'ایرانی', ko: 'کره‌ای', it: 'ایتالیایی', sw: 'سوئیسی', ref: 'ارجاع به مشاور' };
const num = v => Number(String(v ?? '').replace(/[^\d.]/g, '').replace(/[۰-۹]/g, '')) || 0;
const fa2en = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const selKeys = s => Array.isArray(s?.sel) ? s.sel : Object.keys(s?.sel || {}).filter(k => s.sel[k]);
const teeth = s => s ? selKeys(s).length + Object.values(s.jc || {}).reduce((a, v) => a + num(fa2en(v)), 0) + num(fa2en(s.cnt)) : 0;
const pillars = s => s ? selKeys(s).reduce((a, k) => a + num(fa2en(String(k).split(':')[1])), 0) : 0;
if (process.env.SHEET_URL && process.env.SHEET_KEY) {
  try {
    const list = db.prepare("SELECT id,name,jalali,status,data,surg FROM plans WHERE status='confirmed'").all().map(p => {
      let d = {}; try { d = JSON.parse(p.data || '{}'); } catch {}
      const s = d.s || {}, h = d.h || {};
      const A6 = d.arc && d.arc.v6 ? d.arc.lines || [] : null, a6n = k => A6.filter(l => l.k === k).reduce((t, l) => t + (Number(l.n) || 0), 0); /* arc6: paper files count from their treatment lines */
      const parts = (A6 ? [['ایمپلنت', a6n('imp')], ['ساب‌پریوستئال', a6n('sub')], ['All on X', a6n('aox')], ['اوردنچر', a6n('ovd')]] : [['ایمپلنت', teeth(s.imp)], ['ساب‌پریوستئال', teeth(s.sub)], ['All on X', pillars(s.aox)], ['اوردنچر', pillars(s.ovd)]]).filter(x => x[1] > 0);
      const units = parts.reduce((a, x) => a + x[1], 0);
      const brand = BR[d.brand] || (parts.length && parts.every(x => x[0] === 'All on X') ? 'ایتالیایی' : (d.brand || ''));
      return { id: p.id, date: p.jalali || d.jalali || '', name: p.name || h.name || '', phone: h.phone || '', brand: units ? brand : '', units, detail: parts.map(x => x[0] + ' ' + x[1]).join('، ') };
    });
    const j = await post(process.env.SHEET_URL, { action: 'summary', key: process.env.SHEET_KEY, rows: list });
    log('sheet ok:', list.length, 'rows', JSON.stringify(j).slice(0, 120));
  } catch (e) { bad++; log('sheet FAILED', String(e.message || e)); }
} else log('sheet skipped (no SHEET_URL)');
db.close();
process.exit(bad ? 1 : 0);
