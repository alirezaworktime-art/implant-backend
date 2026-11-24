// t-m35: manager «گزارش پزشکان» numbers (owner's discount rules), mapping, drug code, tariffs. Run: WORKER=<bundle> node t-m35.mjs
import { h, A, W } from '../m24/probe.mjs'; import { uuid } from '../audit/A.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 900))); if (!c) bad++ };
const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10), D1 = day(-3), D2 = day(-2);
const L = (k, doc, n, price, ds, extra) => Object.assign({ id: 'l' + uuid().slice(0, 8), k, day: D1, doc, teeth: [], n, price, ds }, extra || {});
const arc = (name, lines, extra) => Object.assign({ v6: 1, name, phone: '', nid: '', age: '40', city: 'یزد', doc: 'د. اکبر پور', pfile: '', pays: [], disc: {}, settled: false, rem: '', open: false, lines }, extra || {});
await h.call('manager', 'm1Rep', {});
// ---- paper file A: line discounts
let r = await h.call('staff', 'fxArc', { id: '', by: 'م', ackDup: 1, ackFile: 1, arc: arc('بیمار الف', [
  L('gbr1', 'د. اکبر پور', 2, 10500000, { t: { m: 'a', v: '2000000' } }),
  L('hard1', 'د.صادقی', 1, 8000000, { d: { m: 'a', v: '1000000' } }),
  L('alv1', 'د. اکبر پور', 1, 4000000, { c: { m: 'a', v: '100000' } })]) });
