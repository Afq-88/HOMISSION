'use strict';
// استعادة قاعدة البيانات من نسخة احتياطية. أوقف الخادم أولًا.
//   npm run restore -- data/backups/talabak-20261120-0900-manual.db
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('../server/config');

const src = process.argv[2];
if (!src || !fs.existsSync(src)) { console.error('حدّد ملف النسخة الاحتياطية: npm run restore -- <المسار>'); process.exit(1); }
// 0) نسخة مشفّرة؟ تُفك أولًا بالعبارة من BACKUP_PASSPHRASE
let work = src, tmpPlain = null;
if (src.endsWith('.enc')) {
  const { decryptBuffer } = require('../server/backup');
  if (!process.env.BACKUP_PASSPHRASE) { console.error("النسخة مشفّرة: عيّن BACKUP_PASSPHRASE='…' ثم أعد المحاولة."); process.exit(1); }
  try { tmpPlain = path.join(cfg.DATA_DIR, `.restore-${Date.now()}.db`); fs.mkdirSync(cfg.DATA_DIR, { recursive: true }); fs.writeFileSync(tmpPlain, decryptBuffer(fs.readFileSync(src), process.env.BACKUP_PASSPHRASE), { mode: 0o600 }); work = tmpPlain; }
  catch (e) { console.error('فشل فك التشفير:', e.message); process.exit(1); }
}
// 1) فحص سلامة النسخة
const t = new DatabaseSync(work, { readOnly: true });
const check = t.prepare('PRAGMA integrity_check').get();
const n = t.prepare('SELECT COUNT(*) n FROM requests').get().n;
t.close();
if (Object.values(check)[0] !== 'ok') { console.error('النسخة تالفة، أُلغيت الاستعادة.'); process.exit(1); }
// 2) حفظ الحالة الحالية قبل الاستبدال
if (fs.existsSync(cfg.DB_PATH)) {
  const keep = path.join(cfg.BACKUP_DIR, `talabak-pre-restore-${Date.now()}.db`);
  fs.mkdirSync(cfg.BACKUP_DIR, { recursive: true });
  const cur = new DatabaseSync(cfg.DB_PATH);
  cur.exec(`VACUUM INTO '${keep.replace(/'/g, "''")}'`); cur.close();
  console.log('حُفظت الحالة الحالية في:', keep);
}
for (const ext of ['-wal', '-shm']) fs.rmSync(cfg.DB_PATH + ext, { force: true });
fs.copyFileSync(work, cfg.DB_PATH);
if (tmpPlain) fs.rmSync(tmpPlain, { force: true });
console.log(`تمت الاستعادة من ${src} (${n} طلبًا). شغّل الخادم من جديد.`);
