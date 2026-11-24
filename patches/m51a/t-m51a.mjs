// t-m51a (server + page): paper files — repeated file number / national id announced while typing. Run: WORKER=<m51a bundle> node t-m51a.mjs
import { createRequire } from 'node:module';
const req = createRequire('/opt/npm-tools/node_modules/x.js'); const { chromium } = req('playwright-core');
const A = await import('file:///home/claude/w/audit/A.mjs');
let bad = 0; const PE = []; const J = (x, n = 500) => String(JSON.stringify(x)).slice(0, n); const W = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await A.start();
try {
  const id = await h.add('نمونه قدیم'); await h.plan(id, 'نمونه قدیم'); let r = await h.call('staff', 'fxFile', { op: 'set', id, file: '4321', by: 'منشی' }); ok(r.ok !== false, 'an existing file with number 4321', r);
  const nid = String(h.sql(`select nid from plans where id='${id}'`)[0].nid || ''); ok(/^\d{8,}$/.test(nid), 'it has a national id', nid.length);
  r = await h.call('staff', 'm51Dup', { id: '', file: '4321', nid: '' }); ok(r.ok && r.file && r.file.id === id && r.nid.length === 0, 'server: the file number is found', r);
  r = await h.call('staff', 'm51Dup', { id: '', file: '۴۳۲۱', nid }); ok(r.ok && r.file && r.nid.length === 1 && r.nid[0].id === id && r.nid[0].f === '4321', 'server: Persian digits + the national id are found', r);
  r = await h.call('staff', 'm51Dup', { id, file: '4321', nid }); ok(r.ok && !r.file && r.nid.length === 0, 'server: the file itself is not its own duplicate', r);
  r = await h.call('staff', 'm51Dup', { id: '', file: '99887', nid: '1234' }); ok(r.ok && !r.file && r.nid.length === 0, 'server: a free number and a short id give nothing', r);
  r = await h.call('surgery', 'm51Dup', { id: '', file: '4321' }); ok(r.ok === false, 'server: only reception and the consultant', r);
  // ---------- page
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const c = await br.newContext({ viewport: { width: 1180, height: 860 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, x => x.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200)));
  await p.goto(h.url); await p.click('[data-lrole="staff"]'); await p.fill('#lg_pw', A.PW.staff); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
  ok(await p.evaluate(() => /---------- m51a \(/.test(document.documentElement.innerHTML)), 'm51a marker in the page');
  await p.evaluate(() => a6Open(null)); await W(2500);
  const box = () => p.evaluate(() => { const b = document.getElementById('m51Dup'); return b && !b.hidden ? b.textContent : '' });
  ok(await p.evaluate(() => !!document.querySelector('[data-a6h="pfile"]')) && (await box()) === '', 'a new paper file opens without an alarm');
  await p.fill('[data-a6h="name"]', 'نمونه تازه'); await p.click('[data-a6h="pfile"]'); await p.keyboard.type('4321'); await W(1500);
  let t = await box(); ok(/تکراری/.test(t) && /۴۳۲۱/.test(t) && /نمونه قدیم/.test(t), 'typing a used file number shows the alarm at once', t);
  ok(await p.evaluate(() => !!document.querySelector('#m51Dup [data-file]')), 'with a «پرونده» button to open the other file');
  await p.click('[data-a6h="pfile"]'); await p.keyboard.press('End'); await p.keyboard.type('9'); await W(1500); ok((await box()) === '', 'a free number clears it', await box());
  await p.click('[data-a6h="nid"]'); await p.keyboard.type(nid); await W(1500); t = await box(); ok(/کد ملی/.test(t) && /نمونه قدیم/.test(t) && /پرونده ۴۳۲۱/.test(t), 'typing a used national id shows the alarm with the other file number', t);
  await p.evaluate(() => a6Render()); await W(600); ok(/کد ملی/.test(await box()), 'the alarm stays when the form is drawn again');
  ok(!PE.length, 'no page errors', PE); await br.close();
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 800)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
