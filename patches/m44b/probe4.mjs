import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A; const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms));
const nm = 'بیمار منتظر', id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); { const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, nm, 'surg', h.today(), tk.id); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id }) }
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
try { let p = await login('surgery'); await p.evaluate(() => { goTile('surg'); openSurg(QITEMS.find(q => q.name === 'بیمار منتظر')) }); await W(1800);
  const s = { pick: await p.evaluate(() => JSON.stringify({ keys: Object.keys(SET.prices || {}).length, imp: (SET.prices || {}).imp, sgd: (SET.prices || {}).arc_sgd, prev: SURG.prev, fu: [...document.querySelectorAll('#viewSurg [data-fu]')].map(x => x.dataset.fu + ':' + x.checked), planned: planTotal(SURG.rec) })), labels: [] };
  console.log('SURG PICK', JSON.stringify(s.pick)); console.log('SURG LABELS', JSON.stringify(s.labels));
  await p.context().close(); p = await login('staff'); await p.evaluate(() => a6Open()); await W(1500);
  console.log('ARC', JSON.stringify(await p.evaluate(() => A6CAT.filter(x => !x.hid).map(x => x.g ? A6G[x.g] + ':' + x.t : x.t))));
} catch (e) { console.log('ERR', e.message.slice(0, 400)) }
await b.close(); h.stop(); process.exit(0);
