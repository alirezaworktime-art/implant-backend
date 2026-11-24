// m23 regression shim (node --import): the scenarios written before m23 take the impression on the day of the surgery.
// From m23 the server asks first, so their prosSess calls get sameDay:1 unless the test sets sameDay itself. Nothing else is touched.
const _f = globalThis.fetch;
globalThis.fetch = (u, o) => { try { if (o && typeof o.body === 'string' && o.body.includes('"action":"prosSess"')) { const j = JSON.parse(o.body); if (j.sameDay === undefined) { j.sameDay = 1; o = { ...o, body: JSON.stringify(j) }; } } } catch (e) { } return _f(u, o); };
