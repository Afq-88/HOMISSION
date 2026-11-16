/* KPTC — بوابة الموظفين: دخول حقيقي بالحساب، صلاحيات، عروض موجّهة، و«واجب الزملاء» */
(function(){
  'use strict';
  var K = window.KPTC; if (!K || !K.staffLogin) return;
  function $(id){ return document.getElementById(id); }
  function el(tag, cls, html){ var d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
  function toast(t){ try { showToast(t); } catch(e){} }
  var E = K.esc, DEMO = {emp:'KPTC-4821', mgr:'KPTC-2891', eng:'KPTC-ENG'};
  function nameOf(id){ var u = K.db().staff[id]; return u ? u.name : id; }

  var css = document.createElement('style');
  css.textContent = [
  '.lc-err{color:#C2352E;font-size:.78rem;font-weight:600;min-height:1.2em;margin:-4px 0 8px}',
  '.lc-keep{display:flex;gap:8px;align-items:center;font-size:.76rem;color:var(--kp-muted);margin:-2px 0 12px}.lc-keep input{accent-color:#2E2C78;width:16px;height:16px}',
  '.lc-input.bad{border-color:#C2352E!important;animation:pt-shake .4s}@keyframes pt-shake{25%{translate:5px 0}75%{translate:-5px 0}}',
  '.pt-role{display:inline-block;margin-top:3px;background:var(--kp-sign);color:var(--kp-ink);border-radius:3px;padding:0 7px;font:700 10.5px var(--f-display)}',
  '.sb-item.pt-off{display:none!important}',
  '.pt-strip{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;background:#fff;border:2px solid var(--kp-ink);border-radius:8px;padding:12px 16px;margin-bottom:18px;cursor:pointer;box-shadow:5px 5px 0 rgba(20,19,58,.1);transition:translate .15s}',
  '.pt-strip:hover{translate:0 -2px}.pt-strip i{width:42px;height:42px;border-radius:50%;background:var(--kp-ink);display:grid;place-items:center;color:var(--kp-sign);font:700 18px var(--f-display);font-style:normal}',
  '.pt-strip b{display:block;font:700 15px var(--f-display);color:var(--kp-ink)}.pt-strip small{color:var(--kp-muted);font-size:12.5px}.pt-strip span{font:700 12.5px var(--f-display);color:var(--kp-indigo)}',
  '.pt-h{display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap;margin:0 0 14px}.pt-h h3{font:700 19px var(--f-display);color:var(--kp-ink);margin:0}.pt-h p{margin:2px 0 0;font-size:13px;color:var(--kp-muted)}',
  '.pt-btn{border:2px solid var(--kp-ink);background:#fff;border-radius:5px;padding:7px 14px;font:700 12.5px var(--f-display);color:var(--kp-ink);cursor:pointer;transition:background .15s,translate .15s}.pt-btn:hover{translate:0 -1px;background:var(--kp-sign)}.pt-btn.y{background:var(--kp-sign)}.pt-btn.k{background:var(--kp-ink);color:var(--kp-sign)}.pt-btn[disabled]{opacity:.55;cursor:default;translate:none}',
  '.pt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:26px}',
  /* offers */
  '.of{position:relative;background:#fff;border:2px solid var(--kp-ink);border-radius:10px;padding:16px 16px 14px;display:grid;gap:8px;align-content:start;overflow:hidden}',
  '.of::before{content:"";position:absolute;top:0;right:0;left:0;height:6px;background:var(--kp-indigo)}.of.ext::before{background:var(--kp-sign)}',
  '.of-t{display:flex;gap:6px;flex-wrap:wrap}.of-t span{font:700 11px var(--f-display);border-radius:3px;padding:1px 8px;background:var(--kp-paper-2,#f1efe6);color:var(--kp-ink)}.of-t .me{background:var(--kp-ink);color:var(--kp-sign)}.of-t .new{background:#C2352E;color:#fff}',
  '.of h4{font:700 16.5px var(--f-display);color:var(--kp-ink);margin:0}.of p{margin:0;font-size:13px;color:var(--kp-muted);line-height:1.7}',
  '.of-v{font:700 22px var(--f-display);color:var(--kp-indigo)}.of-d{font-size:12px;color:var(--kp-muted)}',
  '.of-code{border:2px dashed var(--kp-ink);border-radius:6px;background:#FFF8E1;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12.5px}.of-code b{font:700 18px ui-monospace,Menlo,monospace;letter-spacing:2px;direction:ltr;color:var(--kp-ink)}',
  '.of-st{font:700 12.5px var(--f-display);padding:6px 10px;border-radius:5px;background:var(--kp-paper-2,#f1efe6);color:var(--kp-ink)}.of-st.ok{background:#E3F3EB;color:#1E7F55}.of-st.no{background:#F9E2E0;color:#C2352E}',
  '.of-th{display:grid;gap:4px;font-size:12.5px;border-top:1px dashed var(--kp-line-2,#cfcde6);padding-top:8px}.of-th b{color:var(--kp-indigo)}',
  '.of-a{display:flex;gap:6px;flex-wrap:wrap}',
  /* occasions */
  '.oc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}.oc-tabs button{border:1.5px solid var(--kp-line-2,#cfcde6);background:#fff;border-radius:18px;padding:5px 14px;font:700 12.5px var(--f-display);color:var(--kp-ink);cursor:pointer}.oc-tabs button.on{background:var(--kp-ink);color:var(--kp-sign);border-color:var(--kp-ink)}',
  '.oc{position:relative;border-radius:10px;padding:18px;display:grid;gap:9px;align-content:start;border:2px solid var(--kp-ink);background:#fff}',
  '.oc.joy{background:linear-gradient(180deg,#FFF8E1 0,#fff 46%)}.oc.joy::before{content:"";position:absolute;top:-2px;left:22px;width:26px;height:34px;background:var(--kp-sign);border:2px solid var(--kp-ink);border-top:0;clip-path:polygon(0 0,100% 0,100% 100%,50% 78%,0 100%)}',
  '.oc.sad{background:#1D1C3F;border-color:#1D1C3F;color:#E8E7F5}.oc.sad h4{color:#fff}.oc.sad p,.oc.sad .oc-m{color:#B9B7D6}.oc.sad .pt-btn{background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}.oc.sad .pt-btn:hover{background:rgba(255,255,255,.12)}.oc.sad .pt-btn.done{background:#fff;color:#1D1C3F}.oc.sad .oc-book{border-color:rgba(255,255,255,.18)}.oc.sad .oc-book b{color:#fff}.oc.sad textarea{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.3)}',
  '.oc-k{font:700 11.5px var(--f-display);letter-spacing:.3px;color:var(--kp-indigo)}.oc.sad .oc-k{color:#C9C7EA}',
  '.oc h4{font:700 17px var(--f-display);color:var(--kp-ink);margin:0}.oc p{margin:0;font-size:13.5px;line-height:1.8;color:#4b4a6b}',
  '.oc-m{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--kp-muted)}',
  '.oc-w{display:flex;align-items:center;gap:8px;font-size:12px}.oc-av{display:flex}.oc-av i{width:24px;height:24px;border-radius:50%;background:var(--kp-sign);color:var(--kp-ink);border:2px solid #fff;margin-inline-start:-7px;display:grid;place-items:center;font:700 11px var(--f-display);font-style:normal}.oc-av i:first-child{margin:0}.oc.sad .oc-av i{background:#fff;border-color:#1D1C3F}',
  '.oc-a{display:flex;gap:6px;flex-wrap:wrap}.pt-btn.done{background:var(--kp-ink);color:var(--kp-sign)}',
  '.oc-book{border-top:1px dashed var(--kp-line-2,#cfcde6);padding-top:9px;display:grid;gap:6px;font-size:12.5px}.oc-book b{color:var(--kp-indigo)}',
  '.oc-book textarea{width:100%;box-sizing:border-box;border:1.5px solid var(--kp-line-2,#cfcde6);border-radius:6px;padding:8px;font:500 13px var(--f-body);min-height:56px;resize:vertical}',
  '.pt-form{display:grid;gap:10px}.pt-form label{display:grid;gap:4px;font-size:.78rem;font-weight:700;color:var(--kp-ink)}.pt-form input,.pt-form select,.pt-form textarea{border:1.5px solid var(--kp-line-2,#cfcde6);border-radius:6px;padding:8px 10px;font:500 14px var(--f-body);background:#fff}',
  '.pt-chips{display:flex;flex-wrap:wrap;gap:5px}.pt-chips span{font-size:11.5px;background:var(--kp-paper-2,#f1efe6);border-radius:12px;padding:2px 10px;color:var(--kp-ink)}',
  '.pt-kv{display:flex;justify-content:space-between;gap:10px;font-size:.82rem}.pt-kv span{color:var(--gray)}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- 1. sign-in ---------- */
  var idIn = $('empId'), pwIn = $('empPass'), btn = document.querySelector('.btn-login');
  if (idIn && pwIn && btn){
    idIn.value = ''; pwIn.value = ''; idIn.setAttribute('autocomplete', 'username'); pwIn.setAttribute('autocomplete', 'current-password');
    var err = el('div', 'lc-err'); err.id = 'lcErr'; btn.parentNode.insertBefore(err, btn);
    var keep = el('label', 'lc-keep', '<input type="checkbox" id="lcKeep" checked> أبقني داخلاً على هذا الجهاز'); btn.parentNode.insertBefore(keep, err);
    var hint = [].filter.call(document.querySelectorAll('.lc-body > div'), function(d){ return /اختر صفحتك/.test(d.textContent) && d.children.length === 0; })[0]; if (hint) hint.textContent = 'دخول تجريبي سريع (يملأ الحساب) — كلمة المرور 12345678';
    var sr = window.selRole; window.selRole = function(r){ var x = sr.apply(this, arguments); idIn.value = DEMO[r] || ''; pwIn.value = '12345678'; err.textContent = ''; return x; };
    [idIn, pwIn].forEach(function(i){ i.addEventListener('keydown', function(e){ if (e.key === 'Enter') window.doLogin(); }); });
  }
  function enter(u, quiet){
    try { currentUser = {name:u.name, role:u.title || K.role(u.role).name, id:u.id, avatar:u.name.charAt(0), empRole:u.role}; } catch(e){}
    $('loginPage').style.display = 'none'; $('portal').classList.add('show');
    try { updateUserUI(); renderRequests('all'); } catch(e){}
    gate(u); paintAll();
    if (!quiet) toast('مرحباً ' + u.name.split(' ')[0] + (u.prev ? ' — آخر دخول ' + u.prev.replace('T', ' ').slice(0, 16) : ''));
  }
  window.doLogin = function(){
    var id = idIn.value.trim(), pass = pwIn.value; err.textContent = '';
    if (!id || !pass){ err.textContent = 'اكتب الرقم الوظيفي وكلمة المرور.'; return; }
    var old = btn.innerHTML; btn.innerHTML = '<div class="spinner"></div> جاري التحقق...'; btn.disabled = true;
    setTimeout(function(){
      btn.innerHTML = old; btn.disabled = false;
      var r = K.staffLogin(id, pass);
      if (r.error){ err.textContent = r.error; [idIn, pwIn].forEach(function(i){ i.classList.add('bad'); setTimeout(function(){ i.classList.remove('bad'); }, 500); }); return; }
      try { sessionStorage.setItem('kptc.staff.keep', $('lcKeep').checked ? '1' : '0'); } catch(e){}
      pwIn.value = ''; enter(r.user);
    }, 700);
  };
  var lo = window.doLogout; window.doLogout = function(){ K.staffLogout(); return lo.apply(this, arguments); };
  // idle sign-out after 15 minutes
  var idle = Date.now(); ['click', 'keydown', 'pointermove', 'scroll'].forEach(function(ev){ document.addEventListener(ev, function(){ idle = Date.now(); }, {passive:true, capture:true}); });
  setInterval(function(){ if (K.staffUser() && Date.now() - idle > 15 * 60000){ window.doLogout(); toast('انتهت الجلسة لعدم النشاط. سجّل الدخول من جديد.'); } }, 30000);
  window.addEventListener('pagehide', function(){ try { if (sessionStorage.getItem('kptc.staff.keep') === '0') K.staffLogout(); } catch(e){} });

  /* ---------- 2. what this account may see ---------- */
  var NEED = {leave:'portal.leave', supplies:'portal.supplies', invoice:'portal.invoice', payslip:'portal.payslip', benefits:'portal.benefits', news:'portal.news', directory:'portal.directory', policies:'portal.policies', occasions:'portal.occasions'};
  function viewOf(it){ var m = (it.getAttribute('onclick') || '').match(/goTo\('([a-z]+)'/); return m ? m[1] : ''; }
  var nav = document.querySelector('.sb-nav');
  if (nav){
    var after = [].filter.call(nav.querySelectorAll('.sb-item'), function(i){ return viewOf(i) === 'directory'; })[0];
    var occ = el('div', 'sb-item', '<span class="si-icon">💬</span> واجب الزملاء <span class="sb-badge" id="ocBadge" style="display:none"></span>'); occ.setAttribute('onclick', "goTo('occasions',this)");
    if (after) after.parentNode.insertBefore(occ, after.nextSibling);
    var adm = el('a', 'sb-item', '<span class="si-icon">📊</span> مركز الإدارة'); adm.id = 'sbAdmin'; adm.href = 'KPTC_SiteAdmin.html'; adm.style.textDecoration = 'none';   // a real link, so the site's own navigation carries it (inside the gateway or alone)
    var prof = [].filter.call(nav.querySelectorAll('.sb-item'), function(i){ return viewOf(i) === 'settings'; })[0]; if (prof) prof.parentNode.insertBefore(adm, prof.nextSibling);
    var v = el('div', 'page-view'); v.id = 'view-occasions'; var anchor = $('view-news-content'); if (anchor) anchor.parentNode.insertBefore(v, anchor);
    try { pageNames.occasions = 'واجب الزملاء'; } catch(e){}
  }
  function gate(u){
    document.querySelectorAll('.sb-nav .sb-item').forEach(function(it){ var n = NEED[viewOf(it)]; it.classList.toggle('pt-off', !!n && !K.can(n, u)); });
    var a = $('sbAdmin'); if (a) a.classList.toggle('pt-off', !K.permsOf(u).some(function(p){ return /^(site|ops|admin)\.|^benefits\.(manage|claims)|^occasions\.moderate/.test(p); }));
    var r = $('sbRole'); if (r && !r.parentNode.querySelector('.pt-role')) r.parentNode.appendChild(el('span', 'pt-role')); var rb = document.querySelector('.sb-user .pt-role'); if (rb) rb.textContent = K.role(u.role).name;
    document.querySelectorAll('.ph-badge').forEach(function(b, i){ if (i === 0) b.textContent = u.id; });
  }
  var gt = window.goTo; window.goTo = function(page){ var u = K.staffUser(), n = NEED[page]; if (u && n && !K.can(n, u)){ toast('هذه الصفحة ليست ضمن صلاحيات حسابك'); return; } var r = gt.apply(this, arguments); paintAll(); return r; };

  /* ---------- 3. my account card (profile) ---------- */
  function account(u){
    var host = document.querySelector('#view-profile .profile-grid'); if (!host) return; var c = $('ptAcc'); if (!c){ c = el('div', 'fcard'); c.id = 'ptAcc'; c.style.gridColumn = '1/-1'; host.appendChild(c); }
    var labels = {}; K.PERMS.forEach(function(g){ g[1].forEach(function(p){ labels[p[0]] = p[1]; }); });
    c.innerHTML = '<div class="fcard-head">🔐 حسابي وصلاحياتي</div><div class="fcard-body" style="display:grid;gap:12px"><div class="pt-kv"><span>الرقم الوظيفي</span><strong>' + E(u.id) + '</strong></div><div class="pt-kv"><span>الدور</span><strong>' + E(K.role(u.role).name) + '</strong></div><div class="pt-kv"><span>الإدارة</span><strong>' + E(u.dept) + '</strong></div><div class="pt-kv"><span>آخر دخول سابق</span><strong>' + (u.prev ? E(u.prev.replace('T', ' ').slice(0, 16)) : 'هذه أول جلسة') + '</strong></div>' +
      '<div><div style="font-size:.78rem;font-weight:700;margin-bottom:6px">ما يتيحه حسابك (' + K.permsOf(u).length + ')</div><div class="pt-chips">' + K.permsOf(u).map(function(p){ return '<span>' + E(labels[p] || p) + '</span>'; }).join('') + '</div></div>' +
      '<form class="pt-form" id="ptPw" style="grid-template-columns:1fr 1fr auto;align-items:end"><label>كلمة المرور الحالية<input type="password" name="o" autocomplete="current-password"></label><label>كلمة مرور جديدة (8 أحرف على الأقل)<input type="password" name="n" autocomplete="new-password"></label><button class="pt-btn k" type="submit">تغيير كلمة المرور</button></form></div>';
    $('ptPw').onsubmit = function(e){ e.preventDefault(); var f = e.target; if (f.o.value !== u.pass) return toast('كلمة المرور الحالية غير صحيحة'); if (f.n.value.length < 8) return toast('كلمة المرور الجديدة 8 أحرف على الأقل'); u.pass = f.n.value; K.log('تغيير كلمة مرور ' + u.name); K.save(); f.reset(); toast('تغيّرت كلمة المرور'); };
  }

  /* ---------- 4. offers addressed to me ---------- */
  function offers(u){
    var view = $('view-benefits'); if (!view) return; var box = $('ptOffers'); if (!box){ box = el('div'); box.id = 'ptOffers'; view.insertBefore(box, view.firstChild); var st = el('div', 'pt-h', '<div><h3>مزايا ثابتة لكل الموظفين</h3></div>'); view.insertBefore(st, box.nextSibling); }
    var d = K.db(), L = K.benefitsFor(u), seen = u.seen || (u.seen = []);
    box.innerHTML = '<div class="pt-h"><div><h3>عروض وصلتك</h3><p>ما وجّهته لك الإدارة أو مديرك، لك شخصياً أو لإدارتك أو للجميع.</p></div></div>' + (L.length ? '<div class="pt-grid">' + L.map(function(b){
      var c = d.claims.filter(function(x){ return x.bid === b.id && x.staff === u.id; })[0], a = b.aud || {mode:'all'}, left = Math.max(0, Math.round((new Date(b.until) - new Date(K.today())) / 864e5));
      return '<div class="of' + (b.type === 'external' ? ' ext' : '') + '"><div class="of-t">' + (a.mode === 'staff' ? '<span class="me">خاص بك</span>' : a.mode === 'depts' ? '<span class="me">لإدارتك</span>' : '<span>للجميع</span>') + '<span>' + (b.type === 'external' ? 'خارجي' : 'داخلي') + '</span>' + (seen.indexOf(b.id) < 0 ? '<span class="new">جديد</span>' : '') + '</div><h4>' + E(b.title) + '</h4><div class="of-v">' + E(b.value) + '</div><p>' + E(b.desc) + '</p><div class="of-d">' + (b.partner ? E(b.partner) + ' · ' : '') + 'من ' + E(nameOf(b.by)) + ' · ' + (left ? 'باقٍ ' + left + ' يوماً' : 'ينتهي اليوم') + '</div>' +
        (c ? (c.code && c.status !== 'مرفوض' ? '<div class="of-code"><span>رمز الاستفادة</span><b>' + E(c.code) + '</b></div>' : '') + '<div class="of-st ' + (c.status === 'مقبول' || c.status === 'مستخدم' ? 'ok' : c.status === 'مرفوض' ? 'no' : '') + '">' + E(c.status) + '</div>' + (c.msgs.length ? '<div class="of-th">' + c.msgs.map(function(m){ return '<div><b>' + (m.from === u.id ? 'أنت' : E(nameOf(m.from))) + ':</b> ' + E(m.text) + '</div>'; }).join('') + '</div>' : '') + '<div class="of-a"><button class="pt-btn" data-of="msg" data-id="' + c.id + '">راسل صاحب العرض</button></div>'
           : '<div class="of-a"><button class="pt-btn y" data-of="claim" data-id="' + b.id + '">' + (b.approve ? 'اطلب الاستفادة' : 'استفد الآن') + '</button></div>') + '</div>'; }).join('') + '</div>' : '<p style="color:var(--gray);margin-bottom:22px">لا عروض موجّهة لك الآن.</p>');
    if (document.querySelector('#view-benefits.active')){ var ch = false; L.forEach(function(b){ if (seen.indexOf(b.id) < 0){ seen.push(b.id); ch = true; } }); if (ch){ try { localStorage.setItem('kptc.db.v2', JSON.stringify(K.db())); } catch(e){} } }
    var item = [].filter.call(document.querySelectorAll('.sb-nav .sb-item'), function(i){ return viewOf(i) === 'benefits'; })[0], fresh = L.filter(function(b){ return seen.indexOf(b.id) < 0; }).length;
    if (item){ var bd = item.querySelector('.sb-badge') || item.appendChild(el('span', 'sb-badge')); bd.style.display = fresh ? '' : 'none'; bd.textContent = fresh; }
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-of]'); if (!b) return; var id = b.getAttribute('data-id'), d = K.db();
    if (b.getAttribute('data-of') === 'claim'){ var bn = d.benefits.filter(function(x){ return x.id === id; })[0];
      if (!bn.approve){ var r = K.claim(id); return toast(r.error || 'رمزك جاهز: ' + r.claim.code); }
      showModal('طلب الاستفادة — ' + bn.title, '<form class="pt-form" id="ptCl"><label>ملاحظة لمديرك (اختياري)<textarea name="t" rows="3" placeholder="مثال: أرغب بالالتحاق في دورة الشهر القادم"></textarea></label><button class="pt-btn y" type="submit">أرسل الطلب</button></form>');
      $('ptCl').onsubmit = function(ev){ ev.preventDefault(); var r2 = K.claim(id, ev.target.t.value.trim()); closeModal(); toast(r2.error || 'وصل طلبك وينتظر الاعتماد'); };
    } else { showModal('رسالة إلى صاحب العرض', '<form class="pt-form" id="ptMs"><label>رسالتك<textarea name="t" rows="3"></textarea></label><button class="pt-btn y" type="submit">إرسال</button></form>');
      $('ptMs').onsubmit = function(ev){ ev.preventDefault(); var t = ev.target.t.value.trim(); if (!t) return; d.claims.filter(function(x){ return x.id === id; })[0].msgs.push({from:K.staffUser().id, text:t, d:new Date().toISOString()}); K.save(); closeModal(); toast('وصلت رسالتك'); }; }
  });

  /* ---------- 5. واجب الزملاء ---------- */
  var KINDS = ['عزاء','زواج','مولود','ترقية','تخرج','شفاء','تقاعد','عودة من الحج أو العمرة'], ocF = 'all', ocOpen = '';
  var WORD = {'عزاء':['قدّمت العزاء','عظّم الله أجركم'], 'شفاء':['دعوت له','دعاء بالشفاء']};
  function word(k){ return WORD[k] || ['هنّأته','مبروك']; }
  function occasions(u){
    var view = $('view-occasions'); if (!view) return; var d = K.db(), L = d.occasions.filter(function(o){ return o.status === 'منشور'; }), mine = d.occasions.filter(function(o){ return o.by === u.id && o.status === 'بانتظار المراجعة'; });
    var todo = L.filter(function(o){ return !(o.marks || {})[u.id]; }).length, bd = $('ocBadge'); if (bd){ bd.style.display = todo ? '' : 'none'; bd.textContent = todo; }
    var S = L.filter(function(o){ return ocF === 'all' || (ocF === 'sad' ? o.kind === 'عزاء' : ocF === 'joy' ? o.kind !== 'عزاء' : !(o.marks || {})[u.id]); });
    view.innerHTML = '<div class="pt-h"><div><h3>واجب الزملاء</h3><p>نقف مع زملائنا في الفرح والحزن. شارك بضغطة، واكتب كلمة تصل صاحبها في دفتره.</p></div><button class="pt-btn k" data-oc="new">أضف مناسبة</button></div>' +
      '<div class="oc-tabs">' + [['all','الكل'],['todo','لم أشارك بعد' + (todo ? ' (' + todo + ')' : '')],['sad','تعازٍ'],['joy','أفراح وتهانٍ']].map(function(t){ return '<button data-oc="f" data-id="' + t[0] + '" class="' + (ocF === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (mine.length ? '<p style="font-size:12.5px;color:var(--gray);margin:0 0 12px">لديك ' + mine.length + ' مناسبة مقترحة تنتظر مراجعة الموارد البشرية.</p>' : '') +
      (S.length ? '<div class="pt-grid">' + S.map(function(o){ var sad = o.kind === 'عزاء', m = o.marks || {}, ids = Object.keys(m), done = !!m[u.id], w = word(o.kind), today = o.date === K.today();
        return '<div class="oc ' + (sad ? 'sad' : 'joy') + '"><div class="oc-k">' + E(o.kind) + (today ? ' · اليوم' : '') + '</div><h4>' + E(o.name) + '</h4><p>' + E(o.text) + '</p><div class="oc-m"><span>' + E(o.dept || '') + '</span><span>' + K.date(o.date) + (o.time ? ' · ' + E(o.time) : '') + '</span>' + (o.place ? '<span>' + E(o.place) + '</span>' : '') + '</div>' +
          '<div class="oc-w"><div class="oc-av">' + ids.slice(0, 5).map(function(i){ return '<i>' + E(nameOf(i).charAt(0)) + '</i>'; }).join('') + '</div><span>' + (ids.length ? ids.length + ' ' + (ids.length > 10 ? 'زميلاً شاركوا' : ids.length > 1 ? 'زملاء شاركوا' : 'زميل شارك') : 'كن أول من يشارك') + '</span></div>' +
          '<div class="oc-a"><button class="pt-btn' + (done ? ' done' : sad ? '' : ' y') + '" data-oc="mark" data-id="' + o.id + '">' + (done ? '✓ ' + w[0] : w[1]) + '</button><button class="pt-btn" data-oc="book" data-id="' + o.id + '">دفتر الكلمات (' + (o.book || []).length + ')</button>' + (o.place || o.time ? '<button class="pt-btn" data-oc="cal" data-id="' + o.id + '">أضف للتقويم</button>' : '') + '</div>' +
          (ocOpen === o.id ? '<div class="oc-book">' + ((o.book || []).length ? o.book.map(function(x){ return '<div><b>' + E(nameOf(x.from)) + ':</b> ' + E(x.text) + '</div>'; }).join('') : '<div>لا كلمات بعد. اكتب أول كلمة.</div>') + '<textarea id="ocTx" placeholder="' + (sad ? 'كلمة مواساة تصل لزميلك…' : 'كلمة تهنئة تصل لزميلك…') + '"></textarea><div class="oc-a"><button class="pt-btn' + (sad ? '' : ' y') + '" data-oc="say" data-id="' + o.id + '">أضف كلمتي</button></div></div>' : '') + '</div>'; }).join('') + '</div>' : '<p style="color:var(--gray)">لا مناسبات في هذا التصنيف.</p>');
  }
  function strip(u){
    var dash = $('view-dashboard'); if (!dash || !K.can('portal.occasions', u)) return; var s = $('ptStrip'); if (!s){ s = el('div', 'pt-strip'); s.id = 'ptStrip'; s.setAttribute('onclick', "goTo('occasions',null)"); var wb = dash.querySelector('.welcome-banner'); dash.insertBefore(s, wb ? wb.nextSibling : dash.firstChild); }
    var L = K.db().occasions.filter(function(o){ return o.status === 'منشور' && !(o.marks || {})[u.id]; }), o = L[0];
    s.style.display = o ? '' : 'none'; if (o) s.innerHTML = '<i>' + (o.kind === 'عزاء' ? '۞' : '✦') + '</i><div><b>واجب اليوم: ' + E(o.kind) + ' — ' + E(o.name) + '</b><small>' + E(o.text.slice(0, 90)) + '</small></div><span>' + (L.length > 1 ? '+' + (L.length - 1) + ' أخرى ←' : 'شارك ←') + '</span>';
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-oc]'); if (!b) return; var a = b.getAttribute('data-oc'), id = b.getAttribute('data-id'), d = K.db(), u = K.staffUser(), o = d.occasions.filter(function(x){ return x.id === id; })[0];
    if (a === 'f'){ ocF = id; occasions(u); }
    else if (a === 'mark'){ o.marks = o.marks || {}; if (o.marks[u.id]) delete o.marks[u.id]; else o.marks[u.id] = K.today(); K.save(); }
    else if (a === 'book'){ ocOpen = ocOpen === id ? '' : id; occasions(u); }
    else if (a === 'say'){ var t = $('ocTx').value.trim(); if (!t) return toast('اكتب كلمتك أولاً'); (o.book = o.book || []).push({from:u.id, text:t, d:K.today()}); o.marks = o.marks || {}; o.marks[u.id] = o.marks[u.id] || K.today(); K.save(); toast('أضيفت كلمتك إلى الدفتر'); }
    else if (a === 'cal'){ var dt = o.date.replace(/-/g, ''), ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//KPTC//Portal//AR\r\nBEGIN:VEVENT\r\nUID:' + o.id + '@kptc\r\nDTSTART;VALUE=DATE:' + dt + '\r\nSUMMARY:' + o.kind + ' — ' + o.name + '\r\nLOCATION:' + (o.place || '') + '\r\nDESCRIPTION:' + (o.time ? o.time + ' — ' : '') + o.text.replace(/\n/g, ' ') + '\r\nEND:VEVENT\r\nEND:VCALENDAR';
      var l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'})); l.download = 'KPTC-' + o.id + '.ics'; document.body.appendChild(l); l.click(); l.remove(); toast('نزل ملف الموعد — افتحه ليُضاف إلى تقويمك'); }
    else if (a === 'new'){ var direct = K.can('occasions.post', u);
      showModal('أضف مناسبة', '<form class="pt-form" id="ptOc"><label>النوع<select name="kind">' + KINDS.map(function(k){ return '<option>' + k + '</option>'; }).join('') + '</select></label><label>صاحب المناسبة<input name="name" placeholder="اسم الزميل"></label><label>الإدارة<select name="dept">' + K.DEPTS.map(function(x){ return '<option' + (x === u.dept ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label><label>النص<textarea name="text" rows="3"></textarea></label><label>التاريخ<input type="date" name="date" value="' + K.today() + '"></label><label>الوقت والمكان (اختياري)<input name="place" placeholder="مثال: بعد العصر — ديوان العائلة، المنطقة"></label><button class="pt-btn y" type="submit">' + (direct ? 'انشر' : 'أرسل للمراجعة') + '</button><small style="color:var(--gray)">' + (direct ? 'تُنشر فوراً لكل الزملاء.' : 'تراجعها الموارد البشرية ثم تُنشر.') + '</small></form>');
      $('ptOc').onsubmit = function(ev){ ev.preventDefault(); var f = ev.target; if (!f.name.value.trim() || !f.text.value.trim()) return toast('اكتب صاحب المناسبة والنص'); d.occasions.unshift({id:K.id('O'), kind:f.kind.value, name:f.name.value.trim(), dept:f.dept.value, text:f.text.value.trim(), date:f.date.value, time:'', place:f.place.value.trim(), status:direct ? 'منشور' : 'بانتظار المراجعة', by:u.id, marks:{}, book:[]}); K.log('مناسبة مقترحة من ' + u.name); K.save(); closeModal(); toast(direct ? 'نُشرت المناسبة' : 'وصلت للموارد البشرية للمراجعة'); }; }
  });

  function paintAll(){ var u = K.staffUser(); if (!u) return; try { gate(u); account(u); offers(u); occasions(u); strip(u); } catch(e){ console.error(e); } }
  K.onChange(function(){ var u = K.staffUser(); if (!u && $('portal').classList.contains('show')){ $('portal').classList.remove('show'); $('loginPage').style.display = 'flex'; return; } if (document.activeElement && /TEXTAREA|INPUT/.test(document.activeElement.tagName) && document.activeElement.closest('#view-occasions,#modalBody,#ptPw')) return; paintAll(); });
  var me = K.staffUser(); if (me) enter(me, true);
})();
