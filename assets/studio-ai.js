/* KPTC control centre — content writer, picture reader and marketing expert.
   Everything here runs in the browser, free, with no account and no key. It is a built-in expert system (rules, templates and a knowledge base),
   not a generative language model: it composes copy from the facts and choices you give it, and it never invents numbers.
   The only optional online part is "التحليل الذكي للصورة" (a free object-detection model loaded on request). */
(function(){
  var X = window.KPStudio; if (!X) return;
  var K = X.K, $ = X.$, E = X.E, V = X.V, T = X.TABS, flash = X.flash;
  function nz(s){ return K.latin(String(s == null ? '' : s)).toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/\s+/g, ' ').trim(); }
  function copy(t){ try { navigator.clipboard.writeText(t); flash('نُسخ النص.'); } catch(e){ var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); flash('نُسخ النص.'); } catch(x){} a.remove(); } }
  function pick(arr, i){ return arr[i % arr.length]; }

  /* ============================== verified facts (as published on the site) ============================== */
  var FACTS = [
    ['بطاقة التوفير 31 يوماً بـ 10 د.ك', 'رحلات بلا حدود على جميع الخطوط'], ['بطاقة التوفير 91 يوماً بـ 25 د.ك', 'نحو 0.27 د.ك في اليوم'],
    ['خصم 50% لاشتراكات الجهات والشركات', 'حسب نظام الاشتراكات'], ['رحلة العمرة: 6 أيام بـ 60 د.ك', 'للشخص'], ['رحلة العمرة: 11 يوماً بـ 85 د.ك', 'للشخص'],
    ['أكثر من 400 حافلة و26 مساراً', 'في شوارع الكويت'], ['مركز الأوناش يعمل 24 ساعة', 'طوال الأسبوع في المحافظات الست'], ['الخط الساخن 1880001', 'لكل استفساراتكم'], ['نحرّك الكويت منذ 1962', 'مقرنا الرئيسي في المرقاب']
  ];
  var ALLOWED_NUM = '10 31 25 91 50 60 6 85 11 400 26 24 1962 1880001 0.250 0.27 17';

  /* ============================== writer: building blocks ============================== */
  var PLAT = {
    x:    {n: 'X', ic: 'X', lim: 280, tip: 'اجعل الجملة الأولى هي الخبر. صورة أو بطاقة واحدة ترفع التفاعل. ثبّت الخط الساخن في الحساب.'},
    ig:   {n: 'Instagram — منشور', ic: 'IG', lim: 2200, tip: 'أول سطرين هما كل ما يراه القارئ قبل «المزيد»: ضع الفائدة فيهما. الصورة 4:5 أو سلايدات (Carousel). نص بديل للصورة.'},
    reels:{n: 'ريلز / تيك توك — سيناريو', ic: '▶', lim: 0, tip: 'أول 3 ثوانٍ تحسم المشاهدة: ابدأ بالنتيجة أو بسؤال. عمودي 9:16، ترجمة مكتوبة على الشاشة، 15 إلى 25 ثانية.'},
    snap: {n: 'Snapchat — نص السنابة', ic: 'SC', lim: 90, tip: 'عمودي 9:16، جملة قصيرة جداً بلهجة مألوفة، الفكرة في أول ثانيتين. استعمل الاستهداف الجغرافي حسب المحافظة عند الإعلان.'},
    li:   {n: 'LinkedIn', ic: 'in', lim: 3000, tip: 'نبرة مهنية بلا عامية. أرقام وحقائق موثقة، 3 فقرات قصيرة، وسمان إلى ثلاثة. مناسب للشركات والتوظيف وبيع المساحات الإعلانية.'},
    fb:   {n: 'Facebook', ic: 'f', lim: 63206, tip: 'فقرتان قصيرتان ورابط. مناسب للمجتمعات المقيمة والعائلات. أضف الرابط في أول تعليق إن أمكن.'},
    wa:   {n: 'قناة / بث واتساب', ic: 'WA', lim: 700, tip: 'رسالة قصيرة، عنوان بخط عريض *هكذا*، رابط واحد. لا ترسل إلا لمن وافق على استقبال الرسائل.'},
    pr:   {n: 'بيان صحفي', ic: 'PR', lim: 0, tip: 'عنوان يحمل الخبر، فقرة أولى تجيب: من؟ ماذا؟ متى؟ أين؟ ثم اقتباس ونبذة وجهة الاتصال. اعتمده قبل الإرسال.'},
    web:  {n: 'خبر الموقع', ic: 'WEB', lim: 0, tip: 'العنوان حتى 70 حرفاً، الملخص حتى 160 حرفاً (يظهر في نتائج البحث)، ثم نص من 3 فقرات.'}
  };
  var INTENTS = {
    service: ['إعلان خدمة أو عرض', '🚌'], news: ['خبر أو مستجد', '📰'], alert: ['تنبيه تشغيلي', '⚠️'], safety: ['توعية وسلامة', '🛑'],
    csr: ['مسؤولية مجتمعية', '🤝'], jobs: ['توظيف', '💼'], occasion: ['مناسبة وطنية أو موسمية', '🇰🇼'], thanks: ['شكر وتقدير', '🙏']
  };
  var TONES = {formal: 'رسمية', friendly: 'ودّية', excited: 'حماسية', calm: 'هادئة توعوية'};
  var OCC = {ramadan: 'رمضان', fitr: 'عيد الفطر', adha: 'عيد الأضحى', national: 'اليوم الوطني', liberation: 'يوم التحرير', school: 'العودة للمدارس', summer: 'الصيف', rain: 'موسم الأمطار'};
  /* hooks: {m: standard Arabic, k: Kuwaiti touch, g: white Gulf}; {t} is the topic */
  var HOOK = {
    service: {formal: ['تعلن شركة النقل العام الكويتية عن {t}.', 'يسر شركة النقل العام الكويتية أن تقدّم لكم {t}.', 'نقدّم لكم {t}، ضمن خدمات KPTC.'],
      friendly: [{m: 'جديدنا لكم: {t}.', k: 'جديدنا لكم: {t}.'}, {m: '{t}… خدمة صُمّمت لتسهّل تنقّلكم.', k: '{t}… خدمة سوّيناها عشان تسهّل تنقّلكم.', g: '{t}… خدمة سويناها عشان تسهّل تنقلكم.'}, {m: 'تنقّلكم صار أسهل مع {t}.', k: 'تنقّلكم صار أسهل مع {t}.'}],
      excited: [{m: 'وصل {t}!', k: 'وصل {t}!'}, {m: 'جاهزين؟ {t} بين أيديكم الآن.', k: 'جاهزين؟ {t} صار عندكم.'}, {m: 'الانتظار انتهى: {t}.', k: 'خلصت الانتظار: {t}.'}],
      calm: ['نضع بين أيديكم {t} لتجربة تنقّل أكثر راحة.', 'خدمة جديدة لراحتكم: {t}.']},
    news: {formal: ['في مستجد جديد: {t}.', 'أعلنت شركة النقل العام الكويتية: {t}.'], friendly: [{m: 'خبر جديد من KPTC: {t}.', k: 'خبر جديد من KPTC: {t}.'}, {m: 'تابعوا معنا: {t}.', k: 'تابعوا معانا: {t}.'}], excited: ['خبر يستاهل المشاركة: {t}!', 'وأخيراً: {t}!'], calm: ['للاطلاع: {t}.', 'نشارككم المستجد التالي: {t}.']},
    alert: {formal: ['تنبيه إلى مستخدمي النقل العام: {t}.', 'تعلن KPTC للعلم: {t}.'], friendly: ['تنبيه مهم: {t}.', 'للعلم: {t}.'], excited: ['تنبيه مهم: {t}.'], calm: ['للعلم والاطلاع: {t}.', 'تنبيه: {t}.']},
    safety: {formal: ['سلامتكم أولاً: {t}.', 'من أجل رحلة آمنة: {t}.'], friendly: [{m: 'رحلتكم تهمنا: {t}.', k: 'سلامتكم تهمنا: {t}.'}, {m: 'نصيحة قبل الرحلة: {t}.', k: 'نصيحة قبل لا تطلعون: {t}.', g: 'نصيحة قبل الرحلة: {t}.'}], excited: ['لا تنسوا: {t}!'], calm: ['تذكير بسيط لسلامة الجميع: {t}.']},
    csr: {formal: ['إيماناً بدورها المجتمعي، تشارك KPTC في {t}.', 'ضمن مسؤوليتنا المجتمعية: {t}.'], friendly: [{m: 'من قلب المجتمع: {t}.', k: 'من وسط مجتمعنا: {t}.'}, {m: 'نفتخر بأن نكون جزءاً من {t}.', k: 'نفتخر إننا جزء من {t}.', g: 'نفتخر إننا جزء من {t}.'}], excited: ['فخورون بمشاركتنا في {t}!'], calm: ['نواصل دورنا المجتمعي: {t}.']},
    jobs: {formal: ['تعلن شركة النقل العام الكويتية عن فرصة وظيفية: {t}.', 'للانضمام إلى فريق KPTC: {t}.'], friendly: [{m: 'تبحث عن فرصة؟ {t}.', k: 'تدوّر على فرصة؟ {t}.', g: 'تدور على فرصة؟ {t}.'}, {m: 'انضم إلى فريقنا: {t}.', k: 'انضم لفريقنا: {t}.'}], excited: ['فرصتك وصلت: {t}!'], calm: ['فرص وظيفية متاحة: {t}.']},
    occasion: {formal: ['بمناسبة {o}، تتقدم KPTC بأطيب التهاني، {t}.', 'في {o}: {t}.'], friendly: [{m: 'كل عام وأنتم بخير بمناسبة {o}. {t}.', k: 'كل عام وانتم بخير بمناسبة {o}. {t}.'}, {m: '{o} مع KPTC: {t}.', k: '{o} مع KPTC: {t}.'}], excited: ['{o} أحلى مع KPTC: {t}!'], calm: ['في {o}، نذكّركم: {t}.']},
    thanks: {formal: ['تتقدم KPTC بالشكر والتقدير: {t}.'], friendly: [{m: 'شكراً لكم: {t}.', k: 'مشكورين: {t}.'}, {m: 'نقولها من القلب: شكراً. {t}.', k: 'نقولها من القلب: شكراً. {t}.'}], excited: ['شكراً لكم جميعاً! {t}.'], calm: ['نشكركم على ثقتكم: {t}.']}
  };
  var VALUE = {
    service: ['نعمل ليكون تنقّلكم أسهل وأوضح.', 'كل ما تحتاجونه بخطوات بسيطة وعلى الموقع الرسمي.'], news: ['نواصل تطوير خدماتنا لراحة مستخدمينا.'], alert: ['نعتذر عن أي إزعاج، ونشكر تفهمكم.'], safety: ['سلامة الجميع مسؤولية مشتركة.'],
    csr: ['نؤمن بأن النقل العام جزء من حياة المجتمع.'], jobs: ['كن جزءاً من فريق يحرّك الكويت كل يوم.'], occasion: ['ونواصل خدمتكم في كل المواسم.'], thanks: ['ثقتكم تدفعنا لنقدّم الأفضل.']
  };
  var CTA = {
    call: ['للاستفسار اتصلوا بالخط الساخن 1880001.', 'تواصلوا معنا على 1880001.'], subscribe: ['اشتركوا الآن عبر موقعنا الرسمي.', 'ابدأوا اشتراككم اليوم من الموقع.'], book: ['احجزوا الآن عبر موقعنا الرسمي.', 'سجّلوا حجزكم من الموقع.'],
    learn: ['اعرفوا التفاصيل عبر موقعنا الرسمي.', 'التفاصيل الكاملة على الموقع.'], apply: ['قدّموا طلبكم عبر صفحة الوظائف.'], none: ['']
  };
  var TAGS = {base: ['#KPTC', '#الكويت', '#النقل_العام'], service: ['#تنقل_أسهل'], news: ['#أخبار_الكويت'], alert: ['#تنبيه'], safety: ['#السلامة_أولاً'], csr: ['#مسؤولية_مجتمعية'], jobs: ['#وظائف_الكويت'], occasion: [], thanks: []};
  var OTAG = {ramadan: '#رمضان', fitr: '#عيد_الفطر', adha: '#عيد_الأضحى', national: '#اليوم_الوطني_الكويتي', liberation: '#يوم_التحرير', school: '#العودة_للمدارس', summer: '#صيف_الكويت', rain: '#أمطار_الكويت'};

  function pickHook(intent, tone, dia, i, topic, occ){
    var bank = (HOOK[intent] || HOOK.service)[tone] || (HOOK[intent] || HOOK.service).calm, h = pick(bank, i);
    if (typeof h === 'object') h = h[dia] || h.m;
    return h.replace('{t}', topic).replace('{o}', OCC[occ] || 'هذه المناسبة');
  }
  function buildParts(o, i){
    var tone = o.tone, dia = tone === 'formal' ? 'm' : o.dia, parts = {};
    parts.hook = pickHook(o.intent, tone, dia, i, o.topic, o.occ);
    parts.body = (o.details || '').split(/\n+/).map(function(s){ return s.trim(); }).filter(Boolean);
    parts.value = pick(VALUE[o.intent] || VALUE.service, i);
    parts.cta = o.cta === 'none' ? '' : pick(CTA[o.cta] || CTA.call, i);
    parts.link = o.link || '';
    var tags = TAGS.base.slice().concat(TAGS[o.intent] || [], o.intent === 'occasion' && o.occ && OTAG[o.occ] ? [OTAG[o.occ]] : [], (o.tags || '').split(/[\s,،]+/).filter(Boolean).map(function(t){ return t.charAt(0) === '#' ? t : '#' + t; }));
    parts.tags = tags.filter(function(t, k){ return tags.indexOf(t) === k; });
    return parts;
  }
  var EMO = {service: ['🚌', '✅'], news: ['📰', '👉'], alert: ['⚠️', 'ℹ️'], safety: ['🛑', '✅'], csr: ['🤝', '💛'], jobs: ['💼', '📩'], occasion: ['🇰🇼', '🎉'], thanks: ['🙏', '💛']};
  function em(o, slot){ if (o.emoji === 'none') return ''; var e = (EMO[o.intent] || EMO.service)[slot]; return e + ' '; }
  function bullets(o, arr){ return arr.map(function(s){ return (o.emoji === 'many' ? '✔️ ' : '• ') + s; }).join('\n'); }
  function trimTo(s, n){ if (s.length <= n) return s; var c = s.slice(0, n - 1); var k = c.lastIndexOf(' '); return (k > n * .6 ? c.slice(0, k) : c) + '…'; }

  var RENDER = {
    x: function(p, o){
      var tags = p.tags.slice(0, 2).join(' '), main = em(o, 0) + p.hook, body = p.body[0] || '', cta = (p.cta ? p.cta : '') + (p.link ? ' ' + p.link : '');
      var t = [main, body, cta, tags].filter(Boolean).join('\n\n'); if (t.length > 280) t = [main, cta, tags].filter(Boolean).join('\n\n'); if (t.length > 280) t = [trimTo(main, 200), cta].filter(Boolean).join('\n\n'); return trimTo(t, 280);
    },
    ig: function(p, o){
      var t = em(o, 0) + p.hook + '\n\n' + (p.body.length ? bullets(o, p.body) + '\n\n' : '') + p.value + (p.cta ? '\n\n' + em(o, 1) + p.cta : '') + (p.link ? '\n' + p.link : '') + '\n.\n.\n' + p.tags.slice(0, 8).join(' '); return t;
    },
    li: function(p, o){
      var t = p.hook.replace(/!+/g, '.') + '\n\n' + (p.body.length ? p.body.map(function(s){ return '— ' + s; }).join('\n') + '\n\n' : '') + p.value + (p.cta ? '\n\n' + p.cta : '') + (p.link ? '\n' + p.link : '') + '\n\n' + p.tags.slice(0, 3).join(' '); return t;
    },
    fb: function(p, o){ return em(o, 0) + p.hook + '\n\n' + (p.body.length ? bullets(o, p.body) + '\n\n' : '') + p.value + (p.cta ? '\n\n' + p.cta : '') + (p.link ? '\n' + p.link : '') + '\n\n' + p.tags.slice(0, 3).join(' '); },
    wa: function(p, o){ return '*' + p.hook + '*\n\n' + (p.body.length ? p.body.map(function(s){ return '• ' + s; }).join('\n') + '\n\n' : '') + (p.cta ? p.cta : '') + (p.link ? '\n' + p.link : ''); },
    snap: function(p, o){ var short = trimTo(p.hook.replace(/\.$/, ''), 60); return 'نص على الشاشة: ' + short + (o.emoji === 'none' ? '' : ' ' + (EMO[o.intent] || EMO.service)[0]) + '\nكابشن Spotlight: ' + trimTo(p.hook + ' ' + p.tags.slice(0, 2).join(' '), 90) + (p.cta ? '\nملصق/سحب للأعلى: ' + trimTo(p.cta, 40) : ''); },
    reels: function(p, o, img){
      var b = p.body.slice(0, 3); while (b.length < 2) b.push(p.value);
      return 'المدة: 15 إلى 25 ثانية — عمودي 9:16 — ترجمة عربية مكتوبة\n\n[0-3 ث] الخطاف\nعلى الشاشة: ' + trimTo(p.hook.replace(/\.$/, ''), 55) + '\nالتعليق الصوتي: ' + p.hook + '\nلقطة: ' + (img && img.objects.length ? 'قريبة لـ' + img.objects[0] : 'لقطة قريبة وحركة مباشرة (حافلة تدخل المحطة أو راكب يمسح البطاقة)') + '\n\n[3-12 ث] الفكرة\n' + b.map(function(s, k){ return (k + 1) + '. ' + s; }).join('\n') + '\nلقطات: لقطات متنوعة من الخدمة نفسها وبدون ازدحام نص.\n\n[12-20 ث] الختام\nعلى الشاشة: ' + (p.cta || 'KPTC · 1880001') + '\nالتعليق: ' + (p.cta || p.value) + '\n\nالكابشن:\n' + p.hook + ' ' + p.tags.slice(0, 4).join(' ') + '\nصوت: استعمل مكتبة الصوت الرسمية للمنصة لتفادي حقوق الملكية.';
    },
    pr: function(p, o){
      var d = K.date(K.today()); return 'العنوان: ' + p.hook.replace(/\.$/, '') + '\n\nالكويت، ' + d + ' —\n' + p.hook + ' ' + (p.body[0] || p.value) + '\n\n' + (p.body.slice(1).length ? p.body.slice(1).join('\n') + '\n\n' : '') + '«[اقتباس من مسؤول معتمد: يُكتب ويُعتمد قبل الإرسال]»\n\nعن شركة النقل العام الكويتية:\nتخدم KPTC مستخدمي النقل العام في الكويت منذ عام 1962، ومقرها الرئيسي في المرقاب.\n\nللتواصل: الخط الساخن 1880001' + (p.link ? '\nالرابط: ' + p.link : '') + '\n\n###';
    },
    web: function(p, o){
      var title = trimTo(p.hook.replace(/\.$/, ''), 70), sum = trimTo((p.body[0] ? p.hook + ' ' + p.body[0] : p.hook + ' ' + p.value), 160);
      return 'العنوان (حتى 70 حرفاً):\n' + title + '\n\nالملخص / وصف البحث (حتى 160 حرفاً):\n' + sum + '\n\nالنص:\n' + p.hook + '\n\n' + (p.body.length ? p.body.join('\n') + '\n\n' : '') + p.value + '\n\n' + (p.cta || 'للاستفسار اتصلوا بالخط الساخن 1880001.');
    }
  };
  function generate(o, img){
    var out = {};
    o.plats.forEach(function(pid){
      var o2 = Object.assign({}, o); if (pid === 'li' || pid === 'pr') o2.tone = 'formal'; if (pid === 'pr' || pid === 'web') o2.emoji = 'none';
      out[pid] = [0, 1, 2].map(function(i){ var parts = buildParts(o2, i + (o.seed || 0)); return RENDER[pid](parts, o2, img); });
    });
    return out;
  }
  function numbersToCheck(text, o){
    var allowed = ALLOWED_NUM + ' ' + K.latin((o.details || '') + ' ' + (o.topic || '') + ' ' + (o.link || '')), nums = (K.latin(text).match(/\d[\d.,]*/g) || []).map(function(n){ return n.replace(/[.,]+$/, ''); }), bad = [];
    nums.forEach(function(n){ if (allowed.indexOf(n) < 0 && bad.indexOf(n) < 0) bad.push(n); }); return bad;
  }

  /* ============================== picture reading (local) ============================== */
  var HUES = [[15, 'أحمر'], [40, 'برتقالي'], [65, 'أصفر'], [160, 'أخضر'], [200, 'تركوازي'], [255, 'أزرق'], [290, 'بنفسجي'], [335, 'وردي'], [361, 'أحمر']];
  function colorName(r, g, b){
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, d = mx - mn, s = d === 0 ? 0 : d / (255 - Math.abs(mx + mn - 255)), h = 0;
    if (d){ if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h = (h * 60 + 360) % 360; }
    if (l < .12) return 'أسود'; if (l > .9) return 'أبيض'; if (s < .12) return l < .4 ? 'رمادي داكن' : 'رمادي';
    var nm = 'أحمر'; for (var i = 0; i < HUES.length; i++){ if (h < HUES[i][0]){ nm = HUES[i][1]; break; } } return (l < .3 ? nm + ' داكن' : l > .7 ? nm + ' فاتح' : nm);
  }
  function analyseImage(img){
    var c = document.createElement('canvas'), w = 64, h = Math.max(8, Math.round(64 * img.naturalHeight / img.naturalWidth)); c.width = w; c.height = h; var x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h); var px = x.getImageData(0, 0, w, h).data, bins = {}, sum = 0, n = 0, edges = 0, prev = 0;
    for (var i = 0; i < px.length; i += 4){ var r = px[i], g = px[i + 1], b = px[i + 2], lum = .299 * r + .587 * g + .114 * b; sum += lum; n++; if (Math.abs(lum - prev) > 38) edges++; prev = lum; var k = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); (bins[k] = bins[k] || {n: 0, r: 0, g: 0, b: 0}); var q = bins[k]; q.n++; q.r += r; q.g += g; q.b += b; }
    var top = Object.keys(bins).map(function(k){ var q = bins[k], r = q.r / q.n, g = q.g / q.n, b = q.b / q.n, sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255; q.w = q.n * (1 + sat * 3); return q; }).sort(function(a, b){ return b.w - a.w; }), pal = [];
    top.forEach(function(q){ var rgb = [Math.round(q.r / q.n), Math.round(q.g / q.n), Math.round(q.b / q.n)]; if (pal.length < 4 && !pal.some(function(p){ return Math.abs(p.rgb[0] - rgb[0]) + Math.abs(p.rgb[1] - rgb[1]) + Math.abs(p.rgb[2] - rgb[2]) < 90; })) pal.push({rgb: rgb, name: colorName(rgb[0], rgb[1], rgb[2]), hex: '#' + rgb.map(function(v){ return ('0' + v.toString(16)).slice(-2); }).join('')}); });
    var br = sum / n, ar = img.naturalWidth / img.naturalHeight, orient = ar > 1.15 ? 'أفقية' : ar < .87 ? 'عمودية' : 'مربعة', busy = edges / n;
    var names = pal.map(function(p){ return p.name; }).filter(function(v, i, a){ return a.indexOf(v) === i; }).slice(0, 3);
    return {w: img.naturalWidth, h: img.naturalHeight, ar: ar, orient: orient, bright: br < 70 ? 'داكنة' : br > 190 ? 'شديدة السطوع' : br > 150 ? 'ساطعة' : 'متوازنة الإضاءة', pal: pal, names: names, busy: busy > .22 ? 'مزدحمة بالتفاصيل' : busy < .08 ? 'بسيطة ومريحة' : 'متوسطة التفاصيل', objects: [], brv: br};
  }
  var AR_OBJ = {person: 'أشخاص', bus: 'حافلة', car: 'سيارة', truck: 'شاحنة أو ونش', 'traffic light': 'إشارة مرور', bench: 'مقعد', 'stop sign': 'لافتة وقوف', backpack: 'حقيبة ظهر', handbag: 'حقيبة', 'cell phone': 'هاتف', motorcycle: 'دراجة نارية', bicycle: 'دراجة', umbrella: 'مظلة', clock: 'ساعة', tv: 'شاشة', laptop: 'حاسوب'};
  var SIZES = [['ig', 'Instagram منشور 4:5', 4 / 5, 1080, 1350], ['story', 'ستوري / ريلز / Snap 9:16', 9 / 16, 1080, 1920], ['x', 'X و Facebook 16:9', 16 / 9, 1600, 900], ['li', 'LinkedIn 1.91:1', 1.91, 1200, 627]];
  function describe(a, topic){
    var s = 'صورة ' + a.orient + ' ' + a.bright + ' بألوان ' + a.names.join(' و') + '، ' + a.busy;
    if (a.objects.length) s = 'صورة ' + a.orient + ' تظهر فيها ' + a.objects.join(' و') + '، بألوان ' + a.names.join(' و'); return s + (topic ? ' — ' + topic : '') + '.';
  }

  /* ============================== writer UI ============================== */
  var W = {src: 'topic', newsId: '', topic: '', details: '', intent: 'service', tone: 'friendly', dia: 'k', occ: 'national', cta: 'call', emoji: 'few', link: '', tags: '', plats: ['x', 'ig', 'snap'], res: null, seed: 0, img: null, tab: 'x'};
  T.writer = ['كاتب المحتوى', 'خبير كتابة يصيغ لك المنشور المناسب لكل منصة: من خبر أو موضوع أو صورة، بنبرة ولهجة تختارها، مع قياس الطول وتنبيه على الأرقام التي تحتاج مراجعة.'];
  V.writer = function(d){
    $('hA').innerHTML = '';
    var news = d.news.slice().sort(function(a, b){ return a.d < b.d ? 1 : -1; });
    var sel = function(id, items, cur){ return '<select id="' + id + '">' + items.map(function(x){ return '<option value="' + x[0] + '"' + (x[0] === cur ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>'; };
    return '<div class="wr"><div class="wr-in box">' +
      '<div class="wr-src" id="wrSrc">' + [['topic', 'موضوع حر'], ['news', 'من خبر منشور'], ['img', 'من صورة']].map(function(x){ return '<button type="button" data-ws="' + x[0] + '" class="' + (W.src === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div id="wrSrcBox">' + srcBox(news) + '</div>' +
      '<label class="f">الموضوع في سطر (يدخل في الصياغة)<input id="wrTopic" value="' + E(W.topic) + '" placeholder="مثال: بطاقة التوفير لمدة 31 يوماً"></label>' +
      '<label class="f">تفاصيل وحقائق (سطر لكل معلومة، تظهر نقاطاً)<textarea id="wrDet" rows="3" placeholder="10 د.ك لـ 31 يوماً&#10;رحلات بلا حدود على جميع الخطوط">' + E(W.details) + '</textarea></label>' +
      '<div class="wr-facts"><small>حقائق منشورة على الموقع، اضغط لإضافتها:</small>' + FACTS.map(function(f, i){ return '<button type="button" data-wf="' + i + '">' + E(f[0]) + '</button>'; }).join('') + '</div>' +
      '<div class="wr-g"><label class="f">نوع المحتوى' + sel('wrIntent', Object.keys(INTENTS).map(function(k){ return [k, INTENTS[k][0]]; }), W.intent) + '</label><label class="f">النبرة' + sel('wrTone', Object.keys(TONES).map(function(k){ return [k, TONES[k]]; }), W.tone) + '</label>' +
      '<label class="f">اللهجة' + sel('wrDia', [['m', 'فصحى مبسّطة'], ['k', 'لمسة كويتية'], ['g', 'خليجية بيضاء']], W.dia) + '</label><label class="f">الدعوة للإجراء' + sel('wrCta', [['call', 'اتصال 1880001'], ['subscribe', 'اشتراك'], ['book', 'حجز'], ['learn', 'معرفة التفاصيل'], ['apply', 'تقديم طلب'], ['none', 'بلا']], W.cta) + '</label>' +
      '<label class="f">الإيموجي' + sel('wrEmoji', [['none', 'بلا'], ['few', 'قليل'], ['many', 'كثير']], W.emoji) + '</label><label class="f" id="wrOccL"' + (W.intent === 'occasion' ? '' : ' hidden') + '>المناسبة' + sel('wrOcc', Object.keys(OCC).map(function(k){ return [k, OCC[k]]; }), W.occ) + '</label></div>' +
      '<div class="wr-g2"><label class="f">رابط (اختياري)<input id="wrLink" dir="ltr" value="' + E(W.link) + '" placeholder="https://"></label><label class="f">وسوم إضافية<input id="wrTags" dir="ltr" value="' + E(W.tags) + '" placeholder="#وسم1 #وسم2"></label></div>' +
      '<div class="wr-pl"><small>المنصات</small>' + Object.keys(PLAT).map(function(k){ return '<button type="button" data-wp="' + k + '" class="' + (W.plats.indexOf(k) > -1 ? 'on' : '') + '"><i>' + PLAT[k].ic + '</i>' + PLAT[k].n + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="btn y wr-go" data-act="wrgo">اكتب لي</button></div>' +
      '<div class="wr-out" id="wrOut">' + outHtml() + '</div></div>';
  };
  function srcBox(news){
    if (W.src === 'news') return '<label class="f">اختر الخبر<select id="wrNews"><option value="">—</option>' + news.map(function(n){ return '<option value="' + E(n.id) + '"' + (W.newsId === n.id ? ' selected' : '') + '>' + E(n.title) + '</option>'; }).join('') + '</select></label>';
    if (W.src === 'img') return imgBox();
    return '';
  }
  function imgBox(){
    var a = W.img; if (!a) return '<div class="wr-up"><button type="button" class="btn o" data-act="wrimg">ارفع صورة لأقرأها وأقترح النص</button><small>الصورة تبقى في جهازك ولا تُرسل لأي جهة.</small></div>';
    return '<div class="wr-im"><img src="' + a.url + '" alt=""><div><b>' + E(describe(a, '')) + '</b><div class="wr-pal">' + a.pal.map(function(p){ return '<span title="' + p.name + '" style="background:' + p.hex + '"></span>'; }).join('') + '</div>' +
      '<ul><li>الأبعاد: <span class="num">' + a.w + '×' + a.h + '</span>' + (a.w < 1080 ? ' <em>أقل من 1080 بكسل: قد تظهر غير حادة على إنستغرام.</em>' : '') + '</li>' + (a.brv < 70 ? '<li><em>الصورة داكنة: ارفع السطوع أو اختر لقطة أوضح.</em></li>' : '') + '</ul>' +
      '<div class="wr-sz">' + SIZES.map(function(s){ var ok = Math.abs(a.ar - s[2]) < .25; return '<span class="' + (ok ? 'ok' : '') + '">' + s[1] + (ok ? ' ✓' : '') + '</span>'; }).join('') + '</div>' +
      '<div class="wr-ib"><button type="button" class="btn sm o" data-act="wrdet">تحليل ذكي للأجسام (يحمّل نموذجاً مجانياً)</button><button type="button" class="btn sm o" data-act="wralt">انسخ النص البديل (Alt)</button><button type="button" class="btn sm o" data-act="wrimg">صورة أخرى</button></div><small id="wrDetN">' + (a.objects.length ? 'اكتُشف: ' + a.objects.join('، ') : 'التحليل الذكي اختياري، ويحتاج اتصالاً بالإنترنت.') + '</small></div></div>';
  }
  function outHtml(){
    if (!W.res) return '<div class="wr-empty"><b>جاهز للكتابة</b><p>اختر المصدر ثم اضغط «اكتب لي». تحصل لكل منصة على ثلاث صيغ، وتعدّلها بيدك قبل النسخ.</p></div>';
    var tabs = W.plats.filter(function(k){ return W.res[k]; });
    var cur = tabs.indexOf(W.tab) > -1 ? W.tab : tabs[0];
    return '<div class="wr-tabs">' + tabs.map(function(k){ return '<button type="button" data-wt="' + k + '" class="' + (k === cur ? 'on' : '') + '">' + PLAT[k].n + '</button>'; }).join('') + '</div><p class="wr-tip">' + E(PLAT[cur].tip) + '</p>' +
      W.res[cur].map(function(t, i){ var lim = PLAT[cur].lim, over = lim && t.length > lim, bad = numbersToCheck(t, W); return '<div class="wr-card"><div class="wr-ch"><b>صيغة ' + (i + 1) + '</b>' + (lim ? '<span class="wr-cnt' + (over ? ' over' : '') + '"><span class="num">' + t.length + '</span> من <span class="num">' + lim + '</span></span>' : '<span class="wr-cnt"><span class="num">' + t.length + '</span> حرفاً</span>') + '</div><textarea data-wc="' + cur + ':' + i + '" rows="' + Math.min(14, Math.max(4, t.split('\n').length + 1)) + '">' + E(t) + '</textarea>' + (bad.length ? '<p class="wr-warn">راجع هذه الأرقام قبل النشر: <b class="num">' + bad.join('، ') + '</b></p>' : '') + '<div class="wr-cb"><button type="button" class="btn sm y" data-act="wrcopy" data-id="' + cur + ':' + i + '">نسخ</button><button type="button" class="btn sm o" data-act="wrre" data-id="' + cur + ':' + i + '">صيغة أخرى</button></div></div>'; }).join('') +
      '<div class="wr-chk"><b>قبل النشر</b><ul><li>الأرقام والتواريخ والأسعار مطابقة لما هو منشور على الموقع.</li><li>الصورة مرخّصة، ولا تُظهر وجهاً أو لوحة مركبة دون موافقة.</li><li>الرابط يعمل، والخط الساخن صحيح: <span class="num">1880001</span>.</li><li>اعتماد الجهة المختصة في الشركة قبل النشر.</li></ul><button type="button" class="btn sm o" data-act="wrall">تنزيل كل الصيغ ملفاً نصياً</button></div>';
  }
  function readForm(){
    W.topic = ($('wrTopic') || {}).value || W.topic; W.details = ($('wrDet') || {}).value || ''; W.intent = $('wrIntent').value; W.tone = $('wrTone').value; W.dia = $('wrDia').value; W.cta = $('wrCta').value; W.emoji = $('wrEmoji').value; W.link = $('wrLink').value.trim(); W.tags = $('wrTags').value.trim(); if ($('wrOcc')) W.occ = $('wrOcc').value;
  }
  function run(){
    readForm(); if (W.src === 'news' && W.newsId){ var n = K.db().news.filter(function(x){ return x.id === W.newsId; })[0]; if (n){ if (!W.topic) W.topic = n.title; if (!W.details) W.details = (n.body || '').split(/[.؟!\n]+/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 12; }).slice(0, 3).join('\n'); $('wrTopic') && ($('wrTopic').value = W.topic); $('wrDet') && ($('wrDet').value = W.details); } }
    if (W.src === 'img' && W.img && !W.topic){ W.topic = 'من واقع خدمتنا'; }
    if (!W.topic.trim()) return flash('اكتب الموضوع في سطر واحد أولاً.');
    if (!W.plats.length) return flash('اختر منصة واحدة على الأقل.');
    W.res = generate({topic: W.topic.trim(), details: W.details, intent: W.intent, tone: W.tone, dia: W.dia, occ: W.occ, cta: W.cta, emoji: W.emoji, link: W.link, tags: W.tags, plats: W.plats, seed: W.seed}, W.img);
    W.tab = W.plats[0]; $('wrOut').innerHTML = outHtml();
  }
  function allText(){ return W.plats.filter(function(k){ return W.res && W.res[k]; }).map(function(k){ return '=== ' + PLAT[k].n + ' ===\n' + W.res[k].map(function(t, i){ return '--- صيغة ' + (i + 1) + ' ---\n' + t; }).join('\n\n'); }).join('\n\n\n'); }
  function loadScript(src){ return new Promise(function(ok, no){ var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function detect(){
    var a = W.img; if (!a) return; var n = $('wrDetN'); n.textContent = 'جارٍ تحميل النموذج…';
    var load = window.cocoSsd ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js').then(function(){ return loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'); });
    var timer = setTimeout(function(){ n.textContent = 'تعذّر التحميل. تحقق من الاتصال وحاول مجدداً.'; }, 45000);
    load.then(function(){ return window.cocoSsd.load({base: 'lite_mobilenet_v2'}); }).then(function(m){ var im = new Image(); im.onload = function(){ m.detect(im).then(function(r){ clearTimeout(timer); var seen = {}; r.filter(function(o){ return o.score > .5; }).forEach(function(o){ seen[AR_OBJ[o.class] || o.class] = 1; }); a.objects = Object.keys(seen); $('wrSrcBox').innerHTML = imgBox(); if (!a.objects.length) $('wrDetN').textContent = 'لم يُكتشف شيء مؤكد. يمكنك كتابة الموضوع بنفسك.'; }); }; im.src = a.url; }).catch(function(){ clearTimeout(timer); n.textContent = 'تعذّر تشغيل التحليل الذكي هنا. التحليل المحلي للألوان والأبعاد يعمل دائماً.'; });
  }
  function pickImage(){
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none'; document.body.appendChild(inp);
    inp.onchange = function(){ var f = inp.files && inp.files[0]; inp.remove(); if (!f) return; K.compressImage(f, 1600, .85, function(err, url){ if (err) return flash(err); var im = new Image(); im.onload = function(){ var a = analyseImage(im); a.url = url; W.img = a; $('wrSrcBox').innerHTML = imgBox(); flash('قرأت الصورة.'); }; im.src = url; }); };
    inp.click();
  }
  document.addEventListener('click', function(e){
    if (X.tab() !== 'writer') return;
    var t, b;
    if ((t = e.target.closest('[data-ws]'))){ readForm(); W.src = t.getAttribute('data-ws'); [].forEach.call(document.querySelectorAll('#wrSrc button'), function(x){ x.classList.toggle('on', x === t); }); $('wrSrcBox').innerHTML = srcBox(K.db().news.slice().sort(function(a, b){ return a.d < b.d ? 1 : -1; })); return; }
    if ((t = e.target.closest('[data-wf]'))){ var f = FACTS[+t.getAttribute('data-wf')], ta = $('wrDet'); ta.value = (ta.value ? ta.value + '\n' : '') + f[0]; return; }
    if ((t = e.target.closest('[data-wp]'))){ var k = t.getAttribute('data-wp'), i = W.plats.indexOf(k); if (i > -1) W.plats.splice(i, 1); else W.plats.push(k); t.classList.toggle('on', i < 0); return; }
    if ((t = e.target.closest('[data-wt]'))){ W.tab = t.getAttribute('data-wt'); $('wrOut').innerHTML = outHtml(); return; }
    b = e.target.closest('button[data-act]'); if (!b) return; var a = b.getAttribute('data-act');
    if (a === 'wrgo'){ e.stopImmediatePropagation(); W.seed = 0; run(); }
    else if (a === 'wrimg'){ e.stopImmediatePropagation(); pickImage(); }
    else if (a === 'wrdet'){ e.stopImmediatePropagation(); detect(); }
    else if (a === 'wralt'){ e.stopImmediatePropagation(); copy(describe(W.img, ($('wrTopic') || {}).value || '')); }
    else if (a === 'wrcopy'){ e.stopImmediatePropagation(); var p = b.getAttribute('data-id').split(':'), ta2 = document.querySelector('[data-wc="' + b.getAttribute('data-id') + '"]'); copy(ta2 ? ta2.value : W.res[p[0]][+p[1]]); }
    else if (a === 'wrre'){ e.stopImmediatePropagation(); var q = b.getAttribute('data-id').split(':'); W.seed += 1; var o2 = {topic: W.topic.trim(), details: W.details, intent: W.intent, tone: W.tone, dia: W.dia, occ: W.occ, cta: W.cta, emoji: W.emoji, link: W.link, tags: W.tags, plats: [q[0]], seed: W.seed + +q[1]}; if (q[0] === 'li' || q[0] === 'pr') o2.tone = 'formal'; if (q[0] === 'pr' || q[0] === 'web') o2.emoji = 'none'; W.res[q[0]][+q[1]] = RENDER[q[0]](buildParts(o2, o2.seed), o2, W.img); $('wrOut').innerHTML = outHtml(); }
    else if (a === 'wrall'){ e.stopImmediatePropagation(); var blob = new Blob(['﻿' + allText()], {type: 'text/plain;charset=utf-8'}), l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'kptc-posts-' + K.today() + '.txt'; document.body.appendChild(l); l.click(); l.remove(); }
  }, true);
  document.addEventListener('change', function(e){
    if (X.tab() !== 'writer') return;
    if (e.target.id === 'wrNews'){ W.newsId = e.target.value; var n = K.db().news.filter(function(x){ return x.id === W.newsId; })[0]; if (n){ $('wrTopic').value = W.topic = n.title; $('wrDet').value = W.details = (n.body || '').split(/[.؟!\n]+/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 12; }).slice(0, 3).join('\n'); var cm = {'أخبار الشركة': 'news', 'بيانات صحفية': 'news', 'المسؤولية الاجتماعية': 'csr'}[n.cat]; if (cm){ $('wrIntent').value = cm; } } }
    if (e.target.id === 'wrIntent') $('wrOccL').hidden = e.target.value !== 'occasion';
  });
  document.addEventListener('input', function(e){ var t = e.target.closest && e.target.closest('[data-wc]'); if (!t) return; var p = t.getAttribute('data-wc').split(':'); W.res[p[0]][+p[1]] = t.value; var c = t.closest('.wr-card').querySelector('.wr-cnt'), lim = PLAT[p[0]].lim; c.innerHTML = lim ? '<span class="num">' + t.value.length + '</span> من <span class="num">' + lim + '</span>' : '<span class="num">' + t.value.length + '</span> حرفاً'; c.classList.toggle('over', !!lim && t.value.length > lim); });
  document.addEventListener('click', function(e){ var b = e.target.closest('button[data-act="wrnews"]'); if (b){ e.stopImmediatePropagation(); X.writeFromNews(b.getAttribute('data-id')); } }, true);
  /* from a news card: open the writer with that item */
  X.writeFromNews = function(id){ W.src = 'news'; W.newsId = id; var n = K.db().news.filter(function(x){ return x.id === id; })[0]; if (n){ W.topic = n.title; W.details = (n.body || '').split(/[.؟!\n]+/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 12; }).slice(0, 3).join('\n'); W.intent = n.cat === 'المسؤولية الاجتماعية' ? 'csr' : 'news'; W.res = null; } X.go('writer'); };

  /* ============================== marketing expert ============================== */
  var KB = [
    {k: 'منصة منصات اختيار ابدا قنوات افضل ابدأ اي منصه', q: 'أي منصات أبدأ بها لـ KPTC؟', a: '<p>لا تكن في كل مكان. اختر <b>ثلاث منصات أساسية ومنصتين داعمتين</b>:</p><ul><li><b>Snapchat وInstagram:</b> أوسع وصول للركاب والشباب في الكويت. للوعي وللإعلانات (اشتراك، عمرة).</li><li><b>X:</b> للتنبيهات التشغيلية وخدمة العملاء (سريع وقابل للبحث). ثبّت الخط الساخن 1880001.</li><li><b>TikTok:</b> وعي وتوظيف للشباب، بمحتوى خفيف من خلف الكواليس.</li><li><b>LinkedIn:</b> الاشتراكات المؤسسية وبيع المساحات الإعلانية والتوظيف.</li><li><b>Google Business Profile:</b> للونش والمقر والمواقع: من يبحث وقت الحاجة يجدك.</li><li><b>WhatsApp:</b> قناة أو قائمة بث لمن وافق، وروابط حجز مباشرة.</li></ul><p><b>القاعدة:</b> لكل منصة وظيفة واحدة واضحة، ومن يدير الحساب يعرف جمهوره.</p>'},
    {k: 'سناب سنابشات snap spotlight ستوري سناب شات', q: 'كيف أستفيد من Snapchat في الكويت؟', a: '<p>Snapchat من أقوى المنصات حضوراً في الكويت والخليج حسب أغلب الدراسات المنشورة. <b>تحقق من أحدث أرقام الجمهور من Snap Ads Manager</b> قبل أي ميزانية.</p><ul><li>عمودي 9:16، والفكرة في أول ثانيتين، ونص قصير على الشاشة.</li><li>لهجة قريبة وغير رسمية بدرجة مقبولة، وتجنّب الإنتاج المبالغ فيه.</li><li>الإعلانات: استهدف بالمحافظة والمنطقة والاهتمام، وجرّب إعلانات الستوري والـ Spotlight.</li><li>فكرة: عدسة AR تضع الحافلة K-Bus أمام المستخدم، أو سؤال تفاعلي عن أقرب خط.</li><li>قِس: مشاهدة 100% للفيديو، السحب للأعلى، والتسجيلات عبر Snap Pixel.</li></ul>'},
    {k: 'انستقرام انستغرام instagram ريلز reels كاروسيل carousel', q: 'ماذا أنشر على Instagram؟', a: '<ul><li><b>ريلز</b> للوصول لغير المتابعين: 15 إلى 25 ثانية، خطاف في أول 3 ثوانٍ، ترجمة على الشاشة.</li><li><b>سلايدات (Carousel)</b> لما يُحفظ: دليل الخطوط، كيف تشترك، مقارنة البطاقات.</li><li><b>ستوري</b> للتفاعل: استطلاع، سؤال وجواب، ملصق عد تنازلي للحملات.</li><li>أول سطرين من النص فيهما الفائدة. 5 إلى 8 وسوم ذات صلة لا أكثر. نص بديل لكل صورة.</li><li>إيقاع مقترح: 3 إلى 4 منشورات أسبوعياً وستوري يومي خفيف، وعدّله بحسب ما تثبته أرقامك.</li></ul>'},
    {k: 'تيك توك tiktok تيكتوك', q: 'هل أدخل TikTok؟ وكيف؟', a: '<p>نعم إن كان لديك من يصنع محتوى منتظماً. وإلا فاختر منصة أقل وافعل ذلك جيداً.</p><ul><li>أفكار تناسب النقل العام: خلف الكواليس (السائقون، الصيانة، الغسيل)، إجابات أسئلة الركاب، مقارنة تكلفة الاشتراك بتكلفة المركبة الخاصة.</li><li>اجعل المحتوى بشرياً وخفيفاً مع الحفاظ على صورة شركة حكومية رصينة. تجنّب الجدل والترندات غير المناسبة.</li><li>ابحث عن ترندات الصوت من مكتبة المنصة الرسمية (حقوق الملكية).</li><li>تفاعل مع التعليقات بفيديو رد.</li></ul>'},
    {k: 'اكس تويتر x twitter تنبيه تنبيهات خدمه العملاء', q: 'كيف أستخدم X؟', a: '<p>X هو قناة <b>الخدمة والتنبيهات</b> لا قناة الإبداع.</p><ul><li>ثبّت تغريدة بالخط الساخن 1880001 وروابط الحجز والاشتراك.</li><li>قوالب جاهزة معتمدة مسبقاً لحالات التأخير والتحويلات: السبب، الخطوط المتأثرة، الوقت المتوقع، متى التحديث القادم.</li><li>رد خلال ساعة في أوقات العمل، وانقل التفاصيل الشخصية إلى الخاص أو الخط الساخن.</li><li>وسم عربي واحد أو اثنان، ولا حشو.</li></ul>'},
    {k: 'واتساب whatsapp قناه بث قائمه', q: 'كيف أستفيد من واتساب؟', a: '<ul><li><b>قناة واتساب</b> للإعلانات العامة (إن كانت متاحة لحسابكم)، أو <b>قوائم البث</b> عبر WhatsApp Business لمن وافق صراحة على استقبال الرسائل.</li><li>روابط <span class="num">wa.me</span> على الموقع والإعلانات لاستقبال الحجوزات والاستفسارات.</li><li>لا ترسل لأرقام لم توافق. الموافقة والإلغاء السهل شرطان أساسيان.</li><li>تذكير تجديد الاشتراك قبل انتهائه بأيام قليلة من أكثر الرسائل فائدة.</li></ul>'},
    {k: 'لينكدإن linkedin لينكد شركات توظيف b2b', q: 'متى أستخدم LinkedIn؟', a: '<p>للجمهور المهني: <b>الاشتراكات المؤسسية</b> (خصم الجهات والشركات)، <b>بيع المساحات الإعلانية</b> على الحافلات، <b>التوظيف</b>، وصورة الشركة.</p><ul><li>نبرة مهنية، أرقام موثقة، قصة نجاح لكل منشور.</li><li>ظهور القيادات بالاسم يرفع الثقة، بموافقتهم.</li><li>استعمل Lead Gen Forms لو أردت جمع طلبات الجهات.</li></ul>'},
    {k: 'يوتيوب youtube فيديو شرح', q: 'ماذا عن YouTube؟', a: '<p>للمحتوى الذي يُبحث عنه ويبقى: <b>شروحات</b> (كيف أستخدم بطاقة التوفير، كيف أحجز عمرة، كيف أطلب الونش) بفيديو 60 إلى 120 ثانية، وعناوين عربية بالكلمات التي يبحث بها الناس، وفصول للفيديو، ثم تضمينه في صفحات الموقع.</p>'},
    {k: 'قوقل خرائط google business جوجل ونش ظهور بحث', q: 'كيف أظهر في بحث Google والخرائط؟', a: '<ul><li>أنشئ وحدّث <b>Google Business Profile</b> للمقر ومراكز الخدمة ومركز الأوناش: الساعات، الهاتف، الصور، الفئة.</li><li>للونش: الناس تبحث وقت الطوارئ، فاجعل رقم الاتصال ظاهراً وزر «اتصل» فعّالاً.</li><li>أجب عن التقييمات كلها بنبرة محترمة، وانقل الحالات الفردية إلى 1880001.</li><li>اكتب صفحات الموقع بعناوين تحمل كلمات البحث (ونش الكويت، اشتراك باص، رحلات عمرة).</li></ul>'},
    {k: 'مؤثرين مشاهير influencer انفلونسر', q: 'هل أتعاقد مع مؤثرين؟', a: '<ul><li>ابدأ بـ<b>مؤثرين صغار ومتوسطين</b> من ركّاب فعليين: مصداقية أعلى وتكلفة أقل من المشاهير.</li><li>اطلب إفصاحاً واضحاً عن الإعلان.</li><li><b>تحقق من اشتراطات الترخيص والإعلان المعمول بها في الكويت</b> قبل التعاقد، فهي قد تتغير.</li><li>اتفق مسبقاً على الرسالة والحقائق المسموح ذكرها، وعلى مراجعتكم المحتوى قبل النشر.</li><li>قِس بكود أو رابط خاص لكل مؤثر.</li></ul>'},
    {k: 'رمضان ramadan رمضانية', q: 'كيف أخطط لحملة رمضان؟', a: '<ul><li>ابدأ التخطيط قبل <b>6 أسابيع</b> من رمضان. التواريخ الهجرية تتحرك نحو 11 يوماً كل عام (راجع تبويب «تقويم المواسم»).</li><li>محتوى مفيد قبل الشهر: مواعيد التشغيل المعدّلة، وبعد الإفطار التسلية الخفيفة.</li><li>يتحول التفاعل غالباً إلى ما بعد الإفطار وقبل السحور، <b>اختبر ذلك على حسابك</b>.</li><li>العمرة موسم قوي قبل رمضان: ركّز على الحجز المبكر والأسعار الواضحة.</li><li>نبرة دافئة غير مبالغة في البيع.</li></ul>'},
    {k: 'وطني تحرير فبراير 25 26 يوم الوطني', q: 'حملة اليوم الوطني والتحرير', a: '<ul><li>الفكرة الأقوى: <b>نحرّك الكويت منذ 1962</b>: قصة الشركة مع الناس عبر العقود.</li><li>محتوى من الركّاب: «رحلتي في الباص» ومشاركات بصرية بإذن أصحابها.</li><li>إن كانت هناك حافلات مزيّنة أو عروض، اعلنها قبل 10 أيام لا قبلها بيوم.</li><li>احترم الطابع الوطني: نبرة فخر هادئة، بلا مبالغة تجارية.</li></ul>'},
    {k: 'مدارس العوده الدراسه طلاب طلبة', q: 'حملة العودة للمدارس', a: '<ul><li>الجمهور مزدوج: الأهل والطلاب. المنصات: Instagram وSnapchat للطلاب، Facebook وWhatsApp للأهل.</li><li>الرسالة: اشتراك واحد يغطي الشهر، ومواعيد الرحلات في أوقات الدوام.</li><li>للمدارس والجهات: عرض خصم الجهات 50% (حسب نظام الاشتراكات) بتواصل مباشر وملف تعريفي.</li><li>أنهِ التجهيز قبل بداية العام بثلاثة أسابيع.</li></ul>'},
    {k: 'صيف سفر عمره اجازه', q: 'حملات الصيف والسفر', a: '<p>حجوزات العمرة والـ VIP تُحسم مبكراً. اجعل الحملة <b>8 إلى 10 أسابيع</b> بدءاً من التشويق ثم الأسعار الواضحة (6 أيام بـ 60 د.ك، 11 يوماً بـ 85 د.ك للشخص) ثم قصص المعتمرين (بإذنهم) ثم «آخر المقاعد» بصدق لا بافتعال.</p>'},
    {k: 'مطر امطار طقس تحويلات طوارئ ازمه تأخير', q: 'التواصل وقت الأزمات والتأخير', a: '<ol><li>اعترف خلال 30 إلى 60 دقيقة: ما حدث بوضوح بلا تبرير.</li><li>اذكر الخطوط المتأثرة والبدائل ووقت التحديث التالي.</li><li>مصدر واحد للمعلومة (حساب X) تُنسخ منه بقية المنصات.</li><li>لا تحذف التعليقات الغاضبة. أجب أو وجّه إلى 1880001.</li><li>بعد الحدث: بيان قصير بما تحسّن.</li></ol><p>جهّز <b>قوالب معتمدة مسبقاً</b> لموسم الأمطار قبل بدايته.</p>'},
    {k: 'نبره لهجه صوت هويه رسمي عامي', q: 'ما نبرة العلامة المناسبة؟', a: '<p><b>ودّودة ومهنية</b>. فصحى مبسّطة هي الأساس، ولمسة كويتية خفيفة في المنصات الاجتماعية فقط.</p><ul><li>جمل قصيرة، فعل أمر مهذّب في الدعوات («اشتركوا»، «احجزوا»).</li><li>لا مبالغة ولا وعود لا تملكها الشركة.</li><li>الأرقام بالأرقام اللاتينية، والخط الساخن 1880001 ثابت في كل مادة.</li><li>التنبيهات التشغيلية والبيانات الصحفية بنبرة رسمية دائماً.</li></ul>'},
    {k: 'مقيمين وافدين لغات انجليزي هندي اردو فلبيني جاليات', q: 'كيف أخاطب المقيمين؟', a: '<p>المقيمون يشكلون غالبية السكان في الكويت، ومنهم قاعدة كبيرة لمستخدمي النقل العام.</p><ul><li>أنتج النسخة <b>الإنجليزية</b> للرسائل الأساسية (الاشتراك، الخطوط، الحجز)، وجرّب الهندية والأوردو والبنغالية والفلبينية حيث تثبت الأرقام جدواها (الموقع يدعمها بالترجمة).</li><li>قنوات المجتمعات: Facebook وWhatsApp أقوى من غيرها عند بعضها.</li><li>اعتمد ترجمة بشرية للرسائل الحساسة.</li></ul>'},
    {k: 'ميزانيه ميزانية تكلفه توزيع budget', q: 'كيف أوزع الميزانية؟', a: '<ul><li><b>70%</b> على ما أثبت نجاحه، <b>20%</b> على اختبارات محسوبة، <b>10%</b> على تجارب جديدة.</li><li>ابدأ بميزانية صغيرة لكل اختبار 7 إلى 14 يوماً، وزد على الفائز فقط.</li><li>لا تنفق قبل ضبط التتبع: بلا قياس لا تعرف ما نجح.</li><li>بلا ميزانية؟ المحتوى العضوي + Google Business + شراكات مع مؤثرين صغار + المحتوى الذي ينتجه الركّاب.</li></ul>'},
    {k: 'قياس مؤشرات kpi اداء نتائج تحليل analytics', q: 'ما المؤشرات التي أقيسها؟', a: '<ul><li><b>وعي:</b> الوصول، مشاهدات الفيديو، نمو المتابعين.</li><li><b>تفاعل:</b> معدل التفاعل، الحفظ والمشاركة (أهم من الإعجاب).</li><li><b>تحويل:</b> النقر إلى الموقع، <b>اشتراكات وحجوزات فعلية</b>، عدد المكالمات إلى 1880001 بعد الحملة، تكلفة الاشتراك الواحد.</li><li>ضع <b>خط أساس</b> قبل الحملة، ثم هدفاً بتحسين تدريجي. لا تعتمد أرقاماً مرجعية غير موثقة.</li></ul>'},
    {k: 'utm تتبع رابط ga4 analytics قوقل فايربيس', q: 'كيف أتتبع من أين جاء الاشتراك؟', a: '<p>ضع وسوم UTM على كل رابط:</p><p class="num" dir="ltr">?utm_source=snapchat&amp;utm_medium=paid&amp;utm_campaign=kptc_pass_202611&amp;utm_content=video_a</p><p>وفعّل <b>Google Analytics 4</b> أو <b>Firebase Analytics</b> (مجانيان) على الموقع بعد الاستضافة. وتتبّع المكالمات بأرقام أو رموز عرض مختلفة للحملات الكبيرة.</p>'},
    {k: 'اختبار ab تجربه نسختين', q: 'كيف أجري اختبار A/B؟', a: '<ol><li>غيّر <b>عنصراً واحداً</b> فقط (العنوان أو الصورة أو الدعوة للإجراء).</li><li>جمهور وميزانية ومدة متساوية، من 7 إلى 14 يوماً.</li><li>احكم بالمؤشر الذي يهمك (اشتراك لا إعجاب).</li><li>دوّن النتيجة في سجل التجارب وعمّم الفائز.</li></ol>'},
    {k: 'تقويم محتوى جدول خطه ركائز', q: 'كيف أبني تقويم محتوى؟', a: '<p>اعتمد <b>5 ركائز</b> تدور خلال الشهر: ① خدمة ونصائح ② قصص ناس ③ خلف الكواليس ④ عروض وتسجيل ⑤ مناسبات. اجعل 60% مفيداً/ملهماً و40% ترويجياً. وخطط للمواسم قبل 4 إلى 6 أسابيع. استعمل «مخطط الحملة» لتوليد جدول جاهز.</p>'},
    {k: 'تعليقات رد مجتمع شكاوى سلبي ادارة community', q: 'كيف أدير التعليقات والشكاوى؟', a: '<ul><li>اتفاق خدمة داخلي: رد خلال ساعة في الدوام، و24 ساعة خارجه.</li><li>رد أول بتعاطف وجملة واضحة، ثم انقل التفاصيل الشخصية إلى الخاص أو 1880001.</li><li>لا تطلب رقماً مدنياً أو بيانات شخصية علناً أبداً.</li><li>سجّل أكثر الشكاوى تكراراً وأرسلها شهرياً إلى الإدارات المعنية: هذا أثمن ما تقدمه وسائل التواصل للتشغيل.</li></ul>'},
    {k: 'اعلان مساحات اعلانات حافلات معلنين بيع b2b ادسبيس', q: 'كيف أسوّق للإعلان على الحافلات؟', a: '<ul><li>جهّز <b>ملفاً تعريفياً</b>: حجم الأسطول (400+ حافلة)، 26 مساراً، مناطق التغطية، مقاسات الحافلة ومواقع الإعلان، أمثلة تصميم.</li><li>استعمل معاينة الحافلة ثلاثية الأبعاد في صفحة الإعلانات كأداة بيع: يرى المعلن إعلانه قبل الشراء.</li><li>LinkedIn لمدراء التسويق، وGoogle Search على «إعلان على الباصات الكويت»، وتواصل مباشر مع الوكالات.</li><li>قصة نجاح لمعلن (بموافقته) بأرقام موثقة تُقنع أكثر من أي عرض أسعار.</li></ul>'},
    {k: 'عمره عمرة حجز مجموعات رحلات', q: 'تسويق رحلات العمرة', a: '<ul><li>موسمية: الذروة قبل رجب وشعبان ورمضان.</li><li>الثقة أولاً: السعر الواضح، ما يشمله، الشروط، قصص معتمرين بإذنهم، رقم الاتصال.</li><li>واتساب قناة الحجز الأنسب: رابط مباشر في كل مادة.</li><li>استهدف الأسر وكبار السن (Facebook وWhatsApp) والشباب (Snapchat وInstagram) برسائل مختلفة.</li></ul>'},
    {k: 'توظيف وظائف توطين تكويت استقطاب موظفين employer', q: 'تسويق الوظائف', a: '<ul><li>اعرض <b>حياة العمل</b>: وجوه الفريق وقصصهم، لا إعلان الشاغر فقط.</li><li>LinkedIn وX وInstagram. رابط مباشر لصفحة الوظائف.</li><li>اذكر المتطلبات والتواريخ بوضوح، وسياسة التوطين المعتمدة دون صياغة تثير لبساً.</li></ul>'},
    {k: 'مفقودات مفقود لقطه', q: 'ترويج خدمة المفقودات', a: '<p>تنجح عندما <b>تُظهر الأغراض المعثور عليها</b> (بصور لا تكشف بيانات شخصية) وتوجّه إلى صفحة المفقودات. اطلب من الناس مشاركتها، وانشر قصة «عاد الغرض لصاحبه» بإذنه: محتوى إنساني ومشاركات عالية.</p>'},
    {k: 'عنوان خطاف هوك كتابه نص كوبي copy جمله', q: 'كيف أكتب عنواناً يجذب؟', a: '<ul><li>ابدأ بالفائدة أو بسؤال أو برقم: «وفّر 10 د.ك في الشهر».</li><li>جملة قصيرة، وكلمة قوية في أولها.</li><li>فعل أمر مهذب في الدعوة، وكلمة واحدة لكل إجراء.</li><li>جرّب نسختين من العنوان (انظر «اختبار A/B»). واستعمل <b>كاتب المحتوى</b> لتوليد صيغ.</li></ul>'},
    {k: 'هاشتاق وسم hashtag هاشتاقات', q: 'ما الوسوم المناسبة؟', a: '<ul><li>3 إلى 8 وسوم ذات صلة، لا حشو.</li><li>وسم العلامة ثابت: <span dir="ltr">#KPTC</span>، ووسم محلي (#الكويت)، ووسم موضوع الحملة.</li><li>العربية بشرطة سفلية بين الكلمات (#النقل_العام).</li><li>راقب الوسم قبل استعماله: قد يرتبط بموضوع غير مناسب.</li></ul>'},
    {k: 'وقت اوقات نشر توقيت ذروة اسبوع', q: 'ما أفضل أوقات النشر؟', a: '<p>الأسبوع في الكويت من الأحد إلى الخميس. عادةً تظهر ذروات: <b>الصباح الباكر</b> (الطريق للعمل والمدرسة)، <b>بعد الظهر</b>، و<b>المساء بعد الدوام</b>. يتغير الإيقاع في رمضان والإجازات. <b>الأرقام الدقيقة لحسابك</b> تجدها في إحصاءات كل منصة: انشر في 3 أوقات مختلفة لأسبوعين ثم ثبّت الأفضل.</p>'},
    {k: 'خصوصيه قانون بيانات صور موافقه حقوق ملكيه موسيقى cITRA', q: 'الخصوصية والحقوق', a: '<ul><li>لا تصوّر وجوه الركاب أو السائقين أو لوحات المركبات دون موافقة.</li><li>جمع الأرقام والبيانات يلزمه موافقة صريحة وغرض واضح. <b>راجع لائحة حماية خصوصية البيانات الصادرة عن هيئة الاتصالات وتقنية المعلومات (CITRA)</b> وأي تحديثات.</li><li>الموسيقى والصور: استعمل مكتبات المنصات أو مواد مرخّصة.</li><li>لا تدّعِ ما لا تملك دليلاً عليه: أرقام الركاب والتقييمات والمقارنات بالمنافسين.</li></ul>'},
    {k: 'ولاء عملاء crm تجديد اشتراك تذكير بيانات', q: 'كيف أزيد تجديد الاشتراكات؟', a: '<ul><li>تذكير قبل الانتهاء بـ 5 إلى 7 أيام (يتوفر تاريخ الانتهاء في حساب العميل) برسالة موافَق عليها.</li><li>شرائح: مشترك 31 يوماً ← اقتراح 91 يوماً (نحو 0.27 د.ك في اليوم).</li><li>الاشتراك السنوي للجهات بخصم حسب النظام.</li><li>اجمع الموافقة على الرسائل عند التسجيل لا بعده.</li></ul>'},
    {k: 'تصوير فيديو انتاج مونتاج جوال', q: 'كيف أنتج فيديو بجودة بجوالي؟', a: '<ul><li>عمودي 9:16 بإضاءة نهار، وثبّت الجوال.</li><li>لقطات قصيرة (2 إلى 4 ثوانٍ)، وابدأ بالأقوى.</li><li>ترجمة مكتوبة دائماً: كثيرون يشاهدون بلا صوت.</li><li>صوت واضح قريب من المتحدث، وموسيقى من مكتبة المنصة.</li></ul>'},
    {k: 'اتجاهات تطورات جديد 2026 ترند ذكاء اصطناعي', q: 'ما أهم اتجاهات التسويق الآن؟', a: '<p>اتجاهات عامة حتى منتصف 2026. <b>تتغير الخوارزميات باستمرار، فراجع مراكز المساعدة الرسمية للمنصات.</b></p><ul><li>الفيديو العمودي القصير هو الشكل المهيمن.</li><li>البحث الاجتماعي: يبحث الناس في TikTok وInstagram وYouTube كما في Google.</li><li>صنّاع محتوى صغار وموثوقون بدل المشاهير الكبار.</li><li>أتمتة الإعلانات (Advantage+ في ميتا، PMax في Google): جرّبها لكن راجع المواد بيد بشرية.</li><li>واتساب قناة خدمة وتسويق، بالموافقة.</li><li>بيانات الطرف الأول بموافقة العميل بدل الاعتماد على التتبع الخارجي.</li><li>الأصالة والمحتوى الذي ينتجه المستخدمون يتفوقان على الإنتاج المصقول.</li><li>أدوات الذكاء الاصطناعي تسرّع المسودات، والاعتماد النهائي والتحقق من الحقائق بشري.</li></ul>'},
    {k: 'تصميم الوان هويه شعار مقاسات ابعاد', q: 'مقاسات المواد على كل منصة', a: '<ul><li>Instagram منشور: 1080×1350 (4:5). ستوري/ريلز/Snap/TikTok: 1080×1920 (9:16).</li><li>X وFacebook: 1600×900 (16:9). LinkedIn: 1200×627.</li><li>اترك هامشاً آمناً حول النص (نحو 10%) كي لا يُقص. الألوان: النيلي #2E2C78 والأصفر #FFC93C.</li></ul>'}
  ];
  function stem(w){ return w.replace(/^ال/, ''); }
  KB.forEach(function(e){ e.kk = nz(e.k + ' ' + e.q).split(' ').map(stem).filter(function(w){ return w.length > 1; }); });
  function askExpert(q){
    var toks = nz(q).split(' ').map(stem).filter(function(w){ return w.length > 1; }), sc = KB.map(function(e){ var s = 0; toks.forEach(function(t){ e.kk.forEach(function(k){ if (k === t) s += 3; else if (k.length >= 3 && t.length >= 3 && (k.indexOf(t) > -1 || t.indexOf(k) > -1)) s += 1.5; }); }); return {e: e, s: s}; }).sort(function(a, b){ return b.s - a.s; });
    if (!sc[0] || sc[0].s < 2.5) return {a: '<p>لم أجد جواباً مباشراً عن هذا السؤال. جرّب صياغة أقرب، أو اختر موضوعاً:</p>', rel: KB.slice(0, 6)};
    return {a: '<h4>' + E(sc[0].e.q) + '</h4>' + sc[0].e.a, rel: sc.slice(1, 4).filter(function(x){ return x.s >= 2; }).map(function(x){ return x.e; })};
  }
  var MK = {tab: 'ask', chat: [], plan: {goal: 'convert', prod: 'pass', weeks: 4, budget: 'low', aud: 'all', plats: {}}};
  T.marketing = ['الخبير التسويقي', 'مستشار تسويق رقمي بخبرة متخصصة بالكويت والخليج: اسأله، ودعه يبني لك خطة حملة وتقويماً للمواسم. نظام خبير مدمج يعمل بلا إنترنت، وإرشاداته تحتاج مراجعتك قبل التنفيذ.'];
  V.marketing = function(){
    $('hA').innerHTML = '';
    return '<div class="mkx"><div class="mk-tabs" id="mkTabs">' + [['ask', 'اسأل الخبير'], ['plan', 'مخطط الحملة'], ['cal', 'تقويم المواسم']].map(function(x){ return '<button type="button" data-mt="' + x[0] + '" class="' + (MK.tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><div id="mkBody">' + mkBody() + '</div></div>';
  };
  function mkBody(){ return MK.tab === 'plan' ? planHtml() : MK.tab === 'cal' ? calHtml() : askHtml(); }
  var SUG = ['أي منصات أبدأ بها؟', 'كيف أستفيد من Snapchat؟', 'كيف أخطط لحملة رمضان؟', 'كيف أتواصل وقت الأزمات؟', 'كيف أقيس نجاح الحملة؟', 'كيف أسوّق للإعلان على الحافلات؟', 'ما أفضل أوقات النشر؟', 'هل أتعاقد مع مؤثرين؟', 'ما أهم اتجاهات التسويق الآن؟', 'كيف أخاطب المقيمين؟'];
  function askHtml(){
    return '<div class="mk-ask"><div class="mk-who"><span>خ</span><div><b>خبير التسويق الرقمي</b><small>تسويق وسائل التواصل والحملات · الكويت والخليج</small></div></div><div class="mk-chat" id="mkChat">' + (MK.chat.length ? MK.chat.map(msgHtml).join('') : '<div class="mk-m bot"><p>أهلاً. أنا مستشارك التسويقي. اسألني عن منصة أو حملة أو موسم أو قياس أو خصوصية، أو اختر من الأسئلة أدناه.</p><p class="mk-nb">أجيب من معرفة مدمجة، لا من الإنترنت. أرقام المنصات وأنظمتها تتغير، فتحقق منها قبل الإنفاق.</p></div>') + '</div><div class="mk-sug" id="mkSug">' + SUG.map(function(s){ return '<button type="button" data-ms="' + E(s) + '">' + E(s) + '</button>'; }).join('') + '</div><form class="mk-in" id="mkIn"><input id="mkQ" placeholder="اكتب سؤالك…" autocomplete="off"><button class="btn y" type="submit">اسأل</button></form></div>';
  }
  function msgHtml(m){ return '<div class="mk-m ' + m.r + '">' + (m.r === 'me' ? '<p>' + E(m.t) + '</p>' : m.t + (m.rel && m.rel.length ? '<div class="mk-rel"><small>مواضيع ذات صلة:</small>' + m.rel.map(function(e){ return '<button type="button" data-ms="' + E(e.q) + '">' + E(e.q) + '</button>'; }).join('') + '</div>' : '')) + '</div>'; }
  function ask(q){
    q = (q || '').trim(); if (!q) return; MK.chat.push({r: 'me', t: q}); var r = askExpert(q); MK.chat.push({r: 'bot', t: r.a, rel: r.rel});
    var box = $('mkChat'); if (box){ box.innerHTML = MK.chat.map(msgHtml).join(''); box.scrollTop = box.scrollHeight; }
  }
  var PRODS = {
    pass: {n: 'بطاقة التوفير (31 / 91 يوماً)', facts: ['31 يوماً بـ 10 د.ك', '91 يوماً بـ 25 د.ك', 'رحلات بلا حدود على جميع الخطوط'], pillars: ['وفّر في تنقّلك الشهري', 'اشتراك إلكتروني بخطوات بسيطة', 'قصص ركّاب ورحلات يومية'], cta: 'اشتراك عبر الموقع'},
    umrah: {n: 'رحلات العمرة', facts: ['6 أيام بـ 60 د.ك', '11 يوماً بـ 85 د.ك للشخص'], pillars: ['سعر واضح وبرنامج مفصّل', 'ثقة وتنظيم: ما الذي يشمله الحجز', 'قصص معتمرين (بإذنهم)'], cta: 'حجز مقعد (واتساب أو الموقع)'},
    vip: {n: 'باصات VIP والتأجير', facts: ['حافلات VIP حتى 45 راكباً', 'سائق معتمد'], pillars: ['راحة وخصوصية للمجموعات', 'مناسبات وديوانيات ورحلات', 'مشاهد من الداخل'], cta: 'طلب عرض سعر'},
    winch: {n: 'الونش والورشة', facts: ['مركز الأوناش 24 ساعة', 'المحافظات الست', 'الخط الساخن 1880001'], pillars: ['أنت لست وحدك وقت الطارئ', 'كيف تطلب الونش خطوة بخطوة', 'نصائح سلامة على الطريق'], cta: 'اتصال أو طلب من الموقع'},
    ads: {n: 'الإعلان على الحافلات (B2B)', facts: ['أسطول 400+ حافلة', '26 مساراً', 'معاينة ثلاثية الأبعاد للإعلان'], pillars: ['وصول يومي في شوارع الكويت', 'شاهد إعلانك قبل أن تشتري', 'نتائج وقصص معلنين'], cta: 'طلب عرض أو لقاء'},
    jobs: {n: 'التوظيف', facts: ['فرص وظيفية عبر صفحة الوظائف'], pillars: ['كن جزءاً من فريق يحرّك الكويت', 'وجوه من الفريق', 'خطوات التقديم'], cta: 'تقديم عبر صفحة الوظائف'},
    gen: {n: 'تعريف عام بالخدمات', facts: ['نحرّك الكويت منذ 1962', '400+ حافلة', '26 مساراً'], pillars: ['كل خدماتنا في مكان واحد', 'خلف الكواليس', 'مجتمعنا'], cta: 'زيارة الموقع'}
  };
  var GOALS = {awareness: 'وعي وانتشار', convert: 'تسجيل أو اشتراك أو حجز', b2b: 'عملاء مؤسسيون ومعلنون', jobs: 'استقطاب مرشحين'};
  var SPLIT = {awareness: [['Snapchat', 30, 'وصول واسع'], ['Instagram', 25, 'ريلز ومنشورات'], ['TikTok', 25, 'فيديو قصير'], ['YouTube', 10, 'شرح يبقى'], ['X', 10, 'حضور وخدمة']],
    convert: [['Snapchat', 30, 'إعلانات بتحويل'], ['Instagram', 25, 'ريلز وستوري'], ['Google (بحث)', 20, 'من يبحث الآن'], ['WhatsApp', 15, 'حجز مباشر'], ['X', 10, 'خدمة وتنبيهات']],
    b2b: [['LinkedIn', 45, 'مدراء وجهات'], ['Google (بحث)', 25, 'كلمات الإعلان'], ['Instagram', 10, 'عرض بصري'], ['WhatsApp / بريد', 10, 'متابعة مباشرة'], ['X', 10, 'حضور']],
    jobs: [['LinkedIn', 40, 'مرشحون مهنيون'], ['Instagram', 20, 'حياة العمل'], ['X', 20, 'وصول وإعادة نشر'], ['TikTok', 10, 'شباب'], ['Snapchat', 10, 'خريجون']]};
  var KPIS = {awareness: ['الوصول والظهور', 'مشاهدات الفيديو (3 ثوانٍ و50%)', 'نمو المتابعين', 'الحفظ والمشاركة'], convert: ['النقر إلى الموقع', 'عدد الاشتراكات أو الحجوزات الفعلية', 'تكلفة الاشتراك الواحد', 'المكالمات إلى 1880001 خلال الحملة'], b2b: ['عدد الطلبات المؤهلة', 'تكلفة الطلب', 'اجتماعات أُقرّت', 'عقود مبرمة'], jobs: ['عدد المتقدمين المؤهلين', 'تكلفة المتقدم', 'نسبة إكمال الطلب', 'عدد المقابلات']};
  function planHtml(){
    var p = MK.plan, sel = function(id, items, cur){ return '<select id="' + id + '">' + items.map(function(x){ return '<option value="' + x[0] + '"' + (String(x[0]) === String(cur) ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>'; };
    return '<div class="mk-plan"><div class="box mk-pf"><div class="wr-g"><label class="f">هدف الحملة' + sel('mpGoal', Object.keys(GOALS).map(function(k){ return [k, GOALS[k]]; }), p.goal) + '</label><label class="f">الخدمة' + sel('mpProd', Object.keys(PRODS).map(function(k){ return [k, PRODS[k].n]; }), p.prod) + '</label><label class="f">المدة' + sel('mpWeeks', [[2, 'أسبوعان'], [4, '4 أسابيع'], [6, '6 أسابيع'], [8, '8 أسابيع']], p.weeks) + '</label><label class="f">الميزانية الإعلانية' + sel('mpBud', [['none', 'بلا ميزانية (عضوي)'], ['low', 'صغيرة'], ['mid', 'متوسطة'], ['high', 'كبيرة']], p.budget) + '</label><label class="f">الجمهور' + sel('mpAud', [['all', 'الجمهور العام'], ['stu', 'طلبة وشباب'], ['fam', 'أسر'], ['exp', 'مقيمون'], ['biz', 'شركات وجهات']], p.aud) + '</label></div><button type="button" class="btn y" data-act="mkplan">ابنِ الخطة</button></div><div id="mkPlanOut">' + (p.out || '<div class="wr-empty"><b>خطة حملة كاملة بضغطة</b><p>أهداف ورسائل وتوزيع منصات وتقويم أسبوعي ومؤشرات قياس وقائمة تحقق.</p></div>') + '</div></div>';
  }
  var WEEKS = ['تمهيد وتشويق', 'إطلاق وقيمة', 'دليل اجتماعي وقصص', 'تذكير وإغلاق', 'تعميق وتجديد', 'عرض ثانٍ', 'مراجعة وتحسين', 'ختام وشكر'];
  var FORMATS = {Snapchat: 'سنابة عمودية 9:16', Instagram: 'ريلز أو سلايدات', TikTok: 'فيديو 15-25 ث', YouTube: 'فيديو شرح 60-120 ث', X: 'تغريدة + بطاقة', 'Google (بحث)': 'إعلان بحث + صفحة هبوط', WhatsApp: 'رسالة بث موافَق عليها', 'WhatsApp / بريد': 'رسالة مباشرة', LinkedIn: 'منشور مهني + أرقام'};
  function buildPlan(){
    var p = MK.plan, pr = PRODS[p.prod], split = SPLIT[p.goal], bud = p.budget, wk = +p.weeks;
    var org = {none: 'كل الجهد عضوي: محتوى منتظم، Google Business، شراكات مع مؤثرين صغار، محتوى الركّاب.', low: 'ميزانية صغيرة: 70% عضوي و30% إعلانات مركّزة على منصتين فقط، مع اختبار نسختين.', mid: 'ميزانية متوسطة: 50% عضوي و50% إعلانات على 3 منصات، مع إعادة استهداف من تفاعل بالفيديو.', high: 'ميزانية كبيرة: إعلانات على كل القنوات، مؤثرون، ومتابعة أسبوعية للتحسين.'}[bud];
    var audTxt = {all: 'الجمهور العام في الكويت: مواطنون ومقيمون', stu: 'الطلبة والشباب', fam: 'الأسر وأولياء الأمور', exp: 'المقيمون (رسائل بالإنجليزية ولغات الجاليات)', biz: 'الشركات والجهات وصنّاع القرار'}[p.aud];
    var h = '<div class="mk-out"><div class="box"><h3>الخلاصة</h3><p><b>الهدف:</b> ' + GOALS[p.goal] + ' — <b>الخدمة:</b> ' + pr.n + ' — <b>الجمهور:</b> ' + audTxt + ' — <b>المدة:</b> ' + wk + ' أسابيع.</p><p>' + org + '</p><p><b>الحقائق المسموح استعمالها:</b> ' + pr.facts.map(E).join(' · ') + '</p></div>' +
      '<div class="box"><h3>ثلاث رسائل رئيسية</h3><ol>' + pr.pillars.map(function(x){ return '<li>' + E(x) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="box"><h3>توزيع المنصات</h3>' + split.map(function(s){ return '<div class="ov-bar"><span>' + s[0] + '</span><i><u style="width:' + s[1] * 2 + '%"></u></i><b class="num">' + s[1] + '%</b></div><small class="mk-sub">' + s[2] + '</small>'; }).join('') + '<p class="ov-tip">النسب إرشادية لتوزيع الجهد والمال، وتُعدَّل بعد أول أسبوعين بحسب النتائج.</p></div>' +
      '<div class="box"><h3>التقويم الأسبوعي</h3>' + Array.apply(null, Array(wk)).map(function(_, i){ var th = WEEKS[i % WEEKS.length], pil = pr.pillars[i % pr.pillars.length]; return '<div class="mk-w"><b>الأسبوع ' + (i + 1) + ' — ' + th + '</b><ul>' + split.slice(0, 4).map(function(s, k){ var day = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'][(k + i) % 5]; return '<li><span>' + day + '</span> ' + s[0] + ': ' + (FORMATS[s[0]] || 'منشور') + ' عن «' + E(pil) + '»</li>'; }).join('') + '</ul></div>'; }).join('') + '</div>' +
      '<div class="box"><h3>مؤشرات القياس</h3><ul>' + KPIS[p.goal].map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul><p class="ov-tip">سجّل <b>خط الأساس</b> قبل البدء، ثم ضع هدفاً بتحسين تدريجي. لا أعطيك أرقاماً مرجعية غير موثقة.</p><p class="num" dir="ltr">utm_campaign=kptc_' + p.prod + '_' + K.today().slice(0, 7).replace('-', '') + '</p></div>' +
      '<div class="box"><h3>قائمة التحقق قبل الإطلاق</h3><ul><li>الحقائق والأسعار مطابقة للموقع، والخط الساخن 1880001 ظاهر.</li><li>تتبع الروابط (UTM) وGoogle Analytics أو Firebase Analytics جاهز.</li><li>قوالب الرد على التعليقات والشكاوى جاهزة، ومن يديرها معروف.</li><li>موافقات الصور والمؤثرين والموسيقى.</li><li>اعتماد الإدارة المختصة. ونسخة إنجليزية إن كان الجمهور مقيماً.</li></ul></div><div><button type="button" class="btn o" data-act="mkcopy">نسخ الخطة نصاً</button></div></div>';
    return h;
  }
  /* upcoming Hijri / Gregorian dates, computed in the browser (Umm al-Qura; Kuwait follows the local sighting, so ±1 day) */
  function nextHijri(month, day){
    var f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {day: 'numeric', month: 'numeric'}), d = new Date(); d.setHours(12, 0, 0, 0);
    for (var i = 0; i < 400; i++){ var x = new Date(d.getTime() + i * 864e5), p = f.formatToParts(x), m = +p.filter(function(a){ return a.type === 'month'; })[0].value, dd = +p.filter(function(a){ return a.type === 'day'; })[0].value; if (m === month && dd === day) return x; }
    return null;
  }
  function nextGreg(m, d){ var n = new Date(), x = new Date(n.getFullYear(), m - 1, d, 12); if (x < new Date(n.getFullYear(), n.getMonth(), n.getDate())) x = new Date(n.getFullYear() + 1, m - 1, d, 12); return x; }
  function secondTue(){ var n = new Date(), y = n.getFullYear(); function f(yr){ var d = new Date(yr, 1, 1, 12), c = 0; while (true){ if (d.getDay() === 2 && ++c === 2) return d; d = new Date(d.getTime() + 864e5); } } var x = f(y); if (x < new Date(n.getFullYear(), n.getMonth(), n.getDate())) x = f(y + 1); return x; }
  var EVENTS = [
    {n: 'بداية رجب (موسم العمرة)', h: [7, 1], lead: 45, ideas: ['افتح حجز رحلات العمرة مبكراً', 'قصص معتمرين بإذنهم', 'برنامج الرحلة وما يشمله'], pl: 'WhatsApp · Facebook · Instagram'},
    {n: 'بداية شعبان', h: [8, 1], lead: 30, ideas: ['آخر دفعة حجز قبل رمضان', 'تذكير بالمستندات المطلوبة'], pl: 'WhatsApp · X'},
    {n: 'رمضان المبارك', h: [9, 1], lead: 42, ideas: ['مواعيد التشغيل المعدّلة خلال الشهر', 'محتوى ما بعد الإفطار الخفيف', 'تهنئة صادقة بلا مبالغة بيعية'], pl: 'Snapchat · Instagram · X'},
    {n: 'عيد الفطر', h: [10, 1], lead: 21, ideas: ['جدول تشغيل العيد', 'تهنئة من فريق KPTC (السائقون والموظفون)'], pl: 'كل المنصات'},
    {n: 'عيد الأضحى', h: [12, 10], lead: 21, ideas: ['جدول تشغيل العيد والحج', 'تنبيه بالازدحام وبدائل الخطوط'], pl: 'X · Snapchat · Instagram'},
    {n: 'رأس السنة الهجرية', h: [1, 1], lead: 10, ideas: ['تهنئة بسيطة', 'منشور عن مسيرة العام'], pl: 'X · Instagram'},
    {n: 'اليوم الوطني', g: [2, 25], lead: 30, ideas: ['نحرّك الكويت منذ 1962', 'رحلتي في الباص (محتوى الركاب)', 'حافلات مزيّنة إن وُجدت'], pl: 'Snapchat · Instagram · TikTok'},
    {n: 'يوم التحرير', g: [2, 26], lead: 21, ideas: ['فخر وامتنان بنبرة هادئة', 'قصص من الميدان (بإذن)'], pl: 'X · Instagram'},
    {n: 'اليوم الرياضي الوطني', fn: secondTue, lead: 14, ideas: ['فكرة: امشِ ثم اركب (محطة قريبة من ممشى)', 'مشاركة الموظفين'], pl: 'Instagram · TikTok'},
    {n: 'اليوم العالمي للبيئة', g: [6, 5], lead: 14, ideas: ['الحافلات الكهربائية K-eBus وأثرها', 'نصائح لتقليل الازدحام باستعمال النقل العام'], pl: 'LinkedIn · Instagram'},
    {n: 'اليوم العالمي للنقل العام', g: [9, 10], lead: 21, ideas: ['إنجازات الشركة وأرقامها الموثقة', 'عرض أو مسابقة للركاب'], pl: 'LinkedIn · X · Snapchat'},
    {n: 'العودة للمدارس (تقريبياً)', g: [8, 25], lead: 28, ideas: ['اشتراك الطلاب والمدارس (خصم الجهات حسب النظام)', 'مواعيد الرحلات مع أوقات الدوام'], pl: 'Instagram · Snapchat · WhatsApp'},
    {n: 'بداية موسم الأمطار (تقريبياً)', g: [11, 1], lead: 21, ideas: ['قوالب تنبيه معتمدة مسبقاً', 'نصائح سلامة وتوجيه إلى 1880001'], pl: 'X · WhatsApp'}
  ];
  function calHtml(){
    var rows = EVENTS.map(function(e){ var d = e.h ? nextHijri(e.h[0], e.h[1]) : e.fn ? e.fn() : nextGreg(e.g[0], e.g[1]); if (!d) return null; var days = Math.round((d - new Date()) / 864e5), start = days - e.lead; return {e: e, d: d, days: days, start: start}; }).filter(Boolean).sort(function(a, b){ return a.days - b.days; });
    return '<p class="ov-tip" style="margin-bottom:12px">التواريخ الهجرية تُحسب بتقويم أم القرى داخل المتصفح، وتقديرية (قد تختلف يوماً بحسب الرؤية في الكويت). التواريخ الميلادية الثابتة والتقريبية موضّحة.</p><div class="mk-cal">' + rows.map(function(r){ var hot = r.start <= 0; return '<div class="mk-ev' + (hot ? ' hot' : '') + '"><div class="mk-d"><b class="num">' + r.days + '</b><small>يوم</small></div><div><h4>' + E(r.e.n) + '</h4><p class="num">' + r.d.toLocaleDateString('ar-KW-u-nu-latn', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) + '</p><p class="mk-st">' + (hot ? '<b>ابدأ الآن:</b> دخلت نافذة التحضير (قبل ' + r.e.lead + ' يوماً)' : 'ابدأ التحضير بعد <span class="num">' + r.start + '</span> يوماً (قبل ' + r.e.lead + ' يوماً)') + '</p><ul>' + r.e.ideas.map(function(x){ return '<li>' + E(x) + '</li>'; }).join('') + '</ul><small>التركيز: ' + E(r.e.pl) + '</small></div></div>'; }).join('') + '</div>';
  }
  function planText(){ var el = $('mkPlanOut'); return el ? el.innerText : ''; }
  document.addEventListener('click', function(e){
    if (X.tab() !== 'marketing') return;
    var t = e.target.closest('[data-mt]'); if (t){ MK.tab = t.getAttribute('data-mt'); $('mkBody').innerHTML = mkBody(); [].forEach.call(document.querySelectorAll('#mkTabs button'), function(x){ x.classList.toggle('on', x === t); }); return; }
    t = e.target.closest('[data-ms]'); if (t){ ask(t.getAttribute('data-ms')); return; }
    var b = e.target.closest('button[data-act]'); if (!b) return; var a = b.getAttribute('data-act');
    if (a === 'mkplan'){ e.stopImmediatePropagation(); var p = MK.plan; p.goal = $('mpGoal').value; p.prod = $('mpProd').value; p.weeks = +$('mpWeeks').value; p.budget = $('mpBud').value; p.aud = $('mpAud').value; p.out = buildPlan(); $('mkPlanOut').innerHTML = p.out; }
    else if (a === 'mkcopy'){ e.stopImmediatePropagation(); copy(planText()); }
  }, true);
  document.addEventListener('submit', function(e){ if (e.target.id === 'mkIn'){ e.preventDefault(); var q = $('mkQ').value; $('mkQ').value = ''; ask(q); } });

  /* ============================== styles ============================== */
  var css = document.createElement('style');
  css.textContent = [
    '.wr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:18px;align-items:start}',
    '.wr-in{display:grid;gap:12px}.wr-src,.mk-tabs{display:flex;border:2px solid var(--kp-line);border-radius:12px;overflow:hidden;background:#fff}.wr-src button,.mk-tabs button{flex:1;border:0;background:none;padding:10px 12px;font:700 13.5px var(--f-body);color:var(--kp-muted);cursor:pointer}.wr-src button.on,.mk-tabs button.on{background:var(--kp-ink);color:var(--kp-sign)}',
    '.wr .f input,.wr .f textarea,.wr .f select,.mk-pf .f select{width:100%;border:1.5px solid var(--kp-line-2);border-radius:10px;padding:9px 12px;font:500 14.5px var(--f-body);background:#fff}.wr .f textarea{resize:vertical}',
    '.wr-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wr-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.wr-facts,.wr-pl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.wr-facts small,.wr-pl small{flex-basis:100%;color:var(--kp-muted);font-size:12.5px}.wr-facts button{border:1px solid var(--kp-line-2);background:var(--kp-paper-2);border-radius:14px;padding:3px 11px;font:600 12px var(--f-body);cursor:pointer;color:var(--kp-ink)}.wr-facts button:hover{border-color:var(--kp-indigo)}',
    '.wr-pl button{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--kp-line-2);background:#fff;border-radius:18px;padding:4px 12px 4px 6px;font:600 12.5px var(--f-body);cursor:pointer;color:var(--kp-ink)}.wr-pl button i{font-style:normal;min-width:24px;height:22px;border-radius:11px;background:var(--kp-paper);display:grid;place-items:center;font-size:10.5px;font-weight:800}.wr-pl button.on{background:var(--kp-indigo);border-color:var(--kp-indigo);color:#fff}.wr-pl button.on i{background:var(--kp-sign);color:var(--kp-ink)}',
    '.wr-go{justify-self:start;padding:12px 28px;font-size:15.5px}',
    '.wr-up{display:grid;gap:6px;justify-items:start;padding:14px;border:2px dashed var(--kp-line-2);border-radius:12px;background:var(--kp-paper-2)}.wr-up small{color:var(--kp-muted)}',
    '.wr-im{display:grid;grid-template-columns:150px 1fr;gap:12px;padding:10px;border:1px solid var(--kp-line);border-radius:12px;background:var(--kp-paper-2)}.wr-im img{width:100%;border-radius:8px;object-fit:cover;aspect-ratio:4/3}.wr-im b{font-size:13.5px;line-height:1.6}.wr-im ul{margin:6px 0;padding-inline-start:18px;font-size:12.5px;color:var(--kp-muted)}.wr-im em{color:#8a5a00;font-style:normal}',
    '.wr-pal{display:flex;gap:5px;margin:6px 0}.wr-pal span{width:26px;height:26px;border-radius:8px;border:1px solid rgba(0,0,0,.12)}.wr-sz{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}.wr-sz span{font-size:11.5px;border:1px solid var(--kp-line-2);border-radius:10px;padding:1px 9px;color:var(--kp-muted)}.wr-sz span.ok{background:#EAF8F1;border-color:#A8E0C6;color:#0C7A4D}.wr-ib{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}',
    '.wr-out{display:grid;gap:12px;min-width:0}.wr-empty{text-align:center;padding:50px 20px;border:2px dashed var(--kp-line);border-radius:16px;color:var(--kp-muted)}.wr-empty b{display:block;color:var(--kp-ink);font-size:17px;margin-bottom:4px}',
    '.wr-tabs{display:flex;gap:6px;flex-wrap:wrap}.wr-tabs button{border:1.5px solid var(--kp-line-2);background:#fff;border-radius:16px;padding:5px 14px;font:700 12.5px var(--f-body);cursor:pointer}.wr-tabs button.on{background:var(--kp-ink);border-color:var(--kp-ink);color:var(--kp-sign)}.wr-tip{font-size:13px;color:var(--kp-muted);background:var(--kp-paper-2);border-radius:10px;padding:8px 12px}',
    '.wr-card{background:#fff;border:1px solid var(--kp-line);border-radius:14px;padding:12px}.wr-ch{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.wr-cnt{font-size:12.5px;color:var(--kp-muted);background:var(--kp-paper);border-radius:10px;padding:1px 10px}.wr-cnt.over{background:#FCEDEC;color:#A82A24;font-weight:700}',
    '.wr-card textarea{width:100%;border:1.5px solid var(--kp-line);border-radius:10px;padding:10px 12px;font:500 14.5px/1.85 var(--f-body);resize:vertical;background:var(--kp-paper-2)}.wr-card textarea:focus{outline:0;border-color:var(--kp-indigo);background:#fff}.wr-cb{display:flex;gap:6px;margin-top:8px}.wr-warn{font-size:12.5px;color:#8a5a00;background:#FFF6E3;border:1px solid #F0D48E;border-radius:8px;padding:5px 10px;margin-top:6px}',
    '.wr-chk{background:#fff;border:1px dashed var(--kp-line-2);border-radius:14px;padding:12px 16px}.wr-chk ul{margin:6px 0 10px;padding-inline-start:20px;font-size:13px;color:var(--kp-muted);line-height:1.9}',
    '.mk-tabs{margin-bottom:14px;max-width:520px}.mk-ask{display:grid;gap:10px;max-width:860px}',
    '.mk-who{display:flex;gap:12px;align-items:center;background:linear-gradient(120deg,var(--kp-indigo),#3d3a96);color:#fff;border-radius:16px;padding:14px 18px}.mk-who span{width:46px;height:46px;border-radius:50%;background:var(--kp-sign);color:var(--kp-ink);display:grid;place-items:center;font:800 20px var(--f-display)}.mk-who small{display:block;color:#CFCDEA}',
    '.mk-chat{display:grid;gap:10px;max-height:52vh;overflow:auto;padding:4px 2px}.mk-m{max-width:92%;border-radius:16px;padding:10px 14px;line-height:1.85;font-size:14.5px}.mk-m.bot{background:#fff;border:1px solid var(--kp-line);justify-self:start}.mk-m.me{background:var(--kp-ink);color:#fff;justify-self:end}.mk-m h4{font:800 15.5px var(--f-display);margin-bottom:6px;color:var(--kp-indigo)}.mk-m ul,.mk-m ol{padding-inline-start:20px;margin:6px 0}.mk-m li{margin-bottom:3px}.mk-m p{margin:4px 0}.mk-nb{font-size:12.5px;color:var(--kp-muted)}',
    '.mk-rel{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}.mk-rel small{width:100%;color:var(--kp-muted)}.mk-rel button,.mk-sug button{border:1.5px solid var(--kp-line-2);background:#fff;border-radius:16px;padding:4px 13px;font:600 12.5px var(--f-body);cursor:pointer;color:var(--kp-indigo)}.mk-rel button:hover,.mk-sug button:hover{border-color:var(--kp-indigo);background:var(--kp-paper-2)}.mk-sug{display:flex;gap:6px;flex-wrap:wrap}',
    '.mk-in{display:flex;gap:8px}.mk-in input{flex:1;border:2px solid var(--kp-line);border-radius:14px;padding:11px 16px;font:500 15px var(--f-body);outline:0}.mk-in input:focus{border-color:var(--kp-indigo)}',
    '.mk-plan{display:grid;gap:14px}.mk-pf{display:grid;gap:12px}.mk-out{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;align-items:start}.mk-out .box h3{margin-bottom:8px}.mk-out ul,.mk-out ol{padding-inline-start:20px;line-height:1.9;font-size:14px}.mk-sub{display:block;color:var(--kp-muted);font-size:12px;margin:-6px 0 8px}.mk-w{border-top:1px dashed var(--kp-line);padding:8px 0}.mk-w b{color:var(--kp-indigo)}.mk-w li span{display:inline-block;min-width:62px;font-weight:700}',
    '.mk-cal{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}.mk-ev{display:grid;grid-template-columns:auto 1fr;gap:14px;background:#fff;border:1px solid var(--kp-line);border-radius:16px;padding:14px}.mk-ev.hot{border-color:#E5B14A;background:#FFFBEB}.mk-d{width:62px;height:62px;border-radius:14px;background:var(--kp-ink);color:var(--kp-sign);display:grid;place-items:center;align-content:center;text-align:center}.mk-d b{font:800 22px/1 var(--f-display);direction:rtl}.mk-d small{font-size:11px;color:#CFCDEA}.mk-ev h4{font:800 16px var(--f-display);margin-bottom:2px}.mk-ev p{font-size:13px;color:var(--kp-muted)}.mk-ev .mk-st{color:var(--kp-ink);margin:4px 0}.mk-ev ul{padding-inline-start:18px;margin:4px 0;font-size:13.5px;line-height:1.8}.mk-ev small{color:var(--kp-muted);font-size:12px}',
    '@media(max-width:1100px){.wr{grid-template-columns:1fr}}@media(max-width:560px){.wr-g,.wr-g2{grid-template-columns:1fr}.wr-im{grid-template-columns:1fr}}'
  ].join('\n');
  document.head.appendChild(css);
})();
