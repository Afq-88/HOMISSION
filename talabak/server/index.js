'use strict';
const cfg = require('./config');
const { db } = require('./db');
const { createServer } = require('./app');
const { runBackup } = require('./backup');
const U = require('./util');
const N = require('./notify');

// إنشاء المدير الأول من متغيرات البيئة (للاستضافات بلا سطر أوامر). يعمل فقط إن لم يوجد أي مدير،
// وكلمة المرور مؤقتة: يُجبَر المدير على تغييرها عند أول دخول. احذف المتغير بعد ذلك.
(function bootstrapAdmin() {
  const user = String(process.env.BOOTSTRAP_ADMIN_USER || '').toLowerCase(), pw = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!user || !pw || db.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").get()) return;
  const bad = U.passwordProblem(pw);
  if (bad || !/^[a-z0-9._-]{3,32}$/.test(user)) { console.error('تعذّر إنشاء المدير الأول:', bad || 'اسم المستخدم غير صالح'); return; }
  db.prepare("INSERT INTO users(username,display_name,role,pass_hash,must_change,created_at) VALUES(?,?, 'admin',?,1,?)").run(user, 'مدير النظام', U.hashPassword(pw), new Date().toISOString());
  console.log(`أُنشئ المدير الأول «${user}» (كلمة مرور مؤقتة — سيُطلب تغييرها عند أول دخول).`);
})();

const server = createServer();
server.requestTimeout = 30000; server.headersTimeout = 15000; server.keepAliveTimeout = 5000; server.maxHeadersCount = 60;
process.on('uncaughtException', e => { console.error('[فادح]', e); process.exit(1); });   // systemd يعيد التشغيل
process.on('unhandledRejection', e => { console.error('[فادح]', e); process.exit(1); });
server.listen(cfg.PORT, cfg.HOST, () => {
  const admins = db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin' AND active=1").get().n;
  console.log(`طلبك معنا يعمل على http://${cfg.HOST}:${server.address().port}`);
  console.log(`قاعدة البيانات: ${cfg.DB_PATH}`);
  if (!admins) console.log('\n⚠ لا يوجد مدير نظام بعد. أنشئ حساب المدير بالأمر:\n   npm run create-admin\n');
  if (!cfg.COOKIE_SECURE && !cfg.TRUST_PROXY) console.log('تنبيه: للنشر الفعلي استخدم HTTPS وعيّن COOKIE_SECURE=1 (أو TRUST_PROXY=1 خلف وسيط HTTPS).');
});

N.startHeartbeat();
if (N.enabled()) N.notify({ title: 'الخادم يعمل', message: 'بدأ تشغيل «طلبك معنا» (أو أُعيد تشغيله).', priority: 2, tags: 'white_check_mark' });

if (cfg.BACKUP_EVERY_HOURS > 0) {
  const t = setInterval(() => { try { const b = runBackup('auto'); console.log('نسخة احتياطية:', b.file); } catch (e) { console.error('فشل النسخ الاحتياطي', e.message); N.notify({ title: 'فشل النسخ الاحتياطي', message: 'تعذّر النسخ الاحتياطي التلقائي — افحص الخادم.', priority: 5, tags: 'warning' }); } }, cfg.BACKUP_EVERY_HOURS * 3600e3);
  t.unref();
}
function shutdown() { server.close(() => { try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); db.close(); } catch { /* */ } process.exit(0); }); setTimeout(() => process.exit(0), 5000).unref(); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
