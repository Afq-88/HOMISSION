'use strict';
const { clean, normDigits, isDate, isTime, normalizePhone, validEmail } = require('./util');

const UNKNOWN = '__unknown__';
const UNKNOWN_LABEL = 'غير محدد حاليًا';
const o = (v, l) => ({ v, l });

// ---- الحقول المشتركة (ثابتة في الشيفرة؛ تُعرض في الخطوة الثالثة) ----
const PARTY = [o('individual', 'فرد'), o('entity', 'جهة / شركة')];
const CHANNELS = [o('call', 'اتصال'), o('whatsapp', 'واتساب'), o('email', 'بريد إلكتروني')];
const PREF_TIMES = [o('any', 'أي وقت'), o('morning', 'صباحًا'), o('noon', 'ظهرًا'), o('evening', 'مساءً')];

// ---- تعريف الخدمات الافتراضي (يمكن للمدير تعديله من الواجهة) ----
// required: لازم للإرسال | ready: لازم لاكتمال المعلومات قبل الإحالة | unknownOk: يسمح بـ «غير محدد حاليًا»
const DEFAULT_SERVICES = [
  {
    id: 'subscriptions', label: 'اشتراكات النقل العام', icon: '🎫', active: true, dateField: 'start_date',
    desc: 'اشتراك جديد أو تجديد أو استفسار',
    fields: [
      { key: 'kind', label: 'نوع الطلب', type: 'radio', required: true, options: [o('new', 'اشتراك جديد'), o('renew', 'تجديد'), o('inquiry', 'استفسار')] },
      { key: 'duration', label: 'المدة المطلوبة', type: 'select', ready: true, options: [o('1m', 'شهر واحد'), o('3m', '٣ أشهر'), o('6m', '٦ أشهر'), o('12m', '١٢ شهرًا'), o('help', 'أحتاج المساعدة في الاختيار')], hint: 'يتم تأكيد الخيارات المتاحة والأسعار من الجهة المختصة' },
      { key: 'from_area', label: 'منطقة الانطلاق', type: 'text', ready: true, unknownOk: true, placeholder: 'مثال: حولي' },
      { key: 'to_area', label: 'منطقة الوصول', type: 'text', ready: true, unknownOk: true, placeholder: 'مثال: العاصمة' },
      { key: 'line_no', label: 'رقم الخط (إن كان معروفًا)', type: 'text', max: 20 },
      { key: 'start_date', label: 'تاريخ بدء الاستخدام المرغوب', type: 'date' },
      { key: 'beneficiaries', label: 'عدد المستفيدين (للطلب الجماعي)', type: 'number', min: 1, max: 100000, showIf: { key: 'party_type', eq: 'entity' }, ready: true, unknownOk: true },
    ],
  },
  {
    id: 'charter', label: 'تأجير الحافلات والنقل الخاص وVIP', icon: '🚌', active: true, dateField: 'trip_date',
    desc: 'رحلات، مناسبات، نقل موظفين أو طلبة، استقبال وفود',
    fields: [
      { key: 'purpose', label: 'الغرض', type: 'select', required: true, options: [o('trip', 'رحلة'), o('event', 'مناسبة'), o('staff', 'نقل موظفين'), o('students', 'نقل طلبة'), o('delegations', 'استقبال وفود'), o('other', 'غير ذلك')] },
      { key: 'purpose_other', label: 'اذكر الغرض', type: 'text', showIf: { key: 'purpose', eq: 'other' }, ready: true },
      { key: 'service_type', label: 'نوع الخدمة', type: 'radio', required: true, options: [o('once', 'رحلة واحدة'), o('recurring', 'نقل متكرر')] },
      { key: 'bus_type', label: 'الحافلة المطلوبة', type: 'radio', options: [o('regular', 'عادية'), o('vip', 'VIP'), o('unknown', 'غير محدد')], ready: true },
      { key: 'passengers', label: 'عدد الركاب', type: 'number', min: 1, max: 5000, ready: true, unknownOk: true },
      { key: 'bus_count', label: 'عدد الحافلات (إن كان معروفًا)', type: 'number', min: 1, max: 500 },
      { key: 'from_place', label: 'منطقة / نقطة الانطلاق', type: 'text', ready: true, unknownOk: true },
      { key: 'destination', label: 'الوجهة', type: 'text', ready: true, unknownOk: true },
      { key: 'trip_date', label: 'التاريخ المطلوب', type: 'date', ready: true, unknownOk: true, showIf: { key: 'service_type', eq: 'once' } },
      { key: 'trip_time', label: 'الوقت المطلوب', type: 'time', ready: true, unknownOk: true, showIf: { key: 'service_type', eq: 'once' } },
      { key: 'direction', label: 'الرحلة', type: 'radio', options: [o('oneway', 'ذهاب فقط'), o('round', 'ذهاب وعودة')], ready: true },
      { key: 'return_at', label: 'موعد العودة', type: 'text', showIf: { key: 'direction', eq: 'round' }, ready: true, unknownOk: true, placeholder: 'مثال: نفس اليوم ٦ مساءً', max: 100 },
      { key: 'op_days', label: 'أيام التشغيل', type: 'multicheck', showIf: { key: 'service_type', eq: 'recurring' }, ready: true, options: [o('sun', 'الأحد'), o('mon', 'الاثنين'), o('tue', 'الثلاثاء'), o('wed', 'الأربعاء'), o('thu', 'الخميس'), o('fri', 'الجمعة'), o('sat', 'السبت')] },
      { key: 'svc_start', label: 'تاريخ بداية الخدمة', type: 'date', showIf: { key: 'service_type', eq: 'recurring' }, ready: true, unknownOk: true },
      { key: 'svc_end', label: 'تاريخ نهاية الخدمة', type: 'date', showIf: { key: 'service_type', eq: 'recurring' }, ready: true, unknownOk: true },
      { key: 'access', label: 'احتياجات سهولة الصعود / تجهيزات الحافلة', type: 'multicheck', hint: 'لا نطلب أي تفاصيل صحية', options: [o('boarding', 'سهولة الصعود والنزول'), o('luggage', 'مساحة للأمتعة'), o('other', 'تجهيزات أخرى (اذكرها في الملاحظات)')] },
    ],
  },
  {
    id: 'ads', label: 'الإعلان على الحافلات', icon: '📢', active: true, dateField: 'start_date',
    desc: 'حملات إعلانية على حافلات الشركة',
    fields: [
      { key: 'brand', label: 'اسم المنشأة أو العلامة التجارية', type: 'text', required: true },
      { key: 'activity', label: 'طبيعة النشاط', type: 'text', ready: true },
      { key: 'goal', label: 'الهدف من الحملة', type: 'select', ready: true, options: [o('awareness', 'التعريف بالعلامة'), o('promo', 'الترويج لمنتج أو خدمة'), o('event', 'الإعلان عن فعالية'), o('other', 'غير ذلك')] },
      { key: 'start_date', label: 'تاريخ البدء المتوقع', type: 'date', ready: true, unknownOk: true },
      { key: 'duration', label: 'مدة الحملة', type: 'text', ready: true, unknownOk: true, placeholder: 'مثال: ٣ أشهر', max: 60 },
      { key: 'bus_count', label: 'عدد الحافلات المطلوب', type: 'number', min: 1, max: 1000, ready: true, unknownOk: true },
      { key: 'area', label: 'النطاق الجغرافي المفضل', type: 'text' },
      { key: 'materials', label: 'هل المواد الإعلانية جاهزة؟', type: 'radio', ready: true, options: [o('yes', 'نعم'), o('partial', 'جزئيًا'), o('no', 'لا')] },
      { key: 'ask', label: 'ما المطلوب؟', type: 'radio', required: true, options: [o('quote', 'طلب عرض سعر'), o('call', 'طلب تواصل لمناقشة الخيارات')] },
    ],
  },
  {
    id: 'towing', label: 'الأوناش ونقل المركبات', icon: '🚛', active: true, dateField: 'when_date',
    desc: 'نقل مركبة بونش',
    notice: 'هذا النموذج ليس قناة للاستجابة الطارئة. في الحالات العاجلة تواصل مع الجهات المختصة بالطوارئ.',
    fields: [
      { key: 'vehicle_type', label: 'نوع المركبة', type: 'text', required: true, placeholder: 'مثال: سيارة صالون / دفع رباعي / شاحنة' },
      { key: 'location', label: 'موقع المركبة (وصف)', type: 'textarea', ready: true, unknownOk: true, placeholder: 'اذكر المنطقة وأقرب معلم' },
      { key: 'destination', label: 'الوجهة المطلوبة', type: 'text', ready: true, unknownOk: true },
      { key: 'state', label: 'حالة المركبة', type: 'radio', ready: true, options: [o('movable', 'قابلة للحركة'), o('immobile', 'غير قابلة للحركة'), o('unknown', 'غير معلوم')] },
      { key: 'when_date', label: 'التاريخ المطلوب', type: 'date', ready: true, unknownOk: true },
      { key: 'when_time', label: 'الوقت المطلوب', type: 'time', ready: true, unknownOk: true },
      { key: 'description', label: 'وصف الاحتياج', type: 'textarea', ready: true },
    ],
  },
  {
    id: 'workshop', label: 'خدمات الورش والإصلاح', icon: '🔧', active: true, dateField: 'visit_date',
    desc: 'فحص وإصلاح المركبات',
    fields: [
      { key: 'vehicle', label: 'نوع المركبة وموديلها', type: 'text', required: true, placeholder: 'مثال: تويوتا كامري' },
      { key: 'year', label: 'سنة الصنع', type: 'number', min: 1950, max: 2035, hint: 'اختياري' },
      { key: 'vehicles_count', label: 'عدد المركبات', type: 'number', min: 1, max: 10000, showIf: { key: 'party_type', eq: 'entity' }, ready: true, unknownOk: true },
      { key: 'issue', label: 'نوع الخدمة المطلوبة أو وصف العطل', type: 'textarea', required: true },
      { key: 'drivable', label: 'هل المركبة قابلة للحركة؟', type: 'radio', ready: true, options: [o('yes', 'نعم'), o('no', 'لا'), o('unknown', 'غير معلوم')] },
      { key: 'visit_date', label: 'الموعد المفضل للفحص أو التواصل', type: 'date', ready: true, unknownOk: true },
    ],
  },
  {
    id: 'other', label: 'استفسار أو طلب آخر', icon: '💬', active: true, dateField: null,
    desc: 'أي طلب لا يندرج تحت الخدمات الأخرى',
    fields: [
      { key: 'title', label: 'عنوان الطلب', type: 'text', required: true },
      { key: 'description', label: 'وصف الاحتياج', type: 'textarea', required: true },
      { key: 'related', label: 'الخدمة المرتبطة (إن وجدت)', type: 'select', options: [o('subscriptions', 'اشتراكات النقل العام'), o('charter', 'تأجير الحافلات'), o('ads', 'الإعلان على الحافلات'), o('towing', 'الأوناش'), o('workshop', 'الورش'), o('none', 'لا توجد')] },
    ],
  },
];

