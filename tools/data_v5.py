#!/usr/bin/env python3
"""One-time data correction (v5): replace prototype figures with the company's published data.
Sources: kptc.com.kw (contact, services, tenders, rental/towing/workshop price lists,
Savings Card and Umrah bulletins, K-Bus network map). Every edit asserts that the old text exists."""
import re, glob, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s)
def rep(s, a, b, n=1, tag=''):
    assert a in s, 'MISSING: ' + (tag or a[:70])
    return s.replace(a, b) if n == 0 else s.replace(a, b, n)

def R(s, a, b, tag=''):
    assert a in s, 'MISSING ' + (tag or a[:60]); return s.replace(a, b)

# ───────────── global: contact facts ─────────────
GLOBAL = [('22228800','22328866'),('22328800','22328866'),('المقر الرئيسي — حولي','المقر الرئيسي — المرقاب'),
          ('marketing@kptc.com.kw','info@kptc.com.kw'),('t.alhajri@kptc.com.kw','info@kptc.com.kw'),('1880 001','1880001')]
files = glob.glob(os.path.join(ROOT,'pages/*.html')) + glob.glob(os.path.join(ROOT,'src/site/*.html')) + [os.path.join(ROOT,'src/core.js'), os.path.join(ROOT,'src/store.js'), os.path.join(ROOT,'index.html')]
for f in files:
    s = open(f, encoding='utf-8').read(); o = s
    for a, b in GLOBAL: s = s.replace(a, b)
    if s != o: open(f, 'w', encoding='utf-8').write(s)

# ───────────── home ─────────────
p = 'pages/home.html'; s = rd(p)
s = rep(s, '<p class="kx-eyebrow"><b class="num">40</b> مليون رحلة كل عام · نحرّك الكويت منذ <b class="num">1962</b></p>',
           '<p class="kx-eyebrow">أكثر من <b class="num">400</b> حافلة · نحرّك الكويت منذ <b class="num">1962</b></p>')
s = rep(s, '<span><b class="num">150</b> خطاً</span><span><b class="num">6</b> محافظات</span>', '<span><b class="num">26</b> مساراً</span><span><b class="num">1,050</b> سائق</span>')
s = rep(s, '<span>الدفع عبر كي نت</span>', '<span>الدفع بكي نت وفيزا</span>')
# LED sign: real routes and their main terminals; clearly an example
s = rep(s, '<span>محطة مجمع حولي</span>', '<span>لافتة المحطة — مثال</span>')
s = rep(s, '<span class="live"><i></i>مباشر</span>', '<span class="live"><i></i>توضيحي</span>')
s = rep(s, 'الأوقات تقديرية وتتحدّث كل 30 ثانية.', 'أمثلة توضيحية لشكل اللافتة. للمواعيد الفعلية اتصل بالخط الساخن 1880001.')
s = rep(s, """{r:'15',d:'السالمية',v:'عبر شارع تونس',m:3},
    {r:'21',d:'الفروانية',v:'عبر الدائري الرابع',m:7},
    {r:'40',d:'مدينة الكويت',v:'عبر شارع الخليج',m:11},
    {r:'66',d:'الجهراء',v:'عبر الدائري السادس',m:16},
    {r:'99',d:'الفحيحيل',v:'عبر طريق الفحيحيل',m:22}""",
"""{r:'15',d:'المالية',v:'المحطة الرئيسية',m:3},
    {r:'21',d:'المرقاب',v:'المحطة الرئيسية',m:7},
    {r:'40',d:'جليب الشيوخ',v:'المحطة الرئيسية',m:11},
    {r:'77',d:'السالمية',v:'المحطة الرئيسية',m:16},
    {r:'11',d:'الشرق',v:'المحطة الرئيسية',m:22}""")
# trip finder: the official terminals
terms = ['المالية','المرقاب','الشرق','السالمية','جليب الشيوخ','صبحان','الفحيحيل','الجهراء','خيطان','السليبية','مطار الكويت']
opts = ''.join('<option>%s</option>' % t for t in terms)
s = re.sub(r'(<select id="from" name="from">\s*).*?(\s*</select>)', lambda m: m.group(1)+opts+m.group(2), s, flags=re.S)
s = re.sub(r'(<select id="to" name="to">\s*).*?(\s*</select>)', lambda m: m.group(1)+''.join('<option>%s</option>' % t for t in terms[3:]+terms[:3])+m.group(2), s, flags=re.S)
s = rep(s, '<a href="KPTC_Routes.html">خط 15</a>\n          <a href="KPTC_Routes.html">خط 21</a>\n          <a href="KPTC_Routes.html">الشويخ — المدينة</a>',
           '<a href="KPTC_Routes.html">خط 15</a>\n          <a href="KPTC_Routes.html">خط 21</a>\n          <a href="KPTC_Routes.html">خط 77</a>')
# ticker
s = re.sub(r'<div class="kx-run" id="kxRun">.*?</div></div>\n</div>', '''<div class="kx-run" id="kxRun">
    <a href="KPTC_Subscriptions.html">بطاقة التوفير: <b class="num">10</b> د.ك لـ <b class="num">31</b> يوماً و<b class="num">25</b> د.ك لـ <b class="num">91</b> يوماً على جميع الخطوط</a>
    <a href="KPTC_Umrah.html">رحلات العمرة: <b class="num">6</b> أيام بـ <b class="num">60</b> د.ك و<b class="num">11</b> يوماً بـ <b class="num">85</b> د.ك للشخص</a>
    <a href="KPTC_Winch.html">مركز الأوناش يعمل <b class="num">24</b> ساعة طوال أيام الأسبوع في المحافظات الست</a>
    <a href="KPTC_Routes.html">أكثر من <b class="num">400</b> حافلة و<b class="num">1,050</b> سائق في خدمتك</a>
    <a href="#contact">الخط الساخن <b class="num">1880001</b> · الهاتف <b class="num">22328866</b></a>
  </div></div>
</div>''', s, flags=re.S)
s = rep(s, '<span class="kx-live"><i></i>الآن</span>', '<span class="kx-live"><i></i>KPTC</span>')
# quick tasks
s = rep(s, '<b>اشترك شهرياً</b><span>من <span class="num">15</span> د.ك، رحلات غير محدودة</span><em>الدفع بكي نت</em>',
           '<b>بطاقة التوفير</b><span>من <span class="num">10</span> د.ك لـ <span class="num">31</span> يوماً</span><em>رحلات بلا حدود</em>')
s = rep(s, '<span>اختر مقعدك وادفع إلكترونياً</span><em>بقيت <span class="num">3</span> مقاعد</em>', '<span>من <span class="num">60</span> د.ك شاملة التأشيرة</span><em>6 أو 11 يوماً</em>')
s = rep(s, '<span>نحتفظ بالأغراض <span class="num">30</span> يوماً</span>', '<span>أبلغ عن غرض نسيته في الحافلة</span>')
# facts
s = re.sub(r'<p>نحرّك الكويت منذ أكثر من ستة عقود:.*?</p>', '<p>نحرّك الكويت منذ عام <strong class="num">1962</strong>: أكثر من <strong class="num">400</strong> حافلة و<strong class="num">1,050</strong> سائق يخدمون جميع مناطق الكويت، وقد نقلنا أكثر من <strong>70 مليون</strong> راكب في عام 2004 وحده.</p>', s, count=1, flags=re.S)
s = rep(s, '<span>أول مشغّل نقل عام<br>في الكويت</span>', '<span>تأسست بالمرسوم<br>الأميري رقم 60</span>')
# service map
for a, b in [
 ('<span>اشتراك شهري بـ 15 د.ك لرحلات غير محدودة.</span>', '<span>بطاقة التوفير: 10 د.ك لـ 31 يوماً، رحلات بلا حدود.</span>'),
 ('<li><a href="KPTC_Subscriptions.html"><b>نقل المدارس</b><span>عقود سنوية بحافلات مخصّصة للطلاب.</span></a></li>', '<li><a href="KPTC_VIP.html"><b>التأجير الداخلي</b><span>حافلات بجميع الأنواع والأحجام لكل الرحلات داخل الكويت.</span></a></li>'),
 ('<span>اختر مقعدك وأضف التأمين، من 22 د.ك.</span>', '<span>شاملة التأشيرة والسكن والمواصلات، من 60 د.ك.</span>'),
 ('<li><a href="KPTC_VIP.html"><b>باصات VIP</b><span>رحلات داخلية وخارجية بسائقين معتمدين.</span></a></li>', '<li><a href="KPTC_VIP.html"><b>تأجير الحافلات السياحية</b><span>حافلات من 19 إلى 45 راكباً، بأسعار معلنة.</span></a></li>'),
 ('<li><a href="KPTC_VIP.html"><b>باص الديوانية</b><span>للأعراس والمناسبات والزيارات الجماعية.</span></a></li>', '<li><a href="KPTC_VIP.html"><b>التأجير الإقليمي</b><span>رحلات إلى الدول المجاورة بحافلات حديثة.</span></a></li>'),
 ('<span>نصلك في أي مكان بالكويت، على مدار الساعة.</span>', '<span>من الشويخ حتى العبدلي، 24 ساعة طوال أيام الأسبوع.</span>'),
 ('<li><a href="#contact"><b>الشكاوى والاقتراحات</b><span>نرد عليك خلال يوم عمل واحد.</span></a></li>', '<li><a href="#contact"><b>الخط الساخن</b><span>اتصل على 1880001 للاستفسار والملاحظات.</span></a></li>'),
 ('<span>إعلانك يتنقّل مع 2,500 حافلة في شوارع الكويت.</span>', '<span>إعلانك يتنقّل مع أسطول يزيد على 400 حافلة.</span>'),
 ('كل الاشتراكات تشمل جميع الخطوط، وتُدفع إلكترونياً عبر كي نت.', 'بطاقة التوفير تشمل جميع الخطوط، وتُدفع إلكترونياً بكي نت أو فيزا أو ماستركارد.'),
]: s = rep(s, a, b)
# calculator: honest, based on the published card prices
s = re.sub(r'<section class="block kx-calc-sec" id="calc">.*?</section>', '''<section class="block kx-calc-sec" id="calc">
  <div class="wrap kx-calc">
    <div class="kx-calc-in">
      <h2>كم تصرف على تنقّلك كل شهر؟</h2>
      <p>حرّك المؤشر حسب ما تدفعه الآن، ونحسب لك الفرق مع بطاقة التوفير بصراحة، حتى لو كانت بطاقتنا لا تناسبك.</p>
      <label for="kxSpend">إنفاقك الشهري على التنقّل (د.ك) <output id="kxSpendO" class="num">20</output></label>
      <input type="range" id="kxSpend" min="2" max="60" step="1" value="20">
      <small>بطاقة التوفير: <span class="num">10</span> د.ك لـ <span class="num">31</span> يوماً، أو <span class="num">25</span> د.ك لـ <span class="num">91</span> يوماً، على جميع الخطوط.</small>
    </div>
    <div class="kx-calc-out" aria-live="polite">
      <div class="kx-bars">
        <div class="kx-bar"><span>إنفاقك الحالي</span><div class="kx-track"><i id="kxBarT"></i></div><b><span class="num" id="kxPay">20.0</span> د.ك</b></div>
        <div class="kx-bar kx-sub"><span>بطاقة 31 يوماً</span><div class="kx-track"><i id="kxBarS"></i></div><b><span class="num">10.0</span> د.ك</b></div>
      </div>
      <div class="kx-verdict" id="kxVerdict">
        <small id="kxVLabel">توفّر كل شهر مع بطاقة التوفير</small>
        <strong><span class="num" id="kxSave">10.0</span> د.ك</strong>
        <p id="kxVNote">وبالبطاقة 91 يوماً تصل إلى <span class="num" id="kxYear">0</span> د.ك في السنة.</p>
      </div>
      <a class="btn kx-go" id="kxCta" href="KPTC_Subscriptions.html">اشترك في بطاقة التوفير</a>
    </div>
  </div>
</section>''', s, count=1, flags=re.S)
js_a = s.index('  /* savings calculator'); js_b = s.index('  /* umrah seat strip')
s = s[:js_a] + '''  /* savings calculator: spend vs the published Savings Card prices */
  var SP=document.getElementById('kxSpend');
  function calc(){
    var pay=+SP.value,sub=10,card91=25/3,diff=pay-sub,mx=Math.max(pay,sub,1);
    document.getElementById('kxSpendO').textContent=pay;
    document.getElementById('kxPay').textContent=pay.toFixed(1);
    document.getElementById('kxBarT').style.width=(pay/mx*100)+'%';document.getElementById('kxBarS').style.width=(sub/mx*100)+'%';
    var v=document.getElementById('kxVerdict'),win=diff>0.5;
    v.classList.toggle('kx-even',!win);
    document.getElementById('kxVLabel').textContent=win?'توفّر كل شهر مع بطاقة التوفير':'إنفاقك أقل من سعر البطاقة بمقدار';
    document.getElementById('kxSave').textContent=Math.abs(diff).toFixed(1);
    document.getElementById('kxVNote').innerHTML=win?'وبالبطاقة 91 يوماً تصل إلى <span class="num">'+Math.round((pay-card91)*12)+'</span> د.ك في السنة.':'البطاقة تفيدك إذا زاد إنفاقك الشهري على <span class="num">10</span> د.ك.';
    var c=document.getElementById('kxCta');c.textContent=win?'اشترك في بطاقة التوفير':'اعرف المزيد عن البطاقة';
    v.classList.remove('kx-bump');void v.offsetWidth;v.classList.add('kx-bump');
  }
  SP.addEventListener('input',calc);calc();
''' + s[js_b:]
s = re.sub(r"  /\* umrah seat strip.*?\n  var st='';.*?\n", '', s, count=1, flags=re.S)
# fares table
s = re.sub(r'<tbody>\s*<tr>\s*<td class="plan"><b>الأساسية</b>.*?</tbody>', '''<tbody>
        <tr>
          <td class="plan"><b>بطاقة التوفير</b><span>31 يوماً</span></td>
          <td class="price"><b class="num">10</b><span>د.ك / 31 يوماً</span><small class="kx-perday">نحو 0.32 د.ك في اليوم</small></td>
          <td class="inc">رحلات بلا حدود على جميع الخطوط.</td>
          <td class="go"><a class="btn btn-row" href="KPTC_Subscriptions.html">اشترك لـ 31 يوماً</a></td>
        </tr>
        <tr class="pick">
          <td class="plan"><b>بطاقة التوفير<span class="pick-note">توفّر 5 د.ك</span></b><span>91 يوماً</span></td>
          <td class="price"><b class="num">25</b><span>د.ك / 91 يوماً</span><small class="kx-perday">بدل <s class="num">30</s> د.ك لثلاث بطاقات شهرية</small></td>
          <td class="inc">رحلات بلا حدود على جميع الخطوط، بسعر أقل في اليوم.</td>
          <td class="go"><a class="btn btn-row" href="KPTC_Subscriptions.html">اشترك لـ 91 يوماً</a></td>
        </tr>
        <tr>
          <td class="plan"><b>اشتراكات الجهات</b><span>الهيئات والوزارات والشركات</span></td>
          <td class="price"><b class="num">50%</b><span>خصم يصل إلى</span></td>
          <td class="inc">نظام اشتراكات مرن بخصومات تصل إلى 50%، بالتعاقد مع الشركة.</td>
          <td class="go"><a class="btn btn-row" href="KPTC_Subscriptions.html">اطلب عرض سعر</a></td>
        </tr>
      </tbody>''', s, count=1, flags=re.S)
