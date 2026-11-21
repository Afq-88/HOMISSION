'use strict';
// اختبارات الخادم الفعلية: قاعدة SQLite مؤقتة + خادم حقيقي على منفذ عشوائي.
const fs = require('fs');
const http = require('node:http');
const os = require('os');
const path = require('path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talabak-'));
process.env.DATA_DIR = tmp; process.env.DB_PATH = path.join(tmp, 't.db'); process.env.BACKUP_DIR = path.join(tmp, 'bk');
process.env.PORT = '0'; process.env.BACKUP_EVERY_HOURS = '0'; process.env.TRUST_PROXY = '1'; process.env.FUNNEL_PUBLIC_ONLY = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { db, setSetting } = require('../server/db');
const { createServer } = require('../server/app');
const U = require('../server/util');
const { runBackup, encryptBuffer, decryptBuffer } = require('../server/backup');
const T = require('../server/totp');
const { verifyAudit } = require('../server/db');

let base;
const server = createServer();
test.before(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const mk = (u, n, role) => db.prepare('INSERT INTO users(username,display_name,role,pass_hash,created_at) VALUES(?,?,?,?,?)').run(u, n, role, U.hashPassword('Passw0rd-test1'), new Date().toISOString());
  mk('boss', 'المدير', 'admin'); mk('sara', 'سارة', 'staff'); mk('omar', 'عمر', 'staff'); mk('boss2', 'مدير ٢', 'admin');
  setSetting('require_2fa', false); // الاختبارات العامة بلا عامل ثانٍ؛ اختبار المصادقة الثنائية يفعّله بنفسه
  setSetting('rate_limit_per_10min', 2000);
});
test.after(() => { server.close(); db.close(); });

const H = { 'content-type': 'application/json', 'x-requested-with': 'talabak' };
let idn = 0; const key = () => 'test-key-' + String(++idn).padStart(8, '0') + 'abcdefgh';
async function call(method, url, body, { cookie, headers } = {}) {
  const res = await fetch(base + url, { method, headers: { ...H, ...(cookie ? { cookie } : {}), ...(headers || {}) }, body: body ? JSON.stringify(body) : undefined });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  return { status: res.status, data, res };
}
const sessions = {};
async function loginAs(u, { reauth = true } = {}) {
  if (reauth && sessions[u]) return sessions[u];
  const r = await call('POST', '/api/auth/login', { username: u, password: 'Passw0rd-test1' });
  assert.equal(r.status, 200);
  const ck = r.res.headers.get('set-cookie').split(';')[0];
  if (reauth) { assert.equal((await call('POST', '/api/auth/reauth', { password: 'Passw0rd-test1' }, { cookie: ck })).status, 200); sessions[u] = ck; }
  return ck;
}
const common = (o = {}) => ({ name: 'عميل تجريبي', phone_cc: '965', phone: '55512345', pref_channel: 'call', party_type: 'individual', ...o });
const submit = (body, k = key()) => call('POST', '/api/public/requests', body, { headers: { 'idempotency-key': k } });

const SAMPLES = {
  subscriptions: { kind: 'new', duration: '3m', from_area: 'حولي', to_area: 'العاصمة' },
  charter: { purpose: 'trip', service_type: 'once', passengers: '40', from_place: 'السالمية', destination: 'الجهراء', trip_date: '2027-01-10', trip_time: '09:00', bus_type: 'vip', direction: 'oneway' },
  ads: { brand: 'علامة تجريبية', ask: 'quote', activity: 'مطاعم', goal: 'awareness', start_date: '2027-02-01', duration: '٣ أشهر', bus_count: '5', materials: 'yes' },
  towing: { vehicle_type: 'سيارة صالون', location: 'قرب المحطة', destination: 'ورشة', state: 'immobile', when_date: '2026-12-01', when_time: '10:00', description: 'عطل' },
  workshop: { vehicle: 'تويوتا كامري', year: '2018', issue: 'صوت في المحرك', drivable: 'yes', visit_date: '2026-12-02' },
  other: { title: 'استفسار', description: 'أريد معلومات' },
};

