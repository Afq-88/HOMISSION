'use strict';
const { db, tx, nextCounter, audit, getSettings, getServices } = require('./db');
const S = require('./services');
const { clean, normDigits, HttpError, kuwaitToday, isDate, maskPhone } = require('./util');
const cfg = require('./config');

const OFF = `'+${cfg.TZ_OFFSET_HOURS} hours'`;
const BASE = `SELECT r.*, a.display_name AS assignee_name, c.display_name AS creator_name,
  (SELECT COUNT(*) FROM contact_log l WHERE l.request_id=r.id AND l.kind!='note') AS contacts
  FROM requests r LEFT JOIN users a ON a.id=r.assigned_to LEFT JOIN users c ON c.id=r.created_by`;

function dto(r) {
  if (!r) return null;
  const x = { ...r };
  try { x.payload = JSON.parse(r.payload || '{}'); } catch { x.payload = {}; }
  try { x.missing = JSON.parse(r.missing || '[]'); } catch { x.missing = []; }
  delete x.idem_key;
  return x;
}
const serviceById = id => getServices().find(s => s.id === id);

function receiptFor(row, settings) {
  const svc = serviceById(row.service) || { label: row.service, fields: [] };
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  return {
    ref: row.ref,
    received_at: row.received_at,
    event_name: settings.event_name,
    service: svc.label,
    customer: row.name,
    phone_masked: maskPhone(row.phone),
    summary: S.summarize(svc, payload),
    incomplete: (row.missing_count || 0) > 0,
    next_step: 'سيتم مراجعة طلبكم ومتابعته مع الجهة المختصة، وتحديد الخطوات التالية بعد المراجعة.' + (settings.response_promise ? ' ' + settings.response_promise : ''),
    channel_text: settings.official_channel_text || '',
    channel_url: settings.official_channel_url || '',
    emergency_number: svc.id === 'towing' ? (settings.emergency_number || '') : '',
    confirmation: `شكرًا لزيارتكم جناح شركة النقل العام الكويتية. تم استلام طلبكم برقم (${row.ref}) لمراجعته ومتابعته. تسجيل الطلب لا يُعد تأكيدًا للحجز أو تفعيلًا للخدمة، وتخضع الأسعار والتوافر للتأكيد من الجهة المختصة.`,
  };
}

function svcDate(service, payload) {
  const v = service.dateField ? payload[service.dateField] : null;
  return v && isDate(v) ? v : kuwaitToday(cfg.TZ_OFFSET_HOURS);
}

