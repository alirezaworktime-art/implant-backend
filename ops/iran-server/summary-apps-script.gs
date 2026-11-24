// Apps Script (standalone project): receives the nightly patient summary from the Iran server
const KEY = 'kuEemOSnxA5ICL9RDAzUo5RolQ6Xps9v';
const SSID = 'GOOGLE_SHEET_ID';
const TAB = 'خلاصه بیماران';
const H = ['تاریخ تأیید', 'نام بیمار', 'موبایل', 'برند', 'تعداد ایمپلنت', 'جزئیات', 'شناسه'];
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.key !== KEY) return out({ ok: false, error: 'auth' });
    if (b.action !== 'summary') return out({ ok: false, error: 'action' });
    const ss = SpreadsheetApp.openById(SSID);
    let sh = ss.getSheetByName(TAB);
    if (!sh) { sh = ss.insertSheet(TAB); sh.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold'); sh.setFrozenRows(1); sh.setRightToLeft(true); }
    const last = sh.getLastRow();
    const old = last > 1 ? sh.getRange(2, 1, last - 1, H.length).getValues() : [];
    const pos = new Map(old.map((r, i) => [String(r[6]), i]));
    let added = 0, updated = 0;
    (b.rows || []).forEach(r => {
      const v = [r.date || '', r.name || '', r.phone ? "'" + r.phone : '', r.brand || '', Number(r.units) || 0, r.detail || '', String(r.id || '')];
      if (pos.has(v[6])) { old[pos.get(v[6])] = v; updated++; } else { pos.set(v[6], old.length); old.push(v); added++; }
    });
    if (old.length) sh.getRange(2, 1, old.length, H.length).setValues(old);
    return out({ ok: true, added: added, updated: updated, total: old.length });
  } catch (err) { return out({ ok: false, error: String(err) }); }
}
