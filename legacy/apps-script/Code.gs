/**
 * سرور فرم طرح درمان ایمپلنت (Google Apps Script)
 *
 * کارها:
 *  - چک کردن رمز عبور کلینیک
 *  - نگه‌داری بایگانی فرم‌ها در یک Google Sheet
 *  - ذخیره‌ی PDF هر بیمار در یک پوشه‌ی Google Drive
 *  - ارسال PDF با Gmail از همان حسابی که این اسکریپت را ساخته است
 *
 * راه‌اندازی: راهنمای README.md را ببینید.
 */

// رمز ورود پزشک (کارتابل، طرح درمان، تنظیمات)
const INITIAL_PASSWORD = '';
// رمز ورود مشاور (کارتابل مشاور، شرایط پرداخت، تأیید نهایی، تنظیمات)
const CONSULT_PASSWORD = '';
// رمز ورود پرسنل (پذیرش بیمار و بایگانی)
const STAFF_PASSWORD = '';

// ارسال خودکار ایمیل بعد از تأیید نهایی (خاموش: سرعت). دکمه‌ی «ارسال دوباره» در بایگانی همچنان ایمیل می‌فرستد.
const AUTO_EMAIL = false;

const SHEET_NAME = 'plans';
const FOLDER_NAME = 'طرح درمان ایمپلنت - PDF';
const COLS = ['id', 'name', 'nid', 'status', 'jalali', 'total', 'emailStatus', 'emailError', 'emailTo', 'emailedAt',
              'fileId', 'fileName', 'edits', 'createdAt', 'updatedAt', 'data', 'queue', 'queuedAt', 'doneAt', 'consultAt'];
// queue: waiting (منتظر پزشک) · reviewing (نزد پزشک) · consult (منتظر مشاور) · consulting (نزد مشاور) · done (ثبت نهایی شد)
// تعرفه‌های پیش‌فرض (تومان). بعد از راه‌اندازی، از صفحه‌ی «تنظیمات» سایت قابل تغییر است.
// price = قیمت (یا قیمت هر واحد)؛ bp = قیمت به تفکیک برند (ko کره‌ای، it ایتالیایی، sw سوئیسی)
const DEFAULT_PRICES = {
  imp:   { bp: { ir: '13500000', ko: '14500000', it: '21000000', sw: '22500000' } }, // پایه ایمپلنت، تعرفه جراحی هر پایه (سوئیسی = نئوپروز)
  crw:   { price: '10500000' },  // فقط روکش، هر واحد (پروتز)
  pon:   { price: '5000000' },   // پونتیک، هر واحد (پروتز)
  gbr:   { price: '2500000' },   // GBR، هر واحد
  vip_cgf: { price: '' },       // جراحی VIP: CGF، هر واحد
  vip_mem: { price: '' },       // جراحی VIP: ممبران و تگ، هر واحد
  sin_o: { price: '5000000' },   // سینوس باز، هر طرف
  sin_c: { price: '2500000' },   // سینوس بسته، هر طرف
  alv:   { price: '4000000' },   // آلوئولوپلاستی، هر ½ فک
  ram:   { price: '8000000' },   // بلاک راموس، هر واحد (جدول: ۸ تا ۱۱ میلیون)
  fgg:   { price: '15000000' },  // FGG، هر ⅓ فک
  tmp:   { price: '1800000' },   // روکش موقت، هر دندان (PMMA و Essix)
  surg_c: { price: '' },        // جراحی نیش نهفته، هر دندان
  surg_w: { price: '' },        // جراحی عقل نهفته، هر دندان
  ext: { price: '' }, aox: { price: '' }, cbct: { price: '' }, anes: { price: '' },
  ovd:   { bp: { ir: '', ko: '', it: '', sw: '' } }
};
// تاریخ تعرفه: ۲۵ خرداد ۱۴۰۵، با تغییرات پایه‌ی ایرانی/کره‌ای/ایتالیایی
const DEFAULT_SETTINGS = {
  recipient: '',
  clinic: 'کلینیک دندانپزشکی شهید رهنمون',
  doctor: 'دکتر سید مجتبی علویکیا · جراح فک و صورت',
  phone: '۰۹۱۲۰۰۰۰۰۰۰ (منتظری)'
};

