// t-m21: pen pads — a resting palm does not cut or bend the pen stroke, does not scroll or select. Synthetic pointer events (setPointerCapture is made tolerant for them, test only).
// Run: WORKER=<bundle> node t-m21.mjs   (needs ../audit/A.mjs)
import { createRequire } from 'node:module';
const req = createRequire(process.env.NODE_TOOLS || new URL('../../package.json', import.meta.url).pathname); const { chromium } = req('playwright-core');
const A = await import(new URL('../audit/A.mjs', import.meta.url).href);
const h = await A.start(); const W = ms => new Promise(r => setTimeout(r, ms)); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + String(JSON.stringify(x)).slice(0, 400))); if (!c) bad++ };
const id = await h.add('بیمار قلم');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran', hasTouch: true }); await c.route(/googleapis|gstatic/, r => r.abort());
const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(e.message)); p.on('dialog', d => d.dismiss());
try {
  await p.goto(h.url); await p.click('[data-lrole="doctor"]'); await p.fill('#lg_pw', A.PW.doctor); await p.click('#lgGo'); await W(2500); await p.evaluate(() => document.querySelectorAll('.hintc,#chgSheet').forEach(x => x.remove()));
  await p.evaluate(() => { const _s = HTMLCanvasElement.prototype.setPointerCapture; HTMLCanvasElement.prototype.setPointerCapture = function (i) { try { return _s.call(this, i) } catch (e) { } };
    window.ev = (cv, type, pid, pt, fx, fy) => { const r = cv.getBoundingClientRect(); const e = new PointerEvent(type, { pointerId: pid, pointerType: pt, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, pressure: pt === 'pen' ? .5 : 0, bubbles: true, cancelable: true, isPrimary: true, button: 0, buttons: 1 }); e.getCoalescedEvents = () => [e]; /* a synthetic event has no coalesced list */ cv.dispatchEvent(e); return e };
    window.ink = (cv, fx, fy) => { const x = Math.round(cv.width * fx), y = Math.round(cv.height * fy), d = cv.getContext('2d').getImageData(Math.max(0, x - 6), Math.max(0, y - 6), 13, 13).data; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 80 && d[i] < 140 && d[i + 1] < 140) return true; return false };
    window.line = (cv, pid, pt, y, x0, x1, n = 12) => { for (let i = 1; i <= n; i++) ev(cv, 'pointermove', pid, pt, x0 + (x1 - x0) * i / n, y) };
    window.tm = el => { const e = new Event('touchmove', { bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented }; window.ss = el => { const e = new Event('selectstart', { bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented } });
  ok(await p.evaluate(() => !tm(document.body) && !ss(document.body) && !document.documentElement.classList.contains('m21pen')), 'no pad open: scrolling and selection are untouched');
  const run = async (name, open, cvId, sheetSel) => {
    await p.evaluate(open); await W(900); const has = await p.evaluate(i => { const c = document.getElementById(i); return !!c && c.getClientRects().length > 0 }, cvId); ok(has, name + ': pad is open'); if (!has) return;
    const r = await p.evaluate(([cvId, sheetSel]) => { const cv = document.getElementById(cvId), R = {}; if (typeof M21 !== 'undefined') { M21.pen = 0; M21.act = null }
      /* 1: palm rests first, pen writes, palm lifts in the middle of the stroke */
      ev(cv, 'pointerdown', 11, 'touch', .1, .85); ev(cv, 'pointerdown', 22, 'pen', .2, .3); line(cv, 22, 'pen', .3, .2, .5); ev(cv, 'pointerup', 11, 'touch', .1, .85); line(cv, 22, 'pen', .3, .5, .8); ev(cv, 'pointerup', 22, 'pen', .8, .3);
      R.before = ink(cv, .35, .3); R.after = ink(cv, .7, .3);
      /* 2: palm lands and slides during a pen stroke */
      ev(cv, 'pointerdown', 23, 'pen', .2, .5); line(cv, 23, 'pen', .5, .2, .45); ev(cv, 'pointerdown', 12, 'touch', .6, .9); line(cv, 12, 'touch', .9, .6, .9); line(cv, 23, 'pen', .5, .45, .8); ev(cv, 'pointerup', 12, 'touch', .9, .9); line(cv, 23, 'pen', .5, .8, .9); ev(cv, 'pointerup', 23, 'pen', .9, .5);
      R.s2 = ink(cv, .7, .5) && ink(cv, .86, .5); R.palm = ink(cv, .75, .9); R.jump = ink(cv, .62, .7);
      /* 3: leaving the edge does not end the stroke */
      ev(cv, 'pointerdown', 24, 'pen', .2, .7); line(cv, 24, 'pen', .7, .2, .4); ev(cv, 'pointerleave', 24, 'pen', .4, .7); ev(cv, 'pointerout', 24, 'pen', .4, .7); line(cv, 24, 'pen', .7, .4, .7); ev(cv, 'pointerup', 24, 'pen', .7, .7); R.leave = ink(cv, .6, .7);
      /* scroll + selection while writing */
      const sh = document.querySelector(sheetSel) || document.body; R.tm = tm(sh); R.ss = ss(sh.querySelector('h3,b,span,label') || sh); const ta = document.querySelector('textarea,input[type=text],input:not([type])'); R.ssInput = ta ? ss(ta) : false; R.cls = document.documentElement.classList.contains('m21pen');
      R.ctx = (() => { const e = new Event('contextmenu', { bubbles: true, cancelable: true }); cv.dispatchEvent(e); return e.defaultPrevented })();
      /* 4: finger alone, no pen around → still draws */
      if (typeof M21 !== 'undefined') { M21.pen = 0; M21.act = null } ev(cv, 'pointerdown', 13, 'touch', .2, .15); line(cv, 13, 'touch', .15, .2, .6); ev(cv, 'pointerup', 13, 'touch', .6, .15); R.finger = ink(cv, .4, .15);
      return R }, [cvId, sheetSel]);
    ok(r.before && r.after, name + ': palm lifted mid-stroke → the pen stroke goes on', r); ok(r.s2 && !r.palm && !r.jump, name + ': palm landing and sliding leaves no ink and no jump', r); ok(r.leave, name + ': crossing the edge does not end the stroke', r);
    ok(r.tm && r.ss && !r.ssInput && r.cls && r.ctx, name + ': no page scroll, no text selection (inputs still selectable), no long-press menu', r); if (cvId !== 'h9C') ok(r.finger, name + ': a finger alone still writes', r) }; /* the lab-order page keeps its own rule: after a pen was used on it, fingers are ignored until it is reopened */
  await run('pen note', `(async()=>{await ntOpen(${JSON.stringify(id)},{kind:'pen',name:'بیمار قلم'})})()`, 'fxNtCv', '#fxNtSheet');
  ok(await p.evaluate(() => typeof FXPAD !== 'undefined' && FXPAD.dirty() && FXPAD.data().length > 2000), 'pen note: the drawing is ready to save'); await p.evaluate(() => { const s = $('fxNtSheet'); if (s) s.hidden = true }); await W(200);
  await run('lab-order handwriting', `(()=>{LO=LO||{};LO.h9=LO.h9||{draw:'',drawN:0};h9Pad()})()`, 'h9C', '#h9Pad'); await p.evaluate(() => { const o = $('h9Pad'); if (o) o.remove() }); await W(200);
  await p.evaluate(() => { LO.h9 = { draw: '', drawN: 0 }; h9Pad() }); await W(700); ok(await p.evaluate(() => { const cv = $('h9C'); M21.pen = 0; M21.act = null; ev(cv, 'pointerdown', 14, 'touch', .2, .2); line(cv, 14, 'touch', .2, .2, .6); ev(cv, 'pointerup', 14, 'touch', .6, .2); return ink(cv, .4, .2) }), 'lab-order handwriting: on a freshly opened page a finger alone writes'); await p.evaluate(() => { const o = $('h9Pad'); if (o) o.remove() }); await W(200);
  await run('signature', `(()=>{$('sgnSheet').hidden=false})()`, 'sgnPad', '#sgnSheet'); await p.evaluate(() => { $('sgnSheet').hidden = true }); await W(200);
  await p.evaluate(() => ev(document.body, 'pointerdown', 99, 'mouse', .5, .5)); ok(await p.evaluate(() => !tm(document.body) && !ss(document.body) && !document.documentElement.classList.contains('m21pen')), 'pads closed again: scrolling and selection back to normal');
  ok(PE.length === 0, 'no page errors', PE);
} catch (e) { console.log('ERR', e.stack); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); await b.close(); h.stop(); process.exit(bad ? 1 : 0);
