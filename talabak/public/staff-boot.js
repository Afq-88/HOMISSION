(function () {
  'use strict';
  const ST = window.ST, BASE_TITLE = document.title;
  function parse() {
    const h = (location.hash || '#/').replace(/^#\/?/, '');
    if (!h) return ['', null];
    const parts = h.split('/');
    if (parts[0] === 'r') return ['r', parts[1]];
    return [parts.join('/'), null];
  }
  async function route() {
    if (!ST.me) return;
    if (ST.cleanup) { ST.cleanup(); ST.cleanup = null; }
    if (ST.stopTimer) { clearInterval(ST.stopTimer); ST.stopTimer = null; }
    ST.shell();
    const [name, arg] = parse();
    if (name === '') ST.clearUnread();
    const fn = ST.routes[name];
    if (!fn || (name.startsWith('admin/') && !ST.isAdmin())) { ST.app.innerHTML = '<div class="notice bad">الصفحة غير متاحة.</div>'; return; }
    try { await fn(arg); } catch (e) { if (e.status === 401 || (e.data && e.data.must_change)) return; ST.app.innerHTML = `<div class="notice bad" role="alert">${ST.esc(e.message)}</div>`; }
    window.scrollTo(0, 0);
  }
  ST.route = route;

  // ================= الاستقبال المباشر: تنبيه فوري بكل طلب جديد =================
  let soundOn = false; try { soundOn = localStorage.getItem('tm_sound') === '1'; } catch { /* */ }
  const sndBtn = document.getElementById('soundbtn'), liveBtn = document.getElementById('livebtn'), liveTxt = document.getElementById('livetxt');
  const paintSound = () => { sndBtn.textContent = soundOn ? '🔔' : '🔕'; sndBtn.title = soundOn ? 'التنبيه الصوتي والإشعارات مفعّلة' : 'اضغط لتفعيل التنبيه الصوتي والإشعارات'; };
  paintSound();
  function beep() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; const ctx = beep.ctx || (beep.ctx = new AC()); if (ctx.state === 'suspended') ctx.resume();
      [[880, 0], [1175, 0.17], [1568, 0.34]].forEach(([f, t]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; const t0 = ctx.currentTime + t;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32); o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + 0.34); });
    } catch { /* */ }
  }
  sndBtn.onclick = async () => {
    soundOn = !soundOn; try { localStorage.setItem('tm_sound', soundOn ? '1' : '0'); } catch { /* */ }
    paintSound();
    if (soundOn) { beep(); try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch { /* */ } ST.toast('تم تفعيل التنبيه الصوتي — أبقِ هذه الصفحة مفتوحة'); }
  };
  let since = -1, unread = 0, fails = 0, lastOk = 0;
  ST.fresh = new Set();
  ST.clearUnread = () => { unread = 0; document.title = BASE_TITLE; };
  function setLive(ok, d) {
    liveBtn.hidden = false; sndBtn.hidden = false;
    liveBtn.classList.toggle('off', !ok);
    let t = ok ? 'مباشر' : 'غير متصل — إعادة المحاولة';
    if (ok && d && d.kiosks) t += ` · أجهزة الجناح ${d.kiosks.online}/${d.kiosks.total}`;
    liveTxt.textContent = t;
  }
  liveBtn.onclick = () => { if (ST.isAdmin() && !liveBtn.classList.contains('off')) location.hash = '#/admin/kiosks'; else poll(); };
  function onNew(items) {
    unread += items.length; document.title = `(${unread}) ${BASE_TITLE}`;
    items.forEach(i => ST.fresh.add(i.id)); setTimeout(() => items.forEach(i => ST.fresh.delete(i.id)), 20000);
    const first = items[0], label = i => `${i.ref.replace('KPTC-', '')} · ${ST.svcLabel(i.service)} · ${i.name}`;
    ST.toast(items.length === 1 ? `🔔 طلب جديد: ${label(first)}` : `🔔 ${items.length} طلبات جديدة`);
    if (soundOn) beep();
    try { if (soundOn && document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('طلب جديد — طلبك معنا', { body: items.length === 1 ? label(first) : `${items.length} طلبات جديدة`, icon: '/icon-192.png', tag: 'tm-new' }); } catch { /* */ }
    const [name] = parse();
    const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (name === '' && !typing && ST.routes['']) ST.routes['']();
  }
  async function poll() {
    if (!ST.me || ST.me.must_change) return;
    try {
      const d = await ST.api('GET', '/api/staff/live?since=' + since);
      fails = 0; lastOk = Date.now(); setLive(true, d);
      if (since >= 0 && d.items.length) onNew(d.items);
      since = d.latest;
    } catch (e) { fails++; if (fails >= 2) setLive(false); }
  }
  setInterval(poll, 6000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { poll(); if (parse()[0] === '') ST.clearUnread(); } });
  window.addEventListener('online', poll);

  ST.start = async function () {
    if (ST.me && ST.me.must_change) return ST.renderMustChange();
    if (ST.me && ST.me.needs_2fa) return ST.renderTotpSetup();
    try { ST.cfg = await ST.api('GET', '/api/staff/config'); } catch (e) { return; }
    if (!location.hash) location.hash = '#/';
    since = -1; poll(); route();
  };
  window.addEventListener('hashchange', route);
  (async function init() {
    try { const r = await ST.api('GET', '/api/auth/me'); if (r.user) { ST.me = r.user; ST.start(); } else ST.renderLogin(); }
    catch (e) { ST.app.innerHTML = `<div class="notice bad">${ST.esc(e.message)}</div>`; }
  })();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* التثبيت اختياري */ });
})();