const OUTCOMES = {
  answered: 'تمت الإجابة عن الاستفسار',
  quote_given: 'تم تقديم عرض سعر وفق إفادة الجهة المختصة',
  service_done: 'تم تنفيذ الخدمة وفق تأكيد موثق',
  not_interested: 'العميل لم يعد راغبًا',
  unreachable: 'تعذر التواصل',
  duplicate: 'طلب مكرر',
  other: 'سبب آخر',
};
const NOTE_REQUIRED_OUTCOMES = ['quote_given', 'service_done', 'other'];

const STATUSES = {
  new: 'جديد',
  needs_info: 'يحتاج استكمال بيانات',
  ready: 'جاهز للإحالة',
  referred: 'تمت الإحالة',
  in_progress: 'قيد المتابعة',
  completed: 'مكتمل',
  closed: 'مغلق',
};
const FINAL_STATUSES = ['completed', 'closed'];

const SOURCES = { qr_booth: 'QR الجناح', kiosk: 'الجهاز اللوحي', staff: 'جهاز الموظف', promo: 'قناة ترويجية', web: 'رابط مباشر' };
const PUBLIC_SOURCES = ['qr_booth', 'kiosk', 'promo', 'web'];

// ---------- مساعدات ----------
const isEmpty = v => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
function visible(field, values) {
  if (!field.showIf) return true;
  const cur = values[field.showIf.key];
  if ('eq' in field.showIf) return cur === field.showIf.eq;
  if ('in' in field.showIf) return field.showIf.in.includes(cur);
  return true;
}

