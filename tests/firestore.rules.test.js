/* اختبارات قواعد الأمان — تشغيل:  firebase emulators:exec --only firestore "node --test tests/"  */
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } = require('firebase/firestore');
const { test, before, after, beforeEach } = require('node:test');
const fs = require('fs');
let env;
const now = () => Math.floor(Date.now() / 1000);
const tok = (o = {}) => ({ email_verified: true, auth_time: now(), ...o });
const staff = (uid, o) => env.authenticatedContext(uid, tok(o)).firestore();

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'kptc-test', firestore: { rules: fs.readFileSync(__dirname + '/../firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const d = c.firestore();
    await setDoc(doc(d, 'roles/owner'),  { perms: ['*'] });
    await setDoc(doc(d, 'roles/admin'),  { perms: ['site.pages', 'admin.staff', 'admin.log', 'ops.wallets', 'ops.bookings', 'admin.roles'] });
    await setDoc(doc(d, 'roles/emp'),    { perms: ['portal.directory', 'portal.leave'] });
    await setDoc(doc(d, 'roles/sup'),    { perms: ['portal.directory', 'approve.forms'] });
    await setDoc(doc(d, 'roles/fin'),    { perms: ['ops.wallets'] });
    const mk = (id, role, extra = {}) => setDoc(doc(d, 'staff/' + id), { name: id, title: '', dept: 'x', role, status: 'active', grant: [], deny: [], ...extra });
    await mk('owner1', 'owner'); await mk('admin1', 'admin'); await mk('emp1', 'emp'); await mk('sup1', 'sup'); await mk('fin1', 'fin');
    await mk('gone', 'emp', { status: 'suspended' });
    await setDoc(doc(d, 'wallets/cust1'), { balance: 10, frozen: false });
    await setDoc(doc(d, 'users/cust1'), { name: 'c', phone: '1' });
    await setDoc(doc(d, 'users/cust2'), { name: 'd', phone: '2' });
    await setDoc(doc(d, 'requests/r1'), { staff: 'emp1', status: 'قيد الاعتماد', steps: [] });
    await setDoc(doc(d, 'requests/r2'), { staff: 'sup1', status: 'قيد الاعتماد', steps: [] });
  });
});

