'use strict';
// فك تشفير نسخة احتياطية (.db.enc) إلى ملف SQLite عادي — لفحصها أو لاستعادتها على جهاز آخر.
//   BACKUP_PASSPHRASE='...' node scripts/decrypt-backup.js <المدخل.db.enc> [المخرج.db]
const fs = require('fs');
const { decryptBuffer } = require('../server/backup');
const [src, out] = process.argv.slice(2);
if (!src || !process.env.BACKUP_PASSPHRASE) { console.error("الاستخدام: BACKUP_PASSPHRASE='…' node scripts/decrypt-backup.js <ملف.db.enc> [مخرج.db]"); process.exit(1); }
const dest = out || src.replace(/\.enc$/, '');
try { fs.writeFileSync(dest, decryptBuffer(fs.readFileSync(src), process.env.BACKUP_PASSPHRASE), { mode: 0o600 }); console.log('تم فك التشفير →', dest); }
catch (e) { console.error('فشل:', e.message); process.exit(1); }
