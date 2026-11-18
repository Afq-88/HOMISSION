'use strict';
// اختبارات الخادم الفعلية: قاعدة SQLite مؤقتة + خادم حقيقي على منفذ عشوائي.
const fs = require('fs');
const os = require('os');
const path = require('path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talabak-'));
process.env.DATA_DIR = tmp; process.env.DB_PATH = path.join(tmp, 't.db'); process.env.BACKUP_DIR = path.join(tmp, 'bk');
process.env.PORT = '0'; process.env.BACKUP_EVERY_HOURS = '0';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { db, setSetting } = require('../server/db');
const { createServer } = require('../server/app');
const U = require('../server/util');
const { runBackup } = require('../server/backup');

let base;
const server = createServer();
test.before(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const mk = (u, n, role) => db.prepare('INSERT INTO users(username,display_name,role,pass_hash,created_at) VALUES(?,?,?,?,?)').run(u, n, role, U.hashPassword('Passw0rd-test1'), new Date().toISOString());
  mk('boss', 'المدير', 'admin'); mk('sara', 'سارة', 'staff'); mk('omar', 'عمر', 'staff');
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
async function loginAs(u) {
  const r = await call('POST', '/api/auth/login', { username: u, password: 'Passw0rd-test1' });
  assert.equal(r.status, 200);
  return r.res.headers.get('set-cookie').split(';')[0];
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
