'use strict';
const { db, getSettings, getServices } = require('./db');
const S = require('./services');
const { clean, isDate, kuwaitToday, toCsv } = require('./util');
const cfg = require('./config');
const { OFF, listRequests } = require('./requests');

// كل مؤشرات التقرير تستبعد: الطلبات التجريبية والمكررة المصنفة (الأرشفة لا تستبعد)
function summary(q) {
  const s = getSettings();
  const event = clean(q.event, 30) || s.event_code;
  const from = isDate(clean(q.from, 10)) ? clean(q.from, 10) : null;
  const to = isDate(clean(q.to, 10)) ? clean(q.to, 10) : null;
  const p = { event };
  let where = 'is_test=0 AND is_dup=0 AND event_code=@event';
  const dept = /^\d+$/.test(q.dept || '') ? +q.dept : null;
  if (dept) { where += ' AND dept_id=@dept'; p.dept = dept; }
  if (from) { where += ` AND date(received_at, ${OFF}) >= @from`; p.from = from; }
  if (to) { where += ` AND date(received_at, ${OFF}) <= @to`; p.to = to; }
  const one = sql => db.prepare(sql).get(p);
  const many = sql => db.prepare(sql).all(p);
  const total = one(`SELECT COUNT(*) n, COUNT(DISTINCT phone_e164) phones FROM requests WHERE ${where}`);
  const excluded = db.prepare(`SELECT SUM(is_test) tests, SUM(is_dup) dups FROM requests WHERE event_code=@event`).get({ event });
  const deptRows = db.prepare('SELECT id, name FROM departments').all();
  const deptLabel = Object.fromEntries(deptRows.map(d => [d.id, d.name]));
  const today = kuwaitToday(cfg.TZ_OFFSET_HOURS);
  const live = `${where} AND status NOT IN ('completed','closed')`;
  const services = getServices();
  const svcLabel = Object.fromEntries(services.map(x => [x.id, x.label]));
  const group = (col, labels) => many(`SELECT ${col} k, COUNT(*) n FROM requests WHERE ${where} GROUP BY ${col} ORDER BY n DESC`)
    .map(r => ({ key: r.k, label: labels[r.k] || r.k, n: r.n }));
  return {
    event, from, to, dept, dept_name: dept ? deptLabel[dept] || null : null, generated_at: new Date().toISOString(), today,
    totals: {
      requests: total.n, distinct_phones: total.phones,
      excluded_tests: excluded.tests || 0, excluded_duplicates: excluded.dups || 0,
    },
    by_service: group('service', svcLabel),
    by_source: group('source', S.SOURCES),
    by_department: group('dept_id', deptLabel).map(x => ({ ...x, label: x.key ? x.label : 'غير مصنّفة' })),
    by_tag: many(`SELECT tag k, COUNT(*) n FROM requests WHERE ${where} AND tag IS NOT NULL GROUP BY tag ORDER BY n DESC LIMIT 30`).map(r => ({ key: r.k, label: r.k, n: r.n })),
    by_status: group('status', S.STATUSES),
    by_day: many(`SELECT date(received_at, ${OFF}) k, COUNT(*) n FROM requests WHERE ${where} GROUP BY k ORDER BY k`).map(r => ({ key: r.k, label: r.k, n: r.n })),
    completeness: one(`SELECT SUM(missing_count=0) complete, SUM(missing_count>0) incomplete FROM requests WHERE ${where}`),
    contact: one(`SELECT SUM(EXISTS(SELECT 1 FROM contact_log l WHERE l.request_id=requests.id AND l.kind!='note')) contacted,
      SUM(NOT EXISTS(SELECT 1 FROM contact_log l WHERE l.request_id=requests.id AND l.kind!='note')) not_contacted FROM requests WHERE ${where}`),
    followups: db.prepare(`SELECT SUM(follow_up_date=@today) due_today, SUM(follow_up_date<@today) overdue, SUM(follow_up_date IS NULL) no_date FROM requests WHERE ${live}`).get({ ...p, today }),
    outcomes: many(`SELECT outcome k, COUNT(*) n FROM requests WHERE ${where} AND status IN ('completed','closed') GROUP BY outcome ORDER BY n DESC`)
      .map(r => ({ key: r.k, label: S.OUTCOMES[r.k] || r.k || 'بلا نتيجة', n: r.n })),
    referred: one(`SELECT COUNT(*) n FROM requests WHERE ${where} AND referred_to IS NOT NULL AND referred_to!=''`).n,
    definitions: [
      'عدد الطلبات لا يساوي عدد العملاء: قد يقدّم العميل الواحد أكثر من طلب.',
      'عدد العملاء المسجلين (أرقام الهاتف المختلفة) لا يساوي إجمالي زوار الجناح.',
      'الطلبات المسجلة ليست مبيعات ولا حجوزات مؤكدة؛ الإحالة وحدها لا تعني إتمام الخدمة.',
      'تستبعد الأعداد الطلبات التجريبية والمكررة المصنفة.',
    ],
  };
}

