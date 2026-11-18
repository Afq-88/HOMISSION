'use strict';
// مفتاح التطبيق: يشفّر أسرار المصادقة الثنائية داخل القاعدة. يأتي من APP_SECRET (الموصى به: ملف بيئة بصلاحية root فقط)،
// وإلا يُولَّد مرة واحدة في DATA_DIR/.app_secret بصلاحية 0600.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('./config');

function loadKey() {
  const env = process.env.APP_SECRET;
  if (env && env.length >= 32) return crypto.createHash('sha256').update(env).digest();
  const f = path.join(cfg.DATA_DIR, '.app_secret');
  fs.mkdirSync(cfg.DATA_DIR, { recursive: true });
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  return crypto.createHash('sha256').update(fs.readFileSync(f, 'utf8').trim()).digest();
}
const MASTER = loadKey();
const sub = label => Buffer.from(crypto.hkdfSync('sha256', MASTER, Buffer.alloc(0), label, 32));

function seal(plain, label = 'totp') {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', sub(label), iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return 'v1.' + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
}
function open(sealed, label = 'totp') {
  if (!sealed || !String(sealed).startsWith('v1.')) return null;
  try {
    const b = Buffer.from(String(sealed).slice(3), 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', sub(label), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
  } catch { return null; }
}
module.exports = { seal, open };
