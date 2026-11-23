/* KPTC — طبقة الحماية في الواجهة (KPSec)
   تعمل في كل الصفحات بعد store.js، وتقوم بما يلي:
     1. انتهاء الجلسة: خمول 15 دقيقة (10 لأصحاب الصلاحيات الشاملة) وعمر أقصى 8 ساعات، عبر كل التبويبات.
     2. تغيير كلمة المرور الإلزامي: حساب كلمته افتراضية أو وضعها المدير لا يعمل قبل تغييرها.
     3. إعادة التحقق Step-up: العمليات الحرجة (المحافظ، الحسابات، الأدوار، التصدير، الاستعادة)
        تطلب كلمة المرور من جديد إن مرّت 5 دقائق على آخر تحقق.
   تنبيه: هذه الطبقة تحمي من الخطأ والجلسات المنسيّة والأجهزة المشتركة. أما الحماية من
   مهاجم يتلاعب بالمتصفح فمصدرها الوحيد قواعد الخادم (firestore.rules) بعد ربط Firebase. */
(function(){
  var K = window.KPTC; if (!K || !K.staffUser || window.KPSec) return;
  var IDLE = 15 * 60000, IDLE_ADMIN = 10 * 60000, MAX_AGE = 8 * 3600000, STEP = 5 * 60000, ACT = 'kptc.sec.act', STEPK = 'kptc.sec.step';
  function E(s){ return K.esc(s); }
  function now(){ return Date.now(); }
  function store(k, v){ try { if (v === undefined) return +localStorage.getItem(k) || 0; localStorage.setItem(k, String(v)); } catch(x){} return 0; }

  /* ---- 1) idle + absolute lifetime (activity is shared between tabs through localStorage) ---- */
  var last = now(); store(ACT, last);
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function(ev){ document.addEventListener(ev, function(){ var t = now(); if (t - last > 5000){ last = t; store(ACT, t); } }, {passive:true, capture:true}); });
  function expire(why){ K.staffLogout(); try { sessionStorage.removeItem(STEPK); } catch(x){} toast(why); setTimeout(function(){ location.reload(); }, 1800); }
  setInterval(function(){
    var u = K.staffUser(); if (!u) return;
    var d = K.db(), seen = Math.max(last, store(ACT)), limit = (K.role(u.role).perms.indexOf('*') > -1) ? IDLE_ADMIN : IDLE;
    if (d.staffAt && now() - d.staffAt > MAX_AGE) return expire('انتهت مدة الجلسة القصوى (8 ساعات). سجّل الدخول من جديد.');
    if (now() - seen > limit) expire('انتهت الجلسة لعدم النشاط حمايةً للبيانات. سجّل الدخول من جديد.');
  }, 15000);

  /* ---- small UI helpers ---- */
  var css = document.createElement('style');
  css.textContent = '.kps{position:fixed;inset:0;z-index:2147483000;background:rgba(16,16,40,.82);display:grid;place-items:center;padding:18px;font-family:var(--f-body,system-ui)}.kps form{background:#fff;color:#161638;border-radius:10px;border-top:6px solid #FFC93C;width:min(420px,100%);padding:24px;display:grid;gap:12px;box-shadow:0 20px 60px rgba(0,0,0,.4)}.kps h3{margin:0;font-size:1.05rem;color:#2E2C78}.kps p{margin:0;font-size:.85rem;line-height:1.7;color:#4a4a6a}.kps label{display:grid;gap:4px;font-size:.78rem;font-weight:700}.kps input{padding:10px 12px;border:1.5px solid #c9c8e6;border-radius:6px;font:inherit;direction:ltr}.kps input:focus{outline:3px solid rgba(46,44,120,.25);border-color:#2E2C78}.kps .e{color:#C2352E;font-size:.8rem;font-weight:700;min-height:1.2em}.kps .r{display:flex;gap:8px;justify-content:flex-end}.kps button{padding:9px 16px;border-radius:6px;border:1.5px solid #2E2C78;background:#fff;color:#2E2C78;font:700 .85rem inherit;cursor:pointer}.kps button.p{background:#2E2C78;color:#fff}';
  document.head.appendChild(css);
  function toast(m){ var t = document.createElement('div'); t.textContent = m; t.setAttribute('role', 'alert'); t.style.cssText = 'position:fixed;inset-inline:16px;bottom:20px;z-index:2147483001;max-width:420px;margin:auto;background:#161638;color:#fff;padding:12px 16px;border-radius:8px;font:600 .85rem system-ui;text-align:center'; document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 4000); }
  function modal(html, onSubmit, onCancel){
    var o = document.createElement('div'); o.className = 'kps'; o.innerHTML = '<form autocomplete="off" novalidate>' + html + '<div class="e" role="alert"></div></form>'; document.body.appendChild(o);
    var f = o.querySelector('form'), er = o.querySelector('.e'), first = f.querySelector('input'); if (first) first.focus();
    f.addEventListener('submit', function(e){ e.preventDefault(); var m = onSubmit(f); if (m) er.textContent = m; else o.remove(); });
    var c = f.querySelector('[data-x]'); if (c) c.addEventListener('click', function(){ o.remove(); if (onCancel) onCancel(); });
    return o; }

  /* ---- 2) forced password change ---- */
  var forcing = false;
  function mustChange(){
    var u = K.staffUser(); if (!u || !K.isDefaultPass(u) || forcing) return; forcing = true;
    modal('<h3>غيّر كلمة المرور قبل المتابعة</h3><p>حسابك يستعمل كلمة مرور مؤقتة أو افتراضية. لحماية بيانات الشركة اختر كلمة مرور خاصة بك: 10 أحرف على الأقل، حروف وأرقام.</p>' +
      '<label>كلمة المرور الحالية<input type="password" name="o" autocomplete="current-password"></label><label>كلمة المرور الجديدة<input type="password" name="n" autocomplete="new-password"></label><label>أعد كتابتها<input type="password" name="c" autocomplete="new-password"></label>' +
      '<div class="r"><button type="button" data-x>تسجيل الخروج</button><button class="p" type="submit">حفظ ومتابعة</button></div>',
      function(f){
        var u2 = K.staffUser(); if (!u2) return 'انتهت الجلسة.';
        if (!K.checkPass(u2, f.o.value)) return 'كلمة المرور الحالية غير صحيحة.';
        if (f.n.value !== f.c.value) return 'الكلمتان غير متطابقتين.';
        if (f.n.value === f.o.value) return 'اختر كلمة مختلفة عن الحالية.';
        var pe = K.passPolicy(f.n.value, true); if (pe) return pe;
        K.setPass(u2, f.n.value); K.log('تغيير كلمة المرور الإلزامي: ' + u2.name); K.save(); forcing = false; stamp(); toast('تم تغيير كلمة المرور.'); return '';
      }, function(){ forcing = false; expire('تم تسجيل الخروج.'); });
  }
  setInterval(mustChange, 1000); setTimeout(mustChange, 300);

  /* ---- 3) step-up for sensitive actions (siteadmin: any control carrying one of these data-act values) ---- */
  var SENSITIVE = {acpw:1, acudel:1, acusus:1, sfdel:1, sfstop:1, sfperm:1, rldel:1, rlnew:1, wadd:1, wsub:1, wfrz:1, rtx:1, rbk:1, rst:1, rlg:1, reset:1, cfgload:1, cfgreset:1, dclr:1};
  function stamp(){ try { sessionStorage.setItem(STEPK, String(now())); } catch(x){} }
  function fresh(){ try { return now() - (+sessionStorage.getItem(STEPK) || 0) < STEP; } catch(x){ return false; } }
  var bypass = null;
  window.addEventListener('click', function(e){   /* window + capture: runs before every handler the page registered on document */
    var b = e.target.closest && e.target.closest('[data-act]'); if (!b || !SENSITIVE[b.getAttribute('data-act')]) return;
    if (bypass === b){ bypass = null; return; }
    var u = K.staffUser(); if (!u || fresh()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    modal('<h3>تأكيد الهوية</h3><p>هذه عملية حساسة. أدخل كلمة المرور لمتابعة. يسري التأكيد 5 دقائق.</p><label>كلمة المرور<input type="password" name="p" autocomplete="current-password"></label><div class="r"><button type="button" data-x>إلغاء</button><button class="p" type="submit">تأكيد</button></div>',
      function(f){ var u2 = K.staffUser(); if (!u2 || !K.checkPass(u2, f.p.value)){ K.log('فشل إعادة التحقق قبل عملية حساسة: ' + (u2 ? u2.id : '-')); K.save(); return 'كلمة المرور غير صحيحة.'; } stamp(); K.log('إعادة تحقق ناجحة: ' + u2.id); K.save(); bypass = b; setTimeout(function(){ b.click(); }, 0); return ''; });
  }, true);

  window.KPSec = {stepUp: function(cb){ if (fresh()) return cb(); modal('<h3>تأكيد الهوية</h3><label>كلمة المرور<input type="password" name="p" autocomplete="current-password"></label><div class="r"><button type="button" data-x>إلغاء</button><button class="p" type="submit">تأكيد</button></div>', function(f){ var u = K.staffUser(); if (!u || !K.checkPass(u, f.p.value)) return 'كلمة المرور غير صحيحة.'; stamp(); setTimeout(cb, 0); return ''; }); }, fresh: fresh};
})();
