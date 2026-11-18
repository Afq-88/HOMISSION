'use strict';
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { backupTo } = require('./db');

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

function listBackups() {
  if (!fs.existsSync(cfg.BACKUP_DIR)) return [];
  return fs.readdirSync(cfg.BACKUP_DIR).filter(f => /^talabak-.*\.db$/.test(f)).map(f => {
    const st = fs.statSync(path.join(cfg.BACKUP_DIR, f));
    return { file: f, size: st.size, created_at: st.mtime.toISOString() };
  }).sort((a, b) => b.file.localeCompare(a.file));
}
function pruneBackups(keep = cfg.BACKUP_KEEP) {
  for (const b of listBackups().slice(keep)) fs.unlinkSync(path.join(cfg.BACKUP_DIR, b.file));
}
function runBackup(label = '') {
  let file = path.join(cfg.BACKUP_DIR, `talabak-${stamp()}${label ? '-' + label : ''}.db`);
  let i = 1;
  while (fs.existsSync(file)) file = file.replace(/(-\d+)?\.db$/, `-${i++}.db`);
  backupTo(file);
  pruneBackups();
  return { file: path.basename(file), size: fs.statSync(file).size };
}
module.exports = { runBackup, listBackups, pruneBackups };
