// regression shim for the lab tests written before m36 (node --import, after sameday-shim). Two things changed since those tests were written:
//  1) the embedded lists are gone, so the work type they start orders with (990001, a five-step process) no longer exists on a fresh site → the shim creates
//     an equivalent test work type once through the normal definitions API and uses its id;
//  2) a step must be referred to a person before it is accepted / finished → when the server answers «needAsg», the shim refers the open steps of that
//     order to a test employee (through the normal «assign» operation) and repeats the call.
// The tests themselves are not touched and the server is not told anything special.
const _f = globalThis.fetch; const PW = { lab: 'tlab1xxxx', mgr: 'tmgr1xxxx' }; const FX = new Map();
const post = async (u, body) => (await _f(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
async function fixture(u) { if (FX.has(u)) return FX.get(u);
  const p = (async () => { const D = await post(u, { action: 'labDefs', password: PW.lab, op: 'get' }); const out = { wt: '990001', uid: '' };
    const have = (D.wts || []).find(w => String(w.id) === '990001');
    let depts = [];
    if (!have) { const names = [['اسکن کلینیک', { upload: 1 }], ['طراحی رزین', { upload: 1 }], ['پرینت رزین', {}], ['رزین پیچ‌شونده', { upload: 1 }], ['ارسال به کلینیک', {}]];
      for (const [name, flags] of names) { const r = await post(u, { action: 'labDefs', password: PW.lab, op: 'dept', x: { name, active: true, sort: 900 + depts.length, flags } }); depts.push(r.id || ((r.depts || []).find(d => d.name === name) || {}).id); }
      const rp = await post(u, { action: 'labDefs', password: PW.lab, op: 'proc', x: { name: 'رزین پیچ‌شونده (تست)', steps: depts.map(d => ({ d, g: 0 })), active: true } }); const pid = rp.id || ((rp.procs || []).find(p => p.name === 'رزین پیچ‌شونده (تست)') || {}).id;
      const rw = await post(u, { action: 'labDefs', password: PW.lab, op: 'wt', x: { name: 'رزین پیچ‌شونده', proc: pid, active: true, sort: -1 } }); out.wt = String(rw.id || ((rw.wts || []).find(w => w.name === 'رزین پیچ‌شونده') || {}).id || '');
      if (!out.wt || depts.some(d => !d)) console.log('lab-old-shim: fixture incomplete', JSON.stringify({ depts, pid, wt: out.wt, rp: JSON.stringify(rp).slice(0, 120) })); }
    else depts = ((D.procs || []).find(p => String(p.id) === String(have.proc)) || { steps: [] }).steps.map(s => s.d);
    await post(u, { action: 'userSave', password: PW.mgr, u: { name: 'کارمند تست قدیمی', role: 'lab', pw: 'old-shim-test-1', lab: { depts: (D.depts || []).map(d => d.id).concat(depts) } } });
    const D2 = await post(u, { action: 'labDefs', password: PW.lab, op: 'get' }); out.uid = ((D2.staff || []).find(s => s.name === 'کارمند تست قدیمی') || {}).id || ''; return out; })();
  FX.set(u, p); return p; }
globalThis.fetch = async (u, o) => { let j = null; try { if (o && typeof o.body === 'string' && /"action":"(labStart|lab4Start|labStep|lab5)"/.test(o.body)) j = JSON.parse(o.body); } catch (e) { }
  if (!j) return _f(u, o);
  if ((j.action === 'labStart' || j.action === 'lab4Start') && String(j.wt) === '990001') { const fx = await fixture(u); if (fx.wt !== '990001') { j.wt = fx.wt; o = { ...o, body: JSON.stringify(j) }; } }
  let r = await _f(u, o); if (j.action === 'labStart' || j.action === 'lab4Start') return r;
  let t; try { t = await r.clone().json(); } catch (e) { return r; }
  if (!t || t.ok !== false || !t.needAsg || !j.lid) return r;
  const fx = await fixture(u); const L = await post(u, { action: 'labOrder', password: PW.lab, lid: j.lid }).catch(() => null);
  const steps = (L && (L.steps || L.items)) || []; for (const s of steps) if (!s.asg && (s.st === 'pend' || s.st === 'acc')) await post(u, { action: 'labStep', password: PW.lab, lid: j.lid, sid: s.id, op: 'assign', uid: fx.uid });
  return _f(u, o); };
