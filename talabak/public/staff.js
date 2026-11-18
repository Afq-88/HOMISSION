/* لوحة الموظفين: الدخول، قائمة الطلبات، صفحة الطلب، التسجيل نيابة عن الزائر */
(function () {
  'use strict';
  const { esc, fmtDate } = KForm;
  const app = document.getElementById('app');
  const ST = window.ST = { me: null, cfg: null, routes: {}, esc, fmtDate, app };

  // ---------- مساعدات ----------
  ST.api = async function (method, url, body, raw) {
    let res;
    try { res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'talabak' }, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' }); }
    catch { const e = new Error('تعذّر الاتصال بالخادم. تحقق من الإنترنت.'); e.net = true; throw e; }
    if (raw && res.ok) return res;
    let data = {}; try { data = await res.json(); } catch { /* */ }
    if (!res.ok) {
      if (res.status === 401 && ST.me) { ST.me = null; renderLogin('انتهت الجلسة، سجّل الدخول من جديد.'); }
      if (res.status === 403 && data.must_change) { renderMustChange(); }
      const e = new Error(data.error || 'حدث خطأ'); e.status = res.status; e.data = data; throw e;
    }
    return data;
  };
  ST.toast = (msg, bad) => { document.querySelectorAll('.toast').forEach(x => x.remove()); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); if (bad) t.style.background = '#b3261e'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), bad ? 5000 : 2800); };
  ST.modal = function (html, { wide } = {}) {
    const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${wide ? 'style="max-width:640px"' : ''}>${html}</div>`;
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    return { el: bg.firstChild, close };
  };
  ST.confirm = (msg, okText = 'تأكيد', danger) => new Promise(res => {
    const m = ST.modal(`<h2>تأكيد الإجراء</h2><p>${esc(msg)}</p><div class="actions"><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(okText)}</button><button class="btn btn-ghost" data-close>إلغاء</button></div>`);
    m.el.querySelector('[data-ok]').onclick = () => { m.close(); res(true); };
    m.el.parentNode.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === m.el.parentNode) res(false); });
  });
  ST.copy = async txt => { try { await navigator.clipboard.writeText(txt); ST.toast('تم النسخ'); } catch { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); ST.toast('تم النسخ'); } };
  ST.qs = o => Object.entries(o).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const isAdmin = () => ST.me && ST.me.role === 'admin';
  ST.isAdmin = isAdmin;
  const badge = s => `<span class="badge s-${s}">${esc(ST.cfg.statuses[s] || s)}</span>`;
  ST.badge = badge;
  const svcLabel = id => { const s = ST.cfg.all_services.find(x => x.id === id); return s ? s.label : id; };
  ST.svcLabel = svcLabel;
  const dayFmt = iso => { try { return new Date(iso).toLocaleDateString('ar-KW-u-nu-latn', { timeZone: 'Asia/Kuwait', day: 'numeric', month: 'short' }); } catch { return iso; } };

  // ---------- الدخول ----------
  function renderLogin(msg) {
    document.getElementById('nav').hidden = true; document.getElementById('who').textContent = ''; document.getElementById('logout').hidden = true;
    app.innerHTML = `<div class="card login"><h1>تسجيل دخول الموظفين</h1><p class="lead">هذه الصفحة مخصصة لموظفي الشركة فقط.</p>
      ${msg ? `<div class="notice warn" role="alert">${esc(msg)}</div>` : ''}
      <form id="lf" autocomplete="on"><div class="field"><label for="u">اسم المستخدم</label><input id="u" name="username" type="text" dir="ltr" autocomplete="username" required autocapitalize="off"></div>
      <div class="field"><label for="p">كلمة المرور</label><input id="p" name="password" type="password" dir="ltr" autocomplete="current-password" required></div>
      <div id="lerr"></div><button class="btn btn-primary" style="width:100%" type="submit">دخول</button></form></div>`;
    document.getElementById('lf').onsubmit = async e => {
      e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true;
      try { const r = await ST.api('POST', '/api/auth/login', { username: e.target.username.value, password: e.target.password.value }); ST.me = r.user; ST.start(); }
      catch (err) { document.getElementById('lerr').innerHTML = `<div class="notice bad" role="alert">${esc(err.message)}</div>`; btn.disabled = false; }
    };
    document.getElementById('u').focus();
  }
  function renderMustChange() {
    app.innerHTML = `<div class="card login"><h1>تغيير كلمة المرور</h1><div class="notice info">هذه أول مرة تدخل فيها بكلمة مرور مؤقتة. اختر كلمة مرور جديدة (١٠ أحرف على الأقل، حروف وأرقام).</div>
      <form id="pf"><div class="field"><label>كلمة المرور المؤقتة</label><input type="password" name="cur" dir="ltr" autocomplete="current-password" required></div>
      <div class="field"><label>كلمة المرور الجديدة</label><input type="password" name="nw" dir="ltr" autocomplete="new-password" required></div><div id="perr"></div>
      <button class="btn btn-primary" style="width:100%">حفظ ومتابعة</button></form></div>`;
    document.getElementById('pf').onsubmit = async e => {
      e.preventDefault();
      try { await ST.api('POST', '/api/auth/password', { current: e.target.cur.value, next: e.target.nw.value }); ST.me.must_change = false; ST.toast('تم تغيير كلمة المرور'); ST.start(); }
      catch (err) { document.getElementById('perr').innerHTML = `<div class="notice bad">${esc(err.message)}</div>`; }
    };
  }
  ST.changePassword = () => {
    const m = ST.modal(`<h2>تغيير كلمة المرور</h2><form id="pf2"><div class="field"><label>الحالية</label><input type="password" name="cur" dir="ltr" autocomplete="current-password" required></div><div class="field"><label>الجديدة</label><input type="password" name="nw" dir="ltr" autocomplete="new-password" required></div><div id="perr2"></div><div class="actions"><button class="btn btn-primary">حفظ</button><button type="button" class="btn btn-ghost" data-close>إلغاء</button></div></form>`);
    m.el.querySelector('form').onsubmit = async e => { e.preventDefault(); try { await ST.api('POST', '/api/auth/password', { current: e.target.cur.value, next: e.target.nw.value }); m.close(); ST.toast('تم تغيير كلمة المرور'); } catch (err) { m.el.querySelector('#perr2').innerHTML = `<div class="notice bad">${esc(err.message)}</div>`; } };
  };

  // ---------- الإطار ----------
  const NAV = [['#/', 'الطلبات'], ['#/new', '＋ تسجيل طلب']];
  const ADMIN_NAV = [['#/admin/reports', 'التقارير'], ['#/admin/duplicates', 'المكررات'], ['#/admin/users', 'المستخدمون'], ['#/admin/services', 'الخدمات والحقول'], ['#/admin/settings', 'الإعدادات'], ['#/admin/links', 'الروابط وQR'], ['#/admin/backups', 'النسخ الاحتياطي'], ['#/admin/audit', 'سجل العمليات']];
  ST.shell = function () {
    document.getElementById('who').textContent = `${ST.me.display_name} · ${isAdmin() ? 'مدير' : 'موظف'}`;
    document.getElementById('logout').hidden = false;
    const cur = location.hash || '#/';
    const link = ([h, t]) => `<a href="${h}" class="${cur === h || (h !== '#/' && cur.startsWith(h)) || (h === '#/' && cur.startsWith('#/r/')) ? 'on' : ''}">${t}</a>`;
    document.getElementById('navin').innerHTML = NAV.map(link).join('') + (isAdmin() ? '<span class="sep"></span>' + ADMIN_NAV.map(link).join('') : '') + '<span class="sep"></span><a href="#" id="chpw">كلمة المرور</a>';
    document.getElementById('nav').hidden = false;
    document.getElementById('chpw').onclick = e => { e.preventDefault(); ST.changePassword(); };
  };
  document.getElementById('logout').onclick = async () => { try { await ST.api('POST', '/api/auth/logout'); } catch { /* */ } ST.me = null; renderLogin(); };

  // ---------- الطلبات: القائمة ----------
  let filt = { q: '', service: '', status: '', assigned: '', source: '', from: '', to: '', missing: '', due: '', contacted: '', page: 1, real: '', archived: '' };
  ST.routes[''] = async function list() {
    app.innerHTML = '<div class="card">جارٍ التحميل…</div>';
    const [stats, res] = await Promise.all([ST.api('GET', '/api/staff/stats'), ST.api('GET', '/api/staff/requests?' + ST.qs(filt))]);
    const kp = (k, label, val, cls = '') => `<button class="kpi ${cls} ${isOn(k) ? 'on' : ''}" data-quick="${k}"><b>${val}</b><span>${label}</span></button>`;
    const isOn = k => ({ me: filt.assigned === 'me', none: filt.assigned === 'none', due: filt.due === 'today', overdue: filt.due === 'overdue', miss: filt.missing === '1', unc: filt.contacted === '0' }[k]);
    const users = ST.cfg.users;
    const pages = Math.ceil(res.total / res.size);
    app.innerHTML = `<h1 style="margin-top:0">الطلبات</h1>
      <div class="kpis">${kp('me', 'مسندة إليّ (مفتوحة)', stats.mine)}${kp('none', 'غير مسندة', stats.unassigned)}${kp('due', 'متابعات اليوم', stats.due_today)}${kp('overdue', 'متابعات متأخرة', stats.overdue, stats.overdue ? 'warn' : '')}${kp('miss', 'تحتاج استكمالًا', stats.needs_info)}${kp('unc', 'لم يبدأ التواصل', stats.uncontacted)}</div>
      <div class="card"><form class="filters" id="ff">
        <div class="field" style="grid-column:span 2"><label>بحث (رقم الطلب / الاسم / الهاتف)</label><input type="search" name="q" value="${esc(filt.q)}" placeholder="مثال: 000123 أو 5551…"></div>
        <div class="field"><label>الخدمة</label><select name="service"><option value="">الكل</option>${ST.cfg.all_services.map(s => `<option value="${s.id}" ${filt.service === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></div>
        <div class="field"><label>الحالة</label><select name="status"><option value="">الكل</option>${Object.entries(ST.cfg.statuses).map(([k, v]) => `<option value="${k}" ${filt.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>المسؤول</label><select name="assigned"><option value="">الكل</option><option value="me" ${filt.assigned === 'me' ? 'selected' : ''}>أنا</option><option value="none" ${filt.assigned === 'none' ? 'selected' : ''}>غير مسندة</option>${isAdmin() ? users.filter(u => u.id !== ST.me.id).map(u => `<option value="${u.id}" ${filt.assigned == u.id ? 'selected' : ''}>${esc(u.display_name)}</option>`).join('') : ''}</select></div>
        <div class="field"><label>المصدر</label><select name="source"><option value="">الكل</option>${Object.entries(ST.cfg.sources).map(([k, v]) => `<option value="${k}" ${filt.source === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>من تاريخ</label><input type="date" name="from" value="${filt.from}"></div>
        <div class="field"><label>إلى تاريخ</label><input type="date" name="to" value="${filt.to}"></div>
        ${isAdmin() ? `<div class="field"><label>العرض</label><select name="archived"><option value="">النشطة</option><option value="1" ${filt.archived === '1' ? 'selected' : ''}>المؤرشفة</option><option value="all" ${filt.archived === 'all' ? 'selected' : ''}>الكل</option></select></div>` : ''}
        <div class="row-actions"><button class="btn btn-primary btn-sm">تطبيق</button><button type="button" class="btn btn-ghost btn-sm" data-reset>مسح</button></div></form></div>
      <div class="rq head" aria-hidden="true"><span>رقم الطلب</span><span>العميل</span><span>الخدمة</span><span>الحالة</span><span>المسؤول</span><span>المتابعة</span></div>
      ${res.rows.length ? res.rows.map(r => `<a class="rq" href="#/r/${r.id}"><span><b class="mono">${esc(r.ref.replace('KPTC-', ''))}</b><small>${esc(fmtDate(r.received_at))}</small></span>
        <span><b>${esc(r.name)}</b>${r.org_name ? `<small>${esc(r.org_name)}</small>` : ''}<small class="mono">+${esc(r.phone_cc === '0' ? '' : r.phone_cc)} ${esc(r.phone)}</small></span>
        <span>${esc(svcLabel(r.service))}<small>${esc(ST.cfg.sources[r.source] || r.source)}</small></span>
        <span>${badge(r.status)} ${r.missing_count ? '<span class="badge gold" title="معلومات ناقصة">ناقص ' + r.missing_count + '</span>' : ''} ${r.dup_of || r.is_dup ? '<span class="badge red">مكرر محتمل</span>' : ''} ${r.is_test ? '<span class="badge">تجريبي</span>' : ''}</span>
        <span>${r.assignee_name ? esc(r.assignee_name) : '<small>— غير مسند —</small>'}<small>${r.contacts ? r.contacts + ' تواصل' : 'لم يبدأ التواصل'}</small></span>
        <span>${r.follow_up_date ? `<b class="${r.follow_up_date < today() && !['completed', 'closed'].includes(r.status) ? 'req' : ''}">${esc(dayFmt(r.follow_up_date))}</b>` : '<small>—</small>'}${r.next_action ? `<small>${esc(r.next_action.slice(0, 40))}</small>` : ''}</span></a>`).join('') : '<div class="card" style="margin-top:10px">لا توجد طلبات مطابقة.</div>'}
      <div class="row-actions" style="margin-top:14px;justify-content:space-between"><span class="lead" style="margin:0">${res.total} طلب</span>${pages > 1 ? `<span class="row-actions"><button class="btn btn-ghost btn-sm" data-pg="${filt.page - 1}" ${filt.page <= 1 ? 'disabled' : ''}>السابق</button><span>${filt.page} / ${pages}</span><button class="btn btn-ghost btn-sm" data-pg="${filt.page + 1}" ${filt.page >= pages ? 'disabled' : ''}>التالي</button></span>` : ''}</div>`;
    const redo = () => ST.routes['']();
    app.querySelector('#ff').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); for (const k of ['q', 'service', 'status', 'assigned', 'source', 'from', 'to', 'archived']) if (f.has(k)) filt[k] = f.get(k); filt.page = 1; redo(); };
    app.querySelector('[data-reset]').onclick = () => { filt = { q: '', service: '', status: '', assigned: '', source: '', from: '', to: '', missing: '', due: '', contacted: '', page: 1, real: '', archived: '' }; redo(); };
    app.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { filt.page = +b.dataset.pg; redo(); });
    app.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => {
      const k = b.dataset.quick, on = isOn(k);
      filt.assigned = ''; filt.due = ''; filt.missing = ''; filt.contacted = ''; filt.page = 1;
      if (!on) { if (k === 'me') filt.assigned = 'me'; if (k === 'none') filt.assigned = 'none'; if (k === 'due') filt.due = 'today'; if (k === 'overdue') filt.due = 'overdue'; if (k === 'miss') filt.missing = '1'; if (k === 'unc') filt.contacted = '0'; }
      redo();
    });
  };
  const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  ST.today = today;

  // ---------- تسجيل طلب نيابة عن الزائر ----------
  ST.routes['new'] = function () {
    let lastId = null;
    app.innerHTML = '<h1 style="margin-top:0">تسجيل طلب نيابة عن الزائر</h1><div id="nf" style="max-width:880px"></div>';
    KForm.mount(document.getElementById('nf'), { config: ST.cfg, mode: 'staff', url: '/api/staff/requests', onDone: d => { lastId = d.id; }, openUrl: () => '#/r/' + lastId });
  };

  // ---------- صفحة الطلب ----------
  const OPT = { call: 'اتصال', whatsapp: 'واتساب', email: 'بريد إلكتروني' };
  const KIND = { call: 'اتصال هاتفي', whatsapp: 'واتساب', email: 'بريد إلكتروني', visit: 'زيارة للجناح', note: 'ملاحظة داخلية' };
  const ACT = { create: 'تسجيل الطلب', update: 'تعديل', contact: 'توثيق تواصل', prepare_message: 'تجهيز رسالة (لم تُرسل)' };
  const FIELD_LABEL = { status: 'الحالة', assigned_to: 'المسؤول', outcome: 'النتيجة', outcome_note: 'ملاحظة النتيجة', referred_to: 'الجهة المحال إليها', next_action: 'الخطوة التالية', follow_up_date: 'موعد المتابعة', name: 'الاسم', phone: 'الهاتف', pref_channel: 'وسيلة التواصل', email: 'البريد', party_type: 'نوع العميل', org_name: 'الجهة', pref_time: 'وقت التواصل', notes: 'الملاحظات', archived: 'الأرشفة', is_test: 'تجريبي', is_dup: 'مكرر' };
  function histText(h) {
    if (!h.detail) return '';
    if (h.action === 'create') return `المصدر: ${ST.cfg.sources[h.detail.source] || h.detail.source}`;
    if (h.action === 'contact') return KIND[h.detail.kind] || '';
    if (h.action !== 'update') return '';
    const show = v => v === null || v === '' || v === undefined ? '—' : (ST.cfg.statuses[v] || ST.cfg.outcomes[v] || (typeof v === 'object' ? JSON.stringify(v) : v));
    return Object.entries(h.detail).map(([k, [a, b]]) => {
      let lab = FIELD_LABEL[k] || (k.startsWith('f.') ? 'حقل: ' + k.slice(2) : k);
      if (k === 'assigned_to') { const n = id => (ST.cfg.users.find(u => u.id === id) || {}).display_name || (id ? '#' + id : '—'); return `${lab}: ${n(a)} ← ${n(b)}`; }
      return `${lab}: ${show(a)} ← ${show(b)}`;
    }).join(' · ');
  }
  function needRows(r) {
    const svc = ST.cfg.all_services.find(s => s.id === r.service); if (!svc) return '';
    const ctx = { ...r, ...r.payload };
    const vis = f => !f.showIf || ('eq' in f.showIf ? ctx[f.showIf.key] === f.showIf.eq : (f.showIf.in || []).includes(ctx[f.showIf.key]));
    return svc.fields.filter(f => f.active !== false && vis(f)).map(f => {
      const v = r.payload[f.key]; let shown;
      if (v === '__unknown__') shown = '<span class="badge gold">غير محدد حاليًا</span>';
      else if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) shown = (f.ready || f.required) ? '<span class="badge gold">ناقص</span>' : '<span class="opt">—</span>';
      else if (f.options) shown = esc(Array.isArray(v) ? v.map(x => (f.options.find(o => o.v === x) || {}).l || x).join('، ') : ((f.options.find(o => o.v === v) || {}).l || v));
      else shown = esc(v);
      return `<li><b>${esc(f.label)}</b><span>${shown}</span></li>`;
    }).join('');
  }
  ST.routes['r'] = async function detail(id) {
    if (ST.cleanup) { ST.cleanup(); ST.cleanup = null; }
    app.innerHTML = '<div class="card">جارٍ التحميل…</div>';
    let r;
    try { r = await ST.api('GET', '/api/staff/requests/' + id); } catch (e) { app.innerHTML = `<div class="notice bad">${esc(e.message)}</div><a class="btn btn-ghost" href="#/">← الطلبات</a>`; return; }
    const form = { status: r.status, outcome: r.outcome || '', outcome_note: r.outcome_note || '', referred_to: r.referred_to || '', next_action: r.next_action || '', follow_up_date: r.follow_up_date || '', assigned_to: r.assigned_to || '' };
    const finals = ['completed', 'closed'];
    const mine = r.assigned_to === ST.me.id;
    function draw() {
      const users = ST.cfg.users;
      app.innerHTML = `<div class="row-actions noprint" style="margin-bottom:10px"><a class="btn btn-ghost btn-sm" href="#/">← الطلبات</a></div>
      <div class="row-actions" style="justify-content:space-between"><h1 style="margin:0" class="mono">${esc(r.ref)}</h1><span>${badge(r.status)} ${r.missing_count ? `<span class="badge gold">معلومات ناقصة (${r.missing_count})</span>` : '<span class="badge s-ready">المعلومات مكتملة للإحالة</span>'} ${r.is_test ? '<span class="badge">تجريبي</span>' : ''} ${r.archived ? '<span class="badge">مؤرشف</span>' : ''}</span></div>
      <p class="lead">${esc(svcLabel(r.service))} · ${esc(fmtDate(r.received_at))} · المصدر: ${esc(ST.cfg.sources[r.source] || r.source)}${r.creator_name ? ' · سجّله: ' + esc(r.creator_name) : ''}${r.assisted_by && !r.creator_name ? ' · بمساعدة: ' + esc(r.assisted_by) : ''}</p>
      ${r.similar.length ? `<div class="notice warn" role="alert"><b>طلب مشابه:</b> نفس الهاتف والخدمة والتاريخ — ${r.similar.map(s => `<a href="#/r/${s.id}" class="mono">${esc(s.ref)}</a> (${esc(ST.cfg.statuses[s.status] || s.status)})`).join('، ')}. لا يُدمج تلقائيًا؛ ${isAdmin() ? 'يمكنك تصنيفه مكررًا من الأسفل.' : 'ارفعه للمدير للمراجعة.'}</div>` : ''}
      ${r.is_dup ? `<div class="notice bad">صُنّف هذا الطلب مكررًا ولا يدخل التقارير.</div>` : ''}
      <div class="cols"><div>
        <div class="card"><div class="sect-h"><h2>العميل</h2><button class="btn btn-ghost btn-sm" data-act="edit">✎ استكمال / تعديل البيانات</button></div>
          <ul class="review"><li><b>الاسم</b><span>${esc(r.name)}</span></li><li><b>الهاتف</b><span class="mono">+${esc(r.phone_cc === '0' ? '' : r.phone_cc)} ${esc(r.phone)}</span></li><li><b>وسيلة التواصل المفضلة</b><span>${esc(OPT[r.pref_channel] || '')}</span></li>
          ${r.email ? `<li><b>البريد</b><span class="mono">${esc(r.email)}</span></li>` : ''}<li><b>النوع</b><span>${r.party_type === 'entity' ? 'جهة / شركة: ' + esc(r.org_name || '') : 'فرد'}</span></li>
          ${r.pref_time ? `<li><b>وقت التواصل المفضل</b><span>${esc(r.pref_time === '__unknown__' ? 'غير محدد' : ((ST.cfg.pref_times.find(x => x.v === r.pref_time) || {}).l || r.pref_time))}</span></li>` : ''}${r.notes ? `<li><b>ملاحظات العميل</b><span>${esc(r.notes)}</span></li>` : ''}</ul></div>
        <div class="card"><h2>احتياج العميل</h2><ul class="review">${needRows(r)}</ul>
          ${r.missing.length ? `<div class="notice warn" style="margin-top:12px"><b>الناقص قبل الإحالة:</b> ${r.missing.map(m => esc(m.label)).join('، ')}</div>` : ''}</div>
        <div class="card"><h2>سجل التواصل</h2>
          <form id="cf" class="noprint"><div class="filters" style="grid-template-columns:200px 1fr auto"><div class="field"><label>نوع التواصل</label><select name="kind">${Object.entries(KIND).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div><div class="field"><label>ملخص النتيجة</label><input name="summary" placeholder="مثال: تم الاتصال، طلب إرسال عدد الركاب" required></div><button class="btn btn-primary btn-sm">إضافة</button></div></form>
          <ul class="log">${r.contacts_log.length ? r.contacts_log.map(c => `<li><b>${esc(KIND[c.kind] || c.kind)}</b> — ${esc(c.summary)}<br><small>${esc(c.staff || '')} · ${esc(fmtDate(c.created_at))}</small></li>`).join('') : '<li><small>لا يوجد تواصل موثّق بعد.</small></li>'}</ul></div>
      </div><div>
        <div class="card"><h2>المتابعة</h2>
          <div class="field"><label>الحالة</label><select data-f="status">${Object.entries(ST.cfg.statuses).map(([k, v]) => `<option value="${k}" ${form.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          ${finals.includes(form.status) ? `<div class="field"><label>نتيجة الطلب <span class="req">*</span></label><select data-f="outcome"><option value="">— اختر —</option>${Object.entries(ST.cfg.outcomes).map(([k, v]) => `<option value="${k}" ${form.outcome === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>توضيح النتيجة ${ST.cfg.note_required.includes(form.outcome) ? '<span class="req">*</span>' : '<span class="opt">اختياري</span>'}</label><input data-f="outcome_note" value="${esc(form.outcome_note)}" placeholder="مثال: مرجع إفادة الجهة المختصة"></div>` : ''}
          ${form.status === 'referred' || r.referred_to ? `<div class="field"><label>الجهة المحال إليها ${form.status === 'referred' ? '<span class="req">*</span>' : ''}</label><input data-f="referred_to" value="${esc(form.referred_to)}" placeholder="اسم الإدارة / الجهة">${r.referred_at ? `<div class="hint">تاريخ الإحالة: ${esc(fmtDate(r.referred_at))}</div>` : ''}</div>` : ''}
          <div class="field"><label>المسؤول عن المتابعة</label>${isAdmin() ? `<select data-f="assigned_to"><option value="">— غير مسند —</option>${users.map(u => `<option value="${u.id}" ${form.assigned_to == u.id ? 'selected' : ''}>${esc(u.display_name)}</option>`).join('')}</select>` : `<label class="sw"><input type="checkbox" data-take ${mine ? 'checked' : ''}> أنا المسؤول عن هذا الطلب</label>`}</div>
          <div class="field"><label>الخطوة التالية المطلوبة</label><input data-f="next_action" value="${esc(form.next_action)}" placeholder="مثال: الاتصال لتأكيد عدد الركاب"></div>
          <div class="field"><label>موعد المتابعة المقبلة</label><input type="date" data-f="follow_up_date" value="${esc(form.follow_up_date)}"></div>
          <div class="actions" style="margin-top:6px"><button class="btn btn-primary" data-act="save">حفظ التحديث</button></div>
          <div class="hint" style="margin-top:8px">الإحالة وحدها لا تعني إتمام الخدمة، والطلب المسجل ليس عملية بيع.</div></div>
        <div class="card noprint"><h2>رسالة متابعة</h2><p class="lead">يجهّز النظام نص الرسالة فقط؛ لا يرسلها.</p><button class="btn btn-ghost" data-act="msg">تجهيز نص الرسالة</button></div>
        ${isAdmin() ? `<div class="card noprint"><h2>إجراءات المدير</h2><div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="archive">${r.archived ? 'إلغاء الأرشفة' : 'أرشفة'}</button><button class="btn btn-ghost btn-sm" data-act="test">${r.is_test ? 'إزالة وسم التجريبي' : 'وسم تجريبي'}</button>
          ${r.is_dup ? '<button class="btn btn-ghost btn-sm" data-act="undup">إلغاء تصنيف المكرر</button>' : (r.similar.length || r.dup_of ? '<button class="btn btn-ghost btn-sm" data-act="dup">تصنيف كمكرر</button>' : '')}
          ${r.archived || r.is_test ? '<button class="btn btn-danger btn-sm" data-act="del">حذف نهائي</button>' : ''}</div></div>` : ''}
        <div class="card"><h2>سجل التغييرات</h2><ul class="log">${r.history.map(h => `<li><b>${esc(ACT[h.action] || h.action)}</b> <small>— ${esc(h.actor || '')} · ${esc(fmtDate(h.created_at))}</small><br><small>${esc(histText(h))}</small></li>`).join('')}</ul></div>
      </div></div>`;
    }
    draw();
    const reload = async (msg) => { if (msg) ST.toast(msg); ST.routes['r'](id); };
    app.addEventListener('input', onInput); app.addEventListener('change', onChange); app.addEventListener('click', onClick); app.addEventListener('submit', onSubmit);
    ST.cleanup = () => { app.removeEventListener('input', onInput); app.removeEventListener('change', onChange); app.removeEventListener('click', onClick); app.removeEventListener('submit', onSubmit); };
    function onInput(e) { const k = e.target.dataset && e.target.dataset.f; if (k && e.target.tagName === 'INPUT') form[k] = e.target.value; }
    function onChange(e) {
      const t = e.target, k = t.dataset && t.dataset.f; if (!k) return;
      form[k] = t.value; if (k === 'status' || k === 'outcome') { const keep = app.scrollTop; draw(); }
    }
    async function onSubmit(e) {
      if (e.target.id !== 'cf') return; e.preventDefault();
      try { await ST.api('POST', `/api/staff/requests/${id}/contacts`, { kind: e.target.kind.value, summary: e.target.summary.value }); reload('تم توثيق التواصل'); } catch (err) { ST.toast(err.message, true); }
    }
    async function patch(body, msg) { try { await ST.api('PATCH', '/api/staff/requests/' + id, body); reload(msg || 'تم الحفظ'); } catch (err) { ST.toast(err.message, true); } }
    async function onClick(e) {
      const t = e.target.closest('[data-act],[data-take]'); if (!t) return;
      if (t.hasAttribute('data-take')) { return patch({ assigned_to: t.checked ? ST.me.id : null }, 'تم تحديث الإسناد'); }
      const a = t.dataset.act;
      if (a === 'save') {
        const body = { status: form.status, next_action: form.next_action, follow_up_date: form.follow_up_date, referred_to: form.referred_to };
        if (finals.includes(form.status)) { body.outcome = form.outcome; body.outcome_note = form.outcome_note; }
        if (isAdmin()) body.assigned_to = form.assigned_to === '' ? null : +form.assigned_to;
        return patch(body);
      }
      if (a === 'msg') {
        try {
          const m = await ST.api('GET', `/api/staff/requests/${id}/message`);
          const md = ST.modal(`<h2>نص الرسالة (لم تُرسل)</h2><textarea id="mtxt" style="min-height:200px">${esc(m.text)}</textarea><div class="notice info">تم تجهيز النص فقط. انسخه وأرسله من قناة الشركة المعتمدة، ثم وثّق التواصل في السجل.</div><div class="actions"><button class="btn btn-primary" data-c>نسخ النص</button>${m.whatsapp_url ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(m.whatsapp_url)}">فتح واتساب بالنص (لن يُرسل تلقائيًا)</a>` : ''}<button class="btn btn-ghost" data-close>إغلاق</button></div>`, { wide: true });
          md.el.querySelector('[data-c]').onclick = () => ST.copy(md.el.querySelector('#mtxt').value);
        } catch (err) { ST.toast(err.message, true); }
      }
      if (a === 'edit') {
        const svc = ST.cfg.services.find(s => s.id === r.service) || { ...ST.cfg.all_services.find(s => s.id === r.service) };
        const md = ST.modal('<h2>استكمال / تعديل البيانات</h2><div id="ed"></div>', { wide: true });
        md.el.style.maxWidth = '760px'; md.el.style.maxHeight = '90vh'; md.el.style.overflow = 'auto';
        const common = { name: r.name, phone_cc: r.phone_cc, phone: r.phone, pref_channel: r.pref_channel, email: r.email || '', party_type: r.party_type, org_name: r.org_name || '', pref_time: r.pref_time || '', notes: r.notes || '' };
        KForm.mount(md.el.querySelector('#ed'), { config: { ...ST.cfg, services: ST.cfg.all_services.map(s => ({ ...s, fields: s.fields.filter(f => f.active !== false) })) }, mode: 'edit', service: r.service, common, fields: r.payload,
          onCancel: md.close,
          onSave: async ({ common: c, fields }) => { try { await ST.api('PATCH', '/api/staff/requests/' + id, { common: c, fields }); md.close(); reload('تم حفظ البيانات'); } catch (err) { if (err.data && err.data.fields) return { errors: err.data.fields }; ST.toast(err.message, true); } } });
      }
      if (a === 'archive') return patch({ archived: !r.archived }, r.archived ? 'أُلغيت الأرشفة' : 'تمت الأرشفة');
      if (a === 'test') return patch({ is_test: !r.is_test });
      if (a === 'dup') { if (await ST.confirm('سيُصنَّف هذا الطلب مكررًا ويُغلق ويُستبعد من التقارير. لا يُحذف شيء.', 'تصنيف كمكرر')) return patch({ is_dup: true, dup_of: r.dup_of || (r.similar[0] || {}).id }, 'صُنّف مكررًا'); }
      if (a === 'undup') return patch({ is_dup: false }, 'أُلغي تصنيف المكرر');
      if (a === 'del') { if (await ST.confirm('سيُحذف الطلب وسجل تواصله نهائيًا. لا يمكن التراجع (إلا باستعادة نسخة احتياطية).', 'حذف نهائي', true)) { try { await ST.api('DELETE', '/api/admin/requests/' + id); ST.toast('تم الحذف'); location.hash = '#/'; } catch (err) { ST.toast(err.message, true); } } }
    }
  };

  ST.renderLogin = renderLogin; ST.renderMustChange = renderMustChange;
})();