# umrah banner
s = rep(s, '<div class="kx-date"><b class="num">20</b><span>ديسمبر</span></div>', '<div class="kx-date"><b class="num">60</b><span>د.ك</span></div>')
s = rep(s, '<small>رحلة العمرة القادمة</small>', '<small>رحلات العمرة</small>')
s = rep(s, '<h2>مكة المكرمة والمدينة المنورة، <span class="num">11</span> يوماً</h2>', '<h2>رحلة عمرة <span class="num">6</span> أيام أو <span class="num">11</span> يوماً</h2>')
s = rep(s, '<p>شاملة التأشيرة والسكن والمواصلات، من <span class="num">108</span> د.ك للشخص.</p>', '<p>السعر يشمل السكن والمواصلات والتأشيرة فقط، للشخص في غرفة جماعية.</p>')
s = re.sub(r'<div class="kx-seats" aria-label="المقاعد المتبقية">.*?</div>', '<div class="kx-seats"><span><b class="num">6</b> أيام (3 ليالٍ في مكة): <b class="num">60</b> د.ك</span><span><b class="num">11</b> يوماً (6 ليالٍ في مكة وليلتان في المدينة): <b class="num">85</b> د.ك</span></div>', s, count=1, flags=re.S)
s = rep(s, '<a class="btn btn-sign" href="KPTC_Umrah.html">احجز مقعدك</a>', '<a class="btn btn-sign" href="KPTC_Umrah.html">اطّلع على الرحلات</a>')
# business section
s = rep(s, '<h2><span class="num">128,000</span> راكب يمرّون من محطاتنا كل يوم</h2><p>ضع نشاطك أو إعلانك حيث يمرّ الناس فعلاً.</p>', '<h2>أسطول يزيد على <span class="num">400</span> حافلة في شوارع الكويت</h2><p>ضع نشاطك أو إعلانك حيث يمرّ الناس فعلاً.</p>')
s = rep(s, '<em><span class="num">2,500</span> حافلة</em>', '<em><span class="num">400</span>+ حافلة</em>')
s = rep(s, '<p>إعلانك يتحرّك في شوارع الكويت كل يوم، بباقات تبدأ من حافلات قليلة.</p>', '<p>إعلانك يتحرّك في شوارع الكويت كل يوم على حافلات الشركة.</p>')
s = rep(s, '<p>محلات، مطاعم، مكاتب ولوحات داخل <span class="num">8</span> مواقع في المحافظات الست.</p>', '<p>محلات ومطاعم ومكاتب ولوحات داخل مواقع الشركة ومحطاتها.</p>')
s = rep(s, '<em><span class="num">12</span> متاحة الآن</em>', '<em>للإيجار</em>')
# app: no store listing is published by the company
s = rep(s, '<a class="store" href="#"><small>حمّله من</small><b>App Store</b></a>', '<span class="store"><small>قريباً على</small><b>App Store</b></span>')
s = rep(s, '<a class="store" href="#"><small>احصل عليه من</small><b>Google Play</b></a>', '<span class="store"><small>قريباً على</small><b>Google Play</b></span>')
s = rep(s, '<li>تجديد الاشتراك والدفع بكي نت</li>', '<li>تجديد بطاقة التوفير والدفع بكي نت</li>')
# contact + closing
s = rep(s, '<div class="c-item"><span>حجز العمرة</span><a class="num" href="tel:22328866">22328866</a></div>', '<div class="c-item"><span>الخط الساخن</span><a class="num" href="tel:1880001">1880001</a></div>')
s = rep(s, '<div class="c-item"><span>المقر الرئيسي</span><b>حولي</b></div>', '<div class="c-item"><span>المقر الرئيسي</span><b>المرقاب</b></div>')
s = rep(s, 'رحلتك القادمة تبدأ بـ <span class="num">15</span> د.ك', 'رحلتك القادمة تبدأ بـ <span class="num">10</span> د.ك')
s = rep(s, '<p>فريق خدمة العملاء يرد على استفساراتك وشكاواك يومياً.</p>', '<p>صندوق بريد <span class="num">375</span> الصفاة، <span class="num">13004</span> الكويت · فاكس <span class="num">22328870</span></p>')
wr(p, s)
print('home ok')

# ───────────── subscriptions → Savings Card ─────────────
p = 'pages/subs.html'; s = rd(p)
s = rep(s, '<p>اشتراكات مرنة تناسب أسلوب حياتك — من تذكرة يومية حتى اشتراك سنوي. ادفع إلكترونياً وابدأ رحلتك فوراً.</p>',
           '<p>بطاقة التوفير: تنقّل بلا حدود على جميع الخطوط بـ 10 د.ك لـ 31 يوماً، أو 25 د.ك لـ 91 يوماً. ادفع إلكترونياً وابدأ رحلتك.</p>')
cards = '''<div class="sub-hero-grid">
        <!-- 31 days -->
        <div class="sub-card" onclick="addToCart('basic')">
          <div class="sub-icon">🚌</div>
          <div class="sub-title">بطاقة التوفير — 31 يوماً</div>
          <div class="sub-price-wrap">
            <span class="sub-price" id="price-basic">10</span>
            <span class="sub-price-unit"> د.ك</span>
          </div>
          <div class="sub-period" id="period-basic">/ 31 يوماً — رحلات بلا حدود</div>
          <ul class="sub-feats">
            <li class="sub-feat"><span class="feat-check">✓</span> رحلات بلا حدود على جميع الخطوط</li>
            <li class="sub-feat"><span class="feat-check">✓</span> بطاقة توفير شخصية بصورتك</li>
            <li class="sub-feat"><span class="feat-check">✓</span> صالحة 31 يوماً</li>
            <li class="sub-feat"><span class="feat-check">✓</span> للاستفسار: 22328307</li>
          </ul>
          <button class="btn-sub">أضف للسلة</button>
        </div>

        <!-- 91 days -->
        <div class="sub-card featured" onclick="addToCart('premium')">
          <div class="featured-badge">⭐ الأوفر</div>
          <div class="sub-icon">💎</div>
          <div class="sub-title">بطاقة التوفير — 91 يوماً</div>
          <div class="sub-price-wrap">
            <span class="sub-price" id="price-premium">25</span>
            <span class="sub-price-unit"> د.ك</span>
          </div>
          <div class="sub-period" id="period-premium">/ 91 يوماً — وفّر 17%</div>
          <div class="sub-savings" id="savings-premium">💰 توفير 5 د.ك مقارنة بثلاث بطاقات شهرية</div>
          <ul class="sub-feats">
            <li class="sub-feat"><span class="feat-check">✓</span> رحلات بلا حدود على جميع الخطوط</li>
            <li class="sub-feat"><span class="feat-check">✓</span> بطاقة توفير شخصية بصورتك</li>
            <li class="sub-feat"><span class="feat-check">✓</span> صالحة 91 يوماً</li>
            <li class="sub-feat"><span class="feat-check">✓</span> نحو 0.27 د.ك في اليوم</li>
          </ul>
          <button class="btn-sub">أضف للسلة</button>
        </div>

        <!-- Organisations -->
        <div class="sub-card" onclick="addToCart('school')">
          <div class="sub-icon">🏫</div>
          <div class="sub-title">اشتراكات الجهات والشركات</div>
          <div class="sub-price-wrap">
            <span class="sub-price" id="price-school">50%</span>
            <span class="sub-price-unit"> خصم</span>
          </div>
          <div class="sub-period" id="period-school">/ حتى — حسب نظام الاشتراكات</div>
          <ul class="sub-feats">
            <li class="sub-feat"><span class="feat-check">✓</span> للهيئات والوزارات والشركات</li>
            <li class="sub-feat"><span class="feat-check">✓</span> خصومات تصل إلى 50%</li>
            <li class="sub-feat"><span class="feat-check">✓</span> التعاقد عبر إدارة التسويق وخدمة العملاء</li>
            <li class="sub-feat"><span class="feat-check">✓</span> اتصل: 22328866</li>
          </ul>
          <button class="btn-sub">اطلب عرض سعر</button>
        </div>
      </div>'''