test('طلب لكل خدمة يُحفظ برقم مرجعي مقروء وبطاقة استلام', async () => {
  let n = 0;
  for (const [service, fields] of Object.entries(SAMPLES)) {
    n++;
    const r = await submit({ ...common({ phone: '5551' + String(1000 + n) }), service, fields });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.match(r.data.receipt.ref, /^KPTC-EX26-\d{6}$/);
    assert.ok(r.data.receipt.confirmation.includes(r.data.receipt.ref));
    assert.ok(r.data.receipt.summary.length > 0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM requests WHERE ref=?').get(r.data.receipt.ref).n, 1);
  }
});

test('الأرقام العربية تُوحَّد عند الحفظ والهاتف يُفحص حسب الدولة', async () => {
  const r = await submit({ ...common({ phone: '٥٥٥٦٦٧٧٨', name: 'أحمد' }), service: 'charter', fields: { ...SAMPLES.charter, passengers: '٤٥', trip_date: '2027-01-11' } });
  assert.equal(r.status, 201);
  const row = db.prepare('SELECT phone, phone_e164, payload FROM requests WHERE ref=?').get(r.data.receipt.ref);
  assert.equal(row.phone, '55566778'); assert.equal(row.phone_e164, '96555566778'); assert.equal(JSON.parse(row.payload).passengers, 45);
  const bad = await submit({ ...common({ phone: '12345' }), service: 'other', fields: SAMPLES.other });
  assert.equal(bad.status, 422); assert.ok(bad.data.fields.phone);
  const sa = await submit({ ...common({ phone_cc: '966', phone: '0501234567' }), service: 'other', fields: SAMPLES.other });
  assert.equal(sa.status, 201);
  const wrong = await submit({ ...common({ phone_cc: '966', phone: '401234567' }), service: 'other', fields: SAMPLES.other });
  assert.equal(wrong.status, 422);
});

test('الحقول الإلزامية المشروطة (البريد/اسم الجهة) والبيانات الناقصة', async () => {
  let r = await submit({ ...common({ pref_channel: 'email' }), service: 'other', fields: SAMPLES.other });
  assert.equal(r.status, 422); assert.ok(r.data.fields.email);
  r = await submit({ ...common({ party_type: 'entity' }), service: 'other', fields: SAMPLES.other });
  assert.equal(r.status, 422); assert.ok(r.data.fields.org_name);
  r = await submit({ ...common(), service: 'charter', fields: { purpose: 'trip', service_type: 'once' } });
  assert.equal(r.status, 422 === r.status ? 201 : r.status, 'العميل غير ملزم بإدخال الموعد والعدد');
  const row = db.prepare('SELECT status, missing_count FROM requests WHERE ref=?').get(r.data.receipt.ref);
  assert.equal(row.status, 'needs_info'); assert.ok(row.missing_count >= 3); assert.equal(r.data.receipt.incomplete, true);
  // «غير محدد حاليًا»
  r = await submit({ ...common({ phone: '55500011' }), service: 'charter', fields: { purpose: 'trip', service_type: 'once', passengers: '__unknown__', trip_date: '__unknown__', destination: '__unknown__' } });
  assert.equal(r.status, 201);
  r = await submit({ ...common(), service: 'ads', fields: { brand: 'x' } });
  assert.equal(r.status, 422); assert.ok(r.data.fields['f.ask']);
});

test('الضغط المتكرر: نفس مفتاح الإرسال لا ينشئ إلا طلبًا واحدًا', async () => {
  const k = key(), body = { ...common({ phone: '55599001' }), service: 'other', fields: SAMPLES.other };
  const rs = await Promise.all(Array.from({ length: 8 }, () => submit(body, k)));
  const refs = new Set(rs.map(r => r.data.receipt.ref));
  assert.equal(refs.size, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM requests WHERE idem_key=?').get(k).n, 1);
  assert.ok(rs.some(r => r.status === 201)); assert.ok(rs.every(r => [200, 201].includes(r.status)));
  assert.equal((await submit(body, 'short')).status, 400);
});

test('تسجيل طلبات متزامنة من أجهزة مختلفة: أرقام فريدة بلا تكرار', async () => {
  const rs = await Promise.all(Array.from({ length: 40 }, (_, i) => submit({ ...common({ phone: '5560' + String(1000 + i) }), service: 'other', fields: SAMPLES.other })));
  assert.ok(rs.every(r => r.status === 201));
  assert.equal(new Set(rs.map(r => r.data.receipt.ref)).size, 40);
});

test('الزائر لا يصل إلى أي بيانات أو واجهة إدارة', async () => {
  for (const [m, u] of [['GET', '/api/staff/requests'], ['GET', '/api/staff/requests/1'], ['GET', '/api/admin/users'], ['GET', '/api/admin/reports/summary'], ['GET', '/api/admin/export/requests.csv'], ['GET', '/api/staff/config']]) {
    assert.equal((await call(m, u)).status, 401, u);
  }
  assert.equal((await call('GET', '/api/public/requests/1')).status, 404);
  const cfgRes = await call('GET', '/api/public/config');
  assert.equal(cfgRes.status, 200);
  assert.ok(!JSON.stringify(cfgRes.data).includes('pass_hash'));
  // حماية CSRF: بدون الترويسة يُرفض
  const noHdr = await fetch(base + '/api/public/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(noHdr.status, 403);
});

test('تسجيل الدخول: كلمة مرور خاطئة تُرفض ثم يُقفل بعد محاولات متكررة', async () => {
  for (let i = 0; i < 6; i++) assert.equal((await call('POST', '/api/auth/login', { username: 'omar', password: 'wrong' + i })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { username: 'omar', password: 'Passw0rd-test1' })).status, 429);
});

test('صلاحيات الموظف والمدير', async () => {
  const sara = await loginAs('sara'), boss = await loginAs('boss');
  const mk = async (phone) => (await submit({ ...common({ phone }), service: 'workshop', fields: SAMPLES.workshop })).data.receipt.ref;
  const ref1 = await mk('55530001'), ref2 = await mk('55530002');
  const id = ref => db.prepare('SELECT id FROM requests WHERE ref=?').get(ref).id;
  // المدير يسند الطلب الأول لسارة والثاني لعمر
  const saraId = db.prepare("SELECT id FROM users WHERE username='sara'").get().id, omarId = db.prepare("SELECT id FROM users WHERE username='omar'").get().id;
  assert.equal((await call('PATCH', `/api/staff/requests/${id(ref1)}`, { assigned_to: saraId }, { cookie: boss })).status, 200);
  assert.equal((await call('PATCH', `/api/staff/requests/${id(ref2)}`, { assigned_to: omarId }, { cookie: boss })).status, 200);
  // سارة ترى طلبها لا طلب عمر
  assert.equal((await call('GET', `/api/staff/requests/${id(ref1)}`, null, { cookie: sara })).status, 200);
  assert.equal((await call('GET', `/api/staff/requests/${id(ref2)}`, null, { cookie: sara })).status, 403);
  assert.equal((await call('PATCH', `/api/staff/requests/${id(ref2)}`, { status: 'in_progress' }, { cookie: sara })).status, 403);
  const list = await call('GET', '/api/staff/requests?size=200', null, { cookie: sara });
  assert.ok(list.data.rows.every(r => r.assigned_to === null || r.assigned_to === saraId));
  // لا تصدير ولا حذف ولا إدارة للموظف
  for (const [m, u] of [['GET', '/api/admin/export/requests.csv'], ['GET', '/api/admin/users'], ['DELETE', `/api/admin/requests/${id(ref1)}`], ['PUT', '/api/admin/settings'], ['GET', '/api/admin/reports/summary'], ['POST', '/api/admin/backups']]) {
    assert.equal((await call(m, u, m === 'GET' ? null : {}, { cookie: sara })).status, 403, u);
  }
  // الموظف لا يستطيع إسناد الطلب لغيره ولا أرشفته
  assert.equal((await call('PATCH', `/api/staff/requests/${id(ref1)}`, { assigned_to: omarId }, { cookie: sara })).status, 403);
  assert.equal((await call('PATCH', `/api/staff/requests/${id(ref1)}`, { archived: true }, { cookie: sara })).status, 403);
  // الإغلاق يتطلب نتيجة؛ الإحالة تتطلب الجهة
  let r = await call('PATCH', `/api/staff/requests/${id(ref1)}`, { status: 'closed' }, { cookie: sara });
  assert.equal(r.status, 422);
  r = await call('PATCH', `/api/staff/requests/${id(ref1)}`, { status: 'referred' }, { cookie: sara });
  assert.equal(r.status, 422);
  r = await call('PATCH', `/api/staff/requests/${id(ref1)}`, { status: 'referred', referred_to: 'إدارة الورش', next_action: 'متابعة الفحص', follow_up_date: '2026-12-05' }, { cookie: sara });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'referred'); assert.ok(r.data.referred_at);
  r = await call('PATCH', `/api/staff/requests/${id(ref1)}`, { status: 'completed', outcome: 'service_done' }, { cookie: sara });
  assert.equal(r.status, 422, 'نتيجة «تم التنفيذ» تتطلب توثيقًا');
  r = await call('PATCH', `/api/staff/requests/${id(ref1)}`, { status: 'completed', outcome: 'service_done', outcome_note: 'تأكيد الورشة بالبريد' }, { cookie: sara });
  assert.equal(r.status, 200); assert.equal(r.data.outcome, 'service_done');
  // سجل التواصل والتغييرات
  r = await call('POST', `/api/staff/requests/${id(ref1)}/contacts`, { kind: 'call', summary: 'تم الاتصال وتأكيد الموعد' }, { cookie: sara });
  assert.equal(r.status, 200); assert.equal(r.data.contacts_log[0].staff, 'سارة'); assert.ok(r.data.history.length >= 3);
  // الرسالة مجهزة فقط
  r = await call('GET', `/api/staff/requests/${id(ref1)}/message`, null, { cookie: sara });
  assert.equal(r.data.sent, false); assert.ok(r.data.text.includes(ref1)); assert.equal(r.data.whatsapp_url, null);
  // الموظف يسجل طلبًا نيابة عن الزائر
  r = await call('POST', '/api/staff/requests', { ...common({ phone: '55530009' }), service: 'towing', fields: SAMPLES.towing }, { cookie: sara, headers: { 'idempotency-key': key() } });
  assert.equal(r.status, 201);
  const row = db.prepare('SELECT source, created_by, assisted_by FROM requests WHERE ref=?').get(r.data.receipt.ref);
  assert.equal(row.source, 'staff'); assert.equal(row.created_by, saraId); assert.equal(row.assisted_by, 'سارة');
  // الحذف: المدير فقط وبعد الأرشفة
  assert.equal((await call('DELETE', `/api/admin/requests/${id(ref1)}`, null, { cookie: boss })).status, 409);
  assert.equal((await call('PATCH', `/api/staff/requests/${id(ref1)}`, { archived: true }, { cookie: boss })).status, 200);
  assert.equal((await call('DELETE', `/api/admin/requests/${id(ref1)}`, null, { cookie: boss })).status, 200);
});

test('اكتشاف المكرر دون دمج تلقائي، ومعالجته للمدير فقط', async () => {
  const body = { ...common({ phone: '55540001' }), service: 'ads', fields: SAMPLES.ads };
  const a = (await submit(body)).data.receipt.ref, b = (await submit(body)).data.receipt.ref;
  const ra = db.prepare('SELECT * FROM requests WHERE ref=?').get(a), rb = db.prepare('SELECT * FROM requests WHERE ref=?').get(b);
  assert.equal(ra.dup_of, null); assert.equal(rb.dup_of, ra.id); assert.equal(rb.is_dup, 0, 'لا دمج تلقائي');
  const boss = await loginAs('boss'), sara = await loginAs('sara');
  const g = await call('GET', '/api/admin/duplicates', null, { cookie: boss });
  assert.ok(g.data.groups.some(x => x.requests.length >= 2 && x.phone_e164 === '96555540001'));
  assert.equal((await call('PATCH', `/api/staff/requests/${rb.id}`, { is_dup: true }, { cookie: sara })).status, 403);
  const r = await call('PATCH', `/api/staff/requests/${rb.id}`, { is_dup: true }, { cookie: boss });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'closed'); assert.equal(r.data.outcome, 'duplicate');
  // طلب آخر مشروع بخدمة أخرى لنفس الهاتف لا يُعد مكررًا
  const c = (await submit({ ...common({ phone: '55540001' }), service: 'other', fields: SAMPLES.other })).data.receipt.ref;
  assert.equal(db.prepare('SELECT dup_of FROM requests WHERE ref=?').get(c).dup_of, null);
});

