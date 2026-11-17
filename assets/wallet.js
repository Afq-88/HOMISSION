/* KPTC — "add to phone wallet" sheet, shared by the staff ID and the customer membership card.
   KPWallet.open({kind:'staff'|'member', id, name, title, dept, since, tier, plan, until, no, theme, png:function(cb)})
   What really adds a pass to Apple Wallet / Google Wallet has to be signed with the company's own certificates, which cannot live in a web page.
   So the sheet is honest about it:
     - staff:  signed files prepared by the administrator with tools/wallet_pass.py and published in /passes (static, free);
     - member: a small signing service (worker/wallet-worker.js, free on Cloudflare Workers) whose address is set in the studio;
     - always available: save the card as a picture, or put the page on the home screen. */
(function(){
  var K = window.KPTC, F = '"Noto Kufi Arabic","IBM Plex Sans Arabic",sans-serif';
  function E(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/i.test(navigator.userAgent);
  var CSS = [
    '.kw-bg{position:fixed;inset:0;z-index:2147482000;background:rgba(14,13,44,.62);display:grid;align-items:end;justify-items:center;animation:kwf .25s}@keyframes kwf{from{opacity:0}}',
    '.kw{width:min(520px,100%);max-height:94vh;overflow:auto;background:#FAF9F5;border-radius:26px 26px 0 0;padding:18px 20px 26px;animation:kwu .35s cubic-bezier(.2,.9,.25,1);font-family:' + F + ';color:#14133A}@keyframes kwu{from{transform:translateY(60px)}}',
    '@media(min-width:700px){.kw-bg{align-items:center}.kw{border-radius:26px}}',
    '.kw-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.kw-h h3{font:800 18px ' + F + '}.kw-x{width:34px;height:34px;border-radius:50%;border:0;background:#EDEBE2;font-size:19px;cursor:pointer;color:#14133A}',
    '.kw-pass{position:relative;border-radius:20px;padding:18px 20px 16px;color:#fff;overflow:hidden;box-shadow:0 22px 34px -20px rgba(20,19,58,.8);margin:4px 8px 18px;display:grid;gap:14px}',
    '.kw-pass::before{content:"";position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'420\' height=\'240\' fill=\'none\' stroke=\'%23fff\' stroke-opacity=\'.1\' stroke-width=\'3\'%3E%3Cpath d=\'M-10 190 C60 190 80 120 150 120 S250 180 310 130 S390 50 440 60\'/%3E%3Ccircle cx=\'150\' cy=\'120\' r=\'8\'/%3E%3Ccircle cx=\'310\' cy=\'130\' r=\'8\'/%3E%3C/svg%3E") center/cover}',
    '.kw-pass::after{content:"";position:absolute;inset-inline-start:-60px;bottom:-90px;width:180px;height:180px;border-radius:50%;border:28px solid rgba(255,201,60,.14)}',
    '.kw-pass>*{position:relative;z-index:1}',
    '.kw-pt{display:flex;justify-content:space-between;align-items:center;gap:10px}.kw-lg{display:flex;align-items:center;gap:9px;font:800 15px ' + F + ';letter-spacing:.22em;direction:ltr}.kw-lg i{width:28px;height:28px;border-radius:9px;background:#FFC93C;color:#14133A;display:grid;place-items:center}.kw-lg svg{width:16px;height:16px}',
    '.kw-hd{text-align:end;font-size:11px;color:#CFCDEA;line-height:1.5}.kw-hd b{display:block;color:#fff;font-size:13px}',
    '.kw-pm{display:flex;align-items:center;gap:13px;min-width:0}.kw-av{flex:none;width:58px;height:58px;border-radius:50%;overflow:hidden;background:#FFC93C;display:grid;place-items:center;font:800 24px ' + F + ';color:#14133A;box-shadow:0 0 0 3px rgba(255,255,255,.9)}.kw-av img{width:100%;height:100%;object-fit:cover}',
    '.kw-pm h4{font:800 20px/1.35 ' + F + ';overflow-wrap:anywhere}.kw-pm p{font-size:12.5px;color:#FFC93C;font-weight:700}',
    '.kw-pf{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;border-top:1px dashed rgba(255,255,255,.3);padding-top:11px}.kw-pf small{display:block;font-size:10.5px;color:#CFCDEA}.kw-pf b{display:block;font:700 13.5px ' + F + ';direction:ltr;unicode-bidi:isolate;text-align:start;overflow-wrap:anywhere}',
    '.kw-pass.gold{color:#14133A}.kw-pass.gold .kw-hd,.kw-pass.gold .kw-pf small,.kw-pass.gold .kw-hd b,.kw-pass.gold .kw-pm p{color:#14133A}.kw-pass.gold::before{filter:invert(1);opacity:.5}',
    '.kw-b{display:grid;gap:10px}',
    '.kw-btn{display:flex;align-items:center;justify-content:center;gap:11px;width:100%;border:0;border-radius:14px;padding:13px 16px;font:700 15px ' + F + ';cursor:pointer;text-decoration:none;transition:.15s;position:relative}',
    '.kw-btn svg{width:22px;height:22px;flex:none}.kw-ap{background:#000;color:#fff}.kw-gg{background:#fff;color:#14133A;box-shadow:inset 0 0 0 1.5px #CFCCBF}',
    '.kw-btn[disabled],.kw-btn.off{opacity:.55;cursor:default}.kw-btn small{display:block;font:500 11px ' + F + ';opacity:.8;margin-top:1px}',
    '.kw-btn span{text-align:start;line-height:1.35}',
    '.kw-or{display:flex;align-items:center;gap:10px;color:#6E6C85;font-size:12px;margin:14px 0 10px}.kw-or::before,.kw-or::after{content:"";flex:1;height:1px;background:#DAD7CA}',
    '.kw-fb{display:grid;grid-template-columns:1fr 1fr;gap:10px}.kw-fb button{border:1.5px solid #CFCCBF;background:#fff;border-radius:12px;padding:11px 8px;font:700 13px ' + F + ';cursor:pointer;color:#2E2C78}.kw-fb button:hover{border-color:#2E2C78}',
    '.kw-note{margin-top:12px;font-size:12.5px;line-height:1.75;color:#4C4A6B;background:#fff;border:1px dashed #CFCCBF;border-radius:12px;padding:10px 13px}.kw-note b{color:#14133A}',
    '.kw-note ol{margin:6px 0 0;padding-inline-start:20px}'
  ].join('\n');
  function css(){ if (document.getElementById('kw-css')) return; var s = document.createElement('style'); s.id = 'kw-css'; s.textContent = CSS; document.head.appendChild(s); }
  var APPLE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.600-2.800-1.800-3.400-1.800-1.400-.1-2.800.9-3.500.9s-1.800-.8-3-.8C6.900 7.400 5.500 8.300 4.700 9.700c-1.700 2.900-.4 7.200 1.200 9.600.8 1.200 1.700 2.500 3 2.400 1.200 0 1.600-.8 3-.8s1.800.8 3 .8c1.300 0 2.100-1.200 2.900-2.300.9-1.300 1.300-2.600 1.300-2.700-.1 0-2.600-1-2.700-4.100zM14 5.500c.600-.8 1.100-1.900.9-3-.9 0-2.100.6-2.700 1.400-.6.700-1.100 1.800-1 2.900 1.100.1 2.200-.5 2.800-1.300z"/></svg>';
  var GOOG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22 12.2c0-.7-.1-1.400-.2-2H12v3.900h5.600a4.800 4.800 0 0 1-2.100 3.100v2.600h3.400c2-1.800 3.100-4.500 3.100-7.600z"/><path fill="#34A853" d="M12 22c2.800 0 5.200-.9 6.900-2.500l-3.400-2.600c-.9.600-2.100 1-3.500 1-2.700 0-5-1.800-5.800-4.300H2.700v2.700A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.200 13.600a6 6 0 0 1 0-3.800V7.100H2.700a10 10 0 0 0 0 9.200z"/><path fill="#EA4335" d="M12 6c1.500 0 2.900.5 4 1.600l3-3A10 10 0 0 0 2.700 7.100l3.500 2.700C7 7.800 9.300 6 12 6z"/></svg>';
  var PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  var THEME = {staff: 'linear-gradient(140deg,#1b1950,#2E2C78 55%,#3d3a96)', base: 'linear-gradient(140deg,#2E2C78,#1d1b57)', blue: 'linear-gradient(140deg,#3a37a0,#2E2C78 45%,#171548)', gold: 'linear-gradient(140deg,#FFE08A,#FFC93C 45%,#E8A800)', corp: 'linear-gradient(140deg,#25243f,#101028)'};

  function exists(url){ return fetch(url, {method: 'HEAD', cache: 'no-store'}).then(function(r){ return r.ok; }, function(){ return false; }); }
  function walletCfg(){ var s = K && K.site ? K.site() : {}; return s.wallet || {}; }

  function sheet(o){
    css();
    var theme = o.kind === 'staff' ? 'staff' : (o.tier || 'base'), gold = theme === 'gold';
    var photo = o.photoUrl ? '<img src="' + o.photoUrl + '" alt="">' : E(String(o.name || '?').trim().charAt(0));
    var fields = o.kind === 'staff' ? [['الرقم الوظيفي', o.id], ['في الخدمة منذ', o.since || '—']] : [['رقم العضوية', o.no || '—'], ['صالحة حتى', o.until || '—']];
    var hd = o.kind === 'staff' ? '<b>هوية موظف</b>' + E(o.dept || '') : '<b>' + E(o.tierName || 'عضوية KPTC') + '</b>' + E(o.plan || '');
    var bg = document.createElement('div'); bg.className = 'kw-bg'; bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', 'إضافة إلى المحفظة');
    bg.innerHTML = '<div class="kw"><div class="kw-h"><h3>أضف بطاقتك إلى محفظة الجوال</h3><button type="button" class="kw-x" aria-label="إغلاق">×</button></div>' +
      '<div class="kw-pass' + (gold ? ' gold' : '') + '" style="background:' + THEME[theme] + '"><div class="kw-pt"><span class="kw-lg"><i>' + PIN + '</i>KPTC</span><span class="kw-hd">' + hd + '</span></div>' +
      '<div class="kw-pm"><div class="kw-av">' + photo + '</div><div style="min-width:0"><h4>' + E(o.name) + '</h4><p>' + E(o.kind === 'staff' ? (o.title || 'موظف') : (o.plan || 'عضو')) + '</p></div></div>' +
      '<div class="kw-pf">' + fields.map(function(f){ return '<div><small>' + f[0] + '</small><b>' + E(f[1]) + '</b></div>'; }).join('') + '</div></div>' +
      '<div class="kw-b" id="kwB"></div><div class="kw-or">أو بلا أي إعداد</div><div class="kw-fb"><button type="button" data-k="png">احفظها كصورة في جوالك</button><button type="button" data-k="home">أضفها للشاشة الرئيسية</button></div><div id="kwN"></div></div>';
    document.body.appendChild(bg); document.body.style.overflow = 'hidden';
    function close(){ bg.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc); }
    function esc(e){ if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc);
    bg.addEventListener('click', function(e){ if (e.target === bg || e.target.closest('.kw-x')) close(); });
    var note = bg.querySelector('#kwN');
    function say(h){ note.innerHTML = '<div class="kw-note">' + h + '</div>'; }
    var B = bg.querySelector('#kwB');
    var apple = document.createElement('button'), goog = document.createElement('button');
    apple.type = goog.type = 'button';
    apple.className = 'kw-btn kw-ap off'; apple.innerHTML = APPLE + '<span>أضف إلى Apple Wallet<small>جارٍ التحقق…</small></span>';
    goog.className = 'kw-btn kw-gg off'; goog.innerHTML = GOOG + '<span>أضف إلى Google Wallet<small>جارٍ التحقق…</small></span>';
    (ios ? [apple, goog] : [goog, apple]).forEach(function(b){ B.appendChild(b); });
    function state(b, ok, sub){ b.classList.toggle('off', !ok); b.querySelector('small').textContent = sub; b.__ok = ok; }

    /* what is really available */
    var cfg = walletCfg();
    if (o.kind === 'staff'){
      var base = new URL('../passes/', location.href).href;
      exists(base + encodeURIComponent(o.id) + '.pkpass').then(function(ok){ apple.__url = base + encodeURIComponent(o.id) + '.pkpass'; state(apple, ok, ok ? 'جاهزة لجوال آيفون' : 'لم تُجهَّز بعد لحسابك'); });
      fetch(base + 'google.json', {cache: 'no-store'}).then(function(r){ return r.ok ? r.json() : {}; }, function(){ return {}; }).then(function(m){ var u = m && m[o.id]; goog.__url = u; state(goog, !!u, u ? 'جاهزة لجوال أندرويد' : 'لم تُجهَّز بعد لحسابك'); });
    } else {
      state(apple, false, 'تحتاج شهادة Apple Developer');
      if (cfg.worker){ state(goog, true, 'تُنشأ لحظة الضغط'); } else state(goog, false, 'تحتاج خدمة التوقيع');
    }
    apple.addEventListener('click', function(){
      if (apple.__ok && apple.__url){ location.href = apple.__url; return; }
      say(o.kind === 'staff' ? '<b>Apple Wallet:</b> لا يقبل آيفون إلا بطاقة موقّعة بشهادة الشركة (حساب Apple Developer مدفوع). لم تُجهَّز بطاقتك بعد. اطلب من إدارة النظام تجهيزها، وتكفيك الآن الصورة أو الشاشة الرئيسية.' : '<b>Apple Wallet:</b> يحتاج توقيعاً بشهادة Apple Developer المدفوعة (99 دولاراً سنوياً)، ولا يمكن تجاوز ذلك. بطاقتك متاحة الآن كصورة أو على الشاشة الرئيسية.');
    });
    goog.addEventListener('click', function(){
      if (!goog.__ok){ say(o.kind === 'staff' ? '<b>Google Wallet:</b> لم تُجهَّز بطاقتك بعد. اطلب من إدارة النظام تجهيزها، وتكفيك الآن الصورة أو الشاشة الرئيسية.' : '<b>Google Wallet:</b> يحتاج خدمة توقيع صغيرة مجانية (Cloudflare Workers) وحساب Google Wallet API. تُضبط من مركز الإدارة ← إعدادات عامة ← المحفظة الرقمية. بطاقتك متاحة الآن كصورة أو على الشاشة الرئيسية.'); return; }
      if (goog.__url){ location.href = goog.__url; return; }
      goog.querySelector('small').textContent = 'جارٍ إنشاء البطاقة…';
      var q = new URLSearchParams({kind: 'member', id: o.id, name: o.name, tier: o.tierName || '', plan: o.plan || '', no: o.no || '', until: o.until || ''});
      fetch(cfg.worker + (cfg.worker.indexOf('?') > -1 ? '&' : '?') + q.toString()).then(function(r){ return r.json(); }).then(function(j){ if (j && j.url) location.href = j.url; else throw 0; }).catch(function(){ goog.querySelector('small').textContent = 'تعذّر الإنشاء'; say('تعذّر الاتصال بخدمة التوقيع. جرّب لاحقاً أو احفظ بطاقتك كصورة.'); });
    });
    bg.querySelector('.kw-fb').addEventListener('click', function(e){
      var b = e.target.closest('[data-k]'); if (!b) return;
      if (b.getAttribute('data-k') === 'png'){ if (o.png) o.png(); else say('تعذّر حفظ الصورة.'); return; }
      say(ios ? '<b>على آيفون:</b><ol><li>افتح هذه الصفحة في سفاري.</li><li>اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».</li><li>تفتح بطاقتك بملء الشاشة بضغطة من الشاشة الرئيسية.</li></ol>' : android ? '<b>على أندرويد (كروم):</b><ol><li>اضغط قائمة النقاط الثلاث أعلى المتصفح.</li><li>اختر «إضافة إلى الشاشة الرئيسية».</li><li>تفتح بطاقتك بملء الشاشة بضغطة من الشاشة الرئيسية.</li></ol>' : '<b>على الجوال:</b> افتح هذه الصفحة من متصفح الجوال، ثم من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية».');
    });
    return close;
  }
  window.KPWallet = {open: sheet};
})();
