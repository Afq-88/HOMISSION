'use strict';
const crypto = require('crypto');

// ---------- الأرقام العربية ----------
const AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
function normDigits(s) {
  if (s == null) return '';
  return String(s).replace(/[٠-٩]/g, c => AR.indexOf(c)).replace(/[۰-۹]/g, c => FA.indexOf(c))
    .replace(/٫/g, '.').replace(/٬/g, ',').replace(/[‎‏‪-‮]/g, '');
}
const clean = (s, max = 300) => normDigits(s == null ? '' : String(s)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

// ---------- الهاتف ----------
const COUNTRIES = [
  { cc: '965', iso: 'KW', name: 'الكويت', len: [8], first: /^[24569]/ },
  { cc: '966', iso: 'SA', name: 'السعودية', len: [9], first: /^5/ },
  { cc: '971', iso: 'AE', name: 'الإمارات', len: [9], first: /^5/ },
  { cc: '973', iso: 'BH', name: 'البحرين', len: [8], first: /^[3679]/ },
  { cc: '974', iso: 'QA', name: 'قطر', len: [8], first: /^[3567]/ },
  { cc: '968', iso: 'OM', name: 'عُمان', len: [8], first: /^[279]/ },
  { cc: '20', iso: 'EG', name: 'مصر', len: [10], first: /^1/ },
  { cc: '962', iso: 'JO', name: 'الأردن', len: [9], first: /^7/ },
  { cc: '961', iso: 'LB', name: 'لبنان', len: [7, 8], first: /^[3-9]/ },
  { cc: '963', iso: 'SY', name: 'سوريا', len: [9], first: /^9/ },
  { cc: '964', iso: 'IQ', name: 'العراق', len: [10], first: /^7/ },
  { cc: '967', iso: 'YE', name: 'اليمن', len: [9], first: /^7/ },
  { cc: '249', iso: 'SD', name: 'السودان', len: [9], first: /^[19]/ },
  { cc: '212', iso: 'MA', name: 'المغرب', len: [9], first: /^[567]/ },
  { cc: '213', iso: 'DZ', name: 'الجزائر', len: [9], first: /^[567]/ },
  { cc: '216', iso: 'TN', name: 'تونس', len: [8], first: /^[2459]/ },
  { cc: '91', iso: 'IN', name: 'الهند', len: [10], first: /^[6-9]/ },
  { cc: '92', iso: 'PK', name: 'باكستان', len: [10], first: /^3/ },
  { cc: '880', iso: 'BD', name: 'بنغلاديش', len: [10], first: /^1/ },
  { cc: '63', iso: 'PH', name: 'الفلبين', len: [10], first: /^9/ },
  { cc: '94', iso: 'LK', name: 'سريلانكا', len: [9], first: /^7/ },
  { cc: '977', iso: 'NP', name: 'نيبال', len: [10], first: /^9/ },
  { cc: '90', iso: 'TR', name: 'تركيا', len: [10], first: /^5/ },
  { cc: '98', iso: 'IR', name: 'إيران', len: [10], first: /^9/ },
  { cc: '44', iso: 'GB', name: 'المملكة المتحدة', len: [10], first: /^7/ },
  { cc: '1', iso: 'US', name: 'أمريكا/كندا', len: [10], first: /^[2-9]/ },
  { cc: '0', iso: 'XX', name: 'دولة أخرى (رقم دولي كامل)', len: [6, 7, 8, 9, 10, 11, 12, 13, 14], first: /^[1-9]/ },
];
function normalizePhone(cc, raw) {
  cc = clean(cc, 6).replace(/\D/g, '') || '965';
  const c = COUNTRIES.find(x => x.cc === cc);
  if (!c) return { ok: false, error: 'رمز الدولة غير مدعوم' };
  let d = clean(raw, 40).replace(/[^\d+]/g, '');
  if (c.cc !== '0') {
    if (d.startsWith('+' + c.cc)) d = d.slice(c.cc.length + 1);
    else if (d.startsWith('00' + c.cc)) d = d.slice(c.cc.length + 2);
    else if (d.startsWith(c.cc) && d.length > Math.max(...c.len)) d = d.slice(c.cc.length);
  }
  d = d.replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return { ok: false, error: 'أدخل رقم الهاتف' };
  if (!c.len.includes(d.length)) return { ok: false, error: `رقم ${c.name} يجب أن يكون ${c.len.join(' أو ')} أرقام` };
  if (!c.first.test(d)) return { ok: false, error: `رقم الهاتف غير صحيح لدولة ${c.name}` };
  return { ok: true, cc: c.cc, national: d, e164: c.cc === '0' ? d : c.cc + d };
}
const maskPhone = p => p ? '•'.repeat(Math.max(0, p.length - 3)) + p.slice(-3) : '';

// ---------- بريد ----------
const validEmail = e => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160;

// ---------- تواريخ (توقيت الكويت) ----------
const pad = n => String(n).padStart(2, '0');
function kuwaitToday(offset = 3) { const d = new Date(Date.now() + offset * 3600e3); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
const isTime = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const nowIso = () => new Date().toISOString();

// ---------- تشفير ----------
const SC = { N: 16384, r: 8, p: 1 };
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(pw, salt, 64, SC).toString('hex')}`;
}
function verifyPassword(pw, stored) {
  try {
    const [t, s, h] = String(stored).split('$');
    if (t !== 'scrypt') return false;
    return crypto.timingSafeEqual(crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64, SC), Buffer.from(h, 'hex'));
  } catch { return false; }
}
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const token = (n = 32) => crypto.randomBytes(n).toString('base64url');
function strongPassword(len = 14) {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.randomBytes(len); let out = '';
  for (let i = 0; i < len; i++) out += abc[b[i] % abc.length];
  return out + '7'; // يضمن وجود رقم
}
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'كلمة المرور يجب ألا تقل عن ١٠ أحرف';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'كلمة المرور يجب أن تجمع بين حروف وأرقام';
  return null;
}

// ---------- CSV (متوافق مع Excel العربي) ----------
function csvCell(v) {
  if (v == null) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // منع حقن الصيغ في Excel
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

module.exports = { normDigits, clean, COUNTRIES, normalizePhone, maskPhone, validEmail, kuwaitToday, isDate, isTime, nowIso, hashPassword, verifyPassword, sha256, token, strongPassword, passwordProblem, toCsv, HttpError };