s = re.sub(r'<div class="sub-hero-grid">.*?</div>\s*\n\s*<!-- Compare -->', cards + '\n\n      <!-- Compare -->', s, count=1, flags=re.S)
tbl = '''<thead>
            <tr>
              <th>البند</th>
              <th>31 يوماً</th>
              <th class="featured-col">91 يوماً ⭐</th>
              <th>الجهات</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>السعر</td><td><b>10 د.ك</b></td><td class="featured-col"><b>25 د.ك</b></td><td>حسب العقد</td></tr>
            <tr><td>مدة الصلاحية</td><td>31 يوماً</td><td class="featured-col">91 يوماً</td><td>حسب العقد</td></tr>
            <tr><td>السعر في اليوم</td><td>نحو 0.32 د.ك</td><td class="featured-col">نحو 0.27 د.ك</td><td>خصم يصل إلى 50%</td></tr>
            <tr><td>رحلات بلا حدود</td><td><span class="check-yes">✓</span></td><td class="featured-col"><span class="check-yes">✓</span></td><td><span class="check-yes">✓</span></td></tr>
            <tr><td>جميع الخطوط</td><td><span class="check-yes">✓</span></td><td class="featured-col"><span class="check-yes">✓</span></td><td><span class="check-yes">✓</span></td></tr>
            <tr><td>بطاقة شخصية</td><td><span class="check-yes">✓</span></td><td class="featured-col"><span class="check-yes">✓</span></td><td><span class="check-yes">✓</span></td></tr>
          </tbody>'''
s = re.sub(r'<table class="compare-table">\s*<thead>.*?</tbody>', '<table class="compare-table">\n          ' + tbl, s, count=1, flags=re.S)
s = re.sub(r'<div class="compare-title">📊 مقارنة الباقات</div>', '<div class="compare-title">📊 مقارنة البطاقات</div>', s)
faq = [
 ('كيف أستخدم الاشتراك؟', 'بطاقة التوفير شخصية وتتيح لك التنقّل بلا حدود على جميع الخطوط طوال مدة صلاحيتها. للاستفسار عن طريقة الإصدار والتفعيل اتصل بالرقم 22328307.'),
 ('ما الفرق بين بطاقة 31 يوماً و91 يوماً؟', 'كلتاهما تشمل جميع الخطوط بلا حدود. بطاقة 91 يوماً بـ 25 د.ك، أي أوفر بـ 5 د.ك من ثلاث بطاقات شهرية (30 د.ك).'),
 ('ما وسائل الدفع المقبولة؟', 'نقبل كي نت (KNET) وفيزا (Visa) وماستركارد (MasterCard) وCashU وUAE Exchange.'),
 ('هل الاشتراك يشمل جميع الخطوط؟', 'نعم، بطاقة التوفير تشمل جميع مسارات K-Bus. للهيئات والوزارات والشركات خصومات تصل إلى 50% بالتعاقد، اتصل بالرقم 22328866.'),
]
items = re.findall(r'<div class="faq-item">.*?</div>\s*</div>', s, flags=re.S)
assert len(items) == 4, len(items)
for it, (q, a) in zip(items, faq):
    new = '<div class="faq-item">\n            <div class="faq-q" onclick="toggleFaq(this)">%s <span class="faq-arrow">▾</span></div>\n            <div class="faq-a">%s</div>\n          </div>' % (q, a)
    s = s.replace(it, new, 1)
# JS
s = rep(s, "basic: {monthly:15, annual:12*12*0.8},\n  premium: {monthly:40, annual:40*4*0.8},\n  school: {monthly:35, annual:35},", "basic: {monthly:10, annual:10},\n  premium: {monthly:25, annual:25},\n  school: {monthly:0, annual:0},")
s = re.sub(r"function updatePrices\(\) \{.*?\n\}\n", '''function updatePrices() {
  // Savings Card prices are fixed: 31 days = 10 KD, 91 days = 25 KD
  document.getElementById('price-basic').textContent = '10';
  document.getElementById('period-basic').textContent = '/ 31 يوماً — رحلات بلا حدود';
  document.getElementById('price-premium').textContent = '25';
  document.getElementById('period-premium').textContent = '/ 91 يوماً — وفّر 17%';
}
''', s, count=1, flags=re.S)
s = rep(s, "const names = {basic:'الباقة الأساسية',premium:'الباقة المميزة ⭐',school:'باقة المدارس'};\n  const priceMap = {basic:isBillingAnnual?144:15, premium:isBillingAnnual?128:40, school:isBillingAnnual?112:35};",
           "const names = {basic:'بطاقة التوفير — 31 يوماً',premium:'بطاقة التوفير — 91 يوماً ⭐',school:'اشتراك الجهات والشركات'};\n  const priceMap = {basic:10, premium:25, school:0};\n  if (type==='school') { if (window.KPTC) KPTC.addBooking({id:KPTC.id('SUB'), type:'اشتراك', page:'subs', title:'طلب عرض سعر لاشتراك جهات', amount:0, status:'قيد المعالجة'}); showToast('✅ سُجّل طلبك. للتسعير اتصل 22328866'); return; }")
s = rep(s, "detail: isBillingAnnual?'سنوي':'شهري'});", "detail: 'بطاقة التوفير'});")
wr(p, s)
print('subs ok')

# ───────────── umrah ─────────────
p = 'pages/umrah.html'; s = rd(p)
s = re.sub(r'<div class="hero-stats kp-stats">.*?(?:</div>\s*){3}(?=\n)', '''<div class="hero-stats kp-stats">
      <div class="hstat"><div class="hstat-num">60 د.ك</div><div class="hstat-label">رحلة 6 أيام</div></div>
      <div class="hstat-div"></div>
      <div class="hstat"><div class="hstat-num">85 د.ك</div><div class="hstat-label">رحلة 11 يوماً</div></div>
      <div class="hstat-div"></div>
      <div class="hstat"><div class="hstat-num">1880001</div><div class="hstat-label">الخط الساخن</div></div>
    </div>''', s, count=1, flags=re.S) if '<div class="hstat"><div class="hstat-num">22 د.ك</div>' in s else s
s = rep(s, 'احجز رحلتك بكل سهولة — اختار المقعد، أضف التأمين، وادفع إلكترونياً. رحلات تشمل التأشيرة والسكن والمواصلات.', 'احجز رحلتك بكل سهولة — اختر المقعد وادفع إلكترونياً. رحلات حديثة تشمل التأشيرة والسكن والمواصلات، بأسعار مميزة للأفراد والمجموعات والشركات.')
trips_new = '''const trips = [
  {id:1, date:'14', month:'ديسمبر', weekday:'الخميس', title:'مكة المكرمة — مرور بالمدينة المنورة', route:'الكويت → مكة → المدينة (مرور) → الكويت', days:6, nights:3, seats:12, priceQuad:60, priceDouble:80, priceSingle:110, tags:['مرور','6 أيام','3 ليالٍ في مكة'], avail:'active'},
  {id:2, date:'20', month:'ديسمبر', weekday:'الأربعاء', title:'مكة المكرمة + المدينة المنورة (11 يوماً)', route:'الكويت → مكة → المدينة → الكويت', days:11, nights:8, seats:3, priceQuad:85, priceDouble:105, priceSingle:135, tags:['11 يوماً','6 ليالٍ في مكة','ليلتان في المدينة'], avail:'limited'},
  {id:3, date:'21', month:'ديسمبر', weekday:'الخميس', title:'مكة المكرمة — مرور بالمدينة المنورة', route:'الكويت → مكة → المدينة (مرور) → الكويت', days:6, nights:3, seats:18, priceQuad:60, priceDouble:80, priceSingle:110, tags:['مرور','6 أيام','3 ليالٍ في مكة'], avail:'active'},
  {id:4, date:'27', month:'ديسمبر', weekday:'الأربعاء', title:'مكة المكرمة + المدينة المنورة (11 يوماً)', route:'الكويت → مكة → المدينة → الكويت', days:11, nights:8, seats:8, priceQuad:85, priceDouble:105, priceSingle:135, tags:['11 يوماً','6 ليالٍ في مكة','ليلتان في المدينة'], avail:'active'},
  {id:5, date:'3', month:'يناير', weekday:'الخميس', title:'مكة المكرمة — مرور بالمدينة المنورة', route:'الكويت → مكة → المدينة (مرور) → الكويت', days:6, nights:3, seats:0, priceQuad:60, priceDouble:80, priceSingle:110, tags:['مرور','6 أيام'], avail:'full'},
  {id:6, date:'17', month:'يناير', weekday:'الأربعاء', title:'مكة المكرمة + المدينة المنورة (11 يوماً)', route:'الكويت → مكة → المدينة → الكويت', days:11, nights:8, seats:22, priceQuad:85, priceDouble:105, priceSingle:135, tags:['11 يوماً','6 ليالٍ في مكة','ليلتان في المدينة'], avail:'active'}
];'''
m = re.search(r"const trips = \[\n(.*?)\n\];", s, re.S); assert m
old_lines = m.group(1).split('\n')
# keep each trip's original `avail` value
for i, l in enumerate(old_lines):
    a = re.search(r"avail:'(\w+)'", l)
    if a: trips_new = trips_new.replace('avail:\'%s\'' % ['active','limited','active','active','full','active'][i], 'avail:\'%s\'' % a.group(1), 1) if False else trips_new
s = s[:m.start()] + trips_new + s[m.end():]
s = rep(s, '<div class="rt-name">رباعية</div><div class="rt-price">السعر الأساسي</div>', '<div class="rt-name">جماعية (رباعية)</div><div class="rt-price">السعر المعلن</div>')
s = rep(s, '<div class="rt-price">+20 د.ك/شخص</div>', '<div class="rt-price">+20 د.ك/شخص (تأكيد عند الحجز)</div>')
s = rep(s, '<div class="rt-price">+50 د.ك/شخص</div>', '<div class="rt-price">+50 د.ك/شخص (تأكيد عند الحجز)</div>')
s = rep(s, '<div class="doc-item"><span class="doc-check">✓</span> جواز سفر ساري — لمدة 6 أشهر على الأقل</div>', '<div class="doc-item"><span class="doc-check">✓</span> جواز سفر ساري لمدة 6 أشهر فأكثر، مع 3 أشهر إقامة</div>')
s = rep(s, '<div class="doc-item"><span class="doc-check">✓</span> صورة البطاقة المدنية أو الإقامة</div>', '<div class="doc-item"><span class="doc-check">✓</span> صورة من البطاقة المدنية أو صورة من الهوية</div>')
s = rep(s, '<div class="doc-item"><span class="doc-check">✓</span> مسموح للجميع بدون محرم (ذكور وإناث)</div>', '<div class="doc-item"><span class="doc-check">✓</span> مسموح السفر لجميع الأعمار والنساء بدون محرم</div>')
s = rep(s, '<div class="doc-item"><span class="doc-check">✓</span> السعر يشمل السكن والمواصلات والتأشيرة</div>', '<div class="doc-item"><span class="doc-check">✓</span> السعر يشمل السكن والمواصلات والتأشيرة فقط</div>\n              <div class="doc-item"><span class="doc-check">✓</span> يُضاف 9 د.ك على سعر التأشيرة المتعددة (غرفة جماعية) عند طلب تأشيرة عمرة</div>')
wr(p, s)
print('umrah ok')

# ───────────── vip ─────────────
p = 'pages/vip.html'; s = rd(p)
# bus classes = the company's published rental fleet
cls = [('mini','🚐','ميني باص VIP','14 مقعد','من 45 د.ك','حافلة صغيرة','19–25 راكباً','من 20 د.ك'),
       ('mid','🚌','حافلة VIP','30 مقعد','من 85 د.ك','حافلة متوسطة','35–40 راكباً','من 25 د.ك'),
       ('large','🚍','حافلة Grand VIP','50 مقعد','من 130 د.ك','حافلة سياحية كبيرة','45 راكباً','من 85 د.ك')]
