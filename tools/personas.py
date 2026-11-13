#!/usr/bin/env python3
"""Generate the "user perspectives" pages (pages/u-*.html) from the data below.
Each page describes one kind of user, what they need, and the stops of their
journey through the system; "start the tour" walks the gateway through only
their pages. Run, then run tools/build.py.
"""
import os, json, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAGE = {'home':'الصفحة الرئيسية','routes':'الخطوط والمسارات','subs':'الاشتراكات والتذاكر','umrah':'رحلات العمرة','vip':'باصات VIP',
        'winch':'الونش والورشة','lost':'المفقودات','ads':'الإعلانات على الحافلات','assistant':'مساعد العملاء الذكي','dashboard':'لوحة التحكم الإدارية',
        'adminai':'المساعد الإداري الذكي','portal':'بوابة الموظفين','realestate':'إدارة الأصول العقارية','reai':'المساعد العقاري',
        'reclient':'مساحات للإيجار','tenant':'بوابة المستأجر','exec':'العرض التنفيذي'}

P = [
 dict(id='u-rider', t='الراكب اليومي', side='زائر الموقع', who='موظف أو طالب يتنقّل بالحافلة كل يوم ويريد أن يعرف متى تصل حافلته وكم يدفع.',
      needs=['يعرف موعد الحافلة القادمة دون اتصال','يدفع أقل ما يمكن على تنقّله الشهري','يسترجع غرضاً نسيه في الحافلة'],
      steps=[('home','يسأل «إلى أين اليوم؟» ويرى لافتة المحطة المباشرة وحاسبة التوفير.'),('routes','يبحث عن خطّه بين 150 خطاً ويرى المسار على الخريطة.'),
             ('subs','يقارن الباقات ويشترك ويدفع بكي نت.'),('assistant','يسأل المساعد الذكي بالعامية عن خط أو سعر.'),('lost','يبلّغ عن غرض مفقود ويتابع البلاغ برقمه.')],
      hidden='لا يرى أي شاشة إدارية أو بيانات راكب آخر.'),
 dict(id='u-pilgrim', t='المعتمر', side='زائر الموقع', who='فرد أو عائلة تريد حجز رحلة عمرة بمقاعد مؤكدة وسعر واضح.',
      needs=['يعرف الرحلات القادمة والمقاعد المتبقية','يختار مقعده ونوع الغرفة','يدفع إلكترونياً ويستلم تأكيداً'],
      steps=[('home','يرى رحلة العمرة القادمة وعدد المقاعد المتبقية.'),('umrah','خمس خطوات: الرحلة، البيانات، المقعد، التأمين، الدفع.'),('assistant','يسأل عن التأشيرة أو موعد الانطلاق.')],
      hidden='لا يرى كشوف الركاب ولا تسعير الرحلات الداخلي.'),
 dict(id='u-vip', t='عميل VIP والمناسبات', side='زائر الموقع', who='جهة أو عائلة تحجز حافلة فاخرة لرحلة داخلية أو خارجية أو باص ديوانية.',
      needs=['يختار نوع الحافلة وعدد المقاعد','يضيف الخدمات: ضيافة، واي فاي، مصوّر','يعرف التكلفة قبل التأكيد'],
      steps=[('home','يصل من قسم «الرحلات والمناسبات».'),('vip','يختار الحافلة، يحدد المسار والمقاعد، ويرى ملخص الحجز والتكلفة لحظياً.')],
      hidden='لا يرى جدول السائقين ولا توزيع الأسطول.'),
 dict(id='u-driver', t='صاحب مركبة متعطلة', side='زائر الموقع', who='سائق تعطلت سيارته على الطريق ويحتاج ونشاً في أسرع وقت.',
      needs=['يطلب الونش بأقل عدد من الخطوات','يعرف أقرب شاحنة والوقت المتوقع','يحجز موعداً في الورشة إن لزم'],
      steps=[('home','شريط الطوارئ الأحمر ظاهر في كل زيارة.'),('winch','يحدد نوع السيارة والمشكلة والموقع، ويرى الشاحنات المتاحة ووقت الوصول.')],
      hidden='لا يرى لوحة توزيع الشاحنات الداخلية.'),
 dict(id='u-advertiser', t='المعلن', side='عميل أعمال', who='مسؤول تسويق في شركة يريد إعلاناً يتحرك في شوارع الكويت.',
      needs=['يفهم الباقات والأسعار','يختار مواضع الإعلان على الحافلة ويعاينها','يرسل طلب حملة أو يطلب استشارة'],
      steps=[('home','يصل من قسم «للأعمال».'),('ads','يختار الباقة والمواضع، يعاين الإعلان على الحافلة، ويرسل طلب الحملة.')],
      hidden='لا يرى عقود المعلنين الآخرين ولا إيرادات الإعلانات.'),
 dict(id='u-prospect', t='التاجر الباحث عن مساحة', side='عميل أعمال', who='صاحب مطعم أو محل يبحث عن موقع داخل محطة مزدحمة.',
      needs=['يتصفح المساحات المتاحة حسب النوع والموقع','يعرف الإيجار والمساحة وعدد المارّة','يرسل استفساراً أو يطلب اتصالاً'],
      steps=[('home','يصل من «العقارات» في القائمة أو من قسم «للأعمال».'),('reclient','يفلتر المساحات، يفتح تفاصيل الوحدة، ويرسل استفساره.')],
      hidden='لا يرى نسب الإشغال التفصيلية ولا عقود المستأجرين.'),
 dict(id='u-tenant', t='المستأجر الحالي', side='عميل أعمال', who='مستأجر محل داخل إحدى المحطات يدير عقده ومدفوعاته.',
      needs=['يدفع الإيجار ويرى سجل الدفعات','يرفع طلب صيانة ويتابعه','يعرف موعد انتهاء العقد'],
      steps=[('tenant','يرى عقده، الإيجار المستحق، طلبات الصيانة، والإشعارات، ويسأل المساعد عن أي منها.')],
      hidden='يرى عقده فقط، ولا يرى أي مستأجر آخر.'),
 dict(id='u-employee', t='الموظف', side='فريق العمل', who='موظف في الشركة يحتاج إجازة أو كشف راتب أو مستلزمات.',
      needs=['يقدّم طلب إجازة ويتابع الموافقة','يحمّل كشف الراتب','يطّلع على إعلانات الشركة'],
      steps=[('portal','يدخل برقمه الوظيفي حسب صفته (موظف، مدير، مهندس) ويرى طلباته ورصيده وإعلانات الشركة.')],
      hidden='يرى طلباته هو، والمدير يرى طلبات فريقه فقط.'),
 dict(id='u-manager', t='مدير التسويق وخدمة العملاء', side='فريق العمل', who='المسؤول عن متابعة الخدمات والشكاوى والإيرادات يومياً.',
      needs=['يرى أرقام اليوم في شاشة واحدة','يعالج الشكاوى والمفقودات والطلبات','يصدر التقارير ويرسلها للإدارة'],
      steps=[('dashboard','23 قسماً: الركاب، الاشتراكات، العمرة، VIP، الونش، الشكاوى، العقارات، الموظفون والتقارير.'),('adminai','يسأل المساعد: «ما ملخص اليوم؟» ويحصل على تقرير جاهز للإرسال.')],
      hidden='صلاحياته تحدد الأقسام التي يراها.'),
 dict(id='u-remanager', t='مدير الأصول العقارية', side='فريق العمل', who='المسؤول عن تأجير 54 وحدة في 8 مواقع ومتابعة عقودها.',
      needs=['يعرف نسبة الإشغال والوحدات الشاغرة','يتابع العقود المنتهية والإيجارات المتأخرة','يرد على استفسارات المستأجرين المحتملين'],
      steps=[('realestate','نظرة عامة، المواقع، الوحدات، العقود، المستأجرون، المالية، الصيانة والتقارير.'),('reai','يطلب من المساعد قائمة المتأخرين أو توصيات لرفع الإيراد.'),('reclient','يراجع كيف تظهر المساحات للزائر.')],
      hidden='لا يدير خدمات النقل ولا بيانات الركاب.'),
 dict(id='u-exec', t='الإدارة العليا', side='فريق العمل', who='صاحب القرار الذي يريد الصورة الكاملة في دقائق.',
      needs=['يفهم الرؤية والخطة والأثر المتوقع','يطّلع على المؤشرات الحية','يتأكد من جاهزية التنفيذ'],
      steps=[('exec','الرؤية، المؤشرات، مراحل الخطة، المشاريع الجارية والأثر.'),('dashboard','يتحقق من الأرقام من مصدرها.'),('home','يرى ما يراه العميل.')],
      hidden='عرض للقراءة والقرار، دون تعديل بيانات تشغيلية.'),
]

