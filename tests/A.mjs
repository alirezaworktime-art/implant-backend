// audit harness: m17 bundle on a fresh DB with a movable clock; API-level scenarios; visibility snapshot per plan
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite';
export const PW = { staff: 'tstaff1xx', doctor: 'tdoc1xxxx', consultant: 'tcons1xxx', surgery: 'tsurg1xxx', manager: 'tmgr1xxxx', lab: 'tlab1xxxx', inventory: 'tinv1xxxx', accountant: 'tacc1xxxx' };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
export const REC = JSON.parse(fs.readFileSync(new URL('./rec.json', import.meta.url)));
const OLD = REC.queueAdd[0].req.id;
export const uuid = () => crypto.randomUUID();
export async function start() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'au-')), app = path.join(dir, 'app'); fs.mkdirSync(app);
  fs.copyFileSync(process.env.WORKER || '/home/claude/w/iran-worker-m17.mjs', path.join(app, 'worker.js'));
  const port = 20000 + Math.floor(Math.random() * 2000), db = path.join(dir, 'd.db'), clock = path.join(dir, 'clock'); fs.writeFileSync(clock, '0');
  const p = spawn(process.execPath, ['--no-warnings', new URL('./server-clock.mjs', import.meta.url).pathname], { env: { ...process.env, APP_DIR: app, DB_FILE: db, RUN_DIR: dir, PORT: String(port), HOST: '127.0.0.1', IMPORT_KEY: '', BACKUP_HASH: '', CLOCK: clock }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', d => log += d); p.stderr.on('data', d => log += d);
  for (let i = 0; i < 150 && !/listening/.test(log); i++) await new Promise(r => setTimeout(r, 100));
  const url = `http://127.0.0.1:${port}/`;
  const call = async (role, action, body = {}) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password: role ? PW[role] : undefined, ...body }) })).json();
  await call(null, 'ping');
  const s = new DatabaseSync(db); for (const [r, pw] of Object.entries(PW)) s.prepare("INSERT OR REPLACE INTO kv (k, v, t) VALUES (?, ?, 0)").run('pw:' + r, sha('ipk|' + pw)); s.close();
  await call('manager', 'userSave', { u: { name: 'حسابدار تست', role: 'accountant', pw: PW.accountant } });
  const sql = q => { const d = new DatabaseSync(db); try { return d.prepare(q).all() } finally { d.close() } };
  let off = 0; const travel = async days => { off += days; fs.writeFileSync(clock, String(off)); await new Promise(r => setTimeout(r, 30)) };
  const today = () => new Date(Date.now() + off * 864e5 + 3.5 * 36e5).toISOString().slice(0, 10);
  const H = { url, call, sql, travel, today, stop: () => p.kill('SIGTERM'), log: () => log, off: () => off };
  // ---- flow helpers (payloads recorded from the real UI flow, ids replaced)
  const sub = (o, id, name) => JSON.parse(JSON.stringify(o).split(OLD).join(id).split('رضا آزمایشی').join(name));
  const must = async (role, action, body) => { const r = await call(role, action, body); if (!r || r.ok === false) throw new Error(action + ' → ' + JSON.stringify(r).slice(0, 300)); return r };
  H.must = must;
  const ver = id => { const r = sql(`select json_extract(data,'$.updatedAt') v from plans where id='${id}'`)[0]; return r && r.v ? r.v : undefined };
  H.add = async (name, extra = {}) => { const id = uuid(); const q = sub(REC.queueAdd[0].req, id, name); q.patient.nid = String(1000000000 + Math.floor(Math.random() * 8999999999)); q.patient.phone = '0913' + String(1000000 + Math.floor(Math.random() * 8999999)); Object.assign(q.patient, extra); delete q.action; await must('staff', 'queueAdd', q); return id };
  H.plan = async (id, name) => { const q = sub(REC.toConsult[0].req, id, name); delete q.action; q.record.data.updatedAt = new Date(Date.now() + off * 864e5).toISOString(); q.sendId = uuid(); await must('doctor', 'queueOpen', { id }); q.record.data._v = ver(id); return must('doctor', 'toConsult', q) };
  H.confirm = async (id, name, next = 'book') => { const q = sub(REC.confirm[0].req, id, name); delete q.action; q.record.data.updatedAt = new Date(Date.now() + off * 864e5 + 1000).toISOString(); q.next = next; q.sendId = uuid(); await must('consultant', 'queueOpen', { id }); q.record.data._v = ver(id); return must('consultant', 'confirm', q) };
  H.appt = async (id, name, kind, day, task = '', time = '09:00') => must('staff', 'apptSave', { appt: { plan: id, name, phone: '09120000000', day, time, dur: '60', kind, doc: 'دکتر سید مجتبی علویکیا', note: '', by: 'منشی', onl: '0' }, aid: '', task, sendId: uuid() });
  H.surg = async (id, name, last = true) => { const q = sub(REC.surgSave[0].req, id, name); delete q.action; q.session.at = new Date(Date.now() + off * 864e5).toISOString(); q.sendId = uuid(); if (!last) { q.session.last = 0; q.last = 0 } return must('surgery', 'surgSave', q) };
  // ---- where is this plan visible right now?
  H.where = async id => { const W = []; const td = today();
    for (const role of ['staff', 'doctor', 'consultant', 'surgery']) { const q = await call(role, 'queue', { ver: '', qh: '' });
      if ((q.items || []).some(x => x.id === id)) W.push(role + ':card');
      for (const k of ['tasks', 'appts', 'past', 'pidle', 'labLate', 'und', 'labNeed', 'prosDec', 'rfd', 'chq', 'psess', 'pref']) { const L = q[k]; if (Array.isArray(L) && L.some(x => x && (x.plan === id || x.id === id))) W.push(role + ':' + k) } }
    const wb = await call('staff', 'winback', {}); if ((wb.items || []).some(x => x.id === id)) W.push('staff:winback:' + wb.items.find(x => x.id === id).kind);
    const fut = sql(`select kind, day from appts where plan='${id}' and st='set' and day>'${td}'`); if (fut.length) W.push('calendar:future-appt:' + fut.map(x => x.kind + '@' + x.day).join(','));
    const ft = sql(`select kind, due from tasks where plan='${id}' and done=0`); const hid = ft.filter(t => t.due > new Date(Date.parse(td) + 60 * 864e5).toISOString().slice(0, 10)); if (hid.length) W.push('(task-later:' + hid.map(t => t.kind + '@' + t.due).join(',') + ')');
    return W };
  H.state = id => { const o = sql(`select status, queue, settle, surgN, CASE WHEN json_valid(pros) THEN json_extract(pros,'$.stage') END stage, CASE WHEN json_valid(surg) THEN json_extract(surg,'$.lastDay') END lastDay, CASE WHEN json_valid(surg) THEN json_extract(surg,'$.dis') END dis from plans where id='${id}'`)[0]; return o ? `q=${o.queue} st=${o.status} surgN=${o.surgN} pros=${o.stage || '-'} dis=${o.dis ? 'y' : '-'}${o.settle ? ' settle=' + o.settle : ''}` : 'GONE' };
  H.tasks = id => sql(`select id, kind, due, done, info from tasks where plan='${id}' order by created`);
  H.appts = id => sql(`select id, kind, day, time, st, task from appts where plan='${id}' order by created`);
  return H;
}
