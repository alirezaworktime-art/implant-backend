/* ---------- m44a (owner, 2026-11-17): surgery sheet — an implant that failed in the session («فیل اولیه») and the implant placed after it on the same
   tooth are two fixtures, each with its own brand and size: record m = the failed fixture, m.f2 = { b, sys, g, d, l } = the fixture that was placed.
   Both leave the store. Without f2 the second fixture is the same item as the first (as before). ---------- */
function m44It(m) { const f = m && m.f2; if (!f || typeof f !== 'object') return null; const b = tcut(String(f.b || ''), 60), d = tcut(fxNum(f.d), 8), l = tcut(fxNum(f.l), 8); return b && d && l ? { kind: 'fix', b, sys: tcut(String(f.sys || ''), 60), d, l } : null; }
