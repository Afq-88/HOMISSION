/* محرك نموذج «طلبك معنا»: يخدم واجهة الزائر، وضع الجهاز اللوحي، تسجيل الموظف، وتعديل بيانات الطلب */
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
  const nd = s => String(s ?? '').replace(/[٠-٩]/g, c => AR.indexOf(c)).replace(/[۰-۹]/g, c => FA.indexOf(c)).replace(/٫/g, '.');
  const UNK = '__unknown__';
  const STEPS = ['الخدمة', 'التفاصيل', 'التواصل', 'المراجعة'];
  const BUS = cls => `<svg class="${cls}" viewBox="0 0 92 46" aria-hidden="true"><rect x="2" y="6" width="88" height="29" rx="8" fill="#2e2c78"/><rect x="2" y="24" width="88" height="5" fill="#ffc93c"/><rect x="7" y="10" width="15" height="14" rx="3" fill="#cfe6ff"/><rect x="26" y="11" width="14" height="10" rx="2" fill="#cfe6ff"/><rect x="44" y="11" width="14" height="10" rx="2" fill="#cfe6ff"/><rect x="62" y="11" width="14" height="10" rx="2" fill="#cfe6ff"/><circle cx="24" cy="37" r="7" fill="#14133a"/><circle cx="68" cy="37" r="7" fill="#14133a"/><circle cx="24" cy="37" r="3" fill="#ffc93c"/><circle cx="68" cy="37" r="3" fill="#ffc93c"/></svg>`;
  const empty = v => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  const fmtDate = iso => { try { return new Date(iso).toLocaleString('ar-KW-u-nu-latn', { timeZone: 'Asia/Kuwait', dateStyle: 'long', timeStyle: 'short' }); } catch { return iso; } };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''));

  function mount(root, opts) {
    const cfg = opts.config, mode = opts.mode; // public | kiosk | staff | edit
    let st, idleTimer, warnTimer, countTimer;
    const fresh = () => ({
      screen: mode === 'kiosk' ? 'welcome' : (mode === 'edit' ? 'edit' : 'form'), step: 1, service: opts.service || null,
      fields: {}, common: { phone_cc: '965', pref_channel: '', party_type: '' }, errors: {}, submitting: false, idem: null, receipt: null, netError: null, isTest: false, dirty: false, showErr: false,
    });
    st = fresh();
    if (mode === 'edit') { st.service = opts.service; st.fields = { ...opts.fields }; st.common = { phone_cc: '965', ...opts.common }; }

    const svc = () => cfg.services.find(s => s.id === st.service);
    const ctx = () => ({ ...st.common, ...st.fields });
    const showIf = (f, c) => !f.showIf || ('eq' in f.showIf ? c[f.showIf.key] === f.showIf.eq : (f.showIf.in || []).includes(c[f.showIf.key]));

    // ---------- تعريف الحقول المشتركة ----------
    const partyField = { key: 'party_type', label: 'هل الطلب باسم فرد أم جهة / شركة؟', type: 'radio', required: true, options: cfg.party, scope: 'c' };
    const contactFields = () => {
      const c = st.common;
      const list = [
        { key: 'name', label: 'اسم العميل', type: 'text', required: true, auto: 'name' },
        { key: 'phone', label: 'رقم الهاتف', type: 'phone', required: true },
        { key: 'pref_channel', label: 'وسيلة التواصل المفضلة', type: 'radio', required: true, options: cfg.channels },
        { key: 'email', label: 'البريد الإلكتروني', type: 'email', required: c.pref_channel === 'email', hint: c.pref_channel === 'email' ? 'مطلوب لأنك اخترت التواصل بالبريد' : '' },
        { key: 'org_name', label: 'اسم الجهة / الشركة', type: 'text', required: true, showIf: { key: 'party_type', eq: 'entity' } },
        { key: 'pref_time', label: 'وقت التواصل المفضل', type: 'select', options: cfg.pref_times, unknownOk: true },
        { key: 'notes', label: 'ملاحظات إضافية', type: 'textarea' },
      ];
      if (mode === 'kiosk') list.push({ key: 'assisted_by', label: 'اسم الموظف المساعد (إن وُجد)', type: 'text' });
      return list.map(f => ({ ...f, scope: 'c' }));
    };
    const needFields = () => (svc() ? svc().fields.map(f => ({ ...f, scope: 'f' })) : []);
    const store = f => (f.scope === 'c' ? st.common : st.fields);

    // ---------- التحقق في المتصفح (الخادم هو المرجع النهائي) ----------
    function phoneError() {
      const cc = st.common.phone_cc, c = cfg.countries.find(x => x.cc === cc);
      let d = nd(st.common.phone || '').replace(/[^\d+]/g, '');
      if (!d) return 'أدخل رقم الهاتف';
      if (c && c.cc !== '0') { if (d.startsWith('+' + c.cc)) d = d.slice(c.cc.length + 1); else if (d.startsWith('00' + c.cc)) d = d.slice(c.cc.length + 2); }
      d = d.replace(/\D/g, '').replace(/^0+/, '');
      if (!c) return 'اختر رمز الدولة';
      if (!c.len.includes(d.length)) return `رقم ${c.name} يجب أن يكون ${c.len.join(' أو ')} أرقام`;
      if (!new RegExp(c.first).test(d)) return `رقم الهاتف غير صحيح لدولة ${c.name}`;
      return '';
    }
    function fieldError(f) {
      const v = store(f)[f.key];
      if (f.type === 'phone') return phoneError();
      if (v === UNK) return f.required ? 'هذا الحقل مطلوب' : '';
      if (f.required && empty(v)) return f.type === 'radio' || f.type === 'select' ? 'اختر أحد الخيارات' : 'هذا الحقل مطلوب';
      if (empty(v)) return '';
      if (f.type === 'email' && !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'صيغة البريد الإلكتروني غير صحيحة';
      if (f.type === 'number') {
        const s = nd(v).replace(/,/g, '');
        if (!/^\d+$/.test(s)) return 'أدخل رقمًا صحيحًا';
        const n = +s; if ((f.min != null && n < f.min) || (f.max != null && n > f.max)) return `القيمة بين ${f.min ?? 0} و${f.max}`;
      }
      return '';
    }
    function validate(fields) {
      const errs = {}, c = ctx();
      for (const f of fields) { if (!showIf(f, c)) continue; const e = fieldError(f); if (e) errs[f.scope + '.' + f.key] = e; }
      return errs;
    }
    const step2Fields = () => [partyField, ...needFields()];
    const step3Fields = () => contactFields();
    function missingForReview() {
      const c = ctx(); const out = [];
      for (const f of needFields()) { if (!showIf(f, c) || f.active === false) continue; if (!(f.ready || f.required)) continue; const v = st.fields[f.key]; if (empty(v) || v === UNK) out.push(f.label); }
      return out;
    }

    // ---------- رسم الحقول ----------
    function fieldHtml(f) {
      if (!showIf(f, ctx())) return '';
      const k = f.scope + '.' + f.key, v = store(f)[f.key], err = st.errors[k];
      const unk = v === UNK;
      const id = 'fld-' + f.scope + '-' + f.key;
      const tag = f.required ? '<span class="req" aria-label="مطلوب">*</span>' : '<span class="opt">اختياري</span>';
      let ctl = '';
      const a = `data-s="${f.scope}" data-k="${esc(f.key)}"`;
      switch (f.type) {
        case 'text': case 'email':
          ctl = `<input id="${id}" type="${f.type === 'email' ? 'email' : 'text'}" ${a} value="${esc(unk ? '' : v)}" ${unk ? 'disabled' : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} autocomplete="${opts.mode === 'kiosk' ? 'off' : (f.auto || 'off')}" ${f.type === 'email' ? 'dir="ltr" inputmode="email"' : ''} ${f.max ? `maxlength="${f.max}"` : ''}>`; break;
        case 'number':
          ctl = `<input id="${id}" type="text" inputmode="numeric" ${a} data-num="1" value="${esc(unk ? '' : v)}" ${unk ? 'disabled' : ''} autocomplete="off">`; break;
        case 'date': case 'time':
          ctl = `<input id="${id}" type="${f.type}" ${a} value="${esc(unk ? '' : v)}" ${unk ? 'disabled' : ''}>`; break;
        case 'textarea':
          ctl = `<textarea id="${id}" ${a} ${unk ? 'disabled' : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}>${esc(unk ? '' : v)}</textarea>`; break;
        case 'select':
          ctl = `<select id="${id}" ${a}><option value="">— اختر —</option>${f.options.map(o => `<option value="${esc(o.v)}" ${v === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}${f.unknownOk ? `<option value="${UNK}" ${unk ? 'selected' : ''}>غير محدد حاليًا</option>` : ''}</select>`; break;
        case 'radio':
          ctl = `<div class="chips" role="radiogroup" aria-labelledby="${id}-l">${f.options.map(o => `<button type="button" class="chip" role="radio" aria-checked="${v === o.v}" aria-pressed="${v === o.v}" data-radio="1" ${a} data-v="${esc(o.v)}">${esc(o.l)}</button>`).join('')}</div>`; break;
        case 'multicheck':
          ctl = `<div class="chips" role="group" aria-labelledby="${id}-l">${f.options.map(o => `<button type="button" class="chip" aria-pressed="${(v || []).includes(o.v)}" data-multi="1" ${a} data-v="${esc(o.v)}">${esc(o.l)}</button>`).join('')}</div>`; break;
        case 'phone':
          ctl = `<div class="phone-row"><select aria-label="رمز الدولة" data-s="c" data-k="phone_cc">${cfg.countries.map(c => `<option value="${c.cc}" ${st.common.phone_cc === c.cc ? 'selected' : ''}>${c.cc === '0' ? esc(c.name) : `+${c.cc} ${esc(c.name)}`}</option>`).join('')}</select>
            <input id="${id}" type="tel" inputmode="tel" ${a} data-num="1" value="${esc(v)}" placeholder="مثال: 5XXXXXXX" autocomplete="${opts.mode === 'kiosk' ? 'off' : 'tel-national'}"></div>`; break;
      }
      const unkBtn = f.unknownOk && f.type !== 'select' ? `<button type="button" class="unk" data-unk="1" ${a} aria-pressed="${unk}">${unk ? '✓ ' : ''}غير محدد حاليًا</button>` : '';
      return `<div class="field ${err ? 'invalid' : ''}" data-fk="${k}"><label id="${id}-l" for="${id}">${esc(f.label)} ${tag}</label>${ctl}${unkBtn}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}${err ? `<div class="err-msg" role="alert">${esc(err)}</div>` : ''}</div>`;
    }

    // ---------- الشاشات ----------
    function stepper() {
      const p = (st.step - 1) / 3;
      return `<div class="route" style="--p:${p}" role="group" aria-label="خطوات التسجيل"><div class="line"></div><div class="fill"></div>${BUS('bus')}<ol>${STEPS.map((t, i) => `<li class="${i + 1 < st.step ? 'done' : ''} ${i + 1 === st.step ? 'cur' : ''}" ${i + 1 === st.step ? 'aria-current="step"' : ''}><i>${i + 1 < st.step ? '✓' : i + 1}</i><span>${t}</span></li>`).join('')}</ol></div>`;
    }
    const hero = big => `<section class="hero ${big ? 'big' : ''}" style="--hero-img:url(/img/kbus-fleet.jpg)"><div class="in"><h1>${esc(cfg.event.name)} — طلبك معنا</h1><p>اختر ما تحتاجه واترك بياناتك، وسيتابع فريق الشركة طلبك.</p><div class="pills"><span class="pill gold">تعبئة سريعة</span><span class="pill">${cfg.services.length} خدمات</span><span class="pill">بلا مستندات شخصية</span></div></div></section>`;
    function errBanner() {
      const n = Object.keys(st.errors).length;
      return n ? `<div class="notice bad" role="alert"><b>يرجى استكمال ${n === 1 ? 'حقل واحد' : n + ' حقول'} مطلوبة</b> — الحقول المعلَّمة بالأحمر أدناه.</div>` : '';
    }
    function stepService() {
      return `<h1>ما الخدمة التي تهمّك؟</h1><p class="lead">اختر خدمة واحدة للبدء. لا تتطلب هذه المرحلة أي مستندات شخصية.</p>
        <div class="tiles">${cfg.services.map(s => `<button type="button" class="tile photo" data-tile="${s.id}" aria-pressed="${st.service === s.id}"><span class="phw"><span class="ph" style="--img:url(${esc(s.img || '')})"></span></span><span class="ic" aria-hidden="true">${s.icon || '•'}</span><span class="tb"><b>${esc(s.label)}</b><small>${esc(s.desc || '')}</small></span></button>`).join('')}</div>${st.errors.service ? `<div class="err-msg" role="alert">${esc(st.errors.service)}</div>` : ''}`;
    }
    function stepNeeds() {
      const s = svc();
      return `<h1>${esc(s.icon || '')} ${esc(s.label)}</h1>
        ${s.notice ? `<div class="notice warn" role="note"><b>تنبيه:</b> ${esc(s.notice)}${cfg.emergency_number ? ` <br>رقم الطوارئ الرسمي: <b class="ltr">${esc(cfg.emergency_number)}</b>` : ''}</div>` : ''}
        <p class="lead">عبّئ ما تعرفه الآن. الحقول المعلَّمة بـ <span class="req">*</span> مطلوبة، وإن لم تعرف معلومة اختر «غير محدد حاليًا» وسنستكملها معك.</p>
        ${errBanner()}${step2Fields().map(fieldHtml).join('')}`;
    }
    function stepContact() {
      return `<h1>بيانات التواصل</h1><p class="lead">نستخدمها للتواصل معك بشأن طلبك فقط.</p>${errBanner()}${contactFields().map(fieldHtml).join('')}`;
    }
    function reviewRows(fields, vals) {
      const c = ctx();
      return fields.filter(f => showIf(f, c)).map(f => {
        const v = vals[f.key]; let shown;
        if (v === UNK) shown = 'غير محدد حاليًا';
        else if (empty(v)) return '';
        else if (f.options) shown = Array.isArray(v) ? v.map(x => (f.options.find(o => o.v === x) || {}).l || x).join('، ') : ((f.options.find(o => o.v === v) || {}).l || v);
        else if (f.type === 'phone') shown = '+' + (st.common.phone_cc === '0' ? '' : st.common.phone_cc) + ' ' + nd(v);
        else shown = nd(v);
        return `<li class="${v === UNK ? 'miss' : ''}"><b>${esc(f.label)}</b><span>${f.type === 'phone' ? `<bdi dir="ltr">${esc(shown)}</bdi>` : esc(shown)}</span></li>`;
      }).join('');
    }
    function stepReview() {
      const miss = missingForReview();
      return `<h1>راجع طلبك قبل الإرسال</h1>
        <div class="card" style="padding:14px 18px"><div class="sect-h"><h3 style="margin:6px 0">الخدمة وتفاصيل الاحتياج</h3><button type="button" class="btn btn-ghost btn-sm" data-goto="2">تعديل</button></div>
          <ul class="review"><li><b>الخدمة</b><span>${esc(svc().label)}</span></li>${reviewRows(step2Fields(), { ...st.fields, ...st.common })}</ul></div>
        <div class="card" style="padding:14px 18px"><div class="sect-h"><h3 style="margin:6px 0">بيانات التواصل</h3><button type="button" class="btn btn-ghost btn-sm" data-goto="3">تعديل</button></div>
          <ul class="review">${reviewRows(step3Fields(), st.common)}</ul></div>
        ${miss.length ? `<div class="notice warn" role="note"><b>معلومات يُستحسن استكمالها:</b> ${miss.map(esc).join('، ')}. يمكنك الإرسال الآن وسنتواصل معك لاستكمالها، أو <a href="#" data-goto="2">أضفها الآن</a>.</div>` : '<div class="notice ok">بياناتك مكتملة للمراجعة.</div>'}
        ${st.netError ? `<div class="notice bad" role="alert"><b>لم يُحفظ طلبك.</b> ${esc(st.netError)}<br>لا يوجد رقم استلام لهذا الطلب حتى يتم الحفظ بنجاح. بياناتك ما زالت محفوظة في هذه الشاشة — اضغط «إعادة المحاولة».</div>` : ''}
        ${mode === 'staff' ? `<label class="chip" style="margin-top:8px"><input type="checkbox" data-test ${st.isTest ? 'checked' : ''} style="width:22px;height:22px"> طلب تجريبي / تدريب (لا يدخل التقارير)</label>` : ''}
        <p class="hint" style="margin-top:14px">🔒 ${esc(cfg.privacy_text)}</p>`;
    }
    function receiptHtml(r) {
      return `<div class="receipt" id="receipt">
        <div class="rt"><b>${esc(r.event_name)}</b><p class="lead">شركة النقل العام الكويتية — بطاقة استلام طلب</p><div class="ref" aria-label="رقم الطلب">${esc(r.ref)}</div></div>
        <div class="rb"><dl><dt>تاريخ الاستلام</dt><dd>${esc(fmtDate(r.received_at))}</dd><dt>نوع الخدمة</dt><dd>${esc(r.service)}</dd><dt>الاسم</dt><dd>${esc(r.customer)}</dd><dt>الهاتف</dt><dd><bdi dir="ltr">${esc(r.phone_masked)}</bdi></dd>
        ${r.summary.map(x => `<dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd>`).join('')}</dl>
        ${r.incomplete ? '<div class="notice warn" style="margin-top:12px">بعض المعلومات غير مكتملة، وسنتواصل معك لاستكمالها.</div>' : ''}
        <h3>الخطوة التالية</h3><p style="margin:0">${esc(r.next_step)}</p>
        ${r.channel_text || r.channel_url ? `<h3>قناة المتابعة الرسمية</h3><p style="margin:0">${esc(r.channel_text)} ${r.channel_url ? `<bdi dir="ltr">${esc(r.channel_url)}</bdi>` : ''}</p>` : ''}
        ${r.emergency_number ? `<div class="notice warn">هذا النموذج ليس للحالات الطارئة. رقم الطوارئ الرسمي: <b class="ltr">${esc(r.emergency_number)}</b></div>` : ''}</div>
        <div class="tear"></div><div class="rf"><div class="conf">${esc(r.confirmation)}</div><div class="barcode" aria-hidden="true"></div></div></div>`;
    }
    function screenReceipt() {
      return `<div class="drive no-print" aria-hidden="true">${BUS('')}</div><div class="notice ok no-print" role="status"><span class="okmark">✓</span><b>تم حفظ طلبك بنجاح</b> — احتفظ برقم الطلب أدناه.</div>${receiptHtml(st.receipt)}
        <div class="actions no-print"><button class="btn btn-primary" data-print>🖨 طباعة البطاقة</button><button class="btn btn-ghost" data-png>⬇ تنزيل كصورة</button>
        <span class="grow"></span>${mode === 'staff' ? '<button class="btn btn-sign" data-new>＋ طلب جديد</button>' + (opts.openUrl ? `<a class="btn btn-ghost" href="${opts.openUrl(st.receipt)}">فتح الطلب</a>` : '') : (mode === 'kiosk' ? '<button class="btn btn-sign" data-new>بدء طلب جديد</button>' : '<button class="btn btn-sign" data-new>تقديم طلب آخر</button>')}</div>`;
    }
    function screenWelcome() {
      return `<div class="welcome">${hero(true)}<div class="cta"><button class="btn btn-primary big" data-start>ابدأ طلبًا جديدًا ←</button><p class="hint" style="margin-top:14px">أي طلب أو استفسار — سجّله هنا وسيصل مباشرة إلى فريقنا.</p></div></div>`;
    }
    function screenEdit() {
      return `${errBanner()}<h3>الخدمة: ${esc(svc().label)}</h3>${[partyField, ...needFields()].map(fieldHtml).join('')}<h3>بيانات التواصل</h3>${contactFields().map(fieldHtml).join('')}
        <div class="actions"><button class="btn btn-primary" data-save>${st.submitting ? '<span class="spinner"></span>' : ''} حفظ التعديلات</button><button class="btn btn-ghost" data-cancel>إلغاء</button></div>`;
    }

    function actions() {
      const back = st.step > 1 ? '<button type="button" class="btn btn-ghost" data-back>→ السابق</button>' : '';
      if (st.step === 1) return '';
      if (st.step === 4) return `<div class="actions">${back}<span class="grow"></span><button type="button" class="btn btn-sign" data-submit ${st.submitting ? 'disabled' : ''}>${st.submitting ? '<span class="spinner" style="border-color:rgba(0,0,0,.25);border-top-color:#14133a"></span> جارٍ الحفظ…' : (st.netError ? '↻ إعادة المحاولة' : 'إرسال الطلب')}</button></div>`;
      return `<div class="actions">${back}<span class="grow"></span><button type="button" class="btn btn-primary" data-next>التالي ←</button></div>`;
    }

    function render(focusSel) {
      const y = window.scrollY;
      let html;
      if (st.screen === 'welcome') html = screenWelcome();
      else if (st.screen === 'receipt') html = screenReceipt();
      else if (st.screen === 'edit') html = screenEdit();
      else html = (st.step === 1 && (mode === 'public' || mode === 'kiosk') ? hero(false) : '') + stepper() + `<div class="card">${st.step === 1 ? stepService() : st.step === 2 ? stepNeeds() : st.step === 3 ? stepContact() : stepReview()}</div>` + actions();
      const hp = mode === 'public' || mode === 'kiosk' ? '<div class="hp" aria-hidden="true"><label>الموقع<input type="text" name="website" tabindex="-1" autocomplete="off" data-hp></label></div>' : '';
      root.innerHTML = html + hp;
      window.scrollTo(0, y);
      if (focusSel) { const el = root.querySelector(focusSel); if (el) el.focus({ preventScroll: false }); }
    }
    function toTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

    // ---------- الإجراءات ----------
    function setVal(scope, key, value) {
      (scope === 'c' ? st.common : st.fields)[key] = value; st.dirty = true; delete st.errors[scope + '.' + key]; st.netError = null; st.idem = null;
    }
    function go(step) { st.step = step; st.showErr = false; render(); toTop(); }
    function next() {
      if (st.step === 1) { if (!st.service) { st.errors = { service: 'اختر خدمة للمتابعة' }; return render(); } return go(2); }
      const errs = validate(st.step === 2 ? step2Fields() : step3Fields());
      st.errors = errs;
      if (Object.keys(errs).length) { render(); const first = root.querySelector('.invalid'); if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      go(st.step + 1);
    }
    function payload() {
      const f = {}; const c = ctx();
      for (const fd of needFields()) if (showIf(fd, c) && !empty(st.fields[fd.key])) f[fd.key] = st.fields[fd.key];
      const body = { service: st.service, ...st.common, fields: f, is_test: st.isTest };
      body.phone = nd(body.phone); body.phone_cc = st.common.phone_cc;
      if (st.common.pref_time === UNK) delete body.pref_time;
      if (mode !== 'staff') { body.source = opts.source || 'web'; if (opts.tag) body.tag = opts.tag; if (opts.rep) body.rep = opts.rep; if (mode === 'kiosk') body.tag = devId; const hp = root.querySelector('[data-hp]'); body.website = hp ? hp.value : ''; }
      return body;
    }
    async function submit() {
      if (st.submitting) return;
      // تحقق شامل قبل الإرسال
      const errs = { ...validate(step2Fields()), ...validate(step3Fields()) };
      if (Object.keys(errs).length) { st.errors = errs; const bad2 = Object.keys(errs).some(k => step2Fields().some(f => f.scope + '.' + f.key === k)); return go(bad2 ? 2 : 3); }
      st.submitting = true; st.netError = null; if (!st.idem) st.idem = uuid(); render();
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 25000);
      try {
        const res = await fetch(opts.url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'talabak', 'Idempotency-Key': st.idem }, body: JSON.stringify(payload()), credentials: 'same-origin' });
        let data = {}; try { data = await res.json(); } catch { /* */ }
        if (res.ok && data.receipt && data.receipt.ref) {
          st.receipt = data.receipt; st.receiptId = data.id; st.screen = 'receipt'; st.submitting = false;
          st.fields = {}; st.common = { phone_cc: '965' }; st.errors = {}; // لا نبقي بيانات العميل في الذاكرة بعد النجاح
          if (opts.onDone) opts.onDone(data); render(); toTop(); return;
        }
        st.submitting = false;
        if (res.status === 422 && data.fields) {
          st.errors = {}; for (const [k, m] of Object.entries(data.fields)) st.errors[k.startsWith('f.') ? 'f.' + k.slice(2) : (k === 'service' ? 'service' : 'c.' + k)] = m;
          const bad2 = Object.keys(st.errors).some(k => k.startsWith('f.') || k === 'c.party_type');
          return go(bad2 ? 2 : 3);
        }
        if (res.status === 401) st.netError = 'انتهت جلسة الدخول. سجّل الدخول من جديد ثم أعد المحاولة.';
        else st.netError = data.error || 'تعذّر الحفظ بسبب خطأ في الخادم.';
      } catch (e) {
        st.submitting = false;
        st.netError = e.name === 'AbortError' ? 'انتهت مهلة الاتصال.' : 'لا يوجد اتصال بالإنترنت أو تعذّر الوصول إلى الخادم.';
      } finally { clearTimeout(to); }
      render('[data-submit]'); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    async function saveEdit() {
      const errs = validate([partyField, ...needFields(), ...contactFields()]);
      st.errors = errs; if (Object.keys(errs).length) { render(); const f = root.querySelector('.invalid'); if (f) f.scrollIntoView({ block: 'center' }); return; }
      st.submitting = true; render();
      const f = {}; const c = ctx(); for (const fd of needFields()) if (showIf(fd, c)) f[fd.key] = empty(st.fields[fd.key]) ? '' : st.fields[fd.key];
      const common = { ...st.common }; common.phone = nd(common.phone);
      try { const r = await opts.onSave({ common, fields: f }); st.submitting = false; if (r && r.errors) { st.errors = {}; for (const [k, m] of Object.entries(r.errors)) st.errors[k.startsWith('f.') ? k : 'c.' + k] = m; render(); } }
      catch (e) { st.submitting = false; st.errors = {}; render(); if (opts.onError) opts.onError(e); }
    }

    // ---------- PNG لبطاقة الاستلام ----------
    function wrap(ctx2, text, maxW) {
      const words = String(text).split(/\s+/), lines = []; let line = '';
      for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx2.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
      if (line) lines.push(line); return lines;
    }
    function downloadPng() {
      const r = st.receipt, W = 1000, M = 50, font = '"Segoe UI","SF Arabic","Geeza Pro","Noto Sans Arabic",Tahoma,sans-serif';
      const c = document.createElement('canvas'); c.width = W; c.height = 3000; const g = c.getContext('2d'); g.direction = 'rtl'; g.textAlign = 'right';
      const rows = [{ t: r.event_name, s: 34, b: 1, col: '#14133a' }, { t: 'شركة النقل العام الكويتية — بطاقة استلام طلب', s: 24, col: '#5f5e78' }, { gap: 10 }, { ref: r.ref }, { gap: 6 },
        { kv: ['تاريخ الاستلام', fmtDate(r.received_at)] }, { kv: ['نوع الخدمة', r.service] }, { kv: ['الاسم', r.customer] }, ...r.summary.map(x => ({ kv: [x.label, x.value] })), { gap: 14 },
        { t: 'الخطوة التالية', s: 26, b: 1, col: '#2e2c78' }, { t: r.next_step, s: 24 }, ...(r.channel_text ? [{ t: 'قناة المتابعة الرسمية: ' + r.channel_text + ' ' + (r.channel_url || ''), s: 24 }] : []), { gap: 14 }, { box: r.confirmation }];
      let y = 40; const draw = [];
      g.font = `bold 30px ${font}`;
      for (const row of rows) {
        if (row.gap) { y += row.gap; continue; }
        if (row.ref) { draw.push({ type: 'ref', y, text: row.ref }); y += 100; continue; }
        if (row.kv) { g.font = `24px ${font}`; const ls = wrap(g, row.kv[1], W - 2 * M - 270); draw.push({ type: 'kv', y, k: row.kv[0], ls }); y += 38 * ls.length + 8; continue; }
        if (row.box) { g.font = `24px ${font}`; const ls = wrap(g, row.box, W - 2 * M - 40); draw.push({ type: 'box', y, ls }); y += 38 * ls.length + 40; continue; }
        g.font = `${row.b ? 'bold ' : ''}${row.s}px ${font}`; const ls = wrap(g, row.t, W - 2 * M); draw.push({ type: 't', y, ls, row }); y += (row.s + 14) * ls.length;
      }
      const H = y + 40; c.height = H; const g2 = c.getContext('2d'); g2.direction = 'rtl'; g2.textAlign = 'right'; g2.textBaseline = 'top';
      g2.fillStyle = '#fff'; g2.fillRect(0, 0, W, H); g2.fillStyle = '#ffc93c'; g2.fillRect(0, 0, W, 14); g2.strokeStyle = '#2e2c78'; g2.lineWidth = 4; g2.strokeRect(2, 2, W - 4, H - 4);
      for (const d of draw) {
        if (d.type === 'ref') { g2.fillStyle = '#f3f2ec'; g2.fillRect(M, d.y, W - 2 * M, 84); g2.fillStyle = '#2e2c78'; g2.font = `bold 46px ${font}`; g2.textAlign = 'center'; g2.fillText(d.text, W / 2, d.y + 18); g2.textAlign = 'right'; }
        else if (d.type === 'kv') { g2.font = `24px ${font}`; g2.fillStyle = '#5f5e78'; g2.fillText(d.k, W - M, d.y); g2.fillStyle = '#14133a'; g2.font = `bold 24px ${font}`; d.ls.forEach((l, i) => g2.fillText(l, W - M - 270, d.y + i * 38)); }
        else if (d.type === 'box') { g2.fillStyle = '#e4f4ec'; g2.fillRect(M, d.y, W - 2 * M, d.ls.length * 38 + 28); g2.fillStyle = '#14133a'; g2.font = `24px ${font}`; d.ls.forEach((l, i) => g2.fillText(l, W - M - 20, d.y + 14 + i * 38)); }
        else { g2.font = `${d.row.b ? 'bold ' : ''}${d.row.s}px ${font}`; g2.fillStyle = d.row.col || '#14133a'; d.ls.forEach((l, i) => g2.fillText(l, W - M, d.y + i * (d.row.s + 14))); }
      }
      c.toBlob(b => { const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = `${r.ref}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }, 'image/png');
    }

    // ---------- وضع الجهاز اللوحي المشترك ----------
    function wipe() { clearTimeout(idleTimer); clearTimeout(warnTimer); clearInterval(countTimer); const m = document.getElementById('idle-modal'); if (m) m.remove(); st = fresh(); render(); window.scrollTo(0, 0); }
    function armIdle() {
      if (mode !== 'kiosk' || st.screen === 'welcome') return;
      clearTimeout(idleTimer); clearTimeout(warnTimer);
      const idle = (cfg.kiosk.idle || 120) * 1000, warn = Math.min((cfg.kiosk.warn || 30) * 1000, idle - 5000);
      warnTimer = setTimeout(() => {
        if (st.screen === 'receipt' || !st.dirty && st.step === 1) return wipeSoon(warn);
        showWarn(warn);
      }, idle - warn);
      idleTimer = setTimeout(wipe, idle);
    }
    function wipeSoon() { /* على شاشة الاستلام أو قبل الكتابة: مسح صامت عند انتهاء المهلة */ }
    function showWarn(ms) {
      if (document.getElementById('idle-modal')) return;
      const m = document.createElement('div'); m.id = 'idle-modal'; m.className = 'modal-bg';
      let left = Math.ceil(ms / 1000);
      m.innerHTML = `<div class="modal" role="alertdialog" aria-live="assertive"><h2>هل ما زلت تكتب؟</h2><p>لحماية بياناتك، سيتم مسح هذه الشاشة خلال <b id="idle-left">${left}</b> ثانية.</p><div class="actions"><button class="btn btn-primary grow" id="idle-stay">نعم، أكمل طلبي</button><button class="btn btn-ghost" id="idle-clear">مسح وبدء من جديد</button></div></div>`;
      document.body.appendChild(m);
      countTimer = setInterval(() => { left--; const e = document.getElementById('idle-left'); if (e) e.textContent = String(Math.max(0, left)); }, 1000);
      m.querySelector('#idle-stay').onclick = () => { clearInterval(countTimer); m.remove(); armIdle(); };
      m.querySelector('#idle-clear').onclick = wipe;
      m.querySelector('#idle-stay').focus();
    }
    // ---------- التحكم عن بعد: نبض كل ٥ ثوانٍ، أوامر (مسح/تحديث/إيقاف/لافتة) ----------
    const devId = (function () { try { let d = localStorage.getItem('kiosk_dev'); if (!d) { d = 'k' + uuid().slice(0, 14); localStorage.setItem('kiosk_dev', d); } return d; } catch { return 'k' + uuid().slice(0, 14); } })();
    function setBanner(t) { let b = document.getElementById('kbanner'); if (!t) { if (b) b.remove(); return; } if (!b) { b = document.createElement('div'); b.id = 'kbanner'; b.className = 'kbanner'; b.setAttribute('role', 'status'); document.body.prepend(b); } if (b.textContent !== t) b.textContent = t; }
    function setPaused(on, msg) {
      let o = document.getElementById('kpaused');
      if (!on) { if (o) o.remove(); return; }
      if (!o) { wipe(); o = document.createElement('div'); o.id = 'kpaused'; o.className = 'paused'; o.setAttribute('role', 'alert'); document.body.appendChild(o); }
      const html = `<div><div class="ic" aria-hidden="true">🚧</div><h1>الجهاز متوقف مؤقتًا</h1><p style="font-size:20px">${esc(msg || '')}</p></div>`;
      if (o.innerHTML !== html) o.innerHTML = html;
    }
    async function ping() {
      try {
        const r = await fetch('/api/public/kiosk/ping', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'talabak' }, body: JSON.stringify({ device: devId, screen: st.screen }), cache: 'no-store' });
        if (!r.ok) return; const d = await r.json();
        if ((d.commands || []).includes('reload')) return location.reload();
        if ((d.commands || []).includes('reset')) wipe();
        setBanner(d.banner); setPaused(d.paused, d.pause_msg);
      } catch { /* بلا اتصال: يستمر الجهاز بعمله ويعيد المحاولة */ }
    }
    if (mode === 'kiosk') { ping(); setInterval(ping, 5000); }
    if (mode === 'kiosk') {
      const bump = () => { if (document.getElementById('idle-modal')) return; armIdle(); };
      ['pointerdown', 'keydown', 'input', 'scroll'].forEach(ev => window.addEventListener(ev, bump, { passive: true }));
      window.addEventListener('pagehide', () => { st = fresh(); });
    }

    // ---------- الأحداث ----------
    root.addEventListener('click', e => {
      const t = e.target.closest('button, a[data-goto], [data-tile]'); if (!t || !root.contains(t)) return;
      if (t.dataset.tile) { if (st.service !== t.dataset.tile) { st.service = t.dataset.tile; st.fields = {}; st.errors = {}; st.dirty = true; } st.idem = null; return go(2); }
      if (t.dataset.radio) { setVal(t.dataset.s, t.dataset.k, t.dataset.v); return render(); }
      if (t.dataset.multi) { const cur = st.fields[t.dataset.k] || []; const v = t.dataset.v; setVal('f', t.dataset.k, cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]); return render(); }
      if (t.dataset.unk) { const sc = t.dataset.s, k = t.dataset.k; const on = (sc === 'c' ? st.common : st.fields)[k] === UNK; setVal(sc, k, on ? '' : UNK); return render(); }
      if (t.hasAttribute('data-next')) return next();
      if (t.hasAttribute('data-back')) return go(st.step - 1);
      if (t.dataset.goto) { e.preventDefault(); return go(+t.dataset.goto); }
      if (t.hasAttribute('data-submit')) return submit();
      if (t.hasAttribute('data-save')) return saveEdit();
      if (t.hasAttribute('data-cancel')) return opts.onCancel && opts.onCancel();
      if (t.hasAttribute('data-print')) return window.print();
      if (t.hasAttribute('data-png')) return downloadPng();
      if (t.hasAttribute('data-start')) { st.screen = 'form'; render(); armIdle(); return; }
      if (t.hasAttribute('data-new')) { const wasKiosk = mode === 'kiosk'; st = fresh(); if (wasKiosk) { st.screen = 'welcome'; clearTimeout(idleTimer); clearTimeout(warnTimer); } render(); toTop(); }
    });
    root.addEventListener('input', e => {
      const el = e.target; if (el.dataset.hp !== undefined || el.hasAttribute('data-test')) { if (el.hasAttribute('data-test')) st.isTest = el.checked; return; }
      if (!el.dataset.k) return;
      setVal(el.dataset.s, el.dataset.k, el.value);
      const wrapEl = el.closest('.field'); if (wrapEl) { wrapEl.classList.remove('invalid'); const m = wrapEl.querySelector('.err-msg'); if (m) m.remove(); }
    });
    root.addEventListener('change', e => {
      const el = e.target;
      if (el.hasAttribute('data-test')) { st.isTest = el.checked; return; }
      if (el.tagName === 'SELECT' && el.dataset.k) { setVal(el.dataset.s, el.dataset.k, el.value); render(); }
    });
    root.addEventListener('focusout', e => { const el = e.target; if (el.dataset && el.dataset.num !== undefined) { const v = nd(el.value); if (v !== el.value) { el.value = v; setVal(el.dataset.s, el.dataset.k, v); } } });

    render();
    return { reset: wipe, state: () => st };
  }

  window.KForm = { mount, esc, nd, fmtDate };
})();
