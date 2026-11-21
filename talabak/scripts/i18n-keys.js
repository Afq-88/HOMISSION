// يستخرج كل النصوص العربية التي تحتاج ترجمة: من form.js (T('..')) ومن إعدادات الخدمات والخادم.
// node scripts/i18n-keys.js [--check]  → يطبع المفاتيح، ومع --check يتحقق أن كل قاموس في public/i18n يغطيها كلها.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const keys = new Set();
const src = fs.readFileSync(path.join(root, 'public/form.js'), 'utf8');
for (const m of src.matchAll(/\bT\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
for (const m of src.matchAll(/\b(?:label|hint): '((?:[^'\\]|\\.)*[\u0600-\u06FF](?:[^'\\]|\\.)*)'/g)) keys.add(m[1]);
for (const m of src.matchAll(/const (?:SHORT) = \{([^}]*)\}/g)) for (const x of m[1].matchAll(/'((?:[^'\\]|\\.)+)'/g)) if (/[؀-ۿ]/.test(x[1])) keys.add(x[1]);
for (const k of ['NEXT_BASE', 'CONFIRM']) { const m = src.match(new RegExp(`const ${k} = '((?:[^'\\\\]|\\\\.)*)'`)); if (m) keys.add(m[1]); }
const svc = require(path.join(root, 'server/services.js'));
const cfg = require(path.join(root, 'server/config.js'));
const walk = (o, k) => {
  if (typeof o === 'string') { if (/[؀-ۿ]/.test(o) && ['label', 'l', 'desc', 'notice', 'hint', 'placeholder', 'name'].includes(k)) keys.add(o); return; }
  if (Array.isArray(o)) return o.forEach(x => walk(x, k));
  if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) walk(v, kk);
};
walk(svc.DEFAULT_SERVICES || svc.SERVICES || svc, '');
for (const n of ['PARTY', 'CHANNELS', 'PREF_TIMES', 'COUNTRIES']) if (svc[n] || cfg[n]) walk(svc[n] || cfg[n], '');
const EXTRA = ['معرض الصناعات', 'دولة أخرى (رقم دولي كامل)', 'انتهى استقبال الطلبات عبر هذا النموذج. شكرًا لاهتمامكم.', 'تُستخدم البيانات التي تدخلها لمعالجة طلبك والتواصل معك بشأنه فقط. تقديم الطلب لا يُعد موافقة على تلقي رسائل تسويقية لاحقة.', 'هذا النموذج لتسجيل الاهتمام بالخدمة ومتابعته؛ تسجيل الطلب لا يُعد تأكيدًا للحجز أو تفعيلًا للخدمة، وتخضع الأسعار والتوافر للتأكيد من الجهة المختصة.', 'تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة. (لم يُسجَّل أي طلب)', 'استقبال الطلبات متوقف', 'انتهت جلسة الدخول. سجّل الدخول من جديد ثم أعد المحاولة.', 'تعذّر الحفظ بسبب خطأ في الخادم.', 'انتهت مهلة الاتصال.', 'لا يوجد اتصال بالإنترنت أو تعذّر الوصول إلى الخادم.', 'استقبال الطلبات متوقف حاليًا', 'التفاصيل', 'التواصل', 'المراجعة', 'مطلوب لأنك اخترت التواصل بالبريد'];
const base = [...keys].filter(k => !EXTRA.includes(k)).sort(); EXTRA.forEach(k => keys.add(k));
const out = [...base, ...EXTRA];
if (process.argv.includes('--check')) {
  let bad = 0;
  for (const code of ['en', 'ur', 'hi', 'bn', 'fil']) {
    let d; global.I18N = { register: (c, x) => { d = x; } };
    try { new Function(fs.readFileSync(path.join(root, `public/i18n/${code}.js`), 'utf8'))(); } catch (e) { console.log(code, 'ملف مفقود/معطوب', e.message); bad++; continue; }
    const miss = out.filter(k => !d[k]); const extra = Object.keys(d).filter(k => !keys.has(k));
    console.log(code, 'ناقص:', miss.length, 'زائد:', extra.length); miss.forEach(k => console.log('   -', k)); if (miss.length) bad++;
  }
  process.exit(bad ? 1 : 0);
} else console.log(JSON.stringify(out, null, 1));
