// explore: does the server keep a new top-level settings field?
const A = await import('file:///home/claude/w/audit/A.mjs'); const h = await A.start(); const J = x => JSON.stringify(x).slice(0, 400);
try {
  let r = await h.call('manager', 'ping', {}); const s = r.settings || {}; console.log('keys', Object.keys(s).join(','));
  r = await h.call('manager', 'settings', { settings: Object.assign({}, s, { smsTo: '09120000000', prices: Object.assign({}, s.prices || {}, { m57_sms: { price: '09120000000' } }) }) }); console.log('save', J(r).slice(0, 200));
  r = await h.call('staff', 'ping', {}); console.log('smsTo', String(r.settings.smsTo), 'price', JSON.stringify((r.settings.prices || {}).m57_sms));
  r = await h.call('consultant', 'ping', {}); console.log('cons', JSON.stringify((r.settings.prices||{}).m57_sms));
} catch (e) { console.log('ERR', String(e && e.stack || e).slice(0, 500)) }
h.stop(); process.exit(0);