test('التقارير تستبعد المكرر والتجريبي، والتصدير يطابق السجل', async () => {
  const boss = await loginAs('boss');
  const real = db.prepare('SELECT COUNT(*) n FROM requests WHERE is_test=0 AND is_dup=0').get().n;
  const sum = (await call('GET', '/api/admin/reports/summary', null, { cookie: boss })).data;
  assert.equal(sum.totals.requests, real);
  assert.equal(sum.by_service.reduce((a, x) => a + x.n, 0), real);
  assert.equal(sum.by_status.reduce((a, x) => a + x.n, 0), real);
  assert.equal(sum.by_source.reduce((a, x) => a + x.n, 0), real);
  assert.equal(sum.by_day.reduce((a, x) => a + x.n, 0), real);
  assert.ok(sum.totals.excluded_duplicates >= 1);
  const list = (await call('GET', '/api/admin/export/requests.csv?real=1', null, { cookie: boss }));
  const lst = (await call('GET', '/api/staff/requests?real=1&archived=all&size=200', null, { cookie: boss })).data;
  assert.equal(+list.res.headers.get('x-row-count'), lst.total);
  const rows = list.data.replace(/^﻿/, '').trim().split('\r\n').length - 1;
  assert.ok(rows >= lst.total, 'CSV يحوي كل الأسطر (قد يمتد الملخص لأسطر متعددة)');
  assert.ok(!list.data.includes('55540001') && !list.data.includes('عميل تجريبي'), 'التصدير الافتراضي بلا بيانات تواصل');
  const pii = await call('GET', '/api/admin/export/requests.csv?real=1&pii=1', null, { cookie: boss });
  assert.ok(pii.data.includes('+96555540001'));
  assert.ok(db.prepare("SELECT COUNT(*) n FROM audit WHERE action='export'").get().n >= 2, 'التصدير مسجَّل');
  const s = await call('GET', '/api/admin/export/summary.csv', null, { cookie: boss }); assert.equal(s.status, 200);
});

test('حماية CSV من حقن الصيغ', () => {
  const csv = U.toCsv(['a'], [['=HYPERLINK("x")'], ['+1'], ['عادي']]);
  assert.ok(csv.includes("'=HYPERLINK") && csv.includes("'+1"));
});

test('إنشاء المستخدمين بكلمة مؤقتة وتغييرها إلزاميًا', async () => {
  const boss = await loginAs('boss');
  const r = await call('POST', '/api/admin/users', { username: 'new.staff', display_name: 'موظف جديد', role: 'staff' }, { cookie: boss });
  assert.equal(r.status, 201); assert.ok(r.data.temp_password.length >= 12);
  const lg = await call('POST', '/api/auth/login', { username: 'new.staff', password: r.data.temp_password });
  assert.equal(lg.status, 200); assert.equal(lg.data.user.must_change, true);
  const ck = lg.res.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('GET', '/api/staff/requests', null, { cookie: ck })).status, 403);
  assert.equal((await call('POST', '/api/auth/password', { current: r.data.temp_password, next: 'short' }, { cookie: ck })).status, 422);
  assert.equal((await call('POST', '/api/auth/password', { current: r.data.temp_password, next: 'NewSecret-2026x' }, { cookie: ck })).status, 200);
  assert.equal((await call('GET', '/api/staff/requests', null, { cookie: ck })).status, 200);
  // لا يمكن تعطيل آخر مدير
  const bossId = db.prepare("SELECT id FROM users WHERE username='boss'").get().id;
  assert.equal((await call('PATCH', `/api/admin/users/${bossId}`, { active: false }, { cookie: boss })).status, 409);
  assert.ok(!db.prepare('SELECT pass_hash FROM users WHERE username=?').get('new.staff').pass_hash.includes('NewSecret'));
});

