
/* ---------- m61a (owner, 2026-11-23): prosthesis «ادامه درمان» — a stage for every implant tooth, the next step (→ a booking task for reception),
   failure with four choices (referral to the surgeon / stop / pontic / without the tooth). The session itself, the failure (op fail, cont) and
   the removal stay with prosSess and prosAct; this action keeps what they don't:
   op ts   {id, ts:{tooth:stage}, by}        stages per tooth (pros.ts); the patient's stage = the earliest live tooth
   op next {id, st, days|day, note, by}      pros.nxt + a «نوبت دوباره» task (info = appointment kind) for reception; the open one is replaced
   op hold {id, teeth, note, by}             failure → the surgeon examines first: pros.hold; task «معاینه‌ی جراح» (reno / check)
   op dec  {id, dec:'ok'|'stop'|'pon'|'wo', removed, months, note, by}   the surgeon's decision; clears the hold (stop/pon/wo go on with prosAct)
   op pon  {id, teeth, by}                   after a «continue» failure: those teeth become pontics in the base-pontic map ---------- */
const M61_AK = { impr: 'impr', rabt: 'rabt', frame: 'tryin', tryin: 'tryin', rscr: 'rscr', deliv: 'deliv', chk: 'chkp', jig: 'tryin', bite: 'tryin' };
const M61_NL = { impr: 'قالب‌گیری', rabt: 'تست اباتمنت', frame: 'تست فریم', tryin: 'تست رزین', rscr: 'تست رزین پیچ‌شونده', deliv: 'تحویل روکش', chk: 'چکاپ', jig: 'تست جیگ', bite: 'موم و بایت' };
function m61Teeth(o) { const sg = parse(o.surg, null) || {}, all = new Set(); (sg.sessions || []).forEach(s => Object.keys(s.imp || {}).forEach(k => all.add(k))); return [...all]; }
function m61Gone(pr) { const g = new Set(); (pr.fails || []).filter(f => f && f.cont && !f.end).forEach(f => (f.teeth || []).forEach(k => g.add(k))); return g; }
function m61Low(pr, ts, live) { const P = pr2Path(pr2Type(pr)), S = live.map(k => ts[k] || pr.stage).filter(s => P.includes(s)); if (!S.length) return pr.stage; return S.sort((a, b) => P.indexOf(a) - P.indexOf(b))[0]; }
async function m61Task(db, o, due, ak, note, by) {
  await db.prepare(`UPDATE tasks SET done=1, doneAt=?, note=CASE WHEN note='' THEN 'جایگزین شد' ELSE note END WHERE plan=? AND kind='reno' AND done=0 AND info IN ('impr','rabt','tryin','rscr','deliv','chkp','check')`).bind(nowIso(), o.id).run();
  await db.prepare('INSERT INTO tasks (id,plan,name,phone,kind,due,done,doneAt,note,by,created,info) VALUES (?,?,?,?,?,?,0,\'\',?,?,?,?)')
    .bind(uuid(), o.id, o.name || '', tcut((parse(o.data, {}).h || {}).phone, 30), 'reno', due, tcut(note, 300), tcut(by, 60), nowIso(), ak).run();
}
async function m61(db, req, role) {
  const op = String(req.op || ''), o = await getRow(db, String(req.id || ''));
  if (!o) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const pr = parse(o.pros, null); if (!pr || !pr.stage) return { ok: false, error: 'مرحله‌ی پروتز این بیمار هنوز شروع نشده است.' };
  const by = tcut(req.by, 60) || 'پزشک', now = nowIso(), P = pr2Path(pr2Type(pr));
  const save = async (logNote) => { if (logNote) pr.log = (pr.log || []).concat([{ k: pr.stage, at: now, by, note: logNote }]).slice(-80); await db.batch([db.prepare('UPDATE plans SET pros=? WHERE id=?').bind(JSON.stringify(pr), o.id), bump(db)]); };
  if (op === 'ts') {
    if (['fail', 'pause'].includes(pr.stage)) return { ok: true, stage: pr.stage };
    const all = m61Teeth(o), gone = m61Gone(pr), live = all.filter(k => !gone.has(k)), ts = Object.assign({}, pr.ts || {}), inp = req.ts && typeof req.ts === 'object' ? req.ts : {};
    live.forEach(k => { const v = String(inp[k] || ''); if (v && P.includes(v)) ts[k] = v; else if (!ts[k] || !P.includes(ts[k])) ts[k] = pr.stage; });
    Object.keys(ts).forEach(k => { if (!live.includes(k)) delete ts[k]; });
    const low = m61Low(pr, ts, live), ch = Object.keys(ts).filter(k => (pr.ts || {})[k] !== ts[k]), old = pr.stage;
    pr.ts = ts; if (low && low !== pr.stage && pr.stage !== 'done') pr.stage = low;
    if (!ch.length && old === pr.stage) return { ok: true, stage: pr.stage, ts };
    await save(ch.length ? 'مرحله‌ی دندان‌ها: ' + live.map(k => k + ' ' + (EV_PR[ts[k]] || ts[k])).join('، ') + (old !== pr.stage ? ' · مرحله‌ی بیمار: ' + (EV_PR[pr.stage] || pr.stage) : '') : '');
    return { ok: true, stage: pr.stage, ts };
  }
  if (op === 'next') {
    const st = String(req.st || ''); if (!M61_AK[st]) return { ok: false, error: 'مرحله‌ی بعد را انتخاب کنید.' };
    const days = Math.max(0, Math.min(400, parseInt(toEnD(req.days), 10) || 0)), day = isDay(req.day) ? req.day : addDays(days || 14);
    pr.nxt = { st, day, at: now, by, note: tcut(req.note, 200) };
    await m61Task(db, o, day, M61_AK[st], 'مرحله‌ی بعد پروتز: ' + M61_NL[st] + (req.note ? ' — ' + tcut(req.note, 200) : ''), by);
    await save('مرحله‌ی بعد: ' + M61_NL[st] + ' — ' + pr2J(day));
    return { ok: true, nxt: pr.nxt };
  }
  if (op === 'hold') {
    const all = m61Teeth(o), teeth = (Array.isArray(req.teeth) ? req.teeth : []).map(v => tcut(v, 4)).filter(k => all.includes(k));
    if (!teeth.length) return { ok: false, error: 'دندانِ ایمپلنتِ مشکل‌دار را انتخاب کنید.' };
    pr.hold = { k: 'surg', teeth, at: now, by, note: tcut(req.note, 300) }; delete pr.nxt;
    await m61Task(db, o, tehranDay(), 'check', 'معاینه‌ی جراح — مشکل ایمپلنت دندان ' + teeth.join('، ') + (req.note ? ' — ' + tcut(req.note, 200) : ''), by);
    await save('ارجاع به جراح برای معاینه — دندان ' + teeth.join('، ') + (req.note ? ' — ' + tcut(req.note, 200) : '') + '؛ پروتز منتظر نظر جراح');
    return { ok: true, hold: pr.hold };
  }
  if (op === 'dec') {
    const h = pr.hold; if (!h) return { ok: false, error: 'این بیمار منتظر معاینه‌ی جراح نیست.' };
    const dec = ['ok', 'stop', 'pon', 'wo'].includes(req.dec) ? req.dec : ''; if (!dec) return { ok: false, error: 'تصمیم را انتخاب کنید.' };
    const L = { ok: 'مشکلی ندارد؛ پروتز ادامه می‌دهد', stop: 'توقف پروتز تا کاشت دوباره', pon: 'به جایش پونتیک و ادامه', wo: 'بدون این دندان ادامه' };
    pr.hold = null; delete pr.hold; pr.holds = (pr.holds || []).concat([Object.assign({}, h, { end: now, dec, decBy: by })]).slice(-10);
    await save('نظر جراح (' + by + '): ' + L[dec] + ' — دندان ' + h.teeth.join('، ') + (req.note ? ' — ' + tcut(req.note, 200) : ''));
    await db.prepare(`UPDATE tasks SET done=1, doneAt=?, note='جراح معاینه کرد' WHERE plan=? AND kind='reno' AND info='check' AND done=0`).bind(now, o.id).run();
    if (dec === 'ok') return { ok: true, dec };
    const r = await prosAct0(db, { id: o.id, op: 'fail', teeth: h.teeth, cont: dec === 'stop' ? 0 : 1, removed: !!req.removed, months: req.months, note: tcut(req.note, 300) || L[dec], by });
    if (r && r.ok === false) return r;
    if (dec === 'pon') { const r2 = await m61(db, { op: 'pon', id: o.id, teeth: h.teeth, by }, role); if (r2 && r2.ok === false) return r2; }
    return { ok: true, dec };
  }
  if (op === 'pon') {
    const teeth = (Array.isArray(req.teeth) ? req.teeth : []).map(v => tcut(v, 4)).filter(Boolean); if (!teeth.length) return { ok: true };
    pr.map = pr.map && typeof pr.map === 'object' ? pr.map : {}; teeth.forEach(k => { pr.map[k] = 'p'; });
    (pr.fails || []).forEach(f => { if (f && f.cont && !f.end && (f.teeth || []).some(k => teeth.includes(k))) f.pon = 1; });
    await save('دندان ' + teeth.join('، ') + ' در طرح پونتیک شد');
    return { ok: true, map: pr.map };
  }
  return { ok: false, error: 'درخواست درست نیست.' };
}
STAFF_ACTIONS.m61 = 1; MGR_ACTIONS.m61 = 1; DOC_ACTIONS.m61 = 1; SURG_ACTIONS.m61 = 1;
{ const _ar61 = arc6Route; arc6Route = async function (db, req, role) { if (req && req.action === 'm61') { if (!['surgery', 'doctor', 'manager'].includes(role)) return { ok: false, error: 'این کار با پزشک است.' }; return m61(db, req, role); } return _ar61.apply(this, arguments); }; }
/* while the surgeon has not decided, no prosthesis session and no lab order */
{ const _ps61 = prosSess; prosSess = async function (db, req) { try { const o = await getRow(db, String(req && req.id || '')), pr = o ? parse(o.pros, null) : null; if (pr && pr.hold) return { ok: false, error: 'این بیمار منتظر معاینه‌ی جراح است؛ بعد از نظر جراح ادامه دهید.' }; } catch (e) { } return _ps61.apply(this, arguments); }; }
{ const _ln61 = labNew; labNew = async function (db, req) { try { if (req && req.action === 'labNew') { const o = await getRow(db, String(req.id || '')), pr = o ? parse(o.pros, null) : null; if (pr && pr.hold) return { ok: false, error: 'این بیمار منتظر معاینه‌ی جراح است؛ بعد از نظر جراح سفارش بدهید.' }; } } catch (e) { } return _ln61.apply(this, arguments); }; }
{ const _pl61 = prosList; prosList = async function (db) { const r = await _pl61.apply(this, arguments); try { const { results } = await db.prepare(`SELECT id, json_extract(pros,'$.hold') AS h FROM plans WHERE pros IS NOT NULL AND json_valid(pros) AND json_extract(pros,'$.hold') IS NOT NULL`).all(); const M = {}; results.forEach(x => { M[x.id] = parse(x.h, null); }); ((r && r.items) || []).forEach(x => { if (M[x.id]) x.hold = M[x.id]; }); } catch (e) { console.error('m61 prosList', e && e.message); } return r; }; }
