/* KPTC — K-Bus 3D model (glTF) with the advertiser's artwork printed onto it the way a real wrap is:
   a flat vinyl sheet laid on the body panel, with the vents, lamps, plate, doors and wheel arches cut out of it.
   Positions below are measured on the supplied model (metres, bus nose = +X, passenger doors = +Z).

   import('./busgl.js') → ready() : Promise<boolean>,  mount(box, getState) → {refresh, look},  zones(mode)
   getState() returns { color, brand, message, contact, faces:{right,left,rear,front,roof}, mode:'half'|'full'|'wrap', images:{face:{el,fit,ox,oy}} } */
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const MODEL = new URL('./models/kptc_city.glb', import.meta.url).href;
const F_DISPLAY = '"Noto Kufi Arabic","IBM Plex Sans Arabic",sans-serif';

/* ---- where every vinyl sheet sits on the body ---- */
const REAR  = {x: -6.092, z0: -1.2, z1: 1.2, y0: .56, y1: 2.84};
const FRONT = {x: 6.043, z0: -.68, z1: .68, y0: .66, y1: 1.05};
const ROOF  = {y: 3.128, x0: .2, x1: 5.4, z0: -1.1, z1: 1.1};
const SIDE  = {z: 1.285, y0: .56, yStrip: 1.42, yWrap: 2.52, X0: -5.85, X1: 5.75, hX0: -3.05, hX1: 3.05};
const WHEELS = [3.75, -3.76], ARCH_R = .78, ARCH_Y = .565;
const DOORS = [[4.38, 5.5], [-1.25, .06]];            // passenger doors, +Z side only
const GRILLE = [-5.45, -4.6, .62, 1.42];              // engine grille behind the rear wheel, both sides
const WINDOWS = [1.42, 2.52];                         // glazed band: a wrap there is perforated film

function sideRect(mode){
  const wrap = mode === 'wrap', half = mode === 'half' && !wrap;
  const x0 = half ? SIDE.hX0 : SIDE.X0, x1 = half ? SIDE.hX1 : SIDE.X1, y1 = wrap ? SIDE.yWrap : SIDE.yStrip;
  return {x0, x1, y0: SIDE.y0, y1, w: x1 - x0, h: y1 - SIDE.y0};
}
export function zones(mode){
  const s = sideRect(mode), r = {w: REAR.z1 - REAR.z0, h: REAR.y1 - REAR.y0}, f = {w: FRONT.z1 - FRONT.z0, h: FRONT.y1 - FRONT.y0}, t = {w: ROOF.x1 - ROOF.x0, h: ROOF.z1 - ROOF.z0};
  return {right: {w: s.w, h: s.h}, left: {w: s.w, h: s.h}, rear: r, front: f, roof: t};
}