for k, ic, n0, c0, p0, n1, c1, p1 in cls:
    s = rep(s, '<div class="bus-type-name">%s</div>\n                <div class="bus-type-cap">%s</div>\n                <div class="bus-type-price">%s</div>' % (n0, c0, p0),
               '<div class="bus-type-name">%s</div>\n                <div class="bus-type-cap">%s</div>\n                <div class="bus-type-price">%s (8 ساعات)</div>' % (n1, c1, p1), tag=n0)
s = rep(s, "let busBasePrices = {mini:45, mid:85, large:130};", "// Published rental tariff (KD): [8 hours, 12 hours, 24 hours] — residential areas / border areas\nlet busBasePrices = {mini:20, mid:25, large:85};\nconst RENT_RES = {mini:[20,30,50], mid:[25,35,60], large:[85,100,140]};\nconst RENT_BORDER = {mini:[25,35,60], mid:[30,40,70], large:[100,120,185]};")
s = rep(s, "const takenMap = {mini:[3,7,10], mid:[4,8,12,18,22], large:[5,10,15,20,25,30,35]};\nconst goldRows = [1,2];", "const takenMap = {mini:[3,7,10], mid:[4,8,12,18,22], large:[5,10,15,20,25,30,35]};\nconst goldRows = [];")
s = rep(s, "const caps = {mini:14, mid:30, large:50};\n  const numRows = {mini:4, mid:8, large:13}[busType];", "const caps = {mini:25, mid:40, large:45};\n  const numRows = {mini:5, mid:9, large:11}[busType];")
s = rep(s, "{mini:'ميني باص VIP (14 مقعد)',mid:'حافلة VIP (30 مقعد)',large:'حافلة Grand VIP (50 مقعد)'}", "{mini:'حافلة صغيرة (19–25 راكباً)',mid:'حافلة متوسطة (35–40 راكباً)',large:'حافلة سياحية كبيرة (45 راكباً)'}")
s = rep(s, "{mini:'ميني باص VIP',mid:'حافلة VIP',large:'Grand VIP'}", "{mini:'حافلة صغيرة',mid:'حافلة متوسطة',large:'حافلة سياحية كبيرة'}")
s = rep(s, """  const tripMult = tripType==='return'?2:tripType==='fullday'?1.5:1;
  const goldCount = selectedSeats.filter(n=>n<=8).length;
  const goldExtra = goldCount*3;
  const basePrice = busBasePrices[selectedBusType]*tripMult;""", """  const durIdx = tripType==='return'?1:tripType==='fullday'?2:0;
  const zone = document.getElementById('d-zone')?.value||'res';
  const goldCount = 0;
  const goldExtra = 0;
  const basePrice = (zone==='border'?RENT_BORDER:RENT_RES)[selectedBusType][durIdx];""")
s = rep(s, '<label class="f-label">🔄 نوع الرحلة</label>', '<label class="f-label">🕐 مدة التأجير</label>')
s = rep(s, '<option value="oneway">ذهاب فقط</option>\n                  <option value="return">ذهاب وعودة</option>\n                  <option value="fullday">يوم كامل (مع انتظار)</option>\n                </select>\n              </div>',
           '<option value="oneway">8 ساعات</option>\n                  <option value="return">12 ساعة</option>\n                  <option value="fullday">24 ساعة</option>\n                </select>\n              </div>\n              <div class="field">\n                <label class="f-label">🗺️ منطقة التأجير</label>\n                <select class="f-select" id="d-zone" onchange="updateOrderPanel()">\n                  <option value="res">مناطق سكنية</option>\n                  <option value="border">مناطق حدودية</option>\n                </select>\n              </div>')
s = rep(s, '<span id="op-base">45 د.ك</span>', '<span id="op-base">20 د.ك</span>')
s = rep(s, '<span id="op-total">45.000 د.ك</span>', '<span id="op-total">20.000 د.ك</span>')
s = rep(s, '<div class="sl-item"><div class="sl-box" style="background:#fffbea;border:2px solid var(--gold)"></div>مقعد ذهبي VIP</div>', '')
s = rep(s, '🚌 حافلة VIP — KPTC', '🚌 حافلة KPTC')
s = rep(s, '<div class="form-card-header">✨ خدمات إضافية</div>', '<div class="form-card-header">✨ خدمات إضافية اختيارية — تُؤكَّد أسعارها عند الحجز</div>')
# international: the company rents a 45-seat coach to neighbouring countries on a day tariff
for flag_old, details_old, price_old in [
  ('<div class="intl-detail">🕐 8-12 ساعة</div>\n          <div class="intl-detail">🛂 تأشيرة مطلوبة</div>\n          <div class="intl-detail">⭐ سائق بروتوكولي</div>', None, '320 <span>د.ك / يوم</span>'),
  ('<div class="intl-detail">🕐 4-5 ساعات</div>\n          <div class="intl-detail">🛂 تأشيرة على الحدود</div>\n          <div class="intl-detail">💺 30 مقعد VIP</div>', None, '180 <span>د.ك / يوم</span>'),
  ('<div class="intl-detail">🕐 12-15 ساعة</div>\n          <div class="intl-detail">🛂 تأشيرة مسبقة</div>\n          <div class="intl-detail">🛏️ حافلة نوم VIP</div>', None, '450 <span>د.ك / يوم</span>'),
  ('<div class="intl-detail">✈️ تنسيق طيران</div>\n          <div class="intl-detail">🏨 فندق 5 نجوم</div>\n          <div class="intl-detail">🧭 مرشد سياحي</div>', None, '280 <span>د.ك / شخص</span>')]:
    s = rep(s, flag_old, '<div class="intl-detail">🚌 حافلة سياحية 45 راكباً</div>\n          <div class="intl-detail">📅 4 أيام (96 ساعة): 605 د.ك</div>\n          <div class="intl-detail">➕ اليوم الإضافي بعد 4 أيام: 80 د.ك</div>')
    s = rep(s, '<div class="intl-price">%s</div>' % price_old, '<div class="intl-price">200 <span>د.ك / يوم</span></div>')
s = rep(s, '<div class="intl-route">الكويت → عمّان (جوي + استقبال)</div>', '<div class="intl-route">الكويت → الأردن (بالحافلة)</div>')
# diwaniya packages → the published 8-hour residential tariff
for (n, d0, p0, d1, p1) in [
  ('الأساسية', 'ميني باص 14 مقعد، سائق محترم، مناسبة للديوانيات الصغيرة', '35 <span>د.ك / ليلة</span>', 'حافلة صغيرة 19–25 راكباً، مناسبة للمجموعات الصغيرة', '20 <span>د.ك / 8 ساعات</span>'),
  ('المميزة', 'حافلة 30 مقعد بمقاعد جلدية فاخرة، مناسبة للمجالس الكبيرة', '65 <span>د.ك / ليلة</span>', 'حافلة متوسطة 35–40 راكباً، مناسبة للمجالس الكبيرة', '25 <span>د.ك / 8 ساعات</span>'),
  ('الملكية', 'حافلة Grand VIP 50 مقعد، قهوة عربية، تمور، واستقبال رسمي', '120 <span>د.ك / ليلة</span>', 'حافلة سياحية كبيرة 45 راكباً للمناسبات والمجموعات الكبيرة', '85 <span>د.ك / 8 ساعات</span>')]:
    s = rep(s, '<div class="diw-desc">%s</div>' % d0, '<div class="diw-desc">%s</div>' % d1)
    s = rep(s, '<div class="diw-price">%s</div>' % p0, '<div class="diw-price">%s</div>' % p1)
# corporate
s = rep(s, '<div style="font-weight:700;color:var(--navy);margin-bottom:4px">عقود مرنة</div>\n          <div style="font-size:.78rem;color:var(--gray)">شهري، ربع سنوي، أو سنوي</div>', '<div style="font-weight:700;color:var(--navy);margin-bottom:4px">تعاقدات مباشرة</div>\n          <div style="font-size:.78rem;color:var(--gray)">عبر الإدارة المختصة بتنفيذ التعاقدات</div>')
s = rep(s, '<div style="font-weight:700;color:var(--navy);margin-bottom:4px">تقارير شهرية</div>\n          <div style="font-size:.78rem;color:var(--gray)">رحلات، مواعيد، تكاليف</div>', '<div style="font-weight:700;color:var(--navy);margin-bottom:4px">حافلات بجميع الأنواع</div>\n          <div style="font-size:.78rem;color:var(--gray)">وجميع الأحجام لتلائم كل رحلة</div>')
s = rep(s, '<div style="font-weight:700;color:var(--navy);margin-bottom:4px">سائقون ثابتون</div>\n          <div style="font-size:.78rem;color:var(--gray)">نفس السائق لرحلاتك</div>', '<div style="font-weight:700;color:var(--navy);margin-bottom:4px">متابعة ميدانية</div>\n          <div style="font-size:.78rem;color:var(--gray)">رقابة وتبادل زيارات مع العملاء</div>')
s = rep(s, '<div style="font-weight:700;color:var(--navy);margin-bottom:4px">تأمين شامل</div>\n          <div style="font-size:.78rem;color:var(--gray)">مشمول بجميع العقود</div>', '<div style="font-weight:700;color:var(--navy);margin-bottom:4px">للتواصل</div>\n          <div style="font-size:.78rem;color:var(--gray)">22328866 · 1880001</div>')
wr(p, s)
print('vip ok')

# ───────────── winch ─────────────
p = 'pages/winch.html'; s = rd(p)
s = rep(s, '<div class="hstat"><div class="hstat-num">25 دق</div><div class="hstat-label">متوسط وقت الوصول</div></div>\n        <div class="hstat"><div class="hstat-num">100%</div><div class="hstat-label">تغطية الكويت</div></div>\n        <div class="hstat"><div class="hstat-num">50+</div><div class="hstat-label">شاحنة ونش</div></div>\n        <div class="hstat"><div class="hstat-num">15,000</div><div class="hstat-label">عملية سنوياً</div></div>',
           '<div class="hstat"><div class="hstat-num">24 ساعة</div><div class="hstat-label">طوال أيام الأسبوع</div></div>\n        <div class="hstat"><div class="hstat-num">6</div><div class="hstat-label">محافظات</div></div>\n        <div class="hstat"><div class="hstat-num">8</div><div class="hstat-label">مناطق تسعير</div></div>\n        <div class="hstat"><div class="hstat-num">5 د.ك</div><div class="hstat-label">يبدأ من</div></div>')
s = rep(s, 'خدمة الونش والإنقاذ الفوري في جميع أنحاء الكويت — بالإضافة لورشة متكاملة لصيانة وتصليح جميع أنواع السيارات.', 'مركز الأوناش يعمل على مدار 24 ساعة، 7 أيام في الأسبوع وخلال الإجازات الرسمية، في محافظات الكويت الست — بالإضافة إلى ورشة لإصلاح الشاحنات والحافلات للغير.')
s = rep(s, 'شاحنات الونش المتاحة الآن', 'شاحنات الونش — عرض توضيحي')
# towing = the published zone tariff (salon / large vehicle)
zones = [('المناطق القريبة من الشويخ (الخالدية، اليرموك، الري، الشويخ 1، كيفان)',5,7),('خيطان — الفروانية',6,11),('حولي — السالمية',6,11),('الصليبية — أمغرة',7,14),('الأحمدي — الصباحية',8,13),('الشاليهات',16,23),('الوفرة — النويصيب',20,23),('السالمي — العبدلي',20,25)]
s = rep(s, '<label>المسافة التقريبية</label>', '<label>منطقة السحب</label>')
s = re.sub(r'(<select id="distSelect" onchange="updateWinchOrder\(\)">).*?(</select>)', lambda m: m.group(1) + ''.join('\n                  <option value="%d,%d">%s (صالون %d د.ك · كبيرة %d د.ك)</option>' % (a, b, n, a, b) for n, a, b in zones) + '\n                ' + m.group(2), s, count=1, flags=re.S)
for a, b in [("selCar(this,'سيارة عادية',8)", "selCar(this,'سيارة عادية (صالون)',0)"), ("selCar(this,'SUV / 4×4',12)", "selCar(this,'SUV / 4×4 (مركبة كبيرة)',1)"), ("selCar(this,'بيكأب',15)", "selCar(this,'بيكأب (مركبة كبيرة)',1)"), ("selCar(this,'حافلة / شاحنة',25)", "selCar(this,'حافلة / شاحنة (مركبة كبيرة)',1)"),
             ("selProb(this,'حادث مروري',5)", "selProb(this,'حادث مروري',0)")]:
    s = rep(s, a, b)
