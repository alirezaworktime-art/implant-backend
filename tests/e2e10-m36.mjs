// e2e10-m23: e2e10 for m23 and later — answers the «قالب‌گیری در روز جراحی» question in step 8 (the scenario operates and takes the impression on the same day).
import { chromium, H, login, shot, vis, clickTxt } from './lib.mjs';
const TD = new Date(Date.now() + 3.5 * 3600e3).toISOString().slice(0, 10); /* today in Tehran (was a fixed date; the test failed from the next day on) */
const STEP = +(process.argv[2] || 99);
const h = await H.start({ db: null }); const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ALL = []; const keep = p => ALL.push(p); let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' ' + JSON.stringify(x === undefined ? null : x).slice(0, 300))); if (!c) bad++ };
const W = ms => new Promise(r => setTimeout(r, ms));
const sql = q => h.sql(q);
const NAME = 'رضا آزمایشی', PH = '09120000000';
try {
for (const [b_,d,l] of [['IZEN','4','10'],['IZEN','4.5','11.5'],['DIO','4','10']]) console.log('seed', JSON.stringify(await h.call('inventory','invMove',{spec:{kind:'fix',b:b_,sys:'',d,l},delta:5,n:5,type:'in',note:'seed',price:3000000,sendId:'sd'+b_+d})).slice(0,80));
console.log('cat', JSON.stringify(await h.call('manager','settings',{settings:{catalog:[{b:'IZEN',sys:'',g:'ko',d:['4','4.5'],l:['10','11.5']},{b:'DIO',sys:'',g:'ko',d:['4'],l:['10']}]}})).slice(0,60));
/* 1 reception */
let p = await login(b, h, 'staff'); keep(p);
await clickTxt(p, 'button', 'پذیرش بیمار'); await W(800);
await p.fill('#rc_name', NAME); await p.fill('#rc_phone', PH); await p.fill('#rc_age', '45'); await p.fill('#rc_city', 'یزد'); await p.fill('#rc_nid', '4430000000');
await p.evaluate(() => document.querySelectorAll('[data-mk][data-mv="0"]').forEach(b => b.click()));
await p.evaluate(() => { const s = document.getElementById('rc_asst'); if (s && s.options.length > 1) s.selectedIndex = 1 });
await p.click('#rcSend'); await W(1500); await shot(p, '1-recep');
let r = sql(`select id,status,queue,name from plans`); ok(r.length === 1, '1 reception: patient created', r);
const ID = r[0] && r[0].id; console.log('q', JSON.stringify(r[0]));
if (STEP < 2) throw 'stop';
/* 2 doctor */
p = await login(b, h, 'doctor'); keep(p); await shot(p, '2-doc-home');
await p.click(`[data-qopen="${ID}"]`); await W(2000); await shot(p, '2-doc-form');
for (const k of ['UR6','LR6']) { await p.click(`[data-sid="imp"][data-k="${k}"]`); await W(400) }
await p.click('[data-sid="ext"][data-k="LL7"]'); await W(300);
for (const k of ['UR6','LR6']) { await p.click(`[data-sid="crw"][data-k="${k}"]`); await W(300) }
await shot(p, '2-doc-sel');
console.log(await p.evaluate(()=>JSON.stringify({imp:F.s.imp&&F.s.imp.sel,crw:F.s.crw,ext:F.s.ext&&F.s.ext.sel,dlg:[...document.querySelectorAll('.sheet:not([hidden]),dialog[open]')].map(x=>x.id)})));
await p.click('#confirmBtn'); await W(2000); await shot(p, '2-doc-sent');
r = sql(`select status,queue from plans`); ok(r[0].queue==='consult','2 doctor → consult',r);
if (STEP < 3) throw 'stop';
/* 3 consultant */
p = await login(b, h, 'consultant'); keep(p);
await p.click(`[data-qopen="${ID}"]`); await W(2500); await shot(p,'3-cons-form');
await p.click('[data-brand="ko"]'); await W(400); await p.click('[data-pl9pm="inst"]'); await W(400); await p.click('[data-opt="1"]'); await W(400);
await p.fill('#p_n1','3'); await p.dispatchEvent('#p_n1','input'); await W(300);
await p.fill('#pl9_rcv','5,000,000'); await p.dispatchEvent('#pl9_rcv','input'); await p.click('[data-pl9mt="cash"]'); await W(300);
await shot(p,'3-cons-filled');
await p.click('#confirmBtn'); await W(1500); await shot(p,'3-cons-result');
console.log('rcv field', await p.inputValue('#pl9_rcv'), await p.evaluate(()=>JSON.stringify(F.pay)));
await p.click('[data-out="book"]'); await W(1500); await shot(p,'3-cons-book');
await p.click('[data-ex1g="0"]').catch(()=>{});
{ const cv = await p.$('#sgnSheet canvas, canvas'); const bb = await cv.boundingBox(); await p.mouse.move(bb.x+30,bb.y+30); await p.mouse.down(); for (let i=1;i<20;i++) await p.mouse.move(bb.x+30+i*12,bb.y+30+(i%5)*10); await p.mouse.up() }
await p.click('#sgnOk'); await W(3000); await shot(p,'3-cons-done');
r = sql(`select status,queue,total from plans`); ok(r[0].status==='confirmed' || /book|surg|pay/.test(r[0].queue), '3 consultant confirmed', r);
console.log(JSON.stringify(sql(`select * from pays`)));
if (STEP < 4) throw 'stop';
/* 4 reception: financial settlement + appointment */
p = await login(b, h, 'staff'); keep(p); await shot(p,'4-st-home');
await p.click('[data-tbook]'); await W(1800); await shot(p,'4-st-book');
await p.click('[data-apk="surg"]'); await p.click(`[data-apd="${TD}"]`); await p.selectOption('#ap_time','09:00').catch(async()=>{await p.evaluate(()=>{const s=document.getElementById('ap_time');s.selectedIndex=9;s.dispatchEvent(new Event('change',{bubbles:true}))})});
await p.evaluate(()=>{const s=document.getElementById('ap_doc');if(s.selectedIndex<1&&s.options.length>1){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}))}});
await p.click('#apSave'); await W(2000); await shot(p,'4-st-booked');
console.log(JSON.stringify(sql(`select * from appts`)).slice(0,600));
ok(sql(`select count(*) n from appts where kind='surg'`)[0].n===1,'4 surgery appointment booked');
if (STEP < 5) throw 'stop';
/* 5 surgery day: arrival + financial gate */
await p.evaluate(()=>goTile('surg')); await W(1500); await shot(p,'5-st-today');
await p.click('[data-p4rest]'); await W(1500); await shot(p,'5-st-pay');
console.log((await vis(p)).split('\n').filter(l=>!/data-k=|,k=/.test(l)).slice(14,90).join('\n'));
const shTxt=()=>p.evaluate(()=>{const b=document.getElementById('pcSave');const s=b&&b.closest('[id]:not(button)');return s?s.id+' :: '+s.innerText.replace(/\n+/g,' | ').slice(0,1800):''});
await W(3000); console.log(await shTxt());
console.log('cash val', await p.inputValue('#pc_cash'), 'first', await p.inputValue('#pc_first'));
ok(/^[۰-۹0-9]{4}\/[۰-۹0-9]{2}\/[۰-۹0-9]{2}$/.test(await p.inputValue('#pc_first')),'m10 first cheque date prefilled', await p.inputValue('#pc_first'));
await p.click('[data-pcpos="cash"]'); await p.click('[data-pcct="sayad"]'); await p.click('[data-pcpe="سید مجتبی علویکیا"]');
for (let i=0;i<3;i++) await p.fill(`[data-pcno="${i}"]`, '78383'+i);
await p.evaluate(()=>{window.__pr=[];const o=printHTML;printHTML=s=>{window.__pr.push(s)}});
await p.click('#pcPrint'); await W(800);
const pr = await p.evaluate(()=>window.__pr); ok(/سید مجتبی علویکیا/.test(pr[0]||'') && !/کلینیک دندانپزشکی شهید رهنمون/.test(pr[0]||''),'m10 printed cheques: chosen payee'); console.log('printed', pr.length, (pr[0]||'').match(/class="pg"/g)?.length, /بابت/.test(pr[0]||''));
console.log(await shTxt());
await p.click('#pcSave'); await W(2000); await shot(p,'5-st-paid');
ok(sql(`select count(*) n from pays where kind='chq'`)[0].n===3,'5 cheques recorded');
await p.click('#pcClose').catch(()=>{}); await W(500);
await p.locator('[data-tosurg]:visible').first().click(); await W(2000); await shot(p,'5-st-tosurg');
console.log(await p.evaluate(()=>document.body.innerText.match(/[^\n]*(تکلیف|مانده|ارجاع)[^\n]*/g)?.slice(0,8)));
r=sql(`select queue,status from plans`); console.log(JSON.stringify(r)); ok(r[0].queue==='surgery','5 sent to surgeon',r);
if (STEP < 6) throw 'stop';
/* 6 surgery */
p = await login(b, h, 'surgery'); keep(p); await shot(p,'6-sg-home');
await p.click(`[data-qopen="${ID}"]`); await W(2500); await shot(p,'6-sg-open');
await p.click('[data-sgas="دکتر صادقی"]'); await W(400);
await p.click('[data-impedit="UR6"]'); await W(1200); await shot(p,'6-sg-impsheet');
console.log(await p.evaluate(()=>[...document.querySelectorAll('#imp_cat option')].map(o=>o.value+'='+o.textContent).join(' | ')));
const impPick = async (k, ci, d, l) => { await p.click(`[data-impedit="${k}"]`); await W(800); await p.selectOption('#imp_cat', ci); await W(300); console.log('dbg', await p.evaluate(()=>JSON.stringify({v:$('imp_cat').value,dS:$('imp_dS').hidden,dSo:$('imp_dS').options.length,par:$('imp_dS').closest('[hidden]')?.id||$('imp_dS').closest('[hidden]')?.className,d:$('imp_d').hidden}))); console.log('vis', await p.evaluate(()=>{const e=$('imp_dS');const r=e.getBoundingClientRect();return JSON.stringify({r:[r.x,r.y,r.width,r.height],disp:getComputedStyle(e).display,pd:getComputedStyle(e.parentElement).display,pcls:e.parentElement.outerHTML.slice(0,200)})}));
await p.evaluate(([d,l])=>{const S=$('imp_dS');S.value=d;S.dispatchEvent(new Event('change',{bubbles:true}));const L=$('imp_lS');L.value=l;L.dispatchEvent(new Event('change',{bubbles:true}))},[d,l]); await W(300); await p.click('[data-ht="heal"]'); await p.click('#impOk'); await W(600) };
await p.click('#impClose'); await W(300);
await impPick('UR6','0','4','10'); await impPick('LR6','0','4.5','11.5');
console.log('stock text', await p.evaluate(()=>JSON.stringify(SURG.imp)));
await p.click('[data-sgsec="ext"]').catch(()=>{}); await W(600);
console.log('ext open', await p.evaluate(()=>JSON.stringify(SURG.s.ext.sel)), await p.evaluate(()=>!!document.getElementById('m9Pen')));
await p.click('[data-m9pen="دکتر اکبرپور"]'); await W(200); console.log('pen', await p.evaluate(()=>JSON.stringify({pen:SURG.m9pen,asst:SURG.asst,sa:SURG.sa,btn:document.querySelector('[data-sid="ext"][data-k="LL7"]').outerHTML.slice(0,200),inSecs:!!document.querySelector('#surgSecs [data-sid="ext"][data-k="LL7"]')})));
{ const bb = await p.locator('#surgSecs [data-sid="ext"][data-k="LL7"]').boundingBox(); await p.mouse.click(bb.x+bb.width/2, bb.y+bb.height/2); await W(400) }
console.log('ext after', await p.evaluate(()=>JSON.stringify({sel:SURG.s.ext.sel,st:SURG.pl9st})));
await shot(p,'6-sg-filled'); { const st = await p.evaluate(()=>JSON.stringify({sel:SURG.s.ext.sel.LL7,who:(SURG.pl9st&&SURG.pl9st.ext||{}).LL7,crw:Object.values(SURG.s.crw.sel).some(Boolean)})); const j=JSON.parse(st); ok(j.sel===true && j.who==='دکتر اکبرپور','m10 pen re-assigns a plan tooth', st); ok(!j.crw,'m10 crown not pre-ticked on surgery day', st) }
await p.click('#sgSave'); await W(1500); await clickTxt(p,'#sgRev button','تأیید و ثبت'); await W(3000); await shot(p,'6-sg-saved');
console.log('msgs', await p.evaluate(()=>[...document.querySelectorAll('.msg,.toast,#toast')].filter(x=>x.offsetParent&&x.textContent.trim()).map(x=>x.textContent.trim().slice(0,200))));
r=sql(`select * from plans`); console.log('queue',r[0].queue, 'cols', Object.keys(r[0]).join(','), 'crw', JSON.stringify(JSON.parse(r[0].surg).sessions[0].s.crw.sel), 'tmp', JSON.stringify(JSON.parse(r[0].surg).sessions[0].s.tmp.sel));
ok(sql(`select count(*) n from inv_moves where type='use'`)[0].n>=2,'6 implants deducted from stock');
if (STEP >= 7) {
/* 7 staff after surgery: today's done list + book uncover */
p = await login(b, h, 'staff'); keep(p);
await p.evaluate(()=>goTile('sdone')); await W(1500); await shot(p,'7-st-sdone');
await p.fill('[data-fxsdin]','1001'); await p.click('[data-fxsdset]'); await W(1000);
await p.evaluate(()=>{window.__pr=[];printHTML=s=>{window.__pr.push(s)};const c=document.querySelector('[data-sdcare]');if(c&&!c.checked)c.click()});
await p.click('[data-sdall]'); await W(2000);
console.log('rx printed', await p.evaluate(()=>window.__pr.length), 'file', JSON.stringify(sql(`select json_extract(data,'$.h.file') f, queue from plans`)));
await shot(p,'7-st-discharged');
await p.keyboard.press('Escape'); await p.evaluate(()=>document.querySelectorAll('.sheet').forEach(x=>x.hidden=true));
await p.evaluate(()=>goTile('q')); await W(800);
await p.click('[data-rfab="book"]'); await W(1200); await shot(p,'7-st-bookform');
await p.click('[data-bkm="pr"]'); await W(1200); await shot(p,'7-st-bookpr');
await p.fill('#ap_q','رضا آزما'); await p.dispatchEvent('#ap_q','input'); await W(1500);
console.log('sugg', (await vis(p)).split('\n').filter(l=>/appick|apsel|data-ap[a-z]*=[0-9a-f]{8}/.test(l)).join('\n'));
const pk = await p.evaluate(()=>{const b=[...document.querySelectorAll('#apSheet button, [id^=ap] button')].find(x=>/رضا آزمایشی/.test(x.textContent));if(b){b.click();return b.outerHTML.slice(0,200)}return null}); console.log('pick',pk); await W(800);
await p.click('[data-apk="impr"]'); await p.click(`[data-apd="${TD}"]`); await p.evaluate(()=>{const s=$('ap_time');s.value='10:00';s.dispatchEvent(new Event('change',{bubbles:true}));const d=$('ap_doc');if(d.selectedIndex<1){d.selectedIndex=1;d.dispatchEvent(new Event('change',{bubbles:true}))}});
await p.click('#apSave'); await W(2000);
console.log('appts', JSON.stringify(sql(`select kind,day,time,plan from appts`)));
await p.evaluate(()=>goTile('pros')); await W(1500); await shot(p,'7-st-prostile');
await p.click('[data-apref]'); await W(2000); await shot(p,'7-st-prosref');
console.log('after ref', JSON.stringify(sql(`select kind,st,ref,refBy from appts where kind='impr' and time='10:00'`)), JSON.stringify(sql(`select queue from plans`)));
if (STEP >= 8) {
/* 8 prosthesis: impression by the doctor */
p = await login(b, h, 'surgery'); keep(p);
await p.evaluate(()=>goTile('pros')); await W(1800); await shot(p,'8-sg-pros');
await p.locator('[data-pmap]:visible').first().click(); await W(1500); await shot(p,'8-sg-pmap');
const sheet=()=>p.evaluate(()=>{const s=[...document.querySelectorAll('.sheet')].find(x=>!x.hidden);return s?s.id+' :: '+s.innerText.replace(/\n+/g,' | ').slice(0,1500):''});
await p.click('#pmSave'); await W(1500);
await p.locator('[data-l5]:visible').first().click(); await W(2000); await shot(p,'8-sg-l5');
console.log('L5', await sheet());
ok((await p.locator('[data-h9f="file"]').inputValue())==='1001','m10 lab sheet file number', await p.locator('[data-h9f="file"]').inputValue()); ok(await p.evaluate(()=>!!document.getElementById('m10Doc')),'m10 session doctor row'); await p.click('[data-m10doc="د. مرتضی پور"]');
console.log('type', await p.evaluate(()=>{const b=[...document.querySelectorAll('#pfSheet button, #pfSheet label')].find(x=>x.textContent.trim()==='قالب‌گیری ایمپلنت');if(!b)return null;b.click();return b.outerHTML.slice(0,160)})); await W(500);
const selv=async(f,i)=>p.evaluate(([f,i])=>{const s=document.querySelector(`[data-h9f="${f}"]`);s.selectedIndex=i;s.dispatchEvent(new Event('change',{bubbles:true}))},[f,i]);
await selv('doc',2); await selv('brand',1); await selv('asst',1); await selv('shade',2);
await p.click('[data-h9o="crown"][data-v="Zirconia"]'); await p.click('[data-h9o="itype"][data-v="پیچ شونده"]'); await p.click('[data-h9o="imat"][data-v="مونولیتیک"]'); await p.click('[data-h9o="imp"][data-v="رزین پیچ شونده"]'); await p.click('[data-lometh="open"]'); await p.click('[data-lofor="tryin"]');
await shot(p,'8-sg-l5filled');
await p.click('#l5Lab'); await W(1500);
/* m23: the surgery of this scenario is on the same day, so the page asks before it stores the impression */
{ const q = await p.evaluate(()=>{const s=document.getElementById('uxAskSh');return s&&!s.hidden?document.getElementById('uxAskT').textContent:''}); ok(/قالب‌گیری در روز جراحی/.test(q),'8 m23: same-day impression asks first'); if(q) await p.click('#uxAskOk'); }
await W(3000); await shot(p,'8-sg-l5sent');
console.log('after l5Lab msgs', await p.evaluate(()=>[...document.querySelectorAll('#pfSheet .msg, .toast')].map(x=>x.textContent.trim()).filter(Boolean)));console.log('labs', JSON.stringify(sql(`select * from labs`)).slice(0,800));
for (const t of ['lab_orders','lab4','l4_orders']) { try { console.log(t, JSON.stringify(sql(`select * from ${t}`)).slice(0,700)) } catch(e){} }
console.log('tables', sql(`select name from sqlite_master where type='table'`).map(x=>x.name).join(','));
ok(sql(`select count(*) n from labs`)[0].n===1,'8 impression session + lab order');
const LID = sql(`select id from labs`)[0].id;
if (STEP >= 9) {
/* 9 lab (m36: every step is referred to a person before it is done) */
await h.call('manager','userSave',{u:{name:'کارمند آزمایشی',role:'lab',pw:'lab-e2e-test1',lab:{depts:[]}}}); const M36U=((await h.call('lab','labDefs',{op:'get'})).staff.find(x=>x.name==='کارمند آزمایشی')||{}).id; ok(!!M36U,'m36 lab employee for referral');
p = await login(b, h, 'lab'); keep(p); await shot(p,'9-lab-home');
const labTxt=()=>p.evaluate(()=>{const s=[...document.querySelectorAll('.sheet,dialog,.modal,[role=dialog]')].filter(x=>!x.hidden&&x.offsetParent);return s.map(x=>(x.id||x.className)+' :: '+x.innerText.replace(/\n+/g,' | ').slice(0,900)).join(' ### ')});
await p.locator('[data-l2start]:visible').first().click(); await W(2000); await shot(p,'9-lab-start');
await p.evaluate(()=>{const s=$('l2wt');s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}));const d=$('l2des');if(d.options.length>1){d.selectedIndex=1;d.dispatchEvent(new Event('change',{bubbles:true}))}});
await p.click('#l2StOk'); await W(2000); console.log('after start', JSON.stringify(sql(`select st from labs`)));
for (let it=0; it<20; it++) { const o = await h.call('lab','labOrder',{lid:LID}); const st=(o.steps||[]).find(x=>!['done','skip'].includes(x.st)); if(!st) break; if(!st.asg) await h.call('lab','labStep',{lid:LID,sid:st.id,op:'assign',uid:M36U}); let q=await h.call('lab','labStep',{lid:LID,sid:st.id,op:'quick'}); if(!q.ok) { q=await h.call('lab','labStep',{lid:LID,sid:st.id,op:'accept'}); if(q.ok) q=await h.call('lab','labStep',{lid:LID,sid:st.id,op:'quick'}) } if(!q.ok){console.log('step stuck', st.st, st.name||st.id, JSON.stringify(q).slice(0,160)); break} }
console.log('steps', JSON.stringify((await h.call('lab','labOrder',{lid:LID})).steps.map(x=>x.st)));
{const j=await h.call('lab','labList',{}); console.log('labList', JSON.stringify(j).slice(0,300))} await p.evaluate(()=>pollLab(true)); await W(2500);
console.log('lab after steps', JSON.stringify(sql(`select st from labs`)), (await vis(p)).split('\n').filter(l=>/lid=|ارسال/.test(l)).join(' || '));
await shot(p,'9-lab-steps'); console.log('LB', await p.evaluate(()=>JSON.stringify({n:LB.items.length,it:LB.items.map(x=>({st:x.st,steps:(x.steps||[]).map(s=>s.st),del:(x.data||{}).del})),open:typeof L8_OPEN!=='undefined'&&L8_OPEN, rows:l6BRows().length})));
await p.locator('[data-l2send]:visible').first().click(); await W(1500); await shot(p,'9-lab-send');
await p.click('#uxAskOk'); await W(2000);
r=sql(`select st from labs`); ok(r[0].st==='ready','9 lab sent to clinic',r);
if (STEP >= 10) {
/* 10 clinic: try-in session, then final order */
p = await login(b, h, 'staff'); keep(p);
await p.evaluate(()=>goTile('pros')); await W(1500); await shot(p,'10-st-pros');
const book = async (kind, time) => { await p.evaluate(()=>goTile('pros')); await W(1200); await p.locator('[data-tbook]:visible').first().click(); await W(1500);
  console.log('book kinds', await p.evaluate(()=>[...document.querySelectorAll('[data-apk]')].filter(x=>x.offsetParent).map(x=>x.dataset.apk+(x.getAttribute('aria-pressed')==='true'?'*':'')).join(',')));
  await p.locator(`[data-apk="${kind}"]:visible`).first().click(); await p.click(`[data-apd="${TD}"]`); await p.evaluate(t=>{const s=$('ap_time');s.value=t;s.dispatchEvent(new Event('change',{bubbles:true}));const d=$('ap_doc');if(d.selectedIndex<1){d.selectedIndex=1;d.dispatchEvent(new Event('change',{bubbles:true}))}},time);
  await p.click('#apSave'); await W(1800); await p.evaluate(()=>goTile('pros')); await W(1500);
  await p.locator('[data-apref]:visible').first().click(); await W(1800) };
await book('rscr','11:00');
console.log('appts', JSON.stringify(sql(`select kind,day,time,st,ref from appts where day='${TD}'`)));
const doc = await login(b, h, 'surgery'); keep(doc);
const sheet2=()=>doc.evaluate(()=>[...document.querySelectorAll('#pfSheet .msg, .toast')].map(x=>x.textContent.trim()).filter(Boolean));
await doc.evaluate(()=>goTile('pros')); await W(1800);
await doc.locator('[data-l5]:visible').first().click(); await W(2000);
console.log('tryin stage', await doc.evaluate(()=>(document.querySelector('#pfSheet').innerText.match(/مرحله‌ی فعلی[^\n]*/)||[''])[0]));
await doc.evaluate(()=>{const b=[...document.querySelectorAll('#pfSheet [data-l5w]')].find(x=>x.textContent.trim()==='امتحان رزین پیچ‌شونده');b&&b.click()}); await W(500);
await shot(doc,'10-doc-tryin');
const labForm = async (pp, forK) => { await pp.evaluate(()=>{for(const [f,i] of [['doc',2],['brand',1],['asst',1],['shade',2]]){const s=document.querySelector(`#pfSheet [data-h9f="${f}"]`);if(s&&s.selectedIndex<1){s.selectedIndex=i;s.dispatchEvent(new Event('change',{bubbles:true}))}}});
  for (const [o,v] of [['crown','Zirconia'],['itype','پیچ شونده'],['imat','مونولیتیک'],['imp','رزین پیچ شونده']]) await pp.evaluate(([o,v])=>{const b=document.querySelector(`#pfSheet [data-h9o="${o}"][data-v="${v}"]`);if(b&&b.getAttribute('aria-pressed')!=='true')b.click()},[o,v]);
  await pp.click(`[data-lofor="${forK}"]`); await pp.click('[data-lometh="open"]').catch(()=>{}); await W(300); await pp.click('#l5Lab'); await W(3500) };
await doc.click('#pfSheet [data-l5r="ok"]'); await W(400); await labForm(doc,'deliv'); console.log('tryin msgs', await sheet2());
r=sql(`select id,st,json_extract(data,'$.for') f from labs order by created`); console.log('labs', JSON.stringify(r)); ok(r.length===2 && r[1].f==='deliv','10 try-in done + final order', r);
console.log('pros stage', JSON.stringify(JSON.parse(sql(`select pros from plans`)[0].pros).stage));
const LID2 = r[1] && r[1].id;
if (STEP >= 11) {
/* 11 lab final */
const lp = await login(b, h, 'lab'); keep(lp);
await lp.locator('[data-l2start]:visible').first().click(); await W(1500);
await lp.evaluate(()=>{const s=$('l2wt');s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}))}); await lp.click('#l2StOk'); await W(1800);
for (let it=0; it<20; it++) { const o = await h.call('lab','labOrder',{lid:LID2}); const st=(o.steps||[]).find(x=>!['done','skip'].includes(x.st)); if(!st) break; if(!st.asg) await h.call('lab','labStep',{lid:LID2,sid:st.id,op:'assign',uid:M36U}); let q=await h.call('lab','labStep',{lid:LID2,sid:st.id,op:'quick'}); if(!q.ok){console.log('stuck',JSON.stringify(q));break} }
await lp.evaluate(()=>pollLab(true)); await W(2000); await lp.locator('[data-l2send]:visible').first().click(); await W(1200); await lp.click('#uxAskOk'); await W(1800);
ok(sql(`select st from labs where id='${LID2}'`)[0].st==='ready','11 final sent to clinic');
/* 12 delivery */
await p.evaluate(()=>goTile('pros')); await W(1500); await book('deliv','12:00');
await doc.evaluate(()=>goTile('pros')); await W(1800); await doc.evaluate(()=>{document.querySelectorAll('.sheet').forEach(x=>x.hidden=true)});
await doc.evaluate(()=>pollQ&&pollQ(true)).catch(()=>{}); await W(1500);
await doc.locator('[data-l5]:visible').first().click(); await W(2000);
console.log('deliv stage', await doc.evaluate(()=>(document.querySelector('#pfSheet').innerText.match(/مرحله‌ی فعلی[^\n]*/)||[''])[0]));
await doc.evaluate(()=>{const b=[...document.querySelectorAll('#pfSheet [data-l5w]')].find(x=>x.textContent.trim()==='تحویل روکش');b&&b.click()}); await W(500);
await shot(doc,'12-doc-deliv');
console.log('cem', (await vis(doc)).split('\n').filter(l=>/cem|l5r/.test(l)).join(' || '));
await doc.evaluate(()=>{const b=document.querySelector('#pfSheet [data-pk4cem]');b&&b.click()}); await doc.click('#pfSheet [data-l5r="ok"]').catch(()=>{}); await W(300);
await doc.click('#l5Save'); await W(3000); console.log('deliv msgs', await sheet2());
await p.evaluate(()=>{goTile('q');pollQ(true)}); await W(2500); console.log('ST after block', (await vis(p)).split('\n').filter(l=>/\{[a-z]/.test(l)&&!/rfab|tile=q/.test(l)).slice(0,14).join(' || '));
await p.evaluate(()=>goTile('pros')); await W(1500); await p.evaluate(()=>pollQ(true)); await W(1500); console.log('ST pros', (await vis(p)).split('\n').filter(l=>/\{[a-z]/.test(l)&&!/rfab|raf=|fx2cv/.test(l)).join(' || ')); await shot(p,'12-st-pros'); await clickTxt(p,'button','بیشتر'); await W(800); console.log('MORE', (await vis(p)).split('\n').filter(l=>/\{[a-z]/.test(l)&&!/rfab|raf=|fx2cv|tile/.test(l)).slice(-14).join(' || '));
await p.evaluate(()=>{goTile('pros');pollQ(true)}); await W(2500); await shot(p,'12-st-pros-m10'); ok(await p.locator('[data-m10pp]:visible').count()>0,'m10 prosthesis payment button on delivery card'); await p.locator('[data-m10pp]:visible').first().click(); await W(1500); ok(await p.evaluate(()=>document.querySelector('#pcSheet [data-pl11pt="p"]').getAttribute('aria-pressed')==='true'),'m10 pros part preselected');
console.log('PCP', await p.evaluate(()=>$('pcSheet').innerText.replace(/\n+/g,' | ').slice(0,700)));
await p.click('[data-p4mode="full"]').catch(()=>{}); await p.click('[data-pcpos="cash"]'); await W(300);
{ const n = await p.evaluate(()=>document.querySelectorAll('[data-pcno]').length); if (n) { await p.click('[data-pcct="sayad"]'); await p.click('[data-pcpe="سید مجتبی علویکیا"]'); for (let i=0;i<n;i++) await p.fill(`[data-pcno="${i}"]`,'9900'+i) } }
await p.click('#pcSave'); await W(2500); console.log('pcp msg', await p.evaluate(()=>$('pcMsg').textContent));
console.log('pays', JSON.stringify(sql(`select kind,part,amount,due,st from pays`)));
await doc.evaluate(()=>{document.querySelectorAll('.sheet').forEach(x=>x.hidden=true)}); await doc.locator('[data-l5]:visible').first().click(); await W(2000);
await doc.evaluate(()=>{const b=[...document.querySelectorAll('#pfSheet [data-l5w]')].find(x=>x.textContent.trim()==='تحویل روکش');b&&b.click()}); await W(400);
await doc.click('#l5Save'); await W(3000); console.log('deliv msgs2', await sheet2());
const PR = JSON.parse(sql(`select pros from plans`)[0].pros); console.log('tasks', JSON.stringify(sql(`select kind,due,done,note,by from tasks`)).slice(0,1500)); console.log('final stage', PR.stage, 'sess', PR.sess.map(x=>x.ty+':'+(x.res||'')).join(','));
ok(PR.sess.some(x=>x.ty==='deliv'), '12 crown delivered', PR.stage);
console.log('labs', JSON.stringify(sql(`select st,json_extract(data,'$.for') f from labs`)), 'plan', JSON.stringify(sql(`select queue,status from plans`)));
console.log('appts', JSON.stringify(sql(`select kind,day,time,st from appts`)));
{ const m = await h.call('manager','m1Rep',{from:'2026-11-01',to:'2026-11-30'}); console.log('M1 rcv', JSON.stringify(m.rcv||m.recv||{}).slice(0,400)); console.log('M1 docs', JSON.stringify(m.docs||{}).slice(0,1500)); console.log('M1 debt', JSON.stringify(m.debt||{}).slice(0,400)); console.log('M1 imp', JSON.stringify(m.imp||{}).slice(0,500)); console.log('M1 pl', JSON.stringify(m.pl||{}).slice(0,400)); }
{ const f = await h.call('accountant','finSuggest',{id:ID}); console.log('finSuggest', JSON.stringify(f.lines.map(l=>l.name+':'+l.payee))); ok(f.lines.filter(l=>/#pk4/.test(l.why)).every(l=>l.payee==='py11'),'m10 prosthesis shares to the session doctor', f.lines.map(l=>l.payee).join(',')); console.log('sess by', JSON.stringify(JSON.parse(sql(`select pros from plans`)[0].pros).sess.map(x=>[x.ty,x.by,x.doc,x.dn]))); }
}
}
for (const sec of []) { await p.click(`[data-l5sec="${sec}"]`); await W(1500); console.log('SEC',sec, await p.evaluate(()=>document.querySelector('#viewLab, main')?.innerText.match(/رضا آزمایشی[^\n]*/g)), (await vis(p)).split('\n').filter(l=>/lid=|l2|send|ارسال/.test(l)).slice(0,10).join(' || ')); await shot(p,'9-lab-'+sec.replace('/','-')) }
}
}
for (const t of []) { await p.evaluate(t=>goTile(t),t); await W(1200); console.log('TILE',t, (await p.evaluate(()=>document.querySelector('main, #app, body').innerText.split('\n').filter(x=>x.trim()).slice(0,0).join('|'))), (await vis(p)).split('\n').filter(l=>/data|\{[a-z]/.test(l)).slice(6,25).join('\n')) }
}
console.log('moves', JSON.stringify(sql(`select m.type,m.delta,i.b,i.d,i.l from inv_moves m join inv_items i on i.id=m.item where m.type!='in'`)));
} catch (e) { if (e !== 'stop') { console.log('ERR', e); bad++ } }
for (const p of ALL) if (p.E.length) { console.log('ERRORS', p.E); bad++ }
console.log(bad ? 'FAILED ' + bad : 'ALL OK'); await b.close(); await h.stop(); process.exit(0);
