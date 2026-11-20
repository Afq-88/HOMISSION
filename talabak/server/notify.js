'use strict';
// تنبيهات الجوال (ntfy) + نبض الحياة (healthchecks.io أو مثيله). كلها اختيارية وتُفعَّل بمتغيرات البيئة فقط.
//   NTFY_TOPIC   اسم موضوع سري عشوائي (يعمل كأنه كلمة مرور). NTFY_URL افتراضيًا https://ntfy.sh
//   HEARTBEAT_URL رابط نبض: يُستدعى كل ٥ دقائق؛ إن توقف (كهرباء/جهاز) تصلك رسالة من الخدمة نفسها.
// خصوصية: رسائل التنبيه لا تحمل اسمًا ولا هاتفًا ولا نصوص العميل — فقط الرقم المرجعي والخدمة والإدارة.
const cfg = require('./config');

// تُقرأ المتغيرات عند كل استدعاء (تسهّل الاختبار وتغيير الإعداد)
const base = () => (process.env.NTFY_URL || 'https://ntfy.sh').replace(/\/+$/, '');
const enabled = () => /^[A-Za-z0-9_-]{16,64}$/.test(process.env.NTFY_TOPIC || '');

// ASCII فقط في ترويسات HTTP؛ النص العربي يذهب في جسم الرسالة (UTF-8)
function notify({ title, message, priority = 3, tags = '', click = '' }) {
  if (!enabled()) return Promise.resolve(false);
  const headers = { 'Content-Type': 'text/plain; charset=utf-8', Priority: String(priority) };
  if (title) headers.Title = encodeRfc2047(title);
  if (tags) headers.Tags = tags;
  if (click) headers.Click = click;
  return fetch(`${base()}/${process.env.NTFY_TOPIC}`, { method: 'POST', headers, body: message || '', signal: AbortSignal.timeout(5000) })
    .then(r => r.ok).catch(() => false); // لا نكسر التطبيق إن فشل التنبيه
}
// ntfy يقبل العناوين غير ASCII بترميز =?UTF-8?B?...?=
function encodeRfc2047(s) { return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`; }

function notifyNewRequest(row, svcLabel, deptName, settings) {
  const site = (settings && settings.public_base_url) || '';
  return notify({
    title: 'طلب جديد — طلبك معنا',
    message: `${row.ref}\n${svcLabel}${deptName ? ' · ' + deptName : ''}`,
    priority: 4, tags: 'bell', click: site ? site + '/staff' : '',
  });
}

let hbTimer = null;
function startHeartbeat(intervalMs = 5 * 60e3) {
  const url = process.env.HEARTBEAT_URL;
  if (!url || !/^https?:\/\//.test(url)) return false;
  const ping = () => fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) }).catch(() => { /* بلا إنترنت: يُعاد بعد قليل */ });
  ping(); hbTimer = setInterval(ping, intervalMs); hbTimer.unref();
  return true;
}
const stopHeartbeat = () => { if (hbTimer) clearInterval(hbTimer); hbTimer = null; };

module.exports = { notify, notifyNewRequest, startHeartbeat, stopHeartbeat, enabled };
