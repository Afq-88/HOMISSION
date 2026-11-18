'use strict';
// TOTP (RFC 6238) متوافق مع Google Authenticator / Microsoft Authenticator / Authy / تطبيق كلمات مرور iOS.
const crypto = require('crypto');
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function b32encode(buf) {
  let bits = '', out = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}
function b32decode(s) {
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) { const v = B32.indexOf(c); if (v < 0) throw new Error('base32'); bits += v.toString(2).padStart(5, '0'); }
  const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
const newSecret = () => b32encode(crypto.randomBytes(20));
function hotp(secretB32, counter) {
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', b32decode(secretB32)).update(buf).digest();
  const o = h[19] & 0xf, n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1e6).padStart(6, '0');
}
const stepNow = (t = Date.now()) => Math.floor(t / 30000);
// يعيد رقم الخطوة المطابقة (لمنع إعادة استخدام نفس الرمز) أو null. النافذة ±1 خطوة لاحتمال فرق الساعة.
function verify(secretB32, code, lastStep = 0, now = Date.now()) {
  code = String(code || '').replace(/\s|-/g, '');
  if (!/^\d{6}$/.test(code)) return null;
  const cur = stepNow(now);
  for (const d of [0, -1, 1]) {
    const step = cur + d;
    if (step <= lastStep) continue;
    const exp = Buffer.from(hotp(secretB32, step)), got = Buffer.from(code);
    if (crypto.timingSafeEqual(exp, got)) return step;
  }
  return null;
}
const uri = (account, secret, issuer = 'KPTC طلبك معنا') => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
function recoveryCodes(n = 8) {
  return Array.from({ length: n }, () => { const s = crypto.randomBytes(5).toString('hex'); return s.slice(0, 5) + '-' + s.slice(5); });
}
module.exports = { newSecret, hotp, verify, uri, recoveryCodes, stepNow };
