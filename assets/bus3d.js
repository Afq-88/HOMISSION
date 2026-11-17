/* KPTC — 3D ad preview on a K-Bus (three.js, no other dependency).
   KPBus3D.mount(container, getState) → { refresh(), look(view) }
   getState() returns { color, brand, message, contact, faces:{right,left,rear,front,roof}, mode:'half'|'full'|'wrap' } */
(function(){
  var L = 10.5, H = 2.75, W = 2.5, BASE = 0.42;           // bus body, metres
  var WHEEL_X = [3.25, -2.75], WHEEL_R = 0.5;
  var F_DISPLAY = '"Noto Kufi Arabic","IBM Plex Sans Arabic",sans-serif';

  function canvas(w, h){ var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function isLight(hex){ var m = /^#?([0-9a-f]{6})/i.exec(hex || ''); if (!m) return false; var n = parseInt(m[1], 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 165; }
  function paint(ctx, color, x, y, w, h){
    if (/gradient/.test(color)){ var cs = color.match(/#[0-9a-f]{6}/ig) || ['#2E2C78', '#FFC93C'], g = ctx.createLinearGradient(x, y, x + w, y + h); cs.forEach(function(c, i){ g.addColorStop(cs.length > 1 ? i / (cs.length - 1) : 0, c); }); ctx.fillStyle = g; }
    else ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function fit(ctx, text, maxW, size, weight){ do { ctx.font = weight + ' ' + size + 'px ' + F_DISPLAY; size -= 2; } while (ctx.measureText(text).width > maxW && size > 12); return size + 2; }
  /* a real photograph inside a rectangle: 'cover' fills it and crops the overflow, 'contain' keeps the whole picture on the brand colour */
  function drawPhoto(ctx, im, color, x, y, w, h){
    var el = im.el, iw = el.naturalWidth || el.width, ih = el.naturalHeight || el.height; if (!iw || !ih) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (im.fit === 'contain'){ paint(ctx, color, x, y, w, h); var k = Math.min(w / iw, h / ih); ctx.drawImage(el, x + (w - iw * k) / 2, y + (h - ih * k) / 2, iw * k, ih * k); }
    else { var k2 = Math.max(w / iw, h / ih), dw = iw * k2, dh = ih * k2; ctx.drawImage(el, x - (dw - w) * (im.ox == null ? .5 : im.ox), y - (dh - h) * (im.oy == null ? .5 : im.oy), dw, dh); }
    ctx.restore();
  }
  function adArt(ctx, st, x, y, w, h, small, tx, tw, photo){
    paint(ctx, st.color, x, y, w, h);
    if (photo && photo.el){ drawPhoto(ctx, photo, st.color, x, y, w, h); return; }
    var bx = x, bw = w; if (tw){ x = tx; w = tw; }
    var ink = /gradient/.test(st.color) ? '#fff' : (isLight(st.color) ? '#14133A' : '#fff');
    ctx.save(); ctx.beginPath(); ctx.rect(bx, y, bw, h); ctx.clip();
    ctx.globalAlpha = .14; ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(bx + bw * .08, y + h * 1.05, h * .9, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    var lines = small ? [st.brand] : [st.brand, st.message].concat(st.contact ? [st.contact] : []);
    var sizes = small ? [h * .42] : [h * .34, h * .2, h * .13], total = 0, i, gaps = h * .07;
    for (i = 0; i < lines.length; i++){ sizes[i] = fit(ctx, lines[i], w * .88, sizes[i], i ? 600 : 800); total += sizes[i]; }
    total += gaps * (lines.length - 1);
    var cy = y + h / 2 - total / 2;
    for (i = 0; i < lines.length; i++){ ctx.font = (i ? 600 : 800) + ' ' + sizes[i] + 'px ' + F_DISPLAY; ctx.globalAlpha = i === 2 ? .85 : 1; ctx.fillText(lines[i], x + w / 2, cy + sizes[i] / 2); cy += sizes[i] + gaps; }
    ctx.restore();
  }
  function slot(ctx, x, y, w, h, label){
    ctx.save(); ctx.setLineDash([16, 12]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,201,60,.9)'; ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(255,201,60,.9)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl'; ctx.font = '700 ' + Math.min(h * .3, 54) + 'px ' + F_DISPLAY; ctx.fillText(label, x + w / 2, y + h / 2); ctx.restore();
  }
  function bodyBase(ctx, w, h){
    var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9EA4AB'); g.addColorStop(.5, '#868C93'); g.addColorStop(1, '#6C7178'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8FC0E4'; ctx.fillRect(0, 0, w, h * .1);                         // roof edge, K-Bus light blue
    ctx.fillStyle = '#5C8FBC'; ctx.fillRect(0, h * .1, w, h * .012);
    ctx.fillStyle = '#4B5057'; ctx.fillRect(0, h * .93, w, h * .07);                  // skirt
  }
  function glass(ctx, x, y, w, h, r){
    var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#2A3A52'); g.addColorStop(.55, '#152033'); g.addColorStop(1, '#0E1626');
    ctx.fillStyle = g; rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip(); ctx.fillStyle = 'rgba(160,200,255,.13)'; ctx.beginPath(); ctx.moveTo(x + w * .15, y); ctx.lineTo(x + w * .4, y); ctx.lineTo(x + w * .2, y + h); ctx.lineTo(x - w * .05, y + h); ctx.fill(); ctx.restore();
  }
  function rr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* side texture. frontRight: the bus nose is on the right edge of the image */
  function sideTex(st, on, doors, frontRight){
    var w = 3072, h = 804, c = canvas(w, h), ctx = c.getContext('2d'), m = w / L;   // m = px per metre
    if (!frontRight){ ctx.translate(w, 0); ctx.scale(-1, 1); }                       // draw as "nose right", mirror shapes only
    var X = function(xm){ return (xm + L / 2) * m; };                                // bus x (metres, nose = +L/2) → px
    bodyBase(ctx, w, h);
    var wy = h * .16, wh = h * .36;
    glass(ctx, X(-L / 2 + .25), wy, (L - .5 - 1.25) * m, wh, 14);                    // passenger window band
    ctx.fillStyle = '#3B4047'; for (var k = -3.6; k < 3.0; k += 1.32) ctx.fillRect(X(k) - 5, wy, 10, wh);   // pillars
    glass(ctx, X(L / 2 - 1.15), wy - h * .03, 1.0 * m, wh + h * .06, 14);            // driver window
    var doorXs = doors ? [L / 2 - 2.05, -0.55] : [];
    // ad
    var ay = h * .56, ah = h * .35, wrap = on && st.mode === 'wrap';
    var ph = st.images && st.images[frontRight ? 'right' : 'left'];
    if (wrap){ paint(ctx, st.color, 0, h * .112, w, h * .82);
      if (ph && ph.el){ ctx.save(); if (!frontRight){ ctx.translate(w, 0); ctx.scale(-1, 1); } drawPhoto(ctx, ph, st.color, 0, h * .112, w, h * .82); ctx.restore(); }   // the picture is never mirrored
      ctx.save(); ctx.globalAlpha = .55; glass(ctx, X(-L / 2 + .25), wy, (L - 1.75) * m, wh, 14); ctx.restore(); }
    var a0 = st.mode === 'half' ? WHEEL_X[1] + .85 : -L / 2 + .3, a1 = st.mode === 'half' ? WHEEL_X[0] - .85 : (doors ? L / 2 - 2.2 : L / 2 - 1.3);
    if (doors && st.mode !== 'half') a1 = L / 2 - 2.2;
    ctx.save();
    if (!frontRight){ ctx.setTransform(1, 0, 0, 1, 0, 0); var t0 = w - X(a1), t1 = w - X(a0); } else { var t0 = X(a0), t1 = X(a1); }   // text is never mirrored
    // on the door side the copy sits in the widest stretch the doors leave free
    var s0 = a0, s1 = a1; if (doors){ if (st.mode === 'half'){ s0 = 0.55; s1 = a1; } else { s0 = a0; s1 = -0.7; } }
    var u0 = frontRight ? X(s0) : w - X(s1), u1 = frontRight ? X(s1) : w - X(s0);
    if (on && ph && ph.el){ if (!wrap) adArt(ctx, st, t0, ay, t1 - t0, ah, false, 0, 0, ph); }
    else if (on) { if (wrap) adArtOnly(ctx, st, u0, ay, u1 - u0, ah); else adArt(ctx, st, t0, ay, t1 - t0, ah, false, u0, u1 - u0); }
    else slot(ctx, t0, ay, t1 - t0, ah, 'موضع إعلانك');
    ctx.restore();
    // doors over the ad
    doorXs.forEach(function(dx){ ctx.fillStyle = '#3B4047'; ctx.fillRect(X(dx) - 6, wy - 8, .95 * m + 12, h * .93 - wy + 8); glass(ctx, X(dx), wy, .95 * m, h * .93 - wy - 8, 8); ctx.fillStyle = '#3B4047'; ctx.fillRect(X(dx) + .95 * m / 2 - 3, wy, 6, h * .93 - wy - 8); });
    // wheel arches
    WHEEL_X.forEach(function(wx){ ctx.fillStyle = '#17181C'; ctx.beginPath(); ctx.arc(X(wx), h * 1.02, (WHEEL_R + .2) * m, Math.PI, 0); ctx.fill(); });
    // K-BUS mark when the lower panel is free
    if (!on){ ctx.save(); if (!frontRight){ ctx.setTransform(1, 0, 0, 1, 0, 0); } ctx.font = '800 62px ' + F_DISPLAY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#F2D23C'; var kx = frontRight ? X(-L / 2 + 1.1) : w - X(-L / 2 + 1.1); ctx.strokeText('K-BUS', kx, h * .74); ctx.restore(); }
    // lighting falloff
    var sh = ctx.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.22)'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = sh; ctx.fillRect(0, 0, w, h);
    return c;
  }
  function adArtOnly(ctx, st, x, y, w, h){   // text of a full wrap (the colour is already everywhere)
    var keep = st.color; st = Object.assign({}, st); var ink = /gradient/.test(keep) ? '#fff' : (isLight(keep) ? '#14133A' : '#fff');
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    var s1 = fit(ctx, st.brand, w * .9, h * .42, 800); ctx.fillText(st.brand, x + w / 2, y + h * .34);
    ctx.font = '600 ' + fit(ctx, st.message, w * .9, h * .24, 600) + 'px ' + F_DISPLAY; ctx.fillText(st.message, x + w / 2, y + h * .74);
  }
  function endTex(st, on, front){
    var w = 512, h = 564, c = canvas(w, h), ctx = c.getContext('2d');
    bodyBase(ctx, w, h);
    if (on && st.mode === 'wrap') paint(ctx, st.color, 0, h * .112, w, h * .82);
    if (front){
      glass(ctx, w * .06, h * .13, w * .88, h * .5, 22);                               // windshield
      ctx.fillStyle = '#0B0A1A'; rr(ctx, w * .2, h * .145, w * .6, h * .085, 6); ctx.fill();
      ctx.fillStyle = '#FFC93C'; ctx.font = '800 34px ' + F_DISPLAY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl'; ctx.fillText('15  المالية', w / 2, h * .19);
      ctx.strokeStyle = '#0B0F18'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(w * .3, h * .62); ctx.lineTo(w * .42, h * .36); ctx.moveTo(w * .7, h * .62); ctx.lineTo(w * .58, h * .36); ctx.stroke();   // wipers
      ctx.fillStyle = '#8FC0E4'; ctx.fillRect(0, h * .66, w, h * .27);
      ctx.fillStyle = '#1B1F26'; rr(ctx, w * .14, h * .7, w * .72, h * .07, 8); ctx.fill();   // grille
      [w * .1, w * .9].forEach(function(x){ ctx.fillStyle = '#F4F7FB'; ctx.beginPath(); ctx.ellipse(x, h * .82, 30, 20, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#FFD36A'; ctx.beginPath(); ctx.arc(x, h * .9, 9, 0, 7); ctx.fill(); });
      if (on && st.images && st.images.front && st.images.front.el) adArt(ctx, st, w * .2, h * .785, w * .6, h * .1, true, 0, 0, st.images.front); else if (on && st.mode !== 'wrap') adArt(ctx, st, w * .2, h * .785, w * .6, h * .1, true); else if (!on) { ctx.fillStyle = '#F2C200'; rr(ctx, w * .4, h * .8, w * .2, h * .06, 4); ctx.fill(); ctx.fillStyle = '#14133A'; ctx.font = '800 24px sans-serif'; ctx.fillText('0000', w / 2, h * .832); }
    } else {
      glass(ctx, w * .1, h * .15, w * .8, h * .3, 18);                                // rear window
      ctx.fillStyle = '#17181C'; ctx.fillRect(w * .12, h * .86, w * .76, h * .05);
      [w * .07, w * .93].forEach(function(x){ ctx.fillStyle = '#C2352E'; rr(ctx, x - 16, h * .5, 32, h * .2, 8); ctx.fill(); ctx.fillStyle = '#F59E0B'; rr(ctx, x - 16, h * .72, 32, h * .07, 6); ctx.fill(); });
      if (on && st.images && st.images.rear && st.images.rear.el) adArt(ctx, st, w * .15, h * .49, w * .7, h * .34, false, 0, 0, st.images.rear); else if (on && st.mode !== 'wrap') adArt(ctx, st, w * .15, h * .49, w * .7, h * .34); else if (on) adArtOnly(ctx, st, w * .15, h * .49, w * .7, h * .34); else slot(ctx, w * .15, h * .49, w * .7, h * .34, 'الخلفية');
    }
    var sh = ctx.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, w, h);
    return c;
  }
  function roofTex(st, on){
    var w = 1024, h = 256, c = canvas(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = '#8FC0E4'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(0, h * .12, w, 5); ctx.fillRect(0, h * .86, w, 5);
    if (on) adArt(ctx, st, w * .12, h * .2, w * .56, h * .6, false, 0, 0, st.images && st.images.roof); else slot(ctx, w * .12, h * .2, w * .56, h * .6, 'السقف');
    return c;
  }

  function mount(box, getState){
    var THREE = window.THREE; if (!THREE) return null;
    var renderer; try { renderer = new THREE.WebGLRenderer({antialias: true, alpha: true}); } catch(e){ return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
    box.appendChild(renderer.domElement);
    var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 2, .1, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b6f86, .95));
    var sun = new THREE.DirectionalLight(0xffffff, .75); sun.position.set(6, 12, 9); scene.add(sun);
    var fill = new THREE.DirectionalLight(0xcfe0ff, .3); fill.position.set(-8, 4, -7); scene.add(fill);

    var bus = new THREE.Group(); scene.add(bus);
    function tex(c){ var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }
    var mats = []; for (var i = 0; i < 6; i++) mats.push(new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .42, metalness: .18}));
    mats[3] = new THREE.MeshStandardMaterial({color: 0x1b1c20, roughness: .9});
    var body = new THREE.Mesh(new THREE.BoxGeometry(L, H, W), mats); body.position.y = BASE + H / 2; bus.add(body);
    // rounded shoulders: a slightly narrower cap on the roof and AC pods
    var capM = new THREE.MeshStandardMaterial({color: 0x8fc0e4, roughness: .5, metalness: .1});
    var cap = new THREE.Mesh(new THREE.BoxGeometry(L - .5, .12, W - .3), capM); cap.position.y = BASE + H + .06; bus.add(cap);
    var podM = new THREE.MeshStandardMaterial({color: 0xdfe6ee, roughness: .6});
    [[1.6, 2.4], [-2.4, 1.9]].forEach(function(p){ var pod = new THREE.Mesh(new THREE.BoxGeometry(p[1], .26, 1.5), podM); pod.position.set(p[0], BASE + H + .25, 0); bus.add(pod); });
    // bumpers
    var bumpM = new THREE.MeshStandardMaterial({color: 0x2a2d33, roughness: .7});
    [L / 2 + .04, -L / 2 - .04].forEach(function(x){ var b = new THREE.Mesh(new THREE.BoxGeometry(.14, .3, W + .04), bumpM); b.position.set(x, BASE + .2, 0); bus.add(b); });
    // mirrors
    [1, -1].forEach(function(s){ var arm = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .45), bumpM); arm.position.set(L / 2 - .25, BASE + H * .78, s * (W / 2 + .2)); bus.add(arm); var mir = new THREE.Mesh(new THREE.BoxGeometry(.1, .55, .28), bumpM); mir.position.set(L / 2 - .2, BASE + H * .62, s * (W / 2 + .42)); bus.add(mir); });
    // wheels
    var tyreM = new THREE.MeshStandardMaterial({color: 0x15161a, roughness: .95}), hubM = new THREE.MeshStandardMaterial({color: 0xc9ced6, roughness: .3, metalness: .7});
    var wheels = [];
    WHEEL_X.forEach(function(x){ [1, -1].forEach(function(s){
      var g = new THREE.Group(); var tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, .34, 28), tyreM); tyre.rotation.x = Math.PI / 2; g.add(tyre);
      var hub = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R * .56, WHEEL_R * .56, .36, 20), hubM); hub.rotation.x = Math.PI / 2; g.add(hub);
      for (var k = 0; k < 5; k++){ var nut = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .38), tyreM); nut.position.set(Math.cos(k * 1.2566) * .16, Math.sin(k * 1.2566) * .16, 0); g.add(nut); }
      g.position.set(x, WHEEL_R, s * (W / 2 - .12)); bus.add(g); wheels.push(g);
    }); });
    // ground: soft shadow + lane marks
    var gc = canvas(512, 512), gx = gc.getContext('2d'), rg = gx.createRadialGradient(256, 256, 30, 256, 256, 250); rg.addColorStop(0, 'rgba(20,19,58,.42)'); rg.addColorStop(.6, 'rgba(20,19,58,.16)'); rg.addColorStop(1, 'rgba(20,19,58,0)'); gx.fillStyle = rg; gx.fillRect(0, 0, 512, 512);
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.7, W * 3.4), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false})); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .01; scene.add(shadow);
    var laneM = new THREE.MeshBasicMaterial({color: 0xffc93c, transparent: true, opacity: .55});
    for (var q = -3; q <= 3; q++){ var ln = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .14), laneM); ln.rotation.x = -Math.PI / 2; ln.position.set(q * 3.2, .012, W * 1.25); scene.add(ln); }

    function refresh(){
      var st = getState(), f = st.faces || {};
      var set = function(i, c){ if (mats[i].map) mats[i].map.dispose(); mats[i].map = tex(c); mats[i].needsUpdate = true; };
      set(0, endTex(st, !!f.front, true)); set(1, endTex(st, !!f.rear, false)); set(2, roofTex(st, !!f.roof));
      set(4, sideTex(st, !!f.right, true, true)); set(5, sideTex(st, !!f.left, false, false));
      capM.color.set(f.roof ? 0x6f8fb0 : 0x8fc0e4);
    }

    // orbit
    var yaw = -.62, pitch = .2, dist = 16.5, tYaw = yaw, tPitch = pitch, tDist = dist, auto = true, idle = 0, drag = null, pinch = 0;
    var VIEWS = {right: [-.35, .14], left: [Math.PI + .35, .14], rear: [-Math.PI / 2 - .3, .16], front: [Math.PI / 2 + .3, .16], roof: [-.5, 1.0], hero: [-.62, .2]};
    function look(v){ var p = VIEWS[v]; if (!p) return; var d = p[0] - tYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); tYaw += d; tPitch = p[1]; auto = false; idle = 0; }
    var el = renderer.domElement; el.style.touchAction = 'none'; el.style.cursor = 'grab';
    el.addEventListener('pointerdown', function(e){ drag = {x: e.clientX, y: e.clientY}; auto = false; idle = 0; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
    el.addEventListener('pointermove', function(e){ if (!drag) return; tYaw -= (e.clientX - drag.x) * .008; tPitch = Math.max(-.05, Math.min(1.15, tPitch + (e.clientY - drag.y) * .006)); drag = {x: e.clientX, y: e.clientY}; idle = 0; });
    var up = function(){ drag = null; el.style.cursor = 'grab'; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', function(e){ e.preventDefault(); tDist = Math.max(10, Math.min(30, tDist + e.deltaY * .012)); idle = 0; auto = false; }, {passive: false});

    function size(){ var w = box.clientWidth, h = box.clientHeight || w * .56; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < 520 ? 46 : 34; cam.updateProjectionMatrix(); }
    size(); if (window.ResizeObserver) new ResizeObserver(size).observe(box); else window.addEventListener('resize', size);
    var visible = true; if (window.IntersectionObserver) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(box);
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, last = performance.now();
    (function loop(t){
      requestAnimationFrame(loop); var dt = Math.min(.05, (t - last) / 1000); last = t; if (!visible) return;
      idle += dt; if (idle > 5 && !reduce) auto = true;
      if (auto && !drag && !reduce) tYaw += dt * .22;
      yaw += (tYaw - yaw) * Math.min(1, dt * 6); pitch += (tPitch - pitch) * Math.min(1, dt * 6); dist += (tDist - dist) * Math.min(1, dt * 6);
      var cy = BASE + H * .45; cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, cy + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(0, cy, 0);
      if (auto && !reduce) wheels.forEach(function(w){ w.rotation.z -= dt * 1.2; });
      renderer.render(scene, cam);
    })(last);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    refresh();
    return {refresh: refresh, look: look};
  }
  /* real-world size of every ad zone, in centimetres, for the given sticker mode: what the advertiser should design for */
  function zones(mode){
    var side = function(doors){ var a0 = mode === 'half' ? WHEEL_X[1] + .85 : -L / 2 + .3, a1 = mode === 'half' ? WHEEL_X[0] - .85 : (doors ? L / 2 - 2.2 : L / 2 - 1.3); return a1 - a0; };
    var wrap = mode === 'wrap', sh = H * .35;
    return {right:{w:wrap ? L : side(true), h:wrap ? H * .82 : sh}, left:{w:wrap ? L : side(false), h:wrap ? H * .82 : sh}, rear:{w:W * .7, h:H * (.34 * 564 / 564)}, front:{w:W * .6, h:H * .1}, roof:{w:L * .56 * (1024 / 1024), h:W * .6}};
  }
  window.KPBus3D = {mount: mount, zones: zones, art: {adArt: adArt, drawPhoto: drawPhoto, fit: fit, paint: paint, isLight: isLight, slot: slot}};
})();
