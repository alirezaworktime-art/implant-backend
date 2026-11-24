import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try { const p = await login('staff'); await p.evaluate(() => a6Open()); await W(1800);
  const r = await p.evaluate(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); const l1 = a6NewLine('imp'); A6.op.add('imp'); a6Render(); await W(100);
    const bt = document.querySelector(`[data-a6t="UR6"][data-l="${l1.id}"],[data-arbt="UR6"][data-l="${l1.id}"]`); const o = { bt: !!bt, cls: bt && bt.className, attrs: bt && [...bt.attributes].map(a => a.name) }; if (bt) bt.click(); await W(300);
    const sh = document.getElementById('arbSh'); o.sheet = sh ? sh.innerText.slice(0, 600) : null; o.ARB = JSON.stringify(ARB.p || null).slice(0, 300); o.html = sh ? sh.innerHTML.slice(0, 2500) : ''; return o });
  console.log(JSON.stringify(r, null, 1).slice(0, 4500));
} catch (e) { console.log('ERR', e.message.slice(0, 500)) }
console.log('PE', PE); await b.close(); h.stop(); process.exit(0);
