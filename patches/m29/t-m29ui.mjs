// t-m29ui: paper files — «فیلد شدن ایمپلنت» in the form, sub-stages, «ادامه‌ی درمان» from the quick search and the archive, reception task lists. Run: WORKER=<bundle> node t-m29ui.mjs
import { h, A, W, chromium } from '../m24/probe.mjs'; import { uuid } from '../audit/A.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const day = n => new Date(Date.now() + 3.5 * 36e5 + (h.off() + n) * 864e5).toISOString().slice(0, 10);
const DOC = 'د.علوی کیا';
const D = id => JSON.parse(h.sql(`select data from plans where id='${id}'`)[0].data);
const T = id => h.sql(`select id, kind, due, done, note, info from tasks where plan='${id}' order by created, id`);
// a paper file made earlier: an implant on 36 (JD 4.3×10), file number 7788, national id
let r = await h.call('staff', 'fxArc', { id: '', by: 'منشی', ackDup: 1, ackFile: 1, arc: { v6: 1, name: 'رضا جامانده', phone: '09120000000', nid: '4420011223', age: '50', city: 'یزد', doc: DOC, pfile: '7788', pays: [], disc: {}, settled: false, rem: '', open: false,
  lines: [{ id: 'limp1', k: 'imp', day: day(-300), doc: DOC, teeth: ['LL6'], n: 1, price: 9000000, imp: { LL6: { b: 'JD', d: '4.3', l: '10' } } }] } });