test('إيقاف الاستقبال عند إقفال الفعالية، وعدم إظهار رقم طارئ غير مزوَّد', async () => {
  const boss = await loginAs('boss');
  const cfgRes = (await call('GET', '/api/public/config')).data;
  assert.equal(cfgRes.emergency_number, '');
  await call('PUT', '/api/admin/settings', { accepting: false }, { cookie: boss });
  assert.equal((await submit({ ...common(), service: 'other', fields: SAMPLES.other })).status, 403);
  await call('PUT', '/api/admin/settings', { accepting: true }, { cookie: boss });
  assert.equal((await submit({ ...common({ phone: '55588881' }), service: 'other', fields: SAMPLES.other })).status, 201);
  const bad = await call('PUT', '/api/admin/settings', { event_code: 'bad code!' }, { cookie: boss });
  assert.equal(bad.status, 422);
});

test('النسخ الاحتياطي والاستعادة: النسخة سليمة وتحوي نفس الطلبات', async () => {
  const boss = await loginAs('boss');
  const b = await call('POST', '/api/admin/backups', {}, { cookie: boss });
  assert.equal(b.status, 201);
  const file = path.join(process.env.BACKUP_DIR, b.data.file);
  const copy = new DatabaseSync(file, { readOnly: true });
  assert.equal(Object.values(copy.prepare('PRAGMA integrity_check').get())[0], 'ok');
  assert.equal(copy.prepare('SELECT COUNT(*) n FROM requests').get().n, db.prepare('SELECT COUNT(*) n FROM requests').get().n);
  copy.close();
  const b2 = runBackup('x'); assert.ok(b2.file);
  // محاكاة الاستعادة: نسخ الملف ثم فتحه
  const restored = path.join(tmp, 'restored.db'); fs.copyFileSync(file, restored);
  const r = new DatabaseSync(restored);
  assert.ok(r.prepare('SELECT COUNT(*) n FROM requests').get().n > 50); r.close();
});

test('مسارات الملفات الثابتة لا تسمح بالخروج من المجلد', async () => {
  const r = await fetch(base + '/..%2f..%2fserver%2fconfig.js'); assert.notEqual(r.status, 200);
  const r2 = await fetch(base + '/server/config.js'); assert.equal(r2.status, 404);
});

// ================= الإصدار الثاني: الإدارات، التحكم عن بعد، المباشر، المندوبون =================
test('الإدارات: تُسنَد تلقائيًا من الخدمة، وتُصنَّف التقارير بها، وتُعدَّل يدويًا', async () => {
  const boss = await loginAs('boss');
  const depts = (await call('GET', '/api/admin/departments', null, { cookie: boss })).data.departments;
  assert.ok(depts.length >= 5);
  const r = await submit({ ...common({ phone: '55570001' }), service: 'towing', fields: SAMPLES.towing });
  const row = db.prepare('SELECT id, dept_id FROM requests WHERE ref=?').get(r.data.receipt.ref);
  assert.equal(depts.find(d => d.id === row.dept_id).name, 'إدارة الأوناش');
  const other = depts.find(d => d.name === 'التسويق والعلاقات العامة');
  const up = await call('PATCH', `/api/staff/requests/${row.id}`, { dept_id: other.id }, { cookie: boss });
  assert.equal(up.data.dept_name, 'التسويق والعلاقات العامة');
  const piv = (await call('GET', '/api/admin/reports/pivot?by=department', null, { cookie: boss })).data;
  const real = db.prepare('SELECT COUNT(*) n FROM requests WHERE is_test=0 AND is_dup=0').get().n;
  assert.equal(piv.total.n, real); assert.equal(piv.rows.reduce((a, x) => a + x.n, 0), real);
  for (const by of ['service', 'status', 'source', 'assignee', 'day', 'tag', 'outcome']) assert.equal((await call('GET', '/api/admin/reports/pivot?by=' + by, null, { cookie: boss })).data.total.n, real, by);
  const sum = (await call('GET', `/api/admin/reports/summary?dept=${other.id}`, null, { cookie: boss })).data;
  assert.equal(sum.totals.requests, db.prepare('SELECT COUNT(*) n FROM requests WHERE is_test=0 AND is_dup=0 AND dept_id=?').get(other.id).n);
  const csv = await call('GET', '/api/admin/export/pivot.csv?by=department', null, { cookie: boss }); assert.equal(csv.status, 200);
  const lst = (await call('GET', `/api/staff/requests?dept=${other.id}&size=200`, null, { cookie: boss })).data;
  assert.ok(lst.rows.every(x => x.dept_id === other.id));
  const sara = await loginAs('sara');
  assert.equal((await call('POST', '/api/admin/departments', { name: 'س' }, { cookie: sara })).status, 403);
  assert.equal((await call('GET', '/api/admin/reports/pivot', null, { cookie: sara })).status, 403);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM requests WHERE dept_id IS NULL').get().n, 0, 'كل طلب مصنَّف إلى إدارة');
  const piv0 = (await call('GET', '/api/admin/reports/pivot?by=department', null, { cookie: boss })).data;
  assert.ok(piv0.rows.every(r => Object.values(r).every(v => v !== null)), 'لا قيم null في التقرير');
  const nd = await call('POST', '/api/admin/departments', { name: 'إدارة جديدة', color: '#112233' }, { cookie: boss }); assert.equal(nd.status, 201);
  assert.equal((await call('DELETE', `/api/admin/departments/${other.id}`, null, { cookie: boss })).status, 409, 'لا تُحذف إدارة مستخدمة');
  assert.equal((await call('DELETE', `/api/admin/departments/${nd.data.id}`, null, { cookie: boss })).status, 200);
});