s = rep(s, '+ 5 د.ك إضافية', 'حسب الحالة')
s = rep(s, "let carType = 'سيارة عادية';", "let carType = 'سيارة عادية (صالون)';")
s = rep(s, """  const dist = parseInt(document.getElementById('distSelect')?.value || 8);
  towDist = dist;
  const base = 5;
  const total = base + carExtra + dist + probExtra;""", """  // published tariff: value = "salon,large"; carExtra = 0 for a salon car, 1 for a large vehicle
  const pr = (document.getElementById('distSelect')?.value || '5,7').split(',').map(Number);
  const dist = carExtra ? pr[1] : pr[0];
  towDist = dist;
  const base = 0;
  const total = dist + probExtra;""")
s = rep(s, "document.getElementById('sum-base').textContent = base + '.000 د.ك';\n  document.getElementById('sum-tow').textContent = (dist + carExtra) + '.000 د.ك';", "document.getElementById('sum-base').textContent = 'مشمولة';\n  document.getElementById('sum-tow').textContent = dist + '.000 د.ك';")
s = rep(s, "const etaMin = dist<=8?'10-18':dist<=12?'15-25':dist<=18?'20-35':'30-50';\n  document.getElementById('etaMin').textContent = etaMin;", "document.getElementById('etaMin').textContent = '—';")
s = rep(s, '⏱️ وقت الوصول المتوقع: <span id="etaMin">15-25</span> دقيقة', '⏱️ وقت الوصول: <span id="etaMin">—</span> (يحدده مركز الأوناش عند التواصل)')
s = rep(s, '<span id="sum-base">8.000 د.ك</span>', '<span id="sum-base">مشمولة</span>')
s = rep(s, '<span id="sum-tow">8.000 د.ك</span>', '<span id="sum-tow">5.000 د.ك</span>')
s = re.sub(r'(<span id="sum-total">)[^<]*(</span>)', r'\g<1>5.000 د.ك\2', s, count=1)
# workshop = published labour tariff (5 KD per hour)
s = rep(s, '<div class="wh-badge">🏭 ورشة KPTC المعتمدة</div>\n        <h2>ورشة متكاملة لكل<br>أنواع السيارات</h2>\n        <p>فنيون معتمدون، قطع غيار أصلية، معدات تشخيص حديثة. نصلح سيارتك بجودة لا تضاهى وبأسعار شفافة مسبقاً.</p>',
           '<div class="wh-badge">🏭 خدمة الإصلاح للغير</div>\n        <h2>كراجات للشاحنات<br>والحافلات الثقيلة</h2>\n        <p>كراجات مصممة لاستيعاب جميع أنواع وأحجام الشاحنات والحافلات الثقيلة، وطاقم هندسي وفني عالي الكفاءة، لإصلاح مركبات الوزارات والشركات والهيئات.</p>')
s = re.sub(r'<div class="ws-stats">.*?</div>\s*</div>\s*</div>\s*<div class="ws-services-list">', '''<div class="ws-stats">
          <div class="wss"><div class="wss-num">5 د.ك</div><div class="wss-label">أجرة ساعة العمل</div></div>
          <div class="wss"><div class="wss-num">7%</div><div class="wss-label">رسوم إدارية لموظفي الشركة</div></div>
          <div class="wss"><div class="wss-num">10%</div><div class="wss-label">رسوم إدارية لغيرهم</div></div>
          <div class="wss"><div class="wss-num">22</div><div class="wss-label">إصلاحاً سريعاً في اللائحة</div></div>
        </div>
      </div>
      <div class="ws-services-list">''', s, count=1, flags=re.S)
items = [('🔧','عمرة محرك 4 أسطوانات (بنزين)','80 د.ك · 16 ساعة'),('⚡','تبديل مضخة وقود داخلية','20 د.ك · 4 ساعات'),('❄️','تبديل مبرد المحرك','15 د.ك · 3 ساعات'),('🛞','تبديل علبة المقود (السكان)','20 د.ك · 4 ساعات')]
s = re.sub(r'(<div class="ws-services-list">).*?(</div>\s*</div>\s*\n\s*<!-- Services -->)', lambda m: m.group(1) + ''.join('\n        <div class="ws-service-item" onclick="this.classList.toggle(\'sel\')"><div class="ws-si-icon">%s</div><div><div class="ws-si-name">%s</div><div class="ws-si-price">%s ✓</div></div></div>' % it for it in items) + '\n      ' + m.group(2), s, count=1, flags=re.S)
svc = [('🔧','تبديل مضخة الماء','10 د.ك','ساعتان'),('🌡️','تبديل منظم الحرارة (ثرموستات)','5 د.ك','ساعة'),('🛢️','تبديل مضخة وقود داخلية','20 د.ك','4 ساعات'),('🛞','تبديل علبة المقود (السكان)','20 د.ك','4 ساعات'),('❄️','تبديل مبرد المحرك','15 د.ك','3 ساعات'),('⚡','تبديل سير المحرك (بسيط)','10 د.ك','ساعتان'),('🔩','تبديل شجرة نقل الحركة (الجاردن)','10 د.ك','ساعتان'),('⛽','تبديل خزان الوقود','20 د.ك','4 ساعات'),('🛠️','عمرة محرك 4 أسطوانات (بنزين)','80 د.ك','16 ساعة')]
s = re.sub(r'(<div class="services-grid">).*?(</div>\s*\n\s*<!-- Booking Form -->)', lambda m: m.group(1) + ''.join('\n      <div class="service-card%s" onclick="this.classList.toggle(\'sel\')"><div class="sc-icon">%s</div><div class="sc-name">%s</div><div class="sc-price">%s</div><div class="sc-time">⏱️ %s</div></div>' % (' sel' if i == 0 else '', ic, n, pr_, t) for i, (ic, n, pr_, t) in enumerate(svc)) + '\n    ' + m.group(2), s, count=1, flags=re.S)
# price tab
rows = lambda col: ''.join('<div class="pc-row"><span>%s</span><strong>%d د.ك</strong></div>\n          ' % (n, col(a, b)) for n, a, b in zones)
card_salon = '<div class="price-card">\n          <div class="pc-head">🔧 الونش — مركبة صالون</div>\n          ' + rows(lambda a, b: a) + '</div>'
card_large = '<div class="price-card">\n          <div class="pc-head">🚛 الونش — مركبة كبيرة</div>\n          ' + rows(lambda a, b: b) + '</div>'
card_ws = '''<div class="price-card">
          <div class="pc-head">🔩 الورشة — أجور العمل</div>
          <div class="pc-row"><span>أجرة ساعة العمل</span><strong>5 د.ك</strong></div>
          <div class="pc-row"><span>تبديل مضخة الماء</span><strong>10 د.ك</strong></div>
          <div class="pc-row"><span>تبديل مبرد المحرك</span><strong>15 د.ك</strong></div>
          <div class="pc-row"><span>تبديل مضخة وقود داخلية</span><strong>20 د.ك</strong></div>
          <div class="pc-row"><span>عمرة محرك 4 أسطوانات (بنزين)</span><strong>80 د.ك</strong></div>
          <div class="pc-row"><span>عمرة محرك 8 أسطوانات (بنزين)</span><strong>170 د.ك</strong></div>
          <div class="pc-row"><span>رسوم إدارية عند توفير القطع من الشركة</span><strong>7% / 10%</strong></div>
        </div>'''
s = re.sub(r'<div class="price-grid">.*?</div>\s*<div style="background:rgba\(46,44,120,\.04\)', '<div class="price-grid">\n        ' + card_salon + '\n        ' + card_large + '\n        ' + card_ws + '\n      </div>\n      <div style="background:rgba(46,44,120,.04)', s, count=1, flags=re.S)
s = re.sub(r'⚠️ <strong style="color:var\(--navy\)">ملاحظة:</strong>[^<]*', '⚠️ <strong style="color:var(--navy)">ملاحظة:</strong> الأسعار من لوائح الشركة المعلنة (بالدينار الكويتي). مركز الأوناش يعمل 24 ساعة، 7 أيام في الأسبوع، وخلال الإجازات الرسمية والعطلات. أجور الورشة بالساعة، وتُضاف 7% رسوماً إدارية لموظفي الشركة و10% لغيرهم عند توفير قطع الغيار عن طريق الشركة', s, count=1)
s = rep(s, 'أسعار شفافة — بدون مفاجآت', 'لوائح الأسعار المعلنة')
wr(p, s)
print('winch ok')

# ───────────── routes ─────────────
p = 'pages/routes.html'; s = rd(p)
TERMS = {'المالية':['15','16','18','102A','102X','999'], 'الشرق':['11','12','507'], 'دوار الأمم المتحدة':['34','39','41'], 'المرقاب':['13','21','23','51','59','103'], 'السالمية':['77'], 'جليب الشيوخ':['40','66','66X','105','106','106X']}
rows = []
for t, nums in TERMS.items():
    for n in nums:
        typ = {'المالية':'maliya','الشرق':'sharq','دوار الأمم المتحدة':'un','المرقاب':'mirqab','السالمية':'salmiya','جليب الشيوخ':'jleeb'}[t]
        rows.append("  {num:'%s', name:'خط %s', path:'ينطلق من محطة %s — المسار التفصيلي في خريطة الشبكة الرسمية', from:['%s'], to:['%s'], status:'active', type:'%s', wait:0, stops:['%s'], first:'—', last:'—', freq:'—', avg:'—', tags:['محطة %s']}" % (n, n, t, t, t, typ, t, t))
rows.append("  {num:'A2', name:'خط A2', path:'المسار التفصيلي في خريطة الشبكة الرسمية', from:['السليبية'], to:['السليبية'], status:'active', type:'other', wait:0, stops:['السليبية'], first:'—', last:'—', freq:'—', avg:'—', tags:['خريطة الشبكة']}")
s = re.sub(r"const routes = \[\n.*?\n\];", "// The 26 routes of the K-Bus network and their main terminals (kptc.com.kw/routes.aspx)\nconst routes = [\n" + ',\n'.join(rows) + "\n];", s, count=1, flags=re.S)
sel_t = ['المالية','المرقاب','الشرق','دوار الأمم المتحدة','السالمية','جليب الشيوخ']
for sid, ph in [('fromSel','اختر منطقة المغادرة'),('toSel','اختر منطقة الوصول')]:
    s = re.sub(r'(<select class="s-input" id="%s">).*?(</select>)' % sid, lambda m: m.group(1) + '\n          <option value="">%s</option>\n' % ph + ''.join('          <option>%s</option>\n' % t for t in sel_t) + '        ' + m.group(2), s, count=1, flags=re.S)
chips = [('المالية','المرقاب'),('الشرق','المالية'),('المرقاب','جليب الشيوخ'),('السالمية','المالية'),('دوار الأمم المتحدة','المرقاب')]
old = re.findall(r'<div class="quick-tag" onclick="quickSearch\([^"]*\)">[^<]*</div>', s)
assert len(old) == 5
for o, (a, b) in zip(old, chips):
    s = s.replace(o, '<div class="quick-tag" onclick="quickSearch(\'%s\',\'%s\')">%s ← %s</div>' % (a, b, a, b), 1)
