// Builds the STAGING database: fake patients created through the app's own API (the same requests the real UI sends,
// recorded in patches/audit/rec.json), spread over the last ~75 days, in every stage. No real patient data.
//   npm run build && node scripts/staging-db.mjs [out=dist/staging-db/implant.db]
// The bundle runs locally with test-only role passwords; before saving, those passwords, sessions and the test accounts are
// removed, so on staging the normal (production) passwords apply. Prints counts only.
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url'; import { DatabaseSync } from 'node:sqlite';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'staging-db', 'implant.db'));
process.env.WORKER = path.resolve(process.env.WORKER || path.join(root, 'dist', 'worker.mjs'));
if (!fs.existsSync(process.env.WORKER)) { console.error('no bundle: run npm run build first'); process.exit(2); }
const A = await import(url.pathToFileURL(path.join(root, 'patches', 'audit', 'A.mjs')).href); const { uuid, REC } = A;
const h = await A.start();
const NAMES = ['مریم کاظمی', 'علی رضایی', 'زهرا محمدی', 'حسین احمدی', 'فاطمه حسینی', 'محمد کریمی', 'نرگس موسوی', 'رضا جعفری', 'سارا صادقی', 'امیر رحیمی',
  'لیلا نوری', 'مهدی قاسمی', 'الهام یزدانی', 'جواد شریفی', 'شیما اکبری', 'بهروز فرهادی', 'مینا طاهری', 'کاوه بهرامی', 'پریسا عباسی', 'سعید مرادی'];
let ni = 0; const nextName = () => NAMES[ni++ % NAMES.length];
const phone = () => '0912000' + String(1000 + ni).padStart(4, '0');           // fake numbers, never a real one
const rx0 = (await h.call('doctor', 'rxGet', {})).tpl;
const ord = () => { const o = JSON.parse(JSON.stringify(REC.prosSess[0].req.order)); o.for = 'tryin'; return o };
const stage = {};
const mark = (k, id) => { (stage[k] = stage[k] || []).push(id); };

const reception = async () => { const n = nextName(); const id = await h.add(n, { phone: phone() }); return [id, n]; };
const planned = async () => { const [id, n] = await reception(); await h.plan(id, n); return [id, n]; };
const booked = async (days = 5) => { const [id, n] = await planned(); await h.confirm(id, n, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book');
  const d = new Date(Date.parse(h.today()) + days * 864e5).toISOString().slice(0, 10); await h.appt(id, n, 'surg', d, tk ? tk.id : ''); return [id, n]; };
const operated = async () => { const [id, n] = await planned(); await h.confirm(id, n, 'book'); const tk = h.tasks(id).find(t => t.kind === 'book');
  await h.appt(id, n, 'surg', h.today(), tk ? tk.id : '');
  await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: 60000000, by: 'مشاور', note: '' }, sendId: uuid() });
  await h.must('staff', 'toSurgery', { id });
  const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(REC.queueAdd[0].req.id).join(id).split('رضا آزمایشی').join(n)); delete q.action;
  q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; await h.must('surgery', 'surgSave', q);
  await h.must('staff', 'rxGive', { id, ids: [rx0.items[0].id], by: 'منشی' });
  await h.must('staff', 'fxFile', { op: 'set', id, file: String(3000 + ni), by: 'منشی' });
  await h.call('staff', 'discharge', { id, by: 'منشی' }); return [id, n]; };
const prosthesis = async (id, n, labToo) => { await h.must('surgery', 'prosMap', { id, map: { LR6: 'a', UR6: 'a' }, note: '', by: 'پزشک' });
  await h.appt(id, n, 'impr', h.today(), '', '10:30'); const aid = h.appts(id).slice(-1)[0].id; await h.call('staff', 'apptRef', { aid, op: 'set', id, by: 'منشی' }); const lid = uuid();
  const r = await h.call('surgery', 'prosSess', { id, aid, work: 'impr', result: '', note: '', by: 'دکتر نمونه', sendId: uuid(), ty: 'impr', sameDay: 1, imp: { meth: 'open', shade: 'A2', abut: '', ret: 'پیچی' }, lid, due: h.today(), order: ord() });
  if (!r.ok) throw new Error('prosSess ' + JSON.stringify(r).slice(0, 200));
  if (labToo) { await h.call('lab', 'labStart', { lid, wt: '990001', proc: '', from: '', designer: '', box: '', note: '', prio: '' }); for (const s of h.sql(`select id from lab_step where lab='${lid}' order by idx`)) await h.call('lab', 'labStep', { lid, sid: s.id, op: 'quick', text: '' }); }
};

await h.travel(-75);                                   // 75 days ago: operated, later in prosthesis
const early = []; for (let i = 0; i < 4; i++) { const p = await operated(); early.push(p); mark('operated 75 days ago', p[0]); }
await h.travel(45);                                    // 30 days ago
for (let i = 0; i < 3; i++) mark('operated 30 days ago', (await operated())[0]);
await h.travel(10);                                    // 20 days ago: prosthesis for the early ones (osseointegration done)
for (let i = 0; i < early.length; i++) { await prosthesis(early[i][0], early[i][1], i < 2); mark(i < 2 ? 'prosthesis + lab order in work' : 'prosthesis, impression taken', early[i][0]); }
await h.travel(10);                                    // 10 days ago
for (let i = 0; i < 3; i++) mark('booked for surgery (appointment in 15 days)', (await booked(15))[0]);
await h.travel(7);                                     // 3 days ago
for (let i = 0; i < 3; i++) mark('plan made, waiting for consultant', (await planned())[0]);
await h.travel(3);                                     // today
for (let i = 0; i < 3; i++) mark('reception queue today', (await reception())[0]);

// clean for staging: remove test-only passwords, sessions and test accounts; keep everything else
const dbFile = h.sql('PRAGMA database_list').find(d => d.name === 'main').file;
h.stop(); await new Promise(r => setTimeout(r, 800));
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.rmSync(out, { force: true });
const d = new DatabaseSync(dbFile);
d.exec("DELETE FROM kv WHERE k LIKE 'pw:%' OR k LIKE 'sid:%' OR k LIKE 'fail:%'");
try { d.exec('DELETE FROM users'); } catch { }
d.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`); d.close();
const o = new DatabaseSync(out), c = t => { try { return o.prepare(`select count(*) n from ${t}`).get().n } catch { return 0 } };
console.log('staging db:', out);
for (const [k, ids] of Object.entries(stage)) console.log(`  ${String(ids.length).padStart(2)}  ${k}`);
console.log(`  tables: plans ${c('plans')}, pays ${c('pays')}, appts ${c('appts')}, tasks ${c('tasks')}, labs ${c('labs')}, users ${c('users')}, test passwords ${o.prepare("select count(*) n from kv where k like 'pw:%'").get().n}`);
o.close();