// يتحقق من حقول الخدمة؛ common = القيم المشتركة (للشروط مثل party_type)
function validateServiceFields(service, input, common) {
  const values = {}, errors = {};
  const ctx = { ...common };
  // نمرّر على الحقول بالترتيب؛ شروط الظهور قد تعتمد على حقل سابق
  for (const f of service.fields) {
    if (f.active === false) continue;
    const raw = input ? input[f.key] : undefined;
    // نحسب الظهور بعد تنظيف القيم السابقة
    if (!visible(f, ctx)) continue;
    let v;
    if (raw === UNKNOWN) {
      if (f.unknownOk) { values[f.key] = UNKNOWN; ctx[f.key] = UNKNOWN; if (f.required) errors[f.key] = 'هذا الحقل مطلوب'; continue; }
      errors[f.key] = 'قيمة غير صالحة'; continue;
    }
    switch (f.type) {
      case 'text': v = clean(raw, f.max || 200); break;
      case 'textarea': v = clean(raw, 1500); break;
      case 'number': {
        const s = clean(raw, 12).replace(/,/g, '');
        if (s === '') { v = ''; break; }
        if (!/^\d+$/.test(s)) { errors[f.key] = 'أدخل رقمًا صحيحًا'; continue; }
        const n = parseInt(s, 10);
        if ((f.min != null && n < f.min) || (f.max != null && n > f.max)) { errors[f.key] = `القيمة بين ${f.min ?? 0} و${f.max}`; continue; }
        v = n; break;
      }
      case 'date': v = clean(raw, 10); if (v && !isDate(v)) { errors[f.key] = 'تاريخ غير صحيح'; continue; } break;
      case 'time': v = clean(raw, 5); if (v && !isTime(v)) { errors[f.key] = 'وقت غير صحيح'; continue; } break;
      case 'select': case 'radio': {
        v = clean(raw, 40);
        if (v && !(f.options || []).some(x => x.v === v)) { errors[f.key] = 'اختيار غير صالح'; continue; }
        break;
      }
      case 'multicheck': {
        const arr = Array.isArray(raw) ? raw.map(x => clean(x, 40)) : [];
        v = arr.filter(x => (f.options || []).some(op => op.v === x));
        if (v.length !== arr.length) { errors[f.key] = 'اختيار غير صالح'; continue; }
        break;
      }
      default: v = clean(raw, 200);
    }
    if (f.required && isEmpty(v)) { errors[f.key] = 'هذا الحقل مطلوب'; continue; }
    if (!isEmpty(v)) { values[f.key] = v; ctx[f.key] = v; }
  }
  return { values, errors };
}

