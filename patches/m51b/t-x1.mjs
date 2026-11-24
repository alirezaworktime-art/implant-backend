// exploration: what blocks discharge / delivery in the test flow
const A = await import('file:///home/claude/w/audit/A.mjs'); const { REC, uuid } = A;
const h = await A.start(); const OLD = REC.surgSave[0].req.id; const J = (x, n = 300) => JSON.stringify(x).slice(0, n);
const rec = (k, i, id, extra) => { const q = JSON.parse(JSON.stringify(REC[k][i].req).split(OLD).join(id)); delete q.action; if (q.sendId) q.sendId = uuid(); return Object.assign(q, extra || {}) };
try {
  const nm = 'نمونه کامل', id = await h.add(nm); await h.plan(id, nm); await h.confirm(id, nm, 'book'); await h.appt(id, nm, 'surg', h.today(), h.tasks(id).find(t => t.kind === 'book').id);
  const tot = Number(h.sql(`select total from plans where id='${id}'`)[0].total); await h.must('consultant', 'payAdd', { id, pid: 'x-' + uuid(), pay: { kind: 'cash', pos: '', acct: '', part: 's', amount: tot, by: 'م', note: '' }, sendId: uuid() });
  await h.must('staff', 'toSurgery', { id }); const q = rec('surgSave', 0, id); q.session.at = new Date().toISOString(); q.finish = true;
  console.log('surgSave keys', Object.keys(q).join(','), 'actual', q.actual, 'planned', q.planned, 'total', tot);
  let r = await h.call('surgery', 'surgSave', q); console.log('surgSave', J(r));
  const sg = JSON.parse(h.sql(`select surg from plans where id='${id}'`)[0].surg); console.log('sg', J({ planned: sg.planned, actual: sg.actual, diff: sg.diff, lastDay: sg.lastDay, dis: sg.dis }), h.state(id));
  r = await h.call('staff', 'settleDone', { id, by: 'منشی', later: 1, note: 'بعداً' }); console.log('settle later', J(r));
  if (!r.ok) { r = await h.call('consultant', 'settleDone', { id, by: 'مشاور', pays: [{ kind: 'cash', amount: Math.abs(sg.diff || 0), part: 's', by: 'م', note: '' }] }); console.log('settle pay', J(r)) }
  if (!r.ok && (sg.diff || 0) < 0) { r = await h.call('consultant', 'settleDone', { id, by: 'مشاور', refund: { amount: -sg.diff, mode: 'keep' }, keep: 1 }); console.log('settle refund', J(r)) }
  console.log(h.state(id));
  await h.call('staff', 'fxFile', { op: 'set', id, file: '8001', by: 'منشی' });
  for (const b of [{}, { rx: ['a'] }, { rxc: 'x' }, { meds: [] }]) { r = await h.call('staff', 'discharge', Object.assign({ id, by: 'منشی' }, b)); console.log('discharge', J(b), '→', J(r)); if (r.ok) break }
  console.log(h.state(id), 'tasks', h.tasks(id).filter(t => !t.done).map(t => t.kind + '@' + t.due).join(','));
  // impression
  await h.must('staff', 'apptSave', { appt: { plan: id, name: nm, phone: '09120000000', day: h.today(), time: '10:00', dur: '45', kind: 'impr', doc: 'دکتر سید مجتبی علویکیا', note: '', by: '', onl: '' }, aid: '', task: '', sendId: uuid() });
  let ap = h.appts(id).filter(a => a.kind === 'impr' && a.st === 'set').pop(); await h.must('staff', 'apptRef', { aid: ap.id, op: 'set', id, by: 'منشی' }); await h.must('doctor', 'prosMap', rec('prosMap', 0, id));
  const lid = uuid(); r = await h.call('doctor', 'prosSess', rec('prosSess', 0, id, { aid: ap.id, lid, due: h.today() })); console.log('impr', J(r), h.state(id));
  // delivery without lab
  await h.must('staff', 'apptSave', { appt: { plan: id, name: nm, phone: '09120000000', day: h.today(), time: '12:00', dur: '45', kind: 'deliv', doc: 'دکتر سید مجتبی علویکیا', note: '', by: '', onl: '' }, aid: '', task: '', sendId: uuid() });
  ap = h.appts(id).filter(a => a.kind === 'deliv' && a.st === 'set').pop(); await h.must('staff', 'apptRef', { aid: ap.id, op: 'set', id, by: 'منشی' });
  r = await h.call('doctor', 'prosSess', rec('prosSess', 2, id, { aid: ap.id })); console.log('deliv', J(r), h.state(id));
  if (!r.ok) { for (const st of ['making', 'ready', 'sent', 'done']) { const x = await h.call('lab', 'labSet', { lid, st, note: '', by: 'لابراتوار' }); console.log('labSet', st, J(x, 120)) } h.sql; r = await h.call('doctor', 'prosSess', rec('prosSess', 2, id, { aid: ap.id })); console.log('deliv2', J(r), h.state(id)) }
  console.log('tasks', h.tasks(id).filter(t => !t.done).map(t => t.kind + '@' + t.due).join(','), '| where', (await h.where(id)).join(' '));
  console.log('labs', J(h.sql(`select st, due from labs where plan='${id}'`)));
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)) }
h.stop(); process.exit(0);