test('موظف مرتبط بإدارة يرى غير المسند لإدارته فقط', async () => {
  const boss = await loginAs('boss');
  const depts = (await call('GET', '/api/admin/departments', null, { cookie: boss })).data.departments;
  const tow = depts.find(d => d.name === 'إدارة الأوناش'), ws = depts.find(d => d.name === 'إدارة الورش');
  const mk = db.prepare('INSERT INTO users(username,display_name,role,pass_hash,created_at,dept_id) VALUES(?,?,?,?,?,?)');
  mk.run('tow1', 'موظف أوناش', 'staff', U.hashPassword('Passw0rd-test1'), new Date().toISOString(), tow.id);
  const t1 = await loginAs('tow1');
  const a = (await submit({ ...common({ phone: '55571001' }), service: 'towing', fields: SAMPLES.towing })).data.receipt.ref;
  const b = (await submit({ ...common({ phone: '55571002' }), service: 'workshop', fields: SAMPLES.workshop })).data.receipt.ref;
  const ids = Object.fromEntries([a, b].map(x => [x, db.prepare('SELECT id FROM requests WHERE ref=?').get(x).id]));
  assert.equal((await call('GET', `/api/staff/requests/${ids[a]}`, null, { cookie: t1 })).status, 200);
  assert.equal((await call('GET', `/api/staff/requests/${ids[b]}`, null, { cookie: t1 })).status, 403);
  assert.ok(!(await call('GET', '/api/staff/requests?size=200', null, { cookie: t1 })).data.rows.some(r => r.dept_id === ws.id && !r.assigned_to));
});

test('المباشر: الطلب الجديد يظهر لحظيًا عبر /live دون تسريب لغير المخوّل', async () => {
  const boss = await loginAs('boss');
  const init = (await call('GET', '/api/staff/live', null, { cookie: boss })).data;
  assert.deepEqual(init.items, []);
  const r = await submit({ ...common({ phone: '55572001' }), service: 'subscriptions', fields: SAMPLES.subscriptions });
  const live = (await call('GET', `/api/staff/live?since=${init.latest}`, null, { cookie: boss })).data;
  assert.equal(live.items.length, 1); assert.equal(live.items[0].ref, r.data.receipt.ref); assert.ok(live.stats && live.kiosks);
  assert.equal((await call('GET', '/api/staff/live')).status, 401);
});

test('أجهزة الجناح: نبض، تسجيل تلقائي، وأوامر تحكم عن بعد (إيقاف/تعليم/مسح/تحديث)', async () => {
  const boss = await loginAs('boss'), sara = await loginAs('sara');
  const dev = 'dev-' + 'a1b2c3d4e5f6';
  const ping = (extra = {}) => call('POST', '/api/public/kiosk/ping', { device: dev, screen: 'welcome', ...extra });
  let p = await ping(); assert.equal(p.status, 200); assert.equal(p.data.paused, false);
  assert.equal((await call('POST', '/api/public/kiosk/ping', { device: 'x' })).status, 400);
  const list = (await call('GET', '/api/admin/kiosks', null, { cookie: boss })).data.kiosks;
  assert.ok(list.find(k => k.id === dev && k.online));
  assert.equal((await call('GET', '/api/admin/kiosks', null, { cookie: sara })).status, 403);
  assert.equal((await call('POST', `/api/admin/kiosks/${dev}`, { action: 'reset' }, { cookie: sara })).status, 403);
  await call('POST', `/api/admin/kiosks/${dev}`, { action: 'rename', name: 'لوحي المدخل' }, { cookie: boss });
  await call('POST', `/api/admin/kiosks/${dev}`, { action: 'reset' }, { cookie: boss });
  await call('POST', `/api/admin/kiosks/${dev}`, { action: 'banner', message: 'مرحبًا بكم' }, { cookie: boss });
  p = await ping(); assert.deepEqual(p.data.commands, ['reset']); assert.equal(p.data.banner, 'مرحبًا بكم'); assert.equal(p.data.name, 'لوحي المدخل');
  p = await ping(); assert.deepEqual(p.data.commands, [], 'الأمر يُنفَّذ مرة واحدة');
  await call('POST', `/api/admin/kiosks/${dev}`, { action: 'pause', message: 'صيانة' }, { cookie: boss });
  p = await ping(); assert.equal(p.data.paused, true); assert.equal(p.data.pause_msg, 'صيانة');
  await call('POST', `/api/admin/kiosks/${dev}`, { action: 'resume' }, { cookie: boss });
  assert.equal((await ping()).data.paused, false);
  // طلب من الجهاز يحمل وسم الجهاز ويُحتسب له
  const r = await call('POST', '/api/public/requests', { ...common({ phone: '55573001' }), service: 'other', fields: SAMPLES.other, source: 'kiosk', tag: dev }, { headers: { 'idempotency-key': key() } });
  assert.equal(r.status, 201);
  assert.equal((await call('GET', '/api/admin/kiosks', null, { cookie: boss })).data.kiosks.find(k => k.id === dev).requests, 1);
});

test('رابط المندوب الميداني يُسند الطلب له تلقائيًا ويُميَّز مصدره', async () => {
  const boss = await loginAs('boss');
  const omar = db.prepare("SELECT id, ref_code FROM users WHERE username='omar'").get();
  assert.ok(omar.ref_code, 'تُولَّد رموز المندوبين تلقائيًا');
  const r = await call('POST', '/api/public/requests', { ...common({ phone: '55574001' }), service: 'other', fields: SAMPLES.other, source: 'web', rep: omar.ref_code, tag: 'visit1' }, { headers: { 'idempotency-key': key() } });
  const row = db.prepare('SELECT source, assigned_to, tag FROM requests WHERE ref=?').get(r.data.receipt.ref);
  assert.equal(row.source, 'rep'); assert.equal(row.assigned_to, omar.id); assert.equal(row.tag, 'visit1');
  const bad = await call('POST', '/api/public/requests', { ...common({ phone: '55574002' }), service: 'other', fields: SAMPLES.other, rep: 'nonexistent' }, { headers: { 'idempotency-key': key() } });
  assert.equal(db.prepare('SELECT source, assigned_to FROM requests WHERE ref=?').get(bad.data.receipt.ref).assigned_to, null);
  // بلا ادّعاء مصدر «rep» من العميل
  const fake = await call('POST', '/api/public/requests', { ...common({ phone: '55574003' }), service: 'other', fields: SAMPLES.other, source: 'rep' }, { headers: { 'idempotency-key': key() } });
  assert.equal(db.prepare('SELECT source FROM requests WHERE ref=?').get(fake.data.receipt.ref).source, 'web');
  const rg = await call('POST', `/api/admin/users/${omar.id}/refcode`, {}, { cookie: boss }); assert.notEqual(rg.data.ref_code, omar.ref_code);
});