const ST = S.STATUSES;
// تقرير جدولي مرن: تجميع حسب بُعد واحد مع مؤشرات العمل
const DIMS = {
  department: { sql: 'r.dept_id', label: 'الإدارة', name: k => (db.prepare('SELECT name FROM departments WHERE id=?').get(k) || {}).name || 'غير مصنّفة' },
  service: { sql: 'r.service', label: 'الخدمة', name: k => (getServices().find(x => x.id === k) || {}).label || k },
  status: { sql: 'r.status', label: 'الحالة', name: k => S.STATUSES[k] || k },
  source: { sql: 'r.source', label: 'المصدر', name: k => S.SOURCES[k] || k },
  assignee: { sql: 'r.assigned_to', label: 'المسؤول', name: k => k ? (db.prepare('SELECT display_name n FROM users WHERE id=?').get(k) || {}).n || '#' + k : 'غير مسند' },
  day: { sql: `date(r.received_at, ${OFF})`, label: 'اليوم', name: k => k },
  tag: { sql: "COALESCE(r.tag,'—')", label: 'الوسم (الجناح / الجهاز)', name: k => k },
  outcome: { sql: "COALESCE(r.outcome,'—')", label: 'نتيجة الإغلاق', name: k => S.OUTCOMES[k] || k },
};
function pivot(q) {
  const dim = DIMS[q.by] ? q.by : 'department';
  const s = getSettings(), event = clean(q.event, 30) || s.event_code, p = { event, today: kuwaitToday(cfg.TZ_OFFSET_HOURS) };
  let where = 'r.is_test=0 AND r.is_dup=0 AND r.event_code=@event';
  const from = clean(q.from, 10), to = clean(q.to, 10);
  if (isDate(from)) { where += ` AND date(r.received_at, ${OFF}) >= @from`; p.from = from; }
  if (isDate(to)) { where += ` AND date(r.received_at, ${OFF}) <= @to`; p.to = to; }
  if (/^\d+$/.test(q.dept || '')) { where += ' AND r.dept_id=@dept'; p.dept = +q.dept; }
  if (q.service) { where += ' AND r.service=@service'; p.service = clean(q.service, 40); }
  const rows = db.prepare(`SELECT ${DIMS[dim].sql} k, COUNT(*) n,
      SUM(r.missing_count=0) complete, SUM(r.missing_count>0) incomplete,
      SUM(EXISTS(SELECT 1 FROM contact_log l WHERE l.request_id=r.id AND l.kind!='note')) contacted,
      SUM(r.status NOT IN ('completed','closed')) open_n, SUM(r.status IN ('completed','closed')) done,
      SUM(r.status='referred') referred,
      SUM(r.status NOT IN ('completed','closed') AND r.follow_up_date < @today) overdue
    FROM requests r WHERE ${where} GROUP BY k ORDER BY ${dim === 'day' ? 'k' : 'n DESC'}`).all(p)
    .map(r => ({ key: r.k, label: DIMS[dim].name(r.k), n: r.n, complete: r.complete || 0, incomplete: r.incomplete || 0, contacted: r.contacted || 0, not_contacted: r.n - (r.contacted || 0), open: r.open_n || 0, done: r.done || 0, referred: r.referred || 0, overdue: r.overdue || 0 }));
  const total = rows.reduce((a, r) => { for (const k of ['n', 'complete', 'incomplete', 'contacted', 'not_contacted', 'open', 'done', 'referred', 'overdue']) a[k] += r[k]; return a; }, { n: 0, complete: 0, incomplete: 0, contacted: 0, not_contacted: 0, open: 0, done: 0, referred: 0, overdue: 0 });
  return { by: dim, by_label: DIMS[dim].label, dims: Object.entries(DIMS).map(([k, v]) => ({ key: k, label: v.label })), rows, total, event };
}
function pivotCsv(q) {
  const r = pivot(q);
  const head = [r.by_label, 'عدد الطلبات', 'مكتملة المعلومات', 'ناقصة المعلومات', 'تمت متابعتها', 'لم يبدأ التواصل', 'مفتوحة', 'منتهية (مكتمل/مغلق)', 'أُحيلت', 'متابعة متأخرة'];
  const rows = [...r.rows, { ...r.total, label: 'الإجمالي' }].map(x => [x.label, x.n, x.complete, x.incomplete, x.contacted, x.not_contacted, x.open, x.done, x.referred, x.overdue]);
  return { csv: toCsv(head, rows), count: rows.length };
}

