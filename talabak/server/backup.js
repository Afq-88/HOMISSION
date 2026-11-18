'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('./config');
const { backupTo } = require('./db');

const MAGIC = Buffer.from('TMENC1\0\0');
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const FILE_RE = /^talabak-[A-Za-z0-9._-]+\.db(\.enc)?$/;

// ---------- تشفير الملفات: AES-256-GCM بمفتاح مشتق من العبارة بـ scrypt ----------
function encryptBuffer(plain, pass) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(pass, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const c = crypto.createCipheriv('aes-256-gcm', key, iv); c.setAAD(MAGIC);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([MAGIC, salt, iv, c.getAuthTag(), ct]);
}
function decryptBuffer(buf, pass) {
  if (buf.length < 8 + 16 + 12 + 16 || !buf.subarray(0, 8).equals(MAGIC)) throw new Error('الملف ليس نسخة مشفّرة صالحة');
  const salt = buf.subarray(8, 24), iv = buf.subarray(24, 36), tag = buf.subarray(36, 52), ct = buf.subarray(52);
  const key = crypto.scryptSync(pass, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAAD(MAGIC); d.setAuthTag(tag);
  try { return Buffer.concat([d.update(ct), d.final()]); } catch { throw new Error('العبارة خاطئة أو الملف تالف/معدَّل'); }
}

function listBackups() {
  if (!fs.existsSync(cfg.BACKUP_DIR)) return [];
  return fs.readdirSync(cfg.BACKUP_DIR).filter(f => FILE_RE.test(f)).map(f => {
    const st = fs.statSync(path.join(cfg.BACKUP_DIR, f));
    return { file: f, size: st.size, created_at: st.mtime.toISOString(), encrypted: f.endsWith('.enc') };
  }).sort((a, b) => b.file.localeCompare(a.file));
}
function pruneBackups(keep = cfg.BACKUP_KEEP) {
  for (const b of listBackups().slice(keep)) fs.unlinkSync(path.join(cfg.BACKUP_DIR, b.file));
}
function runBackup(label = '', passphrase = cfg.BACKUP_PASSPHRASE) {
  fs.mkdirSync(cfg.BACKUP_DIR, { recursive: true, mode: 0o700 });
  const ext = passphrase ? '.db.enc' : '.db';
  let base = `talabak-${stamp()}${label ? '-' + label : ''}`, name = base + ext, i = 1;
  while (fs.existsSync(path.join(cfg.BACKUP_DIR, name))) name = `${base}-${i++}${ext}`;
  const out = path.join(cfg.BACKUP_DIR, name), tmp = path.join(cfg.BACKUP_DIR, `.tmp-${crypto.randomBytes(6).toString('hex')}.db`);
  backupTo(tmp);
  try {
    if (passphrase) fs.writeFileSync(out, encryptBuffer(fs.readFileSync(tmp), passphrase), { mode: 0o600 });
    else fs.renameSync(tmp, out);
  } finally { fs.rmSync(tmp, { force: true }); }
  fs.chmodSync(out, 0o600);
  pruneBackups();
  return { file: name, size: fs.statSync(out).size, encrypted: !!passphrase };
}
module.exports = { runBackup, listBackups, pruneBackups, encryptBuffer, decryptBuffer, FILE_RE };
