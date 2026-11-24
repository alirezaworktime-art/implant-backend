// Cloudflare worker tool (wrangler OAuth token): node cf.mjs get <file> | node cf.mjs put <file>
import fs from 'node:fs';
const A = 'REDACTED_HEX', S = 'implant-api';
const [cmd, file] = process.argv.slice(2);
const TOML = process.env.APPDATA + '\\xdg.config\\.wrangler\\config\\default.toml';
let toml = fs.readFileSync(TOML, 'utf8');
let tok = (toml.match(/oauth_token\s*=\s*"([^"]+)"/) || [])[1];
const exp = (toml.match(/expiration_time\s*=\s*"([^"]+)"/) || [])[1];
if (!exp || Date.parse(exp) - Date.now() < 5 * 60e3) { // refresh wrangler's OAuth token ourselves
  const rt = (toml.match(/refresh_token\s*=\s*"([^"]+)"/) || [])[1];
  const r = await fetch('https://dash.cloudflare.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt, client_id: '00000000-0000-0000-0000-000000000000' }) });
  const j = await r.json();
  if (!j.access_token) throw new Error('token refresh failed: run  npx wrangler login');
  tok = j.access_token;
  toml = toml.replace(/oauth_token\s*=\s*"[^"]*"/, `oauth_token = "${j.access_token}"`)
    .replace(/expiration_time\s*=\s*"[^"]*"/, `expiration_time = "${new Date(Date.now() + j.expires_in * 1000).toISOString()}"`);
  if (j.refresh_token) toml = toml.replace(/refresh_token\s*=\s*"[^"]*"/, `refresh_token = "${j.refresh_token}"`);
  fs.writeFileSync(TOML, toml); console.log('token refreshed');
}
const api = (p, o = {}) => fetch('https://api.cloudflare.com/client/v4/accounts/' + A + p, { ...o, headers: { Authorization: 'Bearer ' + tok, ...(o.headers || {}) } });
if (cmd === 'get') {
  const r = await api(`/workers/scripts/${S}/content/v2`); let body = await r.text(); const ct = r.headers.get('content-type') || '';
  if (ct.includes('multipart')) { const b = ct.split('boundary=')[1]; const part = body.split('--' + b)[1]; body = part.slice(part.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, ''); }
  if (r.status !== 200 || body.length < 100000) throw new Error('download failed ' + r.status);
  fs.writeFileSync(file, body); console.log('downloaded', body.length);
} else if (cmd === 'put') {
  const src = fs.readFileSync(file, 'utf8');
  const st = await (await api(`/workers/scripts/${S}/settings`)).json();
  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify({ main_module: 'worker.js', compatibility_date: st.result.compatibility_date || '2026-09-01', bindings: st.result.bindings, observability: { enabled: true } })], { type: 'application/json' }));
  fd.append('worker.js', new Blob([src], { type: 'application/javascript+module' }), 'worker.js');
  const r = await api(`/workers/scripts/${S}`, { method: 'PUT', body: fd }); const j = await r.json();
  console.log('upload', r.status, j.success, JSON.stringify(j.errors));
  if (!j.success) process.exit(1);
} else if (cmd === 'nokey') {
  const L = fs.readFileSync(file, 'utf8').split('\n'); const k = L.findIndex(l => /^const IMPORT_KEY\s*=/.test(l)); L[k] = "const IMPORT_KEY='';"; fs.writeFileSync(process.argv[4], L.join('\n')); console.log('import key cleared');
}
