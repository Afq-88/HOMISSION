'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('./config');
const { DEFAULT_SERVICES } = require('./services');

fs.mkdirSync(path.dirname(cfg.DB_PATH), { recursive: true });
const db = new DatabaseSync(cfg.DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','staff')),
  pass_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  must_change INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_login TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  event_code TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  outcome TEXT,
  outcome_note TEXT,
  name TEXT NOT NULL,
  phone_cc TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  pref_channel TEXT NOT NULL,
  email TEXT,
  party_type TEXT NOT NULL,
  org_name TEXT,
  pref_time TEXT,
  notes TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  missing TEXT NOT NULL DEFAULT '[]',
  missing_count INTEGER NOT NULL DEFAULT 0,
  svc_date TEXT,
  source TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  assisted_by TEXT,
  assigned_to INTEGER REFERENCES users(id),
  next_action TEXT,
  follow_up_date TEXT,
  referred_to TEXT,
  referred_at TEXT,
  is_test INTEGER NOT NULL DEFAULT 0,
  is_dup INTEGER NOT NULL DEFAULT 0,
  dup_of INTEGER,
  archived INTEGER NOT NULL DEFAULT 0,
  idem_key TEXT UNIQUE,
  received_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_req_phone ON requests(phone_e164, service, svc_date);
CREATE INDEX IF NOT EXISTS ix_req_status ON requests(status, archived);
CREATE INDEX IF NOT EXISTS ix_req_assigned ON requests(assigned_to);
CREATE INDEX IF NOT EXISTS ix_req_received ON requests(received_at);
CREATE INDEX IF NOT EXISTS ix_req_follow ON requests(follow_up_date);
CREATE TABLE IF NOT EXISTS contact_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_contact_req ON contact_log(request_id);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER,
  user_id INTEGER,
  actor TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_audit_req ON audit(request_id);
`);

// ---------- الإعدادات ----------
const DEFAULT_SETTINGS = {
  event_name: 'معرض الصناعات',
  ref_prefix: 'KPTC',
  event_code: 'EX26',
  event_start: '2026-11-19',
  event_end: '2027-01-30',
  accepting: true,
  closed_message: 'انتهى استقبال الطلبات عبر هذا النموذج. شكرًا لاهتمامكم.',
  public_base_url: '',
  official_channel_text: '', // لا تُعرض في البطاقة إلا إذا أُدخلت
  official_channel_url: '',
  emergency_number: '', // لا يُعرض إلا إذا زُوِّد بالرقم الرسمي
  response_promise: '', // لا وعد بمدة استجابة إلا إذا ضبطها المدير
  whatsapp_link_enabled: false,
  retention_archive_days: 90,
  retention_delete_days: 365,
  kiosk_idle_seconds: 120,
  kiosk_warn_seconds: 30,
  rate_limit_per_10min: 80,
  followup_template: 'السلام عليكم {name}، نشكر زيارتكم جناح شركة النقل العام الكويتية في {event}. نتواصل معكم بخصوص طلبكم رقم {ref} ({service}). نأمل تزويدنا بالمعلومات المتبقية لاستكمال دراسة الطلب. تسجيل الطلب لا يُعد تأكيدًا للحجز أو تفعيلًا للخدمة، وتخضع الأسعار والتوافر للتأكيد من الجهة المختصة.',
  privacy_text: 'تُستخدم البيانات التي تدخلها لمعالجة طلبك والتواصل معك بشأنه فقط. تقديم الطلب لا يُعد موافقة على تلقي رسائل تسويقية لاحقة.',
};
const setStmts = {
  get: db.prepare('SELECT value FROM settings WHERE key = ?'),
  put: db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'),
  all: db.prepare('SELECT key, value FROM settings'),
};
function getSettings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of setStmts.all.all()) { try { out[r.key] = JSON.parse(r.value); } catch { /* تجاهل */ } }
  return out;
}
function setSetting(key, value) { setStmts.put.run(key, JSON.stringify(value)); }

function getServices() {
  const r = setStmts.get.get('services');
  if (!r) return JSON.parse(JSON.stringify(DEFAULT_SERVICES));
  try { return JSON.parse(r.value); } catch { return JSON.parse(JSON.stringify(DEFAULT_SERVICES)); }
}
function setServices(list) { setStmts.put.run('services', JSON.stringify(list)); }
if (!setStmts.get.get('services')) setServices(DEFAULT_SERVICES);

// ---------- معاملات ----------
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch { /* */ } throw e; }
}
function nextCounter(name) {
  db.prepare('INSERT INTO counters(name,value) VALUES(?,1) ON CONFLICT(name) DO UPDATE SET value=value+1').run(name);
  return db.prepare('SELECT value FROM counters WHERE name=?').get(name).value;
}

function audit(actor, action, detail, requestId = null) {
  db.prepare('INSERT INTO audit(request_id,user_id,actor,action,detail,created_at) VALUES(?,?,?,?,?,?)')
    .run(requestId, actor && actor.id ? actor.id : null, actor ? (actor.display_name || actor.name || String(actor)) : 'النظام', action, detail ? JSON.stringify(detail) : null, new Date().toISOString());
}

// نسخة احتياطية متسقة (VACUUM INTO) أثناء التشغيل
function backupTo(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) throw new Error('الملف موجود');
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  return file;
}

module.exports = { db, tx, nextCounter, audit, getSettings, setSetting, getServices, setServices, DEFAULT_SETTINGS, backupTo };
