// t-m60a: surgery day — «موجودی فیکسچر» (what we do not have by brand; diameter × length). Run: WORKER=<m60a bundle> node t-m60a.mjs
import { createRequire } from 'node:module'; import fs from 'node:fs';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid, REC } = A;
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const PE = []; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 600))); if (!c) bad++ };
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const toDis = async (name) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk.id);
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'م', note: '' }, sendId: uuid() }); await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' }); await h.must('staff', 'fxFile', { op: 'set', id, file: String(2000 + Math.floor(Math.random() * 7000)), by: 'منشی' }); await h.call('staff', 'discharge', { id, by: 'منشی' }); return id };
const P = id => JSON.parse(h.sql(`select pros from plans where id='${id}'`)[0].pros || '{}');
const labsOf = id => h.sql(`select id, st, due, data from labs where plan='${id}' order by created`).map(l => Object.assign(l, { data: JSON.parse(l.data || '{}') }));
await h.travel(0); { const r = await h.call('manager', 'settings', { settings: { catalog: [{ b: 'IZEN', sys: '', g: 'ko', d: ['4', '4.5'], l: ['8', '10', '11.5'], h: [] }, { b: 'JD', sys: 'Plus', g: 'it', d: ['3.7', '4.3'], l: ['8', '10'], h: [] }, { b: 'JD', sys: 'Icon', g: 'it', d: ['3.5'], l: ['10', '13'], h: [] }] } }); if (!r || r.ok === false) console.log('catalog seed failed', r && r.error) }
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const login = async (role, vw = 1280, vh = 800) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', A.PW[role]); await p.click('#lgGo'); await W(3000); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); return p };
const sh = p => p.evaluate(() => { const s = document.querySelector('#m60Sheet'), q = x => s ? [...s.querySelectorAll(x)] : []; return { open: !!s && !s.hidden, txt: s ? s.innerText.replace(/\s+/g, ' ') : '', brands: q('[data-m60b].chip').map(b => b.textContent.trim()), on: q('.chip[aria-pressed="true"]').map(b => b.textContent.trim()), ok: q('td.ok').map(t => t.textContent), no: q('td.no').length, miss: q('.m60z').map(z => z.textContent) } });
try {
  const p = await login('surgery');
  ok(await p.evaluate(() => /---------- m60a \(/.test(document.documentElement.innerHTML)), 'm60a marker in the page');
  const C = await p.evaluate(() => catM().map(c => ({ b: c.b, sys: c.sys, d: c.d, dl: c.dl })));
  ok(C.length > 1, 'catalog has brands', C.length);
  const c = C[0], d0 = c.d[0], L = c.dl[d0] || [];
  const r = await h.call('inventory', 'invMove', { type: 'adj', spec: { kind: 'fix', b: c.b, sys: c.sys, d: d0, l: L[0] }, n: 3, by: 'انبار', note: 't' });
  ok(r && r.ok, 'stock 3 for one size', r);
  const nm = await p.evaluate(async () => { await pollInv(true); return INV.items.filter(i => i.kind === 'fix').length });
  ok(nm >= 1, 'stock loaded on the surgery page', nm);
  ok(await p.evaluate(() => !!document.querySelector('#viewSurg .sgpat #m60Top') && !!document.querySelector('#impSheet #m60Imp')), 'buttons: surgery day top + implant sheet');
  // 1) all brands → «نداریم» by brand
  await p.evaluate(() => $('m60Top').click()); await W(800); let s = await sh(p);
  ok(s.open && s.on.includes('همه‌ی برندها') && /نداریم/.test(s.txt) && s.brands.length >= new Set(C.map(x => x.b.toLowerCase())).size + 1, 'opens on «همه‌ی برندها» with «نداریم»; one chip per brand', s.brands);
  ok(s.miss.length > 0 && !s.miss.some(z => z.replace(/\s/g, '') === (d0 + '×' + L[0]).replace(/\s/g, '').replace(/\d/g, x => '۰۱۲۳۴۵۶۷۸۹'[x])), 'the stocked size is not in «نداریم»', s.miss.slice(0, 6));
  // 2) brand → table
  await p.evaluate(b => document.querySelector(`#m60Sheet [data-m60b="${b}"].chip`).click(), c.b); await W(300); s = await sh(p);
  ok(s.on.includes('همه‌ی سایزها') && s.ok.includes('۳') && s.no > 0, 'brand table: ۳ for the stocked size, red ۰ for the rest', s);
  await p.evaluate(() => document.querySelector('#m60Sheet [data-m60o="1"]').click()); await W(300); s = await sh(p);
  ok(s.miss.length > 0 && !s.ok.length, '«فقط نداریم» lists only missing sizes', s);
  // 3) from the implant sheet: the chosen brand
  await p.evaluate(() => { $('m60Sheet').hidden = true; const c = catM(), i = c.length - 1; $('imp_cat').innerHTML = c.map((x, k) => `<option value="${k}">${x.b}</option>`).join(''); $('imp_cat').value = String(i); $('m60Imp').click() }); await W(500); s = await sh(p);
  ok(s.open && s.on.includes(C[C.length - 1].b) || s.on.some(x => x.startsWith(C[C.length - 1].b)), 'implant sheet button opens on its brand', s.on);
  // 4) phone
  const ph = await login('surgery', 390, 800); await ph.evaluate(async () => { await pollInv(true); $('m60Top').click() }); await W(600);
  await ph.evaluate(b => document.querySelector(`#m60Sheet [data-m60b="${b}"].chip`).click(), c.b); await W(300);
  await ph.screenshot({ path: '/tmp/phone.png' }); const ov = await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1); ok(ov, 'phone: no page side scroll');
  const ph2 = await login('surgery', 390, 800); await ph2.evaluate(async () => { await pollInv(true); $('m60Top').click() }); await W(600); await ph2.screenshot({ path: '/tmp/phone-all.png' });
  ok(!PE.length, 'no page errors', PE);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)); bad++ }
await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