ok(r.ok, 'paper file A saved', r); const A1 = r.id;
// ---- paper file B: old file-wide discount, two doctors
r = await h.call('staff', 'fxArc', { id: '', by: 'م', ackDup: 1, ackFile: 1, arc: arc('بیمار ب', [L('gbr1', 'د. اکبر پور', 1, 10500000, {}, { day: D2 }), L('hard1', 'د.صادقی', 1, 8000000, {}, { day: D2 })], { disc: { c: { m: 'a', v: '1850000' }, d: { m: 'a', v: '900000' } } }) });
ok(r.ok, 'paper file B saved', r);
const get = async (from = D1, to = D2) => (await h.call('manager', 'm1Rep', { op: 'drRep', from, to }));
r = await h.call('accountant', 'm1Rep', { op: 'drRep', from: D1, to: D2 }); ok(r.ok === false, 'only the manager opens «گزارش پزشکان»', r);
r = await get(); ok(r.ok && Array.isArray(r.rows), 'report answers', r.error);
const pick = (pat, svc) => r.rows.filter(x => x.pat === pat && x.svc === svc);
let x = pick('بیمار الف', 'GBR 1')[0];
ok(x && x.qty === 2 && x.doc === 'د. اکبر پور' && x.amt === 21000000 && x.dT === 2000000 && x.dD === 0 && x.dC === 0 && x.net === 19000000 && x.fee === 21000000 && x.ded === 1000000 && x.pay === 20000000, 'total discount 2,000,000 → doctor −1,000,000 (half), patient paid 19,000,000', x);
x = pick('بیمار الف', 'نسج سخت 1')[0];
ok(x && x.doc === 'د.صادقی' && x.dD === 1000000 && x.net === 7000000 && x.fee === 8000000 && x.ded === 1000000 && x.pay === 7000000, 'doctor-share discount → −100% from that line’s doctor', x);
x = pick('بیمار الف', 'آلوئولوپلاستی')[0];
ok(x && x.doc === 'د. اکبر پور' && x.dC === 100000 && x.net === 3900000 && x.fee === 20000000 && x.ded === 0 && x.pay === 20000000, 'clinic-share discount → no effect on the doctor ', x);
const b1 = pick('بیمار ب', 'GBR 1')[0], b2 = pick('بیمار ب', 'نسج سخت 1')[0];
ok(b1 && b2 && b1.dC + b2.dC === 1850000 && b1.dC === 1050000 && b2.dC === 800000 && b1.dD + b2.dD === 900000 && b1.dD === Math.round(900000 * 10500000 / 18500000) && b1.net + b2.net === 18500000 - 2750000, 'old file-wide discount: clinic part by amount, doctor part by doctor share — exact to the toman', [b1, b2]);
ok(b1.day === D2 && pick('بیمار ب', 'GBR 1').length === 1, 'each line keeps its own date');
r = await get(D2, D2); ok(r.ok && !r.rows.some(x => x.pat === 'بیمار الف') && r.rows.some(x => x.pat === 'بیمار ب'), 'date range filters by the date of each service');
// ---- visit bill (accountant) with a doctor-share discount and a clinic service
const pid = await h.add('بیمار ج'); const sv = n => h.sql(`select id from fin_svc where name='${n}'`)[0].id;
r = await h.call('accountant', 'finInvSave', { inv: { id: '', day: D1, plan: pid, lines: [{ svc: sv('GBR 1'), payee: 'py7', qty: 1, price: '' }, { svc: sv('قالبگیری مجدد پایه'), payee: 'py8', qty: 2, price: '', init: 'py0' }], discC: 300000, discD: 2000000, parts: 0, pays: [], note: '' } });
ok(r.ok, 'accountant bill saved', r);
r = await get(); x = r.rows.find(y => y.pat === 'بیمار ج' && y.svc === 'GBR 1'); const y2 = r.rows.find(y => y.pat === 'بیمار ج' && y.svc === 'قالبگیری مجدد پایه');
ok(x && x.src === 'inv' && x.doc === 'د.علوی کیا' && x.fee === 10500000 && x.dD === 2000000 && x.ded === 2000000 && x.pay === 8500000, 'bill: doctor-share discount from the doctor', x);
ok(y2 && y2.clinic === 1 && y2.fee === 0 && y2.qty === 2 && x.dC + y2.dC === 300000, 'bill: clinic service in the «کلینیک» column; clinic discount spread by amount', y2);
// ---- consultant «تخفیف کلی» of kind «کل» on the automatic bill counts as a total discount (half from the doctor)
const pid2 = await h.add('بیمار د'); h.sql(`update plans set data=json_set(data,'$.pay',json('{"gdAmt":"1000000","gdw":"t","gdwhy":"x"}')) where id='${pid2}'`);
const gl = JSON.stringify([{ svc: sv('GBR 1'), name: 'GBR 1', cat: 's', qty: 1, price: 10500000, amt: 10500000, payee: 'py0', pname: 'د. اکبر پور', fee: 10500000, fee0: 0, feeNet: 9500000 }]);
h.sql(`insert into fin_inv (id, no, day, plan, pname, pfile, lines, total, discC, discD, parts, net, fees, note, by, st) values ('ivpk1', 9001, '${D1}', '${pid2}', 'بیمار د', '', '${gl}', 10500000, 0, 1000000, 0, 9500000, 9500000, 'ثبت خودکار از کارهای روز · تخفیف کلی مشاور (x): 1000000', 'خودکار', 'ok')`); r = { ok: true };
ok(r.ok, 'automatic bill with the consultant discount saved', r);
r = await get(); x = r.rows.find(y => y.pat === 'بیمار د');
ok(x && x.dT === 1000000 && x.dD === 0 && x.dC === 0 && x.ded === 500000 && x.pay === 10000000, 'consultant total discount → doctor −50%', x);
// ---- totals per doctor
const by = {}; r.rows.filter(z => !z.clinic).forEach(z => { by[z.doc] = (by[z.doc] || 0) + z.pay }); ok(by['د. اکبر پور'] === 20000000 + 20000000 + (10500000 - b1.dD) + 10000000 && by['د.صادقی'] === 7000000 + (8000000 - b2.dD) && by['د.علوی کیا'] === 8500000, 'payable sums per doctor', by);
// ---- mapping
r = await h.call('manager', 'm1Rep', { op: 'drMap' }); ok(r.ok && r.map.unc === 'آنکاوری' && r.keys.includes('gbr1'), 'mapping table', r.map && r.map.unc);
r = await h.call('manager', 'm1Rep', { op: 'drMapSave', map: { alv1: 'هزینه هلینگ' } }); ok(r.ok && r.map.alv1 === 'هزینه هلینگ', 'mapping changed', r);
r = await get(); ok(r.rows.some(z => z.pat === 'بیمار الف' && z.svc === 'هزینه هلینگ') && !r.rows.some(z => z.pat === 'بیمار الف' && z.svc === 'آلوئولوپلاستی'), 'report follows the new mapping');
r = await h.call('manager', 'm1Rep', { op: 'drMapSave', map: { alv1: 'چیز ناموجود' } }); ok(r.ok === false, 'an unknown service is refused', r);
await h.call('manager', 'm1Rep', { op: 'drMapSave', map: {} });
// ---- tariffs: the manager may save service prices and doctor tariffs (only those)
r = await h.call('manager', 'finCatSave', { t: 'svc', x: { id: sv('GBR 2'), name: 'GBR 2', cat: 's', price: '11000000', rule: 'doctor', ord: 1 } }); ok(r.ok && h.sql(`select price from fin_svc where name='GBR 2'`)[0].price === 11000000, 'manager saves a service price', r);
r = await h.call('manager', 'finCatSave', { t: 'fees', x: { rows: [{ svc: sv('GBR 2'), payee: 'py0', amount: '9000000' }] } }); ok(r.ok && h.sql(`select amount from fin_fee where svc='${sv('GBR 2')}' and payee='py0'`)[0].amount === 9000000, 'manager saves a doctor tariff', r);
r = await h.call('manager', 'finCatSave', { t: 'bank', x: { name: 'x' } }); ok(r.ok === false, 'other accounting settings stay with the accountant', r);
r = await h.call('manager', 'finInvSave', { inv: {} }); ok(r.ok === false, 'manager still cannot write bills', r);
r = await h.call('manager', 'settings', { settings: { prices: Object.assign({}, (await h.call('manager', 'settings', {})).settings.prices, { lv_gbrb: { price: '12000000', bp: {} } }) } });
ok(r.ok !== false && ((await h.call('manager', 'settings', {})).settings.prices.lv_gbrb || {}).price === '12000000', 'a level tariff is kept in the site prices', r);
// ---- drug tracking code
const sid = await (async () => { const id = await h.add('بیمار ترخیص'); return id })();
h.sql(`update plans set queue='surgdone', surg=json('{"sessions":[{"at":"${new Date().toISOString()}"}],"lastDay":"${day(0)}"}') where id='${sid}'`);
h.sql(`update plans set data=json_set(data,'$.h.file','777') where id='${sid}'`);
h.sql(`insert into rxlog (id, plan, at, by) values ('rx-${uuid().slice(0, 6)}','${sid}','${new Date().toISOString()}','x')`);
r = await h.call('staff', 'discharge', { id: sid, care: true, note: '', by: 'م', rxc: '۱۲۳۴۵۶۷۸۹' });
const dis = () => JSON.parse(h.sql(`select surg from plans where id='${sid}'`)[0].surg).dis || {};
ok(r.ok && dis().rxc === '123456789', 'discharge keeps the drug tracking code (Persian digits normalised)', [r, dis()]);
r = await h.call('staff', 'discharge', { id: sid, rxcOnly: 1, rxc: '555' }); ok(r.ok && dis().rxc === '555', 'reception corrects the code later', dis());
r = await h.call('manager', 'm1Rep', { op: 'drRxc', id: sid, rxc: '666' }); ok(r.ok && dis().rxc === '666', 'manager corrects the code', dis());
r = await h.call('doctor', 'discharge', { id: sid, rxcOnly: 1, rxc: '1' }); ok(r.ok === false || dis().rxc === '666', 'a doctor cannot change it', dis());
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
