// t-m35rx: discharge list shows «کد رهگیری دارو», the code is sent with «ترخیص» and shown in the patient file
import { h, A, W, chromium } from '../m24/probe.mjs'; import { uuid } from '../audit/A.mjs';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 700))); if (!c) bad++ };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1400, height: 900 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.PE = []; p.on('pageerror', e => p.PE.push(e.message));
const sent = []; p.on('request', q => { try { const j = JSON.parse(q.postData() || '{}'); if (j.action === 'discharge') sent.push(j) } catch (e) {} });
await p.goto(h.url); await p.click('[data-lrole="staff"]'); await p.fill('#lg_pw', A.PW.staff); await p.click('#lgGo'); await W(3000);
try {
  const has = await p.evaluate(() => typeof renderSd === 'function');
  ok(has, 'renderSd present');
  const id = await h.add('بیمار ترخیص ui'); h.sql(`update plans set queue='surgdone', surg=json('{"sessions":[{"at":"${new Date().toISOString()}"}],"lastDay":"${new Date(Date.now() + 3.5 * 36e5).toISOString().slice(0, 10)}","rxAt":"${new Date().toISOString()}"}'), data=json_set(data,'$.h.file','778') where id='${id}'`);
  h.sql(`insert into rxlog (id, plan, at, by) values ('rx-${uuid().slice(0, 6)}','${id}','${new Date().toISOString()}','x')`);
  await p.evaluate(() => pollQ(true)); await W(2500); await p.evaluate(() => { try { goTile('sdone') } catch (e) {} }); await W(1500);
  const box = await p.$(`[data-sdrxc="${id}"]`); ok(!!box, 'the discharge card has «کد رهگیری دارو»');
  if (box) { await box.fill('۹۸۷۶۵۴'); await p.click(`input[data-sdcare="${id}"]`); await W(600);
    await p.click(`[data-sdgo="${id}"]`); await W(800); if (await p.evaluate(() => !!UXA)) { await p.click('#uxAskOk'); await W(2000) }
    ok(sent.some(j => j.id === id && j.rxc === '987654'), 'the code goes with «ترخیص»', sent);
    const dis = JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg).dis || {}; ok(dis.rxc === '987654', 'saved with the discharge', dis);
    await p.evaluate(id => openFile(id, 'بیمار ترخیص ui'), id); await W(2000);
    const t = await p.evaluate(() => (document.getElementById('m35Rx') || {}).textContent || ''); ok(/کد رهگیری دارو/.test(t) && /۹۸۷۶۵۴/.test(t), 'the patient file shows the code', t) }
  ok(p.PE.length === 0, 'no page errors', p.PE);
} catch (e) { console.log('FAIL exception', e.stack); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