function requestsCsv(q, user, pii) {
  const { rows, total } = listRequests({ ...q, real: q.real ?? '1', archived: q.archived ?? 'all' }, user, { forExport: true });
  const services = getServices();
  const svcMap = Object.fromEntries(services.map(x => [x.id, x]));
  const kw = iso => new Date(new Date(iso).getTime() + cfg.TZ_OFFSET_HOURS * 3600e3).toISOString().replace('T', ' ').slice(0, 16);
  const head = ['رقم الطلب', 'تاريخ الاستلام (توقيت الكويت)', 'الخدمة', 'الحالة', 'اكتمال المعلومات', 'المعلومات الناقصة', 'المصدر', 'المسؤول عن المتابعة', 'موعد المتابعة', 'الخطوة التالية', 'الجهة المحال إليها', 'النتيجة', 'ملاحظة النتيجة', 'محاولات التواصل', 'تجريبي', 'مكرر', 'مؤرشف', 'ملخص الطلب', 'الإدارة', 'الوسم (جناح/جهاز)'];
  if (pii) head.push('اسم العميل', 'الهاتف', 'وسيلة التواصل المفضلة', 'البريد الإلكتروني', 'نوع العميل', 'اسم الجهة', 'ملاحظات العميل');
  const ch = { call: 'اتصال', whatsapp: 'واتساب', email: 'بريد إلكتروني' };
  const data = rows.map(r => {
    const svc = svcMap[r.service] || { label: r.service, fields: [] };
    const base = [r.ref, kw(r.received_at), svc.label, ST[r.status] || r.status, r.missing_count ? 'ناقصة' : 'مكتملة', r.missing.map(m => m.label).join('، '), S.SOURCES[r.source] || r.source,
      r.assignee_name || '', r.follow_up_date || '', r.next_action || '', r.referred_to || '', r.outcome ? S.OUTCOMES[r.outcome] : '', r.outcome_note || '', r.contacts,
      r.is_test ? 'نعم' : '', r.is_dup ? 'نعم' : '', r.archived ? 'نعم' : '', S.summarize(svc, r.payload).map(x => `${x.label}: ${x.value}`).join(' | '), r.dept_name || '', r.tag || ''];
    if (pii) base.push(r.name, '+' + r.phone_e164, ch[r.pref_channel] || '', r.email || '', r.party_type === 'entity' ? 'جهة/شركة' : 'فرد', r.org_name || '', r.notes || '');
    return base;
  });
  return { csv: toCsv(head, data), count: total };
}

function summaryCsv(sum) {
  const rows = [];
  const add = (sec, list) => list.forEach(x => rows.push([sec, x.label, x.n]));
  rows.push(['إجمالي الطلبات الفعلية', '', sum.totals.requests], ['أرقام هاتف مختلفة (ليست عدد الزوار)', '', sum.totals.distinct_phones], ['مستبعد: تجريبي', '', sum.totals.excluded_tests], ['مستبعد: مكرر', '', sum.totals.excluded_duplicates]);
  add('حسب الخدمة', sum.by_service); add('حسب اليوم', sum.by_day); add('حسب المصدر', sum.by_source); add('حسب الحالة', sum.by_status); add('نتائج الطلبات المغلقة', sum.outcomes);
  rows.push(['اكتمال المعلومات', 'مكتملة', sum.completeness.complete || 0], ['اكتمال المعلومات', 'ناقصة', sum.completeness.incomplete || 0],
    ['التواصل', 'تمت متابعتها', sum.contact.contacted || 0], ['التواصل', 'لم يبدأ التواصل', sum.contact.not_contacted || 0],
    ['المتابعات', 'مستحقة اليوم', sum.followups.due_today || 0], ['المتابعات', 'متأخرة', sum.followups.overdue || 0]);
  return { csv: toCsv(['القسم', 'البند', 'العدد'], rows), count: rows.length };
}

module.exports = { pivot, pivotCsv, summary, requestsCsv, summaryCsv };