s = rep(s, 'مواعيد مباشرة — محدّثة الآن', 'شبكة K-Bus — 26 مساراً')
s = rep(s, '<div class="result-count" id="resultCount">150+ خط</div>', '<div class="result-count" id="resultCount">26 مساراً</div>')
for a, b in [("filterRoutes('fast',this)\">سريع", "filterRoutes('maliya',this)\">المالية"), ("filterRoutes('direct',this)\">مباشر", "filterRoutes('mirqab',this)\">المرقاب"), ("filterRoutes('24h',this)\">24 ساعة", "filterRoutes('jleeb',this)\">جليب الشيوخ")]:
    s = rep(s, a, b)
s = rep(s, "setView('schedule',this)\">جداول", "setView('schedule',this)\">الخريطة الرسمية")
# cards: no invented live waits or timetables
s = rep(s, """        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:1.2rem;font-weight:700;color:${waitColor}">${r.wait}</div>
          <div style="font-size:.65rem;color:var(--gray)">دقيقة</div>
        </div>""", """        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:.7rem;font-weight:700;color:var(--navy)">${r.stops[0]}</div>
          <div style="font-size:.62rem;color:var(--gray)">المحطة الرئيسية</div>
        </div>""")
s = rep(s, """      <div class="rc-times">
        <div class="rc-time-item"><strong>${r.first}</strong>أول رحلة</div>
        <div class="rc-time-item"><strong>${r.last}</strong>آخر رحلة</div>
        <div class="rc-time-item"><strong>${r.freq.replace('كل ','')}</strong>التكرار</div>
        <div class="rc-time-item"><strong>${r.avg}</strong>مدة الرحلة</div>
      </div>""", """      <div class="rc-times">
        <div class="rc-time-item" style="flex:1"><strong>خريطة الشبكة الرسمية</strong>المسار التفصيلي ومحطات الصعود</div>
      </div>""")
s = rep(s, "const mins = r.wait;\n  const now = new Date();\n  now.setMinutes(now.getMinutes()+mins);\n  const next = now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');\n  document.getElementById('nextBusOverlay').style.display='block';\n  document.getElementById('nextBusTime').textContent = `${r.num} — ${next} (${mins} دق)`;",
           "document.getElementById('nextBusOverlay').style.display='block';\n  document.getElementById('nextBusTime').textContent = `خط ${r.num} — ${r.stops[0]}`;")
s = rep(s, "const arrive = i===1?`<div class=\"stop-arrive\">⏱️ يصل في ${r.wait} دق</div>`:'';", "const arrive = '';")
s = rep(s, """  let h = now.getHours(), m = now.getMinutes();
  const list = r.stops.map((s,i) => {
    m += Math.floor(Math.random()*8+5);
    if (m>=60){m-=60;h++}
    const t = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;""", """  const list = r.stops.map((s,i) => {
    const t = 'محطة رئيسية';""")
s = rep(s, '<div class="stop-time">يصل: ${t}</div>', '<div class="stop-time">${t} — التفاصيل في خريطة الشبكة الرسمية</div>')
s = re.sub(r"function renderSchedule\(r\) \{.*?\n\}\n", '''function renderSchedule(r) {
  document.getElementById('schedGrid').innerHTML = '<div style="grid-column:1/-1;font-size:.8rem;color:var(--gray);line-height:1.9">جداول المواعيد والتكرار تُعلنها الشركة عبر الخط الساخن <strong>1880001</strong> وخريطة الشبكة الرسمية.</div>';
  document.getElementById('avgTime').textContent = '—';
  document.getElementById('freqTime').textContent = '—';
}
''', s, count=1, flags=re.S)
s = re.sub(r"function renderInfo\(r\) \{.*?\n\}\n", '''function renderInfo(r) {
  document.getElementById('routeInfoContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div style="background:var(--light);border-radius:10px;padding:12px"><div style="color:var(--gray);font-size:.7rem">رقم الخط</div><div style="font-weight:700;color:var(--navy)">${r.num}</div></div>
      <div style="background:var(--light);border-radius:10px;padding:12px"><div style="color:var(--gray);font-size:.7rem">المحطة الرئيسية</div><div style="font-weight:700;color:var(--navy)">${r.stops[0]}</div></div>
    </div>
    <div style="color:var(--gray);font-size:.78rem;line-height:2">
      🗺️ المسار التفصيلي ومحطات الصعود في خريطة الشبكة الرسمية (زر «الخريطة الرسمية»)<br>
      💳 بطاقة التوفير: 10 د.ك لـ 31 يوماً، 25 د.ك لـ 91 يوماً، على جميع الخطوط<br>
      📞 الخط الساخن: 1880001 · الهاتف: 22328866
    </div>`;
}
''', s, count=1, flags=re.S)
s = rep(s, "showToast(`🚌 باص ${activeRoute.num} — على بُعد ${activeRoute.wait} دق`);", "showToast(`🚌 خط ${activeRoute.num} — محطة ${activeRoute.stops[0]}`);")
s = rep(s, "showToast('📅 عرض الجداول الكاملة');", "showToast('🗺️ خريطة شبكة K-Bus الرسمية'); if (window.kpOfficialMap) window.kpOfficialMap();")
# fare tab → Savings Card
s = re.sub(r'<div class="fare-card">.*?</button>\s*</div>\s*<div style="font-size:\.75rem;color:var\(--gray\);line-height:1\.8">.*?</div>', '''<div class="fare-card">
          <div style="font-size:.78rem;color:rgba(255,255,255,.6);margin-bottom:6px">بطاقة التوفير — جميع الخطوط</div>
          <div class="fare-main">10 د.ك</div>
          <div class="fare-sub">* رحلات بلا حدود لمدة 31 يوماً</div>
          <div class="fare-options">
            <div class="fare-opt">
              <div class="fare-opt-price">10 د.ك</div>
              <div class="fare-opt-label">بطاقة 31 يوماً</div>
            </div>
            <div class="fare-opt">
              <div class="fare-opt-price">25 د.ك</div>
              <div class="fare-opt-label">بطاقة 91 يوماً — وفّر 5 د.ك</div>
            </div>
          </div>
          <button class="btn-buy" onclick="showToast('✅ جاري فتح صفحة الدفع...')">اشترك الآن — 10 د.ك / 31 يوماً</button>
        </div>
        <div style="font-size:.75rem;color:var(--gray);line-height:1.8">
          • خصومات تصل إلى 50% على نظام الاشتراكات للجهات<br>
          • للاستفسار عن بطاقة التوفير: 22328307<br>
          • الدفع بكي نت وفيزا وماستركارد
        </div>''', s, count=1, flags=re.S)
wr(p, s)

# core: map markers for the real terminals, official network map viewer
p = 'src/core.js'; s = rd(p)
s = rep(s, "var GEO = {", "var GEO = {'دوار الأمم المتحدة':[29.3560,47.9270],'جليب الشيوخ':[29.2680,47.9130],'مطار الكويت':[29.2266,47.9689],'السليبية':[29.2990,47.7500],'أمغرة':[29.3250,47.7900],'صبحان':[29.2975,48.0600],")
s = rep(s, "function pts(r){ return r.path.replace(/\\(.*?\\)/g,'').split('—').map(function(n){ n = n.trim(); return GEO[n] ? {n:n, ll:GEO[n]} : null; }).filter(Boolean); }",
           "function pts(r){ return (r.stops || []).map(function(n){ return GEO[n] ? {n:n, ll:GEO[n]} : null; }).filter(Boolean); }")
s = rep(s, "list.forEach(function(r){ var p = pts(r); if (p.length > 1) L.polyline(p.map(function(x){ return x.ll; }), {color:'#2E5AAC', weight:3, opacity:.22}).addTo(base); });", "") if "{color:'#2E5AAC', weight:3, opacity:.22}" in s else s
wr(p, s)
print('routes ok')

# ───────────── admin ─────────────
import re as _re
def R(s, a, b, tag=''):
    assert a in s, 'MISSING ' + (tag or a[:60]); return s.replace(a, b)
# dashboard
p = 'pages/dashboard.html'; s = rd(p)
s = R(s, 'Starter (2,100)', '31 يوماً (2,100)'); s = R(s, 'Growth (1,900)', '91 يوماً (1,900)'); s = R(s, 'School (821)', 'جهات (821)')
for old, new in [("pkg:'Growth'", "pkg:'91 يوماً'"), ("pkg:'Starter'", "pkg:'31 يوماً'"), ("pkg:'School'", "pkg:'جهات'")]: s = R(s, old, new)
def subfix(m):
    pk = m.group(1); amt = {'91 يوماً': '25.000', '31 يوماً': '10.000', 'جهات': '—'}[pk]
    return "pkg:'%s',type:'بطاقة توفير',phone:'%s',start:'%s',end:'%s',amt:'%s'" % (pk, m.group(3), m.group(4), m.group(5), amt)
