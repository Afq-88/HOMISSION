/* صفحات المدير (٢): الإدارات، أجهزة الجناح والتحكم عن بعد، ملصق QR، المندوبون الميدانيون */
(function () {
  'use strict';
  const ST = window.ST, esc = ST.esc, app = ST.app, R = ST.routes;
  const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}">لا توجد بيانات</td></tr>`}</tbody></table></div>`;
  const ask = (title, label, value = '', long = false) => new Promise(res => {
    const m = ST.modal(`<h2>${esc(title)}</h2><div class="field"><label>${esc(label)}</label>${long ? `<textarea id="pv">${esc(value)}</textarea>` : `<input id="pv" value="${esc(value)}">`}</div><div class="actions"><button class="btn btn-primary" data-ok>موافق</button><button class="btn btn-ghost" data-close>إلغاء</button></div>`);
    const inp = m.el.querySelector('#pv'); inp.focus();
    m.el.querySelector('[data-ok]').onclick = () => { const v = inp.value; m.close(); res(v); };
    m.el.parentNode.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === m.el.parentNode) res(null); });
  });
  const baseUrl = async () => { const { settings } = await ST.api('GET', '/api/admin/settings'); return { base: (settings.public_base_url || location.origin).replace(/\/+$/, ''), settings }; };
  const isLocal = b => /localhost|127\.0\.0\.1|^http:/.test(b);
  const makeQr = u => { const q = qrcode(0, 'M'); q.addData(u); q.make(); return q; };
  const qrPng = (u, name) => {
    const q = makeQr(u), n = q.getModuleCount(), cell = 14, m = 4, size = (n + 2 * m) * cell, c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * cell, (r + m) * cell, cell, cell);
    c.toBlob(bl => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = name; a.click(); });
  };
  const refreshDepts = async () => { ST.cfg.departments = (await ST.api('GET', '/api/admin/departments')).departments; };

  // ================= الإدارات =================
  R['admin/departments'] = async function () {
    const { departments } = await ST.api('GET', '/api/admin/departments');
    app.innerHTML = `<h1 style="margin-top:0">الإدارات</h1><p class="lead">تُصنَّف الطلبات تلقائيًا إلى إدارة حسب الخدمة (من «الخدمات والحقول»)، ويمكن للموظف تغييرها لكل طلب. الأسماء الافتراضية مقترحة — عدّلها لتطابق هيكل الشركة.</p>
      <div class="card"><h2>إضافة إدارة</h2><form id="df" class="filters"><div class="field"><label>الاسم</label><input name="name" required></div><div class="field"><label>اللون</label><input name="color" type="color" value="#2e2c78" style="padding:4px"></div><button class="btn btn-primary">إضافة</button></form></div>
      <div class="card" style="margin-top:12px">${tbl(['الاسم', 'اللون', 'مفعّلة', 'عدد الطلبات', ''], departments.map(d => `<tr data-id="${d.id}"><td><input data-k="name" value="${esc(d.name)}" style="min-height:42px"></td><td><input data-k="color" type="color" value="${esc(d.color)}" style="min-height:42px;padding:3px;width:70px"></td>
        <td><input type="checkbox" data-k="active" ${d.active ? 'checked' : ''} style="width:22px;height:22px"></td><td>${d.requests}</td><td><div class="row-actions"><button class="btn btn-primary btn-sm" data-save>حفظ</button><button class="btn btn-ghost btn-sm" data-del>حذف</button></div></td></tr>`))}</div>`;
    app.querySelector('#df').onsubmit = async e => { e.preventDefault(); try { await ST.api('POST', '/api/admin/departments', { name: e.target.name.value, color: e.target.color.value }); await refreshDepts(); ST.toast('تمت الإضافة'); R['admin/departments'](); } catch (err) { ST.toast(err.message, true); } };
    app.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id, val = k => { const el = tr.querySelector(`[data-k=${k}]`); return el.type === 'checkbox' ? el.checked : el.value; };
      tr.querySelector('[data-save]').onclick = async () => { try { await ST.api('PATCH', '/api/admin/departments/' + id, { name: val('name'), color: val('color'), active: val('active') }); await refreshDepts(); ST.toast('تم الحفظ'); } catch (err) { ST.toast(err.message, true); } };
      tr.querySelector('[data-del]').onclick = async () => { if (await ST.confirm('حذف الإدارة؟ (لا يُسمح إن كانت مرتبطة بطلبات أو خدمات؛ عطّلها بدل ذلك)', 'حذف', true)) { try { await ST.api('DELETE', '/api/admin/departments/' + id); await refreshDepts(); R['admin/departments'](); } catch (err) { ST.toast(err.message, true); } } };
    });
  };

  // ================= أجهزة الجناح: تحكم عن بعد =================
  const SCREEN = { welcome: 'شاشة الترحيب', form: 'زائر يعبّئ طلبًا', receipt: 'تعرض بطاقة استلام' };
  R['admin/kiosks'] = async function paint() {
    const { kiosks } = await ST.api('GET', '/api/admin/kiosks');
    const ago = iso => { const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000)); return s < 90 ? `قبل ${s} ث` : s < 5400 ? `قبل ${Math.round(s / 60)} د` : ST.fmtDate(iso); };
    const online = kiosks.filter(k => k.online).length;
    app.innerHTML = `<div class="row-actions" style="justify-content:space-between"><h1 style="margin:0">أجهزة الجناح — تحكم عن بعد</h1><span class="badge ${online ? 's-ready' : 'red'}">${online} / ${kiosks.length} متصلة</span></div>
      <p class="lead">كل جهاز لوحي يفتح <span class="mono">/kiosk</span> يظهر هنا تلقائيًا. الأوامر تصل الجهاز خلال ثوانٍ، ولا تحمل أي بيانات عملاء.</p>
      <div class="card"><h2>أوامر لكل الأجهزة</h2><div class="row-actions"><button class="btn btn-ghost btn-sm" data-all="reset">مسح الشاشات</button><button class="btn btn-ghost btn-sm" data-all="reload">تحديث الصفحات</button><button class="btn btn-ghost btn-sm" data-all="pause">إيقاف الكل مؤقتًا</button><button class="btn btn-ghost btn-sm" data-all="resume">استئناف الكل</button><button class="btn btn-ghost btn-sm" data-all="banner">لافتة للجميع</button></div></div>
      ${kiosks.length ? kiosks.map(k => `<div class="card" style="margin-top:12px" data-id="${esc(k.id)}"><div class="devcard"><div><b style="font-size:19px"><span class="dot ${k.online ? 'on' : ''}"></span>${esc(k.name)}</b> <small class="mono">${esc(k.id)}</small><br>
        <small>${k.online ? 'متصل' : 'غير متصل'} · آخر نبضة ${esc(ago(k.last_seen))} · ${esc(SCREEN[k.screen] || k.screen || '—')} · طلبات هذا الجهاز: <b>${k.requests}</b></small>
        <div style="margin-top:6px">${k.paused ? `<span class="badge red">متوقف: ${esc(k.pause_msg || '')}</span> ` : ''}${k.banner ? `<span class="badge gold">لافتة: ${esc(k.banner)}</span> ` : ''}${k.pending.length ? `<span class="badge">بانتظار التنفيذ: ${k.pending.map(esc).join('، ')}</span>` : ''}</div></div>
        <div class="row-actions"><button class="btn btn-ghost btn-sm" data-a="reset">مسح الشاشة</button><button class="btn btn-ghost btn-sm" data-a="reload">تحديث</button>${k.paused ? '<button class="btn btn-primary btn-sm" data-a="resume">استئناف</button>' : '<button class="btn btn-ghost btn-sm" data-a="pause">إيقاف مؤقت</button>'}<button class="btn btn-ghost btn-sm" data-a="banner">لافتة</button><button class="btn btn-ghost btn-sm" data-a="rename">إعادة تسمية</button><button class="btn btn-ghost btn-sm" data-a="forget">إزالة</button></div></div></div>`).join('') : '<div class="notice info" style="margin-top:12px">لا توجد أجهزة بعد. افتح <span class="mono">/kiosk</span> على الجهاز اللوحي (يُفضّل «إضافة إلى الشاشة الرئيسية» ليعمل بملء الشاشة).</div>'}`;
    const send = (id, body) => ST.api('POST', '/api/admin/kiosks/' + encodeURIComponent(id), body);
    async function act(id, a, name) {
      try {
        if (a === 'pause') { const m = await ask('إيقاف الجهاز مؤقتًا', 'الرسالة التي تظهر للزائر', 'الجهاز متوقف مؤقتًا، يرجى التوجه إلى موظف الجناح.'); if (m === null) return; await send(id, { action: 'pause', message: m }); }
        else if (a === 'banner') { const m = await ask('لافتة أعلى الشاشة', 'اكتب النص (اتركه فارغًا لإزالة اللافتة)', ''); if (m === null) return; await send(id, { action: 'banner', message: m }); }
        else if (a === 'rename') { const m = await ask('اسم الجهاز', 'مثال: لوحي المدخل', name); if (!m) return; await send(id, { action: 'rename', name: m }); }
        else if (a === 'forget') { if (!(await ST.confirm('إزالة الجهاز من القائمة؟ سيظهر من جديد إن فُتح.'))) return; await send(id, { action: 'forget' }); }
        else await send(id, { action: a });
        ST.toast('تم إرسال الأمر'); paint();
      } catch (e) { ST.toast(e.message, true); }
    }
    app.querySelectorAll('[data-id] [data-a]').forEach(b => b.onclick = () => { const k = kiosks.find(x => x.id === b.closest('[data-id]').dataset.id); act(k.id, b.dataset.a, k.name); });
    app.querySelectorAll('[data-all]').forEach(b => b.onclick = async () => {
      const a = b.dataset.all; let msg = '';
      if (a === 'pause') { msg = await ask('إيقاف كل الأجهزة', 'الرسالة للزوار', 'الأجهزة متوقفة مؤقتًا، يرجى التوجه إلى موظف الجناح.'); if (msg === null) return; }
      if (a === 'banner') { msg = await ask('لافتة لكل الأجهزة', 'النص (فارغ للإزالة)', ''); if (msg === null) return; }
      try { await Promise.all(kiosks.map(k => send(k.id, { action: a, message: msg }))); ST.toast('تم الإرسال لكل الأجهزة'); paint(); } catch (e) { ST.toast(e.message, true); }
    });
    clearInterval(ST.stopTimer);
    ST.stopTimer = setInterval(() => { if (location.hash === '#/admin/kiosks' && !document.querySelector('.modal-bg')) paint(); }, 5000);
  };

  // ================= ملصق QR للجناح =================
  R['admin/poster'] = async function () {
    const { base, settings } = await baseUrl();
    let tag = 'booth1';
    const draw = () => {
      const url = `${base}/?s=qr_booth${tag ? '&b=' + tag : ''}`;
      app.querySelector('#pst').innerHTML = `<div class="poster"><div class="ph"><div class="sub">${esc(settings.event_name)} — شركة النقل العام الكويتية</div><h2>طلبك معنا</h2><div class="sub" style="font-weight:800">امسح الرمز واكتب طلبك — أياً كان</div></div>
        <div class="qrw">${makeQr(url).createSvgTag({ cellSize: 8, margin: 0, scalable: true })}</div>
        <div class="steps3"><div><b>١</b>افتح كاميرا جوالك وامسح الرمز</div><div><b>٢</b>اختر الخدمة أو اكتب استفسارك</div><div><b>٣</b>احصل على رقم طلبك ونتواصل معك</div></div>
        <div class="url">${esc(url)}</div><div class="pf">تسجيل الطلب لا يُعد تأكيدًا للحجز أو تفعيلًا للخدمة. بياناتك تُستخدم لمعالجة الطلب والتواصل بشأنه فقط.</div></div>`;
      app.querySelector('#purl').textContent = url; app.querySelector('#pdl').onclick = () => qrPng(url, `qr-${tag || 'booth'}.png`);
    };
    app.innerHTML = `<div class="noprint"><h1 style="margin-top:0">ملصق QR لزوار الجناح</h1>
      ${isLocal(base) ? '<div class="notice bad"><b>لا تطبع الملصق الآن.</b> الرابط الحالي محلي أو غير مشفّر. انشر التطبيق على HTTPS واضبط «رابط النشر العام» في الإعدادات، ثم اختبر الرمز بجوال حقيقي.</div>' : '<div class="notice warn">اختبر الرمز بكاميرا جوال وسجّل طلبًا تجريبيًا قبل الطباعة.</div>'}
      <div class="card"><div class="filters"><div class="field"><label>وسم الجناح / الموقع (إنجليزي أو أرقام)</label><input id="ptag" value="${tag}" maxlength="30" dir="ltr"></div><div class="row-actions"><button class="btn btn-primary" id="pprint">🖨 طباعة الملصق (A4)</button><button class="btn btn-ghost" id="pdl">تنزيل الرمز PNG</button></div></div>
      <p class="def-note">الوسم يُسجَّل مع كل طلب ويظهر في التقارير («حسب الوسم») لمعرفة أي جناح/موقع جلب الطلبات. للجناح الواحد: booth1. لمعرض آخر أو موقع خارجي: غيّر الوسم واطبع ملصقًا جديدًا. يصل كل طلب مباشرة إلى لوحة التحكم مع تنبيه فوري.</p><p class="mono" id="purl"></p></div></div><div id="pst" style="margin-top:14px"></div>`;
    app.querySelector('#pprint').onclick = () => window.print();
    app.querySelector('#ptag').oninput = e => { const v = e.target.value.replace(/[^A-Za-z0-9_-]/g, ''); tag = v; e.target.value = v; draw(); };
    draw();
  };

  // ================= المندوبون الميدانيون (روابط شخصية) =================
  R['admin/reps'] = async function () {
    const { users } = await ST.api('GET', '/api/admin/users'); const { base } = await baseUrl();
    const link = u => `${base}/?s=web&rep=${u.ref_code}`;
    app.innerHTML = `<h1 style="margin-top:0">روابط المندوبين الميدانيين</h1>
      <div class="notice info">لكل موظف رابط ورمز QR شخصي لاستخدامه <b>خارج مبنى الشركة</b> (زيارات العملاء، الشركات، المدارس، الفعاليات الأخرى). أي طلب يصل عبر الرابط يُسند إلى صاحبه تلقائيًا ويُميَّز مصدره «رابط مندوب ميداني»، فيظهر في قائمته مباشرة مع تنبيه فوري.</div>
      ${isLocal(base) ? '<div class="notice bad">الرابط الحالي محلي/غير مشفّر؛ لا توزّع الروابط قبل النشر على HTTPS وضبط «رابط النشر العام».</div>' : ''}
      <div class="card">${tbl(['الموظف', 'الصلاحية', 'الرابط الشخصي', ''], users.filter(u => u.active).map(u => `<tr><td>${esc(u.display_name)}</td><td>${u.role === 'admin' ? 'مدير' : 'موظف'}</td><td class="mono" style="font-size:13px;word-break:break-all">${esc(link(u))}</td>
        <td><div class="row-actions"><button class="btn btn-primary btn-sm" data-qr="${u.id}">QR / بطاقة</button><button class="btn btn-ghost btn-sm" data-cp="${u.id}">نسخ</button><button class="btn btn-ghost btn-sm" data-rg="${u.id}">تجديد الرمز</button></div></td></tr>`))}</div>`;
    app.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => ST.copy(link(users.find(u => u.id == b.dataset.cp))));
    app.querySelectorAll('[data-rg]').forEach(b => b.onclick = async () => { if (await ST.confirm('تجديد الرمز يُبطل الرابط القديم وأي QR مطبوع منه. متابعة؟')) { try { await ST.api('POST', `/api/admin/users/${b.dataset.rg}/refcode`); ST.toast('تم التجديد'); R['admin/reps'](); } catch (e) { ST.toast(e.message, true); } } });
    app.querySelectorAll('[data-qr]').forEach(b => b.onclick = () => {
      const u = users.find(x => x.id == b.dataset.qr), url = link(u);
      const m = ST.modal(`<div class="poster" style="max-width:380px"><div class="ph" style="padding:16px"><div class="sub">شركة النقل العام الكويتية</div><h2 style="font-size:30px">طلبك معنا</h2><div class="sub">مندوبكم: <b>${esc(u.display_name)}</b></div></div><div class="qrw" style="padding:16px">${makeQr(url).createSvgTag({ cellSize: 6, margin: 0, scalable: true })}</div><div class="pf" style="padding-top:0">امسح الرمز لتسجيل طلبك مباشرة مع ${esc(u.display_name)}</div></div>
        <div class="actions"><button class="btn btn-primary" data-p>🖨 طباعة</button><button class="btn btn-ghost" data-d>تنزيل الرمز</button><button class="btn btn-ghost" data-close>إغلاق</button></div>`);
      m.el.querySelector('[data-p]').onclick = () => window.print(); m.el.querySelector('[data-d]').onclick = () => qrPng(url, `qr-${u.username}.png`);
    });
  };
})();
