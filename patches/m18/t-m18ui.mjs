// t-m18ui: reception screen — «انجام شد» on a booking task opens the three choices; label on a changed plan; win-back search. Run: WORKER=<bundle> node t-m18ui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid, REC } = A;
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 500))); if (!c) bad++ };
const mk = async n => { const id = await h.add(n); await h.plan(id, n); await h.confirm(id, n, 'book'); return id };
const a = await mk('نوبت الف'), c2 = await mk('تغییر ب'), d = await mk('نمی‌آید ج');
{ const OLD = REC.queueAdd[0].req.id, q = JSON.parse(JSON.stringify(REC.toConsult[0].req).split(OLD).join(c2)), cur = JSON.parse(h.sql(`select data from plans where id='${c2}'`)[0].data); Object.assign(q.record.data, cur, { _v: cur.updatedAt, updatedAt: new Date(Date.now() + 5000).toISOString() }); q.record.data.s = JSON.parse(JSON.stringify(cur.s)); q.record.data.s.imp.sel = ['UR6']; const r = await h.call('doctor', 'save', { record: q.record, sendId: uuid() }); ok(r.toConsult === 1, 'setup: changed plan went to the consultant', r) }
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1366, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort());
const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(e.message)); p.on('dialog', x => x.dismiss());
try {
  await p.goto(h.url); await p.click('[data-lrole="staff"]'); await p.fill('#lg_pw', A.PW.staff); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
  const tid = id => h.tasks(id).find(t => t.kind === 'book').id;
  ok(await p.evaluate(id => TASKS.some(t => t.id === id), tid(a)), 'reception has the booking task');
  await p.evaluate(() => { try { renderTasks() } catch (e) { } });
  const click = id => p.evaluate(id => { const x = [...document.querySelectorAll('button[data-tdone]')].find(v => v.dataset.tdone === id); if (!x) return 'no button'; x.click(); return 'clicked' }, id);
  ok((await click(tid(a))) === 'clicked', '«انجام شد» button found'); await W(600);
  ok(await p.evaluate(() => { const s = $('m18Sheet'); return !!s && !s.hidden && /نوبت الف/.test($('m18T').textContent) && $('m18Did').hidden }), 'the three-choice window opens (no «بیمار آمد» for a surgery booking)');
  ok(h.tasks(a).find(t => t.kind === 'book').done === 0, 'nothing was closed by the tap');
  await p.evaluate(() => document.querySelector('#m18Sheet [data-m18d="7"]').click()); await W(1200);
  ok(await p.evaluate(() => $('m18Sheet').hidden) && h.tasks(a).find(t => t.kind === 'book').done === 0 && h.tasks(a).find(t => t.kind === 'book').due > h.today(), '«یک هفته بعد»: window closes, task stays open with the new day', h.tasks(a));
  await click(tid(d)); await W(500); await p.evaluate(() => $('m18No').click()); await W(400);
  ok(await p.evaluate(() => !$('m18Sheet').hidden && /دلیل/.test($('m18Msg').textContent)), '«بیمار نمی‌آید» without a reason: message, nothing saved');
  await p.fill('#m18Why', 'مسافرت است'); await p.evaluate(() => $('m18No').click()); await W(1500);
  ok(h.tasks(d).find(t => t.kind === 'book').done === 1 && /مسافرت است/.test(h.tasks(d).find(t => t.kind === 'book').note || h.sql(`select note from tasks where plan='${d}'`)[0].note), '«بیمار نمی‌آید» + reason saved', h.sql(`select kind, done, note from tasks where plan='${d}'`));
  await p.evaluate(() => pollQ(true)); await W(1500); await p.evaluate(() => { try { renderTasks() } catch (e) { } });
  ok(await p.evaluate(() => [...document.querySelectorAll('.m18pill')].some(x => /تغییر ب/.test(x.closest('.item').textContent))), 'label «طرح تغییر کرده؛ منتظر تأیید مشاور» on the changed plan', await p.evaluate(() => [QITEMS.filter(x => x.status === 'modified').map(x => x.queue), document.querySelectorAll('.m18pill').length]));
  await p.evaluate(() => show('wb')); await W(1500);
  ok(await p.evaluate(() => !!$('wbQ') && /نمی‌آید ج/.test($('wbList').textContent)), 'win-back: search box there, the «نمی‌آید» patient listed', await p.evaluate(() => $('wbList').textContent.slice(0, 200)));
  await p.fill('#wbQ', 'هیچ‌کس'); await W(400); const none = await p.evaluate(() => $('wbList').textContent); await p.fill('#wbQ', 'نمی‌آید'); await W(400);
  ok(!/نمی‌آید ج/.test(none) && await p.evaluate(() => /نمی‌آید ج/.test($('wbList').textContent)), 'win-back search filters by name');
  ok(PE.length === 0, 'no page errors', PE);
} catch (e) { console.log('ERR', e.stack); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); await b.close(); h.stop(); process.exit(bad ? 1 : 0);