// ---------- إنشاء ----------
function createRequest(input, { source, createdBy = null, idemKey = null, isTest = false, actor = null }) {
  const settings = getSettings();
  const services = getServices();
  const v = S.validateRequest(services, input);
  if (v.hasErrors) throw new HttpError(422, 'تحقق من الحقول المحددة', { fields: v.errors });
  const { service, common, payload } = v;
  return tx(() => {
    if (idemKey) {
      const ex = db.prepare('SELECT * FROM requests WHERE idem_key=?').get(idemKey);
      if (ex) return { row: ex, replay: true, settings };
    }
    const code = `${settings.ref_prefix}-${settings.event_code}`;
    const seq = nextCounter(code);
    const ref = `${code}-${String(seq).padStart(6, '0')}`;
    const missing = S.computeMissing(service, common, payload);
    const date = svcDate(service, payload);
    const dup = db.prepare('SELECT MIN(id) AS id FROM requests WHERE phone_e164=? AND service=? AND svc_date=? AND is_dup=0').get(common.phone_e164, service.id, date);
    const now = new Date().toISOString();
    const info = db.prepare(`INSERT INTO requests(ref,event_code,service,status,name,phone_cc,phone,phone_e164,pref_channel,email,party_type,org_name,pref_time,notes,payload,missing,missing_count,svc_date,source,created_by,assisted_by,dup_of,is_test,idem_key,received_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      ref, settings.event_code, service.id, missing.length ? 'needs_info' : 'new', common.name, common.phone_cc, common.phone, common.phone_e164,
      common.pref_channel, common.email || null, common.party_type, common.org_name || null, common.pref_time || null, common.notes || null,
      JSON.stringify(payload), JSON.stringify(missing), missing.length, date, source, createdBy, common.assisted_by || null, dup.id || null,
      isTest ? 1 : 0, idemKey, now, now);
    const row = db.prepare('SELECT * FROM requests WHERE id=?').get(info.lastInsertRowid);
    audit(actor || 'الزائر', 'create', { ref, source, service: service.id, dup_of: dup.id || null }, row.id);
    return { row, replay: false, settings };
  });
}

// ---------- الاستعلام ----------
function filters(q, user) {
  const where = [], p = {};
  if (user.role !== 'admin') { where.push('(r.assigned_to = :uid OR r.assigned_to IS NULL)'); p.uid = user.id; }
  const s = clean(q.q, 80);
  if (s) {
    const like = '%' + s.replace(/[\\%_]/g, m => '\\' + m) + '%';
    const digits = s.replace(/\D/g, '');
    p.like = like;
    let cond = "r.ref LIKE :like ESCAPE '\\' OR r.name LIKE :like ESCAPE '\\' OR r.org_name LIKE :like ESCAPE '\\'";
    if (digits.length >= 3) { p.dl = '%' + digits + '%'; cond += ' OR r.phone_e164 LIKE :dl OR r.phone LIKE :dl'; }
    where.push('(' + cond + ')');
  }
  if (q.service) { where.push('r.service = :service'); p.service = clean(q.service, 40); }
  if (q.status) { where.push('r.status = :status'); p.status = clean(q.status, 30); }
  if (q.source) { where.push('r.source = :source'); p.source = clean(q.source, 30); }
  if (q.event) { where.push('r.event_code = :event'); p.event = clean(q.event, 30); }
  if (q.assigned === 'me') { where.push('r.assigned_to = :uid2'); p.uid2 = user.id; }
  else if (q.assigned === 'none') where.push('r.assigned_to IS NULL');
  else if (q.assigned && /^\d+$/.test(q.assigned) && user.role === 'admin') { where.push('r.assigned_to = :asg'); p.asg = +q.assigned; }
  const from = clean(q.from, 10), to = clean(q.to, 10);
  if (isDate(from)) { where.push(`date(r.received_at, ${OFF}) >= :from`); p.from = from; }
  if (isDate(to)) { where.push(`date(r.received_at, ${OFF}) <= :to`); p.to = to; }
  if (q.missing === '1') where.push('r.missing_count > 0');
  if (q.missing === '0') where.push('r.missing_count = 0');
  const today = kuwaitToday(cfg.TZ_OFFSET_HOURS);
  if (q.due === 'today') { where.push("r.follow_up_date = :today AND r.status NOT IN ('completed','closed')"); p.today = today; }
  if (q.due === 'overdue') { where.push("r.follow_up_date < :today AND r.status NOT IN ('completed','closed')"); p.today = today; }
  if (q.due === 'any') where.push("r.follow_up_date IS NOT NULL AND r.status NOT IN ('completed','closed')");
  if (q.contacted === '1') where.push("EXISTS (SELECT 1 FROM contact_log l WHERE l.request_id=r.id AND l.kind!='note')");
  if (q.contacted === '0') where.push("NOT EXISTS (SELECT 1 FROM contact_log l WHERE l.request_id=r.id AND l.kind!='note')");
  if (q.real === '1') where.push('r.is_test = 0 AND r.is_dup = 0');
  if (q.dup === '1') where.push('(r.dup_of IS NOT NULL OR r.is_dup = 1)');
  if (q.archived === '1') where.push('r.archived = 1');
  else if (q.archived !== 'all') where.push('r.archived = 0');
  return { where: where.length ? 'WHERE ' + where.join(' AND ') : '', p };
}

function listRequests(q, user, { forExport = false } = {}) {
  const { where, p } = filters(q, user);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM requests r ${where}`).get(p).n;
  const order = q.sort === 'followup' ? 'ORDER BY r.follow_up_date IS NULL, r.follow_up_date ASC, r.id DESC' : 'ORDER BY r.id DESC';
  let sql = `${BASE} ${where} ${order}`;
  const page = Math.max(1, parseInt(q.page, 10) || 1), size = Math.min(200, Math.max(5, parseInt(q.size, 10) || 50));
  if (!forExport) { sql += ` LIMIT ${size} OFFSET ${(page - 1) * size}`; }
  const rows = db.prepare(sql).all(p).map(dto);
  return { total, page, size, rows };
}

function canAccess(user, r) { return user.role === 'admin' || r.assigned_to == null || r.assigned_to === user.id; }

function getRequest(id, user) {
  const r = db.prepare(`${BASE} WHERE r.id=?`).get(id);
  if (!r) throw new HttpError(404, 'الطلب غير موجود');
  if (!canAccess(user, r)) throw new HttpError(403, 'هذا الطلب مسند لموظف آخر');
  const x = dto(r);
  x.contacts_log = db.prepare('SELECT l.id,l.kind,l.summary,l.created_at,u.display_name AS staff FROM contact_log l LEFT JOIN users u ON u.id=l.user_id WHERE l.request_id=? ORDER BY l.id DESC').all(id);
  x.history = db.prepare('SELECT id,actor,action,detail,created_at FROM audit WHERE request_id=? ORDER BY id DESC LIMIT 200').all(id)
    .map(h => ({ ...h, detail: h.detail ? JSON.parse(h.detail) : null }));
  x.similar = db.prepare(`SELECT id, ref, status, received_at, is_dup FROM requests WHERE id!=? AND phone_e164=? AND service=? AND svc_date=? ORDER BY id`).all(id, r.phone_e164, r.service, r.svc_date)
    .filter(s => user.role === 'admin' || true);
  return x;
}

// ---------- تعديل ----------
const SETTABLE_STATUS = Object.keys(S.STATUSES);
function updateRequest(id, patch, user) {
  return tx(() => {
    const cur = db.prepare('SELECT * FROM requests WHERE id=?').get(id);
    if (!cur) throw new HttpError(404, 'الطلب غير موجود');
    if (!canAccess(user, cur)) throw new HttpError(403, 'هذا الطلب مسند لموظف آخر');
    const admin = user.role === 'admin';
    const set = {}, changes = {};
    const services = getServices();
    const svc = services.find(s => s.id === cur.service);
    const now = new Date().toISOString();

    // --- الإسناد ---
    if ('assigned_to' in patch) {
      let to = patch.assigned_to === null || patch.assigned_to === '' ? null : +patch.assigned_to;
      if (to !== null) {
        const u = db.prepare('SELECT id FROM users WHERE id=? AND active=1').get(to);
        if (!u) throw new HttpError(422, 'المستخدم غير موجود أو معطل');
      }
      if (!admin && to !== null && to !== user.id) throw new HttpError(403, 'يمكنك إسناد الطلب لنفسك فقط');
      if (!admin && to === null && cur.assigned_to !== user.id) throw new HttpError(403, 'لا يمكنك تعديل الإسناد');
      if (to !== cur.assigned_to) { set.assigned_to = to; changes.assigned_to = [cur.assigned_to, to]; }
    } else if (cur.assigned_to == null && !admin) {
      set.assigned_to = user.id; changes.assigned_to = [null, user.id]; // يصبح مسؤولًا عند أول تحديث
    }

    // --- تعديل البيانات ---
    let missingChanged = false, newMissing = JSON.parse(cur.missing);
    if (patch.common || patch.fields) {
      const curPayload = JSON.parse(cur.payload);
      const input = {
        service: cur.service, name: cur.name, phone_cc: cur.phone_cc, phone: cur.phone, pref_channel: cur.pref_channel, email: cur.email || '',
        party_type: cur.party_type, org_name: cur.org_name || '', pref_time: cur.pref_time || '', notes: cur.notes || '', assisted_by: cur.assisted_by || '',
        ...(patch.common || {}), fields: { ...curPayload, ...(patch.fields || {}) },
      };
      // السماح بحذف قيمة بإرسال سلسلة فارغة
      const v = S.validateRequest(services.map(s => s.id === cur.service ? { ...s, active: true } : s), input);
      if (v.hasErrors) throw new HttpError(422, 'تحقق من الحقول المحددة', { fields: v.errors });
      const c = v.common;
      const map = { name: c.name, phone_cc: c.phone_cc, phone: c.phone, phone_e164: c.phone_e164, pref_channel: c.pref_channel, email: c.email || null, party_type: c.party_type, org_name: c.org_name || null, pref_time: c.pref_time || null, notes: c.notes || null, assisted_by: c.assisted_by || null };
      for (const [k, val] of Object.entries(map)) if (val !== (cur[k] ?? null) && !(val === null && cur[k] == null)) { set[k] = val; changes[k] = [cur[k], val]; }
      const np = JSON.stringify(v.payload);
      if (np !== cur.payload) {
        set.payload = np;
        for (const k of new Set([...Object.keys(curPayload), ...Object.keys(v.payload)])) if (JSON.stringify(curPayload[k]) !== JSON.stringify(v.payload[k])) changes['f.' + k] = [curPayload[k] ?? null, v.payload[k] ?? null];
      }
      newMissing = S.computeMissing(svc || v.service, c, v.payload);
      if (JSON.stringify(newMissing) !== cur.missing) { set.missing = JSON.stringify(newMissing); set.missing_count = newMissing.length; missingChanged = true; }
      const d = svcDate(svc || v.service, v.payload);
      if (d !== cur.svc_date || set.phone_e164) {
        set.svc_date = d;
        const dup = db.prepare('SELECT MIN(id) AS id FROM requests WHERE phone_e164=? AND service=? AND svc_date=? AND is_dup=0 AND id!=?').get(c.phone_e164, cur.service, d, id);
        set.dup_of = dup.id && dup.id < id ? dup.id : null;
      }
    }

    // --- الحالة ---
    let status = cur.status;
    if ('status' in patch && patch.status !== cur.status) {
      if (!SETTABLE_STATUS.includes(patch.status)) throw new HttpError(422, 'حالة غير صالحة');
      status = patch.status;
    } else if (missingChanged && newMissing.length === 0 && cur.status === 'needs_info') {
      status = 'ready'; // اكتملت المعلومات
    }
    const curMissing = 'missing_count' in set ? set.missing_count : cur.missing_count;
    if (status !== cur.status) {
      if (status === 'ready' && curMissing > 0) throw new HttpError(422, 'لا يمكن اعتبار الطلب جاهزًا للإحالة قبل استكمال: ' + newMissing.map(m => m.label).join('، '));
      set.status = status; changes.status = [cur.status, status];
    }
    if (S.FINAL_STATUSES.includes(status)) {
      const outcome = 'outcome' in patch ? patch.outcome : cur.outcome;
      const note = clean('outcome_note' in patch ? patch.outcome_note : cur.outcome_note, 500);
      if (!outcome || !S.OUTCOMES[outcome]) throw new HttpError(422, 'سجّل نتيجة الطلب عند الإكمال أو الإغلاق');
      if (S.NOTE_REQUIRED_OUTCOMES.includes(outcome) && !note) throw new HttpError(422, 'أضف توضيحًا للنتيجة المختارة (مثل مرجع إفادة الجهة المختصة)');
      if (outcome !== cur.outcome) { set.outcome = outcome; changes.outcome = [cur.outcome, outcome]; }
      if (note !== (cur.outcome_note || '')) { set.outcome_note = note; changes.outcome_note = [cur.outcome_note, note]; }
    } else if (cur.outcome && status !== cur.status) { set.outcome = null; set.outcome_note = null; }

    // --- الإحالة ---
    if (status === 'referred' || 'referred_to' in patch) {
      const to = clean('referred_to' in patch ? patch.referred_to : cur.referred_to, 120);
      if (status === 'referred' && !to) throw new HttpError(422, 'اذكر الجهة التي أُحيل إليها الطلب');
      if (to !== (cur.referred_to || '')) { set.referred_to = to || null; changes.referred_to = [cur.referred_to, to]; }
      if (to && !cur.referred_at) set.referred_at = now;
    }

    // --- المتابعة ---
    if ('next_action' in patch) {
      const v = clean(patch.next_action, 300); if (v !== (cur.next_action || '')) { set.next_action = v || null; changes.next_action = [cur.next_action, v]; }
    }
    if ('follow_up_date' in patch) {
      const v = clean(patch.follow_up_date, 10);
      if (v && !isDate(v)) throw new HttpError(422, 'تاريخ المتابعة غير صحيح');
      if (v !== (cur.follow_up_date || '')) { set.follow_up_date = v || null; changes.follow_up_date = [cur.follow_up_date, v]; }
    }

    // --- للمدير فقط ---
    if ('is_test' in patch) { if (!admin) throw new HttpError(403, 'للمدير فقط'); set.is_test = patch.is_test ? 1 : 0; changes.is_test = [cur.is_test, set.is_test]; }
    if ('archived' in patch) { if (!admin) throw new HttpError(403, 'للمدير فقط'); set.archived = patch.archived ? 1 : 0; changes.archived = [cur.archived, set.archived]; }
    if ('is_dup' in patch) {
      if (!admin) throw new HttpError(403, 'معالجة المكرر للمدير فقط');
      const flag = patch.is_dup ? 1 : 0;
      if (flag !== cur.is_dup) {
        set.is_dup = flag; changes.is_dup = [cur.is_dup, flag];
        if (flag) {
          set.dup_of = patch.dup_of ? +patch.dup_of : (cur.dup_of || db.prepare('SELECT MIN(id) AS id FROM requests WHERE phone_e164=? AND service=? AND svc_date=? AND id!=? AND is_dup=0').get(cur.phone_e164, cur.service, cur.svc_date, id).id);
          if (!set.dup_of) throw new HttpError(422, 'لا يوجد طلب أصلي لربطه');
          set.status = 'closed'; set.outcome = 'duplicate'; set.outcome_note = 'طلب مكرر لـ #' + set.dup_of;
        } else {
          set.status = (cur.missing_count ? 'needs_info' : 'new'); set.outcome = null; set.outcome_note = null; set.dup_of = null;
        }
      }
    }

    if (!Object.keys(set).length) return getRequest(id, user);
    set.updated_at = now;
    const cols = Object.keys(set);
    db.prepare(`UPDATE requests SET ${cols.map(c => c + '=@' + c).join(',')} WHERE id=@id`).run({ ...set, id });
    audit(user, 'update', changes, id);
    return getRequest(id, user);
  });
}

function addContact(id, body, user) {
  const kinds = ['call', 'whatsapp', 'email', 'visit', 'note'];
  const kind = clean(body.kind, 20), summary = clean(body.summary, 1000);
  if (!kinds.includes(kind)) throw new HttpError(422, 'نوع التواصل غير صالح');
  if (summary.length < 3) throw new HttpError(422, 'اكتب ملخصًا لنتيجة التواصل');
  return tx(() => {
    const cur = db.prepare('SELECT * FROM requests WHERE id=?').get(id);
    if (!cur) throw new HttpError(404, 'الطلب غير موجود');
    if (!canAccess(user, cur)) throw new HttpError(403, 'هذا الطلب مسند لموظف آخر');
    const now = new Date().toISOString();
    db.prepare('INSERT INTO contact_log(request_id,user_id,kind,summary,created_at) VALUES(?,?,?,?,?)').run(id, user.id, kind, summary, now);
    if (cur.assigned_to == null && user.role !== 'admin') db.prepare('UPDATE requests SET assigned_to=? WHERE id=?').run(user.id, id);
    db.prepare('UPDATE requests SET updated_at=? WHERE id=?').run(now, id);
    audit(user, 'contact', { kind }, id);
    return getRequest(id, user);
  });
}

function followupMessage(id, user) {
  const r = getRequest(id, user), s = getSettings(), svc = serviceById(r.service);
  const text = s.followup_template
    .replace(/\{name\}/g, r.name).replace(/\{ref\}/g, r.ref).replace(/\{service\}/g, svc ? svc.label : r.service)
    .replace(/\{event\}/g, s.event_name).replace(/\{missing\}/g, r.missing.map(m => m.label).join('، '));
  audit(user, 'prepare_message', { note: 'تم تجهيز النص فقط ولم يُرسل' }, id);
  const full = r.missing.length ? text + '\nالمعلومات المطلوبة: ' + r.missing.map(m => m.label).join('، ') : text;
  let wa = null;
  if (s.whatsapp_link_enabled && r.pref_channel === 'whatsapp') wa = `https://wa.me/${r.phone_e164}?text=${encodeURIComponent(full)}`;
  return { text: full, whatsapp_url: wa, sent: false };
}

// ---------- مكررات ----------
function duplicateGroups(event) {
  const rows = db.prepare(`SELECT phone_e164, service, svc_date, COUNT(*) n FROM requests WHERE is_dup=0 AND archived=0 AND is_test=0 ${event ? 'AND event_code=@e' : ''}
    GROUP BY phone_e164, service, svc_date HAVING n>1 ORDER BY MAX(id) DESC LIMIT 200`).all(event ? { e: event } : {});
  return rows.map(g => ({
    ...g,
    requests: db.prepare('SELECT id, ref, name, status, received_at, source FROM requests WHERE phone_e164=? AND service=? AND svc_date=? ORDER BY id').all(g.phone_e164, g.service, g.svc_date),
  }));
}

// ---------- سياسة الاحتفاظ ----------
function applyRetention(user, { archiveDays, deleteDays, dryRun }) {
  const out = { archived: 0, deleted: 0 };
  if (archiveDays != null) {
    const sql = `FROM requests WHERE archived=0 AND status IN ('completed','closed') AND julianday('now') - julianday(updated_at) >= ?`;
    out.archived = db.prepare('SELECT COUNT(*) n ' + sql).get(archiveDays).n;
    if (!dryRun && out.archived) { db.prepare(`UPDATE requests SET archived=1 ${sql.replace('FROM requests', '')}`).run(archiveDays); audit(user, 'retention_archive', { days: archiveDays, count: out.archived }); }
  }
  if (deleteDays != null) {
    const sql = `FROM requests WHERE archived=1 AND julianday('now') - julianday(updated_at) >= ?`;
    out.deleted = db.prepare('SELECT COUNT(*) n ' + sql).get(deleteDays).n;
    if (!dryRun && out.deleted) { db.prepare(`DELETE ${sql}`).run(deleteDays); audit(user, 'retention_delete', { days: deleteDays, count: out.deleted }); }
  }
  return out;
}

function deleteRequest(id, user) {
  const cur = db.prepare('SELECT * FROM requests WHERE id=?').get(id);
  if (!cur) throw new HttpError(404, 'الطلب غير موجود');
  if (!cur.archived && !cur.is_test) throw new HttpError(409, 'لا يُحذف إلا الطلب المؤرشف أو التجريبي. أرشف الطلب أولًا.');
  db.prepare('DELETE FROM requests WHERE id=?').run(id);
  audit(user, 'delete', { ref: cur.ref, service: cur.service, reason: cur.is_test ? 'test' : 'archived' });
}

module.exports = { createRequest, receiptFor, listRequests, getRequest, updateRequest, addContact, followupMessage, duplicateGroups, applyRetention, deleteRequest, filters, dto, OFF, serviceById };