// قائمة التحقق الخاصة بالخدمة: الحقول المطلوبة للإحالة والتي ما زالت ناقصة أو «غير محدد»
function computeMissing(service, common, payload) {
  const ctx = { ...common, ...payload };
  const missing = [];
  for (const f of service.fields) {
    if (f.active === false) continue;
    if (!(f.ready || f.required)) continue;
    if (!visible(f, ctx)) continue;
    const v = payload[f.key];
    if (isEmpty(v) || v === UNKNOWN) missing.push({ key: f.key, label: f.label });
  }
  // مشترك: لا يوجد وسيلة تواصل صالحة؟ (البريد مطلوب عند اختياره، ويُتحقق عند الإرسال)
  return missing;
}

// ---------- الحقول المشتركة ----------
function validateCommon(input, { staff = false } = {}) {
  const errors = {}, v = {};
  v.name = clean(input.name, 100);
  if (v.name.length < 2) errors.name = 'أدخل اسم العميل';
  const ph = normalizePhone(input.phone_cc, input.phone);
  if (!ph.ok) errors.phone = ph.error; else { v.phone_cc = ph.cc; v.phone = ph.national; v.phone_e164 = ph.e164; }
  v.pref_channel = clean(input.pref_channel, 20);
  if (!CHANNELS.some(c => c.v === v.pref_channel)) errors.pref_channel = 'اختر وسيلة التواصل المفضلة';
  v.email = clean(input.email, 160).toLowerCase();
  if (v.pref_channel === 'email' && !v.email) errors.email = 'البريد الإلكتروني مطلوب عند اختيار التواصل به';
  else if (v.email && !validEmail(v.email)) errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
  v.party_type = clean(input.party_type, 20);
  if (!PARTY.some(c => c.v === v.party_type)) errors.party_type = 'اختر: فرد أو جهة / شركة';
  v.org_name = v.party_type === 'entity' ? clean(input.org_name, 150) : '';
  if (v.party_type === 'entity' && !v.org_name) errors.org_name = 'أدخل اسم الجهة';
  v.pref_time = clean(input.pref_time, 20);
  if (v.pref_time && v.pref_time !== UNKNOWN && !PREF_TIMES.some(c => c.v === v.pref_time)) errors.pref_time = 'اختيار غير صالح';
  v.notes = clean(input.notes, 1500);
  v.assisted_by = clean(input.assisted_by, 80);
  return { values: v, errors };
}