TPL = '''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__T__ — منظور المستخدم — KPTC</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--kp-paper);color:var(--kp-ink);line-height:1.8;font-size:16px}
.w{max-width:1080px;margin:0 auto;padding:0 28px}
.top{background:var(--kp-ink);color:#fff;border-bottom:4px solid var(--kp-sign)}
.top .w{display:flex;align-items:center;gap:14px;height:60px;font-size:13.5px;color:#B7B5D6}
.top .kp-mark{width:36px;height:36px;flex-shrink:0}
.top b{color:#fff;letter-spacing:.14em;direction:ltr;font-size:15px}
.top span{border-inline-start:1px solid rgba(255,255,255,.18);padding-inline-start:14px}
.pass{display:grid;grid-template-columns:1fr auto;gap:40px;align-items:end;padding:54px 0 44px}
.side{display:inline-flex;align-items:center;gap:10px;font-size:13.5px;font-weight:600;color:var(--kp-muted);margin-bottom:14px}
.side::before{content:"";width:10px;height:10px;background:var(--kp-sign);outline:3px solid var(--kp-ink)}
h1{font-size:clamp(34px,5vw,58px);font-weight:800;line-height:1.3;animation:kp-in .7s var(--kp-ease) both}
.who{font-size:18px;color:var(--kp-muted);max-width:30em;margin-top:10px;animation:kp-in .7s .1s var(--kp-ease) both}
.go{display:inline-flex;align-items:center;gap:12px;background:var(--kp-indigo);color:#fff;border:0;border-radius:4px;padding:15px 22px;font-weight:700;font-size:15px;cursor:pointer;animation:kp-in .7s .2s var(--kp-ease) both}
.go:hover{background:var(--kp-ink)}
.go i{width:26px;height:26px;background:var(--kp-sign);border-radius:2px;display:grid;place-items:center;color:var(--kp-ink);transition:translate .25s var(--kp-ease)}
.go:hover i{translate:-4px 0}
.go svg{width:14px;height:14px}
.cols{display:grid;grid-template-columns:1fr 1.5fr;gap:0;border-top:2px solid var(--kp-ink);margin-bottom:70px}
.col{padding:30px 0}
.col+.col{border-inline-start:1px solid var(--kp-line-2);padding-inline-start:36px}
.col:first-child{padding-inline-end:36px}
h2{font-size:19px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:10px}
h2::before{content:"";width:22px;height:5px;background:var(--kp-sign)}
.needs{list-style:none;display:grid}
.needs li{padding:12px 0;border-bottom:1px solid var(--kp-line-2);font-weight:500;display:flex;gap:12px}
.needs li::before{content:"";width:11px;height:11px;border-radius:50%;border:3px solid var(--kp-indigo);margin-top:9px;flex-shrink:0}
.hid{margin-top:22px;font-size:14px;color:var(--kp-muted);background:var(--kp-paper-2);border:1px dashed var(--kp-line-2);border-radius:4px;padding:12px 14px}
.hid b{color:var(--kp-ink);display:block;font-size:13px}
.trip{list-style:none;position:relative;counter-reset:s}
.trip::before{content:"";position:absolute;top:24px;bottom:40px;right:18px;width:5px;background:var(--kp-indigo);border-radius:3px;transform-origin:top;animation:tdraw .9s .3s var(--kp-ease) both}
@keyframes tdraw{from{transform:scaleY(0)}}
.trip li{counter-increment:s;position:relative;padding:0 62px 14px 0}
.trip li::before{content:counter(s);position:absolute;right:0;top:6px;width:41px;height:41px;border-radius:50%;background:#fff;border:4px solid var(--kp-indigo);display:grid;place-items:center;font-family:var(--f-display);font-weight:800;color:var(--kp-indigo);box-sizing:border-box;transition:background .2s,scale .25s var(--kp-ease);animation:tpop .4s var(--kp-ease) both;animation-delay:calc(.4s + var(--i)*.12s)}
@keyframes tpop{from{scale:0}}
.trip li:hover::before{background:var(--kp-sign);scale:1.12}
.stop{display:block;width:100%;text-align:right;background:#fff;border:1px solid var(--kp-line);border-radius:4px;padding:14px 18px;cursor:pointer;transition:border-color .2s,box-shadow .2s,translate .25s var(--kp-ease);animation:kp-in .5s var(--kp-ease) both;animation-delay:calc(.45s + var(--i)*.12s)}
.stop:hover{border-color:var(--kp-indigo);box-shadow:var(--sh-2);translate:-6px 0}
.stop b{display:flex;justify-content:space-between;align-items:center;font-family:var(--f-display);font-size:17px;font-weight:700;color:var(--kp-indigo)}
.stop b svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;opacity:.4;transition:opacity .2s}
.stop:hover b svg{opacity:1}
.stop span{display:block;color:var(--kp-muted);font-size:14.5px}
.others{border-top:1px solid var(--kp-line-2);padding:26px 0 60px}
.others h2{font-size:15px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips button{background:#fff;border:1px solid var(--kp-line-2);border-radius:3px;padding:8px 14px;font-weight:600;font-size:14px;color:var(--kp-ink);cursor:pointer}
.chips button:hover{border-color:var(--kp-indigo);color:var(--kp-indigo)}
.chips button[aria-current]{background:var(--kp-ink);color:var(--kp-sign);border-color:var(--kp-ink)}
@media(max-width:820px){.pass{grid-template-columns:1fr;gap:22px;padding-top:36px}.cols{grid-template-columns:1fr}.col+.col{border-inline-start:0;padding-inline-start:0;border-top:1px solid var(--kp-line-2)}.col:first-child{padding-inline-end:0}.w{padding:0 16px}}
</style>
</head>
<body>
<div class="top"><div class="w"><div class="kp-mark"></div><b>KPTC</b><span>منظور المستخدم · __SIDE__</span></div></div>
<main class="w">
  <section class="pass">
    <div>
      <div class="side">__SIDE__</div>
      <h1>__T__</h1>
      <p class="who">__WHO__</p>
    </div>
    <button class="go" type="button" id="tourBtn">ابدأ الجولة من منظوره <i><svg viewBox="0 0 24 24"><path d="M17 4.5v15L5 12z" fill="currentColor"/></svg></i></button>
  </section>
  <section class="cols">
    <div class="col">
      <h2>ما الذي يريده</h2>
      <ul class="needs">__NEEDS__</ul>
      <p class="hid"><b>حدود ما يراه</b>__HIDDEN__</p>
    </div>
    <div class="col">
      <h2>محطات رحلته في المنظومة</h2>
      <ol class="trip">__STEPS__</ol>
    </div>
  </section>
  <section class="others">
    <h2>منظور مستخدم آخر</h2>
    <div class="chips">__OTHERS__</div>
  </section>
</main>
<script>
(function(){
  var TOUR=__TOUR__,NAME=__NAME__;
  function go(id){if(window.parent!==window){try{parent.postMessage({kptcNav:id},'*')}catch(x){}}else location.href='../index.html#/'+id}
  document.querySelectorAll('[data-go]').forEach(function(b){b.addEventListener('click',function(){go(b.getAttribute('data-go'))})});
  document.getElementById('tourBtn').addEventListener('click',function(){
    if(window.parent!==window){try{parent.postMessage({kptcTour:{name:NAME,ids:TOUR}},'*')}catch(x){}}else go(TOUR[0]);
  });
})();
</script>
</body>
</html>
'''
ARROW = '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'

