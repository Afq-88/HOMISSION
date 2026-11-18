'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { db, audit, getSettings, setSetting, getServices, setServices, DEFAULT_SETTINGS, newRefCode } = require('./db');
const S = require('./services');
const U = require('./util');
const R = require('./requests');
const REP = require('./reports');
const { runBackup, listBackups } = require('./backup');
const { HttpError } = U;

const COOKIE = 'tsid';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };

// ---------- تحديد المعدل (في الذاكرة) ----------
const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr); return true;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

const clientIp = req => (cfg.TRUST_PROXY && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress) || '?';
const secure = req => cfg.COOKIE_SECURE || (cfg.TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');

// ---------- مساعدات HTTP ----------
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
const sendJson = (res, status, obj, headers) => send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', ...headers });
function readBody(req, limit = 200 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(new HttpError(413, 'الطلب كبير جدًا')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!size) return resolve({});
      try { const j = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(j && typeof j === 'object' ? j : {}); } catch { reject(new HttpError(400, 'صيغة البيانات غير صحيحة')); }
    });
    req.on('error', reject);
  });
}
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function setCookie(req, res, val, maxAgeSec) {
  const parts = [`${COOKIE}=${val}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSec}`];
  if (secure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

// ---------- المصادقة ----------
function sessionUser(req) {
  const t = parseCookies(req)[COOKIE];
  if (!t) return null;
  const h = U.sha256(t);
  const row = db.prepare(`SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(h);
  if (!row || !row.active || row.expires_at < new Date().toISOString()) { if (row) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(h); return null; }
  const exp = new Date(Date.now() + cfg.SESSION_HOURS * 3600e3).toISOString();
  if (new Date(row.expires_at).getTime() - Date.now() < cfg.SESSION_HOURS * 1800e3) db.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=?').run(exp, h);
  return row;
}
const publicUser = u => ({ id: u.id, username: u.username, display_name: u.display_name, role: u.role, must_change: !!u.must_change, dept_id: u.dept_id || null });
const DUMMY = U.hashPassword('dummy-password-1');

function login(req, res, body) {
  const username = U.clean(body.username, 40).toLowerCase(), password = typeof body.password === 'string' ? body.password : '';
  const ip = clientIp(req);
  if (!rateLimit('login:' + ip + ':' + username, 6, 15 * 60e3) || !rateLimit('login:' + ip, 40, 15 * 60e3) || !rateLimit('loginuser:' + username, 25, 15 * 60e3)) throw new HttpError(429, 'محاولات كثيرة. انتظر ١٥ دقيقة ثم حاول مجددًا.');
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  const ok = U.verifyPassword(password, u ? u.pass_hash : DUMMY);
  if (!u || !ok || !u.active) { audit('محاولة دخول', 'login_failed', { username, ip }); throw new HttpError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة'); }
  const t = U.token(); const now = new Date();
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(U.sha256(t), u.id, now.toISOString(), new Date(now.getTime() + cfg.SESSION_HOURS * 3600e3).toISOString());
  db.prepare('UPDATE users SET last_login=? WHERE id=?').run(now.toISOString(), u.id);
  setCookie(req, res, t, cfg.SESSION_HOURS * 3600);
  audit(u, 'login', null);
  return publicUser(u);
}

// ---------- الإعدادات ----------
const SETTING_RULES = {
  event_name: ['str', 100], ref_prefix: ['code', 12], event_code: ['code', 12], event_start: ['date'], event_end: ['date'], accepting: ['bool'],
  closed_message: ['str', 300], public_base_url: ['url'], official_channel_text: ['str', 300], official_channel_url: ['str', 300], emergency_number: ['str', 30],
  response_promise: ['str', 300], whatsapp_link_enabled: ['bool'], retention_archive_days: ['int', 1, 3650], retention_delete_days: ['int', 1, 3650],
  kiosk_idle_seconds: ['int', 30, 900], kiosk_warn_seconds: ['int', 10, 120], rate_limit_per_10min: ['int', 5, 2000], followup_template: ['str', 1500], privacy_text: ['str', 800],
};
function sanitizeSettings(input) {
  const out = {}, errors = {};
  for (const [k, rule] of Object.entries(SETTING_RULES)) {
    if (!(k in input)) continue;
    const v = input[k];
    switch (rule[0]) {
      case 'str': out[k] = typeof v === 'string' ? v.trim().slice(0, rule[1]) : ''; break;
      case 'code': if (typeof v === 'string' && /^[A-Za-z0-9]{2,12}$/.test(v.trim())) out[k] = v.trim().toUpperCase(); else errors[k] = 'أحرف إنجليزية وأرقام فقط (٢–١٢)'; break;
      case 'date': if (U.isDate(U.clean(v, 10))) out[k] = U.clean(v, 10); else errors[k] = 'تاريخ غير صحيح'; break;
      case 'bool': out[k] = v === true || v === 'true' || v === 1; break;
      case 'int': { const n = parseInt(U.normDigits(v), 10); if (Number.isFinite(n) && n >= rule[1] && n <= rule[2]) out[k] = n; else errors[k] = `رقم بين ${rule[1]} و${rule[2]}`; break; }
      case 'url': { const s = typeof v === 'string' ? v.trim().replace(/\/+$/, '') : ''; if (!s || /^https?:\/\/[^\s]+$/.test(s)) out[k] = s; else errors[k] = 'رابط غير صحيح'; break; }
    }
  }
  if (Object.keys(errors).length) throw new HttpError(422, 'تحقق من الإعدادات', { fields: errors });
  return out;
}

function publicConfig() {
  const s = getSettings();
  const services = getServices().filter(x => x.active !== false).map(x => ({ ...x, fields: x.fields.filter(f => f.active !== false) }));
  return {
    event: { name: s.event_name, start: s.event_start, end: s.event_end, accepting: s.accepting, closed_message: s.closed_message },
    privacy_text: s.privacy_text, emergency_number: s.emergency_number, kiosk: { idle: s.kiosk_idle_seconds, warn: s.kiosk_warn_seconds },
    services, countries: U.COUNTRIES.map(c => ({ cc: c.cc, name: c.name, iso: c.iso, len: c.len, first: c.first.source })), party: S.PARTY, channels: S.CHANNELS, pref_times: S.PREF_TIMES,
    unknown_label: S.UNKNOWN_LABEL, unknown: S.UNKNOWN,
    logo: fs.existsSync(path.join(cfg.PUBLIC_DIR, 'brand', 'logo.png')) ? '/brand/logo.png' : null,
  };
}

// ---------- المسارات ----------
const routes = [];
const route = (method, pattern, opts, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), opts, fn });
const needAdmin = { auth: 'admin' }, needUser = { auth: 'user' };

route('GET', '/healthz', {}, (c) => { db.prepare('SELECT 1').get(); return { ok: true }; });
route('GET', '/api/public/config', {}, () => publicConfig());

route('POST', '/api/public/requests', {}, (c) => {
  const s = getSettings();
  if (!s.accepting) throw new HttpError(403, s.closed_message || 'استقبال الطلبات متوقف حاليًا');
  if (c.body.website) throw new HttpError(400, 'طلب غير صالح');
  if (!rateLimit('submit:' + clientIp(c.req), s.rate_limit_per_10min, 600e3)) throw new HttpError(429, 'عدد المحاولات كبير. انتظر قليلًا ثم أعد المحاولة.');
  const key = String(c.req.headers['idempotency-key'] || '').trim();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) throw new HttpError(400, 'مفتاح الإرسال مفقود');
  let source = S.PUBLIC_SOURCES.includes(c.body.source) ? c.body.source : 'web';
  let tag = U.clean(c.body.tag, 30); if (!/^[A-Za-z0-9_-]{1,30}$/.test(tag)) tag = null;
  let assignTo = null;
  const repCode = U.clean(c.body.rep, 20).toLowerCase();
  if (repCode) { const u = db.prepare('SELECT id FROM users WHERE ref_code=? AND active=1').get(repCode); if (u) { assignTo = u.id; source = 'rep'; } }
  const r = R.createRequest(c.body, { source, idemKey: key, tag, assignTo });
  c.status = r.replay ? 200 : 201;
  return { ok: true, replay: r.replay, receipt: R.receiptFor(r.row, r.settings) };
});

// ----- الجهاز اللوحي: نبض + أوامر التحكم عن بعد (لا تحمل أي بيانات عملاء) -----
route('POST', '/api/public/kiosk/ping', {}, c => {
  const id = String(c.body.device || '');
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(id)) throw new HttpError(400, 'معرّف الجهاز غير صالح');
  if (!rateLimit('ping:' + clientIp(c.req), 240, 60e3)) throw new HttpError(429, 'كثير');
  const now = new Date().toISOString(), screen = U.clean(c.body.screen, 20);
  let d = db.prepare('SELECT * FROM kiosk_devices WHERE id=?').get(id);
  if (!d) {
    if (db.prepare('SELECT COUNT(*) n FROM kiosk_devices').get().n >= 100) throw new HttpError(429, 'عدد الأجهزة كبير');
    db.prepare('INSERT INTO kiosk_devices(id,name,first_seen,last_seen,screen) VALUES(?,?,?,?,?)').run(id, 'جهاز ' + id.slice(0, 4).toUpperCase(), now, now, screen);
    d = db.prepare('SELECT * FROM kiosk_devices WHERE id=?').get(id);
  } else db.prepare('UPDATE kiosk_devices SET last_seen=?, screen=?, pending=? WHERE id=?').run(now, screen, '[]', id);
  const s = getSettings();
  return { commands: JSON.parse(d.pending || '[]'), paused: !!d.paused, pause_msg: d.pause_msg || '', banner: d.banner || '', accepting: s.accepting, name: d.name };
});

route('POST', '/api/auth/login', {}, c => ({ user: login(c.req, c.res, c.body) }));
route('POST', '/api/auth/logout', {}, c => {
  const t = parseCookies(c.req)[COOKIE]; if (t) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(U.sha256(t));
  setCookie(c.req, c.res, '', 0); return { ok: true };
});
route('GET', '/api/auth/me', {}, c => ({ user: c.user ? publicUser(c.user) : null }));
route('POST', '/api/auth/password', { auth: 'user', allowMustChange: true }, c => {
  const { current, next } = c.body;
  if (!U.verifyPassword(String(current || ''), c.user.pass_hash)) throw new HttpError(401, 'كلمة المرور الحالية غير صحيحة');
  const prob = U.passwordProblem(next); if (prob) throw new HttpError(422, prob);
  if (next === current) throw new HttpError(422, 'اختر كلمة مرور مختلفة عن الحالية');
  db.prepare('UPDATE users SET pass_hash=?, must_change=0 WHERE id=?').run(U.hashPassword(next), c.user.id);
  const keep = U.sha256(parseCookies(c.req)[COOKIE] || '');
  db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash!=?').run(c.user.id, keep);
  audit(c.user, 'password_change', null); return { ok: true };
});

// ----- الموظف -----
route('GET', '/api/staff/config', needUser, c => {
  const s = getSettings();
  const users = c.user.role === 'admin' ? db.prepare('SELECT id, display_name, role, dept_id FROM users WHERE active=1 ORDER BY display_name').all() : [{ id: c.user.id, display_name: c.user.display_name, role: c.user.role, dept_id: c.user.dept_id || null }];
  return { ...publicConfig(), departments: db.prepare('SELECT id,name,color,active FROM departments ORDER BY sort,id').all(), all_services: getServices(), statuses: S.STATUSES, outcomes: S.OUTCOMES, note_required: S.NOTE_REQUIRED_OUTCOMES, sources: S.SOURCES, users,
    settings: { event_code: s.event_code, whatsapp_link_enabled: s.whatsapp_link_enabled, public_base_url: s.public_base_url }, me: publicUser(c.user) };
});
route('GET', '/api/staff/stats', needUser, c => R.statsFor(c.user));
route('GET', '/api/staff/live', needUser, c => {
  const out = R.liveFeed(c.user, c.query.since === undefined ? -1 : parseInt(c.query.since, 10));
  if (c.user.role === 'admin') { const cut = new Date(Date.now() - 25e3).toISOString(); const k = db.prepare('SELECT COUNT(*) total, SUM(last_seen>?) online FROM kiosk_devices').get(cut); out.kiosks = { total: k.total, online: k.online || 0 }; }
  return out;
});
route('GET', '/api/staff/requests', needUser, c => R.listRequests(c.query, c.user));
route('POST', '/api/staff/requests', needUser, c => {
  const key = String(c.req.headers['idempotency-key'] || '').trim();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) throw new HttpError(400, 'مفتاح الإرسال مفقود');
  const body = { ...c.body, assisted_by: c.user.display_name };
  const r = R.createRequest(body, { source: 'staff', createdBy: c.user.id, idemKey: key, isTest: !!c.body.is_test, actor: c.user });
  c.status = r.replay ? 200 : 201;
  return { ok: true, replay: r.replay, id: r.row.id, receipt: R.receiptFor(r.row, r.settings) };
});
route('GET', '/api/staff/requests/:id', needUser, c => R.getRequest(+c.params.id, c.user));
route('PATCH', '/api/staff/requests/:id', needUser, c => R.updateRequest(+c.params.id, c.body, c.user));
route('POST', '/api/staff/requests/:id/contacts', needUser, c => R.addContact(+c.params.id, c.body, c.user));
route('GET', '/api/staff/requests/:id/message', needUser, c => R.followupMessage(+c.params.id, c.user));

// ----- المدير -----
route('GET', '/api/admin/users', needAdmin, () => ({ users: db.prepare('SELECT id,username,display_name,role,active,must_change,created_at,last_login,dept_id,ref_code FROM users ORDER BY id').all() }));
route('POST', '/api/admin/users', needAdmin, c => {
  const username = U.clean(c.body.username, 32).toLowerCase(), display = U.clean(c.body.display_name, 80), role = c.body.role === 'admin' ? 'admin' : 'staff';
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new HttpError(422, 'اسم المستخدم: ٣–٣٢ حرفًا إنجليزيًا أو أرقامًا (. _ -)');
  if (display.length < 2) throw new HttpError(422, 'أدخل اسم العرض');
  if (db.prepare('SELECT 1 FROM users WHERE username=?').get(username)) throw new HttpError(409, 'اسم المستخدم مستخدم مسبقًا');
  const pw = U.strongPassword();
  const info = db.prepare('INSERT INTO users(username,display_name,role,pass_hash,must_change,created_at) VALUES(?,?,?,?,1,?)').run(username, display, role, U.hashPassword(pw), new Date().toISOString());
  audit(c.user, 'user_create', { username, role });
  c.status = 201; return { id: info.lastInsertRowid, username, temp_password: pw, note: 'تُعرض كلمة المرور المؤقتة مرة واحدة فقط، وسيُطلب تغييرها عند أول دخول.' };
});
route('PATCH', '/api/admin/users/:id', needAdmin, c => {
  const id = +c.params.id, u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (!u) throw new HttpError(404, 'المستخدم غير موجود');
  const set = {};
  if (typeof c.body.display_name === 'string' && U.clean(c.body.display_name, 80).length >= 2) set.display_name = U.clean(c.body.display_name, 80);
  if (c.body.role && ['admin', 'staff'].includes(c.body.role)) set.role = c.body.role;
  if ('active' in c.body) set.active = c.body.active ? 1 : 0;
  if ('dept_id' in c.body) {
    const dv = c.body.dept_id === null || c.body.dept_id === '' ? null : +c.body.dept_id;
    if (dv !== null && !db.prepare('SELECT 1 FROM departments WHERE id=?').get(dv)) throw new HttpError(422, 'الإدارة غير موجودة');
    set.dept_id = dv;
  }
  const admins = db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin' AND active=1 AND id!=?").get(id).n;
  if (u.role === 'admin' && u.active && admins === 0 && ((set.role && set.role !== 'admin') || set.active === 0)) throw new HttpError(409, 'لا يمكن تعطيل أو تنزيل آخر مدير نشط');
  if (id === c.user.id && (set.active === 0 || (set.role && set.role !== 'admin'))) throw new HttpError(409, 'لا يمكنك تعطيل حسابك أو تغيير صلاحيتك بنفسك');
  if (!Object.keys(set).length) return { ok: true };
  db.prepare(`UPDATE users SET ${Object.keys(set).map(k => k + '=@' + k).join(',')} WHERE id=@id`).run({ ...set, id });
  if (set.active === 0 || set.role) db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
  if (set.dept_id !== undefined && Object.keys(set).length === 1) { /* لا حاجة لإنهاء الجلسات */ }
  audit(c.user, 'user_update', { id, ...set }); return { ok: true };
});
route('POST', '/api/admin/users/:id/reset', needAdmin, c => {
  const id = +c.params.id; if (!db.prepare('SELECT 1 FROM users WHERE id=?').get(id)) throw new HttpError(404, 'المستخدم غير موجود');
  const pw = U.strongPassword();
  db.prepare('UPDATE users SET pass_hash=?, must_change=1 WHERE id=?').run(U.hashPassword(pw), id);
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
  audit(c.user, 'user_reset_password', { id }); return { temp_password: pw };
});
route('POST', '/api/admin/users/:id/refcode', needAdmin, c => {
  const id = +c.params.id; if (!db.prepare('SELECT 1 FROM users WHERE id=?').get(id)) throw new HttpError(404, 'المستخدم غير موجود');
  const code = newRefCode(); db.prepare('UPDATE users SET ref_code=? WHERE id=?').run(code, id); audit(c.user, 'refcode_regen', { id }); return { ref_code: code };
});
// ----- الإدارات -----
route('GET', '/api/admin/departments', needAdmin, () => ({ departments: db.prepare(`SELECT d.*, (SELECT COUNT(*) FROM requests r WHERE r.dept_id=d.id) requests FROM departments d ORDER BY sort,id`).all() }));
route('POST', '/api/admin/departments', needAdmin, c => {
  const name = U.clean(c.body.name, 60), color = /^#[0-9a-fA-F]{6}$/.test(c.body.color || '') ? c.body.color : '#2e2c78';
  if (name.length < 2) throw new HttpError(422, 'أدخل اسم الإدارة');
  if (db.prepare('SELECT 1 FROM departments WHERE name=?').get(name)) throw new HttpError(409, 'الاسم مستخدم');
  const max = db.prepare('SELECT COALESCE(MAX(sort),0)+1 n FROM departments').get().n;
  const info = db.prepare('INSERT INTO departments(name,color,sort) VALUES(?,?,?)').run(name, color, max);
  audit(c.user, 'dept_create', { name }); c.status = 201; return { id: info.lastInsertRowid };
});
route('PATCH', '/api/admin/departments/:id', needAdmin, c => {
  const id = +c.params.id, d = db.prepare('SELECT * FROM departments WHERE id=?').get(id); if (!d) throw new HttpError(404, 'الإدارة غير موجودة');
  const set = {};
  if (typeof c.body.name === 'string' && U.clean(c.body.name, 60).length >= 2) set.name = U.clean(c.body.name, 60);
  if (/^#[0-9a-fA-F]{6}$/.test(c.body.color || '')) set.color = c.body.color;
  if ('active' in c.body) set.active = c.body.active ? 1 : 0;
  if (Number.isInteger(c.body.sort)) set.sort = c.body.sort;
  if (set.name && db.prepare('SELECT 1 FROM departments WHERE name=? AND id!=?').get(set.name, id)) throw new HttpError(409, 'الاسم مستخدم');
  if (!Object.keys(set).length) return { ok: true };
  db.prepare(`UPDATE departments SET ${Object.keys(set).map(k => k + '=@' + k).join(',')} WHERE id=@id`).run({ ...set, id });
  audit(c.user, 'dept_update', { id, ...set }); return { ok: true };
});
route('DELETE', '/api/admin/departments/:id', needAdmin, c => {
  const id = +c.params.id;
  const used = db.prepare('SELECT (SELECT COUNT(*) FROM requests WHERE dept_id=@i)+(SELECT COUNT(*) FROM users WHERE dept_id=@i) n').get({ i: id }).n + getServices().filter(x => x.dept_id === id).length;
  if (used) throw new HttpError(409, 'الإدارة مرتبطة بطلبات أو خدمات أو مستخدمين؛ عطّلها بدل حذفها.');
  db.prepare('DELETE FROM departments WHERE id=?').run(id); audit(c.user, 'dept_delete', { id }); return { ok: true };
});
// ----- أجهزة الجناح والتحكم عن بعد -----
route('GET', '/api/admin/kiosks', needAdmin, () => {
  const cut = Date.now() - 25e3;
  return { kiosks: db.prepare('SELECT * FROM kiosk_devices ORDER BY last_seen DESC').all().map(d => ({ ...d, pending: JSON.parse(d.pending || '[]'), online: new Date(d.last_seen).getTime() > cut,
    requests: db.prepare("SELECT COUNT(*) n FROM requests WHERE tag=? AND is_test=0").get(d.id).n })) };
});
route('POST', '/api/admin/kiosks/:id', needAdmin, c => {
  const id = c.params.id, d = db.prepare('SELECT * FROM kiosk_devices WHERE id=?').get(id); if (!d) throw new HttpError(404, 'الجهاز غير موجود');
  const b = c.body, act = b.action;
  if (act === 'rename') { const n = U.clean(b.name, 40); if (n.length < 2) throw new HttpError(422, 'اسم قصير'); db.prepare('UPDATE kiosk_devices SET name=? WHERE id=?').run(n, id); }
  else if (act === 'pause') db.prepare('UPDATE kiosk_devices SET paused=1, pause_msg=? WHERE id=?').run(U.clean(b.message, 200) || 'الجهاز متوقف مؤقتًا، يرجى التوجه إلى موظف الجناح.', id);
  else if (act === 'resume') db.prepare('UPDATE kiosk_devices SET paused=0, pause_msg=NULL WHERE id=?').run(id);
  else if (act === 'banner') db.prepare('UPDATE kiosk_devices SET banner=? WHERE id=?').run(U.clean(b.message, 200) || null, id);
  else if (act === 'reset' || act === 'reload') { const p = JSON.parse(d.pending || '[]'); if (!p.includes(act)) p.push(act); db.prepare('UPDATE kiosk_devices SET pending=? WHERE id=?').run(JSON.stringify(p), id); }
  else if (act === 'forget') db.prepare('DELETE FROM kiosk_devices WHERE id=?').run(id);
  else throw new HttpError(422, 'أمر غير معروف');
  audit(c.user, 'kiosk_' + act, { id, name: d.name }); return { ok: true };
});
route('GET', '/api/admin/settings', needAdmin, () => ({ settings: getSettings(), defaults_note: Object.keys(DEFAULT_SETTINGS) }));
route('PUT', '/api/admin/settings', needAdmin, c => {
  const clean = sanitizeSettings(c.body); const before = getSettings();
  for (const [k, v] of Object.entries(clean)) setSetting(k, v);
  audit(c.user, 'settings_update', Object.fromEntries(Object.keys(clean).filter(k => JSON.stringify(before[k]) !== JSON.stringify(clean[k])).map(k => [k, [before[k], clean[k]]])));
  return { settings: getSettings() };
});
route('GET', '/api/admin/services', needAdmin, () => ({ services: getServices() }));
route('PUT', '/api/admin/services', needAdmin, c => {
  const cur = getServices(); const next = S.sanitizeServices(c.body.services, cur);
  if (!next.some(s => s.active)) throw new HttpError(422, 'يجب إبقاء خدمة واحدة على الأقل مفعّلة');
  for (const sv of next) if (sv.dept_id && !db.prepare('SELECT 1 FROM departments WHERE id=?').get(sv.dept_id)) throw new HttpError(422, 'إدارة غير موجودة في الخدمة: ' + sv.label);
  setServices(next); audit(c.user, 'services_update', null); return { services: next };
});
route('GET', '/api/admin/reports/summary', needAdmin, c => REP.summary(c.query));
route('GET', '/api/admin/reports/pivot', needAdmin, c => REP.pivot(c.query));
route('GET', '/api/admin/export/pivot.csv', needAdmin, c => {
  const { csv, count } = REP.pivotCsv(c.query); audit(c.user, 'export', { kind: 'pivot', by: c.query.by });
  return { raw: csv, type: 'text/csv; charset=utf-8', headers: { 'Content-Disposition': `attachment; filename="talabak-report-${U.kuwaitToday()}.csv"`, 'X-Row-Count': String(count) } };
});
route('GET', '/api/admin/export/requests.csv', needAdmin, c => {
  const pii = c.query.pii === '1';
  const { csv, count } = REP.requestsCsv(c.query, c.user, pii);
  audit(c.user, 'export', { kind: 'requests', pii, count, filters: c.query });
  return { raw: csv, type: 'text/csv; charset=utf-8', headers: { 'Content-Disposition': `attachment; filename="talabak-requests${pii ? '-with-contacts' : ''}-${U.kuwaitToday()}.csv"`, 'X-Row-Count': String(count) } };
});
route('GET', '/api/admin/export/summary.csv', needAdmin, c => {
  const { csv, count } = REP.summaryCsv(REP.summary(c.query));
  audit(c.user, 'export', { kind: 'summary' });
  return { raw: csv, type: 'text/csv; charset=utf-8', headers: { 'Content-Disposition': `attachment; filename="talabak-summary-${U.kuwaitToday()}.csv"`, 'X-Row-Count': String(count) } };
});
route('GET', '/api/admin/duplicates', needAdmin, c => ({ groups: R.duplicateGroups(c.query.event || getSettings().event_code) }));
route('POST', '/api/admin/retention', needAdmin, c => {
  const s = getSettings();
  const a = c.body.archive ? s.retention_archive_days : null, d = c.body.delete ? s.retention_delete_days : null;
  return R.applyRetention(c.user, { archiveDays: a, deleteDays: d, dryRun: c.body.dryRun !== false });
});
route('DELETE', '/api/admin/requests/:id', needAdmin, c => { R.deleteRequest(+c.params.id, c.user); return { ok: true }; });
route('GET', '/api/admin/backups', needAdmin, () => ({ backups: listBackups(), dir: cfg.BACKUP_DIR }));
route('GET', '/api/admin/backups/:file/download', needAdmin, c => {
  const f = c.params.file;
  if (!/^talabak-[A-Za-z0-9._-]+\.db$/.test(f)) throw new HttpError(400, 'اسم الملف غير صالح');
  const full = path.join(cfg.BACKUP_DIR, f);
  if (!fs.existsSync(full)) throw new HttpError(404, 'النسخة غير موجودة');
  audit(c.user, 'backup_download', { file: f });
  return { sendFile: full, type: 'application/octet-stream', headers: { 'Content-Disposition': `attachment; filename="${f}"` } };
});
route('POST', '/api/admin/backups', needAdmin, c => { const b = runBackup('manual'); audit(c.user, 'backup', b); c.status = 201; return b; });
route('GET', '/api/admin/audit', needAdmin, c => {
  const limit = Math.min(500, parseInt(c.query.limit, 10) || 100);
  return { rows: db.prepare('SELECT id,request_id,actor,action,detail,created_at FROM audit ORDER BY id DESC LIMIT ?').all(limit).map(r => ({ ...r, detail: r.detail ? JSON.parse(r.detail) : null })) };
});

// ---------- الخادم ----------
function serveStatic(req, res, pathname) {
  let rel = pathname;
  if (rel === '/' || rel === '/kiosk') rel = '/index.html';
  else if (rel === '/staff' || rel === '/staff/') rel = '/staff.html';
  const file = path.normalize(path.join(cfg.PUBLIC_DIR, rel));
  if (!file.startsWith(cfg.PUBLIC_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const ext = path.extname(file);
  const isHtml = ext === '.html';
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': isHtml || rel === '/sw.js' ? 'no-cache' : 'public, max-age=300', ...(isHtml && rel === '/staff.html' ? { 'Cache-Control': 'no-store' } : {}) });
  fs.createReadStream(file).pipe(res);
  return true;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  for (const [k, v] of Object.entries(SEC_HEADERS)) res.setHeader(k, v);
  if (secure(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  const pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith('/api/') && pathname !== '/healthz') {
    if ((req.method === 'GET' || req.method === 'HEAD') && serveStatic(req, res, pathname)) return;
    return send(res, 404, 'غير موجود', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  try {
    const query = Object.fromEntries(url.searchParams);
    let matched = null, params = null;
    for (const r of routes) { if (r.method !== req.method) continue; const m = r.re.exec(pathname); if (m) { matched = r; params = m.groups || {}; break; } }
    if (!matched) throw new HttpError(404, 'المسار غير موجود');
    const user = sessionUser(req);
    const unsafe = req.method !== 'GET' && req.method !== 'HEAD';
    if (unsafe) {
      if (req.headers['x-requested-with'] !== 'talabak') throw new HttpError(403, 'طلب غير مصرّح');
      const origin = req.headers.origin; if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'مصدر الطلب غير مسموح');
    }
    const auth = matched.opts.auth;
    if (auth) {
      if (!user) throw new HttpError(401, 'سجّل الدخول للمتابعة');
      if (user.must_change && !matched.opts.allowMustChange) throw new HttpError(403, 'يجب تغيير كلمة المرور أولًا', { must_change: true });
      if (auth === 'admin' && user.role !== 'admin') throw new HttpError(403, 'هذه الصلاحية للمدير فقط');
    }
    const body = unsafe ? await readBody(req) : {};
    const c = { req, res, user, query, params, body, status: 200 };
    const out = matched.fn(c);
    if (out && out.sendFile) { res.writeHead(200, { 'Content-Type': out.type, 'Cache-Control': 'no-store', ...out.headers }); fs.createReadStream(out.sendFile).pipe(res); return; }
    if (out && out.raw !== undefined) return send(res, 200, out.raw, { 'Content-Type': out.type, ...out.headers });
    return sendJson(res, c.status, out);
  } catch (e) {
    if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message, ...(e.extra || {}) });
    console.error('[خطأ]', req.method, req.url, e);
    return sendJson(res, 500, { error: 'تعذّر تنفيذ الطلب. لم يُحفظ شيء. حاول مرة أخرى.' });
  }
}

function createServer() { return http.createServer((req, res) => { handle(req, res); }); }
module.exports = { createServer };