function validateRequest(services, input, opts) {
  const sid = clean(input.service, 40);
  const service = services.find(s => s.id === sid && s.active !== false);
  if (!service) return { errors: { service: 'اختر الخدمة' } };
  const c = validateCommon(input, opts);
  const f = validateServiceFields(service, input.fields || {}, c.values);
  const errors = { ...c.errors };
  for (const [k, m] of Object.entries(f.errors)) errors['f.' + k] = m;
  return { service, common: c.values, payload: f.values, errors, hasErrors: Object.keys(errors).length > 0 };
}

// ملخص مقروء للطلب (للبطاقة والتصدير)
function summarize(service, payload) {
  const parts = [];
  for (const f of service.fields) {
    const v = payload[f.key];
    if (isEmpty(v)) continue;
    parts.push({ label: f.label, value: displayValue(f, v) });
  }
  return parts;
}
function displayValue(f, v) {
  if (v === UNKNOWN) return UNKNOWN_LABEL;
  if (Array.isArray(v)) return v.map(x => (f.options.find(o2 => o2.v === x) || {}).l || x).join('، ');
  if (f.options) return (f.options.find(o2 => o2.v === v) || {}).l || v;
  return String(v);
}

// يتحقق من صحة تعريف الخدمات عند حفظها من لوحة المدير
function sanitizeServices(list, current) {
  if (!Array.isArray(list)) throw new Error('صيغة غير صحيحة');
  const byId = Object.fromEntries(current.map(s => [s.id, s]));
  return current.map(cur => {
    const upd = list.find(s => s && s.id === cur.id);
    if (!upd) return cur;
    const out = { ...cur, active: upd.active !== false };
    if (typeof upd.label === 'string' && upd.label.trim()) out.label = upd.label.trim().slice(0, 80);
    if (typeof upd.desc === 'string') out.desc = upd.desc.trim().slice(0, 160);
    if (typeof upd.notice === 'string') out.notice = upd.notice.trim().slice(0, 300);
    out.fields = cur.fields.map(f => {
      const uf = (upd.fields || []).find(x => x && x.key === f.key);
      if (!uf) return f;
      const nf = { ...f, active: uf.active !== false };
      if (typeof uf.label === 'string' && uf.label.trim()) nf.label = uf.label.trim().slice(0, 100);
      if (typeof uf.required === 'boolean' && f.type !== 'multicheck') nf.required = uf.required;
      if (typeof uf.ready === 'boolean') nf.ready = uf.ready;
      if (typeof uf.hint === 'string') nf.hint = uf.hint.slice(0, 160);
      if (Array.isArray(uf.options) && f.options) {
        nf.options = f.options.map(op => {
          const uo = uf.options.find(x => x && x.v === op.v);
          return uo && typeof uo.l === 'string' && uo.l.trim() ? { v: op.v, l: uo.l.trim().slice(0, 80) } : op;
        });
      }
      return nf;
    });
    return out;
  });
}

module.exports = { UNKNOWN, UNKNOWN_LABEL, DEFAULT_SERVICES, OUTCOMES, NOTE_REQUIRED_OUTCOMES, STATUSES, FINAL_STATUSES, SOURCES, PUBLIC_SOURCES, PARTY, CHANNELS, PREF_TIMES, validateRequest, validateServiceFields, validateCommon, computeMissing, summarize, displayValue, sanitizeServices, isEmpty };
