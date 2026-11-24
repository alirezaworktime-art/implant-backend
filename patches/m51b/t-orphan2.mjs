// audit, prosthesis half: after surgery → impression → lab → delivery; if nobody acts, where is the patient? WORKER=<bundle> node t-orphan2.mjs
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const { REC, uuid } = A;
const h = await A.start(); const OLD = REC.surgSave[0].req.id; const J = (x, n = 240) => JSON.stringify(x).slice(0, n);
const body = id => { const q = JSON.parse(JSON.stringify(REC.surgSave[0].req).split(OLD).join(id)); delete q.action; q.session.at = new Date(Date.now() + h.off() * 864e5).toISOString(); q.sendId = uuid(); q.finish = true; return q };
const show = async (tag, id) => console.log(tag.padEnd(30), '|', h.state(id), '|', (await h.where(id)).join(' ') || '*** NOWHERE ***', '| tasks:', h.tasks(id).filter(t => !t.done).map(t => t.kind + '@' + t.due.slice(2)).join(',') || '-', '| labs:', h.sql(`select st from labs where plan='${id}'`).map(x => x.st).join(',') || '-');
const any = async (roles, action, b) => { let r; for (const role of roles) { r = await h.call(role, action, b); if (r.ok) return Object.assign(r, { _role: role }) } return r };
const rec = (k, i, id, extra) => { const q = JSON.parse(JSON.stringify(REC[k][i].req).split(OLD).join(id)); delete q.action; if (q.sendId) q.sendId = uuid(); return Object.assign(q, extra || {}) };
try {
  const mk = async nm => { const id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); await h.appt(id, nm, 'surg', h.today(), h.tasks(id).find(t => t.kind === 'book').id);
    const T = Number(h.sql(`select total from plans where id='${id}'`)[0].total); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: T, by: 'م', note: '' }, sendId: uuid() });
    await h.must('staff', 'toSurgery', { id }); const q = body(id); let r = await h.call('surgery', 'surgSave', q); if (!r.ok) console.log('surgSave', J(r)); return id };
  const N = ['P1 جراحی شد، ترخیص نشد', 'P2 ترخیص شد، دیگر نیامد', 'P3 قالب گرفته شد، لابراتوار شروع نکرد', 'P4 لابراتوار آماده، نوبت داده نشد', 'P5 تحویل شد'], ids = [];
  for (let i = 0; i < 5; i++) ids.push(await mk(N[i]));
  console.log('after surgery:', h.state(ids[0]));
  let fileNo = 7000;
  const dis = async id => { await h.call('staff', 'fxFile', { op: 'set', id, file: String(++fileNo), by: 'منشی' }); let r = await h.call('staff', 'discharge', { id, by: 'منشی' }); if (!r.ok) { const e1 = r.error; r = await h.call('staff', 'discharge', { id, by: 'منشی', rxNone: 1, noRx: 1, rx: [], rxc: 'بدون نسخه' }); console.log('discharge:', e1, '→', J(r, 160)) } return r };
  for (let i = 1; i < 5; i++) await dis(ids[i]);
  await show('+0 ' + N[1], ids[1]);
  // impression for P3..P5
  const impr = async id => { const aid = uuid(); let r = await h.call('staff', 'apptSave', { appt: { plan: id, name: 'ن', phone: '09131234567', day: h.today(), time: '10:00', dur: '45', kind: 'impr', doc: 'دکتر سید مجتبی علویکیا', note: '', by: '', onl: '' }, aid: '', task: '', sendId: uuid() }); const ap = h.appts(id).filter(a => a.kind === 'impr' && a.st === 'set').pop();
    const r1 = await h.call('staff', 'apptRef', { aid: ap.id, op: 'set', id, by: 'منشی' }); const r2 = await any(['doctor', 'surgery', 'staff'], 'prosMap', rec('prosMap', 0, id)); const lid = uuid();
    const r3 = await any(['doctor', 'surgery', 'staff'], 'prosSess', rec('prosSess', 0, id, { aid: ap.id, lid, due: new Date(Date.parse(h.today()) + 10 * 864e5).toISOString().slice(0, 10) }));
    console.log('impr:', 'appt', J(r, 60), 'ref', J(r1, 60), 'map', J(r2, 80), 'sess', J(r3, 200)); return lid };
  const L = {}; for (let i = 2; i < 5; i++) L[i] = await impr(ids[i]);
  const lab = async lid => { const a = await h.call('lab', 'labStart', { lid, wt: '99' + Math.floor(Math.random() * 9000 + 1000), proc: '', from: '', designer: '', box: '', note: '', prio: '' }); const b = await h.call('lab', 'labSet', { lid, st: 'ready', note: '', by: 'لابراتوار' }); console.log('lab:', J(a, 150), J(b, 150)) };
  await lab(L[3]); await lab(L[4]);
  // P5: delivery
  { const id = ids[4]; await h.call('staff', 'apptSave', { appt: { plan: id, name: 'ن', phone: '09131234567', day: h.today(), time: '12:00', dur: '45', kind: 'deliv', doc: 'دکتر سید مجتبی علویکیا', note: '', by: '', onl: '' }, aid: '', task: '', sendId: uuid() }); const ap = h.appts(id).filter(a => a.kind === 'deliv' && a.st === 'set').pop();
    const r1 = ap ? await h.call('staff', 'apptRef', { aid: ap.id, op: 'set', id, by: 'منشی' }) : { ok: false, error: 'no deliv appt' }; const r3 = ap ? await any(['doctor', 'surgery', 'staff'], 'prosSess', rec('prosSess', 2, id, { aid: ap.id })) : {}; console.log('deliv:', J(r1, 80), J(r3, 260)) }
  for (const d of [0, 1, 15, 45, 130, 200, 400]) { if (d) await h.travel(d - h.off()); console.log('\n===== روز +' + d); for (let i = 0; i < 5; i++) await show(N[i], ids[i]) }
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 900)) }
h.stop(); process.exit(0);
