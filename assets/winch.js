/* KPTC — الونش والورشة: شريط التبويب، وحجز الورشة بخطوات مع نقل المركبة بالونش كخيار */
(function(){
  'use strict';
  function $(id){ return document.getElementById(id); }
  function el(tag, cls, html){ var d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
  function toast(t){ try { showToast(t); } catch(e){} }
  function txt(n){ return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function kd(n){ return (Math.round(n * 1000) / 1000).toFixed(3) + ' د.ك'; }

  /* ---------- 1. tab bar ---------- */
  var bar = document.querySelector('.main-tabs'), content = document.querySelector('.content');
  if (bar && content){
    var SUB = {winch:'يصلك أينما كنت · 24 ساعة', track:'برقم الطلب', workshop:'احجز موعد الإصلاح', prices:'لائحة 8 مناطق'};
    content.insertBefore(bar, content.firstChild); bar.classList.add('wt'); bar.setAttribute('role', 'tablist');
    var ink = el('i', 'wt-ink'); bar.appendChild(ink);
    var tabs = [].slice.call(bar.querySelectorAll('.mtab'));
    tabs.forEach(function(t){
      var k = t.id.replace('tab-', '').replace('-btn', ''), ic = t.querySelector('.mtab-icon'), lab = '';
      [].slice.call(t.childNodes).forEach(function(n){ if (n.nodeType === 3){ lab += n.textContent; t.removeChild(n); } });
      t.appendChild(el('b', '', lab.trim())); t.appendChild(el('small', '', SUB[k] || '')); t.setAttribute('role', 'tab'); t.setAttribute('data-k', k);
    });
    var place = function(){ var a = bar.querySelector('.mtab.active'); if (!a) return; ink.style.width = a.offsetWidth + 'px'; ink.style.height = a.offsetHeight + 'px'; ink.style.transform = 'translate(' + a.offsetLeft + 'px,' + a.offsetTop + 'px)'; tabs.forEach(function(t){ t.setAttribute('aria-selected', t === a ? 'true' : 'false'); }); };
    var st = window.switchTab;
    window.switchTab = function(tab){
      document.querySelectorAll('.mtab').forEach(function(t){ t.classList.remove('active'); });
      document.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.remove('active'); });
      $('tab-' + tab + '-btn').classList.add('active'); $('pane-' + tab).classList.add('active'); place();
      var top = content.getBoundingClientRect().top + window.scrollY - 76; if (window.scrollY > top + 4 || content.getBoundingClientRect().top > window.innerHeight * .55) window.scrollTo({top:top, behavior:'smooth'});
    };
    bar.addEventListener('keydown', function(e){ var i = tabs.indexOf(document.activeElement); if (i < 0) return; var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; if (!d) return; var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click(); });
    place(); window.addEventListener('resize', place); setTimeout(place, 400); if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }

  /* ---------- 2. workshop booking ---------- */
  var pane = $('pane-workshop'); if (!pane) return;
  var layout = pane.querySelector('.booking-layout'), left = layout && layout.firstElementChild, grid = pane.querySelector('.services-grid'), panel = pane.querySelector('.order-panel');
  if (!layout || !left || !grid || !panel) return;
  var cards = [].slice.call(grid.querySelectorAll('.service-card')), fcards = left.querySelectorAll('.fcard'), carCard = fcards[0], dateCard = fcards[1];
  var S = {mode:'self', day:0, slot:0};

  // step 1 — services inside a card, with the hero shortcuts mirrored to it
  var titles = [].filter.call(pane.children, function(c){ return c.tagName === 'DIV' && !c.className && c.textContent.length < 60 && /اختر الخدمة|احجز موعدك/.test(c.textContent); });
  titles.forEach(function(t){ t.style.display = 'none'; });
  var c1 = el('div', 'fcard wk-step', '<div class="fcard-head"><span class="wk-n">1</span>ما الذي تحتاجه مركبتك؟<em id="wkPicked"></em></div><div class="fcard-body"></div>');
  c1.querySelector('.fcard-body').appendChild(grid); left.insertBefore(c1, left.firstChild);
  var name = function(c){ return txt(c.querySelector('.sc-name, .ws-si-name')); };
  pane.querySelectorAll('.ws-service-item').forEach(function(it){
    it.addEventListener('click', function(){ var m = cards.filter(function(c){ return name(c) === name(it); })[0]; if (m){ m.classList.toggle('sel', it.classList.contains('sel')); } setTimeout(paint, 0); });
  });
  cards.forEach(function(c){ c.addEventListener('click', function(){ setTimeout(function(){ pane.querySelectorAll('.ws-service-item').forEach(function(it){ if (name(it) === name(c)) it.classList.toggle('sel', c.classList.contains('sel')); }); paint(); }, 0); }); c.setAttribute('tabindex', '0'); c.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); c.click(); } }); });

  // step 2 — how the vehicle gets to the workshop (tow is optional)
  var zones = $('distSelect') ? $('distSelect').innerHTML : '<option value="5,7">المناطق القريبة من الشويخ</option>';
  var c2 = el('div', 'fcard wk-step', '<div class="fcard-head"><span class="wk-n">2</span>كيف تصل المركبة إلى الورشة؟</div><div class="fcard-body">' +
    '<div class="wk-modes" role="radiogroup"><button type="button" class="on" data-mode="self" role="radio"><i class="wk-ic a"></i><b>أحضرها بنفسي</b><small>بدون أي رسوم إضافية</small></button>' +
    '<button type="button" data-mode="tow" role="radio"><i class="wk-ic b"></i><b>أرسلوا ونشاً لنقلها</b><small>اختياري · بتعرفة المناطق الرسمية</small></button></div>' +
    '<div class="wk-tow" id="wkTow" hidden><div class="fg"><div class="ff"><label>منطقة الاستلام</label><select id="wkZone">' + zones + '</select></div>' +
    '<div class="ff"><label>حجم المركبة</label><select id="wkSize"><option value="0">صالون</option><option value="1">مركبة كبيرة</option></select></div>' +
    '<div class="ff" style="grid-column:span 2"><label>عنوان الاستلام</label><input id="wkAddr" placeholder="المنطقة، القطعة، الشارع، أقرب معلم"></div>' +
    '<div class="ff" style="grid-column:span 2"><label class="wk-chk"><input type="checkbox" id="wkBack"> أعيدوا المركبة بالونش بعد الإصلاح (بالتعرفة نفسها)</label></div></div>' +
    '<p class="wk-note">يصل الونش قبل موعد الورشة بنحو ساعة، وتتابع حركته من تبويب «تتبع طلبك» برقم الحجز.</p></div></div>');
  left.insertBefore(c2, carCard);
  c2.addEventListener('click', function(e){ var b = e.target.closest('[data-mode]'); if (!b) return; S.mode = b.getAttribute('data-mode'); c2.querySelectorAll('[data-mode]').forEach(function(x){ x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); $('wkTow').hidden = S.mode !== 'tow'; paint(); });
  c2.addEventListener('change', paint); c2.addEventListener('input', paint);

  // step 3 + 4 — vehicle, then day and time as one-tap chips
  if (carCard){ carCard.classList.add('wk-step'); var h = carCard.querySelector('.fcard-head'); h.innerHTML = '<span class="wk-n">3</span>بيانات المركبة'; var vt = carCard.querySelector('select'); if (vt) vt.addEventListener('change', function(){ var big = /حافلة|بيكأب|SUV/.test(vt.value); $('wkSize').value = big ? '1' : '0'; paint(); }); }
  var dateIn = dateCard && dateCard.querySelector('input[type=date]'), slotSel = dateCard && dateCard.querySelector('select');
  if (dateCard && dateIn && slotSel){
    dateCard.classList.add('wk-step'); dateCard.querySelector('.fcard-head').innerHTML = '<span class="wk-n">4</span>الموعد وبيانات التواصل';
    var DN = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], MN = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'], days = [];
    for (var i = 1; i <= 7; i++){ var d = new Date(); d.setDate(d.getDate() + i); days.push(d); }
    var iso = function(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    var pick = el('div', 'wk-when', '<label>اختر اليوم</label><div class="wk-days">' + days.map(function(d, i){ return '<button type="button" data-day="' + i + '"' + (i ? '' : ' class="on"') + '><small>' + (i ? DN[d.getDay()] : 'غداً') + '</small><b>' + d.getDate() + '</b><small>' + MN[d.getMonth()] + '</small></button>'; }).join('') + '</div>' +
      '<label>اختر الوقت</label><div class="wk-slots">' + [].map.call(slotSel.options, function(o, i){ return '<button type="button" data-slot="' + i + '"' + (i ? '' : ' class="on"') + '>' + o.textContent.replace(' — ', ' – ') + '</button>'; }).join('') + '</div>');
    var body = dateCard.querySelector('.fcard-body'); body.insertBefore(pick, body.firstChild);
    dateIn.closest('.ff').classList.add('wk-hide'); slotSel.closest('.ff').classList.add('wk-hide'); dateIn.value = iso(days[0]);
    pick.addEventListener('click', function(e){
      var a = e.target.closest('[data-day]'), b = e.target.closest('[data-slot]');
      if (a){ S.day = +a.getAttribute('data-day'); dateIn.value = iso(days[S.day]); pick.querySelectorAll('[data-day]').forEach(function(x){ x.classList.toggle('on', x === a); }); }
      if (b){ S.slot = +b.getAttribute('data-slot'); slotSel.selectedIndex = S.slot; pick.querySelectorAll('[data-slot]').forEach(function(x){ x.classList.toggle('on', x === b); }); }
      paint();
    });
    S.days = days; S.DN = DN; S.MN = MN;
  }

  // live summary
  var opBody = panel.querySelector('.op-body'), sum = el('div', 'wk-sum'); opBody.insertBefore(sum, opBody.firstChild);
  var info = [].slice.call(opBody.querySelectorAll('.op-section')); // workshop info + features collapse under the bill
  var more = el('details', 'wk-more', '<summary>معلومات الورشة ومميزاتها</summary>'); info.forEach(function(s){ more.appendChild(s); }); opBody.querySelectorAll('.op-divider').forEach(function(d){ d.remove(); });
  var okBtn = opBody.querySelector('.btn-book-ws'); opBody.insertBefore(more, okBtn ? okBtn.previousElementSibling || okBtn : null);
  function picked(){ return cards.filter(function(c){ return c.classList.contains('sel'); }).map(function(c){ return {name:name(c), price:parseFloat(txt(c.querySelector('.sc-price'))) || 0, time:txt(c.querySelector('.sc-time'))}; }); }
  function towFee(){ if (S.mode !== 'tow') return 0; var p = ($('wkZone').value || '5,7').split(',').map(Number), one = p[+$('wkSize').value] || p[0]; return one * ($('wkBack').checked ? 2 : 1); }
  function paint(){
    var list = picked(), work = list.reduce(function(a, x){ return a + x.price; }, 0), tow = towFee(), zone = S.mode === 'tow' ? $('wkZone').options[$('wkZone').selectedIndex].textContent.split('(')[0].trim() : '';
    var when = S.days ? (S.day ? S.DN[S.days[S.day].getDay()] : 'غداً') + ' ' + S.days[S.day].getDate() + ' ' + S.MN[S.days[S.day].getMonth()] + ' · ' + slotSel.options[S.slot].textContent.split('—')[0].trim() : '';
    sum.innerHTML = '<div class="wk-when-s"><small>موعدك</small><b>' + when + '</b></div>' +
      '<div class="wk-list">' + (list.length ? list.map(function(x){ return '<div><span>' + x.name + '</span><b>' + kd(x.price) + '</b></div>'; }).join('') : '<p>لم تختر خدمة بعد — اختر من القائمة لتظهر التكلفة فوراً.</p>') + '</div>' +
      (S.mode === 'tow' ? '<div class="wk-list tow"><div><span>نقل بالونش' + ($('wkBack').checked ? ' ذهاباً وعودة' : '') + '<small>' + zone + '</small></span><b>' + kd(tow) + '</b></div></div>' : '<div class="wk-self">تحضر المركبة بنفسك — بلا رسوم نقل</div>') +
      '<div class="wk-total"><span>الإجمالي التقديري</span><b>' + kd(work + tow) + '</b></div>' +
      '<p class="wk-fine">أجور الإصلاح من اللائحة الرسمية. قطع الغيار تُحسب عند الفحص، وتُضاف رسوم إدارية 10% (7% لموظفي الشركة) إذا وفّرتها الورشة.</p>';
    var pk = $('wkPicked'); if (pk) pk.textContent = list.length ? list.length + ' مختارة' : '';
    c1.classList.toggle('done', !!list.length);
  }
  paint();

  var sw = window.submitWorkshop;
  if (typeof sw === 'function') window.submitWorkshop = function(){
    if (!picked().length){ toast('اختر خدمة واحدة على الأقل'); c1.scrollIntoView({behavior:'smooth', block:'center'}); c1.classList.add('shake'); setTimeout(function(){ c1.classList.remove('shake'); }, 600); return; }
    if (S.mode === 'tow' && !$('wkAddr').value.trim()){ toast('اكتب عنوان استلام المركبة ليصلك الونش'); $('wkAddr').focus(); return; }
    var r = sw.apply(this, arguments), tow = S.mode === 'tow', zone = tow ? $('wkZone').options[$('wkZone').selectedIndex].textContent.split('(')[0].trim() : '';
    setTimeout(function(){ var m = $('mSub'); if (m && /الورشة/.test(txt($('mTitle')))) m.textContent = tow ? 'سنتصل لتأكيد الموعد، والونش يستلم مركبتك من ' + zone + ' قبل الموعد بساعة' : 'سنتصل لتأكيد الموعد خلال ساعة — نراك في الورشة'; }, 1650);
    return r;
  };
})();