def build():
    out = []
    for p in P:
        steps = ''.join(f'<li style="--i:{i}"><button class="stop" type="button" data-go="{pid}" style="--i:{i}"><b>{PAGE[pid]}{ARROW}</b><span>{html.escape(txt)}</span></button></li>' for i, (pid, txt) in enumerate(p['steps']))
        others = ''.join(f'<button type="button" data-go="{o["id"]}"' + (' aria-current="page"' if o is p else '') + f'>{o["t"]}</button>' for o in P)
        s = (TPL.replace('__T__', p['t']).replace('__SIDE__', p['side']).replace('__WHO__', html.escape(p['who']))
             .replace('__NEEDS__', ''.join(f'<li>{html.escape(n)}</li>' for n in p['needs']))
             .replace('__HIDDEN__', html.escape(p['hidden'])).replace('__STEPS__', steps).replace('__OTHERS__', others)
             .replace('__TOUR__', json.dumps([x[0] for x in p['steps']])).replace('__NAME__', json.dumps(p['t'], ensure_ascii=False)))
        open(os.path.join(ROOT, 'pages', p['id'] + '.html'), 'w', encoding='utf-8').write(s)
        out.append({'id': p['id'], 't': p['t'], 'g': 'users', 'ic': '', 'd': p['side'] + ' · ' + str(len(p['steps'])) + (' محطات' if len(p['steps']) > 2 else (' محطتان' if len(p['steps']) == 2 else ' محطة'))})
    return out

if __name__ == '__main__':
    print(json.dumps(build(), ensure_ascii=False))
