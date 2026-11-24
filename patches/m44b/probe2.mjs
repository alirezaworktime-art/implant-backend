import { start, uuid } from '../audit/A.mjs';
const h = await start(); const old = new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 10), D = 'دکتر نمونه', lid = () => 'l' + uuid().slice(0, 10);
const stock = () => Object.fromEntries(h.sql(`select b, d, l, qty from inv_items where kind='fix'`).map(r => [[r.b, r.d, r.l].join('/'), r.qty]));
const S0 = stock();
const L = [{ id: lid(), k: 'imp', day: old, doc: D, teeth: ['UR6', 'UR5'], n: 2, price: 10000000, fp: 0, imp: { UR6: { b: 'IZEN', d: '4', l: '10', f: 1 }, UR5: { b: 'IZEN', d: '4', l: '10' } } },
  { id: lid(), k: 'imp', day: old, doc: D, teeth: ['UR6'], n: 1, price: 10000000, imp: { UR6: { b: 'IZEN', d: '4.5', l: '8' } } }];
const r = await h.call('staff', 'fxArc', { id: '', by: 'منشی', ackDup: 1, ackFile: 1, arc: { v6: 1, name: 'بیمار دو خط', phone: '09120000000', nid: '', age: '40', city: 'یزد', doc: D, pfile: '', lines: L, pays: [], disc: {}, settled: false, rem: '' } });
console.log('save', JSON.stringify(r).slice(0, 300));
if (r.ok) { const o = h.sql(`select total, surg, data from plans where id='${r.id}'`)[0]; const sg = JSON.parse(o.surg || '{}'); console.log('total', o.total, 'sessions', JSON.stringify((sg.sessions || []).map(s => s.imp)).slice(0, 700));
  const S1 = stock(), d = {}; for (const k of new Set([...Object.keys(S0), ...Object.keys(S1)])) { const v = (S1[k] || 0) - (S0[k] || 0); if (v) d[k] = v } console.log('stock diff', JSON.stringify(d));
  console.log('moves', JSON.stringify(h.sql(`select delta, note, type from inv_moves where ref='${r.id}'`)).slice(0, 600));
  console.log('lines', JSON.stringify(JSON.parse(o.data).arc.lines.map(l => [l.k, l.teeth, l.n, l.price, l.amt, l.fp])).slice(0, 400)) }
h.stop();