test('تنزيل النسخة الاحتياطية: للمدير فقط، بمسار آمن، ومسجَّل', async () => {
  const boss = await loginAs('boss'), sara = await loginAs('sara');
  const b = (await call('POST', '/api/admin/backups', {}, { cookie: boss })).data;
  const ok = await fetch(`${base}/api/admin/backups/${b.file}/download`, { headers: { cookie: boss } });
  assert.equal(ok.status, 200);
  const head = Buffer.from(await ok.arrayBuffer()).subarray(0, 15).toString();
  assert.equal(head, 'SQLite format 3');
  assert.equal((await fetch(`${base}/api/admin/backups/${b.file}/download`, { headers: { cookie: sara } })).status, 403);
  assert.equal((await fetch(`${base}/api/admin/backups/${b.file}/download`)).status, 401);
  assert.ok([400, 404].includes((await fetch(`${base}/api/admin/backups/..%2f..%2fetc%2fpasswd/download`, { headers: { cookie: boss } })).status));
  assert.equal((await fetch(`${base}/api/admin/backups/evil.db/download`, { headers: { cookie: boss } })).status, 400);
  assert.ok(db.prepare("SELECT COUNT(*) n FROM audit WHERE action='backup_download'").get().n >= 1);
});


// ================= الأمان المشدَّد =================
test('المصادقة الثنائية: إلزامية، إعداد، دخول برمز، منع إعادة استخدام الرمز، رموز الاسترداد', async () => {
  db.prepare('INSERT INTO users(username,display_name,role,pass_hash,created_at) VALUES(?,?,?,?,?)').run('tf1', 'موظف ٢FA', 'staff', U.hashPassword('Passw0rd-test1'), new Date().toISOString());
  setSetting('require_2fa', true);
  try {
    const lg = await call('POST', '/api/auth/login', { username: 'tf1', password: 'Passw0rd-test1' });
    assert.equal(lg.status, 200); assert.equal(lg.data.user.needs_2fa, true);
    const ck = lg.res.headers.get('set-cookie').split(';')[0];
    const blocked = await call('GET', '/api/staff/requests', null, { cookie: ck });
    assert.equal(blocked.status, 403); assert.equal(blocked.data.setup_2fa, true);
    const st = await call('POST', '/api/auth/totp/setup', {}, { cookie: ck });
    assert.match(st.data.secret, /^[A-Z2-7]{32}$/); assert.ok(st.data.uri.startsWith('otpauth://totp/'));
    assert.ok(!db.prepare('SELECT totp_secret FROM users WHERE username=?').get('tf1').totp_secret.includes(st.data.secret), 'السر مشفّر داخل القاعدة');
    assert.equal((await call('POST', '/api/auth/totp/enable', { code: '000000' }, { cookie: ck })).status, 422);
    const en = await call('POST', '/api/auth/totp/enable', { code: T.hotp(st.data.secret, T.stepNow()) }, { cookie: ck });
    assert.equal(en.status, 200); assert.equal(en.data.recovery.length, 8);
    assert.equal((await call('GET', '/api/staff/requests', null, { cookie: ck })).status, 200);
    assert.ok(!db.prepare('SELECT recovery FROM users WHERE username=?').get('tf1').recovery.includes(en.data.recovery[0]), 'رموز الاسترداد مجزّأة');
    // الدخول التالي يتطلب الرمز
    const nocode = await call('POST', '/api/auth/login', { username: 'tf1', password: 'Passw0rd-test1' });
    assert.equal(nocode.status, 401); assert.equal(nocode.data.need_code, true);
    assert.equal((await call('POST', '/api/auth/login', { username: 'tf1', password: 'Passw0rd-test1', code: '123456' })).status, 401);
    const nextStep = T.hotp(st.data.secret, T.stepNow() + 1);
    const ok = await call('POST', '/api/auth/login', { username: 'tf1', password: 'Passw0rd-test1', code: nextStep });
    assert.equal(ok.status, 200);
    assert.equal((await call('POST', '/api/auth/login', { username: 'tf1', password: 'Passw0rd-test1', code: nextStep })).status, 401, 'الرمز لا يُستخدم مرتين');
    // رمز استرداد: يعمل مرة واحدة (مستخدم آخر لتفادي حد المحاولات)
    db.prepare('INSERT INTO users(username,display_name,role,pass_hash,created_at) VALUES(?,?,?,?,?)').run('tf2', 'موظف ٢FA-ب', 'staff', U.hashPassword('Passw0rd-test1'), new Date().toISOString());
    const l2 = await call('POST', '/api/auth/login', { username: 'tf2', password: 'Passw0rd-test1' }); const c2 = l2.res.headers.get('set-cookie').split(';')[0];
    const s2 = await call('POST', '/api/auth/totp/setup', {}, { cookie: c2 });
    const e2 = await call('POST', '/api/auth/totp/enable', { code: T.hotp(s2.data.secret, T.stepNow()) }, { cookie: c2 });
    const rc = e2.data.recovery[0];
    assert.equal((await call('POST', '/api/auth/login', { username: 'tf2', password: 'Passw0rd-test1', code: rc })).status, 200);
    assert.equal((await call('POST', '/api/auth/login', { username: 'tf2', password: 'Passw0rd-test1', code: rc })).status, 401, 'رمز الاسترداد يُستهلك');
    // المدير (بلا TOTP في هذا الاختبار) يعيد تعيينها؛ نُوقف الإلزام مؤقتًا لأنه نفسه بلا عامل ثانٍ
    setSetting('require_2fa', false);
    const boss = await loginAs('boss');
    assert.equal((await call('POST', `/api/admin/users/${db.prepare("SELECT id FROM users WHERE username='tf2'").get().id}/reset-2fa`, {}, { cookie: boss })).status, 200);
    assert.equal(db.prepare("SELECT totp_enabled FROM users WHERE username='tf2'").get().totp_enabled, 0);
  } finally { setSetting('require_2fa', false); }
});