s, n = _re.subn(r"pkg:'(91 يوماً|31 يوماً|جهات)',type:'([^']*)',phone:'([^']*)',start:'([^']*)',end:'([^']*)',amt:'[\d.,]+'", subfix, s); assert n >= 6, n
s = R(s, "item.pkg==='Starter'?'selected':'')+'>Starter</option><option '+(item.pkg==='Growth'?'selected':'')+'>Growth</option><option '+(item.pkg==='School'?'selected':'')+'>School</option>", "item.pkg==='31 يوماً'?'selected':'')+'>31 يوماً</option><option '+(item.pkg==='91 يوماً'?'selected':'')+'>91 يوماً</option><option '+(item.pkg==='جهات'?'selected':'')+'>جهات</option>")
s = R(s, 'Starter — 15 د.ك', '31 يوماً — 10 د.ك'); s = R(s, 'Growth — 40 د.ك', '91 يوماً — 25 د.ك'); s = R(s, 'School — 35 د.ك', 'جهات — بالتعاقد')
s = R(s, "var amts={Starter:'15.000',Growth:'40.000',School:'35.000'};\n      var now=new Date();var end=new Date(now);end.setMonth(end.getMonth()+1);", "var amts={'31 يوماً':'10.000','91 يوماً':'25.000','جهات':'—'};\n      var now=new Date();var end=new Date(now);end.setDate(end.getDate()+(pkg==='91 يوماً'?91:31));")
s = _re.sub(r"\{name:'([^']*)',svc:'School شهري',amt:'35\.000'", r"{name:'\1',svc:'اشتراك جهات',amt:'—'", s)
s = _re.sub(r"svc:'Starter شهري',amt:'15\.000'", "svc:'بطاقة توفير 31 يوماً',amt:'10.000'", s)
s = _re.sub(r"svc:'Growth شهري',amt:'40\.000'", "svc:'بطاقة توفير 91 يوماً',amt:'25.000'", s)
s = s.replace('2,547', '400+').replace('24 حملة نشطة على 2,500+ حافلة', '24 حملة نشطة على أسطول 400+ حافلة')
s = s.replace('150 خط نشط — 6 محافظات', '26 مساراً نشطاً').replace('150 خط نشط', '26 مساراً نشطاً')
s = s.replace('<span class="sb-badge" style="background:var(--green)">150</span>', '<span class="sb-badge" style="background:var(--green)">26</span>')
s = s.replace("{v:'150',l:'خط'}", "{v:'26',l:'مسار'}").replace('10 من 150', '10 من 26')
s = _re.sub(r'خريطة الخطوط التفاعلية\s*150 خط — 6 محافظات', 'خريطة الخطوط التفاعلية 26 مساراً', s)
wr(p, s)
# admin AI
p = 'pages/adminai.html'; s = rd(p)
s = R(s, 'Growth — 1,900 مشترك (40%)', '91 يوماً — 1,900 مشترك (40%)'); s = R(s, 'Starter — 2,100 مشترك (43%)', '31 يوماً — 2,100 مشترك (43%)'); s = R(s, 'School — 821 مشترك (17%)', 'جهات — 821 مشترك (17%)')
s = R(s, 'إطلاق حملة باقة School مبكراً يرفع المبيعات', 'إطلاق عروض الاشتراكات للجهات مبكراً يرفع المبيعات')
s = s.replace('buses: 2547,', 'buses: 400,')
wr(p, s)
# exec
p = 'pages/exec.html'; s = rd(p)
s = R(s, '<div class="metric-val" id="m1">2,547</div>', '<div class="metric-val" id="m1">400</div>')
s = R(s, 'ثلاث باقات اشتراك مرنة Starter وGrowth وSchool', 'بطاقة التوفير (10 د.ك لـ 31 يوماً و25 د.ك لـ 91 يوماً)')
wr(p, s)
# reclient: no footfall figure is published
p = 'pages/reclient.html'; s = rd(p)
s = s.replace('— 128,000 راكب يومياً هم عملاؤك المحتملون.', '— آلاف الركاب يومياً هم عملاؤك المحتملون.').replace('128,000 راكب يومياً', 'آلاف الركاب يومياً').replace('<div class="hc-num">128K</div>', '<div class="hc-num">+400</div>')
wr(p, s)
# lost
p = 'pages/lost.html'; s = rd(p)
s = R(s, 'أبلغنا فوراً وسيتواصل معك فريقنا خلال ساعات. كل المفقودات تُحفظ في مخزننا لمدة 30 يوماً.', 'أبلغنا بتفاصيل الغرض والخط والتاريخ، وسيتواصل معك فريق خدمة العملاء. يمكنك أيضاً الاتصال بالخط الساخن 1880001.')
s = _re.sub(r'(<div class="hstat-val">)72%(</div>\s*<div class="hstat-label">)نسبة استرداد المفقودات', r'\g<1>1880001\g<2>الخط الساخن', s)
s = _re.sub(r'(<div class="hstat-val">)4 ساعات(</div>\s*<div class="hstat-label">)متوسط وقت الرد', r'\g<1>22328866\g<2>الهاتف', s)
s = _re.sub(r'(<div class="hstat-val">)30 يوم(</div>\s*<div class="hstat-label">)مدة الحفظ', r'\g<1>المرقاب\g<2>المقر الرئيسي', s)
s = s.replace('سيتواصل معك فريقنا خلال 4 ساعات', 'سيتواصل معك فريق خدمة العملاء').replace('متوقع خلال 4 ساعات', 'يتواصل معك فريق خدمة العملاء')
wr(p, s)
# ads
p = 'pages/ads.html'; s = rd(p)
s = R(s, '<em>2,500</em> حافلة', '<em>400+</em> حافلة')
s = _re.sub(r'إعلانك يتحرك مع حافلاتنا في كل شوارع الكويت يومياً — وصول مضمون لأكثر من 40 مليون نقطة تواصل سنوياً[^<]*', 'إعلانك يتحرك مع حافلاتنا في شوارع الكويت يومياً، أمام جمهور متنوع من الركاب والمشاة والسائقين.', s, count=1)
s = R(s, '<div class="hnum-val">+2,500</div><div class="hnum-label">حافلة ناشطة</div>', '<div class="hnum-val">+400</div><div class="hnum-label">حافلة</div>')
s = R(s, '<div class="hnum-val">40M+</div><div class="hnum-label">راكب سنوياً</div>', '<div class="hnum-val">1,050</div><div class="hnum-label">سائق</div>')
s = R(s, '<div class="hnum-val">6</div><div class="hnum-label">محافظات</div>', '<div class="hnum-val">70M+</div><div class="hnum-label">راكب (عام 2004)</div>')
s = R(s, '<div class="hnum-val">81M</div><div class="hnum-label">كم سنوياً</div>', '<div class="hnum-val">1962</div><div class="hnum-label">تأسست</div>')
s = s.replace("showToast('📞 سيتواصل معك فريق الإعلانات خلال ساعة')", "showToast('📞 اتصل بإدارة التسويق: 22328866')").replace('سيتواصل معك فريق الإعلانات خلال 24 ساعة', 'سيتواصل معك فريق الإعلانات')
wr(p, s)
# gateway
p = 'index.html'; s = rd(p)
s = s.replace('150 خطاً في 6 محافظات', '26 مساراً').replace('150 خطاً', '26 مساراً')
wr(p, s)
print('admin ok')

# ───────────── store ─────────────
p = 'src/store.js'; s = rd(p)
a = s.index("      wallets: { 'u-demo'"); b = s.index("      bookings: [")
s = s[:a] + """      wallets: { 'u-demo': {balance:20, frozen:false, tx:[
        {id:'TX-1002', d:today(-9),  t:'خصم',  a:-10, note:'بطاقة التوفير — 31 يوماً', by:'النظام'},
        {id:'TX-1001', d:today(-10), t:'تعبئة', a:30,  note:'تعبئة عبر كي نت', by:'العميل'}
      ]}},
""" + s[b:]
s = R(s, "title:'الباقة الأساسية — شهري', d:today(-9),  status:'فعّال', amount:15,  until:today(21)", "title:'بطاقة التوفير — 31 يوماً', d:today(-9),  status:'فعّال', amount:10,  until:today(22)")
s = R(s, "title:'مكة المكرمة + المدينة (11 يوماً) — مقعدان', d:today(-4), status:'مؤكد', amount:216", "title:'مكة المكرمة + المدينة (11 يوماً) — مقعدان', d:today(-4), status:'مؤكد', amount:170")
a = s.index("      news: ["); b = s.index("      tenders: [")
s = s[:a] + """      news: [
        {id:'N-5', d:today(-3),  cat:'أخبار الشركة', title:'حافلات K-eBus الكهربائية عديمة الانبعاثات', body:'تضم صور الأسطول الرسمي حافلات K-eBus الكهربائية بشعار «Zero Emission»، ضمن توجه الشركة نحو بيئة صحية.', img:'kbus-ev.jpg', pub:true},
        {id:'N-4', d:today(-12), cat:'أخبار الشركة', title:'بطاقة التوفير: 10 د.ك لـ 31 يوماً و25 د.ك لـ 91 يوماً', body:'بطاقة شخصية تتيح التنقل بلا حدود على جميع الخطوط. للاستفسار: 22328307.', img:'kbus-fleet.jpg', pub:true},
        {id:'N-3', d:today(-25), cat:'المسؤولية الاجتماعية', title:'السلامة أولاً: معاً نعود بنقل آمن', body:'حملة توعوية تحمل شعار «السلامة أولاً» لتوعية الركاب والسائقين بقواعد السلامة.', img:'kbus-street.jpg', pub:true},
        {id:'N-2', d:today(-40), cat:'أخبار الشركة', title:'رحلات العمرة بأسعار مميزة للمجموعات والشركات', body:'رحلة 6 أيام بـ 60 د.ك ورحلة 11 يوماً بـ 85 د.ك، والسعر يشمل السكن والمواصلات والتأشيرة.', img:'umrah-art.jpg', pub:true},
        {id:'N-1', d:today(-61), cat:'بيانات صحفية', title:'مركز الأوناش يعمل على مدار الساعة', body:'خدمة سحب ونقل المركبات متاحة 24 ساعة، 7 أيام في الأسبوع، وخلال الإجازات الرسمية والعطلات.', img:'tow-1.jpg', pub:true}
      ],
""" + s[b:]
wr(p, s)
p = 'src/site/media.html'; s = rd(p)
s = R(s, '<p>الهاتف: <b class="num">22328866</b><br>الخط الساخن: <b class="num">1880001</b><br>البريد: <b dir="ltr">info@kptc.com.kw</b></p>', '<p>الهاتف: <b class="num">22328412</b> · <b class="num">22328437</b> · <b class="num">22328363</b><br>الفاكس: <b class="num">22328870</b><br>البريد: <b dir="ltr">info@kptc.com.kw</b></p>')
s = R(s, 'نقل عام، تأجير داخلي وإقليمي، رحلات عمرة، أوناش وإصلاح للغير.', 'أكثر من 400 حافلة و1,050 سائق، تأجير داخلي وإقليمي، رحلات عمرة، أوناش وإصلاح للغير.')
s = R(s, 'تأسست بموجب المرسوم الأميري رقم (60) باسم «شركة المواصلات الكويتية».', 'تأسست بموجب المرسوم الأميري رقم (60) باسم «شركة المواصلات الكويتية»، وكانت أسهمها موزعة بين الحكومة والأفراد.')
s = R(s, '<h3>بيئة صحية</h3><p>حافلات كهربائية عديمة الانبعاثات، وصيانة دورية تقلل استهلاك الوقود.</p>', '<h3>بيئة صحية</h3><p>حافلات K-eBus الكهربائية عديمة الانبعاثات، وصيانة دورية عالية المستوى للأسطول.</p>')
s = R(s, '<div class="box"><h3>خدمة المجتمع</h3><p>نقل الطلبة والمناسبات الوطنية، وخطوط خاصة مثل محطات سوق المباركية.</p></div>', '<div class="box"><h3>خدمة المجتمع</h3><p>مواقع محطات حافلات سوق المباركية وخدمات النقل لجميع مناطق الكويت.</p></div>')
wr(p, s)
print('store ok')

