// t-m26ui: definitions like the lab's own site — department «تست لازم» + description, account extra fields, bulk delete of empty boxes. Run: WORKER=<bundle> node t-m26ui.mjs
import { h, A, W, chromium, mk } from '../m24/probe.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const a = await mk('الف جعبه', true);
await h.must('lab', 'lab5', { op: 'boxAdd', from: '801', to: '805' }); h.sql(`update labs set data=json_set(data,'$.box','803') where id='${a}'`);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (vw) => { const c = await b.newContext({ viewport: { width: vw, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click('[data-lrole="lab"]'); await p.fill('#lg_pw', A.PW.lab); await p.click('#lgGo'); await W(3500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const sheet = p => p.evaluate(() => { const s = document.getElementById('uxAskSh'); return s && !s.hidden ? { t: s.querySelector('h3').textContent, lbl: [...s.querySelectorAll('label')].map(l => l.childNodes[0].textContent.trim()) } : null });
const idx = (f, l) => f.lbl.indexOf(l);
try {
  const p = await login(1500);
  ok(await p.evaluate(() => /---------- m26 \(/.test(document.documentElement.innerHTML)), 'm26 marker in the page');
  // ---- accounts
  await p.evaluate(() => l5Go('d/acct')); await W(2500);
  await p.click('[data-l8ac=""]'); await W(600); let f = await sheet(p);
  ok(f && ['موبایل (اصلی)', 'تلفن ثابت', 'موبایل ۲', 'موبایل ۴', 'تلفن ثابت ۴', 'ایمیل', 'منطقه', 'استان', 'شهر', 'آدرس'].every(l => f.lbl.includes(l)) && idx(f, 'آدرس') < idx(f, 'کد') && idx(f, 'موبایل (اصلی)') < idx(f, 'تلفن ثابت'), 'new-account sheet has the extra fields after the phone', f);
  const fill = (l, v) => p.fill(`#uxAskSh [data-ak="${idx(f, l)}"]`, v);
  await fill('نام', 'مرکز آزمون'); await fill('موبایل (اصلی)', '09120000000'); await fill('موبایل ۲', '۰۹۱۲۰۰۰۰۰۰۰'); await fill('ایمیل', 'غلط'); await p.click('#uxAskOk'); await W(1200);
  ok(h.sql(`select count(*) c from lab_acct where name='مرکز آزمون'`)[0].c === 0 && await p.evaluate(() => { const t = document.getElementById('toast'); return !t.hidden && /ایمیل/.test(t.textContent) }), 'bad e-mail → visible message, nothing saved');
  await p.evaluate(() => document.querySelectorAll('.sheet').forEach(s => { s.hidden = true })); await p.click('[data-l8ac=""]'); await W(600); f = await sheet(p);
  await fill('نام', 'مرکز آزمون'); await fill('موبایل (اصلی)', '09120000000'); await fill('موبایل ۲', '۰۹۱۲۰۰۰۰۰۰۰'); await fill('تلفن ثابت', '03536200000'); await fill('ایمیل', 'lab@example.com'); await fill('منطقه', 'صفائیه'); await fill('شهر', 'یزد'); await fill('آدرس', 'بلوار دانشجو، کوچه ۴'); await p.click('#uxAskOk'); await W(2500);
  const row = h.sql(`select id, phone, ext from lab_acct where name='مرکز آزمون'`)[0], ex = row && JSON.parse(row.ext || '{}');
  ok(row && row.phone === '09120000000' && ex.m2 === '09120000000' && ex.tel === '03536200000' && ex.email === 'lab@example.com' && ex.region === 'صفائیه' && ex.city === 'یزد' && /کوچه/.test(ex.addr), 'account stored with extras from the page', row);
  const tr = await p.evaluate(() => { const r = [...document.querySelectorAll('#viewLab tr[data-l5an]')].find(t => /مرکز آزمون/.test(t.textContent)); return r ? { x: (r.querySelector('.m26x') || {}).textContent || '', n: r.dataset.l5an } : null });
  ok(tr && /۰۹۱۲۰۰۰۰۰۰۰/.test(tr.x) && /lab@example\.com/.test(tr.x) && /صفائیه، یزد/.test(tr.x) && /بلوار دانشجو/.test(tr.x), 'the table shows the other numbers, e-mail, place and address', tr);
  await p.fill('#l5aq', 'lab@example'); await W(300); ok(await p.evaluate(() => [...document.querySelectorAll('#viewLab tr[data-l5an]')].filter(t => !t.hidden).length) === 1, 'search finds the account by e-mail');
  await p.fill('#l5aq', ''); await p.click(`[data-l8ac="${row.id}"]`); await W(600); f = await sheet(p);
  ok(await p.evaluate(i => document.querySelector(`#uxAskSh [data-ak="${i}"]`).value, idx(f, 'ایمیل')) === 'lab@example.com' && /ویرایش/.test(f.t), 'edit sheet is pre-filled', f);
  await fill('ایمیل', ''); await p.click('#uxAskOk'); await W(2200); ok(!JSON.parse(h.sql(`select ext from lab_acct where id='${row.id}'`)[0].ext).email, 'a field can be cleared');
  await p.screenshot({ path: '/home/claude/w/m26/acct.png' });
  // ---- department
  await p.evaluate(() => l5Go('d/dept')); await W(2500);
  const dn = h.sql(`select id, name from lab_dept where active=1 order by sort, id`)[0];
  await p.click(`[data-l2de="dept"][data-id="${dn.id}"]`); await W(700); f = await sheet(p);
  ok(f && f.lbl.includes('ارسال برای تست پیش از تکمیل') && f.lbl.includes('توضیحات'), 'department sheet has «ارسال برای تست» and «توضیحات»', f);
  if (f) { await p.selectOption(`#uxAskSh [data-ak="${idx(f, 'ارسال برای تست پیش از تکمیل')}"]`, '1'); await fill('توضیحات', 'پیش از تکمیل باید تست شود'); await p.click('#uxAskOk'); await W(2200) }
  const fl = JSON.parse(h.sql(`select flags from lab_dept where id=${dn.id}`)[0].flags || '{}'); ok(fl.test === 1 && fl.desc === 'پیش از تکمیل باید تست شود', 'department flags stored from the page', fl);
  ok(await p.evaluate(id => { const it = document.querySelector(`[data-l2de="dept"][data-id="${id}"]`).closest('.item'); return /ارسال برای تست لازم/.test(it.textContent) && /پیش از تکمیل باید تست شود/.test(it.textContent) }, dn.id), 'the department list shows both');
  await p.screenshot({ path: '/home/claude/w/m26/dept.png' });
  // ---- boxes
  await p.evaluate(() => l5Go('d/box')); await W(2800);
  const bx = () => p.evaluate(() => ({ cb: [...document.querySelectorAll('#viewLab .m26bc')].map(c => c.value), on: [...document.querySelectorAll('#viewLab .l8bx.on')].map(x => !!x.querySelector('.m26bc')), del: (document.querySelector('[data-m26bd]') || {}).disabled, bar: document.querySelectorAll('[data-m26bd]').length }));
  let B1 = await bx(); ok(B1.bar === 1 && B1.del === true && ['801', '802', '804', '805'].every(n => B1.cb.includes(n)) && !B1.cb.includes('803') && B1.on.every(v => !v), 'empty boxes have a checkbox, the one in use does not', B1);
  await p.fill('#l8bq', String(h.sql(`select no from labs where id='${a}'`)[0].no)); await W(300); ok(await p.evaluate(() => [...document.querySelectorAll('#viewLab .l8bx')].filter(x => !x.hidden).length) === 1, 'search by order number finds the box');
  await p.fill('#l8bq', ''); await W(300);
  await p.check('.m26bc[value="801"]'); await p.check('.m26bc[value="802"]'); ok(await p.evaluate(() => { const d = document.querySelector('[data-m26bd]'); return !d.disabled && /۲/.test(d.textContent) }), 'button counts the selection');
  await p.click('[data-m26bd]'); await W(500); f = await sheet(p); ok(f && /حذف جعبه‌ها/.test(f.t), 'asks before deleting', f); await p.click('#uxAskNo'); await W(500);
  ok(h.sql(`select count(*) c from lab_box where active=1 and no in ('801','802')`)[0].c === 2, '«نه» deletes nothing');
  await p.click('[data-m26bd]'); await W(500); await p.click('#uxAskOk'); await W(2800);
  ok(h.sql(`select count(*) c from lab_box where active=1 and no in ('801','802')`)[0].c === 0 && h.sql(`select count(*) c from lab_box where active=1 and no in ('803','804','805')`)[0].c === 3, 'the two selected boxes are removed, the rest stay');
  B1 = await bx(); ok(!B1.cb.includes('801') && B1.cb.includes('804') && B1.del === true, 'the list is redrawn', B1);
  await p.screenshot({ path: '/home/claude/w/m26/boxes.png' });
  ok(p.PE.length === 0, 'no page errors', p.PE);
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 700)) }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
