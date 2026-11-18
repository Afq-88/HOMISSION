/* واجهة المدير: التقارير، المكررات، المستخدمون، الخدمات، الإعدادات، الروابط وQR، النسخ الاحتياطي، السجل */
(function () {
  'use strict';
  const ST = window.ST, esc = ST.esc, app = ST.app, R = ST.routes;
  const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}">لا توجد بيانات</td></tr>`}</tbody></table></div>`;

  // ================= التقارير =================
  let rep = { preset: 'today', from: '', to: '', dept: '', by: 'department', service: '' };
  const ymd = d => d.toISOString().slice(0, 10);
  function range() {
    const t = ST.today(), tt = new Date(t + 'T00:00:00Z');
    if (rep.preset === 'today') return { from: t, to: t, title: 'التقرير اليومي' };
    if (rep.preset === 'week') { const f = new Date(tt); f.setUTCDate(f.getUTCDate() - 6); return { from: ymd(f), to: t, title: 'التقرير الأسبوعي (آخر ٧ أيام)' }; }
    if (rep.preset === 'event') return { from: '', to: '', title: 'التقرير الختامي للمعرض' };
    return { from: rep.from, to: rep.to, title: 'تقرير لفترة مخصصة' };
  }
  const bars = (list, total) => { const max = Math.max(1, ...list.map(x => x.n)); return list.length ? list.map(x => `<div class="barrow"><span>${esc(x.label)}</span><span><i style="width:${Math.round(x.n / max * 100)}%"></i></span><b>${x.n}</b></div>`).join('') : '<p class="lead">لا توجد بيانات.</p>'; };
  R['admin/reports'] = async function () {
    const rg = range();
    const q = ST.qs({ from: rg.from, to: rg.to, dept: rep.dept });
    const s = await ST.api('GET', '/api/admin/reports/summary?' + q);
    const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
    const tot = s.totals.requests;
    app.innerHTML = `<div class="row-actions noprint" style="justify-content:space-between"><h1 style="margin:0">التقارير</h1>
      <div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="print">🖨 طباعة تقرير موجز</button><button class="btn btn-ghost btn-sm" data-act="sum">⬇ تصدير الملخص (Excel/CSV)</button><button class="btn btn-ghost btn-sm" data-act="exp">⬇ تصدير الطلبات بلا بيانات تواصل</button><button class="btn btn-ghost btn-sm" data-act="exppii">⬇ تصدير الطلبات مع بيانات التواصل</button></div></div>
      <div class="card noprint" style="margin-top:12px"><div class="field" style="max-width:340px"><label>الإدارة</label><select data-dept><option value="">كل الإدارات</option>${ST.cfg.departments.map(d => `<option value="${d.id}" ${rep.dept == d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div><div class="tabs">${[['today', 'اليوم'], ['week', 'آخر ٧ أيام'], ['event', 'الفعالية كاملة (ختامي)'], ['custom', 'فترة مخصصة']].map(([k, t]) => `<button class="chip" aria-pressed="${rep.preset === k}" data-preset="${k}">${t}</button>`).join('')}</div>
        ${rep.preset === 'custom' ? `<div class="filters" style="margin-top:12px;max-width:480px"><div class="field"><label>من</label><input type="date" data-rf="from" value="${rep.from}"></div><div class="field"><label>إلى</label><input type="date" data-rf="to" value="${rep.to}"></div><button class="btn btn-primary btn-sm" data-act="apply">عرض</button></div>` : ''}</div>
      <div class="card" style="margin-top:12px"><h2>${esc(rg.title)} — ${esc(s.event)}${s.dept_name ? ' — ' + esc(s.dept_name) : ''}</h2><p class="lead">${rg.from ? `الفترة: ${esc(rg.from)} إلى ${esc(rg.to || rg.from)}` : 'كل طلبات الفعالية'} · أُعد في ${esc(ST.fmtDate(s.generated_at))} (توقيت الكويت)</p>
        <div class="kpis"><div class="kpi"><b>${tot}</b><span>إجمالي الطلبات الفعلية</span></div><div class="kpi"><b>${s.totals.distinct_phones}</b><span>أرقام هاتف مختلفة (عملاء مسجلون)</span></div>
        <div class="kpi"><b>${s.completeness.complete || 0}</b><span>طلبات مكتملة المعلومات (${pct(s.completeness.complete || 0, tot)})</span></div><div class="kpi"><b>${s.completeness.incomplete || 0}</b><span>طلبات ناقصة المعلومات</span></div>
        <div class="kpi"><b>${s.contact.contacted || 0}</b><span>تمت متابعتها</span></div><div class="kpi"><b>${s.contact.not_contacted || 0}</b><span>لم يبدأ التواصل بشأنها</span></div>
        <div class="kpi"><b>${s.followups.due_today || 0}</b><span>متابعات مستحقة اليوم*</span></div><div class="kpi warn"><b>${s.followups.overdue || 0}</b><span>متابعات متأخرة*</span></div><div class="kpi"><b>${s.referred}</b><span>طلبات أُحيلت لجهة</span></div></div>
        <p class="def-note">* الحالة الراهنة للطلبات المفتوحة، لا تتأثر بالفترة المختارة. مستبعد من الأعداد: ${s.totals.excluded_tests} تجريبي، ${s.totals.excluded_duplicates} مكرر مصنّف.</p></div>
      <div class="cols" style="margin-top:12px"><div class="card"><h2>الطلبات حسب الإدارة</h2>${bars(s.by_department)}<h2 style="margin-top:20px">الطلبات حسب الخدمة</h2>${bars(s.by_service)}<h2 style="margin-top:20px">الطلبات حسب المصدر</h2>${bars(s.by_source)}${s.by_tag.length ? `<h2 style="margin-top:20px">حسب الوسم (جناح / جهاز / زيارة)</h2>${bars(s.by_tag.map(t => ({ ...t, label: (t.label || '').slice(0, 18) })))}` : ''}<h2 style="margin-top:20px">الحالات الحالية</h2>${bars(s.by_status)}</div>
        <div class="card"><h2>الطلبات حسب اليوم</h2>${bars(s.by_day)}<h2 style="margin-top:20px">نتائج الطلبات المغلقة والمكتملة</h2>${bars(s.outcomes)}</div></div>
      <div class="card" style="margin-top:12px"><div class="sect-h"><h2>تقرير عمل مخصص</h2><button class="btn btn-ghost btn-sm noprint" data-act="pvcsv">⬇ تصدير الجدول</button></div>
        <div class="filters noprint" style="max-width:640px"><div class="field"><label>تجميع حسب</label><select data-pv="by"></select></div><div class="field"><label>خدمة محددة</label><select data-pv="service"><option value="">كل الخدمات</option>${ST.cfg.all_services.map(x => `<option value="${x.id}" ${rep.service === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div></div>
        <div id="pvbox" class="tbl-wrap">جارٍ التحميل…</div></div>
      <div class="card" style="margin-top:12px"><h3 style="margin-top:0">تعريف المؤشرات</h3><ul class="def-note">${s.definitions.map(d => `<li>${esc(d)}</li>`).join('')}</ul><p class="def-note">التقرير الإداري التجميعي لا يتضمن بيانات التواصل الشخصية.</p></div>`;
    const pvq = () => ST.qs({ from: rg.from, to: rg.to, dept: rep.dept, service: rep.service, by: rep.by });
    async function loadPv() {
      const p = await ST.api('GET', '/api/admin/reports/pivot?' + pvq());
      const sel = app.querySelector('[data-pv=by]'); sel.innerHTML = p.dims.map(d => `<option value="${d.key}" ${p.by === d.key ? 'selected' : ''}>${esc(d.label)}</option>`).join('');
      app.querySelector('#pvbox').innerHTML = `<table class="tbl"><thead><tr><th>${esc(p.by_label)}</th><th>الطلبات</th><th>مكتملة المعلومات</th><th>ناقصة</th><th>تمت متابعتها</th><th>لم يبدأ التواصل</th><th>مفتوحة</th><th>منتهية</th><th>أُحيلت</th><th>متابعة متأخرة</th></tr></thead><tbody>${p.rows.map(r => `<tr><td>${esc(r.label)}</td><td><b>${r.n}</b></td><td>${r.complete}</td><td>${r.incomplete}</td><td>${r.contacted}</td><td>${r.not_contacted}</td><td>${r.open}</td><td>${r.done}</td><td>${r.referred}</td><td class="${r.overdue ? 'req' : ''}">${r.overdue}</td></tr>`).join('')}<tr style="font-weight:800;background:var(--paper-2)"><td>الإجمالي</td><td>${p.total.n}</td><td>${p.total.complete}</td><td>${p.total.incomplete}</td><td>${p.total.contacted}</td><td>${p.total.not_contacted}</td><td>${p.total.open}</td><td>${p.total.done}</td><td>${p.total.referred}</td><td>${p.total.overdue}</td></tr></tbody></table>`;
      app.querySelector('[data-pv=by]').onchange = e => { rep.by = e.target.value; loadPv(); };
    }
    app.querySelector('[data-pv=service]').onchange = e => { rep.service = e.target.value; loadPv(); };
    app.querySelector('[data-dept]').onchange = e => { rep.dept = e.target.value; R['admin/reports'](); };
    loadPv();
    app.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { rep.preset = b.dataset.preset; R['admin/reports'](); });
    app.querySelectorAll('[data-rf]').forEach(i => i.onchange = () => { rep[i.dataset.rf] = i.value; });
    const dl = async (url, name) => { try { const r = await ST.api('GET', url, null, true); const blob = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); ST.toast(`تم التنزيل — ${r.headers.get('x-row-count')} سطرًا`); } catch (e) { ST.toast(e.message, true); } };
    app.querySelector('[data-act=apply]') && (app.querySelector('[data-act=apply]').onclick = () => R['admin/reports']());
    app.querySelector('[data-act=pvcsv]').onclick = () => dl('/api/admin/export/pivot.csv?' + pvq(), `talabak-report-${ST.today()}.csv`);
    app.querySelector('[data-act=print]').onclick = () => window.print();
    app.querySelector('[data-act=sum]').onclick = () => dl('/api/admin/export/summary.csv?' + q, `talabak-summary-${ST.today()}.csv`);
    app.querySelector('[data-act=exp]').onclick = () => dl('/api/admin/export/requests.csv?' + q, `talabak-requests-${ST.today()}.csv`);
    app.querySelector('[data-act=exppii]').onclick = async () => { if (await ST.confirm('هذا الملف يحوي أسماء وأرقام هواتف العملاء. صدّره للاستخدام المخوَّل فقط، وسيُسجَّل هذا التصدير في سجل العمليات.', 'تصدير مع بيانات التواصل')) dl('/api/admin/export/requests.csv?pii=1&' + q, `talabak-requests-with-contacts-${ST.today()}.csv`); };
  };

  // ================= المكررات =================
  R['admin/duplicates'] = async function () {
    const { groups } = await ST.api('GET', '/api/admin/duplicates');
    app.innerHTML = `<h1 style="margin-top:0">الطلبات المكررة المحتملة</h1><p class="lead">طلبات من الهاتف نفسه لنفس الخدمة والتاريخ. لا تُدمج تلقائيًا: افتح الطلب وصنّفه مكررًا إن كان كذلك، أو اتركه إن كان طلبًا مشروعًا.</p>
      ${groups.length ? groups.map(g => `<div class="card" style="margin-bottom:12px"><b>${esc(ST.svcLabel(g.service))}</b> · <span class="mono">+${esc(g.phone_e164)}</span> · ${esc(g.svc_date)} · ${g.n} طلبات
        ${tbl(['الطلب', 'الاسم', 'الحالة', 'الاستلام'], g.requests.map(r => `<tr><td><a class="mono" href="#/r/${r.id}">${esc(r.ref)}</a></td><td>${esc(r.name)}</td><td>${ST.badge(r.status)}</td><td>${esc(ST.fmtDate(r.received_at))}</td></tr>`))}</div>`).join('') : '<div class="notice ok">لا توجد مجموعات مكررة غير معالجة.</div>'}`;
  };

  // ================= المستخدمون =================
  R['admin/users'] = async function () {
    const { users } = await ST.api('GET', '/api/admin/users');
    app.innerHTML = `<h1 style="margin-top:0">المستخدمون والصلاحيات</h1>
      <div class="card"><h2>إضافة مستخدم</h2><p class="lead">الموظف المرتبط بإدارة يرى الطلبات غير المسندة الخاصة بإدارته فقط (إضافة إلى المسندة إليه)؛ وغير المرتبط يرى كل غير المسندة. تُولَّد كلمة مرور مؤقتة تُعرض مرة واحدة فقط، ويُطلب من المستخدم تغييرها عند أول دخول.</p>
        <form id="uf" class="filters"><div class="field"><label>اسم المستخدم (إنجليزي)</label><input name="username" dir="ltr" required pattern="[A-Za-z0-9._\-]{3,32}" autocapitalize="off"></div><div class="field"><label>الاسم المعروض</label><input name="display_name" required></div>
        <div class="field"><label>الصلاحية</label><select name="role"><option value="staff">موظف</option><option value="admin">مدير النظام</option></select></div><button class="btn btn-primary">إنشاء</button></form></div>
      <div class="card" style="margin-top:12px">${tbl(['المستخدم', 'الاسم', 'الصلاحية', 'الإدارة', 'الحالة', 'آخر دخول', ''], users.map(u => `<tr><td class="mono">${esc(u.username)}</td><td>${esc(u.display_name)}</td><td>${u.role === 'admin' ? 'مدير' : 'موظف'}</td><td><select data-udept="${u.id}" style="min-height:40px"><option value="">— كل الإدارات —</option>${ST.cfg.departments.map(d => `<option value="${d.id}" ${u.dept_id === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></td><td>${u.active ? '<span class="badge s-ready">نشط</span>' : '<span class="badge red">معطل</span>'}${u.must_change ? ' <span class="badge gold">لم يغيّر كلمة المرور</span>' : ''}</td><td>${u.last_login ? esc(ST.fmtDate(u.last_login)) : '—'}</td>
        <td><div class="row-actions"><button class="btn btn-ghost btn-sm" data-reset="${u.id}">إعادة تعيين كلمة المرور</button><button class="btn btn-ghost btn-sm" data-toggle="${u.id}" data-active="${u.active}">${u.active ? 'تعطيل' : 'تفعيل'}</button><button class="btn btn-ghost btn-sm" data-role="${u.id}" data-r="${u.role === 'admin' ? 'staff' : 'admin'}">${u.role === 'admin' ? 'تحويل لموظف' : 'ترقية لمدير'}</button></div></td></tr>`))}</div>`;
    const showPw = (title, user, pw) => { const m = ST.modal(`<h2>${esc(title)}</h2><p>المستخدم: <b class="mono">${esc(user)}</b></p><div class="receipt" style="padding:12px"><div class="ref" style="font-size:24px">${esc(pw)}</div></div><div class="notice warn">انسخ كلمة المرور الآن وسلّمها للمستخدم بصورة آمنة. لن تظهر مرة أخرى.</div><div class="actions"><button class="btn btn-primary" data-c>نسخ</button><button class="btn btn-ghost" data-close>تم</button></div>`); m.el.querySelector('[data-c]').onclick = () => ST.copy(pw); };
    app.querySelector('#uf').onsubmit = async e => { e.preventDefault(); const f = e.target; try { const r = await ST.api('POST', '/api/admin/users', { username: f.username.value, display_name: f.display_name.value, role: f.role.value }); showPw('تم إنشاء المستخدم', r.username, r.temp_password); R['admin/users'](); } catch (err) { ST.toast(err.message, true); } };
    app.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => { const u = users.find(x => x.id == b.dataset.reset); if (await ST.confirm(`إعادة تعيين كلمة مرور «${u.display_name}»؟ ستنتهي جلساته الحالية.`)) { try { const r = await ST.api('POST', `/api/admin/users/${u.id}/reset`); showPw('كلمة مرور مؤقتة جديدة', u.username, r.temp_password); } catch (err) { ST.toast(err.message, true); } } });
    app.querySelectorAll('[data-udept]').forEach(sel => sel.onchange = async () => { try { await ST.api('PATCH', '/api/admin/users/' + sel.dataset.udept, { dept_id: sel.value === '' ? null : +sel.value }); ST.toast('تم حفظ إدارة المستخدم'); } catch (err) { ST.toast(err.message, true); } });
    app.querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => { try { await ST.api('PATCH', '/api/admin/users/' + b.dataset.toggle, { active: b.dataset.active !== '1' }); R['admin/users'](); } catch (err) { ST.toast(err.message, true); } });
    app.querySelectorAll('[data-role]').forEach(b => b.onclick = async () => { try { await ST.api('PATCH', '/api/admin/users/' + b.dataset.role, { role: b.dataset.r }); R['admin/users'](); } catch (err) { ST.toast(err.message, true); } });
  };

  // ================= الخدمات والحقول =================
  R['admin/services'] = async function () {
    const { services } = await ST.api('GET', '/api/admin/services');
    app.innerHTML = `<h1 style="margin-top:0">الخدمات وحقولها</h1><p class="lead">فعّل الخدمات أو عطّلها، وعدّل أسماء الحقول، وحدّد الحقل «مطلوبًا للإرسال» أو «مطلوبًا للإحالة» (يُحتسب الطلب ناقصًا إن بقي فارغًا أو «غير محدد حاليًا»). تسري التعديلات على الطلبات الجديدة.</p>
      <form id="sf">${services.map((s, i) => `<div class="card" style="margin-bottom:12px"><div class="row-actions" style="justify-content:space-between"><h2 style="margin:0">${esc(s.icon || '')} ${esc(s.label)}</h2><label class="sw"><input type="checkbox" data-s="${i}" data-p="active" ${s.active !== false ? 'checked' : ''}> مفعّلة</label></div>
        <div class="field"><label>اسم الخدمة</label><input data-s="${i}" data-p="label" value="${esc(s.label)}"></div>
        <div class="field"><label>الإدارة المسؤولة (تُصنَّف إليها طلباتها تلقائيًا)</label><select data-s="${i}" data-p="dept_id">${ST.cfg.departments.filter(d => d.active || d.id === s.dept_id).map(d => `<option value="${d.id}" ${s.dept_id === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
        ${s.notice !== undefined ? `<div class="field"><label>التنبيه المعروض للزائر</label><input data-s="${i}" data-p="notice" value="${esc(s.notice)}"></div>` : ''}
        ${tbl(['الحقل', 'ظاهر', 'مطلوب للإرسال', 'مطلوب للإحالة (قائمة التحقق)'], s.fields.map((f, j) => `<tr><td><input data-s="${i}" data-f="${j}" data-p="label" value="${esc(f.label)}" style="min-height:40px"><small class="mono">${esc(f.key)}</small></td>
          <td><input type="checkbox" data-s="${i}" data-f="${j}" data-p="active" ${f.active !== false ? 'checked' : ''}></td><td><input type="checkbox" data-s="${i}" data-f="${j}" data-p="required" ${f.required ? 'checked' : ''} ${f.type === 'multicheck' ? 'disabled' : ''}></td><td><input type="checkbox" data-s="${i}" data-f="${j}" data-p="ready" ${f.ready || f.required ? 'checked' : ''}></td></tr>`))}</div>`).join('')}
        <div class="actions"><button class="btn btn-primary">حفظ التعديلات</button></div></form>`;
    app.querySelector('#sf').addEventListener('input', onEdit); app.querySelector('#sf').addEventListener('change', onEdit);
    function onEdit(e) { const t = e.target, d = t.dataset; if (d.s === undefined) return; const v = t.type === 'checkbox' ? t.checked : (d.p === 'dept_id' ? +t.value : t.value); const tgt = d.f !== undefined ? services[+d.s].fields[+d.f] : services[+d.s]; tgt[d.p] = v; }
    app.querySelector('#sf').onsubmit = async e => { e.preventDefault(); try { await ST.api('PUT', '/api/admin/services', { services }); ST.toast('تم حفظ الخدمات'); } catch (err) { ST.toast(err.message, true); } };
  };

  // ================= الإعدادات =================
  R['admin/settings'] = async function () {
    const { settings: s } = await ST.api('GET', '/api/admin/settings');
    const inp = (k, label, type = 'text', hint = '') => `<div class="field"><label>${label}</label><input name="${k}" type="${type}" value="${esc(s[k])}">${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
    const ta = (k, label, hint = '') => `<div class="field"><label>${label}</label><textarea name="${k}">${esc(s[k])}</textarea>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
    const sw = (k, label) => `<label class="sw"><input type="checkbox" name="${k}" ${s[k] ? 'checked' : ''}> ${label}</label>`;
    app.innerHTML = `<h1 style="margin-top:0">إعدادات الفعالية</h1><form id="setf">
      <div class="card"><h2>الفعالية والترقيم</h2><div class="filters">${inp('event_name', 'اسم الفعالية')}${inp('ref_prefix', 'بادئة الرقم المرجعي')}${inp('event_code', 'رمز الفعالية', 'text', 'مثال: EX26 → KPTC-EX26-000123')}${inp('event_start', 'تاريخ البداية', 'date')}${inp('event_end', 'تاريخ النهاية', 'date')}</div>
        <p class="def-note">تغيير «رمز الفعالية» عند فعالية جديدة يبدأ ترقيمًا جديدًا من ١، ويبقى سجل الفعالية السابقة محفوظًا ويمكن تصفيته في التقارير.</p>
        ${sw('accepting', 'استقبال الطلبات مفتوح (أوقفه عند إقفال الفعالية)')}${ta('closed_message', 'رسالة الإيقاف')}</div>
      <div class="card" style="margin-top:12px"><h2>قنوات رسمية (لا تُعرض إلا إن أُدخلت)</h2>${inp('official_channel_text', 'وصف قناة المتابعة الرسمية (يظهر في بطاقة الاستلام)', 'text', 'مثال: رقم خدمة العملاء الرسمي ...')}${inp('official_channel_url', 'رابط / رقم القناة')}${inp('emergency_number', 'رقم الاستجابة الطارئة الرسمي (يظهر مع الأوناش فقط)')}
        ${ta('response_promise', 'عبارة مدة الاستجابة (اتركها فارغة إن لم تُعتمد)', 'لا يعد النظام العميل بمدة استجابة إلا بما تكتبه هنا.')}
        ${sw('whatsapp_link_enabled', 'إظهار زر «فتح واتساب» للموظف بعد اعتماد القناة (يفتح النص دون إرساله)')}${inp('public_base_url', 'رابط النشر العام (لصفحة QR)', 'url', 'مثال: https://talabak.example.com')}</div>
      <div class="card" style="margin-top:12px"><h2>الجهاز اللوحي (وضع الجناح)</h2><div class="filters">${inp('kiosk_idle_seconds', 'مهلة الخمول قبل المسح (ثانية)', 'number')}${inp('kiosk_warn_seconds', 'التحذير قبل المسح بـ (ثانية)', 'number')}${inp('rate_limit_per_10min', 'حد الإرسال لكل جهاز / ١٠ دقائق', 'number')}</div></div>
      <div class="card" style="margin-top:12px"><h2>النصوص</h2>${ta('privacy_text', 'بيان الخصوصية المختصر')}${ta('followup_template', 'قالب رسالة المتابعة', 'المتغيرات: {name} {ref} {service} {event} {missing}')}</div>
      <div class="card" style="margin-top:12px"><h2>الاحتفاظ والأرشفة والحذف</h2><div class="filters">${inp('retention_archive_days', 'أرشفة الطلبات المنتهية بعد (يوم)', 'number')}${inp('retention_delete_days', 'حذف المؤرشف نهائيًا بعد (يوم)', 'number')}</div>
        <div class="row-actions"><button type="button" class="btn btn-ghost btn-sm" data-ret="archive">معاينة / تنفيذ الأرشفة</button><button type="button" class="btn btn-ghost btn-sm" data-ret="delete">معاينة / تنفيذ الحذف</button></div><p class="def-note">لا يُنفَّذ شيء تلقائيًا: تظهر المعاينة أولًا ثم يؤكد المدير. الحذف لا يمس إلا الطلبات المؤرشفة.</p></div>
      <div class="actions"><button class="btn btn-primary">حفظ الإعدادات</button></div></form>`;
    app.querySelector('#setf').onsubmit = async e => {
      e.preventDefault(); const f = e.target, body = {};
      for (const el of f.elements) { if (!el.name) continue; body[el.name] = el.type === 'checkbox' ? el.checked : el.value; }
      try { await ST.api('PUT', '/api/admin/settings', body); ST.toast('تم حفظ الإعدادات'); } catch (err) { ST.toast(err.data && err.data.fields ? 'تحقق: ' + Object.values(err.data.fields).join('، ') : err.message, true); }
    };
    app.querySelectorAll('[data-ret]').forEach(b => b.onclick = async () => {
      const kind = b.dataset.ret, key = kind === 'archive' ? 'archive' : 'delete';
      try {
        const pre = await ST.api('POST', '/api/admin/retention', { [key]: true, dryRun: true });
        const n = kind === 'archive' ? pre.archived : pre.deleted;
        if (!n) return ST.toast('لا توجد طلبات مطابقة للسياسة الحالية');
        if (await ST.confirm(kind === 'archive' ? `سيتم أرشفة ${n} طلبًا منتهيًا.` : `سيتم حذف ${n} طلبًا مؤرشفًا نهائيًا. تأكد من وجود نسخة احتياطية.`, 'تنفيذ', kind === 'delete')) { await ST.api('POST', '/api/admin/retention', { [key]: true, dryRun: false }); ST.toast('تم التنفيذ'); }
      } catch (err) { ST.toast(err.message, true); }
    });
  };

  // ================= الروابط وQR =================
  R['admin/links'] = async function () {
    const { settings: s } = await ST.api('GET', '/api/admin/settings');
    const base = (s.public_base_url || location.origin).replace(/\/+$/, '');
    const items = [['qr_booth', 'QR الجناح (الجوال)', base + '/?s=qr_booth'], ['kiosk', 'الجهاز اللوحي المشترك (وضع الجناح)', base + '/kiosk'], ['promo', 'قناة ترويجية أخرى', base + '/?s=promo'], ['web', 'الرابط العام المباشر', base + '/']];
    const local = /localhost|127\.0\.0\.1|^http:/.test(base);
    app.innerHTML = `<h1 style="margin-top:0">الروابط ورموز QR</h1>
      ${local ? '<div class="notice bad"><b>لا تطبع أي رمز الآن.</b> الرابط الحالي محلي أو غير مشفّر (HTTP). انشر التطبيق على رابط HTTPS، اضبطه في «الإعدادات ← رابط النشر العام»، ثم افتح كل رمز بكاميرا هاتف واختبر تسجيل طلب تجريبي قبل الطباعة.</div>' : '<div class="notice warn">اختبر كل رمز بكاميرا هاتف وسجّل طلبًا تجريبيًا قبل طباعته.</div>'}
      <div class="notice info">لا يُنشأ QR لرابط الإدارة، ولا تُضمَّن أي بيانات عميل داخل الرموز. يُميَّز مصدر الطلب تلقائيًا من الرابط.</div>
      ${items.map(([k, t, u]) => `<div class="card" style="margin-bottom:12px"><div class="qrbox"><div data-qr="${esc(u)}"></div><div style="flex:1"><h2>${t}</h2><p class="mono" style="word-break:break-all">${esc(u)}</p><div class="row-actions"><button class="btn btn-ghost btn-sm" data-copy="${esc(u)}">نسخ الرابط</button><button class="btn btn-ghost btn-sm" data-dl="${esc(u)}" data-n="${k}">تنزيل الرمز (PNG)</button><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(u)}">فتح الرابط</a></div></div></div></div>`).join('')}`;
    const make = u => { const q = qrcode(0, 'M'); q.addData(u); q.make(); return q; };
    app.querySelectorAll('[data-qr]').forEach(d => { d.innerHTML = make(d.dataset.qr).createSvgTag({ cellSize: 6, margin: 4, scalable: true }); });
    app.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => ST.copy(b.dataset.copy));
    app.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => {
      const q = make(b.dataset.dl), n = q.getModuleCount(), cell = 12, m = 3, size = (n + 2 * m) * cell, c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * cell, (r + m) * cell, cell, cell);
      c.toBlob(bl => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `qr-${b.dataset.n}.png`; a.click(); });
    });
  };

  // ================= النسخ الاحتياطي =================
  R['admin/backups'] = async function () {
    const { backups, dir } = await ST.api('GET', '/api/admin/backups');
    app.innerHTML = `<h1 style="margin-top:0">النسخ الاحتياطي والاستعادة</h1>
      <div class="card"><p>يُؤخذ نسخ احتياطي تلقائي كل بضع ساعات (قابل للضبط من متغيرات التشغيل)، ويمكنك أخذ نسخة يدوية الآن. المسار على الخادم: <span class="mono">${esc(dir)}</span></p><button class="btn btn-primary" id="bk">أخذ نسخة احتياطية الآن</button></div>
      <div class="card" style="margin-top:12px">${tbl(['الملف', 'الحجم', 'التاريخ'], backups.map(b => `<tr><td class="mono">${esc(b.file)}</td><td>${(b.size / 1024).toFixed(0)} KB</td><td>${esc(ST.fmtDate(b.created_at))}</td></tr>`))}</div>
      <div class="card" style="margin-top:12px"><h2>الاستعادة</h2><ol><li>أوقف الخادم.</li><li>نفّذ: <span class="mono">npm run restore -- data/backups/&lt;اسم-الملف&gt;</span></li><li>يفحص الأمر سلامة النسخة ويحفظ الحالة الحالية قبل الاستبدال، ثم شغّل الخادم.</li></ol><p class="def-note">انسخ مجلد النسخ الاحتياطي دوريًا إلى مكان خارج الخادم (حاسوب الشركة أو تخزين سحابي) لأن النسخ على القرص نفسه لا تحمي من فقد القرص.</p></div>`;
    document.getElementById('bk').onclick = async () => { try { const r = await ST.api('POST', '/api/admin/backups'); ST.toast('تمت النسخة: ' + r.file); R['admin/backups'](); } catch (e) { ST.toast(e.message, true); } };
  };

  // ================= السجل =================
  R['admin/audit'] = async function () {
    const { rows } = await ST.api('GET', '/api/admin/audit?limit=300');
    app.innerHTML = `<h1 style="margin-top:0">سجل العمليات</h1><div class="card">${tbl(['الوقت', 'المنفّذ', 'العملية', 'التفاصيل'], rows.map(r => `<tr><td>${esc(ST.fmtDate(r.created_at))}</td><td>${esc(r.actor || '')}</td><td>${esc(r.action)}${r.request_id ? ` · <a href="#/r/${r.request_id}">طلب</a>` : ''}</td><td class="mono" style="font-size:13px">${esc(r.detail ? JSON.stringify(r.detail).slice(0, 200) : '')}</td></tr>`))}</div>`;
  };
})();
