// t-m42cui: floating save bar on the paper-file editor (desktop + phone) stays visible and steady; plan form keeps its own fixed bar. Run: WORKER=<m42c bundle> node t-m42cui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 400))); if (!c) bad++ };
const n = 'بیمار نمونه'; await h.add(n);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw, vh) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(2500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const dock = p => p.evaluate(() => { const d = document.getElementById('m41Dock'); return d && !d.hidden ? [...d.querySelectorAll('button')].map(x => x.textContent.trim()) : null });
try {
  for (const [vw, vh] of [[1280, 760], [390, 740], [820, 1180]]) { const tag = vw + 'px';
    let p = await login('staff', vw, vh); await p.evaluate(() => a6Open()); await W(1800);
    const seen = []; for (let i = 0; i < 8; i++) { seen.push(!!(await dock(p))); await W(150) }
    const D = await dock(p); ok(D && D.some(t => /ثبت پرونده/.test(t)) && seen.every(Boolean), tag + ': paper-file editor — the bar shows «ثبت پرونده در بایگانی» and stays (no flicker)', { D, seen });
    await p.evaluate(() => { const r = [...document.querySelectorAll('#viewArc6 .btns')].find(x => /ثبت پرونده/.test(x.textContent)); r.scrollIntoView({ block: 'center' }) }); await W(600); ok((await dock(p)) === null, tag + ': bar hides when the real button is on screen');
    await p.evaluate(() => scrollTo(0, 0)); await W(600); ok(!!(await dock(p)), tag + ': back at the top the bar returns'); ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), tag + ': no sideways scroll'); await p.context().close();
    p = await login('doctor', vw, vh); await p.evaluate(() => { const q = QITEMS.find(x => x.name === 'بیمار نمونه'); const bt = document.querySelector('[data-open="' + q.id + '"],[data-qopen="' + q.id + '"]'); if (bt) bt.click() }); await W(2500);
    const f = await p.evaluate(() => { const fb = document.getElementById('formBar'), v = document.getElementById('viewForm'); return { form: v && !v.hidden, pos: fb ? getComputedStyle(fb).position : '', vis: fb && !fb.hidden && fb.getBoundingClientRect().height > 0 && fb.getBoundingClientRect().bottom <= innerHeight + 1, btn: fb ? [...fb.querySelectorAll('button')].filter(x => x.offsetParent !== null).map(x => x.textContent.trim()).slice(0, 4) : [] } });
    ok(f.form && f.pos === 'fixed' && f.vis && f.btn.length > 0, tag + ': plan form — its own fixed bar with the buttons is on screen', f); await p.context().close(); }
} catch (e) { console.log('ERR', e.message.slice(0, 300)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
