/* KPTC — شبكة الخطوط: الخريطة، المجسّم ثلاثي الأبعاد، ولوحة المواعيد.
   المحطات الرئيسية وألوان الخطوط مأخوذة من خريطة شبكة K-Bus الرسمية.
   الممرات بين المحطات تبسيط للخريطة الرسمية، والمسار التفصيلي لكل خط يبقى في «الخريطة الرسمية». */
(function(){
  'use strict';
  var box = document.getElementById('mapView'); if (!box) return;
  var LIST = []; try { LIST = routes; } catch(e){}
  var K = window.KPTC || null;

  /* ---------- data ---------- */
  // id: [name, lat, lng, x3d, z3d, main?]
  var HUB = {
    maliya:   ['المالية', 29.3722, 47.9860, 0, -5, 1],
    sharq:    ['الشرق', 29.3835, 47.9925, 3.3, -5.7, 1],
    mirqab:   ['المرقاب', 29.3698, 47.9792, .7, -2.5, 1],
    un:       ['دوار الأمم المتحدة', 29.3560, 47.9270, -4.2, -3.3, 1],
    salmiya:  ['السالمية', 29.3339, 48.0761, 7.6, -1, 1],
    jleeb:    ['جليب الشيوخ', 29.2680, 47.9130, -3.2, 4.7, 1],
    khaitan:  ['خيطان', 29.2890, 47.9790, .5, 2, 0],
    sabhan:   ['صبحان', 29.2500, 48.0150, 3.8, 4.5, 0],
    fahaheel: ['الفحيحيل', 29.0825, 48.1303, 7.1, 9, 0],
    airport:  ['مطار الكويت', 29.2266, 47.9689, .3, 5.9, 0],
    sulaibiya:['السليبية', 29.2880, 47.8200, -6.4, 2.2, 0],
    amghara:  ['أمغرة', 29.3050, 47.7450, -8.6, .2, 0],
    jahra:    ['الجهراء', 29.3375, 47.6581, -11, -2.2, 0]
  };
  var EDGE = [['jahra','amghara'],['amghara','un'],['un','maliya'],['un','mirqab'],['maliya','sharq'],['maliya','mirqab'],['sharq','salmiya'],['mirqab','salmiya'],['mirqab','khaitan'],['un','jleeb'],['sulaibiya','jleeb'],['khaitan','jleeb'],['khaitan','airport'],['khaitan','sabhan'],['sabhan','fahaheel'],['salmiya','fahaheel']];
  var COLOR = {'15':'#6B8E23','16':'#8E1B4A','18':'#2F6FD0','102A':'#E0457B','102X':'#8A5A3C','999':'#E88BC4','11':'#F08A7B','12':'#F29A1F','507':'#2E7D46','34':'#1FB5A9','39':'#9A7B6A','41':'#5BA8E6','13':'#3E9B4F','21':'#C77DF0','23':'#8E8E99','51':'#3F51C8','59':'#F2885A','103':'#B3202A','77':'#35C6E8','40':'#2D8FDB','66':'#F07A22','66X':'#D32952','105':'#7A4B2A','106':'#F5A623','106X':'#8DB82E','A2':'#7B4FE0'};
  var TYPE2HUB = {maliya:'maliya', sharq:'sharq', un:'un', mirqab:'mirqab', salmiya:'salmiya', jleeb:'jleeb'};
  function hubOf(r){ if (TYPE2HUB[r.type]) return TYPE2HUB[r.type]; var n = (r.stops || [])[0]; for (var k in HUB) if (HUB[k][0] === n) return k; return 'sulaibiya'; }
  function col(num){ return COLOR[num] || '#2E2C78'; }
  function linesOf(h){ return LIST.filter(function(r){ return hubOf(r) === h; }); }
  function route(num){ return LIST.filter(function(r){ return r.num === num; })[0]; }
  function path(a, b){ // shortest chain of hubs
    var prev = {}, q = [a], seen = {}; seen[a] = 1;
    while (q.length){ var c = q.shift(); if (c === b) break;
      EDGE.forEach(function(e){ var n = e[0] === c ? e[1] : e[1] === c ? e[0] : null; if (n && !seen[n]){ seen[n] = 1; prev[n] = c; q.push(n); } }); }
    if (!seen[b]) return []; var out = [b]; while (out[0] !== a) out.unshift(prev[out[0]]); return out;
  }
  function toast(t){ try { showToast(t); } catch(e){} }
  function el(tag, cls, html){ var d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
  function chips(h){ return linesOf(h).map(function(r){ return '<button type="button" class="nw-chip" data-line="' + r.num + '" style="--c:' + col(r.num) + '">' + r.num + '</button>'; }).join(''); }

  var state = {hub:null, to:null, line:null}, view = 'map', listeners = [];
  function emit(){ listeners.forEach(function(f){ try { f(); } catch(e){ console.error(e); } }); }

  /* ---------- 1. the map ---------- */
  var map = null;
  (function(){
    var L = window.L; if (!L) return;
    var m = el('div'); m.id = 'kpMap'; box.insertBefore(m, box.firstChild);
    map = L.map(m, {zoomControl:false, attributionControl:true, zoomSnap:.5}).setView([29.30, 47.95], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'&copy; OpenStreetMap'}).addTo(map);
    var net = L.layerGroup().addTo(map), sel = L.layerGroup().addTo(map), marks = {};
    function ll(h){ return [HUB[h][1], HUB[h][2]]; }
    function bend(a, b){ // a soft curve between two hubs
      var A = ll(a), B = ll(b), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], out = [];
      var cx = mx - dy * .16, cy = my + dx * .16;
      for (var i = 0; i <= 16; i++){ var t = i / 16, u = 1 - t; out.push([u*u*A[0] + 2*u*t*cx + t*t*B[0], u*u*A[1] + 2*u*t*cy + t*t*B[1]]); }
      return out;
    }
    var segs = {};
    EDGE.forEach(function(e){
      var p = bend(e[0], e[1]);
      L.polyline(p, {color:'#14133A', weight:7, opacity:.9, lineCap:'round', interactive:false}).addTo(net);
      L.polyline(p, {color:'#fff', weight:3.5, opacity:1, lineCap:'round', interactive:false}).addTo(net);
      segs[e[0] + '>' + e[1]] = L.polyline(p, {color:'#FFC93C', weight:3.5, opacity:1, className:'nw-flow', interactive:false}).addTo(net);
    });
    Object.keys(HUB).forEach(function(h){
      var d = HUB[h], n = linesOf(h).length;
      marks[h] = L.marker(ll(h), {icon:L.divIcon({className:'', iconSize:[0,0], html:'<div class="nw-pin' + (d[5] ? ' main' : '') + '" data-hub="' + h + '"><i></i><b>' + d[0] + (n ? '<em>' + n + '</em>' : '') + '</b></div>'}), zIndexOffset:d[5] ? 500 : 0, keyboard:false}).addTo(net);
      marks[h].on('click', function(){ pick(h); });
    });
    function paint(){
      sel.clearLayers();
      document.querySelectorAll('.nw-pin').forEach(function(p){ var h = p.getAttribute('data-hub'); p.classList.toggle('on', h === state.hub || h === state.to); p.style.setProperty('--c', state.line && h === state.hub ? col(state.line) : '#FFC93C'); });
      Object.keys(segs).forEach(function(k){ segs[k].getElement() && segs[k].getElement().classList.remove('hot'); });
      if (state.hub && state.to){
        var p = path(state.hub, state.to);
        for (var i = 0; i < p.length - 1; i++){ var s = segs[p[i] + '>' + p[i+1]] || segs[p[i+1] + '>' + p[i]]; if (s && s.getElement()) s.getElement().classList.add('hot'); }
        if (view === 'map') map.flyToBounds(L.latLngBounds(p.map(ll)).pad(.25), {duration:.8});
      } else if (state.hub){
        var c = state.line ? col(state.line) : '#FFC93C';
        L.marker(ll(state.hub), {interactive:false, icon:L.divIcon({className:'', iconSize:[0,0], html:'<div class="nw-halo" style="--c:' + c + '"></div>'})}).addTo(sel);
        if (state.line) L.marker(ll(state.hub), {interactive:false, zIndexOffset:900, icon:L.divIcon({className:'', iconSize:[0,0], html:'<div class="nw-tag" style="--c:' + c + '"><span>' + state.line + '</span>خط ' + state.line + ' · محطة ' + HUB[state.hub][0] + '</div>'})}).addTo(sel);
        if (view === 'map') map.flyTo(ll(state.hub), Math.max(map.getZoom(), 12.5), {duration:.8});
      }
    }
    listeners.push(paint);
    var z = box.querySelectorAll('.map-zoom .zoom-btn');
    if (z[0]) z[0].addEventListener('click', function(){ view === 'map' ? map.zoomIn() : cam3 && cam3(.82); });
    if (z[1]) z[1].addEventListener('click', function(){ view === 'map' ? map.zoomOut() : cam3 && cam3(1.2); });
    if (z[2]) z[2].addEventListener('click', function(){ if (view !== 'map') return; if (navigator.geolocation) navigator.geolocation.getCurrentPosition(function(g){ map.flyTo([g.coords.latitude, g.coords.longitude], 14); L.circleMarker([g.coords.latitude, g.coords.longitude], {radius:8, color:'#C2352E', fillOpacity:.6}).addTo(sel); }, function(){ map.flyTo([29.30, 47.95], 11); }); });
    setTimeout(function(){ map.invalidateSize(); }, 300); window.addEventListener('resize', function(){ map.invalidateSize(); });
    document.addEventListener('click', function(){ setTimeout(function(){ map.invalidateSize(); }, 60); });
  })();
  var cam3 = null;

  /* ---------- shared HUD: skin switch + the trip card ---------- */
  var hud = el('div', 'nw-hud'); box.appendChild(hud);
  var skin = el('div', 'nw-skin', '<button type="button" data-skin="day" class="on">نهاري</button><button type="button" data-skin="night">ليلي</button>'); box.appendChild(skin);
  skin.addEventListener('click', function(e){ var b = e.target.closest('[data-skin]'); if (!b) return; box.classList.toggle('nw-night', b.getAttribute('data-skin') === 'night'); skin.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x === b); }); });
  var lg = document.getElementById('mapOverlay');
  if (lg){ var items = lg.querySelectorAll('.legend-item'), txt = ['<i class="nw-k k1"></i> محطة رئيسية', '<i class="nw-k k2"></i> محطة فرعية', '<i class="nw-k k3"></i> ممر الشبكة', '<i class="nw-k k4"></i> رحلتك المختارة']; items.forEach(function(it, i){ if (txt[i]) it.innerHTML = txt[i]; }); }

  function card(){
    var h = state.hub, t = state.to, s = '';
    if (!h){ hud.innerHTML = '<div class="nw-card nw-hint"><b>اضغط أي محطة</b><span>لتشاهد خطوطها، ثم محطة ثانية لترسم رحلتك</span></div>'; return; }
    if (h && t){
      var p = path(h, t), via = p.slice(1, -1).map(function(x){ return HUB[x][0]; });
      s = '<div class="nw-card"><div class="nw-trip"><span>من</span><b>' + HUB[h][0] + '</b><i></i><span>إلى</span><b>' + HUB[t][0] + '</b></div>' +
        '<p>' + (via.length ? 'عبر ' + via.join('، ') : 'ممر مباشر') + ' · ' + (p.length - 1) + ' ' + (p.length - 1 > 2 ? 'ممرات' : p.length - 1 === 2 ? 'ممران' : 'ممر') + '</p>' +
        '<div class="nw-row"><small>خطوط ' + HUB[h][0] + '</small>' + (chips(h) || '<em>—</em>') + '</div>' + (chips(t) ? '<div class="nw-row"><small>خطوط ' + HUB[t][0] + '</small>' + chips(t) + '</div>' : '') +
        '<div class="nw-act"><button type="button" class="nw-go" data-do="search">اعرض الخطوط</button><button type="button" data-do="swap">عكس الاتجاه</button><button type="button" data-do="clear">مسح</button></div></div>';
    } else {
      var n = linesOf(h).length;
      s = '<div class="nw-card"><div class="nw-trip"><b>محطة ' + HUB[h][0] + '</b><span class="nw-n">' + (n ? n + (n > 10 ? ' خطاً' : n > 2 ? ' خطوط' : n === 2 ? ' خطان' : ' خط') : 'محطة عبور') + '</span></div>' +
        (n ? '<div class="nw-row">' + chips(h) + '</div>' : '') + '<p>اختر محطة ثانية لترسم رحلتك على الشبكة.</p><div class="nw-act"><button type="button" data-do="clear">مسح</button></div></div>';
    }
    hud.innerHTML = s;
    if (state.line){ var c = hud.querySelector('[data-line="' + state.line + '"]'); if (c) c.classList.add('on'); }
  }
  listeners.push(card);
  hud.addEventListener('click', function(e){
    var c = e.target.closest('[data-line]'); if (c){ try { selectRoute(c.getAttribute('data-line')); } catch(x){} return; }
    var d = e.target.closest('[data-do]'); if (!d) return; d = d.getAttribute('data-do');
    if (d === 'clear'){ state.hub = state.to = state.line = null; emit(); }
    if (d === 'swap'){ var x = state.hub; state.hub = state.to; state.to = x; state.line = null; emit(); }
    if (d === 'search'){
      var f = document.getElementById('fromSel'), t = document.getElementById('toSel'), a = HUB[state.hub][0], b = HUB[state.to][0];
      var has = function(sel, v){ return sel && [].some.call(sel.options, function(o){ return o.value === v; }); };
      if (has(f, a) && has(t, b)){ try { quickSearch(a, b); } catch(x){} }
      else { var mine = linesOf(state.hub).concat(linesOf(state.to)); if (mine.length){ try { renderRoutes(mine, a, b); } catch(x){} } else toast('لا خطوط تبدأ من هاتين المحطتين — راجع الخريطة الرسمية'); }
    }
  });
  function pick(h){
    if (!state.hub || (state.hub && state.to)){ state.hub = h; state.to = null; state.line = null; }
    else if (h === state.hub){ state.hub = null; state.line = null; }
    else { state.to = h; state.line = null; }
    emit();
  }

  /* a line chosen from the list focuses its terminal everywhere */
  var orig = window.selectRoute;
  if (typeof orig === 'function') window.selectRoute = function(n){
    var r = orig.apply(this, arguments), x = route(n);
    if (x){ state.hub = hubOf(x); state.to = null; state.line = n; emit(); var c = document.getElementById('rc-' + n); if (c) c.style.setProperty('--c', col(n)); }
    return r;
  };
  // each card carries its official line colour
  var rr = window.renderRoutes;
  if (typeof rr === 'function') window.renderRoutes = function(){ var r = rr.apply(this, arguments); document.querySelectorAll('.route-card').forEach(function(c){ c.style.setProperty('--c', col(c.id.slice(3))); }); return r; };
  document.querySelectorAll('.route-card').forEach(function(c){ c.style.setProperty('--c', col(c.id.slice(3))); });

  /* ---------- 2. the 3D network ---------- */
  var stage = el('div', 'nw-3d'); stage.id = 'kpNet3d'; box.appendChild(stage);
  var three = null, booting = false;
  function show(v){
    view = v; box.classList.toggle('nw-is3d', v === '3d');
    if (v === '3d'){ if (!three && !booting) boot(); else if (three) three.wake(); }
    else if (map) setTimeout(function(){ map.invalidateSize(); }, 50);
  }
  var sv = window.setView;
  if (typeof sv === 'function') window.setView = function(v){ var r = sv.apply(this, arguments); if (v === 'list') show('3d'); else if (v === 'map') show('map'); return r; };

  function boot(){
    booting = true; stage.innerHTML = '<div class="nw-load"><i></i>نجهّز مجسّم الشبكة…</div>';
    if (window.THREE) return build();
    var s = document.createElement('script'); s.src = '../assets/three.min.js'; s.onload = build;
    s.onerror = function(){ fail(); }; document.head.appendChild(s);
  }
  function fail(){ booting = false; stage.innerHTML = '<div class="nw-load">متصفحك لا يدعم العرض ثلاثي الأبعاد. <button type="button" class="nw-go" onclick="window.kpOfficialMap&&window.kpOfficialMap()">افتح الخريطة الرسمية</button></div>'; }

  function build(){
    var T = window.THREE, renderer;
    try { renderer = new T.WebGLRenderer({antialias:true, alpha:true}); } catch(e){ return fail(); }
    stage.innerHTML = '';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.appendChild(renderer.domElement);
    var labels = el('div', 'nw-labels'); stage.appendChild(labels);
    stage.appendChild(el('div', 'nw-tip', 'اسحب للتدوير · العجلة أو إصبعان للتقريب · اضغط محطة'));
    var scene = new T.Scene(); scene.fog = new T.Fog(0x14133A, 26, 58);
    var camera = new T.PerspectiveCamera(38, 1, .1, 200);
    scene.add(new T.HemisphereLight(0xdcdaff, 0x14133A, .78));
    var sun = new T.DirectionalLight(0xfff1c9, .85); sun.position.set(-8, 14, -6); scene.add(sun);

    // the sea and the land
    var sea = new T.Mesh(new T.PlaneGeometry(140, 140), new T.MeshPhongMaterial({color:0x1B1A52, shininess:60, specular:0x6f6cd0}));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -.32; scene.add(sea);
    var coast = [[-17,-3.2],[-12.6,-3.9],[-10.4,-3.5],[-8,-2.6],[-6.2,-3.6],[-5,-4.9],[-2.8,-5.5],[-1.2,-6.3],[.6,-7],[2.6,-7.3],[4.4,-6.8],[5.3,-5.2],[6.6,-3.6],[8.2,-2.9],[9.6,-1.9],[9.9,-.2],[9.2,2],[8.7,4.4],[8.6,7],[8.9,9.6],[9.6,13],[9.6,16],[-17,16]];
    var shape = new T.Shape(); shape.moveTo(coast[0][0], -coast[0][1]);
    shape.splineThru(coast.slice(1, 21).map(function(p){ return new T.Vector2(p[0], -p[1]); }));
    shape.lineTo(9.6, -16); shape.lineTo(-17, -16); shape.lineTo(-17, 3.2);
    var land = new T.Mesh(new T.ExtrudeGeometry(shape, {depth:.3, bevelEnabled:true, bevelSize:.08, bevelThickness:.08, bevelSegments:2, curveSegments:24}), [new T.MeshLambertMaterial({color:0x34328A}), new T.MeshLambertMaterial({color:0xFFC93C})]);
    land.rotation.x = -Math.PI / 2; land.position.y = -.3; scene.add(land);
    // street-grid texture on the land
    var cv = document.createElement('canvas'); cv.width = cv.height = 512; var g = cv.getContext('2d');
    g.fillStyle = '#2B2974'; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(255,255,255,.055)'; g.lineWidth = 1;
    for (var i = 0; i <= 512; i += 32){ g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; for (i = 0; i <= 512; i += 128){ g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    var tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(.12, .12); land.material[0].map = tex; land.material[0].color.set(0xffffff);

    function P(h, y){ return new T.Vector3(HUB[h][3], y || 0, HUB[h][4]); }
    // corridors: arced tubes with travelling lights
    var curves = {}, tubes = {}, pulses = [];
    EDGE.forEach(function(e, n){
      var a = P(e[0], .12), b = P(e[1], .12), mid = a.clone().add(b).multiplyScalar(.5); mid.y = .5 + a.distanceTo(b) * .13;
      var c = new T.QuadraticBezierCurve3(a, mid, b); curves[e[0] + '>' + e[1]] = c;
      scene.add(new T.Mesh(new T.TubeGeometry(c, 40, .055, 8), new T.MeshBasicMaterial({color:0xB9B7EE, transparent:true, opacity:.75})));
      var hot = new T.Mesh(new T.TubeGeometry(c, 40, .11, 10), new T.MeshBasicMaterial({color:0xFFC93C})); hot.visible = false; scene.add(hot); tubes[e[0] + '>' + e[1]] = hot;
      var dot = new T.Mesh(new T.SphereGeometry(.1, 10, 10), new T.MeshBasicMaterial({color:0xFFC93C})); scene.add(dot); pulses.push({m:dot, c:c, t:(n * .37) % 1, s:.1 + (n % 4) * .025});
    });
    // hubs
    var hubs = {}, hits = [];
    Object.keys(HUB).forEach(function(h){
      var d = HUB[h], main = d[5], H = main ? 1.5 : .7, grp = new T.Group(); grp.position.copy(P(h));
      var base = new T.Mesh(new T.CylinderGeometry(main ? .46 : .3, main ? .52 : .34, .12, 28), new T.MeshLambertMaterial({color:0x14133A})); base.position.y = .06; grp.add(base);
      var pole = new T.Mesh(new T.CylinderGeometry(.07, .07, H, 12), new T.MeshLambertMaterial({color:0xffffff})); pole.position.y = H / 2; grp.add(pole);
      var head = new T.Mesh(new T.SphereGeometry(main ? .26 : .17, 20, 20), new T.MeshPhongMaterial({color:main ? 0xFFC93C : 0xffffff, emissive:main ? 0x7a5a00 : 0x333366, shininess:80})); head.position.y = H + .1; grp.add(head);
      var ring = new T.Mesh(new T.TorusGeometry(main ? .62 : .42, .035, 8, 40), new T.MeshBasicMaterial({color:0xFFC93C, transparent:true, opacity:.9})); ring.rotation.x = Math.PI / 2; ring.position.y = .14; grp.add(ring);
      var hit = new T.Mesh(new T.CylinderGeometry(.7, .7, H + .6, 8), new T.MeshBasicMaterial({visible:false})); hit.position.y = H / 2; hit.userData.hub = h; grp.add(hit); hits.push(hit);
      scene.add(grp);
      var n = linesOf(h).length, lab = el('button', 'nw-lab' + (main ? ' main' : ''), d[0] + (n ? '<em>' + n + '</em>' : '')); lab.type = 'button'; lab.setAttribute('data-hub', h); labels.appendChild(lab);
      hubs[h] = {g:grp, head:head, ring:ring, H:H, lab:lab, top:new T.Vector3(d[3], H + .55, d[4])};
    });
    labels.addEventListener('click', function(e){ var b = e.target.closest('[data-hub]'); if (b) pick(b.getAttribute('data-hub')); });
    // the bus
    var bus = new T.Group(), body = new T.Mesh(new T.BoxGeometry(.95, .36, .34), new T.MeshLambertMaterial({color:0xffffff})); body.position.y = .22; bus.add(body);
    var glass = new T.Mesh(new T.BoxGeometry(.97, .13, .35), new T.MeshLambertMaterial({color:0x14133A})); glass.position.y = .29; bus.add(glass);
    var stripe = new T.Mesh(new T.BoxGeometry(.96, .06, .355), new T.MeshBasicMaterial({color:0xFFC93C})); stripe.position.y = .1; bus.add(stripe);
    bus.visible = false; scene.add(bus);

    // camera rig
    var rig = {az:.55, pol:.95, dist:27, tx:-1, tz:1.5}, goal = {az:.55, pol:.95, dist:27, tx:-1, tz:1.5}, idle = 0, drag = null, moved = 0, pt = {}, pd = 0;
    cam3 = function(f){ goal.dist = Math.max(9, Math.min(40, goal.dist * f)); };
    var dom = renderer.domElement;
    dom.addEventListener('pointerdown', function(e){ pt[e.pointerId] = [e.clientX, e.clientY]; drag = [e.clientX, e.clientY]; moved = 0; idle = 0; try { dom.setPointerCapture(e.pointerId); } catch(x){} });
    dom.addEventListener('pointermove', function(e){
      if (!pt[e.pointerId]) return; var ids = Object.keys(pt), p0 = pt[e.pointerId];
      if (ids.length === 1){ var dx = e.clientX - p0[0], dy = e.clientY - p0[1]; moved += Math.abs(dx) + Math.abs(dy); goal.az -= dx * .006; goal.pol = Math.max(.35, Math.min(1.35, goal.pol - dy * .005)); }
      else { var o = pt[ids[0] == e.pointerId ? ids[1] : ids[0]], d = Math.hypot(e.clientX - o[0], e.clientY - o[1]); if (pd) cam3(pd / d); pd = d; moved = 99; }
      pt[e.pointerId] = [e.clientX, e.clientY]; idle = 0;
    });
    var up = function(e){
      if (pt[e.pointerId] && moved < 6 && e.type === 'pointerup'){
        var r = dom.getBoundingClientRect(), v = new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), rc = new T.Raycaster(); rc.setFromCamera(v, camera);
        var x = rc.intersectObjects(hits)[0]; if (x) pick(x.object.userData.hub);
      }
      delete pt[e.pointerId]; pd = 0;
    };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', function(e){ e.preventDefault(); cam3(e.deltaY > 0 ? 1.1 : .9); idle = 0; }, {passive:false});

    function size(){ var w = stage.clientWidth || 600, h = stage.clientHeight || 420; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); goal.fit = w < 560 ? 1.45 : 1; }
    size(); window.addEventListener('resize', size); if (window.ResizeObserver) new ResizeObserver(size).observe(stage);

    var trip = null; // {segs:[{c,rev}], t}
    function sync(){
      Object.keys(tubes).forEach(function(k){ tubes[k].visible = false; });
      Object.keys(hubs).forEach(function(h){ var on = h === state.hub || h === state.to; hubs[h].lab.classList.toggle('on', on); hubs[h].on = on; hubs[h].ring.material.color.set(on && state.line && h === state.hub ? col(state.line) : '#FFC93C'); });
      trip = null; bus.visible = false;
      if (state.hub && state.to){
        var p = path(state.hub, state.to), segs = [], cx = 0, cz = 0;
        for (var i = 0; i < p.length - 1; i++){ var k = p[i] + '>' + p[i+1], rev = false; if (!curves[k]){ k = p[i+1] + '>' + p[i]; rev = true; } tubes[k].visible = true; segs.push({c:curves[k], rev:rev}); }
        p.forEach(function(h){ cx += HUB[h][3]; cz += HUB[h][4]; });
        trip = {segs:segs, t:0}; bus.visible = true; body.material.color.set('#ffffff');
        goal.tx = cx / p.length; goal.tz = cz / p.length; goal.dist = Math.max(15, Math.min(30, 11 + P(state.hub).distanceTo(P(state.to)) * 1.15));
      } else if (state.hub){
        goal.tx = HUB[state.hub][3]; goal.tz = HUB[state.hub][4]; goal.dist = 17;
        if (state.line){ bus.visible = true; body.material.color.set(col(state.line)); }
      } else { goal.tx = -1; goal.tz = 1.5; goal.dist = 27; }
      idle = 0;
    }
    listeners.push(sync); sync();

    var on = true, last = performance.now(), clock = 0, v3 = new T.Vector3();
    function frame(now){
      if (!on) return; requestAnimationFrame(frame);
      var dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt; idle += dt;
      if (idle > 3 && !Object.keys(pt).length) goal.az += dt * .05;
      rig.az += (goal.az - rig.az) * .1; rig.pol += (goal.pol - rig.pol) * .1; rig.dist += (goal.dist * (goal.fit || 1) - rig.dist) * .07; rig.tx += (goal.tx - rig.tx) * .07; rig.tz += (goal.tz - rig.tz) * .07;
      camera.position.set(rig.tx + rig.dist * Math.sin(rig.pol) * Math.sin(rig.az), rig.dist * Math.cos(rig.pol), rig.tz + rig.dist * Math.sin(rig.pol) * Math.cos(rig.az));
      camera.lookAt(rig.tx, .4, rig.tz);
      pulses.forEach(function(p){ p.t = (p.t + dt * p.s) % 1; p.c.getPoint(p.t, p.m.position); });
      Object.keys(hubs).forEach(function(h){ var o = hubs[h], k = o.on ? 1.25 + Math.sin(clock * 4) * .18 : 1; o.ring.scale.set(k, k, 1); o.head.position.y = o.H + .1 + (o.on ? Math.sin(clock * 3) * .06 : 0); });
      if (trip){
        trip.t = (trip.t + dt * .22) % trip.segs.length; var s = trip.segs[Math.floor(trip.t)], f = trip.t % 1, u = s.rev ? 1 - f : f;
        s.c.getPoint(u, bus.position); s.c.getPoint(Math.max(0, Math.min(1, u + (s.rev ? -.02 : .02))), v3); bus.position.y += .05; if (v3.distanceTo(bus.position) > .001){ bus.lookAt(v3.x, bus.position.y, v3.z); bus.rotateY(Math.PI / 2); }
      } else if (bus.visible && state.hub){
        var a = clock * .9, c = HUB[state.hub]; bus.position.set(c[3] + Math.cos(a) * 1.05, .14, c[4] + Math.sin(a) * 1.05); bus.rotation.set(0, -a, 0);
      }
      renderer.render(scene, camera);
      var w = stage.clientWidth, hh = stage.clientHeight;
      Object.keys(hubs).forEach(function(h){ var o = hubs[h]; v3.copy(o.top).project(camera); var vis = v3.z < 1; o.lab.style.display = vis ? '' : 'none'; if (vis) o.lab.style.transform = 'translate(' + ((v3.x * .5 + .5) * w).toFixed(1) + 'px,' + ((-v3.y * .5 + .5) * hh).toFixed(1) + 'px) translate(-50%,-100%)'; });
    }
    three = {wake:function(){ size(); if (!on){ on = true; last = performance.now(); requestAnimationFrame(frame); } }, sleep:function(){ on = false; }};
    booting = false; requestAnimationFrame(frame);
    // stop drawing when the model is off screen or hidden
    setInterval(function(){ var vis = view === '3d' && !document.hidden; if (vis && !on) three.wake(); else if (!vis && on) three.sleep(); }, 600);
  }

  /* ---------- 3. the timetable board ---------- */
  // مواعيد تشغيل تجريبية إلى أن يُعتمد الجدول الرسمي — تُعدَّل من استوديو الموقع (site.sched)
  var DEF = {work:{first:'05:00', last:'23:00', peak:15, off:20, bands:[[6,9],[13,16]]}, rest:{first:'06:00', last:'23:00', peak:25, off:25, bands:[]}};
  function plan(num, day){
    var s = null; try { s = K && K.site && K.site().sched; } catch(e){}
    var d = (s && s[num] && s[num][day]) || (s && s['*'] && s['*'][day]) || DEF[day], out = [];
    var m = function(t){ var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
    var seed = 0; String(num).split('').forEach(function(c){ seed += c.charCodeAt(0); });
    for (var t = m(d.first) + (seed % 3) * 5; t <= m(d.last); ){ out.push(t); var h = t / 60, pk = (d.bands || []).some(function(b){ return h >= b[0] && h < b[1]; }); t += pk ? d.peak : d.off; }
    return {d:d, list:out, a:m(d.first), b:m(d.last)};
  }
  function hm(t){ var h = Math.floor(t / 60) % 24, m = t % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  var tick = null, sc = {day:null, at:null};
  window.renderSchedule = function(r){
    var grid = document.getElementById('schedGrid'); if (!grid) return;
    var head = grid.previousElementSibling; if (head) head.style.display = 'none';
    var now = new Date(), wd = now.getDay(), day = sc.day || (wd === 5 || wd === 6 ? 'rest' : 'work'), p = plan(r.num, day);
    var hub = HUB[hubOf(r)][0], c = col(r.num);
    var bands = (p.d.bands || []).map(function(b){ return '<i class="pk" style="right:' + (b[0] / 24 * 100) + '%;width:' + ((b[1] - b[0]) / 24 * 100) + '%"></i>'; }).join('');
    var hours = [0, 3, 6, 9, 12, 15, 18, 21].map(function(h){ return '<u style="right:' + (h / 24 * 100) + '%">' + (h < 10 ? '0' : '') + h + '</u>'; }).join('');
    grid.innerHTML = '<div class="sc" style="--c:' + c + '">' +
      '<div class="sc-top"><div class="sc-led"><small>الحافلة القادمة · خط ' + r.num + '</small><b id="scCount">--:--</b><span id="scWhen"></span></div>' +
      '<div class="sc-side"><div class="sc-seg"><button type="button" data-day="work"' + (day === 'work' ? ' class="on"' : '') + '>أيام العمل</button><button type="button" data-day="rest"' + (day === 'rest' ? ' class="on"' : '') + '>الجمعة والسبت</button></div>' +
      '<label class="sc-at">أريد المغادرة عند<input type="time" id="scAt" value="' + (sc.at || '') + '"></label><div class="sc-chips" id="scNext"></div></div></div>' +
      '<div class="sc-bar"><i class="run" style="right:' + (p.a / 1440 * 100) + '%;width:' + ((p.b - p.a) / 1440 * 100) + '%"></i>' + bands + '<i class="now" id="scNow"></i>' + hours + '</div>' +
      '<div class="sc-facts"><div><small>أول رحلة</small><b>' + hm(p.a) + '</b></div><div><small>آخر رحلة</small><b>' + hm(p.list[p.list.length - 1]) + '</b></div><div><small>وقت الذروة</small><b>كل ' + p.d.peak + ' د</b></div><div><small>باقي اليوم</small><b>كل ' + p.d.off + ' د</b></div><div><small>رحلات اليوم</small><b>' + p.list.length + '</b></div></div>' +
      '<div class="sc-foot"><button type="button" class="sc-rem" id="scRem">ذكّرني قبل الموعد بـ 10 دقائق</button><span>مواعيد تجريبية من محطة ' + hub + ' إلى أن يُعتمد الجدول الرسمي · للتأكيد اتصل بالخط الساخن <b>1880001</b></span></div></div>';
    var a = document.getElementById('avgTime'), f = document.getElementById('freqTime'); if (a) a.textContent = '—'; if (f) f.textContent = p.d.peak === p.d.off ? p.d.peak + ' دقيقة' : p.d.peak + '–' + p.d.off + ' دقيقة';
    if (a && a.parentNode) a.parentNode.style.display = 'none';
    function upd(){
      var n = new Date(), cur = n.getHours() * 60 + n.getMinutes(), secs = n.getSeconds(), ref = cur, custom = false;
      var at = document.getElementById('scAt'); if (at && at.value){ var q = at.value.split(':'); ref = (+q[0]) * 60 + (+q[1]); custom = true; }
      var nx = p.list.filter(function(t){ return custom ? t >= ref : t > cur; }), cnt = document.getElementById('scCount'), wh = document.getElementById('scWhen'), box2 = document.getElementById('scNext'), nw = document.getElementById('scNow');
      if (!cnt) return clearInterval(tick);
      if (nw) nw.style.right = ((cur + secs / 60) / 1440 * 100) + '%';
      if (!nx.length){ cnt.textContent = hm(p.list[0]); wh.textContent = 'انتهت رحلات اليوم — أول رحلة غداً'; box2.innerHTML = ''; return; }
      if (custom){ cnt.textContent = hm(nx[0]); wh.textContent = 'أقرب رحلة بعد ' + hm(ref) + ' من محطة ' + hub; }
      else { var left = (nx[0] - cur) * 60 - secs, mm = Math.floor(left / 60), ss = left % 60; cnt.textContent = (mm > 99 ? hm(nx[0]) : (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss); wh.textContent = (mm > 99 ? 'تغادر' : 'دقيقة · تغادر') + ' ' + hm(nx[0]) + ' من محطة ' + hub; }
      var s = nx.slice(1, 6).map(function(t){ return '<span>' + hm(t) + '</span>'; }).join(''); if (box2.getAttribute('data-k') !== s){ box2.setAttribute('data-k', s); box2.innerHTML = '<small>ثم</small>' + s; }
    }
    clearInterval(tick); upd(); tick = setInterval(upd, 1000);
    grid.querySelectorAll('[data-day]').forEach(function(b){ b.onclick = function(){ sc.day = b.getAttribute('data-day'); window.renderSchedule(r); }; });
    var at = document.getElementById('scAt'); if (at) at.oninput = function(){ sc.at = at.value; upd(); };
    var rem = document.getElementById('scRem'); if (rem) rem.onclick = function(){
      var n = new Date(), cur = n.getHours() * 60 + n.getMinutes(), nx = p.list.filter(function(t){ return t > cur + 10; })[0]; if (!nx) return toast('لا رحلات قادمة اليوم');
      rem.textContent = 'سنذكّرك عند ' + hm(nx - 10) + ' لرحلة ' + hm(nx); rem.classList.add('on');
      setTimeout(function(){ toast('حافلة خط ' + r.num + ' تغادر محطة ' + hub + ' بعد 10 دقائق'); try { if (window.Notification && Notification.permission === 'granted') new Notification('KPTC — خط ' + r.num, {body:'تغادر محطة ' + hub + ' بعد 10 دقائق'}); } catch(e){} }, Math.max(0, (nx - 10 - cur) * 60000 - n.getSeconds() * 1000));
      try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch(e){}
    };
  };

  card();
  try { if (typeof activeRoute !== 'undefined' && activeRoute) window.selectRoute(activeRoute.num); } catch(e){}
})();