/** یک بار از ویرایشگر اجرا کنید: رمز را ثبت می‌کند و شیت و پوشه را می‌سازد. */
function setup() {
  const p = PropertiesService.getScriptProperties();
  if (INITIAL_PASSWORD === 'CHANGE_ME') throw new Error('اول INITIAL_PASSWORD را در بالای فایل عوض کنید.');
  p.setProperty('PASSWORD', INITIAL_PASSWORD);
  sheet_();
  folder_();
  Logger.log('آماده است. شیت: ' + ss_().getUrl() + '  پوشه: ' + folder_().getUrl());
}

/** صفحه‌ی سایت (فایل Index.html همین پروژه) */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('طرح درمان ایمپلنت')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** برای وقتی که صفحه جای دیگری (مثلاً GitHub Pages) میزبانی شود */
function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'درخواست نامعتبر' }); }
  return json_(handle_(req));
}

/** صدا زده‌شده از صفحه با google.script.run */
function api(reqStr) {
  let req;
  try { req = JSON.parse(reqStr); } catch (err) { return JSON.stringify({ ok: false, error: 'درخواست نامعتبر' }); }
  return JSON.stringify(handle_(req));
}

function role_(pw) {
  const props = PropertiesService.getScriptProperties();
  const doc = props.getProperty('PASSWORD') || INITIAL_PASSWORD;
  const staff = props.getProperty('STAFF_PASSWORD') || STAFF_PASSWORD;
  const cons = props.getProperty('CONSULT_PASSWORD') || CONSULT_PASSWORD;
  if (pw && pw === doc) return 'doctor';
  if (pw && pw === cons) return 'consultant';
  if (pw && pw === staff) return 'staff';
  return '';
}
const READ_ACTIONS = { ping: 1, list: 1, get: 1, queue: 1, confirm: 1 }; // confirm takes its own short lock
const STAFF_ACTIONS = { undecidedSet: 1, ping: 1, list: 1, get: 1, queue: 1, queueAdd: 1, queueUpdate: 1, queueDelete: 1 };

function handle_(req) {
  const role = role_(req.password);
  if (!role) { Utilities.sleep(800); return { ok: false, error: 'auth' }; }
  if (role === 'staff' && !STAFF_ACTIONS[req.action]) return { ok: false, error: 'این کار فقط با ورود پزشک ممکن است.' };

  const needLock = !READ_ACTIONS[req.action];
  const lock = LockService.getScriptLock();
  if (needLock && !lock.tryLock(25000)) return { ok: false, error: 'سرور مشغول است؛ چند ثانیه دیگر دوباره امتحان کنید.' };
  try {
    switch (req.action) {
      case 'ping': return { ok: true, role: role, settings: settings_(), sender: Session.getEffectiveUser().getEmail(), queue: queue_('', role) };
      case 'list': return { ok: true, items: list_() };
      case 'get': return get_(req.id);
      case 'queue': return queue_(req.ver, role);
      case 'queueAdd': return queueAdd_(req.patient, req.id);
      case 'queueUpdate': return queueUpdate_(req.id, req.patient);
      case 'queueDelete': return queueDelete_(req.id);
      case 'queueOpen': return queueOpen_(req.id, role);
      case 'toConsult': return once_(req.sendId, () => toConsult_(req.record));
      case 'save': return save_(req.record);
      case 'confirm': return once_(req.sendId, () => confirm_(req));
      case 'resend': return resend_(req);
      case 'settings': return setSettings_(req.settings);
      default: return { ok: false, error: 'عملیات ناشناخته' };
    }
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  } finally {
    if (needLock) lock.releaseLock();
  }
}