if (!r.ok) { console.log('setup failed', r); process.exit(1) } const pid = r.id;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1400) => { const c = await b.newContext({ viewport: { width: vw, height: 950 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
  await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3200); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const jd = d => new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'));
try {
  const p = await login('staff');
  ok(await p.evaluate(() => /---------- m29 \(/.test(document.documentElement.innerHTML)), 'm29 marker in the page');
  // ---- (3) quick search by file number and national id
  for (const [q, what] of [['7788', 'file number'], ['4420011223', 'national id'], ['رضا جاما', 'name']]) { await p.fill('#rS', q); await W(500);
    const R = await p.evaluate(() => [...document.querySelectorAll('#rSRes .qrow')].map(x => ({ t: x.innerText.replace(/\s+/g, ' '), go: !!x.querySelector('[data-m29arc]') })));
    ok(R.length === 1 && /رضا جامانده/.test(R[0].t) && /پرونده ۷۷۸۸/.test(R[0].t) && /کاغذی/.test(R[0].t) && R[0].go, 'quick search by ' + what + ' finds the paper file with «ادامه‌ی درمان»', R) }
  await p.click('#rSRes [data-m29arc]'); await W(2500);
  ok(await p.evaluate(() => !document.getElementById('viewArc6').hidden && A6 && A6.name === 'رضا جامانده' && A6.lines.length === 1 && A6.lines[0].k === 'imp'), '«ادامه‌ی درمان» opens the paper-file form with the earlier treatment', await p.evaluate(() => A6 && { n: A6.name, l: A6.lines.length }));
  // ---- (1) the new treatment beside «پایه ایمپلنت»
  const order = await p.evaluate(() => [...document.querySelectorAll('[data-a6k]')].map(x => x.dataset.a6k)); ok(order.indexOf('ifail') === order.indexOf('imp') + 1, '«فیلد شدن ایمپلنت» is right after «پایه ایمپلنت»', order.slice(0, 5));
  await p.click('[data-a6k="ifail"]'); await W(500);
  const lid = await p.evaluate(() => A6.lines.find(l => l.k === 'ifail').id), q = `[data-l="${lid}"]`;
  let H = await p.evaluate(id => { const el = document.querySelector(`.a6l[data-l="${id}"]`); return { price: !!el.querySelector('[data-a6f="price"]'), sut: !!el.querySelector('.a6sut'), ds: !!el.querySelector('.a8ds'), rm: [...el.querySelectorAll('[data-m29rm] option')].map(o => o.textContent), note: el.querySelector('.a6tn').textContent } }, lid);
  ok(!H.price && !H.sut && !H.ds && H.rm[0] === 'بدون نوبت خودکار' && H.rm.includes('۴ ماه بعد') && /شکست خورده را بزنید/.test(H.note), 'the session has date, doctor, teeth and «کاشت مجدد» — no tariff, suture or discount', H);
  await p.fill(`[data-a6f="dayJ"]${q}`, jd(day(-30))); await p.keyboard.press('Tab'); await p.selectOption(`[data-a6f="doc"]${q}`, { index: 1 }); await p.click(`.a6t[data-a6t="LL6"]${q}`); await W(400);
  H = await p.evaluate(id => document.querySelector(`.a6l[data-l="${id}"] .a6tn`).innerText, lid); ok(/ایمپلنت شکست‌خورده/.test(H) && /JD/.test(H) && /۴٫۳×۱۰|4\.3×10|۴.۳×۱۰/.test(H) && /کاشت/.test(H), 'shows which implant was on that tooth (brand, size, placement date)', H);
  await p.selectOption(`[data-m29rm="${lid}"]`, '1'); await W(200);
  ok(/کارتابل منشی/.test(await p.evaluate(id => document.querySelector(`[data-m29h="${id}"]`).textContent, lid)), 'the hint says when the re-implant task comes');
  // ---- (2) sub-stage «معاینه»
  await p.click('[data-a6open="1"]'); await W(400);
  const opts = await p.evaluate(() => [...document.querySelectorAll('#a6Stage option')].map(o => o.value + ':' + o.textContent)); ok(opts.includes('exam:معاینه') && opts.includes('fup:پیگیری') && await p.evaluate(() => !!document.querySelector('#a6Stage optgroup')), 'the next-step list has «معاینه» and «پیگیری» as sub-stages', opts);
  await p.selectOption('#a6Stage', 'exam'); await W(400);
  ok(await p.evaluate(() => { const d = document.getElementById('a6Due'); return !!d && /تاریخ معاینه/.test(d.closest('label').textContent) }), 'choosing «معاینه» asks for its date');
  await p.click('#a6Save'); await W(900); ok(/تاریخ معاینه را درست بزنید/.test(await p.evaluate(() => document.getElementById('a6Msg').textContent)), 'saving without the date is refused', await p.evaluate(() => document.getElementById('a6Msg').textContent));
  await p.fill('#a6Due', jd(day(0))); await p.keyboard.press('Tab'); await p.screenshot({ path: '/home/claude/w/m29/form.png', fullPage: true }); await p.click('#a6Save'); await W(3500);
  const ask = await p.evaluate(() => { const s = document.getElementById('uxAskSh'); return s && !s.hidden ? s.textContent.slice(0, 80) : '' }); if (ask) { await p.click('#uxAskOk'); await W(3000) }
  const a = D(pid).arc, fl = a.lines.find(l => l.k === 'ifail'), ts = T(pid);
  ok(fl && fl.rm === 1 && fl.day === day(-30) && fl.teeth.join() === 'LL6' && a.cost === 9000000 && a.sub && a.sub.k === 'exam' && a.sub.due === day(0), 'saved: the failure line and the sub-stage', [fl, a.sub, ask, await p.evaluate(() => (document.getElementById('a6Msg') || {}).textContent)]);
  ok(ts.filter(t => t.kind === 'book' && t.info === 'reimp' && !t.done).length === 1 && ts.filter(t => t.kind === 'aexam' && !t.done && t.due === day(0)).length === 1, 'tasks: one re-implant, one exam', ts);
  // patient file shows the line
  await W(800); ok(await p.evaluate(() => { const s = document.getElementById('pfSheet'); return !!s && !s.hidden && /فیلد شدن ایمپلنت/.test(s.textContent) }), 'the patient file lists «فیلد شدن ایمپلنت»');
  await p.evaluate(() => document.querySelectorAll('.sheet').forEach(s => { s.hidden = true }));
  // ---- archive: the button and reopening shows the sub-stage
  await p.evaluate(() => goTile('arch')); await W(1500); await p.fill('#q', '7788'); await W(600);
  ok(await p.evaluate(() => { const r = [...document.querySelectorAll('#list .item')]; return r.length === 1 && !!r[0].querySelector('[data-m29arc]') }), 'archive search by file number shows «ادامه‌ی درمان»');
  await p.click('#list [data-m29arc]'); await W(2500);
  ok(await p.evaluate(() => A6 && A6.open === true && A6.stage === 'exam' && document.getElementById('a6Stage').value === 'exam' && !!document.getElementById('a6Due').value && A6.lines.some(l => l.k === 'ifail' && Number(l.rm) === 1)), 'reopened: «معاینه» with its date and the failure line with ۱ ماه', await p.evaluate(() => A6 && { o: A6.open, s: A6.stage, d: A6.dueJ }));
  await p.click('#a6Save'); await W(3500); ok(T(pid).filter(t => !t.done).length === 2 && T(pid).length === 2, 'saving again without a change makes no extra task', T(pid));
  await p.evaluate(() => document.querySelectorAll('.sheet').forEach(s => { s.hidden = true }));
  // ---- reception task lists (both tasks are due within the 60 days the reception list loads)
  await p.reload(); await W(3500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
  const L = await p.evaluate(() => { const o = {}; for (const id of ['ucList', 'fuList', 'bkList', 'sgList']) { const e = document.getElementById(id); if (e) o[id] = e.innerText.replace(/\s+/g, ' ').slice(0, 400) } o.all = [...document.querySelectorAll('.item.task')].filter(x => /رضا جامانده/.test(x.textContent)).map(x => x.innerText.replace(/\s+/g, ' ').slice(0, 300) + ' @' + (x.closest('[id]') || {}).id); return o });
  if (process.env.DBG) console.log(JSON.stringify(L), JSON.stringify(await p.evaluate(() => ({ n: TASKS.length, mine: TASKS.filter(t => /جامانده/.test(t.name)).map(t => t.kind + ':' + t.due + ':' + t.done), tiles: tileList().map(t => t.k + '=' + t.n) }))));
  ok(L.all.some(x => /معاینه \(پرونده‌ی جا مانده\)/.test(x) && /تعیین نوبت/.test(x) && /@ucList/.test(x)) && L.all.some(x => /کاشت دوباره‌ی ایمپلنت — دندان 36/.test(x) && /تعیین نوبت/.test(x)), 'reception sees «معاینه» (with «تعیین نوبت») and «کاشت دوباره‌ی ایمپلنت» with the tooth', L.all);
  ok(await p.evaluate(() => tileList().find(t => t.k === 'unc').n >= 1), 'the tile badge counts the exam');
  // follow-up
  await h.must('staff', 'fxArc', { id: pid, by: 'منشی', arc: Object.assign({ v6: 1, name: 'رضا جامانده', phone: '09120000000', nid: '4420011223', age: '50', city: 'یزد', doc: DOC, pfile: '7788', pays: [], disc: {}, settled: false, rem: '', lines: D(pid).arc.lines, open: true, type: 'fix', stage: 'fup', due: day(0) }) });
  await p.reload(); await W(3500); const L2 = await p.evaluate(() => [...document.querySelectorAll('.item.task')].filter(x => /رضا جامانده/.test(x.textContent)).map(x => x.innerText.replace(/\s+/g, ' ').slice(0, 200) + ' @' + (x.closest('[id]') || {}).id));
  ok(L2.some(x => /پیگیری \(پرونده‌ی جا مانده\)/.test(x) && /@fuList/.test(x) && /نوبت ویزیت/.test(x)) && !L2.some(x => /معاینه \(پرونده/.test(x) && !/انجام شد/.test(x.slice(0, 120))), '«پیگیری» shows in the follow-up list with «نوبت ویزیت»', L2);
  ok(await p.evaluate(() => tileList().find(t => t.k === 'fol').n >= 1), 'the «پیگیری‌ها» tile counts it');
  ok(p.PE.length === 0, 'no page errors', p.PE);
  // phone
  const ph = await login('staff', 390); await ph.fill('#rS', '7788'); await W(500); await ph.click('#rSRes [data-m29arc]'); await W(2500); await ph.evaluate(() => { const b = document.querySelector('[data-a6k="ifail"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click() }); await W(500);
  ok(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && ph.PE.length === 0, 'phone: the form with the new treatment has no sideways scroll', await ph.evaluate(() => [document.documentElement.scrollWidth, innerWidth])); await ph.screenshot({ path: '/home/claude/w/m29/form-phone.png' });
} catch (e) { bad++; console.log('ERR', e.stack.slice(0, 800)) }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