test('الرفض الافتراضي: مسار غير معرّف مغلق حتى لمسؤول النظام', async () => {
  await assertFails(getDoc(doc(staff('owner1'), 'backup/x')));
  await assertFails(setDoc(doc(staff('owner1'), 'anything/x'), { a: 1 }));
});
test('زائر مجهول لا يقرأ البوابة الداخلية ولا الدليل', async () => {
  const anon = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anon, 'circulars/c1')));
  await assertFails(getDoc(doc(anon, 'staff/emp1')));
});
test('موظف موقوف يفقد الوصول فوراً', async () => {
  await assertFails(getDoc(doc(staff('gone'), 'circulars/c1')));
});
test('عميل لا يقرأ بيانات عميل آخر ولا يرفع رصيده', async () => {
  const c = staff('cust1');
  await assertSucceeds(getDoc(doc(c, 'users/cust1')));
  await assertFails(getDoc(doc(c, 'users/cust2')));
  await assertFails(updateDoc(doc(c, 'wallets/cust1'), { balance: 99999 }));
  await assertFails(updateDoc(doc(c, 'users/cust1'), { suspended: false, role: 'owner' }));
});
test('تصعيد الصلاحيات: موظف لا يغيّر دوره ولا يمنح نفسه', async () => {
  await assertFails(updateDoc(doc(staff('emp1'), 'staff/emp1'), { role: 'owner' }));
  await assertFails(updateDoc(doc(staff('emp1'), 'staff/emp1'), { grant: ['*'] }));
});
test('مدير النظام لا يعدّل حسابه ولا يمسّ المالك ولا يمنح صلاحيات الإدارة', async () => {
  const a = staff('admin1');
  await assertSucceeds(updateDoc(doc(a, 'staff/emp1'), { title: 'جديد' }));
  await assertFails(updateDoc(doc(a, 'staff/admin1'), { title: 'أنا' }));
  await assertFails(updateDoc(doc(a, 'staff/owner1'), { status: 'suspended' }));
  await assertFails(updateDoc(doc(a, 'staff/emp1'), { grant: ['admin.accounts'] }));
  await assertFails(updateDoc(doc(a, 'staff/emp1'), { role: 'owner' }));
  await assertFails(deleteDoc(doc(a, 'staff/owner1')));
});
test('مسؤول النظام وحده يمنح صلاحيات الإدارة', async () => {
  await assertSucceeds(updateDoc(doc(staff('owner1'), 'staff/emp1'), { grant: ['admin.staff'] }));
});
test('إعادة التحقق: العملية الحرجة ترفض جلسة عمرها أكثر من 5 دقائق', async () => {
  const old = env.authenticatedContext('admin1', tok({ auth_time: now() - 600 })).firestore();
  await assertFails(updateDoc(doc(old, 'staff/emp1'), { title: 'x' }));
  // جلسة عمرها 9 ساعات لا تكتب في المحتوى
  const ed = env.authenticatedContext('admin1', tok({ auth_time: now() - 9 * 3600 })).firestore();
  await assertFails(setDoc(doc(ed, 'site/main'), { x: 1 }));
});
test('MFA: عند تفعيلها ترفض العمليات الحرجة بدون العامل الثاني', async () => {
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'config/security'), { mfaRequired: true }));
  await assertFails(updateDoc(doc(staff('admin1'), 'staff/emp1'), { title: 'x' }));
  const withMfa = env.authenticatedContext('admin1', tok({ firebase: { sign_in_second_factor: 'totp' } })).firestore();
  await assertSucceeds(updateDoc(doc(withMfa, 'staff/emp1'), { title: 'x' }));
});
test('فصل المهام: المعتمد لا يعتمد طلبه', async () => {
  const s = staff('sup1');
  await assertSucceeds(updateDoc(doc(s, 'requests/r1'), { status: 'معتمد' }));
  await assertFails(updateDoc(doc(s, 'requests/r2'), { status: 'معتمد' }));
  await assertFails(updateDoc(doc(staff('emp1'), 'requests/r1'), { status: 'معتمد' }));
});
test('المحفظة: تعديل الرصيد بلا قيد ledger مطابق مرفوض، ومعه مقبول', async () => {
  const f = staff('fin1');
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'wallets/cust1'), { balance: 10, frozen: false }));
  await assertFails(updateDoc(doc(f, 'wallets/cust1'), { balance: 500, lastTx: 'T1' }));
  const bad = writeBatch(f);
  bad.update(doc(f, 'wallets/cust1'), { balance: 500, lastTx: 'T2' });
  bad.set(doc(f, 'wallets/cust1/tx/T2'), { a: 5, t: 'تعبئة', note: '', by: 'fin1', at: serverTimestamp() });   // القيد لا يطابق الفرق
  await assertFails(bad.commit());
  const ok = writeBatch(f);
  ok.update(doc(f, 'wallets/cust1'), { balance: 15, lastTx: 'T3' });
  ok.set(doc(f, 'wallets/cust1/tx/T3'), { a: 5, t: 'تعبئة', note: '', by: 'fin1', at: serverTimestamp() });
  await assertSucceeds(ok.commit());
  await assertFails(updateDoc(doc(f, 'wallets/cust1/tx/T3'), { a: 1000 }));      // القيد لا يُعدَّل
  await assertFails(deleteDoc(doc(f, 'wallets/cust1/tx/T3')));                  // ولا يُحذف
});
test('سجل التدقيق: إضافة فقط وباسم المنفّذ وبتوقيت الخادم', async () => {
  const a = staff('admin1');
  await assertSucceeds(setDoc(doc(a, 'audit/a1'), { by: 'admin1', at: serverTimestamp(), msg: 'x', sec: '', h: 'h', prev: 'p' }));
  await assertFails(setDoc(doc(a, 'audit/a2'), { by: 'emp1', at: serverTimestamp(), msg: 'x', sec: '', h: 'h', prev: 'p' }));   // انتحال
  await assertFails(setDoc(doc(a, 'audit/a3'), { by: 'admin1', at: new Date('2020-01-01'), msg: 'x', sec: '', h: 'h', prev: 'p' })); // توقيت مزوَّر
  await assertFails(updateDoc(doc(a, 'audit/a1'), { msg: 'محوت' }));
  await assertFails(deleteDoc(doc(a, 'audit/a1')));
  await assertFails(deleteDoc(doc(staff('owner1'), 'audit/a1')));
});
test('طلب توظيف من زائر: يُنشأ ولا يُقرأ', async () => {
  const anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(anon, 'applications/ap1'), { job: 'J1', name: 'س', phone: '1', email: 'a@b.c', exp: '1', note: 'n', d: '2026-01-01', status: 'قيد المراجعة' }));
  await assertFails(getDoc(doc(anon, 'applications/ap1')));
  await assertFails(setDoc(doc(anon, 'applications/ap2'), { job: 'J1', name: 'س', note: 'n', status: 'مقبول' }));   // لا يحدد حالته بنفسه
});