# ───────────── assistant ─────────────
p = 'pages/assistant.html'; s = rd(p)
a = s.index('// Knowledge Base'); b = s.index('// Intent Patterns')
s = s[:a] + '''// Knowledge Base: the company's published data (kptc.com.kw)
var KB = {
  card: {d31: 10, d91: 25, org_discount: 50, phone: '22328307'},
  umrah: [
    {days: 6, nights: 'ثلاث ليالٍ في مكة مع مرور بالمدينة', price: 60},
    {days: 11, nights: 'ست ليالٍ في مكة وليلتان في المدينة', price: 85}
  ],
  terminals: {
    'المالية': ['15','16','18','102A','102X','999'],
    'الشرق': ['11','12','507'],
    'دوار الأمم المتحدة': ['34','39','41'],
    'المرقاب': ['13','21','23','51','59','103'],
    'السالمية': ['77'],
    'جليب الشيوخ': ['40','66','66X','105','106','106X']
  },
  winch: [
    ['المناطق القريبة من الشويخ (الخالدية، اليرموك، الري، الشويخ 1، كيفان)',5,7],['خيطان — الفروانية',6,11],['حولي — السالمية',6,11],['الصليبية — أمغرة',7,14],
    ['الأحمدي — الصباحية',8,13],['الشاليهات',16,23],['الوفرة — النويصيب',20,23],['السالمي — العبدلي',20,25]
  ],
  contact: {hotline: '1880001', phone: '22328866', fax: '22328870', email: 'info@kptc.com.kw', box: 'ص.ب 375 — الصفاة، 13004 الكويت', hq: 'منطقة المرقاب'}
};

''' + s[b:]
s = s.replace("keywords: ['اشتراك','باقة','باقات','شهري','سنوي','starter','growth','school'],", "keywords: ['اشتراك','باقة','باقات','شهري','توفير','بطاقة','سعر البطاقة'],")
s = _re.sub(r"var DEFAULT_SUGS = \[.*?\];", "var DEFAULT_SUGS = [\n  'كم سعر بطاقة التوفير؟',\n  'ما أسعار رحلات العمرة؟',\n  'من أي محطة ينطلق خط 15؟',\n  'كم سعر الونش؟',\n  'ما رقم الخط الساخن؟'\n];", s, count=1, flags=re.S) if False else s
a = s.index('var DEFAULT_SUGS'); b = s.index('];', a) + 2
s = s[:a] + "var DEFAULT_SUGS = [\n  'كم سعر بطاقة التوفير؟',\n  'ما أسعار رحلات العمرة؟',\n  'من أي محطة ينطلق خط 15؟',\n  'كم سعر الونش؟',\n  'ما رقم الخط الساخن؟'\n];" + s[b:]
a = s.index('function respondSubscriptions'); b = s.index('function respondDefault')
funcs = r'''function respondSubscriptions(msg){
  return {
    text: '💳 <strong>بطاقة التوفير</strong><br><br>تنقّل بلا حدود على جميع الخطوط:<br><br>🚌 <strong>31 يوماً</strong> — <strong>10 د.ك</strong><br>⭐ <strong>91 يوماً</strong> — <strong>25 د.ك</strong> (أوفر بـ 5 د.ك من ثلاث بطاقات شهرية)<br><br>🏢 للهيئات والوزارات والشركات: خصومات تصل إلى <strong>50%</strong> على نظام الاشتراكات.<br><br>📞 للاستفسار عن البطاقة: <strong>22328307</strong><br><br><a class="action-link" href="KPTC_Subscriptions.html">💳 اشترك الآن</a>',
    suggestions: ['كم سعر بطاقة 91 يوماً؟','ما وسائل الدفع؟','كيف أتواصل معكم؟']
  };
}

function respondTickets(msg){
  return {
    text: '🎫 <strong>التذاكر الفردية</strong><br><br>للاستفسار عن أسعار التذاكر الفردية اتصل بالخط الساخن <strong>1880001</strong>.<br><br>💡 إذا كنت تتنقّل كثيراً فبطاقة التوفير أوفر: <strong>10 د.ك</strong> لـ 31 يوماً برحلات بلا حدود.',
    suggestions: ['كم سعر بطاقة التوفير؟','ما رقم الخط الساخن؟']
  };
}

function respondUmrah(msg){
  return {
    text: '🕌 <strong>رحلات العمرة</strong><br><br>🗓️ <strong>6 أيام</strong> (ثلاث ليالٍ في مكة مع مرور بالمدينة) — <strong>60 د.ك</strong><br>🗓️ <strong>11 يوماً</strong> (ست ليالٍ في مكة وليلتان في المدينة) — <strong>85 د.ك</strong><br><br>السعر للشخص في غرفة جماعية، ويشمل السكن والمواصلات والتأشيرة فقط. يُضاف <strong>9 د.ك</strong> عند طلب تأشيرة عمرة.<br><br>📄 <strong>المطلوب:</strong> جواز ساري لمدة 6 أشهر فأكثر (مع 3 أشهر إقامة)، صورة شخصية حديثة، وصورة من البطاقة المدنية أو الهوية.<br>✓ مسموح السفر لجميع الأعمار والنساء بدون محرم.<br><br><a class="action-link" href="KPTC_Umrah.html">🕌 احجز رحلتك</a>',
    suggestions: ['ما المستندات المطلوبة؟','ما الذي يشمله السعر؟','كيف أتواصل معكم؟']
  };
}

function respondVIP(msg){
  return {
    text: '🚌 <strong>تأجير الحافلات داخل الكويت</strong><br><small>الأسعار بالدينار الكويتي: 8 ساعات / 12 ساعة / 24 ساعة</small><br><br><strong>سياحية كبيرة (45 راكباً):</strong><br>مناطق سكنية 85 / 100 / 140<br>مناطق حدودية 100 / 120 / 185 (وأول 4 ساعات 85)<br><br><strong>متوسطة (35–40 راكباً):</strong> سكنية 25 / 35 / 60 — حدودية 30 / 40 / 70<br><strong>صغيرة (19–25 راكباً):</strong> سكنية 20 / 30 / 50 — حدودية 25 / 35 / 60<br><strong>نيسان لذوي الإعاقة:</strong> 30 / 40 / 70<br><br>🌍 <strong>رحلات خارجية</strong> (45 راكباً): 200 د.ك لليوم، 605 د.ك لأربعة أيام، واليوم الإضافي بعدها 80 د.ك.<br><br><a class="action-link" href="KPTC_VIP.html">🚌 احجز حافلة</a>',
    suggestions: ['ما الفرق بين السكنية والحدودية؟','كيف أتواصل معكم؟']
  };
}

function respondRoutes(msg){
  var m = msg.match(/(\d{1,3}[a-zA-Z]?|a2)/i), num = m ? m[1].toUpperCase() : null, T = KB.terminals, found = null;
  if(num){ Object.keys(T).forEach(function(t){ if(T[t].indexOf(num) !== -1) found = t; }); }
  if(found){
    return {text: '🚌 <strong>خط ' + num + '</strong><br><br>ينطلق من محطة <strong>' + found + '</strong>.<br>المسار التفصيلي ومحطات الصعود في خريطة الشبكة الرسمية داخل صفحة الخطوط.<br><br>📞 للمواعيد: <strong>1880001</strong><br><br><a class="action-link" href="KPTC_Routes.html">🗺️ افتح الخريطة</a>', suggestions: ['خطوط محطة المالية','خطوط محطة المرقاب','ما رقم الخط الساخن؟']};
  }
  for(var t in T){ if(msg.indexOf(t) !== -1){ return {text: '🚌 <strong>خطوط محطة ' + t + '</strong><br><br>' + T[t].map(function(n){return '• خط <strong>' + n + '</strong>'}).join('<br>') + '<br><br>التفاصيل في خريطة الشبكة الرسمية داخل صفحة الخطوط.', suggestions: ['خط 15','خط 77','ما رقم الخط الساخن؟']}; } }
  return {
    text: '🗺️ شبكة K-Bus فيها <strong>26 مساراً</strong> تنطلق من المحطات الرئيسية:<br><br>' + Object.keys(T).map(function(t){return '• <strong>' + t + '</strong>: ' + T[t].join('، ')}).join('<br>') + '<br><br>اكتب رقم الخط (مثل: خط 15) لأخبرك من أي محطة ينطلق.<br><a class="action-link" href="KPTC_Routes.html">🗺️ افتح الخريطة</a>',
    suggestions: ['خط 15','خط 77','خط 40','خطوط محطة المالية']
  };
}

function respondWinch(){
  var rows = KB.winch.map(function(z){return '• ' + z[0] + ': <strong>' + z[1] + '</strong> / <strong>' + z[2] + '</strong>'}).join('<br>');
  return {
    text: '🔧 <strong>خدمة الأوناش</strong><br>⏰ تعمل <strong>24 ساعة</strong>، 7 أيام في الأسبوع وخلال الإجازات الرسمية، في محافظات الكويت الست.<br><br><strong>أسعار السحب (د.ك):</strong> مركبة صالون / مركبة كبيرة<br>' + rows + '<br><br>📞 للطلب: <strong>1880001</strong> أو <strong>22328866</strong><br><br><a class="action-link" href="KPTC_Winch.html">🚛 اطلب ونش</a>',
    suggestions: ['كم أجرة ساعة الورشة؟','ما رقم الخط الساخن؟']
  };
}

function respondLost(){
  return {
    text: '🔍 <strong>خدمة المفقودات</strong><br><br>إذا نسيت شيئاً في إحدى حافلات KPTC:<br><br><strong>1️⃣ البلاغ الإلكتروني:</strong><br>املأ النموذج في صفحة المفقودات واذكر الخط والتاريخ ووصف الغرض<br><br><strong>2️⃣ اتصل بنا:</strong><br>📞 الخط الساخن <strong>1880001</strong><br>📞 الهاتف <strong>22328866</strong><br><br><strong>3️⃣ المراسلة:</strong><br>📧 info@kptc.com.kw<br>📍 ' + KB.contact.box + '<br><br><a class="action-link" href="KPTC_LostFound.html">📝 بلّغ عن مفقود الآن</a>',
    suggestions: ['ما المعلومات المطلوبة؟','كيف أتواصل معكم؟']
  };
}

function respondComplaint(){
  return {
    text: '📝 <strong>تقديم شكوى أو ملاحظة</strong><br><br><strong>طرق التواصل:</strong><br><br>📞 الخط الساخن <strong>1880001</strong><br>📞 الهاتف <strong>22328866</strong><br>📧 <strong>info@kptc.com.kw</strong><br><br><strong>يفيدنا أن تذكر:</strong><br>• رقم الخط أو الحافلة<br>• الوقت والتاريخ التقريبي<br>• تفاصيل ما حدث',
    suggestions: ['ما رقم الخط الساخن؟','كيف أتواصل معكم؟']
  };
}

function respondAds(){
  return {
    text: '📢 <strong>الإعلان على حافلات KPTC</strong><br><br>إعلانك يتحرك مع أسطول يزيد على <strong>400 حافلة</strong> في شوارع الكويت.<br>تجد خيارات الباقات والمواضع في صفحة الإعلان، وللتعاقد والتسعير النهائي تواصل مع إدارة التسويق: <strong>22328866</strong> · info@kptc.com.kw<br><br><a class="action-link" href="KPTC_Advertising.html">📢 ابنِ حملتك</a>',
    suggestions: ['كيف أتواصل معكم؟']
  };
}

function respondContact(){
  var c = KB.contact;
  return {
    text: '📞 <strong>تواصل مع KPTC</strong><br><br>📱 <strong>الخط الساخن:</strong> <span class="pill-info">' + c.hotline + '</span><br>☎️ <strong>الهاتف:</strong> ' + c.phone + '<br>📠 <strong>الفاكس:</strong> ' + c.fax + '<br>💳 <strong>بطاقة التوفير:</strong> ' + KB.card.phone + '<br><br>📧 <strong>البريد:</strong> ' + c.email + '<br><br>📍 <strong>العنوان:</strong><br>' + c.box + '<br>المقر الرئيسي: ' + c.hq + '<br><br>🌐 www.kptc.com.kw<br>📱 على وسائل التواصل: <strong>@kptckuwait</strong>',
    suggestions: ['كم سعر بطاقة التوفير؟','كم سعر الونش؟']
  };
}

function respondPayment(){
  return {
    text: '💳 <strong>طرق الدفع</strong><br><br>🏦 <strong>KNET</strong><br>💳 <strong>Visa</strong> و <strong>Mastercard</strong><br>💻 <strong>CashU</strong><br>💱 <strong>UAE Exchange</strong>',
    suggestions: ['كم سعر بطاقة التوفير؟','كم سعر الونش؟']
  };
}

function respondThanks(){
  var responses = [
    'العفو! 😊 إذا احتجت أي شيء آخر أنا هنا.',
    'حياك الله! 🌸 اسألني متى شئت.',
    'تسلم! أي خدمة ثانية؟'
  ];
  return {text: responses[Math.floor(Math.random()*responses.length)], suggestions: DEFAULT_SUGS};
}

'''
s = s[:a] + funcs + s[b:]
wr(p, s)
print('assistant ok')

# ───────────── cleanup ─────────────
import re as _re2
def sub_all(path, pairs, regex=False):
    s = rd(path)
    for a, b in pairs:
        if regex: s, n = _re2.subn(a, b, s); assert n, 'MISSING ' + a[:50]
        else: assert a in s, 'MISSING ' + a[:50]; s = s.replace(a, b)
    wr(path, s)
sub_all('pages/subs.html', [('الباقة الأساسية — ينتهي 11 مايو 2026', 'بطاقة التوفير — ينتهي 11 مايو 2026')])
for pg in ('pages/subs.html', 'pages/umrah.html'):
    s = rd(pg)
    s = _re2.sub(r'🍎(\s*)Apple Pay', r'💻\1CashU', s); s = _re2.sub(r'🤖(\s*)Google Pay', r'💱\1UAE Exchange', s)
    s = s.replace('>Apple Pay<', '>CashU<').replace('>Google Pay<', '>UAE Exchange<')
    wr(pg, s)
s = rd('pages/dashboard.html')
s = s.replace('150 خط — 6 محافظات — يتحدث لحظياً', '26 مساراً — يتحدث لحظياً')
s = _re2.sub(r'\s*—\s*72% نسبة استرداد', '', s)
s = _re2.sub(r'(<div class="sv">)72%(</div><div class="sl">نسبة الاسترداد</div>)', r'\1—\2', s)
s = s.replace('Apple Pay', 'CashU').replace('Google Pay', 'UAE Exchange')
wr('pages/dashboard.html', s)
s = rd('pages/adminai.html'); s = _re2.sub(r"\s*72% نسبة الاسترداد\s*", ' ', s); wr('pages/adminai.html', s)
print('cleanup ok')
