'use strict';
// إعادة تعيين المصادقة الثنائية لمستخدم (عند ضياع جواله). يُنفَّذ على الخادم فقط.
//   npm run reset-2fa -- --username=admin
const { db, audit } = require('../server/db');
const a = Object.fromEntries(process.argv.slice(2).map(x => x.replace(/^--/, '').split('=')));
const u = db.prepare('SELECT id FROM users WHERE username=?').get(String(a.username || '').toLowerCase());
if (!u) { console.error('المستخدم غير موجود'); process.exit(1); }
db.prepare("UPDATE users SET totp_secret=NULL, totp_enabled=0, totp_last_step=0, recovery='[]' WHERE id=?").run(u.id);
db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
audit('سطر الأوامر', 'totp_reset', { username: a.username });
console.log('أُعيد تعيين المصادقة الثنائية؛ سيُطلب منه تفعيلها عند الدخول التالي.'); db.close();
