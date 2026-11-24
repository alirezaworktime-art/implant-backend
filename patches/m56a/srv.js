/* ---------- m56a (owner, 2026-11-18): tariffs of «کلینیک باصری» and «کلینیک دانشگاه» from the owner's Excel sheets (toman × 10 = ریال).
   One time (kv m56seed): a service that has no price gets the price of the sheet; a missing service is added; a price already entered is never
   changed and nothing is removed. The clinic is made active. Fixtures and the zygoma / nasal / pterygoid surgery are services of the implant
   section (sec 'imp'); the page counts them from the «موارد خاص» rows of the implant card. ---------- */
const M56_SVC = {
  bsr: [['imp', 'IMP', 45000000, 'imp'], ['fx_jd', 'فیکسچر JD', 115000000, 'imp'], ['fx_n', 'فیکسچر نازال', 155000000, 'imp'], ['fx_t', 'فیکسچر تریگوئید', 155000000, 'imp'], ['fx_z', 'فیکسچر زایگوما', 300000000, 'imp'],
    ['unc', 'آنکاوری', 5000000, ''], ['hard', 'نسج سخت', 10000000, ''], ['soft', 'نسج نرم', 5000000, ''], ['open', 'OPEN', 60000000, ''], ['close', 'CLOSE', 30000000, ''], ['alv', 'آلوئولوپلاستی', 55000000, ''], ['gbr', 'GBR', 30000000, ''], ['vip', 'GBR VIP', 50000000, ''], ['staff', 'هزینه‌ی پرسنل (هر ساعت)', 2240000, '']],
  uni: [['imp', 'IMP', 60000000, 'imp'], ['fx_jd', 'فیکسچر JD', 160000000, 'imp'], ['fx_n', 'فیکسچر نازال', 250000000, 'imp'], ['fx_t', 'فیکسچر تریگوئید', 250000000, 'imp'], ['fx_z', 'فیکسچر زایگوما', 400000000, 'imp'],
    ['sg_z', 'جراحی زایگوما', 400000000, 'imp'], ['sg_n', 'جراحی نازال', 120000000, 'imp'], ['sg_t', 'جراحی تریگوئید', 120000000, 'imp'],
    ['unc', 'آنکاوری', 5000000, ''], ['hard', 'نسج سخت', 25000000, ''], ['soft', 'نسج نرم', 10000000, ''], ['open', 'OPEN', 60000000, ''], ['close', 'CLOSE', 30000000, ''], ['alv', 'آلوئولوپلاستی', 50000000, ''], ['gbr', 'GBR', 20000000, ''], ['vip', 'GBR VIP', 40000000, ''], ['staff', 'هزینه‌ی پرسنل (هر ساعت)', 2240000, '']] };
const M56_NM = { bsr: /باصری/, uni: /دانشگاه/ };
let M56_DONE = false;
async function m56Seed(db) {
  if (await kvGet(db, 'm56seed')) return true; const now = nowIso(), log = {};
  let all = []; try { all = (await db.prepare('SELECT id, name, svc FROM oc_clinic').all()).results || []; } catch (e) { return false; }
  for (const id of Object.keys(M56_SVC)) { const row = all.find(r => r.id === id) || all.find(r => M56_NM[id].test(r.name || '')); if (!row) { log[id] = 'missing'; continue; }
    const svc = Array.isArray(parse(row.svc, null)) ? parse(row.svc, []) : []; let set = 0, add = 0;
    for (const [k, n, p, sec] of M56_SVC[id]) { const s = svc.find(x => x && x.k === k) || svc.find(x => x && String(x.n || '').trim() === n);
      if (s) { if (!(Number(s.p) > 0)) { s.p = p; set++; } if (sec && !s.sec) s.sec = sec; } else { svc.push({ k, n, p, sec }); add++; } }
    await db.prepare('UPDATE oc_clinic SET svc=?, active=1, upd=?, by=? WHERE id=?').bind(JSON.stringify(svc), now, 'تعرفه از اکسل (m56a)', row.id).run(); log[id] = row.id + ' set ' + set + ' add ' + add; }
  if (Object.values(log).includes('missing')) return false; /* the clinics are made by the first «سایر کلینیک‌ها» request; try again later */
  await db.batch([kvSet(db, 'm56seed', JSON.stringify({ at: now, log }))]); return true;
}
{ const _ar56 = arc6Route; arc6Route = async function (db, req, role) { if (!M56_DONE) { M56_DONE = true; try { M56_DONE = !!(await m56Seed(db)); } catch (e) { M56_DONE = false; console.error('m56a seed', e && e.message); } } return _ar56.apply(this, arguments); }; }
