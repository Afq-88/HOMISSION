/* KPTC — المفقودات: «رادار المفقودات». يظهر الغرض المطابق فوراً، ويُبلَّغ عن المفقود بثلاث خطوات، وتُتابَع البلاغات من البيانات الفعلية. */
(function(){
  'use strict';
  var K = window.KPTC; if (!K) return;
  var hero = document.querySelector('.hero'); if (!hero) return;
  function $(s, r){ return (r || document).querySelector(s); }
  function el(tag, cls, html){ var d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
  function toast(t){ try { showToast(t); } catch(e){} }
  var E = K.esc;

  /* ---------- the old tabbed page stays in the file (its functions keep working) but is no longer shown ---------- */
  ['.hero', '.main-tabs', '.content', '.page-content'].forEach(function(q){ var n = $(q); if (n) n.classList.add('lf-legacy'); });

  var CATS = [
    ['محفظة', 'محفظة', '<rect x="3" y="6.5" width="18" height="12" rx="2.5"/><path d="M3 10.5h18M16.5 14.5h1.5"/>'],
    ['هاتف', 'هاتف', '<rect x="7" y="2.8" width="10" height="18.4" rx="2.4"/><path d="M11 18.2h2"/>'],
    ['مفاتيح', 'مفاتيح', '<circle cx="8" cy="12" r="3.6"/><path d="M11.6 12H21M17.5 12v3M20.5 12v2"/>'],
    ['حقيبة', 'حقيبة', '<rect x="4.5" y="8" width="15" height="12" rx="2.5"/><path d="M9 8V6.3A2.3 2.3 0 0 1 11.3 4h1.4A2.3 2.3 0 0 1 15 6.3V8M4.5 13h15"/>'],
    ['وثائق', 'وثائق', '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>'],
    ['نظارة', 'نظارة', '<circle cx="7" cy="14" r="3.6"/><circle cx="17" cy="14" r="3.6"/><path d="M10.6 13.4a2 2 0 0 1 2.8 0M3.4 13.5 5 8M20.6 13.5 19 8"/>'],
    ['نقود', 'نقود', '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/>'],
    ['أخرى', 'أخرى', '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>']
  ];
  var CAT = {}; CATS.forEach(function(c){ CAT[c[0]] = c; });
  var SYN = {'محفظة':['محفظه','جزدان','بوك','بطاقات','كرت'], 'هاتف':['جوال','تلفون','موبايل','ايفون','آيفون','iphone','samsung','سامسونج','galaxy','تليفون'], 'مفاتيح':['مفتاح','كيتشين','ريموت','سلسلة'], 'حقيبة':['شنطة','شنطه','جنطة','كيس','اكياس','ظهر','مدرسية','حقيبه'], 'وثائق':['اوراق','هوية','مدنية','جواز','رخصة','ملف','بطاقة مدنية'], 'نظارة':['نضارة','نظاره','عدسات'], 'نقود':['فلوس','مبلغ','دنانير','دينار','كاش']};
  var COLORS = [['أسود', '#1a1a1a'], ['بني', '#8B4513'], ['أزرق', '#2E5AAC'], ['أحمر', '#C2352E'], ['أخضر', '#16A34A'], ['رمادي', '#8E8CB8'], ['ذهبي', '#C77A12'], ['أبيض', '#f4f3f8']];
  function ico(path, cls){ return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>'; }
  function norm(t){ return String(t || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').trim(); }
  function catOf(q){ var n = norm(q), hit = null; Object.keys(SYN).forEach(function(c){ if (hit) return; if (n.indexOf(norm(c)) > -1) hit = c; SYN[c].forEach(function(w){ if (!hit && n.indexOf(norm(w)) > -1) hit = c; }); }); return hit; }
  function items(){ return K.db().found || []; }
  function lines(){ var m = {}; items().forEach(function(i){ m[i.bus] = 1; }); return Object.keys(m).sort(function(a, b){ return (parseInt(a) || 999) - (parseInt(b) || 999); }); }
  function ago(d){ var n = Math.round((new Date(K.today()) - new Date(d)) / 864e5); return n <= 0 ? 'اليوم' : n === 1 ? 'أمس' : n < 11 ? 'منذ ' + n + ' أيام' : K.date(d); }
  function days(d){ return Math.round((new Date(K.today()) - new Date(d)) / 864e5); }

  /* how close an item is to what the visitor typed or picked */
  var S = {q:'', cat:'', line:'', when:'all'};
  function score(it){
    var sc = 0, q = norm(S.q), hay = norm(it.name + ' ' + it.desc + ' ' + it.type + ' ' + it.route);
    if (S.cat){ if (it.type === S.cat) sc += 5; else if (!q) return -1; }
    if (S.line){ if (String(it.bus) === S.line) sc += 3; else return -1; }
    if (S.when !== 'all' && days(it.d) > +S.when) return -1;
    if (q){ var qc = catOf(S.q); if (qc && it.type === qc) sc += 5; q.split(/\s+/).forEach(function(w){ if (w.length > 1 && hay.indexOf(w) > -1) sc += 3; }); COLORS.forEach(function(c){ if (q.indexOf(norm(c[0])) > -1 && it.color.toLowerCase() === c[1].toLowerCase()) sc += 2; }); if (sc === 0) return -1; }
    return sc + 1;
  }
  function results(){ return items().map(function(it){ return {it:it, sc:score(it)}; }).filter(function(x){ return x.sc >= 0; }).sort(function(a, b){ return b.sc - a.sc || (a.it.d < b.it.d ? 1 : -1); }); }

  /* ---------- styles ---------- */
  var css = el('style'); css.textContent = [
  '.lf-legacy{display:none!important}',
  '.lf{--c1:#14133A}',
  '.lf-hero{position:relative;background:var(--kp-ink);color:#fff;overflow:hidden;padding:34px 0 44px}',
  '.lf-hero::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 90% at 85% 40%,rgba(255,201,60,.12),transparent 70%),repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 1px,transparent 1px 48px);pointer-events:none}',
  '.lf-w{max-width:1200px;margin-inline:auto;padding-inline:24px;position:relative}',
  '.lf-hg{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(240px,.75fr);gap:30px;align-items:center}',
  '.lf-hg>*{min-width:0}.lf-q{width:100%;box-sizing:border-box}.lf-hero h1,.lf-hero p{overflow-wrap:anywhere}',
  '.lf-tag{display:inline-flex;gap:8px;align-items:center;font:700 12.5px var(--f-display);color:var(--kp-sign);background:rgba(255,201,60,.1);border:1px solid rgba(255,201,60,.28);border-radius:20px;padding:4px 14px}',
  '.lf-hero h1{font:700 clamp(30px,4.6vw,54px)/1.2 var(--f-display);color:#fff;margin:14px 0 8px}.lf-hero h1 em{font-style:normal;color:var(--kp-sign)}',
  '.lf-hero p{color:#C9C7EA;font-size:15px;line-height:1.9;margin:0 0 20px;max-width:560px}',
  '.lf-q{display:flex;align-items:center;gap:10px;background:#fff;border-radius:34px;padding:5px 6px 5px 20px;border:3px solid var(--kp-sign);box-shadow:0 10px 30px -14px rgba(0,0,0,.6);max-width:640px}',
  '.lf-q svg{width:22px;height:22px;color:var(--kp-ink);flex:none}.lf-q input{flex:1;min-width:0;border:0;outline:0;background:none;font:500 17px var(--f-body);color:var(--kp-ink);padding:12px 2px}',
  '.lf-q button{border:0;background:var(--kp-ink);color:var(--kp-sign);border-radius:26px;height:44px;padding:0 20px;font:700 14px var(--f-display);cursor:pointer;white-space:nowrap}',
  '.lf-cats{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin-top:18px;max-width:700px}',
  '.lf-cats button{all:unset;box-sizing:border-box;cursor:pointer;display:grid;justify-items:center;gap:6px;padding:10px 4px;border-radius:14px;border:1.5px solid rgba(255,255,255,.16);color:#DAD9F0;font:600 12px var(--f-display);transition:.2s;text-align:center}',
  '.lf-cats svg{width:26px;height:26px}.lf-cats button:hover{border-color:var(--kp-sign);color:#fff;translate:0 -3px}.lf-cats button.on{background:var(--kp-sign);color:var(--kp-ink);border-color:var(--kp-sign)}',
  '.lf-fl{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;align-items:center}',
  '.lf-fl select{appearance:none;-webkit-appearance:none;height:40px;border-radius:20px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:600 13.5px var(--f-body);padding:0 16px;max-width:100%}.lf-fl select option{color:#000}',
  '.lf-chips{display:flex;gap:6px;flex-wrap:wrap}.lf-chips button{border:1.5px solid rgba(255,255,255,.3);background:none;color:#fff;border-radius:20px;padding:0 14px;height:40px;font:600 13px var(--f-body);cursor:pointer}.lf-chips button.on{background:#fff;color:var(--kp-ink);border-color:#fff}',
  /* radar */
  '.lf-radar{position:relative;width:100%;max-width:340px;aspect-ratio:1;margin-inline:auto}',
  '.lf-radar svg{width:100%;height:100%;display:block;overflow:visible}',
  '.lf-radar .rg{fill:none;stroke:rgba(255,255,255,.22);stroke-width:1.2}.lf-radar .cx{stroke:rgba(255,255,255,.12)}',
  '.lf-radar .sweep{transform-origin:150px 150px;animation:lf-sw 5s linear infinite}@keyframes lf-sw{to{rotate:360deg}}',
  '.lf-radar .bl{cursor:pointer;transition:r .3s,opacity .3s}.lf-radar .bl.off{opacity:.18}.lf-radar .bl.hit{animation:lf-bl 1.6s ease-in-out infinite}@keyframes lf-bl{50%{r:9;opacity:.6}}',
  '.lf-radar .me{fill:var(--kp-sign)}',
  '.lf-rn{position:absolute;inset:auto 0 -4px 0;text-align:center;font:700 13px var(--f-display);color:#C9C7EA}.lf-rn b{color:var(--kp-sign);font-size:20px}',
  /* body */
  '.lf-bar{background:#fff;border-bottom:2px solid var(--kp-ink);position:sticky;top:72px;z-index:30}',
  '.lf-bar .lf-w{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding-block:10px}',
  '.lf-bar b{font:700 15px var(--f-display);color:var(--kp-ink)}.lf-bar small{color:var(--kp-muted);font-size:12.5px;margin-inline-start:8px}',
  '.lf-btn{border:2px solid var(--kp-ink);background:#fff;color:var(--kp-ink);border-radius:24px;height:42px;padding:0 18px;font:700 13.5px var(--f-display);cursor:pointer;transition:.15s;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}',
  '.lf-btn:hover{background:var(--kp-sign)}.lf-btn.k{background:var(--kp-ink);color:var(--kp-sign)}.lf-btn.k:hover{background:#000}.lf-btn svg{width:18px;height:18px}',
  '.lf-main{padding:26px 0 70px;background:var(--kp-paper)}',
  '.lf-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}',
  '.lf-t{position:relative;background:#fff;border:2px solid var(--kp-ink);border-radius:14px;padding:30px 16px 14px;display:grid;gap:8px;cursor:pointer;transition:translate .25s var(--kp-ease),box-shadow .25s;animation:lf-in .5s calc(var(--i)*.04s) both;text-align:start;font:inherit;color:inherit}',
  '@keyframes lf-in{from{opacity:0;translate:0 14px}}',
  '.lf-t:hover,.lf-t:focus-visible{translate:0 -6px;box-shadow:7px 7px 0 var(--kp-sign)}',
  '.lf-t::before{content:"";position:absolute;top:8px;left:50%;width:46px;height:10px;margin-left:-23px;border-radius:6px;background:var(--kp-paper);border:2px solid var(--kp-ink)}',
  '.lf-t.cl{opacity:.62}.lf-t.hot{box-shadow:0 0 0 3px var(--kp-sign)}',
  '.lf-ti{display:flex;gap:12px;align-items:center}.lf-ic{width:50px;height:50px;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 18%,#fff);color:var(--kp-ink);flex:none;border:2px solid var(--c)}.lf-ic svg{width:26px;height:26px}',
  '.lf-t h3{font:700 16px/1.5 var(--f-display);margin:0;color:var(--kp-ink)}.lf-t p{margin:0;font-size:13px;color:var(--kp-muted);line-height:1.7}',
  '.lf-m{display:flex;flex-wrap:wrap;gap:6px}.lf-m span{font:600 11.5px var(--f-display);border-radius:10px;padding:2px 9px;background:var(--kp-paper-2);color:var(--kp-ink)}.lf-m .ln{background:var(--kp-ink);color:var(--kp-sign);direction:ltr}',
  '.lf-st{font:700 11px var(--f-display);border-radius:3px;padding:1px 8px;width:fit-content}.lf-st.new{background:#C2352E;color:#fff}.lf-st.found{background:#E3F3EB;color:#1E7F55}.lf-st.claimed,.lf-st.pending{background:#FBEFD9;color:#8A5407}',
  '.lf-mt{height:6px;border-radius:3px;background:var(--kp-paper-2);overflow:hidden}.lf-mt i{display:block;height:100%;background:linear-gradient(90deg,var(--kp-sign),#1E7F55)}',
  '.lf-none{grid-column:1/-1;text-align:center;padding:36px 16px;background:#fff;border:2px dashed var(--kp-line-2);border-radius:16px;display:grid;gap:12px;justify-items:center}.lf-none b{font:700 20px var(--f-display)}.lf-none p{margin:0;color:var(--kp-muted);max-width:420px}',
  '.lf-info{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:32px}',
  '.lf-info div{background:#fff;border:1.5px solid #E6E3DA;border-radius:14px;padding:16px;display:grid;gap:4px}.lf-info b{font:700 15px var(--f-display)}.lf-info span{font-size:13px;color:var(--kp-muted);line-height:1.8}',
  /* sheet */
  '.lf-sh{position:fixed;inset:0;z-index:9000;background:rgba(11,10,34,.7);display:grid;place-items:center;padding:14px;overflow:auto;animation:kp-fade .2s both}@keyframes kp-fade{from{opacity:0}}',
  '.lf-sp{background:#fff;border-radius:20px;border-top:6px solid var(--kp-sign);width:min(560px,100%);max-height:92vh;overflow:auto;position:relative;animation:lf-up .35s var(--kp-ease) both}@keyframes lf-up{from{translate:0 40px;opacity:0}}',
  '.lf-sx{position:absolute;top:12px;left:12px;width:36px;height:36px;border-radius:50%;border:2px solid var(--kp-ink);background:#fff;font-size:18px;cursor:pointer;z-index:2}',
  '.lf-sh-h{padding:20px 22px 6px}.lf-sh-h h2{font:700 21px var(--f-display);margin:0;padding-inline-end:44px}.lf-sh-h p{margin:4px 0 0;color:var(--kp-muted);font-size:13.5px}',
  '.lf-pg{display:flex;gap:6px;padding:10px 22px 0}.lf-pg i{flex:1;height:5px;border-radius:3px;background:var(--kp-line-2)}.lf-pg i.on{background:var(--kp-ink)}.lf-pg i.done{background:var(--kp-sign)}',
  '.lf-sb{padding:14px 22px 22px;display:grid;gap:14px}',
  '.lf-f{display:grid;gap:5px;font-size:.82rem;font-weight:700;color:var(--kp-ink)}.lf-f em{font-style:normal;font-weight:500;color:var(--kp-muted)}',
  '.lf-f input:not([type=checkbox]),.lf-f select,.lf-f textarea{border:1.5px solid var(--kp-line-2);border-radius:10px;padding:11px 13px;font:500 15px var(--f-body);background:#fff;width:100%;box-sizing:border-box;min-height:46px}',
  '.lf-f input:focus,.lf-f select:focus,.lf-f textarea:focus{outline:0;border-color:var(--kp-ink);box-shadow:0 0 0 3px rgba(255,201,60,.5)}',
  '.lf-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
  '.lf-ct{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.lf-ct button{all:unset;box-sizing:border-box;cursor:pointer;display:grid;justify-items:center;gap:5px;padding:10px 4px;border-radius:12px;border:1.5px solid var(--kp-line-2);font:600 12px var(--f-display);color:var(--kp-ink);text-align:center}',
  '.lf-ct svg{width:24px;height:24px}.lf-ct button.on{background:var(--kp-ink);color:var(--kp-sign);border-color:var(--kp-ink)}',
  '.lf-sw{display:flex;gap:8px;flex-wrap:wrap}.lf-sw button{width:34px;height:34px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1.5px var(--kp-line-2);cursor:pointer;padding:0}.lf-sw button.on{box-shadow:0 0 0 3px var(--kp-ink)}',
  '.lf-ac{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap}',
  '.lf-mini{display:grid;gap:8px}.lf-mini button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:12px;align-items:center;border:1.5px solid var(--kp-line-2);border-radius:12px;padding:10px 12px}.lf-mini button:hover{border-color:var(--kp-ink);background:#FFF8E1}.lf-mini b{font:700 14px var(--f-display)}.lf-mini small{color:var(--kp-muted)}',
  '.lf-ok{text-align:center;display:grid;gap:12px;justify-items:center;padding:8px 0}.lf-ok .rf{font:700 30px ui-monospace,Menlo,monospace;letter-spacing:2px;direction:ltr;background:#FFF8E1;border:2px dashed var(--kp-ink);border-radius:12px;padding:8px 20px}',
  '.lf-ok .qr{width:132px;height:132px;background:#fff;padding:8px;border:2px solid var(--kp-ink);border-radius:10px;box-sizing:border-box}.lf-ok .qr svg{display:block;width:100%;height:100%}',
  '.lf-tl{display:grid;gap:0;padding-inline-start:4px}.lf-tl div{position:relative;padding:0 30px 20px 0}.lf-tl div::before{content:"";position:absolute;right:0;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid var(--kp-line-2);box-sizing:border-box}',
  '.lf-tl div::after{content:"";position:absolute;right:7px;top:19px;bottom:0;width:2px;background:var(--kp-line-2)}.lf-tl div:last-child::after{display:none}',
  '.lf-tl div.ok::before{background:#1E7F55;border-color:#1E7F55}.lf-tl div.ok::after{background:#1E7F55}.lf-tl div.now::before{background:var(--kp-sign);border-color:var(--kp-ink);animation:lf-p 1.6s infinite}@keyframes lf-p{50%{box-shadow:0 0 0 6px rgba(255,201,60,.4)}}',
  '.lf-tl b{font:700 15px var(--f-display);display:block}.lf-tl small{color:var(--kp-muted);font-size:12.5px}',
  '.lf-fab{position:fixed;bottom:18px;inset-inline-end:18px;z-index:80;display:none}',
  '@media(max-width:900px){.lf-hg{grid-template-columns:1fr}.lf-radar{max-width:220px;order:-1;margin-bottom:-6px}.lf-cats{grid-template-columns:repeat(4,minmax(0,1fr))}.lf-info{grid-template-columns:1fr}.lf-bar{top:62px}}',
  '@media(max-width:560px){.lf-w{padding-inline:14px}.lf-2{grid-template-columns:1fr}.lf-ct{grid-template-columns:repeat(4,minmax(0,1fr))}.lf-q button{padding:0 14px}.lf-g{grid-template-columns:1fr}.lf-sh{padding:0;align-items:end}.lf-sp{border-radius:20px 20px 0 0;max-height:94vh}}'
  ].join('\n'); document.head.appendChild(css);

  /* ---------- the page ---------- */
  var root = el('main', 'lf'); root.id = 'lfRoot'; hero.parentNode.insertBefore(root, hero);
  root.innerHTML =
    '<section class="lf-hero"><div class="lf-w"><div class="lf-hg"><div>' +
      '<span class="lf-tag">' + ico('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>', '') .replace('class=""', 'width="16" height="16"') + 'المفقودات والموجودات</span>' +
      '<h1>اكتب ما <em>فقدته</em>، ونُريك ما وجدناه</h1><p>كل ما يُنسى في حافلاتنا ومحطاتنا يصل إلى مكتب المفقودات في المرقاب. ابحث أولاً، فإن لم تجد غرضك أبلّغ عنه بثلاث خطوات سريعة ونتواصل معك.</p>' +
      '<form class="lf-q" id="lfForm" role="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="lfSearch" type="search" placeholder="محفظة سوداء، آيفون، مفاتيح سيارة…" autocomplete="off" aria-label="ابحث عن غرضك"><button type="submit">ابحث</button></form>' +
      '<div class="lf-cats" id="lfCats">' + CATS.map(function(c){ return '<button type="button" data-cat="' + c[0] + '" aria-pressed="false">' + ico(c[2]) + c[1] + '</button>'; }).join('') + '</div>' +
      '<div class="lf-fl"><select id="lfLine" aria-label="الخط"></select><div class="lf-chips" id="lfWhen"><button type="button" data-w="all" class="on">كل الوقت</button><button type="button" data-w="1">اليوم وأمس</button><button type="button" data-w="7">آخر أسبوع</button><button type="button" data-w="30">آخر شهر</button></div></div>' +
    '</div><div class="lf-radar" aria-hidden="true"><svg viewBox="0 0 300 300"><defs><linearGradient id="lfg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFC93C" stop-opacity="0"/><stop offset="1" stop-color="#FFC93C" stop-opacity=".55"/></linearGradient></defs>' +
      '<circle class="rg" cx="150" cy="150" r="146"/><circle class="rg" cx="150" cy="150" r="108"/><circle class="rg" cx="150" cy="150" r="70"/><circle class="rg" cx="150" cy="150" r="32"/><path class="rg cx" d="M150 4v292M4 150h292"/>' +
      '<g class="sweep"><path d="M150 150 L150 4 A146 146 0 0 1 252 46 Z" fill="url(#lfg)"/><path d="M150 150V4" stroke="#FFC93C" stroke-width="2"/></g><g id="lfBlips"></g><circle class="me" cx="150" cy="150" r="6"/></svg><div class="lf-rn" id="lfRn"></div></div></div></div></section>' +
    '<div class="lf-bar"><div class="lf-w"><div><b id="lfCount"></b><small id="lfHint"></small></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="lf-btn" id="lfTrack">' + ico('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>') + 'تتبّع بلاغي</button><button type="button" class="lf-btn k" id="lfReport">' + ico('<path d="M12 5v14M5 12h14"/>') + 'أبلّغ عن مفقود</button></div></div></div>' +
    '<section class="lf-main"><div class="lf-w"><div class="lf-g" id="lfGrid"></div>' +
      '<div class="lf-info"><div><b>مكتب المفقودات</b><span>المقر الرئيسي KPTC — المرقاب. من الأحد إلى الخميس، 7 صباحاً حتى 3 عصراً.</span></div><div><b>للاستفسار</b><span>الخط الساخن <b class="num" style="display:inline">1880001</b>. اذكر رقم بلاغك عند الاتصال.</span></div><div><b>عند الاستلام</b><span>أحضر هويتك الشخصية. نطلب منك وصف علامة تثبت ملكيتك للغرض.</span></div></div>' +
    '</div></section>';

  /* line selector */
  var sel = $('#lfLine'); function fillLines(){ var cur = sel.value; sel.innerHTML = '<option value="">كل الخطوط</option>' + lines().map(function(l){ return '<option value="' + E(l) + '">خط ' + E(l) + '</option>'; }).join(''); sel.value = cur; }
  fillLines();

  /* ---------- radar ---------- */
  function hash(s, m){ var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % m; }
  function radar(hits){
    var g = $('#lfBlips'), set = {}; hits.forEach(function(x){ set[x.it.id] = 1; }); var filtering = !!(S.q || S.cat || S.line || S.when !== 'all');
    g.innerHTML = items().map(function(it){ var a = hash(it.id, 360) * Math.PI / 180, r = 26 + hash(it.id + 'r', 112), cx = 150 + r * Math.cos(a), cy = 150 + r * Math.sin(a), on = set[it.id], cls = 'bl' + (filtering ? (on ? ' hit' : ' off') : '');
      return '<circle class="' + cls + '" data-id="' + it.id + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (on && filtering ? 6 : 4.6) + '" fill="' + (it.status === 'claimed' ? '#8E8CB8' : it.status === 'new' ? '#FF6B5E' : '#FFC93C') + '"><title>' + E(it.name) + '</title></circle>'; }).join('');
    $('#lfRn').innerHTML = '<b>' + hits.length + '</b> ' + (filtering ? 'مطابق' : 'غرضاً في المخزن');
  }
  $('#lfBlips').addEventListener('click', function(e){ var c = e.target.closest('[data-id]'); if (!c) return; open(c.getAttribute('data-id')); });

  /* ---------- results ---------- */
  var STL = {new:'جديد', found:'موجود', claimed:'تمت المطالبة', pending:'قيد المراجعة'};
  function tag(x, i){
    var it = x.it, c = CAT[it.type] || CAT['أخرى'], filtering = !!(S.q || S.cat), pct = Math.min(100, Math.round(x.sc / 12 * 100));
    return '<button type="button" class="lf-t' + (it.status === 'claimed' ? ' cl' : '') + (filtering && i === 0 && x.sc > 6 ? ' hot' : '') + '" data-id="' + E(it.id) + '" style="--i:' + Math.min(i, 14) + ';--c:' + E(it.color) + '"><div class="lf-ti"><span class="lf-ic">' + ico(c[2]) + '</span><div><h3>' + E(it.name) + '</h3><span class="lf-st ' + it.status + '">' + STL[it.status] + '</span></div></div><p>' + E(it.desc) + '</p>' +
      '<div class="lf-m"><span class="ln">خط ' + E(it.bus) + '</span><span>' + E(it.route) + '</span><span>' + ago(it.d) + '</span></div>' + (filtering && S.q ? '<div class="lf-mt" title="درجة التطابق"><i style="width:' + pct + '%"></i></div>' : '') + '</button>';
  }
  function render(){
    var R = results(), g = $('#lfGrid'), filtering = !!(S.q || S.cat || S.line || S.when !== 'all');
    $('#lfCount').textContent = filtering ? R.length + ' نتيجة' : items().length + ' غرضاً في المخزن';
    $('#lfHint').textContent = filtering ? (S.q ? 'الأقرب إلى وصفك أولاً' : 'مرتّبة بالأحدث') : 'مرتّبة بالأحدث. ابدأ بالكتابة للبحث';
    g.innerHTML = R.length ? R.map(function(x, i){ return tag(x, i); }).join('') :
      '<div class="lf-none"><b>لا غرض يطابق وصفك الآن</b><p>قد لا يكون وصل إلينا بعد. أبلّغ عن مفقودك، وإن وصلنا غرض يطابقه تواصلنا معك فوراً.</p><button type="button" class="lf-btn k" data-do="report">أبلّغ عن مفقود</button></div>';
    radar(R); [].forEach.call($('#lfCats').children, function(b){ var on = b.getAttribute('data-cat') === S.cat; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    [].forEach.call($('#lfWhen').children, function(b){ b.classList.toggle('on', b.getAttribute('data-w') === S.when); });
  }
  var inT = null; $('#lfSearch').addEventListener('input', function(e){ clearTimeout(inT); inT = setTimeout(function(){ S.q = e.target.value; var c = catOf(S.q); if (c && !S.cat) {} render(); }, 120); });
  $('#lfForm').addEventListener('submit', function(e){ e.preventDefault(); S.q = $('#lfSearch').value; render(); $('#lfGrid').scrollIntoView({behavior:'smooth', block:'start'}); });
  $('#lfCats').addEventListener('click', function(e){ var b = e.target.closest('[data-cat]'); if (!b) return; S.cat = S.cat === b.getAttribute('data-cat') ? '' : b.getAttribute('data-cat'); render(); });
  sel.addEventListener('change', function(){ S.line = sel.value; render(); });
  $('#lfWhen').addEventListener('click', function(e){ var b = e.target.closest('[data-w]'); if (!b) return; S.when = b.getAttribute('data-w'); render(); });
  $('#lfGrid').addEventListener('click', function(e){ var d = e.target.closest('[data-do="report"]'); if (d) return report(); var t = e.target.closest('[data-id]'); if (t) open(t.getAttribute('data-id')); });
  $('#lfReport').onclick = function(){ report(); }; $('#lfTrack').onclick = function(){ track(); };

  /* ---------- sheets ---------- */
  var cur = null;
  function sheet(html, onclose){
    close(); var o = el('div', 'lf-sh'); o.innerHTML = '<div class="lf-sp" role="dialog" aria-modal="true"><button type="button" class="lf-sx" aria-label="إغلاق">×</button>' + html + '</div>'; document.body.appendChild(o); document.body.style.overflow = 'hidden'; cur = {o:o, cb:onclose};
    o.addEventListener('mousedown', function(e){ if (e.target === o) close(); }); o.querySelector('.lf-sx').onclick = close; return o.querySelector('.lf-sp');
  }
  function close(){ if (cur){ cur.o.remove(); document.body.style.overflow = ''; if (cur.cb) cur.cb(); cur = null; } }
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  function check(root){ return window.KPReq ? KPReq.check(root) : true; }
  function qrSvg(t){ try { var q = window.qrcode(0, 'M'); q.addData(t); q.make(); return q.createSvgTag({cellSize:4, margin:0, scalable:true}); } catch(e){ return ''; } }
  var u = function(){ return K.user(); };

  /* a found item: the claim sheet */
  function open(id){
    var it = items().filter(function(x){ return x.id === id; })[0]; if (!it) return; var c = CAT[it.type] || CAT['أخرى'], usr = u();
    if (it.status === 'claimed') return toast('تمت المطالبة بهذا الغرض. إن كان غرضك فاتصل بالخط الساخن 1880001');
    var sp = sheet('<div class="lf-sh-h"><h2>' + E(it.name) + '</h2><p>خط ' + E(it.bus) + ' · ' + E(it.route) + ' · ' + ago(it.d) + '</p></div><div class="lf-sb"><div class="lf-ti" style="--c:' + E(it.color) + '"><span class="lf-ic">' + ico(c[2]) + '</span><p style="margin:0;color:var(--kp-muted);font-size:14px;line-height:1.8">' + E(it.desc) + '</p></div>' +
      '<div class="lf-f" style="background:#FFF8E1;border:1.5px dashed var(--kp-ink);border-radius:12px;padding:12px 14px;font-weight:500;line-height:1.8">لحماية أصحاب الأغراض لا نعرض كل التفاصيل. صف لنا علامة تثبت أنه غرضك، وسنتحقق منها عند الاستلام.</div>' +
      '<label class="lf-f">علامة مميزة أو محتويات تثبت ملكيتك<textarea id="lfcProof" rows="3" placeholder="مثال: بداخلها بطاقة بنك باسم… وصورة عائلية"></textarea></label>' +
      '<div class="lf-2"><label class="lf-f">الاسم<input id="lfcName" value="' + E(usr ? usr.name : '') + '" autocomplete="name"></label><label class="lf-f">رقم الجوال<input id="lfcPhone" inputmode="tel" dir="ltr" value="' + E(usr ? usr.phone : '') + '" autocomplete="tel"></label></div>' +
      '<div class="lf-ac"><button type="button" class="lf-btn" data-a="x">إلغاء</button><button type="button" class="lf-btn k" data-a="go">أرسل طلب المطالبة</button></div></div>');
    sp.addEventListener('click', function(e){ var b = e.target.closest('[data-a]'); if (!b) return; if (b.getAttribute('data-a') === 'x') return close();
      if (!check(sp)) return; var ref = 'CL-' + Math.floor(Math.random() * 900000 + 100000), nm = $('#lfcName', sp).value.trim(), ph = K.latin($('#lfcPhone', sp).value).replace(/\D/g, '');
      var row = K.addBooking({id:ref, type:'مفقودات', page:'lost', title:'مطالبة بغرض: ' + it.name + ' — خط ' + it.bus, amount:0, status:'قيد المعالجة', phone:ph, name:nm, proof:$('#lfcProof', sp).value.trim(), foundId:it.id});
      it.status = 'pending'; K.save(); done(sp, 'وصل طلب المطالبة', ref, 'سنراجع وصفك ونتصل بك على ' + ph + '. أحضر هويتك لمكتب المرقاب عند الاستلام.');
    });
  }
  function done(sp, title, ref, text){
    sp.innerHTML = '<button type="button" class="lf-sx" aria-label="إغلاق">×</button><div class="lf-sb lf-ok"><h2 style="font:700 22px var(--f-display);margin:8px 0 0">' + E(title) + '</h2><div class="rf" id="lfRef">' + E(ref) + '</div><div class="qr">' + qrSvg(ref) + '</div><p style="margin:0;color:var(--kp-muted);line-height:1.9;font-size:14px">' + E(text) + '<br>احتفظ برقم البلاغ لمتابعته.</p><div class="lf-ac" style="justify-content:center"><button type="button" class="lf-btn" data-a="copy">انسخ الرقم</button><button type="button" class="lf-btn k" data-a="track">تتبّع الآن</button></div></div>';
    sp.querySelector('.lf-sx').onclick = close;
    sp.querySelector('[data-a="copy"]').onclick = function(){ try { navigator.clipboard.writeText(ref).then(function(){ toast('نُسخ الرقم'); }); } catch(e){ toast('الرقم: ' + ref); } };
    sp.querySelector('[data-a="track"]').onclick = function(){ track(ref); };
  }

  /* reporting a loss: three short steps, with matches offered before the last one */
  function report(){
    var st = {step:1, d:{cat:'', color:'', desc:'', line:S.line, date:K.today(), time:'', from:'', to:'', name:u() ? u().name : '', phone:u() ? u().phone : '', email:u() ? (u().email || '') : '', photo:''}};
    var sp = sheet('', null);
    function paint(){
      var d = st.d, tp = '';
      if (st.step === 1) tp = '<div class="lf-sh-h"><h2>ما الذي فقدته؟</h2><p>اختر النوع وصف الغرض. نبحث لك فوراً.</p></div><div class="lf-pg"><i class="on"></i><i></i><i></i></div><div class="lf-sb"><div class="lf-f">نوع الغرض<div class="lf-ct" id="lfRc">' + CATS.map(function(c){ return '<button type="button" data-c="' + c[0] + '" class="' + (d.cat === c[0] ? 'on' : '') + '">' + ico(c[2]) + c[1] + '</button>'; }).join('') + '</div><input type="hidden" id="lfCat" value="' + E(d.cat) + '"></div>' +
        '<label class="lf-f">وصف الغرض<textarea id="lfDesc" rows="3" placeholder="مثال: محفظة جلد سوداء فيها بطاقات بنك">' + E(d.desc) + '</textarea></label><div class="lf-f">اللون <em>(اختياري)</em><div class="lf-sw" id="lfRw">' + COLORS.map(function(c){ return '<button type="button" data-w="' + c[0] + '" title="' + c[0] + '" style="background:' + c[1] + '" class="' + (d.color === c[0] ? 'on' : '') + '"></button>'; }).join('') + '</div></div><div class="lf-ac"><span></span><button type="button" class="lf-btn k" data-a="n1">التالي</button></div></div>';
      else if (st.step === 15){ var M = results2(d); tp = '<div class="lf-sh-h"><h2>وجدنا ' + M.length + ' ' + (M.length > 2 ? 'أغراض' : M.length === 2 ? 'غرضين' : 'غرضاً') + ' قريبة من وصفك</h2><p>هل أحدها غرضك؟ اضغطه لتطالب به مباشرة.</p></div><div class="lf-sb"><div class="lf-mini">' + M.map(function(x){ var c = CAT[x.it.type] || CAT['أخرى']; return '<button type="button" data-id="' + E(x.it.id) + '"><span class="lf-ic" style="--c:' + E(x.it.color) + ';width:42px;height:42px">' + ico(c[2]) + '</span><span><b>' + E(x.it.name) + '</b><br><small>خط ' + E(x.it.bus) + ' · ' + ago(x.it.d) + '</small></span></button>'; }).join('') + '</div><div class="lf-ac"><button type="button" class="lf-btn" data-a="b1">رجوع</button><button type="button" class="lf-btn k" data-a="skip">ليس غرضي، أكمل البلاغ</button></div></div>'; }
      else if (st.step === 2) tp = '<div class="lf-sh-h"><h2>أين ومتى؟</h2><p>كل ما تذكره يساعدنا على الوصول لغرضك أسرع.</p></div><div class="lf-pg"><i class="done"></i><i class="on"></i><i></i></div><div class="lf-sb"><div class="lf-2"><label class="lf-f">رقم الخط أو الحافلة<select id="lfLineR"><option value="">لا أذكر</option>' + lines().map(function(l){ return '<option value="' + E(l) + '"' + (d.line === l ? ' selected' : '') + '>خط ' + E(l) + '</option>'; }).join('') + '</select></label><label class="lf-f">التاريخ<input id="lfDate" type="date" value="' + E(d.date) + '" max="' + K.today() + '"></label></div><div class="lf-2"><label class="lf-f">الوقت التقريبي <em>(اختياري)</em><input id="lfTime" type="time" value="' + E(d.time) + '"></label><label class="lf-f">من محطة <em>(اختياري)</em><input id="lfFrom" value="' + E(d.from) + '" placeholder="مثال: المالية"></label></div><label class="lf-f">إلى محطة <em>(اختياري)</em><input id="lfTo" value="' + E(d.to) + '" placeholder="مثال: السالمية"></label><div class="lf-ac"><button type="button" class="lf-btn" data-a="b2">رجوع</button><button type="button" class="lf-btn k" data-a="n2">التالي</button></div></div>';
      else tp = '<div class="lf-sh-h"><h2>كيف نتواصل معك؟</h2><p>نتصل بك فور وصول غرض يطابق وصفك.</p></div><div class="lf-pg"><i class="done"></i><i class="done"></i><i class="on"></i></div><div class="lf-sb"><div class="lf-2"><label class="lf-f">الاسم<input id="lfName" value="' + E(d.name) + '" autocomplete="name"></label><label class="lf-f">رقم الجوال<input id="lfPhone" inputmode="tel" dir="ltr" value="' + E(d.phone) + '" autocomplete="tel"></label></div><label class="lf-f">البريد الإلكتروني <em>(اختياري)</em><input id="lfEmail" type="email" dir="ltr" value="' + E(d.email) + '" autocomplete="email"></label><div class="lf-f">صورة تشبه الغرض <em>(اختياري)</em><input id="lfPhoto" type="file" accept="image/*"></div><div class="lf-ac"><button type="button" class="lf-btn" data-a="b3">رجوع</button><button type="button" class="lf-btn k" data-a="send">أرسل البلاغ</button></div></div>';
      sp.innerHTML = '<button type="button" class="lf-sx" aria-label="إغلاق">×</button>' + tp; sp.querySelector('.lf-sx').onclick = close; sp.scrollTop = 0;
    }
    function results2(d){ var keep = {q:S.q, cat:S.cat, line:S.line, when:S.when}; S.q = d.desc; S.cat = d.cat; S.line = ''; S.when = 'all'; var R = results().filter(function(x){ return x.it.status !== 'claimed' && x.sc >= 4; }).slice(0, 3); S.q = keep.q; S.cat = keep.cat; S.line = keep.line; S.when = keep.when; return R; }
    function grab(){ var d = st.d, g = function(i){ var e = $(i, sp); return e ? e.value : null; }; if (st.step === 1){ d.cat = g('#lfCat') || d.cat; d.desc = g('#lfDesc') || ''; } if (st.step === 2){ d.line = g('#lfLineR') || ''; d.date = g('#lfDate') || d.date; d.time = g('#lfTime') || ''; d.from = g('#lfFrom') || ''; d.to = g('#lfTo') || ''; } if (st.step === 3){ d.name = g('#lfName') || ''; d.phone = K.latin(g('#lfPhone') || ''); d.email = g('#lfEmail') || ''; } }
    paint();
    sp.addEventListener('click', function(e){
      var c = e.target.closest('[data-c]'); if (c){ grab(); st.d.cat = c.getAttribute('data-c'); paint(); return; }
      var w = e.target.closest('[data-w]'); if (w){ grab(); st.d.color = st.d.color === w.getAttribute('data-w') ? '' : w.getAttribute('data-w'); paint(); return; }
      var mi = e.target.closest('.lf-mini [data-id]'); if (mi){ var id = mi.getAttribute('data-id'); close(); return open(id); }
      var b = e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a'); grab();
      if (a === 'n1'){ if (!st.d.cat){ toast('اختر نوع الغرض أولاً'); return; } if (!check(sp)) return; st.step = results2(st.d).length ? 15 : 2; paint(); }
      else if (a === 'skip') { st.step = 2; paint(); } else if (a === 'b1') { st.step = 1; paint(); }
      else if (a === 'n2'){ st.step = 3; paint(); } else if (a === 'b2'){ st.step = 1; paint(); } else if (a === 'b3'){ st.step = 2; paint(); }
      else if (a === 'send'){ if (!check(sp)) return; sendReport(sp, st.d); }
    });
    sp.addEventListener('change', function(e){ if (e.target.id !== 'lfPhoto') return; var f = e.target.files[0]; if (!f || !/^image\//.test(f.type)) return; var r = new FileReader(); r.onload = function(){ var im = new Image(); im.onload = function(){ var k = Math.min(1, 320 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); st.d.photo = cv.toDataURL('image/jpeg', .7); toast('أُرفقت الصورة'); }; im.src = r.result; }; r.readAsDataURL(f); });
  }
  function sendReport(sp, d){
    var ref = 'LF-' + Math.floor(Math.random() * 900000 + 100000), c = CAT[d.cat] || CAT['أخرى'];
    K.addBooking({id:ref, type:'مفقودات', page:'lost', title:'بلاغ مفقود: ' + c[1] + (d.line ? ' — خط ' + d.line : ''), amount:0, status:'قيد المعالجة', phone:K.latin(d.phone).replace(/\D/g, ''), name:d.name, item:{cat:d.cat, color:d.color, desc:d.desc, line:d.line, date:d.date, time:d.time, from:d.from, to:d.to, email:d.email, photo:d.photo}});
    done(sp, 'وصل بلاغك', ref, 'سنتواصل معك عبر ' + K.latin(d.phone) + ' فور وصول غرض يطابق وصفك.');
  }

  /* following a report: from the real records */
  var STAGES = [['استُلم البلاغ', 'سجّلنا بلاغك وسلّمناه لمكتب المفقودات'], ['قيد البحث', 'نطابق وصفك مع ما يصل إلى المكتب كل يوم'], ['وُجد الغرض', 'وجدنا غرضاً يطابق وصفك، وسنتصل بك'], ['تم التسليم', 'استلمت غرضك. نتمنى لك يوماً سعيداً']];
  function stage(s){ return /تسليم|مكتمل/.test(s) ? 4 : /وُجد|جاهز/.test(s) ? 3 : /بحث|مراجعة/.test(s) ? 2 : 1; }
  function track(pref){
    var sp = sheet('<div class="lf-sh-h"><h2>تتبّع بلاغك</h2><p>اكتب رقم البلاغ، أو رقم الجوال الذي سجّلت به.</p></div><div class="lf-sb"><form class="lf-q" id="lfTf" style="border-width:2px;box-shadow:none"><input id="lfTi" dir="ltr" placeholder="LF-000000  أو  55501234" aria-label="رقم البلاغ أو الجوال" value="' + E(pref || '') + '"><button type="submit">تتبّع</button></form><div id="lfTo2"></div></div>');
    function go(){
      var v = K.latin($('#lfTi', sp).value).trim().toUpperCase(), box = $('#lfTo2', sp); if (!v){ box.innerHTML = ''; return; }
      var digits = v.replace(/\D/g, ''), L = K.db().bookings.filter(function(b){ return b.page === 'lost' && (b.id.toUpperCase() === v || (digits.length >= 8 && b.phone === digits)); });
      if (!L.length){ box.innerHTML = '<p style="color:var(--kp-muted);line-height:1.9">لا بلاغ بهذا الرقم على هذا الجهاز. تأكد من الرقم، أو اتصل بالخط الساخن <b class="num">1880001</b>.</p>'; return; }
      box.innerHTML = L.map(function(b){ var s = stage(b.status); return '<div style="border:1.5px solid var(--kp-line-2);border-radius:14px;padding:14px 16px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px"><b style="font:700 15px var(--f-display)">' + E(b.title) + '</b><span class="num" style="color:var(--kp-muted);font-size:12.5px">' + E(b.id) + ' · ' + K.date(b.d) + '</span></div><div class="lf-tl">' + STAGES.map(function(x, i){ return '<div class="' + (i + 1 < s ? 'ok' : i + 1 === s ? (s === 4 ? 'ok' : 'now') : '') + '"><b>' + x[0] + '</b><small>' + x[1] + '</small></div>'; }).join('') + '</div></div>'; }).join('');
    }
    $('#lfTf', sp).addEventListener('submit', function(e){ e.preventDefault(); go(); }); if (pref) go();
  }

  K.onChange(function(){ fillLines(); render(); });
  render();
  // /?q=محفظة from the assistant or the home page opens straight into a search
  try { var qs = new URLSearchParams(location.search).get('q'); if (qs){ $('#lfSearch').value = qs; S.q = qs; render(); } } catch(e){}
})();