/* ---------- queue (پذیرش → کارتابل پزشک) ---------- */
function qver_() { return PropertiesService.getScriptProperties().getProperty('QVER') || '0'; }
/** a retried send (same sendId) returns the first result instead of running again — no duplicate PDF or email */
function once_(sendId, fn) {
  sendId = String(sendId || '').slice(0, 80);
  if (!sendId) return fn();
  const cache = CacheService.getScriptCache(), k = 'sid:' + sendId;
  let hit = cache.get(k);
  if (hit) {
    let r = JSON.parse(hit);
    for (let i = 0; i < 25 && r.pending; i++) { Utilities.sleep(1000); hit = cache.get(k); r = hit ? JSON.parse(hit) : { ok: false, error: 'تلاش قبلی ناتمام ماند؛ دوباره فرستاده می‌شود.' }; }
    if (r.pending) return { ok: false, error: 'هنوز در حال انجام است؛ کمی بعد دوباره تلاش می‌شود.' };
    return r;
  }
  try { cache.put(k, JSON.stringify({ pending: 1 }), 180); } catch (e) {}
  let r;
  try { r = fn(); } catch (err) { try { cache.remove(k); } catch (e) {} throw err; }
  try { if (r && r.ok) cache.put(k, JSON.stringify(r), 21600); else cache.remove(k); } catch (e) {}
  return r;
}
function bump_() { PropertiesService.getScriptProperties().setProperty('QVER', String(Date.now())); }
function today_() { return Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd'); }
function dayOf_(iso) { try { return iso ? Utilities.formatDate(new Date(iso), 'Asia/Tehran', 'yyyy-MM-dd') : ''; } catch (e) { return ''; } }
function cleanPatient_(p) {
  p = p || {};
  const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  return { name: t(p.name, 200), nid: t(p.nid, 30), date: t(p.date, 30), phone: t(p.phone, 30), age: t(p.age, 10), asst: t(p.asst, 100), note: t(p.note, 2000), med: cleanMed_(p.med) };
}
function cleanMed_(m) {
  m = m || {}; const y = {}, tx = {};
  Object.keys(m.y || {}).slice(0, 40).forEach(k => { if (m.y[k]) y[String(k).slice(0, 20)] = 1; });
  Object.keys(m.t || {}).slice(0, 10).forEach(k => { if (y[k]) tx[String(k).slice(0, 20)] = String(m.t[k] || '').slice(0, 300); });
  return { y: y, t: tx, other: String(m.other || '').slice(0, 1000) };
}
const ROLE_Q = { doctor: ['waiting', 'reviewing'], consultant: ['consult', 'consulting'], staff: ['waiting', 'reviewing', 'consult', 'consulting'] };
function queue_(ver, role) {
  const v = qver_();
  if (ver && String(ver) === v) return { ok: true, same: true, ver: v };
  const cache = CacheService.getScriptCache(), ck = 'q:' + role + ':' + v + ':' + today_();
  const hitc = cache.get(ck);
  if (hitc) return JSON.parse(hitc);
  const want = ROLE_Q[role] || [];
  const sh = sheet_(), last = sh.getLastRow(), td = today_(), items = [];
  if (last >= 2) {
    const qc = COLS.indexOf('queue') + 1;
    const qv = sh.getRange(2, qc, last - 1, 4).getValues(); // queue, queuedAt, doneAt, consultAt
    const hit = [];
    qv.forEach((r, i) => {
      const q = r[0];
      if (want.indexOf(q) >= 0 || (role === 'staff' && q === 'done' && dayOf_(String(r[2])) === td)) hit.push(i + 2);
    });
    hit.map(row => sh.getRange(row, 1, 1, COLS.length).getValues()[0]).forEach(r => {
      const o = {}; COLS.forEach((c, i) => o[c] = r[i]);
      if (!o.id) return;
      let d = {}; try { d = JSON.parse(o.data || '{}'); } catch (e) {}
      const h = d.h || {};
      const it = { id: o.id, name: o.name, nid: o.nid, phone: h.phone || '', age: h.age || '', date: h.date || '', asst: h.asst || '', note: d.note || '', med: d.med || null,
                   status: o.status, queue: o.queue, queuedAt: String(o.queuedAt), doneAt: String(o.doneAt || ''), consultAt: String(o.consultAt || ''),
                   jalali: o.jalali, emailStatus: o.emailStatus, pdfName: o.fileName, edits: Number(o.edits) || 0 };
      if (role !== 'staff' && o.queue !== 'done') it.data = d; // the whole plan travels with the inbox so opening a patient needs no second request
      items.push(it);
    });
  }
  const key = role === 'consultant' ? (x => x.consultAt || x.queuedAt) : (x => x.queuedAt);
  items.sort((a, b) => key(a) < key(b) ? -1 : 1);
  const out = { ok: true, ver: v, items: items };
  try { cache.put(ck, JSON.stringify(out), 600); } catch (e) {}
  return out;
}
function queueAdd_(p, id) {
  p = cleanPatient_(p);
  if (!p.name) return { ok: false, error: 'نام بیمار را وارد کنید.' };
  const sh = sheet_(), now = new Date().toISOString();
  id = String(id || '').slice(0, 60);
  if (id && findRow_(sh, id) > 0) return { ok: true, id: id }; // a retried request: already added
  const o = { id: id || Utilities.getUuid(), name: p.name, nid: p.nid, status: 'queued', total: 0, edits: 0, createdAt: now, updatedAt: now,
              queue: 'waiting', queuedAt: now };
  o.data = JSON.stringify({ h: { name: p.name, nid: p.nid, date: p.date, phone: p.phone, age: p.age, asst: p.asst }, med: p.med, note: p.note, status: 'queued' });
  writeRow_(sh, -1, o);
  bump_();
  return { ok: true, id: o.id };
}
function queueUpdate_(id, p) {
  p = cleanPatient_(p);
  if (!p.name) return { ok: false, error: 'نام بیمار را وارد کنید.' };
  const sh = sheet_(), row = findRow_(sh, id);
  if (row < 0) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const o = readRow_(sh, row);
  if (o.queue !== 'waiting') return { ok: false, error: 'پزشک پرونده را باز کرده؛ دیگر قابل ویرایش نیست.' };
  let d = {}; try { d = JSON.parse(o.data || '{}'); } catch (e) {}
  d.h = Object.assign(d.h || {}, { name: p.name, nid: p.nid, date: p.date, phone: p.phone, age: p.age, asst: p.asst });
  d.note = p.note; d.med = p.med;
  o.name = p.name; o.nid = p.nid; o.data = JSON.stringify(d); o.updatedAt = new Date().toISOString();
  writeRow_(sh, row, o);
  bump_();
  return { ok: true };
}
function queueDelete_(id) {
  const sh = sheet_(), row = findRow_(sh, id);
  if (row < 0) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const o = readRow_(sh, row);
  if (o.queue !== 'waiting') return { ok: false, error: 'پزشک پرونده را باز کرده؛ دیگر قابل حذف نیست.' };
  sh.deleteRow(row);
  bump_();
  return { ok: true };
}
function queueOpen_(id, role) {
  const sh = sheet_(), row = findRow_(sh, id);
  if (row < 0) return { ok: false, error: 'این بیمار پیدا نشد.' };
  const o = readRow_(sh, row);
  const from = role === 'consultant' ? 'consult' : 'waiting', to = role === 'consultant' ? 'consulting' : 'reviewing';
  if (o.queue === from) { o.queue = to; writeRow_(sh, row, o); bump_(); }
  let data = {}; try { data = JSON.parse(o.data || '{}'); } catch (e) {}
  return { ok: true, id: o.id, data: data, status: o.status, jalali: o.jalali, emailStatus: o.emailStatus, pdfName: o.fileName, edits: Number(o.edits) || 0 };
}
/** پزشک طرح درمان را به کارتابل مشاور می‌فرستد */
function toConsult_(rec) {
  const r = save_(rec);
  if (!r.ok) return r;
  const sh = sheet_(), row = findRow_(sh, r.id);
  const o = readRow_(sh, row), now = new Date().toISOString();
  o.queue = 'consult';
  o.consultAt = now;
  if (!o.queuedAt) o.queuedAt = now;
  writeRow_(sh, row, o);
  bump_();
  return { ok: true, id: o.id };
}

/* ---------- storage helpers ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss_() {
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create('بایگانی طرح درمان ایمپلنت');
  p.setProperty('SHEET_ID', ss.getId());
  return ss;
}
function sheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.getSheets()[0];
    sh.setName(SHEET_NAME);
    sh.clear();
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < COLS.length) {
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]);
  }
  return sh;
}
function folder_() {
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder(FOLDER_NAME);
  p.setProperty('FOLDER_ID', f.getId());
  return f;
}
function settings_() {
  const raw = PropertiesService.getScriptProperties().getProperty('SETTINGS');
  let s = {};
  try { s = raw ? JSON.parse(raw) : {}; } catch (e) {}
  const out = Object.assign({}, DEFAULT_SETTINGS, s);
  out.prices = Object.assign({}, DEFAULT_PRICES, s.prices || {});
  return out;
}
function cleanPrices_(p) {
  const out = {};
  const n = v => String(v == null ? '' : v).replace(/[^\d]/g, '').slice(0, 15);
  Object.keys(p || {}).forEach(k => {
    if (!/^[a-z_]{2,10}$/.test(k)) return;
    const v = p[k] || {}, bp = v.bp || {};
    out[k] = { price: n(v.price), bp: { ir: n(bp.ir), ko: n(bp.ko), it: n(bp.it), sw: n(bp.sw) } };
  });
  return out;
}
function setSettings_(s) {
  s = s || {};
  if (s.recipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.recipient)) return { ok: false, error: 'ایمیل گیرنده درست نیست.' };
  const clean = {
    recipient: String(s.recipient || '').trim(),
    clinic: String(s.clinic || '').slice(0, 200),
    doctor: String(s.doctor || '').slice(0, 200),
    phone: String(s.phone || '').slice(0, 100),
    prices: s.prices ? cleanPrices_(s.prices) : (settings_().prices || {})
  };
  PropertiesService.getScriptProperties().setProperty('SETTINGS', JSON.stringify(clean));
  return { ok: true, settings: settings_() };
}
function findRow_(sh, id) {
  if (!id) return -1;
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}
function readRow_(sh, row) {
  const v = sh.getRange(row, 1, 1, COLS.length).getValues()[0];
  const o = {};
  COLS.forEach((c, i) => o[c] = v[i]);
  return o;
}
function writeRow_(sh, row, o) {
  const values = [COLS.map(c => (o[c] === undefined || o[c] === null) ? '' : String(o[c]))];
  const r = row > 0 ? row : sh.getLastRow() + 1;
  const range = sh.getRange(r, 1, 1, COLS.length);
  range.setNumberFormat('@'); // keep national IDs (leading zeros) and dates as plain text
  range.setValues(values);
}

/* ---------- actions ---------- */
function list_() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2, 1, last - 1, COLS.length).getValues();
  return rows.map(v => {
    const o = {};
    COLS.forEach((c, i) => { if (c !== 'data') o[c] = v[i]; });
    o.updatedAt = String(o.updatedAt);
    return o;
  }).filter(o => o.id).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1);
}
function get_(id) {
  const sh = sheet_();
  const row = findRow_(sh, id);
  if (row < 0) return { ok: false, error: 'این فرم پیدا نشد.' };
  const o = readRow_(sh, row);
  let data = {};
  try { data = JSON.parse(o.data || '{}'); } catch (e) {}
  return { ok: true, id: o.id, data: data, status: o.status, jalali: o.jalali, emailStatus: o.emailStatus,
           emailError: o.emailError, pdfName: o.fileName, edits: Number(o.edits) || 0 };
}
function save_(rec) {
  if (!rec || !rec.data) return { ok: false, error: 'اطلاعات فرم نرسید.' };
  const sh = sheet_();
  const now = new Date().toISOString();
  let row = findRow_(sh, rec.id);
  let o;
  if (row > 0) {
    o = readRow_(sh, row);
    // a confirmed form that is saved again without re-confirming is marked as modified
    o.status = (o.status === 'confirmed' || o.status === 'modified') ? 'modified' : 'draft'; // queued → draft
  } else {
    o = { id: Utilities.getUuid(), createdAt: now, status: 'draft', edits: 0 };
  }
  o.name = String(rec.name || '').slice(0, 200);
  o.nid = String(rec.nid || '').slice(0, 30);
  o.updatedAt = now;
  if (o.queue === 'waiting') o.queue = 'reviewing';
  if (o.queue) bump_();
  rec.data.status = o.status;
  // an older copy (e.g. a delayed retry) never overwrites a newer plan
  let old = {}; try { old = JSON.parse(o.data || '{}'); } catch (e) {}
  if (!(old.updatedAt && rec.data.updatedAt && String(old.updatedAt) > String(rec.data.updatedAt))) { o.data = JSON.stringify(rec.data); o.total = Number(rec.total) || 0; }
  writeRow_(sh, row, o);
  return { ok: true, id: o.id, status: o.status };
}
function confirm_(req) {
  const rec = req.record;
  if (!rec || !rec.data || !req.pdf || !req.fileName) return { ok: false, error: 'اطلاعات فرم یا PDF نرسید.' };
  const s = settings_();
  // 1) slow work without holding the lock: save PDF to Drive and send the email
  const name = String(req.fileName).replace(/[\/\\:*?"<>|]+/g, ' ').slice(0, 180);
  const blob = Utilities.newBlob(Utilities.base64Decode(req.pdf), 'application/pdf', name);
  const file = folder_().createFile(blob);
  const sent = AUTO_EMAIL ? sendPdf_(s.recipient, req.mail, file) : null;
  // 2) short locked section: update the archive row and the queue
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, error: 'سرور مشغول است؛ دوباره تلاش می‌شود.' };
  try {
    const sh = sheet_();
    const now = new Date().toISOString();
    const row = findRow_(sh, rec.id);
    const o = row > 0 ? readRow_(sh, row) : { id: String(rec.id || '').slice(0, 60) || Utilities.getUuid(), createdAt: now, edits: 0 };
    const wasConfirmed = o.status === 'confirmed' || o.status === 'modified';
    if (o.fileId && o.fileId !== file.getId()) { try { DriveApp.getFileById(o.fileId).setTrashed(true); } catch (e) {} }
    o.name = String(rec.name || '').slice(0, 200);
    o.nid = String(rec.nid || '').slice(0, 30);
    o.total = Number(rec.total) || 0;
    o.status = 'confirmed';
    if (['waiting', 'reviewing', 'consult', 'consulting'].indexOf(o.queue) >= 0) { o.queue = 'done'; o.doneAt = now; bump_(); }
    o.jalali = String(rec.jalali || '');
    o.fileId = file.getId();
    o.fileName = name;
    o.edits = wasConfirmed ? (Number(o.edits) || 0) + 1 : (Number(o.edits) || 0);
    o.updatedAt = now;
    rec.data.status = 'confirmed';
    rec.data.edits = o.edits;
    o.data = JSON.stringify(rec.data);
    if (sent) {
      o.emailStatus = sent.ok ? 'sent' : 'failed';
      o.emailError = sent.ok ? '' : sent.error;
      o.emailTo = s.recipient;
      if (sent.ok) o.emailedAt = now;
    } else { o.emailStatus = ''; o.emailError = ''; }
    writeRow_(sh, row, o);
    return { ok: true, id: o.id, emailStatus: o.emailStatus, emailError: o.emailError, emailTo: s.recipient, fileUrl: file.getUrl() };
  } finally {
    lock.releaseLock();
  }
}
function resend_(req) {
  const sh = sheet_();
  const row = findRow_(sh, req.id);
  if (row < 0) return { ok: false, error: 'این فرم پیدا نشد.' };
  const o = readRow_(sh, row);
  if (!o.fileId) return { ok: false, error: 'برای این فرم هنوز PDFی ثبت نشده است.' };
  let file;
  try { file = DriveApp.getFileById(o.fileId); } catch (e) { return { ok: false, error: 'فایل PDF در گوگل درایو پیدا نشد.' }; }
  const s = settings_();
  const sent = sendPdf_(s.recipient, req.mail, file);
  o.emailStatus = sent.ok ? 'sent' : 'failed';
  o.emailError = sent.ok ? '' : sent.error;
  o.emailTo = s.recipient;
  if (sent.ok) o.emailedAt = new Date().toISOString();
  writeRow_(sh, row, o);
  return { ok: true, emailStatus: o.emailStatus, emailError: o.emailError, emailTo: s.recipient };
}
function sendPdf_(to, mail, file) {
  if (!to) return { ok: false, error: 'ایمیل گیرنده در تنظیمات تعیین نشده است.' };
  mail = mail || {};
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return { ok: false, error: 'سهمیه‌ی روزانه‌ی ارسال ایمیل گوگل تمام شده؛ فردا دوباره بفرستید.' };
    GmailApp.sendEmail(to, String(mail.subject || file.getName()).slice(0, 250), String(mail.body || ''), {
      attachments: [file.getBlob()],
      name: 'طرح درمان ایمپلنت'
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}
