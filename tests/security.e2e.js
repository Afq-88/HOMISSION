/* اختبار شامل لطبقة الحماية في الواجهة والترويسات. تشغيل:  node tests/security.e2e.js  (يحتاج playwright) */
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'), cfg=JSON.parse(fs.readFileSync(root+'/firebase.json','utf8')).hosting;
const hdr=cfg.headers.find(h=>h.source==='**').headers;
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(root,u);
 const hidden=/^\/(src|tools|tests|worker|docs|\.git)\//.test(u)||/^\/(README|WALLET|FIREBASE)\.txt$|firestore\.rules$/.test(u);
 if(hidden||!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('nf')}
 const h={'Content-Type':mime[path.extname(f)]||'application/octet-stream'};hdr.forEach(x=>h[x.key]=x.value);r.writeHead(200,h);r.end(fs.readFileSync(f));}).listen(0);
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
(async()=>{const port=srv.address().port,b=await chromium.launch({args:['--host-resolver-rules=MAP kptc.test 127.0.0.1']});
 const base=`http://kptc.test:${port}`;
 // --- hidden files
 for(const f of['/README.txt','/src/store.js','/firestore.rules','/worker/wallet-worker.js','/tests/firestore.rules.test.js']){const r=await fetch(`http://127.0.0.1:${port}${f}`);ok(r.status===404,`not served: ${f}`)}
 // --- CSP violations on key pages
 const ctx=await b.newContext();const viol=[];
 for(const pg of['index.html','pages/home.html','pages/routes.html','pages/portal.html','pages/siteadmin.html','pages/account.html','pages/org.html','pages/media.html']){
  const p=await ctx.newPage();p.on('console',m=>{const t=m.text();if(/Content Security Policy|Refused to/.test(t)&&!/translate|fonts|tile\.openstreetmap|workers\.dev/.test(t))viol.push(pg+': '+t.slice(0,160))});
  p.on('pageerror',e=>viol.push(pg+' ERR '+e.message.slice(0,100)));await p.route(/^https?:\/\/(?!kptc\.test)/,r=>r.abort());await p.goto(`${base}/${pg}`);await p.waitForTimeout(500);await p.close()}
 ok(viol.length===0,'no CSP violations / errors on 8 pages '+JSON.stringify(viol.slice(0,4)));
 // --- production host: demo shortcuts hidden
 const p=await ctx.newPage();await p.route(/^https?:\/\/(?!kptc\.test)/,r=>r.abort());await p.goto(`${base}/pages/siteadmin.html`);await p.waitForTimeout(400);
 ok(await p.evaluate(()=>KPTC.DEMO)===false,'DEMO=false on a real hostname');
 ok(await p.evaluate(()=>!document.getElementById('gD').textContent.includes('12345678')),'no demo credentials on gate');
 ok(await p.evaluate(()=>!/"pass":"/.test(localStorage.getItem('kptc.db.v2')||'')) ,'no plaintext "pass" in storage');
 // --- login flow: default password forces change
 let r=await p.evaluate(()=>KPTC.staffLogin('KPTC-0001','12345678'));ok(r.mustChange===true,'default password => mustChange');
 await p.waitForSelector('.kps',{timeout:3000});ok(true,'forced change dialog shown');
 await p.fill('.kps input[name=o]','12345678');await p.fill('.kps input[name=n]','short1');await p.fill('.kps input[name=c]','short1');await p.click('.kps button.p');
 ok((await p.textContent('.kps .e')).includes('قصيرة'),'weak password rejected');
 await p.fill('.kps input[name=n]','Kptc#Secure2026');await p.fill('.kps input[name=c]','Kptc#Secure2026');await p.click('.kps button.p');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.querySelector('.kps')),'dialog closes after valid change');
 ok(await p.evaluate(()=>{KPTC.staffLogout();return !KPTC.staffLogin('KPTC-0001','12345678').user&&!!KPTC.staffLogin('KPTC-0001','Kptc#Secure2026').user}),'old password dead, new works');
 // --- lockout, same for unknown names
 const lk=await p.evaluate(()=>{KPTC.staffLogout();const o=[];for(let i=0;i<6;i++)o.push(KPTC.staffLogin('KPTC-1001','bad'+i));const u=[];for(let i=0;i<6;i++)u.push(KPTC.staffLogin('NOPE-1','bad'+i));return{a:o[5],b:u[5],e1:o[0].error,e2:u[0].error}});
 ok(lk.a.locked&&lk.b.locked,'lock after 5 failures, also for unknown ids');ok(lk.e1===lk.e2,'identical error for existing and unknown account');
 // --- audit chain
 ok(await p.evaluate(()=>KPTC.verifyLog().ok),'audit chain verifies');
 ok(await p.evaluate(()=>{const d=KPTC.db();d.log[2].msg='tampered';return !KPTC.verifyLog().ok}),'tampering detected');
 // --- step-up
 await p.evaluate(()=>{KPTC.reset();KPTC.staffLogout();});await p.reload();await p.waitForTimeout(300);
 await p.evaluate(()=>{const d=KPTC.db();KPTC.setPass(d.staff['KPTC-0001'],'Kptc#Secure2026');KPTC.save();KPTC.staffLogin('KPTC-0001','Kptc#Secure2026');sessionStorage.removeItem('kptc.sec.step');
  window.__hit=0;const b=document.createElement('button');b.setAttribute('data-act','wadd');b.id='probe';document.body.appendChild(b);document.addEventListener('click',e=>{if(e.target.id==='probe')window.__hit++});});
 await p.evaluate(()=>document.getElementById('probe').click());await p.waitForSelector('.kps');ok(await p.evaluate(()=>__hit)===0,'sensitive click blocked pending password');
 await p.fill('.kps input[name=p]','wrong');await p.click('.kps button.p');ok((await p.textContent('.kps .e')).includes('غير صحيحة'),'wrong password refused');
 await p.fill('.kps input[name=p]','Kptc#Secure2026');await p.click('.kps button.p');await p.waitForTimeout(300);ok(await p.evaluate(()=>__hit)===1,'action runs after re-auth');
 await p.evaluate(()=>document.getElementById('probe').click());await p.waitForTimeout(150);ok(await p.evaluate(()=>__hit)===2&&await p.evaluate(()=>!document.querySelector('.kps')),'no prompt within 5 min window');
 await b.close();srv.close();})();
