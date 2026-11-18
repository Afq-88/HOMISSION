'use strict';
const cfg = require('./config');
const { db } = require('./db');
const { createServer } = require('./app');
const { runBackup } = require('./backup');

const server = createServer();
server.listen(cfg.PORT, cfg.HOST, () => {
  const admins = db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin' AND active=1").get().n;
  console.log(`طلبك معنا يعمل على http://${cfg.HOST}:${server.address().port}`);
  console.log(`قاعدة البيانات: ${cfg.DB_PATH}`);
  if (!admins) console.log('\n⚠ لا يوجد مدير نظام بعد. أنشئ حساب المدير بالأمر:\n   npm run create-admin\n');
  if (!cfg.COOKIE_SECURE && !cfg.TRUST_PROXY) console.log('تنبيه: للنشر الفعلي استخدم HTTPS وعيّن COOKIE_SECURE=1 (أو TRUST_PROXY=1 خلف وسيط HTTPS).');
});

if (cfg.BACKUP_EVERY_HOURS > 0) {
  const t = setInterval(() => { try { const b = runBackup('auto'); console.log('نسخة احتياطية:', b.file); } catch (e) { console.error('فشل النسخ الاحتياطي', e.message); } }, cfg.BACKUP_EVERY_HOURS * 3600e3);
  t.unref();
}
function shutdown() { server.close(() => { try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); db.close(); } catch { /* */ } process.exit(0); }); setTimeout(() => process.exit(0), 5000).unref(); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
