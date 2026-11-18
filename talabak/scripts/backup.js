'use strict';
// نسخة احتياطية متسقة من قاعدة البيانات (آمنة أثناء تشغيل الخادم).
const { runBackup } = require('../server/backup');
const cfg = require('../server/config');
const b = runBackup(process.argv[2] || 'manual');
console.log(`تمت النسخة الاحتياطية: ${cfg.BACKUP_DIR}/${b.file} (${(b.size / 1024).toFixed(0)} KB)`);
