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
  '.in-top{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr);gap:16px;margin-bottom:18px}',
  '.in-sl{position:relative;border-radius:10px;overflow:hidden;border:2px solid var(--kp-ink);min-height:190px;display:grid}',
  '.in-s{grid-area:1/1;padding:26px 28px 44px;display:grid;align-content:center;gap:8px;opacity:0;visibility:hidden;transition:opacity .5s,translate .5s;translate:-30px 0}',
  '.in-s.on{opacity:1;visibility:visible;translate:0 0}.in-s small{font:700 12px var(--f-display);opacity:.8}.in-s b{font:700 clamp(19px,2.4vw,26px)/1.5 var(--f-display)}.in-s p{margin:0;font-size:14.5px;line-height:1.9;opacity:.92}',
  '.in-nav{position:absolute;bottom:10px;right:20px;left:20px;display:flex;justify-content:space-between;align-items:center}',
  '.in-nav div{display:flex;gap:6px}.in-nav i{width:22px;height:5px;border-radius:3px;background:rgba(255,255,255,.4);cursor:pointer}.in-nav i.on{background:#fff}',
  '.in-nav button{border:2px solid currentColor;background:none;color:inherit;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:14px}',
  '.in-pr{background:var(--kp-ink);color:#fff;border-radius:10px;padding:16px 18px;display:grid;gap:10px;align-content:start}',
  '.in-pr-h{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.in-pr-h b{font:700 26px ui-monospace,Menlo,monospace;color:var(--kp-sign);direction:ltr}.in-pr-h small{color:#B7B5D6;font-size:12px;line-height:1.7}',
  '.in-pt{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
  '.in-pt div{background:rgba(255,255,255,.07);border-radius:6px;padding:7px 4px;text-align:center}.in-pt small{display:block;font-size:11.5px;color:#B7B5D6}.in-pt b{font:700 15px var(--f-display);direction:ltr;display:block}',
  '.in-pt div.nx{background:var(--kp-sign)}.in-pt div.nx small,.in-pt div.nx b{color:var(--kp-ink)}',
  '.in-pr em{font-style:normal;font-size:12px;color:#B7B5D6}.in-pr em b{color:#fff}',
  '.in-card{background:#fff;border:1.5px solid var(--border,#dcdaea);border-radius:10px;overflow:hidden;margin-bottom:18px}',
  '.in-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;border-bottom:1.5px solid var(--border,#dcdaea)}.in-h b{font:700 15.5px var(--f-display);color:var(--kp-ink)}',
  '.in-h input,.in-h select{border:1.5px solid var(--kp-line-2,#cfcde6);border-radius:6px;padding:6px 10px;font:500 13px var(--f-body);background:#fff}',
  '.in-t{width:100%;border-collapse:collapse;font-size:13.5px}.in-t th{text-align:right;font:700 12px var(--f-display);color:var(--kp-muted);padding:9px 14px;background:var(--kp-paper-2,#f6f3ea)}.in-t td{padding:10px 14px;border-top:1px solid var(--border,#eceaf4)}',
  '.in-t tr{cursor:pointer;transition:background .15s}.in-t tbody tr:hover{background:#FFF8E1}.in-t td:first-child{font:700 13px ui-monospace,Menlo,monospace;color:var(--kp-indigo);direction:ltr;text-align:right;white-space:nowrap}',
  '.in-pg{display:flex;gap:6px;justify-content:center;align-items:center;padding:10px;flex-wrap:wrap}.in-pg button{border:1.5px solid var(--kp-line-2,#cfcde6);background:#fff;border-radius:5px;min-width:34px;height:32px;padding:0 10px;font:700 12.5px var(--f-display);cursor:pointer;color:var(--kp-ink)}.in-pg button.on{background:var(--kp-ink);color:var(--kp-sign);border-color:var(--kp-ink)}.in-pg button[disabled]{opacity:.4;cursor:default}',
  '.in-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}',
  '.in-l{display:grid;padding:6px 0}.in-l a{display:flex;justify-content:space-between;gap:10px;padding:9px 16px;text-decoration:none;color:var(--kp-ink);font-size:13.5px;font-weight:600;border-top:1px solid var(--border,#eceaf4);transition:background .15s,padding .15s}.in-l a:first-child{border:0}.in-l a:hover{background:#FFF8E1;padding-inline-start:22px}.in-l a::after{content:"↗";color:var(--kp-muted)}',
  '.in-cal{padding:12px 14px}.in-cg{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}.in-cg small{font:700 11px var(--f-display);color:var(--kp-muted);padding:4px 0}',
  '.in-cg button{position:relative;border:0;background:none;border-radius:6px;aspect-ratio:1;font:600 13px var(--f-body);cursor:pointer;color:var(--kp-ink)}.in-cg button:hover{background:var(--kp-paper-2,#f6f3ea)}.in-cg button.off{color:#b9b7cf}.in-cg button.fri{color:#C2352E}',
  '.in-cg button.td{background:var(--kp-ink);color:var(--kp-sign);font-weight:700}.in-cg button.ev::after{content:"";position:absolute;bottom:4px;left:50%;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:var(--kp-sign);box-shadow:0 0 0 1.5px var(--kp-ink)}.in-cg button.sel{outline:2px solid var(--kp-ink)}',
  '.in-ev{border-top:1px dashed var(--kp-line-2,#cfcde6);margin-top:10px;padding-top:10px;font-size:13px;display:grid;gap:5px;min-height:44px}.in-ev b{color:var(--kp-indigo)}',
  '.in-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px}.in-form label{display:grid;gap:4px;font-size:.78rem;font-weight:700;color:var(--kp-ink)}.in-form .full{grid-column:1/-1}',
  '.in-form input,.in-form select,.in-form textarea{border:1.5px solid var(--kp-line-2,#cfcde6);border-radius:6px;padding:9px 10px;font:500 14px var(--f-body);background:#fff}',
  '.in-tk{padding:12px 16px;border-top:1px solid var(--border,#eceaf4);display:grid;gap:5px;font-size:13.5px}.in-tk .r{border-inline-start:3px solid var(--kp-sign);padding-inline-start:10px;font-size:13px}',
  '.in-st{font:700 11.5px var(--f-display);border-radius:3px;padding:1px 8px;background:#FBEFD9;color:#8A5407}.in-st.ok{background:#E3F3EB;color:#1E7F55}.in-st.in{background:#E4E3F5;color:#2E2C78}',
  '.in-lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;padding:16px}.in-lib div{border:1.5px solid var(--kp-line-2,#cfcde6);border-radius:8px;padding:14px;display:grid;gap:6px;border-inline-start:6px solid var(--kp-indigo)}.in-lib small{color:var(--kp-muted)}',
  '.in-doc{font-size:14.5px;line-height:2}.in-doc dl{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0 0 12px;font-size:13.5px}.in-doc dt{color:var(--kp-muted)}.in-doc dd{margin:0;font-weight:700}',
  '@media(max-width:1000px){.in-top,.in-3{grid-template-columns:1fr}.in-form{grid-template-columns:1fr}}'
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
  var top = el('div', 'in-top'), mid = el('div'), wb = dash.querySelector('.welcome-banner'), strip = $('ptStrip');
  dash.insertBefore(top, (strip || wb).nextSibling); dash.appendChild(mid);

  /* ---- circulars slider ---- */
  var si = 0, sTimer = null;
  function slider(){
    var L = K.db().circulars.filter(function(c){ return c.on; }); if (!L.length) L = [{title:'لا تعاميم جديدة', body:'ستظهر هنا تعاميم الإدارة فور نشرها.', tone:'indigo'}]; si = si % L.length;
    var t = TONE[L[si].tone] || TONE.indigo;
    return '<div class="in-sl" id="inSl" style="background:' + t[0] + ';color:' + t[1] + '">' + L.map(function(c, i){ return '<div class="in-s' + (i === si ? ' on' : '') + '"><small>تعاميم وإعلانات · ' + (i + 1) + ' / ' + L.length + '</small><b>' + E(c.title) + '</b><p>' + E(c.body) + '</p></div>'; }).join('') +
      '<div class="in-nav"><button type="button" data-in="sp" aria-label="السابق">→</button><div>' + L.map(function(_, i){ return '<i class="' + (i === si ? 'on' : '') + '" data-in="sd" data-i="' + i + '"></i>'; }).join('') + '</div><button type="button" data-in="sn" aria-label="التالي">←</button></div></div>';
  }
  function prayer(){
    var now = new Date(), P = prayers(now), cur = now.getHours() * 60 + now.getMinutes(), nx = P.filter(function(p){ return p[0] !== 'الشروق' && p[1] > cur; })[0], left = nx ? nx[1] - cur : 0;
    return '<div class="in-pr"><div class="in-pr-h"><small>' + now.toLocaleDateString('ar-KW', {weekday:'long', day:'numeric', month:'long', year:'numeric'}) + '<br>' + hijri(now) + '</small><b id="inClk">' + P2(now.getHours()) + ':' + P2(now.getMinutes()) + ':' + P2(now.getSeconds()) + '</b></div>' +
      '<div class="in-pt">' + P.map(function(p){ return '<div class="' + (nx && p[0] === nx[0] ? 'nx' : '') + '"><small>' + p[0] + '</small><b>' + hm(p[1]) + '</b></div>'; }).join('') + '</div>' +
      '<em>' + (nx ? 'باقٍ على <b>' + nx[0] + '</b> ' + (left >= 60 ? Math.floor(left / 60) + ' س ' : '') + (left % 60) + ' د' : 'انتهت صلوات اليوم') + ' · مواقيت مدينة الكويت بالحساب الفلكي</em></div>';
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

  /* ---- calendar ---- */
  var cm = new Date(); cm.setDate(1); var csel = K.today();
  function iso(d){ return d.getFullYear() + '-' + P2(d.getMonth() + 1) + '-' + P2(d.getDate()); }
  function evOn(day){ var d = K.db(), u = K.staffUser(), out = d.events.filter(function(e){ return e.d === day; }).map(function(e){ return e.title; }); d.occasions.forEach(function(o){ if (o.status === 'منشور' && o.date === day) out.push(o.kind + ' — ' + o.name); }); return out; }
  function calendar(){
    var y = cm.getFullYear(), m = cm.getMonth(), start = new Date(y, m, 1), lead = (start.getDay() + 1) % 7, days = new Date(y, m + 1, 0).getDate(), cells = '', td = K.today();
    ['س','ح','ن','ث','ر','خ','ج'].forEach(function(n){ cells += '<small>' + n + '</small>'; });
    for (var i = 0; i < lead; i++) cells += '<span></span>';
    for (var k = 1; k <= days; k++){ var dt = new Date(y, m, k), s = iso(dt); cells += '<button type="button" data-in="day" data-id="' + s + '" class="' + (s === td ? 'td ' : '') + (s === csel ? 'sel ' : '') + (dt.getDay() === 5 ? 'fri ' : '') + (evOn(s).length ? 'ev' : '') + '">' + k + '</button>'; }
    var ev = evOn(csel);
    return '<div class="in-card"><div class="in-h"><b>' + start.toLocaleDateString('ar-KW', {month:'long', year:'numeric'}) + '</b><div style="display:flex;gap:6px"><button type="button" class="in-pgb" data-in="cm" data-i="-1" style="border:1.5px solid var(--kp-line-2);background:#fff;border-radius:5px;width:30px;height:30px;cursor:pointer">→</button><button type="button" data-in="cm" data-i="1" style="border:1.5px solid var(--kp-line-2);background:#fff;border-radius:5px;width:30px;height:30px;cursor:pointer">←</button></div></div><div class="in-cal"><div class="in-cg">' + cells + '</div>' +
      '<div class="in-ev"><b>' + K.date(csel) + '</b>' + (ev.length ? ev.map(function(e){ return '<span>• ' + E(e) + '</span>'; }).join('') : '<span style="color:var(--kp-muted)">لا فعاليات في هذا اليوم.</span>') + '</div></div></div>';
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
  function paint(){
    var u = K.staffUser(); if (!u) return;
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#inSup')) return;
    keepFocus(function(){
      top.innerHTML = slider() + prayer();
      mid.innerHTML = decisions(false) + '<div class="in-3">' + calendar() + links('روابط هامة', LINKS) + links('الصحف الكويتية اليومية', PAPERS) + '</div>';
      vDec.innerHTML = decisions(true); vSup.innerHTML = support(); vLib.innerHTML = library();
    });
    var open = K.db().ittickets.filter(function(t){ return t.status !== 'مُغلق' && (K.can('it.support', u) || t.from === u.id); }).length, b = $('inSupB'); if (b){ b.style.display = open ? '' : 'none'; b.textContent = open; }
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-in]'); if (!b) return; var a = b.getAttribute('data-in'), id = b.getAttribute('data-id'), d = K.db(), u = K.staffUser(), n = K.db().circulars.filter(function(c){ return c.on; }).length || 1;
    if (a === 'sn' || a === 'sp' || a === 'sd'){ si = a === 'sd' ? +b.getAttribute('data-i') : (si + (a === 'sn' ? 1 : n - 1)) % n; clearInterval(sTimer); paint(); }
    else if (a === 'pg'){ dp = +b.getAttribute('data-i'); paint(); }
    else if (a === 'cm'){ cm.setMonth(cm.getMonth() + (+b.getAttribute('data-i'))); paint(); }
    else if (a === 'day'){ csel = id; paint(); }
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
  setInterval(function(){ var c = $('inClk'), n = new Date(); if (c) c.textContent = P2(n.getHours()) + ':' + P2(n.getMinutes()) + ':' + P2(n.getSeconds()); if (n.getSeconds() === 0 && K.staffUser()) paint(); }, 1000);
  sTimer = setInterval(function(){ if (document.hidden || !K.staffUser() || !$('view-dashboard').classList.contains('active')) return; var n = K.db().circulars.filter(function(c){ return c.on; }).length || 1; si = (si + 1) % n; var s = $('inSl'); if (s){ var t = el('div'); t.innerHTML = slider(); s.replaceWith(t.firstChild); } }, 6500);
  K.onChange(paint);
  new MutationObserver(paint).observe($('portal'), {attributes:true, attributeFilter:['class']});
  paint();
})();
