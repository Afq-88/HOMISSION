/* KPTC — عناصر البوابة الداخلية القائمة: التعاميم، أوقات الصلاة، القرارات، الروابط، الصحف، التقويم، الدعم الفني، مركز المعلومات */
(function(){
  'use strict';
  var K = window.KPTC; if (!K || !K.staffUser || !document.getElementById('view-dashboard')) return;
  function $(id){ return document.getElementById(id); }
  function el(tag, cls, html){ var d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
  function toast(t){ try { showToast(t); } catch(e){} }
  var E = K.esc, P2 = function(n){ return (n < 10 ? '0' : '') + n; }, hm = function(m){ return P2(Math.floor(m / 60) % 24) + ':' + P2(m % 60); };
  function nameOf(id){ var u = K.db().staff[id]; return u ? u.name : id; }

  var LINKS = [['موقع شركة النقل العام الكويتية','http://www.kptc.com.kw/'],['بوابة الكويت الرسمية','https://www.e.gov.kw/'],['القرآن الكريم (صوتي)','http://www.tvquran.com/'],['القرآن الكريم (قراءة)','http://v2.quranflash.com/quranflash.html'],['متابعة حركة الطيران','https://www.kuwaitairport.gov.kw/ar/flights-info'],['الهيئة العامة للمعلومات المدنية','https://www.paci.gov.kw/']];
  var PAPERS = [['وكالة الأنباء الكويتية (كونا)','https://www.kuna.net.kw/'],['الراي','https://www.alraimedia.com/'],['الوطن','https://alwatan.kuwait.tt/'],['Kuwait Times','https://kuwaittimes.com/'],['السياسة','https://alseyassah.com/'],['القبس','https://www.alqabas.com/'],['الأنباء','http://www.alanba.com.kw/newspaper']];
  var TONE = {indigo:['#2E2C78','#fff'], yellow:['#FFC93C','#14133A'], green:['#1E7F55','#fff'], red:['#C2352E','#fff']};

  var css = document.createElement('style');
  css.textContent = [
  /* calmer dashboard: hide the old banner (kept for its clock ids), soften the tiles, turn quick actions into pills */
  '#view-dashboard .welcome-banner{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);padding:0!important;margin:0!important;border:0!important}',
  '#view-dashboard{max-width:1180px;margin-inline:auto;width:100%;box-sizing:border-box}',
  '.in-hero{margin-bottom:14px}',
  '.in-hero-in{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,440px);gap:20px;align-items:center;border-radius:18px;padding:26px 30px 18px;color:#fff;overflow:hidden;background:linear-gradient(135deg,#2E2C78 0,#3d3a9c 100%);transition:background 1s}',
  '.in-hero-in.night{background:linear-gradient(135deg,#0d0c27 0,#23215f 100%)}.in-hero-in.dawn{background:linear-gradient(135deg,#2E2C78 0,#7a5aa6 70%,#e8a44c 130%)}.in-hero-in.dusk{background:linear-gradient(135deg,#23215f 0,#5b4a9e 60%,#d98a3a 125%)}',
  '.in-hero-in::before{content:"";position:absolute;inset:0;background:radial-gradient(40% 70% at 12% 100%,rgba(255,201,60,.22),transparent 70%),repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 44px);pointer-events:none}',
  '.in-hi{position:relative}.in-hi small{font-size:12.5px;color:#C9C7EA}.in-hi h2{font:700 clamp(28px,3.6vw,42px)/1.3 var(--f-display);color:#fff;margin:8px 0 2px}.in-hi p{margin:0;color:#DAD9F0;font-size:14px}',
  '.in-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.in-chips button{border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;border-radius:22px;padding:6px 14px;font:600 12.5px var(--f-body);cursor:pointer;transition:.2s}.in-chips button:hover{background:var(--kp-sign);color:var(--kp-ink);border-color:var(--kp-sign)}.in-chips b{color:var(--kp-sign);font-family:var(--f-display)}.in-chips button:hover b{color:var(--kp-ink)}',
  '.in-arc{position:relative}.in-arc svg{display:block;width:100%;height:auto;overflow:visible;direction:ltr}',
  '.in-arc .tr{fill:none;stroke:rgba(255,255,255,.2);stroke-width:3;stroke-dasharray:2 7;stroke-linecap:round}.in-arc .dn{fill:none;stroke:#FFC93C;stroke-width:4;stroke-linecap:round}',
  '.in-arc circle{fill:#2E2C78;stroke:rgba(255,255,255,.55);stroke-width:2.5}.in-arc circle.ps{fill:#FFC93C;stroke:#FFC93C}.in-arc circle.nx{fill:#fff;stroke:#FFC93C;stroke-width:4;animation:in-pulse 1.8s ease-in-out infinite}',
  '@keyframes in-pulse{50%{stroke-width:9;stroke-opacity:.35}}',
  '.in-arc circle.sun{fill:#FFC93C;stroke:none;filter:drop-shadow(0 0 10px rgba(255,201,60,.9))}.in-arc .moon{fill:#E8E7F5;opacity:.85}',
  '.in-arc text{text-anchor:middle;fill:#C9C7EA;font:600 11px var(--f-body)}.in-arc text.t{font:700 11.5px var(--f-display);fill:#fff}.in-arc text.nx{fill:#FFC93C}',
  '.in-now{position:absolute;inset:auto 0 6px 0;text-align:center;display:grid;gap:0}.in-now b{font:700 clamp(26px,3vw,34px) ui-monospace,Menlo,monospace;color:#fff;direction:ltr;letter-spacing:1px}.in-now span{font-size:12.5px;color:#FFC93C;font-weight:600}',
  '.in-sl{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;background:#fff;border:1.5px solid var(--border,#dcdaea);border-inline-start:6px solid var(--bg);border-radius:12px;padding:8px 14px;margin-bottom:16px}',
  '.in-sl-k{font:700 11.5px var(--f-display);background:var(--bg);color:var(--fg);border-radius:14px;padding:3px 12px;white-space:nowrap}.in-sl-k b{opacity:.75;font-weight:600;margin-inline-start:4px}',
  '.in-sl-t{all:unset;cursor:pointer;display:flex;gap:10px;align-items:baseline;min-width:0;animation:in-up .45s both}.in-sl-t b{font:700 14.5px var(--f-display);color:var(--kp-ink);white-space:nowrap}.in-sl-t span{font-size:13px;color:var(--kp-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '@keyframes in-up{from{opacity:0;translate:0 8px}}',
  '.in-sl-n{display:flex;gap:4px}.in-sl-n button{border:1.5px solid var(--kp-line-2,#cfcde6);background:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;color:var(--kp-ink);font-size:12px}.in-sl-n button:hover{background:var(--kp-sign);border-color:var(--kp-ink)}',
  '#view-dashboard .pt-strip{border-width:1.5px;border-color:var(--border,#dcdaea);box-shadow:none;border-radius:12px;margin-bottom:16px}',
  '#view-dashboard .kpi-grid{gap:12px;margin-bottom:14px}#view-dashboard .kpi-card{border-radius:14px!important;border-width:1.5px!important;padding:16px!important;transition:translate .2s,box-shadow .2s}#view-dashboard .kpi-card:hover{translate:0 -3px;box-shadow:0 10px 24px -14px rgba(20,19,58,.45)}',
  '#view-dashboard .kpi-icon{border-radius:12px!important}',
  '.in-qat{display:none!important}',
  '#view-dashboard .quick-actions{display:flex!important;flex-wrap:wrap;gap:8px!important;margin-bottom:20px!important}',
  '#view-dashboard .quick-actions .qa-card{display:flex!important;align-items:center;gap:8px;padding:8px 16px!important;border-radius:24px!important;border-width:1.5px!important;text-align:start!important;background:#fff}',
  '#view-dashboard .quick-actions .qa-card:hover{background:var(--kp-ink)!important;border-color:var(--kp-ink)!important}#view-dashboard .quick-actions .qa-card:hover .qa-name{color:var(--kp-sign)!important}#view-dashboard .quick-actions .qa-card:hover .ki{color:var(--kp-sign)}',
  '#view-dashboard .quick-actions .qa-icon{font-size:1rem!important;margin:0!important;display:inline-flex}#view-dashboard .quick-actions .qa-icon .ki{width:17px;height:17px}#view-dashboard .quick-actions .qa-name{font-size:.82rem!important;margin:0!important}#view-dashboard .quick-actions .qa-desc{display:none!important}',
  '.in-tabs{border-radius:16px!important}',
  '.in-tb{display:flex;gap:4px;padding:8px 10px 0;border-bottom:1.5px solid var(--border,#dcdaea);overflow-x:auto}',
  '.in-tb button{border:0;background:none;padding:10px 16px;font:700 13.5px var(--f-display);color:var(--kp-muted);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-1.5px;white-space:nowrap;transition:color .2s}.in-tb button.on{color:var(--kp-ink);border-bottom-color:var(--kp-sign)}.in-tb button:hover{color:var(--kp-ink)}',
  '.in-pn{display:none;animation:in-up .35s both}.in-pn.on{display:block}',
  '.in-pn .in-card{border:0!important;margin:0!important;border-radius:0!important}.in-pn .in-h{border:0;padding-bottom:4px}',
  '.in-flat{border:0!important;border-radius:0!important}.in-flat .widget-head{border:0!important}',
  '.in-2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}.in-2 .in-card{border-radius:16px}',
  '.in-card{background:#fff;border:1.5px solid var(--border,#dcdaea);border-radius:10px;overflow:hidden;margin-bottom:18px}',
  '.in-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;border-bottom:1.5px solid var(--border,#dcdaea)}.in-h b{font:700 15.5px var(--f-display);color:var(--kp-ink)}',
  '.in-h input,.in-h select{border:1.5px solid var(--kp-line-2,#cfcde6);border-radius:6px;padding:6px 10px;font:500 13px var(--f-body);background:#fff}',
  '.in-t{width:100%;border-collapse:collapse;font-size:13.5px}.in-t th{text-align:right;font:700 12px var(--f-display);color:var(--kp-muted);padding:9px 14px;background:var(--kp-paper-2,#f6f3ea)}.in-t td{padding:10px 14px;border-top:1px solid var(--border,#eceaf4)}',
  '.in-t tr{cursor:pointer;transition:background .15s}.in-t tbody tr:hover{background:#FFF8E1}.in-t td:first-child{font:700 13px ui-monospace,Menlo,monospace;color:var(--kp-indigo);direction:ltr;text-align:right;white-space:nowrap}',
  '.in-pg{display:flex;gap:6px;justify-content:center;align-items:center;padding:10px;flex-wrap:wrap}.in-pg button{border:1.5px solid var(--kp-line-2,#cfcde6);background:#fff;border-radius:5px;min-width:34px;height:32px;padding:0 10px;font:700 12.5px var(--f-display);cursor:pointer;color:var(--kp-ink)}.in-pg button.on{background:var(--kp-ink);color:var(--kp-sign);border-color:var(--kp-ink)}.in-pg button[disabled]{opacity:.4;cursor:default}',
  '.in-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}',
  '.in-l{display:grid;padding:6px 0}.in-l a{display:flex;justify-content:space-between;gap:10px;padding:9px 16px;text-decoration:none;color:var(--kp-ink);font-size:13.5px;font-weight:600;border-top:1px solid var(--border,#eceaf4);transition:background .15s,padding .15s}.in-l a:first-child{border:0}.in-l a:hover{background:#FFF8E1;padding-inline-start:22px}.in-l a::after{content:"↗";color:var(--kp-muted)}',
  '.in-rail{background:#fff;border:1.5px solid var(--border,#dcdaea);border-radius:16px;padding:12px 14px 14px;margin-bottom:16px}',
  '.in-rail-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.in-rail-h b{font:700 15px var(--f-display);color:var(--kp-ink)}.in-rail-h span{font:700 11.5px var(--f-display);background:#C2352E;color:#fff;border-radius:12px;padding:2px 10px}.in-rail-h span.ok{background:#E3F3EB;color:#1E7F55}',
  '.in-rail-s{display:flex;gap:18px;overflow-x:auto;padding:10px 8px 4px;scrollbar-width:thin}',
  '.in-pc{all:unset;cursor:pointer;flex:0 0 132px;display:grid;gap:7px;animation:in-up .45s calc(var(--i)*.07s) both}',
  '.in-pc>img,.in-pc>.in-po{width:132px;height:176px;border-radius:14px;object-fit:cover;display:grid;box-sizing:border-box;box-shadow:0 0 0 3px #fff,0 0 0 6px var(--kp-sign);transition:translate .25s var(--kp-ease),rotate .25s,box-shadow .25s}',
  '.in-pc.must>img,.in-pc.must>.in-po{box-shadow:0 0 0 3px #fff,0 0 0 6px #C2352E}',
  '.in-pc.seen>img,.in-pc.seen>.in-po{box-shadow:0 0 0 3px #fff,0 0 0 5px var(--kp-line-2,#cfcde6);filter:saturate(.75)}',
  '.in-pc:not(.seen):not(.must)>img,.in-pc:not(.seen):not(.must)>.in-po{animation:in-ring 2.4s ease-in-out infinite}@keyframes in-ring{50%{box-shadow:0 0 0 3px #fff,0 0 0 9px rgba(255,201,60,.55)}}',
  '.in-pc:hover>img,.in-pc:hover>.in-po{translate:0 -6px;rotate:-2deg}',
  '.in-pc>span{font:700 12px/1.5 var(--f-display);color:var(--kp-ink);text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:4px}',
  '.in-po{display:grid;position:relative;background:var(--bg);color:var(--fg);padding:14px 12px;align-content:end;gap:4px;overflow:hidden;text-align:start}',
  '.in-po i{position:absolute;top:-30%;left:-30%;width:120%;aspect-ratio:1;border-radius:50%;border:22px solid currentColor;opacity:.12}',
  '.in-po small{font:700 10px var(--f-display);opacity:.8;position:relative}.in-po b{font:700 14px/1.5 var(--f-display);position:relative}',
  '.in-vw{position:fixed;inset:0;z-index:9500;background:rgba(11,10,34,.94);display:grid;place-items:center;padding:14px;animation:kp-fade .25s both}@keyframes kp-fade{from{opacity:0}}',
  '.in-vw-in{position:relative;width:min(460px,100%);display:grid;gap:12px;justify-items:center;animation:in-pop .4s cubic-bezier(.3,1.4,.5,1) both}@keyframes in-pop{from{scale:.86;opacity:0}}',
  '.in-vw-p{display:flex;gap:5px;width:100%}.in-vw-p i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.25)}.in-vw-p i.done{background:#fff}.in-vw-p i.on{background:var(--kp-sign)}',
  '.in-vw-x{position:absolute;top:26px;left:10px;z-index:2;width:36px;height:36px;border-radius:50%;border:0;background:rgba(11,10,34,.6);color:#fff;font-size:20px;cursor:pointer}',
  '.in-vw-b{width:100%;border-radius:22px;overflow:hidden;max-height:66vh;display:grid;background:#000}.in-vw-b img{width:100%;max-height:66vh;object-fit:contain;display:block}',
  '.in-vw-b .in-po{min-height:min(60vh,520px);padding:34px 28px;gap:10px}.in-vw-b .in-po small{font-size:13px}.in-vw-b .in-po b{font-size:clamp(26px,5vw,36px);line-height:1.45}.in-vw-b .in-po p{margin:0;font-size:16px;line-height:2;position:relative}.in-vw-b .in-po em{font-style:normal;font-size:12px;opacity:.75;margin-top:10px;position:relative}',
  '.in-vw-c{color:#fff;text-align:center;display:grid;gap:2px}.in-vw-c b{font:700 16px var(--f-display)}.in-vw-c span{font-size:13.5px;color:#C9C7EA}',
  '.in-vw-a{display:grid;grid-template-columns:auto 1fr auto;gap:10px;width:100%}.in-vw-a button{border:2px solid rgba(255,255,255,.5);background:none;color:#fff;border-radius:26px;height:46px;min-width:46px;font:700 15px var(--f-display);cursor:pointer}.in-vw-a button[disabled]{opacity:.25;cursor:default}',
  '.in-vw-a .ack{background:var(--kp-sign);color:var(--kp-ink);border-color:var(--kp-sign)}.in-vw-a .ack.done{background:#1E7F55;border-color:#1E7F55;color:#fff}',
  '.in-vw-s{color:#C9C7EA;font-size:12px}',
  '.in-dk{border-radius:16px!important;overflow:visible!important}.in-dk-g{display:grid;grid-template-columns:190px minmax(0,1fr);gap:20px;padding:20px}',
  '.in-pad{display:grid;gap:10px;align-content:start;justify-items:center}',
  '.in-pad-r{display:flex;gap:22px;margin-bottom:-18px;position:relative;z-index:2}.in-pad-r i{width:9px;height:26px;border-radius:5px;background:linear-gradient(180deg,#8f8dc0,#14133A)}',
  '.in-page{width:176px;background:#fff;border:2px solid var(--kp-ink);border-radius:12px;box-shadow:0 5px 0 #fff,0 7px 0 var(--kp-ink),0 12px 0 #fff,0 14px 0 var(--kp-ink);text-align:center;overflow:hidden;display:grid;transform-origin:top center}',
  '.in-page.fwd{animation:in-flip .5s cubic-bezier(.3,1.3,.5,1) both}.in-page.back{animation:in-flipb .5s cubic-bezier(.3,1.3,.5,1) both}@keyframes in-flip{from{transform:perspective(600px) rotateX(-80deg);opacity:.2}}@keyframes in-flipb{from{transform:perspective(600px) rotateX(60deg) translateY(-10px);opacity:.2}}',
  '.in-page small{background:#C2352E;color:#fff;font:700 14px var(--f-display);padding:16px 6px 7px}.in-page b{font:700 76px/1.15 var(--f-display);color:var(--kp-ink)}.in-page span{font:700 13px var(--f-display);color:var(--kp-indigo)}.in-page em{font-style:normal;font-size:11.5px;color:var(--kp-muted);padding:2px 6px 12px}',
  '.in-pad-n{display:flex;gap:6px;margin-top:16px}.in-pad-n button{border:1.5px solid var(--kp-line-2,#cfcde6);background:#fff;border-radius:18px;height:30px;min-width:30px;padding:0 10px;font:700 12px var(--f-display);cursor:pointer;color:var(--kp-ink)}.in-pad-n button:hover{background:var(--kp-sign);border-color:var(--kp-ink)}',
  '.in-pad-e{display:grid;gap:5px;width:100%}.in-pad-e span{font-size:12.5px;font-weight:600;background:#FFF8E1;border-inline-start:4px solid var(--kp-sign);border-radius:4px;padding:5px 9px;color:var(--kp-ink)}.in-pad-e .no,.in-up .no{background:none;border:0;color:var(--kp-muted);font-weight:500;text-align:center;font-size:12px}',
  '.in-mo-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.in-mo-h b{font:700 16px var(--f-display);color:var(--kp-ink)}.in-mo-h button{border:1.5px solid var(--kp-line-2,#cfcde6);background:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;margin-inline-start:4px}',
  '.in-cg{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;justify-items:center}.in-cg small{font:600 10.5px var(--f-body);color:var(--kp-muted);padding-bottom:2px}.in-cg small.we{color:#C2352E}',
  '.in-cg button{position:relative;width:34px;height:34px;border-radius:50%;border:0;background:var(--kp-paper-2,#f6f3ea);font:600 12.5px var(--f-body);color:var(--kp-ink);cursor:pointer;transition:scale .15s,background .15s}.in-cg button:hover{scale:1.18;background:#fff;box-shadow:0 0 0 2px var(--kp-ink)}',
  '.in-cg button.past{background:none;color:#a9a7c0}.in-cg button.we{color:#C2352E}.in-cg button.ev{background:var(--kp-sign);color:var(--kp-ink);font-weight:700}.in-cg button.ev.past{background:#F6E7B5}',
  '.in-cg button.td{background:var(--kp-ink);color:var(--kp-sign);font-weight:700}.in-cg button.td.ev::after{content:"";position:absolute;top:-2px;left:-2px;width:10px;height:10px;border-radius:50%;background:var(--kp-sign);border:2px solid #fff}.in-cg button.sel{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--kp-ink)}',
  '.in-up{display:grid;gap:6px;margin-top:14px;border-top:1px dashed var(--kp-line-2,#cfcde6);padding-top:12px}.in-up>b{font:700 12.5px var(--f-display);color:var(--kp-muted)}',
  '.in-up button{all:unset;cursor:pointer;display:grid;grid-template-columns:86px 1fr;gap:10px;align-items:center;font-size:13px;font-weight:600;color:var(--kp-ink);padding:4px 0}.in-up button i{font:700 11.5px var(--f-display);font-style:normal;background:var(--kp-ink);color:var(--kp-sign);border-radius:12px;padding:2px 8px;text-align:center}.in-up button:hover span{color:var(--kp-indigo)}',
  '.in-2{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)!important}',
  '@media(max-width:640px){.in-dk-g{grid-template-columns:1fr}.in-cg button{width:32px;height:32px}}',
  '.in-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px}.in-form label{display:grid;gap:4px;font-size:.78rem;font-weight:700;color:var(--kp-ink)}.in-form .full{grid-column:1/-1}',
  '.in-form input,.in-form select,.in-form textarea{border:1.5px solid var(--kp-line-2,#cfcde6);border-radius:6px;padding:9px 10px;font:500 14px var(--f-body);background:#fff}',
  '.in-tk{padding:12px 16px;border-top:1px solid var(--border,#eceaf4);display:grid;gap:5px;font-size:13.5px}.in-tk .r{border-inline-start:3px solid var(--kp-sign);padding-inline-start:10px;font-size:13px}',
  '.in-st{font:700 11.5px var(--f-display);border-radius:3px;padding:1px 8px;background:#FBEFD9;color:#8A5407}.in-st.ok{background:#E3F3EB;color:#1E7F55}.in-st.in{background:#E4E3F5;color:#2E2C78}',
  '.in-lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;padding:16px}.in-lib div{border:1.5px solid var(--kp-line-2,#cfcde6);border-radius:8px;padding:14px;display:grid;gap:6px;border-inline-start:6px solid var(--kp-indigo)}.in-lib small{color:var(--kp-muted)}',
  '.in-doc{font-size:14.5px;line-height:2}.in-doc dl{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0 0 12px;font-size:13.5px}.in-doc dt{color:var(--kp-muted)}.in-doc dd{margin:0;font-weight:700}',
  '@media(max-width:1000px){.in-2,.in-hero-in{grid-template-columns:1fr}.in-form{grid-template-columns:1fr}.in-sl-t span{display:none}.in-hero-in{padding:20px 18px 14px}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---- prayer times for Kuwait City (astronomical calculation, Fajr 18°, Isha 17.5°) ---- */
  function prayers(date){
    var lat = 29.3759, lng = 47.9774, tz = 3, R = Math.PI / 180, sin = function(d){ return Math.sin(d * R); }, cos = function(d){ return Math.cos(d * R); }, tan = function(d){ return Math.tan(d * R); }, asin = function(x){ return Math.asin(x) / R; }, acos = function(x){ return Math.acos(x) / R; }, atan2 = function(y, x){ return Math.atan2(y, x) / R; };
    var fix = function(a, m){ a = a - m * Math.floor(a / m); return a < 0 ? a + m : a; };
    var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate(); if (m <= 2){ y -= 1; m += 12; } var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    var jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 - lng / 360;
    function sun(t){ var D = jd + t - 2451545, g = fix(357.529 + .98560028 * D, 360), q = fix(280.459 + .98564736 * D, 360), L = fix(q + 1.915 * sin(g) + .02 * sin(2 * g), 360), e = 23.439 - .00000036 * D; return {decl:asin(sin(e) * sin(L)), eqt:q / 15 - fix(atan2(cos(e) * sin(L), cos(L)) / 15, 24)}; }
    function mid(t){ return fix(12 - sun(t).eqt, 24); }
    function at(angle, t, ccw){ var dc = sun(t).decl, T = acos((-sin(angle) - sin(dc) * sin(lat)) / (cos(dc) * cos(lat))) / 15; return mid(t) + (ccw ? -T : T); }
    var dcA = sun(13 / 24).decl, asr = at(-Math.atan(1 / (1 + tan(Math.abs(lat - dcA)))) / R, 13 / 24), off = tz - lng / 15;
    var o = [['الفجر', at(18, 5 / 24, true), 2], ['الشروق', at(.833, 6 / 24, true), 2], ['الظهر', mid(.5), 2], ['العصر', asr, 3], ['المغرب', at(.833, 18 / 24), 2], ['العشاء', at(17.5, 18 / 24), 0]];
    return o.map(function(x){ return [x[0], Math.round((x[1] + off) * 60) + x[2]]; });
  }
  function hijri(d){ try { return new Intl.DateTimeFormat('ar-KW-u-ca-islamic-umalqura-nu-latn', {day:'numeric', month:'long', year:'numeric'}).format(d); } catch(e){ return ''; } }

  /* ---- views and menu ---- */
  var dash = $('view-dashboard'), anchor = $('view-news-content'), nav = document.querySelector('.sb-nav');
  function view(id){ var v = el('div', 'page-view'); v.id = 'view-' + id; anchor.parentNode.insertBefore(v, anchor); return v; }
  var vDec = view('decisions'), vSup = view('support'), vLib = view('library');
  try { pageNames.decisions = 'القرارات والتعاميم'; pageNames.support = 'الدعم الفني'; pageNames.library = 'مركز المعلومات'; } catch(e){}
  if (nav){
    var first = [].filter.call(nav.querySelectorAll('.sb-item'), function(i){ return /goTo\('news'/.test(i.getAttribute('onclick') || ''); })[0];
    [['decisions','📜','القرارات والتعاميم'],['library','📚','مركز المعلومات'],['support','🛟','الدعم الفني']].forEach(function(x){ var it = el('div', 'sb-item', '<span class="si-icon">' + x[1] + '</span> ' + x[2] + (x[0] === 'support' ? ' <span class="sb-badge" id="inSupB" style="display:none"></span>' : '')); it.setAttribute('onclick', "goTo('" + x[0] + "',this)"); if (first) first.parentNode.insertBefore(it, first); });
  }
  // the dashboard shell: one hero (greeting + the day's arc), a slim circular bar, then two tabbed cards instead of a long stack
  var wb = dash.querySelector('.welcome-banner'), hero = el('div', 'in-hero'), bar = el('div'), tabsA = el('div', 'in-card in-tabs'), row = el('div', 'in-2');
  dash.insertBefore(hero, wb); dash.insertBefore(bar, wb.nextSibling);
  var qaT = [].filter.call(dash.children, function(c){ return c.tagName === 'DIV' && !c.className && /إجراءات سريعة/.test(c.textContent) && c.textContent.length < 40; })[0]; if (qaT) qaT.classList.add('in-qat');
  var grid = dash.querySelector('.dash-grid'), wid = grid ? [].slice.call(grid.querySelectorAll(':scope > .widget')) : [];
  tabsA.innerHTML = '<div class="in-tb" role="tablist"><button type="button" class="on" data-in="ta" data-i="0">القرارات والتعاميم</button><button type="button" data-in="ta" data-i="1">آخر النشاطات</button><button type="button" data-in="ta" data-i="2">إعلانات الشركة</button></div><div class="in-pn on" id="inPd"></div><div class="in-pn"></div><div class="in-pn"></div>';
  dash.appendChild(tabsA); dash.appendChild(row);
  wid.forEach(function(w, k){ var pn = tabsA.querySelectorAll('.in-pn')[k + 1]; if (pn){ pn.appendChild(w); w.classList.add('in-flat'); } }); if (grid) grid.style.display = 'none';
  var linkTab = 0;

  /* ---- circulars as posters: a rail everyone sees, a full-screen viewer, and "seen" receipts ---- */
  var vi = 0, vOpen = false, vAuto = {};
  function circ(){ var t = K.today(); return K.db().circulars.filter(function(c){ return c.on && (!c.until || c.until >= t); }); }
  function seen(c, u){ return !!(c.seenBy || {})[u.id]; }
  function poster(c, big){ var t = TONE[c.tone] || TONE.indigo; return c.img ? '<img src="' + c.img + '" alt="' + E(c.title) + '">' : '<div class="in-po" style="--bg:' + t[0] + ';--fg:' + t[1] + '"><i></i><small>تعميم' + (c.must ? ' · يلزم الاطلاع' : '') + '</small><b>' + E(c.title) + '</b>' + (big ? '<p>' + E(c.body) + '</p><em>KPTC · ' + K.date(c.d || K.today()) + '</em>' : '') + '</div>'; }
  function slider(){
    var L = circ(), u = K.staffUser(), n = L.filter(function(c){ return !seen(c, u); }).length;
    if (!L.length) return '';
    return '<div class="in-rail"><div class="in-rail-h"><b>لوحة التعاميم</b>' + (n ? '<span>' + n + ' لم تطّلع عليها</span>' : '<span class="ok">اطّلعت على الكل</span>') + '</div><div class="in-rail-s">' + L.map(function(c, i){ return '<button type="button" class="in-pc' + (seen(c, u) ? ' seen' : '') + (c.must ? ' must' : '') + '" data-in="so" data-i="' + i + '" style="--i:' + i + '">' + poster(c, false) + '<span>' + E(c.title) + '</span></button>'; }).join('') + '</div></div>';
  }
  function viewer(){
    var L = circ(), u = K.staffUser(), o = $('inVw'); if (!vOpen || !L.length || !u){ if (o){ o.remove(); document.body.style.overflow = ''; } return; }
    vi = Math.max(0, Math.min(L.length - 1, vi)); var c = L[vi], ok = seen(c, u), all = Object.keys(K.db().staff).length, cnt = Object.keys(c.seenBy || {}).length;
    if (!o){ o = el('div', 'in-vw'); o.id = 'inVw'; document.body.appendChild(o); }
    o.innerHTML = '<div class="in-vw-in"><div class="in-vw-p">' + L.map(function(x, i){ return '<i class="' + (i < vi ? 'done' : i === vi ? 'on' : '') + '"></i>'; }).join('') + '</div><button type="button" class="in-vw-x" data-in="vx" aria-label="إغلاق">×</button>' +
      '<div class="in-vw-b">' + poster(c, true) + '</div>' + (c.img ? '<div class="in-vw-c"><b>' + E(c.title) + '</b><span>' + E(c.body) + '</span></div>' : '') +
      '<div class="in-vw-a"><button type="button" data-in="vp"' + (vi ? '' : ' disabled') + '>→</button><button type="button" class="ack' + (ok ? ' done' : '') + '" data-in="va">' + (ok ? '✓ اطّلعت' : c.must ? 'قرأت وفهمت' : 'تم الاطلاع') + '</button><button type="button" data-in="vn"' + (vi < L.length - 1 ? '' : ' disabled') + '>←</button></div>' +
      (K.can('portal.admin', u) ? '<small class="in-vw-s">اطّلع ' + cnt + ' من ' + all + ' موظفاً</small>' : '') + '</div>';
    document.body.style.overflow = 'hidden';
  }
  function autoShow(){ // an unread "must read" circular opens by itself once per sign-in
    var u = K.staffUser(); if (!u || vOpen || !$('portal').classList.contains('show')) return; var L = circ(), k = -1; L.forEach(function(c, i){ if (k < 0 && c.must && !seen(c, u) && !vAuto[c.id]) k = i; });
    if (k > -1){ vAuto[L[k].id] = 1; vi = k; vOpen = true; viewer(); }
  }

  /* ---- the hero: greeting and the day drawn as an arc from Fajr to Isha ---- */
  function heroHTML(){
    var now = new Date(), P = prayers(now), cur = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60, a = P[0][1], z = P[5][1], f = Math.max(0, Math.min(1, (cur - a) / (z - a))), day = cur >= a && cur <= z;
    var nx = P.filter(function(p){ return p[0] !== 'الشروق' && p[1] > cur; })[0], left = nx ? Math.ceil(nx[1] - cur) : 0, u = K.staffUser();
    var pt = function(fr, r){ return [220 + r * Math.cos(Math.PI * fr), 196 - r * Math.sin(Math.PI * fr)]; }, dots = '', sun = pt(f, 170);
    P.forEach(function(p){ var fr = (p[1] - a) / (z - a), d = pt(fr, 170), l = pt(fr, 198), on = nx && p[0] === nx[0], past = p[1] <= cur;
      dots += '<circle cx="' + d[0].toFixed(1) + '" cy="' + d[1].toFixed(1) + '" r="' + (on ? 8 : 6) + '" class="' + (on ? 'nx' : past ? 'ps' : '') + '"/><text x="' + l[0].toFixed(1) + '" y="' + (l[1] - 4).toFixed(1) + '" class="n' + (on ? ' nx' : '') + '">' + p[0] + '</text><text x="' + l[0].toFixed(1) + '" y="' + (l[1] + 11).toFixed(1) + '" class="t' + (on ? ' nx' : '') + '">' + hm(p[1]) + '</text>'; });
    var h = now.getHours(), sky = h < 5 || h >= 19 ? 'night' : h < 7 ? 'dawn' : h >= 16 ? 'dusk' : 'day', hello = h < 12 ? 'صباح الخير' : 'مساء الخير';
    var d = K.db(), todo = d.occasions.filter(function(o){ return o.status === 'منشور' && !(o.marks || {})[u.id]; }).length, fresh = K.benefitsFor(u).filter(function(b){ return (u.seen || []).indexOf(b.id) < 0; }).length;
    return '<div class="in-hero-in ' + sky + '"><div class="in-hi"><small>' + now.toLocaleDateString('ar-KW', {weekday:'long', day:'numeric', month:'long', year:'numeric'}) + ' · ' + hijri(now) + '</small><h2>' + hello + '، ' + E(u.name.split(' ')[0]) + '</h2><p>' + E(u.title || '') + ' · ' + E(u.dept || '') + '</p>' +
      '<div class="in-chips">' + (todo ? '<button type="button" onclick="goTo(\'occasions\',null)"><b>' + todo + '</b> واجب زملاء</button>' : '') + (fresh ? '<button type="button" onclick="goTo(\'benefits\',null)"><b>' + fresh + '</b> عرض جديد</button>' : '') + '<button type="button" onclick="goTo(\'myrequests\',null)">طلباتي</button><button type="button" onclick="goTo(\'support\',null)">الدعم الفني</button></div></div>' +
      '<div class="in-arc"><svg viewBox="0 0 440 232" role="img" aria-label="مواقيت الصلاة اليوم"><path d="M50 196A170 170 0 0 1 390 196" class="tr"/><path d="M390 196A170 170 0 0 0 ' + sun[0].toFixed(1) + ' ' + sun[1].toFixed(1) + '" class="dn"/>' + dots + (day ? '<circle cx="' + sun[0].toFixed(1) + '" cy="' + sun[1].toFixed(1) + '" r="13" class="sun"/>' : '<path d="M232 60a26 26 0 1 0 18 44 20 20 0 0 1-18-44z" class="moon"/>') + '</svg>' +
      '<div class="in-now"><b id="inClk">' + P2(now.getHours()) + ':' + P2(now.getMinutes()) + ':' + P2(now.getSeconds()) + '</b><span>' + (nx ? 'باقٍ على ' + nx[0] + ' ' + (left >= 60 ? Math.floor(left / 60) + ' س ' : '') + (left % 60) + ' د' : 'انتهت صلوات اليوم') + '</span></div></div></div>';
  }

  /* ---- decisions table ---- */
  var dq = '', dc = 'الكل', dp = 0, PER = 10;
  function decisions(full){
    var all = K.db().decisions, cats = ['الكل'].concat(all.map(function(d){ return d.cat; }).filter(function(v, i, a){ return a.indexOf(v) === i; }));
    var L = all.filter(function(d){ return (dc === 'الكل' || d.cat === dc) && (!dq || (d.id + ' ' + d.title).indexOf(dq) > -1); }), per = full ? PER : 5, pages = Math.max(1, Math.ceil(L.length / per)); if (dp >= pages) dp = 0; var page = full ? dp : 0;
    return '<div class="in-card"><div class="in-h"><b>القرارات والتعاميم الرسمية <span style="color:var(--kp-muted);font-size:12.5px">(' + L.length + ')</span></b>' + (full ? '<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="inDq" placeholder="ابحث برقم الوثيقة أو الموضوع" value="' + E(dq) + '"><select id="inDc">' + cats.map(function(c){ return '<option' + (c === dc ? ' selected' : '') + '>' + E(c) + '</option>'; }).join('') + '</select></div>' : '<a style="cursor:pointer;color:var(--kp-indigo);font:700 12.5px var(--f-display)" onclick="goTo(\'decisions\',null)">عرض الكل ←</a>') + '</div>' +
      '<div style="overflow-x:auto"><table class="in-t"><thead><tr><th>رقم الوثيقة</th><th>الموضوع</th><th>التصنيف</th><th>التاريخ</th></tr></thead><tbody>' + (L.slice(page * per, page * per + per).map(function(d){ return '<tr data-in="doc" data-id="' + E(d.id) + '"><td>' + E(d.id) + '</td><td>' + E(d.title) + '</td><td>' + E(d.cat) + '</td><td>' + K.date(d.d) + '</td></tr>'; }).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--kp-muted);font-family:inherit">لا نتائج.</td></tr>') + '</tbody></table></div>' +
      (full && pages > 1 ? '<div class="in-pg"><button type="button" data-in="pg" data-i="' + (dp - 1) + '"' + (dp ? '' : ' disabled') + '>السابق</button>' + Array.apply(null, Array(pages)).map(function(_, i){ return '<button type="button" data-in="pg" data-i="' + i + '" class="' + (i === dp ? 'on' : '') + '">' + (i + 1) + '</button>'; }).join('') + '<button type="button" data-in="pg" data-i="' + (dp + 1) + '"' + (dp < pages - 1 ? '' : ' disabled') + '>التالي</button></div>' : '') + '</div>';
  }

  /* ---- calendar: a tear-off desk page, the month as a field of dots, and what's next ---- */
  var cm = new Date(); cm.setDate(1); var csel = K.today(), cdir = 1;
  function iso(d){ return d.getFullYear() + '-' + P2(d.getMonth() + 1) + '-' + P2(d.getDate()); }
  function evOn(day){ var d = K.db(), out = d.events.filter(function(e){ return e.d === day; }).map(function(e){ return e.title; }); d.occasions.forEach(function(o){ if (o.status === 'منشور' && o.date === day) out.push(o.kind + ' — ' + o.name); }); return out; }
  function calendar(){
    var sd = new Date(csel + 'T00:00:00'), y = cm.getFullYear(), m = cm.getMonth(), lead = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), td = K.today(), cells = '', ev = evOn(csel);
    ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'].forEach(function(n, i){ cells += '<small class="' + (i > 4 ? 'we' : '') + '">' + n + '</small>'; });
    for (var i = 0; i < lead; i++) cells += '<span></span>';
    for (var k = 1; k <= days; k++){ var dt = new Date(y, m, k), s = iso(dt), n = evOn(s).length; cells += '<button type="button" data-in="day" data-id="' + s + '" title="' + (n ? E(evOn(s).join('، ')) : '') + '" class="' + (s === td ? 'td ' : '') + (s === csel ? 'sel ' : '') + (dt.getDay() > 4 ? 'we ' : '') + (s < td ? 'past ' : '') + (n ? 'ev' : '') + '">' + k + '</button>'; }
    var up = [], d = K.db(); d.events.forEach(function(e){ if (e.d >= td) up.push([e.d, e.title]); }); d.occasions.forEach(function(o){ if (o.status === 'منشور' && o.date >= td) up.push([o.date, o.kind + ' — ' + o.name]); }); up.sort(function(a, b){ return a[0] < b[0] ? -1 : 1; });
    var gap = function(s){ var n = Math.round((new Date(s) - new Date(td)) / 864e5); return n === 0 ? 'اليوم' : n === 1 ? 'غداً' : 'بعد ' + n + ' ' + (n < 11 ? 'أيام' : 'يوماً'); };
    return '<div class="in-card in-dk"><div class="in-dk-g">' +
      '<div class="in-pad"><div class="in-pad-r"><i></i><i></i><i></i><i></i><i></i></div><div class="in-page ' + (cdir > 0 ? 'fwd' : 'back') + '"><small>' + sd.toLocaleDateString('ar-KW', {weekday:'long'}) + '</small><b>' + sd.getDate() + '</b><span>' + sd.toLocaleDateString('ar-KW', {month:'long', year:'numeric'}) + '</span><em>' + hijri(sd) + '</em></div>' +
      '<div class="in-pad-n"><button type="button" data-in="dd" data-i="-1" aria-label="اليوم السابق">→</button><button type="button" data-in="dt">اليوم</button><button type="button" data-in="dd" data-i="1" aria-label="اليوم التالي">←</button></div>' +
      '<div class="in-pad-e">' + (ev.length ? ev.map(function(e){ return '<span>' + E(e) + '</span>'; }).join('') : '<span class="no">لا فعاليات في هذا اليوم</span>') + '</div></div>' +
      '<div class="in-mo"><div class="in-mo-h"><b>' + new Date(y, m, 1).toLocaleDateString('ar-KW', {month:'long', year:'numeric'}) + '</b><div><button type="button" data-in="cm" data-i="-1" aria-label="الشهر السابق">→</button><button type="button" data-in="cm" data-i="1" aria-label="الشهر التالي">←</button></div></div><div class="in-cg">' + cells + '</div>' +
      '<div class="in-up"><b>القادم</b>' + (up.length ? up.slice(0, 3).map(function(u2){ return '<button type="button" data-in="day" data-id="' + u2[0] + '"><i>' + gap(u2[0]) + '</i><span>' + E(u2[1]) + '</span></button>'; }).join('') : '<span class="no">لا فعاليات قادمة.</span>') + '</div></div></div></div>';
  }
  function links(title, L){ return '<div class="in-card"><div class="in-h"><b>' + title + '</b></div><div class="in-l">' + L.map(function(l){ return '<a href="' + l[1] + '" target="_blank" rel="noopener">' + E(l[0]) + '</a>'; }).join('') + '</div></div>'; }

  /* ---- technical support ---- */
  var CATS = ['برمجيات','أجهزة','الشبكة والإنترنت','البريد الإلكتروني','الطابعات','الصلاحيات وكلمات المرور','أخرى'];
  function support(){
    var u = K.staffUser(), d = K.db(), all = K.can('it.support', u), L = d.ittickets.filter(function(t){ return all || t.from === u.id; });
    return '<div class="in-card"><div class="in-h"><b>بلاغ دعم فني جديد</b></div><form class="in-form" id="inSup"><label>نوع المشكلة<select name="cat"><option value="">— حدد أحد الخيارات —</option>' + CATS.map(function(c){ return '<option>' + c + '</option>'; }).join('') + '</select></label><label>الأولوية<select name="pri"><option>عادية</option><option>عاجلة</option></select></label><label class="full">عنوان البلاغ<input name="sub"></label><label class="full">وصف المشكلة<textarea name="text" rows="3" placeholder="ماذا حدث؟ وعلى أي جهاز أو نظام؟"></textarea></label><div class="full"><button class="pt-btn k" type="submit">أرسل البلاغ</button></div></form></div>' +
      '<div class="in-card"><div class="in-h"><b>' + (all ? 'كل البلاغات' : 'بلاغاتي') + ' <span style="color:var(--kp-muted);font-size:12.5px">(' + L.length + ')</span></b></div>' + (L.length ? L.map(function(t){ return '<div class="in-tk"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>' + E(t.sub) + '</b><span><span class="in-st in">' + E(t.cat) + '</span> <span class="in-st' + (t.status === 'مُغلق' ? ' ok' : '') + '">' + E(t.status) + '</span></span></div><span>' + E(t.text) + '</span><small style="color:var(--kp-muted)">' + E(t.id) + ' · ' + E(nameOf(t.from)) + ' · ' + K.date(t.d) + (t.pri === 'عاجلة' ? ' · عاجلة' : '') + '</small>' + t.replies.map(function(r){ return '<div class="r"><b>' + E(nameOf(r.from)) + ':</b> ' + E(r.text) + '</div>'; }).join('') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="pt-btn" data-in="trep" data-id="' + t.id + '">أضف رداً</button>' + (all && t.status !== 'مُغلق' ? '<button class="pt-btn" data-in="tcl" data-id="' + t.id + '">أغلق البلاغ</button>' : '') + '</div></div>'; }).join('') : '<div class="in-tk" style="color:var(--kp-muted)">لا بلاغات بعد.</div>') + '</div>';
  }
  var lq = '';
  function library(){
    var L = K.db().library.filter(function(x){ return !lq || (x.title + ' ' + x.cat).indexOf(lq) > -1; });
    return '<div class="in-card"><div class="in-h"><b>مركز المعلومات</b><input id="inLq" placeholder="ابحث في الأدلة واللوائح" value="' + E(lq) + '"></div><div class="in-lib">' + (L.map(function(x){ return '<div><small>' + E(x.cat) + ' · ' + E(x.kind) + '</small><b>' + E(x.title) + '</b><button class="pt-btn" data-in="lib" data-id="' + x.id + '">اطلب الملف</button></div>'; }).join('') || '<p style="color:var(--kp-muted)">لا نتائج.</p>') + '</div></div>';
  }

  function keepFocus(fn){ var a = document.activeElement, id = a && a.id, pos = null; try { pos = a.selectionStart; } catch(e){} fn(); if (id && $(id) && $(id) !== a){ $(id).focus(); try { $(id).setSelectionRange(pos, pos); } catch(e){} } }
  function linksCard(){ var T = [['روابط هامة', LINKS], ['الصحف اليومية', PAPERS]]; return '<div class="in-card in-tabs"><div class="in-tb">' + T.map(function(t, i){ return '<button type="button" class="' + (i === linkTab ? 'on' : '') + '" data-in="tl" data-i="' + i + '">' + t[0] + '</button>'; }).join('') + '</div><div class="in-l">' + T[linkTab][1].map(function(l){ return '<a href="' + l[1] + '" target="_blank" rel="noopener">' + E(l[0]) + '</a>'; }).join('') + '</div></div>'; }
  function paint(){
    var u = K.staffUser(); if (!u) return;
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#inSup')) return;
    keepFocus(function(){
      hero.innerHTML = heroHTML(); bar.innerHTML = slider(); viewer(); autoShow();
      $('inPd').innerHTML = decisions(false); row.innerHTML = calendar() + linksCard();
      vDec.innerHTML = decisions(true); vSup.innerHTML = support(); vLib.innerHTML = library();
    });
    var open = K.db().ittickets.filter(function(t){ return t.status !== 'مُغلق' && (K.can('it.support', u) || t.from === u.id); }).length, b = $('inSupB'); if (b){ b.style.display = open ? '' : 'none'; b.textContent = open; }
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-in]'); if (!b) return; var a = b.getAttribute('data-in'), id = b.getAttribute('data-id'), d = K.db(), u = K.staffUser(), n = K.db().circulars.filter(function(c){ return c.on; }).length || 1;
    if (a === 'so'){ vi = +b.getAttribute('data-i'); vOpen = true; viewer(); }
    else if (a === 'vx'){ vOpen = false; viewer(); }
    else if (a === 'vp' || a === 'vn'){ vi += a === 'vn' ? 1 : -1; viewer(); }
    else if (a === 'va'){ var cc0 = circ()[vi]; cc0.seenBy = cc0.seenBy || {}; if (!cc0.seenBy[u.id]) cc0.seenBy[u.id] = K.today(); var L0 = circ(), nxt = -1; L0.forEach(function(c, i){ if (nxt < 0 && i > vi && !seen(c, u)) nxt = i; }); if (nxt > -1) vi = nxt; else vOpen = false; K.save(); }
    else if (a === 'dd'){ var nd = new Date(csel + 'T00:00:00'); cdir = +b.getAttribute('data-i'); nd.setDate(nd.getDate() + cdir); csel = iso(nd); cm = new Date(nd.getFullYear(), nd.getMonth(), 1); paint(); }
    else if (a === 'dt'){ cdir = csel > K.today() ? -1 : 1; csel = K.today(); cm = new Date(); cm.setDate(1); paint(); }
    else if (a === 'ta'){ var k = +b.getAttribute('data-i'); tabsA.querySelectorAll('.in-tb button').forEach(function(x, i){ x.classList.toggle('on', i === k); }); tabsA.querySelectorAll('.in-pn').forEach(function(x, i){ x.classList.toggle('on', i === k); }); }
    else if (a === 'tl'){ linkTab = +b.getAttribute('data-i'); paint(); }
    else if (a === 'pg'){ dp = +b.getAttribute('data-i'); paint(); }
    else if (a === 'cm'){ cm.setMonth(cm.getMonth() + (+b.getAttribute('data-i'))); paint(); }
    else if (a === 'day'){ cdir = id >= csel ? 1 : -1; csel = id; var nd2 = new Date(id + 'T00:00:00'); cm = new Date(nd2.getFullYear(), nd2.getMonth(), 1); paint(); }
    else if (a === 'doc'){ var x = d.decisions.filter(function(v){ return v.id === id; })[0]; showModal('وثيقة رقم ' + x.id, '<div class="in-doc"><dl><dt>الموضوع</dt><dd>' + E(x.title) + '</dd><dt>التصنيف</dt><dd>' + E(x.cat) + '</dd><dt>التاريخ</dt><dd>' + K.date(x.d) + '</dd></dl><p>' + E(x.body) + '</p><button class="pt-btn" onclick="window.print()">طباعة</button></div>'); }
    else if (a === 'lib') toast('سُجّل طلبك. يُرسل الملف إلى بريدك الرسمي عند توفره في الأرشيف.');
    else if (a === 'tcl'){ d.ittickets.filter(function(t){ return t.id === id; })[0].status = 'مُغلق'; K.save(); }
    else if (a === 'trep'){ showModal('رد على البلاغ', '<form class="pt-form" id="inRp"><label>الرد<textarea name="t" rows="3"></textarea></label><button class="pt-btn y" type="submit">إرسال</button></form>'); $('inRp').onsubmit = function(ev){ ev.preventDefault(); var t = ev.target.t.value.trim(); if (!t) return; var tk = d.ittickets.filter(function(v){ return v.id === id; })[0]; tk.replies.push({from:u.id, text:t, d:K.today()}); if (K.can('it.support', u) && tk.status === 'جديد') tk.status = 'قيد المعالجة'; K.save(); closeModal(); toast('أُضيف الرد'); }; }
  });
  document.addEventListener('submit', function(e){
    if (e.target.id !== 'inSup') return; e.preventDefault(); var f = e.target, u = K.staffUser();
    if (!f.cat.value || !f.sub.value.trim() || !f.text.value.trim()) return toast('حدد نوع المشكلة واكتب العنوان والوصف');
    K.db().ittickets.unshift({id:K.id('IT'), from:u.id, cat:f.cat.value, pri:f.pri.value, sub:f.sub.value.trim(), text:f.text.value.trim(), d:K.today(), status:'جديد', replies:[]}); K.log('بلاغ دعم فني من ' + u.name); f.reset(); document.activeElement && document.activeElement.blur(); K.save(); toast('وصل بلاغك إلى الدعم الفني');
  });
  document.addEventListener('input', function(e){ if (e.target.id === 'inDq'){ dq = e.target.value.trim(); dp = 0; paint(); } if (e.target.id === 'inLq'){ lq = e.target.value.trim(); paint(); } });
  document.addEventListener('change', function(e){ if (e.target.id === 'inDc'){ dc = e.target.value; dp = 0; paint(); } });
  setInterval(function(){ var c = $('inClk'), n = new Date(); if (c) c.textContent = P2(n.getHours()) + ':' + P2(n.getMinutes()) + ':' + P2(n.getSeconds()); if (n.getSeconds() === 0 && K.staffUser() && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) hero.innerHTML = heroHTML(); }, 1000);
  document.addEventListener('keydown', function(e){ if (!vOpen) return; if (e.key === 'Escape'){ vOpen = false; viewer(); } if (e.key === 'ArrowLeft' && vi < circ().length - 1){ vi++; viewer(); } if (e.key === 'ArrowRight' && vi > 0){ vi--; viewer(); } });
  K.onChange(paint);
  new MutationObserver(paint).observe($('portal'), {attributes:true, attributeFilter:['class']});
  paint();
})();
