// runs every 10 minutes as root (implant-monitor.timer): checks the site, nightly copy, backups, disk and SSL;
// emails the owner through the Apps Script web app when something is wrong, and sends a heartbeat so a dead server is noticed too
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const env = {};
for (const l of fs.readFileSync('/etc/implant.env', 'utf8').split('\n')) { const i = l.indexOf('='); if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, ''); }
const sh = c => { try { return execSync(c, { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return 'ERR ' + String(e.stdout || '').trim(); } };
const P = [];
if (sh('systemctl is-active implant') !== 'active') P.push('برنامه‌ی سایت (سرویس implant) در حال اجرا نیست.');
if (sh('systemctl is-active nginx') !== 'active') P.push('وب‌سرور (nginx) خاموش است.');
const code = sh("curl -s -o /dev/null -w '%{http_code}' -m 15 --resolve alavi.itpelc.ir:443:127.0.0.1 https://alavi.itpelc.ir/health");
if (code !== '200') P.push(`سایت روی خود سرور جواب درست نمی‌دهد (کد ${code}).`);
const du = parseInt(sh("df --output=pcent / | tail -1"), 10);
if (du >= 85) P.push(`دیسک سرور ${du}٪ پر است.`);
const end = Date.parse(sh('openssl x509 -enddate -noout -in /etc/lego/.lego/certificates/alavi.itpelc.ir.crt').replace('notAfter=', ''));
const days = Math.floor((end - Date.now()) / 864e5);
if (!(days >= 21)) P.push(`گواهی امنیتی (SSL) فقط ${isNaN(days) ? '؟' : days} روز اعتبار دارد و تمدید خودکار هنوز انجام نشده.`);
const nj = sh("journalctl -u implant-nightly --since '-26h' --no-pager -o cat");
if (!/cloudflare copy ok/.test(nj)) P.push('کپی شبانه‌ی پشتیبان به Cloudflare در ۲۶ ساعت گذشته موفق نبوده است.');
if (!/sheet ok/.test(nj)) P.push('خلاصه‌ی شبانه‌ی بیماران در Google Sheet در ۲۶ ساعت گذشته ثبت نشده است.');
let snap = 0; try { for (const f of fs.readdirSync('/opt/implant/backups')) if (/^implant-\d{8}\.db$/.test(f)) snap = Math.max(snap, fs.statSync('/opt/implant/backups/' + f).mtimeMs); } catch (e) { }
if (Date.now() - snap > 30 * 36e5) P.push('پشتیبان روزانه‌ی دیتابیس روی سرور در ۳۰ ساعت گذشته ساخته نشده است.');
const cj = sh("journalctl -u implant-cert --since '-26h' --no-pager -o cat");
if (/FAILED/.test(cj)) P.push('تمدید خودکار گواهی امنیتی (SSL) خطا داد.');
const hr = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
const STF = '/var/lib/implant-monitor/state.json'; fs.mkdirSync('/var/lib/implant-monitor', { recursive: true });
let st = {}; try { st = JSON.parse(fs.readFileSync(STF, 'utf8')); } catch (e) { }
if (hr === 3 && st.qc !== new Date().toISOString().slice(0, 10)) {
  const qc = sh("sqlite3 /opt/implant/data/implant.db 'PRAGMA quick_check;'"); st.qc = new Date().toISOString().slice(0, 10);
  if (qc !== 'ok') P.push('بررسی سلامت دیتابیس خطا نشان داد: ' + qc.slice(0, 200));
}
const post = async b => { try { const r = await fetch(env.SHEET_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: JSON.stringify(Object.assign({ key: env.SHEET_KEY }, b)), redirect: 'follow', signal: AbortSignal.timeout(30000) }); return JSON.parse(await r.text()); } catch (e) { return { ok: false, error: String(e.message || e) }; } };
const sig = P.join('|'), now = Date.now(), when = new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });
if (P.length && (sig !== st.sig || now - (st.at || 0) > 6 * 36e5)) {
  const r = await post({ action: 'alert', subject: 'هشدار سایت طرح درمان: ' + P.length + ' مشکل', body: 'بررسی خودکار سرور ایران در ' + when + ':\n\n' + P.map(x => '• ' + x).join('\n') + '\n\nتا رفع مشکل، این پیام هر ۶ ساعت تکرار می‌شود.' });
  if (r.ok) { st.sig = sig; st.at = now; }
  console.log('alert', r.ok ? 'sent' : 'FAILED ' + r.error, sig);
} else if (!P.length && st.sig) {
  const r = await post({ action: 'alert', subject: 'سایت طرح درمان: مشکل برطرف شد', body: 'در بررسی ' + when + ' همه‌چیز سالم بود.' });
  if (r.ok) { st.sig = ''; st.at = 0; }
}
const b = await post({ action: 'beat', ok: !P.length });
fs.writeFileSync(STF, JSON.stringify(st));
console.log(P.length ? 'problems: ' + P.length : 'all ok', 'cert days', days, 'disk', du + '%', 'beat', b.ok ? 'ok' : 'FAILED');
