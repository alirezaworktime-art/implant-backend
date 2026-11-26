// repro: a saved paper file must be findable in the archive list. WORKER=<bundle> node t-find.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href);
const W = ms => new Promise(r => setTimeout(r, ms)); const h = await A.start();
try {
  for (let i = 0; i < 3; i++) { const id = await h.add('قدیمی ' + i); await h.plan(id, 'قدیمی ' + i) }
  const br = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const c = await br.newContext({ viewport: { width: 1180, height: 860 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, x => x.abort()); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(e.message.slice(0, 200)));
  await p.goto(h.url); await p.click('[data-lrole="staff"]'); await p.fill('#lg_pw', A.PW.staff); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
  for (const [nm, pf] of [['کاغذی الف', '7001'], ['کاغذی ب', '7002']]) {
    await p.evaluate(() => a6Open(null)); await W(2500);
    await p.fill('[data-a6h="name"]', nm); await p.click('[data-a6h="pfile"]'); await p.keyboard.type(pf); await W(1200);
    await p.click('#a6Save'); await W(3500);
    console.log('saved', nm, JSON.stringify(await p.evaluate(() => ({ msg: (document.getElementById('a6Msg') || {}).textContent, A6: !!A6, pf: !document.getElementById('pfSheet').hidden, title: document.getElementById('pfTitle').textContent, ask: [...document.querySelectorAll('#uxAskSh')].filter(e => !e.hidden).map(e => e.textContent.slice(0, 150)) }))));
    await p.evaluate(() => { const s = document.getElementById('pfSheet'); if (s) s.hidden = true });
  }
  console.log('db', JSON.stringify(h.sql("select name, queue, status, json_extract(data,'$.h.pfile') pf, json_extract(data,'$.h.arc') arc from plans")));
  const look = async tag => console.log(tag, JSON.stringify(await p.evaluate(() => ({ inArchive: ARCHIVE.filter(x => /کاغذی/.test(x.name)).map(x => x.name + '|' + x.fno + '|' + x.queue + '|' + x.status), n: ARCHIVE.length, view: [...document.querySelectorAll('[id^="view"]')].filter(e => !e.hidden).map(e => e.id), shown: (document.getElementById('viewList').textContent.match(/کاغذی [^\s]/g) || []) }))));
  await look('after save');
  await p.evaluate(() => { show('list'); return loadList() }); await W(2500); await look('list view ');
  console.log('list controls', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#viewList input, #viewList select, #viewList [data-lf], #viewList .chip')].slice(0, 30).map(e => (e.id || e.className || e.tagName) + '=' + (e.value || e.textContent || '').slice(0, 30)))));
  console.log('pageerrors', JSON.stringify(PE).slice(0, 500)); await br.close();
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 800)) }
h.stop(); process.exit(0);
