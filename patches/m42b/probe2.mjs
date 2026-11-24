const A = await import('file:///home/claude/w/audit/A.mjs'); const { uuid, REC } = A; const h = await A.start();
const n1 = 'بیمار عادی', id1 = await h.add(n1); await h.plan(id1, n1);
let g = await h.call('staff', 'get', { id: id1 }); const show = g => Object.fromEntries(Object.entries(g).filter(([k, v]) => !['data', 'settings', 'tasks', 'appts', 'notes'].includes(k)).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : v]));
console.log('SENT', JSON.stringify(show(g)));
console.log('data keys', Object.keys(g.data || {}).join(','), JSON.stringify(g.data.h).slice(0,300));
// undecided
const n2 = 'بیمار مردد', id2 = await h.add(n2); await h.plan(id2, n2);
const q = JSON.parse(JSON.stringify(REC.confirm[0].req).split(REC.queueAdd[0].req.id).join(id2).split('رضا آزمایشی').join(n2)); delete q.action; q.sendId = uuid(); await h.must('consultant', 'queueOpen', { id: id2 });
q.record.data._v = h.sql(`select json_extract(data,'$.updatedAt') v from plans where id='${id2}'`)[0].v; q.record.data.updatedAt = new Date(Date.now() + 1000).toISOString();
let u = await h.call('consultant', 'undecided', { ...q, reason: 'فکر می‌کنم', note: '', follow: h.today() }); console.log('UND', JSON.stringify(u).slice(0, 300));
g = await h.call('staff', 'get', { id: id2 }); console.log('UNDGET', JSON.stringify(show(g)));
console.log(Object.keys(REC).join(','));
h.stop();