test('الإجراءات الحساسة تتطلب إعادة تأكيد كلمة المرور (وتنتهي بعد ٥ دقائق)', async () => {
  const b = await loginAs('boss2', { reauth: false });
  const need = async (m, u, body) => { const r = await call(m, u, body, { cookie: b }); assert.equal(r.status, 403, u); assert.equal(r.data.reauth, true, u); };
  await need('GET', '/api/admin/export/requests.csv?pii=1');
  await need('POST', '/api/admin/users', { username: 'x.y', display_name: 'اختبار', role: 'staff' });
  await need('PUT', '/api/admin/settings', { accepting: true });
  await need('POST', '/api/admin/retention', { delete: true, dryRun: false });
  await need('POST', '/api/admin/anonymize', { dryRun: false });
  const bk = (await call('POST', '/api/admin/backups', {}, { cookie: b })).data; // إنشاء نسخة لا يحتاج، التنزيل يحتاج
  assert.equal((await fetch(`${base}/api/admin/backups/${bk.file}/download`, { headers: { cookie: b } })).status, 403);
  // التصدير بلا بيانات تواصل وقراءة التقارير لا تحتاج reauth
  assert.equal((await call('GET', '/api/admin/export/requests.csv', null, { cookie: b })).status, 200);
  assert.equal((await call('POST', '/api/auth/reauth', { password: 'wrong-password-1' }, { cookie: b })).status, 401);
  assert.equal((await call('POST', '/api/auth/reauth', { password: 'Passw0rd-test1' }, { cookie: b })).status, 200);
  assert.equal((await call('GET', '/api/admin/export/requests.csv?pii=1', null, { cookie: b })).status, 200);
  // انتهاء الصلاحية
  db.prepare("UPDATE sessions SET reauth_until=? WHERE reauth_until IS NOT NULL").run(new Date(Date.now() - 1000).toISOString());
  await need('GET', '/api/admin/export/requests.csv?pii=1');
  sessions['boss'] = undefined; sessions['sara'] = undefined; sessions['omar'] = undefined; // الجلسات المخزَّنة فقدت reauth
});

test('النسخ الاحتياطي المشفَّر: لا يُقرأ بدون العبارة، ويكشف أي تعديل', () => {
  const plain = Buffer.from('SQLite format 3\0 بيانات عملاء سرية');
  const enc = encryptBuffer(plain, 'عبارة-قوية-123');
  assert.ok(!enc.includes('SQLite format 3') && !enc.includes(Buffer.from('بيانات عملاء')));
  assert.deepEqual(decryptBuffer(enc, 'عبارة-قوية-123'), plain);
  assert.throws(() => decryptBuffer(enc, 'خاطئة'), /العبارة خاطئة/);
  const bad = Buffer.from(enc); bad[bad.length - 3] ^= 1;
  assert.throws(() => decryptBuffer(bad, 'عبارة-قوية-123'), /تالف|خاطئة/);
  const r = runBackup('enc', 'test-pass-123456');
  assert.ok(r.file.endsWith('.db.enc') && r.encrypted);
  const raw = fs.readFileSync(path.join(process.env.BACKUP_DIR, r.file));
  assert.ok(!raw.subarray(0, 64).includes('SQLite format 3'));
  assert.equal(decryptBuffer(raw, 'test-pass-123456').subarray(0, 15).toString(), 'SQLite format 3');
  assert.equal(fs.statSync(path.join(process.env.BACKUP_DIR, r.file)).mode & 0o077, 0, 'صلاحيات الملف للمالك فقط');
});

test('سجل العمليات مقاوم للتلاعب: أي تعديل أو حذف يُكتشف', () => {
  assert.equal(verifyAudit().ok, true);
  const row = db.prepare("SELECT id, actor FROM audit WHERE hash IS NOT NULL ORDER BY id LIMIT 1 OFFSET 3").get();
  db.prepare('UPDATE audit SET actor=? WHERE id=?').run('مزوَّر', row.id);
  let v = verifyAudit(); assert.equal(v.ok, false); assert.equal(v.brokenAt, row.id);
  db.prepare('UPDATE audit SET actor=? WHERE id=?').run(row.actor, row.id); assert.equal(verifyAudit().ok, true);
  const del = db.prepare("SELECT * FROM audit WHERE hash IS NOT NULL ORDER BY id LIMIT 1 OFFSET 5").get();
  db.prepare('DELETE FROM audit WHERE id=?').run(del.id); assert.equal(verifyAudit().ok, false);
  db.prepare('INSERT INTO audit(id,request_id,user_id,actor,action,detail,created_at,hash,dhash) VALUES(?,?,?,?,?,?,?,?,?)').run(del.id, del.request_id, del.user_id, del.actor, del.action, del.detail, del.created_at, del.hash, del.dhash);
  assert.equal(verifyAudit().ok, true);
});

test('إخفاء الهوية بعد المعرض: تُمحى البيانات الشخصية وتبقى الإحصاءات وسلامة السجل', async () => {
  const boss = await loginAs('boss');
  const refs = [];
  for (let i = 0; i < 3; i++) refs.push((await submit({ ...common({ phone: '5558000' + i, name: 'اسم سري ' + i, notes: 'ملاحظة شخصية' }), service: 'other', fields: { title: 'عنوان خاص', description: 'وصف شخصي' } })).data.receipt.ref);
  const ids = refs.map(r => db.prepare('SELECT id FROM requests WHERE ref=?').get(r).id);
  await call('POST', `/api/staff/requests/${ids[0]}/contacts`, { kind: 'call', summary: 'تفاصيل شخصية في المكالمة' }, { cookie: boss });
  for (const id of ids.slice(0, 2)) assert.equal((await call('PATCH', `/api/staff/requests/${id}`, { status: 'closed', outcome: 'answered', name: 'اسم جديد ' + id }, { cookie: boss })).status, 200);
  db.prepare('UPDATE requests SET updated_at=? WHERE id IN (?,?)').run(new Date(Date.now() - 200 * 864e5).toISOString(), ids[0], ids[1]);
  const before = (await call('GET', '/api/admin/reports/summary', null, { cookie: boss })).data.totals.requests;
  const dry = await call('POST', '/api/admin/anonymize', { dryRun: true }, { cookie: boss });
  assert.equal(dry.data.count, 2); assert.equal(db.prepare('SELECT name FROM requests WHERE id=?').get(ids[0]).name.startsWith('اسم'), true, 'المعاينة لا تغيّر شيئًا');
  assert.equal((await call('POST', '/api/admin/anonymize', { dryRun: false }, { cookie: boss })).data.count, 2);
  const a = db.prepare('SELECT * FROM requests WHERE id=?').get(ids[0]);
  assert.equal(a.name, '(مُخفى)'); assert.equal(a.phone_e164, 'anon-' + ids[0]); assert.equal(a.notes, null); assert.equal(a.email, null); assert.equal(a.anonymized, 1);
  assert.ok(!a.payload.includes('عنوان خاص') && !a.payload.includes('وصف شخصي'));
  assert.equal(db.prepare('SELECT summary FROM contact_log WHERE request_id=?').get(ids[0]).summary, '(مُخفى)');
  assert.ok(!JSON.stringify(db.prepare('SELECT detail FROM audit WHERE request_id=?').all(ids[0])).includes('اسم جديد'), 'تفاصيل السجل الشخصية مُسحت');
  assert.equal(db.prepare('SELECT name FROM requests WHERE id=?').get(ids[2]).name.startsWith('اسم سري'), true, 'غير المنتهية لا تُمس');
  assert.equal((await call('GET', '/api/admin/reports/summary', null, { cookie: boss })).data.totals.requests, before, 'الأعداد ثابتة');
  assert.equal(verifyAudit().ok, true, 'السلسلة سليمة بعد مسح التفاصيل');
});

