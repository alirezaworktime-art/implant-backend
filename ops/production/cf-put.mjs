// Cloudflare copy of the worker, used by deploy-prod.sh on the Yazd server (the bundle never leaves the server).
//   CF_TOKEN=… CF_ACCOUNT=… node cf-put.mjs get <file>    save the worker that runs on Cloudflare now (for rollback)
//   CF_TOKEN=… CF_ACCOUNT=… node cf-put.mjs put <file>    upload <file>, keeping the worker's bindings and settings
// CF_TOKEN: a Cloudflare API token with "Workers Scripts: Edit" (GitHub secret CF_API_TOKEN, passed by the deploy; never stored).
// Same calls as ops/iran-server/cf.mjs (the laptop tool, which uses wrangler's login instead of a token).
import fs from 'node:fs';
const T = process.env.CF_TOKEN, A = process.env.CF_ACCOUNT, S = process.env.CF_SCRIPT || 'implant-api';
const [cmd, file] = process.argv.slice(2);
if (!T || !A || !file || !['get', 'put'].includes(cmd)) { console.error('usage: CF_TOKEN=… CF_ACCOUNT=… node cf-put.mjs get|put <file>'); process.exit(2); }
const api = (p, o = {}) => fetch(`https://api.cloudflare.com/client/v4/accounts/${A}/workers/scripts/${S}${p}`, { ...o, headers: { Authorization: 'Bearer ' + T, ...(o.headers || {}) } });
if (cmd === 'get') {
  const r = await api('/content/v2'); let body = await r.text(); const ct = r.headers.get('content-type') || '';
  if (ct.includes('multipart')) { const b = ct.split('boundary=')[1]; const part = body.split('--' + b)[1]; body = part.slice(part.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, ''); }
  if (r.status !== 200 || body.length < 100000) { console.error('Cloudflare download failed', r.status); process.exit(1); }
  fs.writeFileSync(file, body, { mode: 0o600 }); console.log('saved current Cloudflare worker', body.length, 'bytes');
} else {
  const src = fs.readFileSync(file, 'utf8');
  const sr = await api('/settings'), st = await sr.json();
  if (!st.success || !st.result) { console.error('Cloudflare settings read failed', sr.status, JSON.stringify(st.errors || [])); process.exit(1); }
  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify({ main_module: 'worker.js', compatibility_date: st.result.compatibility_date || '2026-09-01', bindings: st.result.bindings, observability: { enabled: true } })], { type: 'application/json' }));
  fd.append('worker.js', new Blob([src], { type: 'application/javascript+module' }), 'worker.js');
  const r = await api('', { method: 'PUT', body: fd }); const j = await r.json();
  console.log('Cloudflare upload', r.status, j.success ? 'ok' : 'failed', j.success ? '' : JSON.stringify(j.errors));
  if (!j.success) process.exit(1);
}
