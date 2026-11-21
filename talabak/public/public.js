(function () {
  'use strict';
  const main = document.getElementById('main'), foot = document.getElementById('foot');
  const kiosk = location.pathname.replace(/\/+$/, '') === '/kiosk';
  const qs = new URLSearchParams(location.search);
  const allowed = ['qr_booth', 'kiosk', 'promo', 'web'];
  const source = kiosk ? 'kiosk' : (allowed.includes(qs.get('s')) ? qs.get('s') : 'web');
  if (kiosk) document.body.classList.add('kiosk');
  const clean = (v, n) => /^[A-Za-z0-9_-]+$/.test(v || '') ? v.slice(0, n) : '';
  const tag = clean(qs.get('b'), 30), rep = clean(qs.get('rep'), 20);

  const T = (x, p) => (window.I18N ? I18N.t(x, p) : x), esc = s => KForm.esc(s);
  let cfg = null, formApi = null;
  function fail(msg) { main.innerHTML = `<div class="vwrap narrow" style="padding-top:130px"><div class="card"><div class="notice bad" role="alert">${esc(T(msg))}</div><div class="actions"><button class="btn btn-primary" id="retry">${esc(T('إعادة المحاولة'))}</button></div></div></div>`; document.getElementById('retry').onclick = load; }
  function chrome() { // النصوص الثابتة خارج النموذج
    document.getElementById('appname').textContent = T('طلبك معنا');
    document.title = T('طلبك معنا') + ' — ' + T('شركة النقل العام الكويتية');
    const ev = document.getElementById('evname'); ev.textContent = cfg ? T(cfg.event.name) + ' — ' + T('شركة النقل العام الكويتية') : T('شركة النقل العام الكويتية');
    if (cfg) foot.innerHTML = `<div class="foot-logo"><img src="/brand/logo.png" width="150" height="64" alt="KPTC"></div><p>🔒 ${esc(T(cfg.privacy_text))}</p><p>${esc(T('هذا النموذج لتسجيل الاهتمام بالخدمة ومتابعته؛ تسجيل الطلب لا يُعد تأكيدًا للحجز أو تفعيلًا للخدمة، وتخضع الأسعار والتوافر للتأكيد من الجهة المختصة.'))}</p>`;
    document.getElementById('langcur').textContent = I18N.info().name;
    const menu = document.getElementById('langmenu');
    menu.innerHTML = I18N.LANGS.map(l => `<li role="none"><button type="button" role="menuitemradio" aria-checked="${l.code === I18N.lang()}" data-lang="${l.code}" lang="${l.code}" dir="${l.dir}"><span>${esc(l.name)}</span>${l.code === I18N.lang() ? '<i>✓</i>' : ''}</button></li>`).join('');
  }
  function setupLang() {
    const btn = document.getElementById('langbtn'), menu = document.getElementById('langmenu');
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.onclick = e => { e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) { const c = menu.querySelector('[aria-checked="true"]'); if (c) c.focus(); } };
    menu.onclick = e => { const b = e.target.closest('[data-lang]'); if (!b) return; close(); I18N.set(b.dataset.lang, { persist: !kiosk }); btn.focus(); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
    I18N.onChange(() => { chrome(); if (formApi) formApi.refresh(); else if (cfg && !cfg.event.accepting) closedCard(); });
  }
  function closedCard() { main.innerHTML = `<div class="vwrap narrow" style="padding-top:130px"><div class="card"><h1>${esc(T('استقبال الطلبات متوقف'))}</h1><p>${esc(T(cfg.event.closed_message))}</p></div></div>`; }
  async function load() {
    try { const r = await fetch('/api/public/config', { cache: 'no-store' }); if (!r.ok) throw 0; cfg = await r.json(); }
    catch { return fail('تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة. (لم يُسجَّل أي طلب)'); }
    chrome();
    if (!cfg.event.accepting) return closedCard();
    main.innerHTML = '<div id="form-root"></div>';
    formApi = KForm.mount(document.getElementById('form-root'), { config: cfg, mode: kiosk ? 'kiosk' : 'public', source, tag, rep, url: '/api/public/requests' });
  }
  // الكيوسك يبدأ بالعربية دائمًا (جهاز مشترك: لا نحفظ تفضيلات زائر)، والزائر العادي يُستعاد اختياره السابق أو لغة متصفحه
  setupLang();
  I18N.set(I18N.detect(!kiosk), { persist: false }).then(load);
})();
