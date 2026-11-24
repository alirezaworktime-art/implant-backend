// t-m43d (server): temporary prosthesis in paper files — PMMA by tooth, Essix / denture by jaw; PMMA steps with teeth, Essix step with jaw. Run: WORKER=<m43d bundle> node t-m43d.mjs
import { start, uuid } from '../audit/A.mjs';
let bad = 0; const J = (x, n = 400) => JSON.stringify(x).slice(0, n);
const ok = (c, t, x) => { console.log((c ? 'ok   ' : 'FAIL ') + t + (c || x === undefined ? '' : ' ' + J(x))); if (!c) bad++ };
const h = await start(); const old = new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 10), D = 'دکتر نمونه', lid = () => 'l' + uuid().slice(0, 10);
const mk = (name, lines, extra = {}) => h.call('staff', 'fxArc', { id: extra.id || '', by: 'منشی', ackDup: 1, ackFile: 1, arc: Object.assign({ v6: 1, name, phone: '0913' + String(1000000 + Math.floor(Math.random() * 8999999)), nid: '', age: '40', city: 'یزد', doc: D, pfile: '', lines, pays: [], disc: {}, settled: false, rem: '' }, extra.arc || {}) });
const arc = id => JSON.parse(h.sql(`select data from plans where id='${id}'`)[0].data).arc;
try {
  const L = [
    { id: lid(), k: 'tmp', day: old, doc: D, teeth: ['UR1', 'UR2'], n: 2, price: 1000000 },
    { id: lid(), k: 'esx', day: old, doc: D, teeth: ['UR1'], n: 7, price: 2000000, scan: 'B' },
    { id: lid(), k: 'dnt', day: old, doc: D, teeth: [], n: 1, price: 3000000, scan: 'L' },
    { id: lid(), k: 'dnt', day: old, doc: D, teeth: [], n: 1, price: 3000000, scan: 'zz' },
    { id: lid(), k: 'pros', day: old, doc: D, teeth: ['LR4', 'LR5'], n: 1, price: 400000, ty: 'pmma', pt: { LR4: 'a', LR5: 'p' } },
    { id: lid(), k: 'pros', day: old, doc: D, teeth: [], n: 1, price: 300000, ty: 'pmmail' },
    { id: lid(), k: 'pros', day: old, doc: D, teeth: [], n: 1, price: 500000, ty: 'essix', scan: 'U' },
    { id: lid(), k: 'pros', day: old, doc: D, teeth: [], n: 1, price: 100000, ty: 'ng', scan: 'U' }];
  let r = await mk('بیمار موقت', L); ok(r.ok, 'paper file with PMMA, Essix, denture and steps saved', r);
  const a = arc(r.id), by = i => a.lines.find(l => l.id === L[i].id);
  ok(by(0).n === 2 && by(0).amt === 2000000, 'PMMA: two teeth × 1,000,000', by(0));
  ok(by(1).n === 2 && by(1).scan === 'B' && by(1).amt === 4000000 && by(1).teeth.length === 0, 'Essix both jaws: 2 × 2,000,000, the count sent by the page is ignored', by(1));
  ok(by(2).n === 1 && by(2).scan === 'L' && by(2).amt === 3000000, 'denture lower jaw: 1 × 3,000,000', by(2));
  ok(by(3).scan === 'U' && by(3).n === 1, 'unknown jaw → upper jaw', by(3));
  ok(by(4).ty === 'pmma' && by(4).teeth.join() === 'LR4,LR5' && by(4).pt.LR5 === 'p' && by(4).amt === 400000, 'PMMA step keeps its teeth (abutment / pontic)', by(4));
  ok(by(5).ty === 'pmmail' && by(5).teeth.length === 0, 'a PMMA step without teeth (stored before) can still be saved', by(5));
  ok(by(6).scan === 'U' && by(6).amt === 500000, 'Essix step keeps the jaw', by(6)); ok(!by(7).scan, 'other steps get no jaw', by(7));
  const tot = h.sql(`select total from plans where id='${r.id}'`)[0].total; ok(tot === 2000000 + 4000000 + 3000000 + 3000000 + 400000 + 300000 + 500000 + 100000, 'file total = sum of the rows', tot);
  const g = await h.call('consultant', 'get', { id: r.id }); ok(g && g.ok !== false, 'file opens for the consultant', g && g.error);
  // redo free for a PMMA step
  const L2 = [{ id: lid(), k: 'pros', day: old, doc: D, teeth: ['UL3'], n: 1, price: 700000, ty: 'pmma', redo: true }]; r = await mk('بیمار مجدد', L2); ok(r.ok && arc(r.id).lines[0].redo === 1 && arc(r.id).lines[0].amt === 0, '«PMMA مجدد» is free like the other tooth steps', r.ok ? arc(r.id).lines[0] : r);
  r = await mk('بیمار بد', [{ id: lid(), k: 'esx', day: old, doc: '', n: 1, price: 1, scan: 'U' }]); ok(r.ok === false, 'the usual checks still apply (no doctor → refused)', r);
  // accounting services and tariffs
  const sv = n => h.sql(`select id, price, cat, rule from fin_svc where name='${n}'`)[0];
  await h.call('accountant', 'finCat', {}).catch(() => 0); await h.call('manager', 'm43Get', {});
  ok(sv('روکش موقت Essix') && sv('روکش موقت دنچر') && sv('روکش موقت Essix').cat === 'p' && sv('روکش موقت Essix').rule === 'doctor', 'accounting has the two services', [sv('روکش موقت Essix'), sv('روکش موقت دنچر')]);
  const m = await h.must('manager', 'm43Get', {}); ok(m.svc.some(s => s.name === 'روکش موقت Essix') && m.svc.some(s => s.name === 'روکش موقت دنچر'), 'manager can set tariff and doctor share for them');
  const st = await h.call('manager', 'settings', { settings: { prices: { tmp_es: { price: '2500000' }, tmp_dn: { price: '6000000' }, pr_pmma: { price: '350000' } } } }); ok(st && st.ok !== false, 'manager saves the new tariffs in settings', st && st.error);
  const s2 = await h.call('consultant', 'settings', {}); const P = ((s2 && s2.settings) || {}).prices || {}; ok(P.tmp_es && String(P.tmp_es.price) === '2500000' && P.pr_pmma && String(P.pr_pmma.price) === '350000', 'tariffs are kept and reach the consultant', [P.tmp_es, P.pr_pmma]);
  await h.call('accountant', 'finSuggest', { id: r.id || '' }).catch(() => 0); await h.call('manager', 'm43Get', {});
  ok(Number(sv('روکش موقت Essix').price) === 2500000 && Number(sv('روکش موقت دنچر').price) === 6000000, 'settings tariff reaches the accounting service', [sv('روکش موقت Essix'), sv('روکش موقت دنچر')]);
  { const tb = await h.call('accountant', 'finTrial', {}); const rows = (tb && (tb.rows || tb.items)) || []; const dr = rows.reduce((a, x) => a + (Number(x.dr) || 0), 0), cr = rows.reduce((a, x) => a + (Number(x.cr) || 0), 0); ok(tb && tb.ok !== false && Math.abs(dr - cr) < 1, 'accounting trial balance still balanced', { dr, cr }) }
  const rep = await h.call('manager', 'm1Rep', {}).catch(e => ({ ok: false, error: String(e) })); ok(rep && rep.ok !== false, 'manager report still opens', rep && rep.error);
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 700)); bad++ }
h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