test('ترويسات الأمان والكوكي __Host- عند HTTPS، وجلسة بلا تجديد منزلق', async () => {
  const home = await fetch(base + '/');
  for (const h of ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'referrer-policy']) assert.ok(home.headers.get(h), h);
  assert.match(home.headers.get('content-security-policy'), /script-src 'self'/); assert.ok(!/unsafe-inline.*script|script-src[^;]*unsafe/.test(home.headers.get('content-security-policy')));
  db.prepare('INSERT INTO users(username,display_name,role,pass_hash,created_at) VALUES(?,?,?,?,?)').run('cookie1', 'ك', 'staff', U.hashPassword('Passw0rd-test1'), new Date().toISOString());
  const lg = await call('POST', '/api/auth/login', { username: 'cookie1', password: 'Passw0rd-test1' }, { headers: { 'x-forwarded-proto': 'https' } });
  const sc = lg.res.headers.get('set-cookie'); assert.match(sc, /^__Host-tsid=/); assert.match(sc, /Secure/); assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Strict/); assert.ok(!/Domain=/i.test(sc));
  assert.equal((await call('GET', '/api/staff/stats', null, { cookie: sc.split(';')[0] })).status, 200);
  assert.ok(new Date(db.prepare('SELECT expires_at FROM sessions ORDER BY created_at DESC LIMIT 1').get().expires_at) - Date.now() <= 12 * 3600e3 + 5000);
});

test('حقن XSS/SQL في الحقول يُخزَّن كنص ولا يُنفَّذ', async () => {
  const evil = `<img src=x onerror=alert(1)>'; DROP TABLE requests;--`;
  const r = await submit({ ...common({ phone: '55591111', name: evil, notes: evil }), service: 'other', fields: { title: evil, description: evil } });
  assert.equal(r.status, 201);
  const row = db.prepare('SELECT name, notes FROM requests WHERE ref=?').get(r.data.receipt.ref);
  assert.equal(row.name, evil); assert.ok(db.prepare('SELECT COUNT(*) n FROM requests').get().n > 10, 'الجدول سليم');
  const boss = await loginAs('boss');
  const q = await call('GET', `/api/staff/requests?q=${encodeURIComponent("' OR 1=1 --")}`, null, { cookie: boss }); assert.equal(q.status, 200); assert.equal(q.data.total, 0);
});

test('وضع Funnel: لوحة الموظفين والإدارة مخفية عن الإنترنت العام، والنموذج العام يعمل', async () => {
  const via = { 'tailscale-funnel-request': '?1' };
  for (const u of ['/staff', '/staff.js', '/admin.js', '/admin2.js', '/staff-boot.js', '/api/staff/stats', '/api/admin/users', '/api/auth/me']) {
    const r = await fetch(base + u, { headers: via }); assert.equal(r.status, 404, u);
  }
  assert.equal((await fetch(base + '/api/public/config', { headers: via })).status, 200);
  assert.equal((await fetch(base + '/', { headers: via })).status, 200);
  assert.equal((await fetch(base + '/theme.css', { headers: via })).status, 200);
  const r2 = await fetch(base + '/api/staff/stats'); assert.equal(r2.status, 401, 'من الشبكة الخاصة (بلا الترويسة) تعمل اللوحة');
  assert.equal((await fetch(base + '/staff')).status, 200);
});

test('تنبيه الجوال ونبض الحياة: بلا بيانات شخصية، ولا يكسر الحفظ عند فشله', async () => {
  const got = [];
  const mock = http.createServer((req, res) => { let b = ''; req.on('data', d => { b += d; }); req.on('end', () => { got.push({ url: req.url, headers: req.headers, body: b }); res.end('ok'); }); });
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  const mport = mock.address().port, wait = ms => new Promise(r => setTimeout(r, ms));
  process.env.NTFY_URL = `http://127.0.0.1:${mport}`; process.env.NTFY_TOPIC = 'abcdEFGH1234567890xyzQ';
  try {
    const k = key(), body = { ...common({ phone: '55599777', name: 'اسم حساس جدًا' }), service: 'towing', fields: SAMPLES.towing };
    assert.equal((await submit(body, k)).status, 201);
    assert.equal((await submit(body, k)).status, 200); // إعادة بنفس المفتاح: لا تنبيه ثانٍ
    const boss = await loginAs('boss');
    assert.equal((await call('POST', '/api/staff/requests', { ...common({ phone: '55599778' }), service: 'other', fields: SAMPLES.other, is_test: true }, { cookie: boss, headers: { 'idempotency-key': key() } })).status, 201); // تجريبي: لا تنبيه
    await wait(300);
    const hits = got.filter(g => g.url === '/abcdEFGH1234567890xyzQ');
    assert.equal(hits.length, 1, 'تنبيه واحد فقط');
    assert.match(hits[0].body, /KPTC-EX26-\d{6}/); assert.match(hits[0].body, /الأوناش/);
    assert.ok(!hits[0].body.includes('اسم حساس') && !hits[0].body.includes('55599777') && !JSON.stringify(hits[0].headers).includes('55599777'), 'لا بيانات شخصية');
    assert.match(hits[0].headers.title, /^=\?UTF-8\?B\?/);
    // نبض الحياة
    const N = require('../server/notify'); process.env.HEARTBEAT_URL = `http://127.0.0.1:${mport}/hb`;
    assert.equal(N.startHeartbeat(60), true); await wait(350); N.stopHeartbeat();
    assert.ok(got.filter(g => g.url === '/hb').length >= 3);
    // فشل التنبيه (منفذ مغلق) لا يمنع حفظ الطلب
    process.env.NTFY_URL = 'http://127.0.0.1:1';
    assert.equal((await submit({ ...common({ phone: '55599779' }), service: 'other', fields: SAMPLES.other })).status, 201);
  } finally { delete process.env.NTFY_URL; delete process.env.NTFY_TOPIC; delete process.env.HEARTBEAT_URL; mock.close(); }
});

test('i18n: القواميس تغطي كل النصوص العربية في واجهة الزائر', async () => {
  const { execFileSync } = require('node:child_process');
  execFileSync(process.execPath, [require('node:path').join(__dirname, '../scripts/i18n-keys.js'), '--check'], { stdio: 'pipe' });
});
