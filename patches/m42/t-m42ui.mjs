// t-m42ui: role ticks in the users page, shared-password switches, cartable chooser at login, «تغییر کارتابل». Run: WORKER=<m42 bundle> node t-m42ui.mjs
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href); const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 400))); if (!c) bad++ };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const PE = [];
const ctx = async (vw = 1280, vh = 760) => { const c = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR', timezoneId: 'Asia/Tehran' }); await c.route(/googleapis|gstatic/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => PE.push(e.message.slice(0, 200))); await p.goto(h.url); return p };
const lg = async (p, role, pw) => { await p.click(`[data-lrole="${role}"]`); await p.fill('#lg_pw', pw); await p.click('#lgGo'); await W(2500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())) };
const st = p => p.evaluate(() => ({ role: document.body.dataset.role || '', who: (document.getElementById('whoami') || {}).textContent || '', sw: !!(document.getElementById('m42Sw') && !document.getElementById('m42Sw').hidden), ch: !!(document.getElementById('m42Ch') && !document.getElementById('m42Ch').hidden), picks: [...document.querySelectorAll('#m42Ch [data-m42pick]')].map(x => x.dataset.m42pick).filter(Boolean), login: !document.getElementById('viewLogin').hidden, msg: (document.getElementById('lgMsg') || {}).textContent || '' }));
const PP = 'pers0na1x';
try {
  // ---- manager: users page
  let p = await ctx(); await lg(p, 'manager', A.PW.manager); await p.evaluate(() => show('users')); await W(1800);
  let u = await p.evaluate(() => ({ n: document.querySelectorAll('#m42Roles [data-m42r]').length, selHidden: document.getElementById('ua_role').closest('label').hidden, rows: document.querySelectorAll('#m42Sh [data-m42sh]').length, staffTick: document.querySelector('[data-m42r="staff"]').checked }));
  ok(u.n === 8 && u.selHidden && u.staffTick, 'users page: eight role ticks instead of the single list', u); ok(u.rows === 6, 'shared-password card: six cartables (no manager)', u);
  await p.fill('#ua_name', 'کارمند نمونه'); await p.check('[data-m42r="consultant"]'); await p.fill('#ua_pw', PP); await p.click('#uaSave'); await W(1800);
  let li = await p.evaluate(() => { const it = [...document.querySelectorAll('#uaUsers .item')].find(x => /کارمند نمونه/.test(x.textContent)); return it ? it.querySelector('.meta').textContent : '' });
  ok(/منشی/.test(li) && /مشاور/.test(li), 'saved account shows both roles in the list', li);
  await p.evaluate(() => { const bt = [...document.querySelectorAll('#uaUsers [data-uedit]')].find(x => /کارمند نمونه/.test(x.closest('.item').textContent)); bt.click() }); await W(500);
  let ed = await p.evaluate(() => [...document.querySelectorAll('#m42Roles [data-m42r]:checked')].map(x => x.dataset.m42r)); ok(ed.join() === 'staff,consultant', 'editing ticks the stored roles', ed);
  await p.uncheck('[data-m42r="staff"]'); await p.uncheck('[data-m42r="consultant"]'); await p.click('#uaSave'); await W(600);
  ok(/دست‌کم یک نقش/.test(await p.evaluate(() => document.getElementById('uaMsg').textContent)), 'no tick → message, nothing sent');
  await p.click('#uaCancel'); await W(300);
  // shared switch with the warning
  await p.click('[data-m42sh="doctor"]'); await W(600); let dlg = await p.evaluate(() => { const s = document.getElementById('uxAskSh'); return s && !s.hidden ? s.textContent : '' });
  ok(/هیچ حساب شخصی فعالی/.test(dlg), 'switching off a cartable without personal accounts warns first', dlg.slice(0, 120)); await p.click('#uxAskNo'); await W(400);
  ok(await p.evaluate(() => /روشن/.test(document.querySelector('[data-m42sh="doctor"]').closest('.m42row').querySelector('.meta').textContent) && !/خاموش/.test(document.querySelector('[data-m42sh="doctor"]').closest('.m42row').querySelector('.meta').textContent)), '«انصراف» leaves it on');
  await p.click('[data-m42sh="doctor"]'); await W(500); await p.click('#uxAskOk'); await W(1500);
  ok(await p.evaluate(() => /خاموش/.test(document.querySelector('[data-m42sh="doctor"]').closest('.m42row').querySelector('.meta').textContent)), 'confirmed → shown as «خاموش»');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'users page: no sideways scroll'); await p.screenshot({ path: 'users-desktop.png', fullPage: false });
  await p.context().close();
  // ---- the person logs in
  for (const [vw, vh] of [[1280, 760], [390, 740]]) { const tag = vw > 500 ? 'desktop' : 'phone'; p = await ctx(vw, vh);
    await lg(p, 'surgery', PP); let s = await st(p); ok(s.ch && s.picks.join() === 'staff,consultant' && s.login, tag + ': personal password with two roles → cartable chooser (whatever tile was pressed)', s);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), tag + ': chooser fits the screen'); await p.screenshot({ path: 'chooser-' + tag + '.png' });
    await p.click('[data-m42pick="consultant"]'); await W(2500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); s = await st(p);
    ok(s.role === 'consultant' && /کارمند نمونه/.test(s.who) && s.sw && !s.login, tag + ': enters the consultant cartable under the own name, «تغییر کارتابل» visible', s);
    await p.click('#m42Sw'); await W(500); s = await st(p); ok(s.ch && s.picks.length === 2, tag + ': «تغییر کارتابل» opens the chooser', s);
    await p.click('[data-m42pick="staff"]'); await W(2800); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove())); s = await st(p); ok(s.role === 'staff' && s.sw && !s.login, tag + ': switched to the staff cartable', s);
    await p.reload(); await W(2800); s = await st(p); ok(s.role === 'staff' && s.sw && /کارمند نمونه/.test(s.who), tag + ': after a reload still the same cartable and name', s);
    await p.evaluate(() => logout()); await W(400); s = await st(p); ok(s.login && !s.sw, tag + ': logout hides the switch', s);
    await lg(p, 'staff', A.PW.staff); s = await st(p); ok(s.role === 'staff' && !s.sw && !s.ch, tag + ': shared staff password as before (no chooser)', s);
    await p.evaluate(() => logout()); await W(400); await lg(p, 'staff', A.PW.consultant); s = await st(p); ok(s.login && /مشاور/.test(s.msg), tag + ': shared password on the wrong tile → the old message', s);
    await lg(p, 'doctor', A.PW.doctor); s = await st(p); ok(s.login && /رمز عبور اشتباه/.test(s.msg), tag + ': switched-off shared password is refused', s);
    await p.context().close(); }
  // ---- one-role personal account: straight in, second time too
  await h.must('manager', 'userSave', { u: { name: 'تک‌نقشی نمونه', roles: ['surgery'], pw: 'pers0na2y' } });
  p = await ctx(); await lg(p, 'staff', 'pers0na2y'); let s = await st(p); ok(s.role === 'surgery' && !s.sw && !s.ch && /تک‌نقشی نمونه/.test(s.who), 'one-role personal account enters its own cartable, no chooser', s);
  await p.evaluate(() => logout()); await W(400); await lg(p, 'surgery', 'pers0na2y'); s = await st(p); ok(s.role === 'surgery' && !s.ch, 'second login on the same device (remembered) works', s);
  await p.context().close();
} catch (e) { console.log('ERR', e.message.slice(0, 400)); bad++ }
ok(!PE.length, 'no page errors', PE.slice(0, 3)); await b.close(); h.stop(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
