// t-m57a: All on X Korean; SMS line in the «think» PDF; consultant keeps several patients open. Run: WORKER=<m57a bundle> node t-m57a.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const PE = [];
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1280, vh = 860) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); p.on('dialog', d => d.dismiss()); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try {
  // ---- (2) the number in settings
  let r = await h.call('consultant', 'm57Sms', { op: 'set', v: '09130000000' }); ok(r.ok === false, 'only the manager sets the number', r);
  let p = await login('manager'); ok(await p.evaluate(() => /---------- m57a \(/.test(document.documentElement.innerHTML)), 'm57a marker in the page');
  await p.evaluate(() => document.getElementById('tabSet').click()); await W(1500); ok(await p.evaluate(() => !!document.getElementById('m57sms')), 'settings has the SMS number field');
  await p.evaluate(() => { document.getElementById('m57sms').value = '۰۹۱۳۱۲۳۴۵۶۷'; document.getElementById('sSave').click() }); await W(2500);
  r = await h.call('staff', 'm57Sms', { op: 'get' }); ok(r.ok && r.v === '09131234567', 'saved with the settings (Persian digits accepted)', r);
  r = await h.call('manager', 'm57Sms', { op: 'set', v: '12' }); ok(r.ok === false, 'a wrong number is refused', r); await p.context().close();
  // ---- patients
  const ids = []; for (const nm of ['بیمار اول', 'بیمار دوم', 'بیمار سوم']) { const id = await h.add(nm); await h.plan(id, nm); ids.push(id) }
  ok(ids.every(id => h.sql(`select queue from plans where id='${id}'`)[0].queue === 'consult'), 'three patients wait for the consultant');
  p = await login('consultant'); await p.evaluate(() => pollQ(true)); await W(2500);
  const openQ = async id => { await p.evaluate(id => { show('queue'); renderQ() }, id); await W(400); await p.click(`[data-qopen="${id}"]`); await W(2200) };
  // ---- (3) tabs
  await openQ(ids[0]); await p.evaluate(() => { F.note = 'یادداشت آزمایشی ذخیره‌نشده'; touch() }); await W(300);
  let v = await p.evaluate(() => ({ id: F.id, bar: !document.getElementById('m57Bar').hidden, tabs: [...document.querySelectorAll('[data-m57o]')].map(x => x.textContent.trim()) }));
  ok(v.id && v.bar && v.tabs.length === 1 && /بیمار اول/.test(v.tabs[0]), 'opening a patient puts them in the bar', v);
  await p.click('[data-m57q]'); await W(600); ok(await p.evaluate(() => !document.getElementById('viewQueue').hidden && !document.getElementById('m57Bar').hidden), '«+ بیمار دیگر» goes to the cartable and the bar stays');
  await openQ(ids[1]); v = await p.evaluate(() => ({ id: F.id, tabs: [...document.querySelectorAll('[data-m57o]')].map(x => x.dataset.m57o), on: (document.querySelector('.m57t.on [data-m57o]') || {}).dataset, dot: document.querySelectorAll('.m57d').length }));
  ok(v.tabs.length === 2 && v.on && v.on.m57o === ids[1] && v.dot === 1, 'two patients in the bar; the first shows unsaved changes', v);
  await p.click(`[data-m57o="${ids[0]}"]`); await W(2200);
  v = await p.evaluate(() => ({ id: F.id, note: F.note, dirty, view: !document.getElementById('viewForm').hidden }));
  ok(v.id === ids[0] && v.note === 'یادداشت آزمایشی ذخیره‌نشده' && v.dirty && v.view, 'back to the first patient with the unsaved change', v);
  await p.click(`[data-m57o="${ids[1]}"]`); await W(2200); ok(await p.evaluate(id => F.id === id, ids[1]), 'and to the second again');
  await p.click(`[data-m57c="${ids[1]}"]`); await W(800); v = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('[data-m57o]')].map(x => x.dataset.m57o), q: !document.getElementById('viewQueue').hidden }));
  ok(v.tabs.length === 1 && v.tabs[0] === ids[0] && v.q, 'closing the open tab goes back to the cartable', v);
  ok(h.sql(`select queue from plans where id='${ids[1]}'`)[0].queue === 'consulting', 'closing a tab does not change the patient on the server');
  // phone width
  await p.setViewportSize({ width: 390, height: 760 }); await openQ(ids[2]); await openQ(ids[1]); await W(300);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelectorAll('[data-m57o]').length === 3), 'phone: three tabs fit without sideways scroll', await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  await p.setViewportSize({ width: 1280, height: 860 });
  // ---- (2) the «think» PDF of patient 3
  await p.click(`[data-m57o="${ids[2]}"]`); await W(2200);
  await p.evaluate(() => { window.__tb = []; const _t = textBlock; textBlock = function (t, l) { window.__tb.push([t, (l || []).join(' | ')]); return _t.apply(this, arguments) }; window.__dl = []; const _d = downloadBlob; downloadBlob = function (bl, n) { window.__dl.push({ n, s: bl.size }) } });
  const units = await p.evaluate(() => m57Units(F));
  await p.evaluate(() => openUndecided('')); await W(400); await p.click('#unWhy [data-unw]'); await p.click('#unGo'); await W(5000);
  v = await p.evaluate(() => ({ tb: window.__tb.filter(x => x[0] === 'برای شروع درمان'), dl: window.__dl, tabs: [...document.querySelectorAll('[data-m57o]')].map(x => x.dataset.m57o) }));
  ok(units > 0 && v.tb.length === 1 && v.tb[0][1].includes('۰۹۱۳۱۲۳۴۵۶۷') && v.tb[0][1].includes('«بیمار سوم مایل به درمان ' + units.toLocaleString('fa-IR') + ' واحد ایمپلنت در یزد می‌باشم.»'), 'the «think» PDF carries the SMS text with name, units and the number', { units, tb: v.tb });
  ok(v.dl.length === 1 && v.dl[0].s > 1000 && !v.tabs.includes(ids[2]), 'the PDF downloads and the patient leaves the bar', v);
  // «lost» PDF has no SMS line
  await p.click(`[data-m57o="${ids[1]}"]`); await W(2200); await p.evaluate(() => { window.__tb = []; window.__dl = [] });
  await p.evaluate(() => openUndecided('lost')); await W(400); await p.click('#unWhy [data-unw]'); await p.click('#unGo'); await W(5000);
  v = await p.evaluate(() => ({ tb: window.__tb.filter(x => x[0] === 'برای شروع درمان').length, dl: window.__dl.length })); ok(v.tb === 0 && v.dl === 1, 'the «انصراف» PDF has no SMS text', v);
  // ---- (1) All on X Korean
  await openQ(ids[0]);
  v = await p.evaluate(() => { const S = AS(); const k = (SEC.aox.groups || []).flatMap(g => g.items || g.opts || []).map(o => o.k || o)[0] || 'U'; S.aox.sel[typeof k === 'string' ? k : 'U'] = true; recalc(); m11Brands(); const B = k => { const e = document.querySelector(`#brandTotals [data-brand="${k}"]`); return e ? e.disabled + ':' + (e.title || '') : 'none' }; return { aox: m11Aox(AS()), it: B('it'), ko: B('ko'), ir: B('ir'), sw: B('sw'), note: (document.querySelector('[data-sec="aox"] .note') || {}).textContent } });
  ok(v.aox && v.ko.startsWith('false') && v.it.startsWith('false') && v.ir === 'true:' + 'برای All on X فقط برند ایتالیایی یا کره‌ای' && v.sw.startsWith('true') && /ایتالیایی یا کره‌ای/.test(v.note || ''), 'All on X: Korean and Italian may be chosen, Iranian / Swiss not', v);
  await p.context().close();
  // surgery day default brand of an All on X fixture
  p = await login('surgery');
  v = await p.evaluate(() => { const cat = catM(); const one = g => { SURG = { imp: {}, rec: { brand: g }, s: { aox: { sel: {} }, imp: { sel: {} } }, lastCat: null, id: 'x' }; try { openImp('UR6', 'aox') } catch (e) { return 'err ' + e.message } const ci = Number($('imp_cat').value); const c = cat[ci]; $('impSheet').hidden = true; return c ? c.g : $('imp_b').value }; return { ko: one('ko'), it: one('it'), ir: one('ir'), gs: [...new Set(cat.map(c => c.g))] } });
  ok(v.ko === 'کره‌ای' && v.it === 'ایتالیایی' && v.ir === 'ایتالیایی', 'surgery day: All on X fixture opens on Korean for a Korean plan, Italian otherwise', v);
  SURG_NULL: await p.evaluate(() => { SURG = null }); await p.context().close();
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
