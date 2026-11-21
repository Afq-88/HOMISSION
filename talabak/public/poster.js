/* ملصق QR الحصري (A4): الرابط يُؤخذ من «رابط النشر العام» في الإعدادات (لا من معاملات الصفحة) لمنع إنتاج ملصقات مضلِّلة بشعار الشركة */
(function () {
  'use strict';
  const K = window.KArt, sheet = document.getElementById('sheet'), tagIn = document.getElementById('tag');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = new URLSearchParams(location.search);
  let base = location.origin, eventName = 'معرض الصناعات', dates = '';
  const clean = v => (/^[A-Za-z0-9_-]*$/.test(v || '') ? (v || '').slice(0, 30) : '');
  tagIn.value = clean(qs.get('b')) || 'booth1';

  function qrSvg(url) {
    const q = qrcode(0, 'H'); q.addData(url); q.make(); const n = q.getModuleCount(), m = 2, S = n + 2 * m;
    const c = n / 2 + m, hole = n * 0.19; // مساحة الشعار في المنتصف (الرمز بمستوى تصحيح H يتحمّل ٣٠٪)
    let d = '';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      if (!q.isDark(r, k)) continue;
      const x = k + m + .5, y = r + m + .5; if (Math.abs(x - c) < hole && Math.abs(y - c) < hole) continue;
      d += `M${k + m} ${r + m}h1v1h-1z`;
    }
    return `<svg class="qr" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="${S}" height="${S}" fill="#fff"/><path d="${d}" fill="#14173f"/><g><circle cx="${c}" cy="${c}" r="${hole * 1.18}" fill="#fff"/><image href="/brand/logo-mark.png" x="${c - hole * 0.95}" y="${c - hole * 0.95}" width="${hole * 1.9}" height="${hole * 1.9}"/></g></svg>`;
  }
  const skyline = () => `<svg class="sky" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g fill="#fff" opacity=".09"><rect x="20" y="150" width="60" height="110"/><rect x="95" y="120" width="44" height="140"/><rect x="150" y="170" width="70" height="90"/><rect x="560" y="140" width="64" height="120"/><rect x="640" y="100" width="48" height="160"/><rect x="700" y="160" width="90" height="100"/><rect x="250" y="190" width="50" height="70"/></g>
    <g fill="#fff" opacity=".16"><path d="M380 260V70h10v190z"/><ellipse cx="385" cy="92" rx="26" ry="14"/><ellipse cx="385" cy="92" rx="26" ry="14" opacity=".4" transform="translate(0 -3)"/><path d="M455 260V120h8v140z"/><circle cx="459" cy="132" r="14"/><path d="M510 260V90h6v170z"/></g>
    <circle cx="700" cy="52" r="26" fill="#eae71a" opacity=".9"/></svg>`;
  const SVCS = [['subscriptions', 'اشتراكات النقل', 'Subscriptions'], ['charter', 'رحلات وحافلات VIP', 'Trips & VIP buses'], ['ads', 'إعلانات الحافلات', 'Bus advertising'], ['towing', 'أوناش ونقل مركبات', 'Towing'], ['workshop', 'ورش وإصلاح', 'Workshop'], ['other', 'أي استفسار', 'Any enquiry']];
  const SCAN = [['en', 'Scan with your phone camera', 'ltr'], ['ur', 'اپنے فون کے کیمرے سے اسکین کریں', 'rtl'], ['hi', 'अपने फ़ोन के कैमरे से स्कैन करें', 'ltr'], ['bn', 'আপনার ফোনের ক্যামেরা দিয়ে স্ক্যান করুন', 'ltr'], ['fil', 'I-scan gamit ang camera ng iyong phone', 'ltr']];

  function draw() {
    const tag = clean(tagIn.value), url = `${base.replace(/\/+$/, '')}/?s=qr_booth${tag ? '&b=' + tag : ''}`, show = url.replace(/^https?:\/\//, '');
    const local = /^(https?:\/\/)?(localhost|127\.|10\.|192\.168\.|\[?::1)/.test(base) || !/^https:/.test(base);
    document.getElementById('tnote').innerHTML = local ? '<b class="bad">لا تطبع الآن: الرابط الحالي محلي أو غير مشفّر. اضبط «رابط النشر العام» (HTTPS) في الإعدادات.</b>' : 'اختبر الرمز بجوّال حقيقي وسجّل طلبًا تجريبيًا قبل الطباعة. الرابط: <bdi dir="ltr">' + esc(url) + '</bdi>';
    sheet.innerHTML = `
      <header class="top">${skyline()}
        <div class="logo-pill"><img src="/brand/logo.png" alt="KPTC — شركة النقل العام الكويتية"></div>
        <div class="evt"><span>${esc(eventName)}</span>${dates ? `<i></i><span>${esc(dates)}</span>` : ''}</div>
        <h1>طلبك معنا</h1>
        <p class="en">Your Request With Us</p>
      </header>
      <section class="mid">
        <p class="call"><b>امسح الرمز</b> واكتب طلبك — <b>أياً كان</b></p>
        <div class="qrcard"><i class="cn c1"></i><i class="cn c2"></i><i class="cn c3"></i><i class="cn c4"></i>${qrSvg(url)}</div>
        <div class="scan"><div class="scan-ar">وجّه كاميرا جوالك نحو الرمز</div><ul>${SCAN.map(([c, t, d]) => `<li lang="${c}" dir="${d}">${esc(t)}</li>`).join('')}</ul></div>
        <ol class="steps"><li><b>1</b><span>امسح الرمز<small>Scan</small></span></li><li><b>2</b><span>اختر خدمتك أو اكتب استفسارك<small>Choose or write</small></span></li><li><b>3</b><span>استلم رقم طلبك ونتواصل معك<small>Get your number</small></span></li></ol>
        <ul class="svcs">${SVCS.map(([id, ar, en]) => { const [c1, c2] = K.lineOf(id); return `<li style="--c1:${c1};--c2:${c2}"><span class="ic">${K.icon(id)}</span><b>${esc(ar)}</b><small>${esc(en)}</small></li>`; }).join('')}</ul>
      </section>
      <footer class="bot"><div class="road"><div class="bus">${K.bus()}</div></div>
        <div class="fine"><span class="u" dir="ltr">${esc(show)}</span><span>تسجيل الطلب لا يُعد تأكيدًا للحجز أو تفعيلًا للخدمة. بياناتك تُستخدم لمعالجة الطلب والتواصل بشأنه فقط.</span></div></footer>`;
  }
  document.getElementById('print').onclick = () => window.print();
  tagIn.oninput = () => { const v = clean(tagIn.value); if (v !== tagIn.value) tagIn.value = v; draw(); };
  fetch('/api/public/config', { cache: 'no-store' }).then(r => r.json()).then(c => {
    if (c.base_url) base = c.base_url; if (c.event) { eventName = c.event.name; if (c.event.start && c.event.end) { const f = d => new Date(d + 'T00:00:00Z').toLocaleDateString('ar-KW-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); dates = f(c.event.start) + ' – ' + f(c.event.end); } }
  }).catch(() => {}).finally(draw);
})();
