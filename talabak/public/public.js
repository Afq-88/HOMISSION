(function () {
  'use strict';
  const main = document.getElementById('main'), foot = document.getElementById('foot');
  const kiosk = location.pathname.replace(/\/+$/, '') === '/kiosk';
  const qs = new URLSearchParams(location.search);
  const allowed = ['qr_booth', 'kiosk', 'promo', 'web'];
  const source = kiosk ? 'kiosk' : (allowed.includes(qs.get('s')) ? qs.get('s') : 'web');
  if (kiosk) document.body.classList.add('kiosk');

  function fail(msg) { main.innerHTML = `<div class="card" style="margin-top:20px"><div class="notice bad" role="alert">${KForm.esc(msg)}</div><div class="actions"><button class="btn btn-primary" id="retry">إعادة المحاولة</button></div></div>`; document.getElementById('retry').onclick = load; }
  async function load() {
    let cfg;
    try { const r = await fetch('/api/public/config', { cache: 'no-store' }); if (!r.ok) throw 0; cfg = await r.json(); }
    catch { return fail('تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة. (لم يُسجَّل أي طلب)'); }
    document.getElementById('evname').textContent = cfg.event.name + ' — شركة النقل العام الكويتية';
    if (cfg.logo) document.getElementById('brand').innerHTML = `<img src="${cfg.logo}" alt="شعار الشركة"><span><b>طلبك معنا</b><small>${KForm.esc(cfg.event.name)}</small></span>`;
    foot.innerHTML = `<p>🔒 ${KForm.esc(cfg.privacy_text)}</p><p>هذا النموذج لتسجيل الاهتمام بالخدمة ومتابعته؛ تسجيل الطلب لا يُعد تأكيدًا للحجز أو تفعيلًا للخدمة، وتخضع الأسعار والتوافر للتأكيد من الجهة المختصة.</p>`;
    if (!cfg.event.accepting) { main.innerHTML = `<div class="card" style="margin-top:20px"><h1>استقبال الطلبات متوقف</h1><p>${KForm.esc(cfg.event.closed_message)}</p></div>`; return; }
    main.innerHTML = '<div id="form-root"></div>';
    KForm.mount(document.getElementById('form-root'), { config: cfg, mode: kiosk ? 'kiosk' : 'public', source, url: '/api/public/requests' });
  }
  load();
})();
