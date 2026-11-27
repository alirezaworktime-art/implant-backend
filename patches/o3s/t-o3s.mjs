// t-o3s: option 3 «۷۰٪ نقد» = pct% of the SURGERY part before surgery (not of the whole plan); the rest without cheques until the impression.
// Run: WORKER=<bundle> node t-o3s.mjs   (or: node scripts/run-test.mjs patches/o3s/t-o3s.mjs)
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { uuid } = A;
const h = await A.start(); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 400))); if (!c) bad++ };
const W = ms => new Promise(r => setTimeout(r, ms));
const mk = async (name, set) => { const id = await h.add(name); await h.plan(id, name); await h.confirm(id, name, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book'); await h.appt(id, name, 'surg', h.today(), tk ? tk.id : '');
  h.sql(`UPDATE plans SET total=${set.total}, data=json_set(data, '$.pay.opt', '3', '$.pay.c3', '${set.c3}'${set.parts ? `, '$.parts', json('${JSON.stringify(set.parts)}')` : `, '$.parts', NULL`}) WHERE id='${id}'`); return id; };
const pay = (id, amount) => h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount, by: 'مشاور', note: '' }, sendId: uuid() });
const toSurg = id => h.call('staff', 'toSurgery', { id });

// S = 100M, P = 40M, 70% → 70,000,000 before surgery (the old rule asked 98,000,000)
let id = await mk('بیمار گزینه سه', { total: 140000000, c3: '70', parts: { S: 100000000, P: 40000000 } });
await pay(id, 69900000); let r = await toSurg(id);
ok(!r.ok && /\b100000\b/.test(String(r.error).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٬,]/g, '')), 'S 100M + P 40M, 70%: paid 69.9M → referral refused, 100,000 short', r);
await pay(id, 100000); r = await toSurg(id);
ok(r.ok, 'paid 70,000,000 (= 70% of the surgery part) → referral allowed (old rule needed 98,000,000)', r);
const owe = (await h.call('consultant', 'get', { id })).bal;
ok(owe && owe.rest === 70000000, 'the rest (30M surgery + 40M prosthesis = 70M) is still owed, to be paid until the impression day', owe);

// another percent
id = await mk('بیمار گزینه سه شصت', { total: 140000000, c3: '60', parts: { S: 100000000, P: 40000000 } });
await pay(id, 59900000); r = await toSurg(id); ok(!r.ok, '60%: paid 59.9M → refused', r);
await pay(id, 100000); r = await toSurg(id); ok(r.ok, '60%: paid 60,000,000 → allowed', r);

// an old plan without parts: the whole plan is the surgery part (unchanged fallback)
id = await mk('بیمار گزینه سه قدیمی', { total: 140000000, c3: '70' });
await pay(id, 97900000); r = await toSurg(id); ok(!r.ok, 'plan without parts: 70% of the whole plan (98M) still needed — 97.9M refused', r);
await pay(id, 100000); r = await toSurg(id); ok(r.ok, 'plan without parts: 98,000,000 → allowed', r);

// rounding: S = 123,456,789 → 86,400,000
id = await mk('بیمار گزینه سه گرد', { total: 163456789, c3: '70', parts: { S: 123456789, P: 40000000 } });
await pay(id, 86400000); r = await toSurg(id); ok(r.ok, 'S 123,456,789: 86,400,000 (rounded like the page) is enough', r);

// page: the o3s block and the amounts the PDF / reception use
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext(); await c.route(/googleapis|gstatic/, x => x.abort()); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
await p.goto(h.url); await W(1500);
const s = await p.evaluate(() => { const r = { pay: { opt: '3', c3: '70' } }, r60 = { pay: { opt: '3', c3: '60' } }, r1 = { pay: { opt: '1', cs: '50', n1: '2' } };
  return { mark: /---------- o3s \(/.test(document.documentElement.innerHTML), cash: cashFor(r, 100000000, 40000000), cash60: cashFor(r60, 100000000, 40000000), cashDef: cashFor({ pay: { opt: '3' } }, 100000000, 40000000),
    q8s: q8Cash(r, 100000000, 40000000, 's'), q8p: q8Cash(r, 100000000, 40000000, 'p'), chqS: q8Chq(r, 100000000, 0.7, 1, ''), chqP: q8Chq(r, 40000000, 0, 1, ''),
    opt1: cashFor(r1, 100000000, 40000000) === cashFor(Object.assign({}, r1), 100000000, 40000000) }; });
ok(s.mark, 'page has the o3s block', s);
ok(s.cash === 70000000 && s.cashDef === 70000000 && s.cash60 === 60000000, 'cash before surgery = 70% (default) / 60% of the surgery part', s);
ok(s.q8s === 70000000 && s.q8p === 0, 'patient PDF cash column: surgery 70,000,000, prosthesis 0', s);
ok(/بدون چک/.test(s.chqS) && /بدون چک/.test(s.chqP), 'patient PDF: no cheques for option 3 (the old PDF printed a prosthesis cheque)', s);
ok(!PE.length, 'no page errors', PE);
await b.close(); h.stop();
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
