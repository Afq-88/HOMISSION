/* اللغات: العربية (الأصل) + English + اردو + हिन्दी + বাংলা + Filipino.
   النهج: النص العربي هو المفتاح. t('نص عربي') يعيد الترجمة إن وُجدت وإلا النص العربي نفسه — فلا تنكسر الواجهة إن غابت ترجمة.
   القواميس تُحمَّل عند الحاجة فقط من /i18n/<code>.js. تُعرض اللغة على صفحة الزائر والجهاز اللوحي (لوحة الموظفين عربية). */
(function () {
  'use strict';
  const LANGS = [
    { code: 'ar', name: 'العربية', dir: 'rtl', loc: 'ar-KW-u-nu-latn', hello: 'مرحبًا' },
    { code: 'en', name: 'English', dir: 'ltr', loc: 'en-GB', hello: 'Welcome' },
    { code: 'ur', name: 'اردو', dir: 'rtl', loc: 'ur-PK', hello: 'خوش آمدید' },
    { code: 'hi', name: 'हिन्दी', dir: 'ltr', loc: 'hi-IN', hello: 'स्वागत है' },
    { code: 'bn', name: 'বাংলা', dir: 'ltr', loc: 'bn-BD', hello: 'স্বাগতম' },
    { code: 'fil', name: 'Filipino', dir: 'ltr', loc: 'fil-PH', hello: 'Maligayang pagdating' },
  ];
  const by = c => LANGS.find(l => l.code === c) || LANGS[0];
  const dicts = {}; let cur = 'ar'; const listeners = [];
  const KEY = 'tm_lang';
  const get = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const put = v => { try { localStorage.setItem(KEY, v); } catch { /* */ } };

  function register(code, dict) { dicts[code] = dict; }
  function t(s, p) {
    let r = cur !== 'ar' && dicts[cur] && dicts[cur][s] != null ? dicts[cur][s] : s;
    return p ? r.replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? p[k] : m)) : r;
  }
  function load(code) {
    if (code === 'ar' || dicts[code]) return Promise.resolve();
    return new Promise(res => { const s = document.createElement('script'); s.src = `/i18n/${code}.js?v=1`; s.onload = () => res(); s.onerror = () => res(); document.head.appendChild(s); });
  }
  // اللغة المبدئية: ما اختاره الزائر سابقًا (إن سُمح بالحفظ)، ثم لغة المتصفح، ثم العربية
  function detect(allowSaved) {
    const saved = allowSaved ? get() : null; if (saved && LANGS.some(l => l.code === saved)) return saved;
    if (!allowSaved) return 'ar';
    for (const raw of (navigator.languages || [navigator.language || 'ar'])) {
      const b = String(raw).toLowerCase().split('-')[0]; const m = { ar: 'ar', en: 'en', ur: 'ur', hi: 'hi', bn: 'bn', fil: 'fil', tl: 'fil' }[b]; if (m) return m;
    }
    return 'ar';
  }
  async function set(code, { persist = true } = {}) {
    code = by(code).code; await load(code); cur = code;
    const l = by(code), h = document.documentElement; h.lang = l.code === 'fil' ? 'fil' : l.code; h.dir = l.dir;
    document.body.classList.remove(...LANGS.map(x => 'lang-' + x.code)); document.body.classList.add('lang-' + code);
    if (persist) put(code);
    listeners.forEach(f => { try { f(code); } catch { /* */ } });
  }
  window.I18N = { LANGS, t, set, register, detect, onChange: f => listeners.push(f), lang: () => cur, dir: () => by(cur).dir, loc: () => by(cur).loc, info: () => by(cur) };
})();