/* ---- loading (once per page) ---- */
let loading = null, art = null;
function webgl(){ try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl'); } catch (e) { return false; } }
function needArt(){
  if (window.KPBus3D && window.KPBus3D.art) { art = window.KPBus3D.art; return Promise.resolve(true); }
  return new Promise(res => { const s = document.createElement('script'); s.src = new URL('./bus3d.js', import.meta.url).href; s.onload = () => { art = window.KPBus3D && window.KPBus3D.art; res(!!art); }; s.onerror = () => res(false); document.head.appendChild(s); });
}
export function ready(){
  if (loading) return loading;
  loading = (async () => {
    if (!webgl()) return false;
    if (!(await needArt())) return false;
    try { const g = await new GLTFLoader().loadAsync(MODEL); return g; } catch (e) { return false; }
  })();
  return loading;
}

/* ---- the artwork, painted flat on a canvas that is exactly the sheet's size ---- */
function canvas(w, h){ const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; }
function inkOf(st){ return /gradient/.test(st.color) ? '#fff' : (art.isLight(st.color) ? '#14133A' : '#fff'); }
function fitText(ctx, text, maxW, size, weight){ do { ctx.font = weight + ' ' + size + 'px ' + F_DISPLAY; size -= 2; } while (ctx.measureText(text).width > maxW && size > 10); return size + 2; }
/* a long thin sheet (a bus side): brand, message and phone sit in one row instead of stacking */
function stripArt(ctx, st, w, h){
  art.paint(ctx, st.color, 0, 0, w, h);
  const ink = inkOf(st);
  ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(w * .06, h * 1.2, h * 1.1, 0, 7); ctx.fill(); ctx.arc(w * .94, -h * .2, h * .9, 0, 7); ctx.fill(); ctx.restore();
  ctx.fillStyle = ink; ctx.textBaseline = 'middle'; ctx.direction = 'rtl'; ctx.textAlign = 'center';
  const cells = st.contact ? [[.74, .22, st.brand, 800], [.40, .40, st.message, 600], [.12, .16, st.contact, 700]] : [[.72, .26, st.brand, 800], [.34, .5, st.message, 600]];
  cells.forEach(c => { const cw = w * c[1], s = fitText(ctx, c[2], cw * .94, h * (c[3] === 800 ? .5 : .34), c[3]); ctx.font = c[3] + ' ' + s + 'px ' + F_DISPLAY; ctx.fillText(c[2], w * c[0], h / 2); });
}
function artOn(ctx, st, w, h, photo){
  if (photo && photo.el){ art.paint(ctx, st.color, 0, 0, w, h); art.drawPhoto(ctx, photo, st.color, 0, 0, w, h); return; }
  if (w / h > 2.8) stripArt(ctx, st, w, h); else art.adArt(ctx, st, 0, 0, w, h, h < w * .3, 0, 0, null);
}
/* cut shapes out of the sheet: whatever is underneath shows through */
function holes(ctx, W, H, fn){ ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; fn(ctx); ctx.restore(); }

function rearSheet(st, ppm){
  const w = REAR.z1 - REAR.z0, h = REAR.y1 - REAR.y0, c = canvas(w * ppm, h * ppm), ctx = c.getContext('2d'), W = c.width, H = c.height;
  artOn(ctx, st, W, H, st.images && st.images.rear);
  const X = z => (z - REAR.z0) / w * W, Y = y => (REAR.y1 - y) / h * H;
  holes(ctx, W, H, g => {
    [-1, 1].forEach(s => { const a = s * 1.2, b = s * .96; g.fillRect(X(Math.min(a, b)), Y(1.58), Math.abs(X(a) - X(b)), Y(.52) - Y(1.58)); });   // tail lamps
    [-.7, -.42, -.14, .14, .42, .7].forEach(zc => [1.62, 1.53, 1.44, 1.35, 1.26].forEach(yc => g.fillRect(X(zc - .09), Y(yc + .013), X(zc + .09) - X(zc - .09), Y(yc - .013) - Y(yc + .013))));   // vent slots
    g.fillRect(X(-.22), Y(.62), X(.22) - X(-.22), Y(.46) - Y(.62));                    // number plate
    g.fillRect(X(-.2), Y(2.835), X(.2) - X(-.2), Y(2.76) - Y(2.835));                  // high-level brake lamp
    g.beginPath(); g.arc(X(0), Y(1.0), .06 * ppm, 0, 7); g.fill();                     // tow-point cap
  });
  return c;
}
function frontSheet(st, ppm){
  const w = FRONT.z1 - FRONT.z0, h = FRONT.y1 - FRONT.y0, c = canvas(w * ppm, h * ppm), ctx = c.getContext('2d');
  artOn(ctx, st, c.width, c.height, st.images && st.images.front);
  return c;
}
function roofSheet(st, ppm){
  const w = ROOF.x1 - ROOF.x0, h = ROOF.z1 - ROOF.z0, c = canvas(w * ppm, h * ppm), ctx = c.getContext('2d'), W = c.width, H = c.height;
  artOn(ctx, st, W, H, st.images && st.images.roof);
  holes(ctx, W, H, g => { const u = x => (x - ROOF.x0) / w * W, v = z => (z - ROOF.z0) / h * H; g.fillRect(u(3.3), v(-.43), u(4.12) - u(3.3), v(.43) - v(-.43)); });   // roof hatch
  return c;
}
function sideSheet(st, right, ppm){
  const r = sideRect(st.mode), c = canvas(r.w * ppm, r.h * ppm), ctx = c.getContext('2d'), W = c.width, H = c.height;
  artOn(ctx, st, W, H, st.images && st.images[right ? 'right' : 'left']);
  const X = x => (right ? (x - r.x0) : (r.x1 - x)) / r.w * W, Y = y => (r.y1 - y) / r.h * H;
  const rx = (a, b, y0, y1) => { const p = X(a), q = X(b); ctx.fillRect(Math.min(p, q), Y(y1), Math.abs(q - p), Y(y0) - Y(y1)); };
  holes(ctx, W, H, g => {
    WHEELS.forEach(wx => { g.beginPath(); g.arc(X(wx), Y(ARCH_Y), ARCH_R * ppm, 0, 7); g.fill(); });
    if (right) DOORS.forEach(d => rx(d[0], d[1], 0, 3));
    rx(GRILLE[0], GRILLE[1], GRILLE[2], GRILLE[3]);
  });
  if (st.mode === 'wrap'){   // perforated film over the glazing: see-through, but the picture still reads
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(0, Y(WINDOWS[1]), W, Y(WINDOWS[0]) - Y(WINDOWS[1])); ctx.restore();
  }
  return c;
}

/* ---- the viewer ---- */
export function mount(box, getState){
  if (!loading) return null;
  const renderer = (() => { try { return new THREE.WebGLRenderer({antialias: true, alpha: true}); } catch (e) { return null; } })();
  if (!renderer) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 2, .1, 200);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .62;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8fa8, .55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.15); sun.position.set(7, 14, 10); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xcfe0ff, .45); rim.position.set(-9, 6, -8); scene.add(rim);

  const bus = new THREE.Group(); scene.add(bus);
  const api = {refresh(){}, look(){}};
  const wheels = [], decals = {};
  /* soft contact shadow + lane marks, like the rest of the site's 3D */
  const gc = canvas(512, 512), gx = gc.getContext('2d'), rg = gx.createRadialGradient(256, 256, 30, 256, 256, 250);
  rg.addColorStop(0, 'rgba(20,19,58,.42)'); rg.addColorStop(.6, 'rgba(20,19,58,.16)'); rg.addColorStop(1, 'rgba(20,19,58,0)'); gx.fillStyle = rg; gx.fillRect(0, 0, 512, 512);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(21, 8.6), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false}));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .01; scene.add(shadow);

  const sheets = {}; const mk = (name, rotY, rotX) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({roughness: .5, metalness: .04, transparent: true, alphaTest: .45, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.FrontSide})); m.visible = false; if (rotY) m.rotation.y = rotY; if (rotX) m.rotation.x = rotX; bus.add(m); sheets[name] = m; return m; };
  mk('rear', -Math.PI / 2); mk('front', Math.PI / 2); mk('roof', 0, -Math.PI / 2); mk('right'); mk('left', Math.PI);

  function setSheet(name, on, cv, w, h, px, py, pz){
    const m = sheets[name]; m.visible = !!on; if (!on) return;
    if (m.material.map) m.material.map.dispose();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); m.material.map = t; m.material.needsUpdate = true;
    m.geometry.dispose(); m.geometry = new THREE.PlaneGeometry(w, h); m.position.set(px, py, pz);
  }
  const PPM = {side: 230, rear: 360, front: 400, roof: 240};
  function refresh(){
    if (!art) return;
    const st = getState(), f = st.faces || {}, z = zones(st.mode), s = sideRect(st.mode);
    setSheet('rear', f.rear, f.rear ? rearSheet(st, PPM.rear) : null, z.rear.w, z.rear.h, REAR.x, (REAR.y0 + REAR.y1) / 2, 0);
    setSheet('front', f.front, f.front ? frontSheet(st, PPM.front) : null, z.front.w, z.front.h, FRONT.x, (FRONT.y0 + FRONT.y1) / 2, 0);
    setSheet('roof', f.roof, f.roof ? roofSheet(st, PPM.roof) : null, z.roof.w, z.roof.h, (ROOF.x0 + ROOF.x1) / 2, ROOF.y, 0);
    setSheet('right', f.right, f.right ? sideSheet(st, true, PPM.side) : null, s.w, s.h, (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, SIDE.z);
    setSheet('left', f.left, f.left ? sideSheet(st, false, PPM.side) : null, s.w, s.h, (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, -SIDE.z);
    /* the factory livery lettering would show through the vinyl: hide it where a sheet covers it */
    if (decals.rear) decals.rear.forEach(d => d.visible = !f.rear);
    if (decals.side) decals.side.forEach(d => d.visible = !(f.right || f.left));
  }

  loading.then(g => {
    if (!g) return;
    const model = g.scene.clone(true);
    model.traverse(o => { if (o.isMesh){ const n = (o.material && o.material.name) || ''; if (/rear_city/.test(n)) (decals.rear = decals.rear || []).push(o); if (/city_side|access/.test(n)) (decals.side = decals.side || []).push(o); } if (/^Wheel_/.test(o.name) && !/_mesh$/.test(o.name)) wheels.push(o); });
    bus.add(model); refresh();
    const ph = box.querySelector('.kp-3d-load'); if (ph) ph.remove();
  });

  /* orbit */
  const CY = 1.55; let yaw = .62, pitch = .2, dist = 21, tYaw = yaw, tPitch = pitch, tDist = dist, auto = true, idle = 0, drag = null;
  const VIEWS = {right: [.28, .1, 'side', 0], left: [Math.PI - .28, .1, 'side', 0], rear: [-Math.PI / 2 + .26, .1, 'end', -5.2], front: [Math.PI / 2 - .26, .12, 'end', 5.2], roof: [.35, 1.1, 'roof', 2.8], hero: [.62, .2, 'side', 0]};
  function frame(k){   // distance at which the part of the bus we are looking at fits the box, wide or tall
    const D = {side: [13.4, 4.4, 1.5], end: [3.5, 3.8, 1.2], roof: [10, 5.6, 1.5]}[k] || [13.4, 4.4, 1.5], vf = cam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
    return Math.max(8, Math.max((D[0] / 2) / Math.tan(hf / 2), (D[1] / 2) / Math.tan(vf / 2)) + D[2]);
  }
  let kind = 'side', tX = 0, cX = 0;
  function look(v){ const p = VIEWS[v]; if (!p) return; let d = p[0] - tYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); tYaw += d; tPitch = p[1]; kind = p[2]; tX = p[3]; tDist = frame(kind); auto = false; idle = 0; }
  const el = renderer.domElement; el.style.touchAction = 'none'; el.style.cursor = 'grab';
  const pts = new Map(); let pinch = 0;
  el.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); drag = {x: e.clientX, y: e.clientY}; auto = false; idle = 0; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
  el.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2){ const a = [...pts.values()], d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); if (pinch) tDist = Math.max(7, Math.min(34, tDist * (pinch / d))); pinch = d; idle = 0; return; }
    if (!drag) return; tYaw -= (e.clientX - drag.x) * .008; tPitch = Math.max(-.02, Math.min(1.25, tPitch + (e.clientY - drag.y) * .006)); drag = {x: e.clientX, y: e.clientY}; idle = 0;
  });
  const up = e => { pts.delete(e.pointerId); pinch = 0; if (!pts.size){ drag = null; el.style.cursor = 'grab'; } else { const r = [...pts.values()][0]; drag = {x: r[0], y: r[1]}; } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); tDist = Math.max(7, Math.min(34, tDist + e.deltaY * .02)); idle = 0; auto = false; }, {passive: false});

  function size(){ const w = box.clientWidth || 320, h = box.clientHeight || w * .56; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < 520 ? 44 : 32; cam.updateProjectionMatrix(); if (auto) tDist = dist = frame('side'); }
  size(); if (window.ResizeObserver) new ResizeObserver(size).observe(box); else window.addEventListener('resize', size);
  let visible = true; if (window.IntersectionObserver) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(box);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; let last = performance.now();
  (function loop(t){
    requestAnimationFrame(loop); const dt = Math.min(.05, (t - last) / 1000); last = t; if (!visible) return;
    idle += dt; if (idle > 6 && !reduce && !auto){ auto = true; }
    if (auto && !drag && !reduce) tYaw += dt * .2;
    yaw += (tYaw - yaw) * Math.min(1, dt * 6); pitch += (tPitch - pitch) * Math.min(1, dt * 6); dist += (tDist - dist) * Math.min(1, dt * 6);
    cX += (tX - cX) * Math.min(1, dt * 5); cam.position.set(cX + Math.sin(yaw) * Math.cos(pitch) * dist, CY + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(cX, CY, 0);
    renderer.render(scene, cam);
  })(last);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { refresh(); } catch (e) {} });
  api.refresh = refresh; api.look = look; api.camera = cam; api.scene = scene; api.bus = bus;
  return api;
}
