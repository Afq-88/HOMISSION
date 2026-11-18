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
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#2e2c78',
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kiosk_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  screen TEXT,
  paused INTEGER NOT NULL DEFAULT 0,
  pause_msg TEXT,
  banner TEXT,
  pending TEXT NOT NULL DEFAULT '[]'
);
`);
function ensureColumn(table, col, def) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
ensureColumn('requests', 'dept_id', 'INTEGER REFERENCES departments(id)');
ensureColumn('requests', 'tag', 'TEXT');
ensureColumn('users', 'dept_id', 'INTEGER REFERENCES departments(id)');
ensureColumn('users', 'ref_code', 'TEXT');
ensureColumn('users', 'totp_secret', 'TEXT');
ensureColumn('users', 'totp_enabled', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('users', 'totp_last_step', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('users', 'recovery', "TEXT NOT NULL DEFAULT '[]'");
ensureColumn('sessions', 'reauth_until', 'TEXT');
ensureColumn('audit', 'hash', 'TEXT');
ensureColumn('audit', 'dhash', 'TEXT');
ensureColumn('requests', 'anonymized', 'INTEGER NOT NULL DEFAULT 0');
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ix_users_ref ON users(ref_code); CREATE INDEX IF NOT EXISTS ix_req_dept ON requests(dept_id);
CREATE TRIGGER IF NOT EXISTS trg_users_ref AFTER INSERT ON users WHEN NEW.ref_code IS NULL BEGIN UPDATE users SET ref_code = lower(hex(randomblob(4))) WHERE id = NEW.id; END;`);

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
  retention_anonymize_days: 90,
  require_2fa: true,
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

// ---------- الإدارات (افتراضية قابلة للتعديل بالكامل من لوحة المدير) ----------
const DEFAULT_DEPTS = [
  ['customer', 'خدمة العملاء والاشتراكات', '#2e2c78'], ['ops', 'التشغيل والنقل الخاص', '#1b5a9a'], ['marketing', 'التسويق والعلاقات العامة', '#b07e12'],
  ['towing', 'إدارة الأوناش', '#b3261e'], ['workshops', 'إدارة الورش', '#1e7f55'],
];
const SERVICE_DEPT = { subscriptions: 'customer', charter: 'ops', ads: 'marketing', towing: 'towing', workshop: 'workshops', other: 'customer' };
if (!db.prepare('SELECT 1 FROM departments LIMIT 1').get()) {
  DEFAULT_DEPTS.forEach(([k, n, c], i) => db.prepare('INSERT INTO departments(key,name,color,sort) VALUES(?,?,?,?)').run(k, n, c, i));
}
(function syncServices() {
  const list = getServices(); let changed = false;
  for (const sv of list) {
    const def = DEFAULT_SERVICES.find(x => x.id === sv.id);
    if (def && !sv.img && def.img) { sv.img = def.img; changed = true; }
    if (!sv.dept_id) { const d = db.prepare('SELECT id FROM departments WHERE key=?').get(SERVICE_DEPT[sv.id] || 'customer'); if (d) { sv.dept_id = d.id; changed = true; } }
  }
  if (changed) setServices(list);
  // ترحيل: الطلبات القديمة بلا إدارة تُسنَد إلى إدارة خدمتها
  for (const sv of list) if (sv.dept_id) db.prepare('UPDATE requests SET dept_id=? WHERE dept_id IS NULL AND service=?').run(sv.dept_id, sv.id);
})();
// رمز رابط المندوب الميداني لكل مستخدم
function newRefCode() { return require('crypto').randomBytes(5).toString('base64url').replace(/[-_]/g, 'x').slice(0, 7).toLowerCase(); }
for (const u of db.prepare('SELECT id FROM users WHERE ref_code IS NULL').all()) db.prepare('UPDATE users SET ref_code=? WHERE id=?').run(newRefCode(), u.id);

// ---------- معاملات ----------
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch { /* */ } throw e; }
}
function nextCounter(name) {
  db.prepare('INSERT INTO counters(name,value) VALUES(?,1) ON CONFLICT(name) DO UPDATE SET value=value+1').run(name);
  return db.prepare('SELECT value FROM counters WHERE name=?').get(name).value;
}

// ---------- سجل العمليات: سلسلة تجزئة مقاومة للتلاعب ----------
// كل سطر يضم تجزئة السطر السابق. أي تعديل أو حذف لسطر قديم يكسر السلسلة ويكشفه التحقق.
// تجزئة «التفاصيل» محفوظة منفصلة (dhash) ليمكن مسح التفاصيل الشخصية عند إخفاء الهوية دون كسر السلسلة.
const sha = x => require('crypto').createHash('sha256').update(x).digest('hex');
const entryHash = (prev, r, dh) => sha([prev, r.created_at, r.actor || '', r.action, r.request_id ?? '', r.user_id ?? '', dh].join('|'));
function audit(actor, action, detail, requestId = null) {
  const row = {
    request_id: requestId, user_id: actor && actor.id ? actor.id : null, actor: actor ? (actor.display_name || actor.name || String(actor)) : 'النظام',
    action, created_at: new Date().toISOString(),
  };
  const det = detail ? JSON.stringify(detail) : null;
  const dh = sha(det || '');
  const prev = (db.prepare('SELECT hash FROM audit WHERE hash IS NOT NULL ORDER BY id DESC LIMIT 1').get() || {}).hash || '';
  db.prepare('INSERT INTO audit(request_id,user_id,actor,action,detail,created_at,hash,dhash) VALUES(?,?,?,?,?,?,?,?)')
    .run(row.request_id, row.user_id, row.actor, row.action, det, row.created_at, entryHash(prev, row, dh), dh);
}
function verifyAudit() {
  let prev = '', checked = 0, legacy = 0;
  for (const r of db.prepare('SELECT * FROM audit ORDER BY id').iterate()) {
    if (!r.hash) { legacy++; continue; }
    if (r.detail != null && sha(r.detail) !== r.dhash) return { ok: false, checked, legacy, brokenAt: r.id, reason: 'تفاصيل السطر عُدِّلت' };
    if (entryHash(prev, r, r.dhash) !== r.hash) return { ok: false, checked, legacy, brokenAt: r.id, reason: 'السلسلة مكسورة (تعديل أو حذف)' };
    prev = r.hash; checked++;
  }
  return { ok: true, checked, legacy };
}

// نسخة احتياطية متسقة (VACUUM INTO) أثناء التشغيل
function backupTo(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) throw new Error('الملف موجود');
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  return file;
}

module.exports = { verifyAudit, newRefCode, db, tx, nextCounter, audit, getSettings, setSetting, getServices, setServices, DEFAULT_SETTINGS, backupTo };
