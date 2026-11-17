/* KPTC shared data layer (runs in <head>, before any page script).
   - Latin digits everywhere: date/number formatting and anything typed.
   - One small database shared by every page, kept in the browser (localStorage).
     The same shape maps 1:1 onto Firestore collections when the site is connected
     to Firebase (see FIREBASE.txt): users, wallets, bookings, news, tenders, jobs,
     applications, settings/pages. */
(function(){
  if (window.KPTC) return;

  /* ---- 1) digits: always 0-9 ------------------------------------------- */
  var AR = /[٠-٩۰-۹]/g;
  function latin(s){ return String(s).replace(AR, function(c){ var n = c.charCodeAt(0); return String(n >= 0x06F0 ? n - 0x06F0 : n - 0x0660); }); }
  function loc(l){ if (typeof l !== 'string' || !/^(ar|fa|ur)/i.test(l) || /-u-.*nu-/.test(l)) return l; return l + (l.indexOf('-u-') > -1 ? '-nu-latn' : '-u-nu-latn'); }
  ['toLocaleString','toLocaleDateString','toLocaleTimeString'].forEach(function(m){
    var o = Date.prototype[m]; Date.prototype[m] = function(l, opt){ return latin(o.call(this, Array.isArray(l) ? l.map(loc) : loc(l), opt)); };
  });
  var nl = Number.prototype.toLocaleString; Number.prototype.toLocaleString = function(l, opt){ return latin(nl.call(this, Array.isArray(l) ? l.map(loc) : loc(l), opt)); };
  ['DateTimeFormat','NumberFormat'].forEach(function(k){
    if (!window.Intl || !Intl[k]) return; var O = Intl[k];
    var W = function(l, opt){ return new O(Array.isArray(l) ? l.map(loc) : loc(l), opt); };
    W.prototype = O.prototype; W.supportedLocalesOf = O.supportedLocalesOf; Intl[k] = W;
  });
  // whatever keyboard is used, typed digits are stored and shown as 0-9
  document.addEventListener('input', function(e){
    var t = e.target; if (!t || e.isComposing) return;
    if ((t.tagName === 'INPUT' && !/^(checkbox|radio|file|range|color|date|time|datetime-local|month|week)$/.test(t.type)) || t.tagName === 'TEXTAREA'){
      var v = t.value; AR.lastIndex = 0;
      if (AR.test(v)){ var s = null, en = null; try { s = t.selectionStart; en = t.selectionEnd; } catch(x){} t.value = latin(v); try { if (s !== null) t.setSelectionRange(s, en); } catch(x){} }
    }
  }, true);

  /* ---- 2) database ------------------------------------------------------ */
  var KEY = 'kptc.db.v2', mem = null, subs = [];
  function today(off){ var d = new Date(Date.now() + (off||0)*864e5); return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2); }
  function seed(){
    return {
      pages: {},                                   // id -> false when hidden from visitors
      notice: {on:false, text:'', tone:'yellow', link:''},   // site-wide announcement bar
      site: {                                      // everything the site studio controls
        pages: {},                                 // id -> {status:'on'|'maint'|'off', nav, label, badge, from, until, msg}
        navOrder: ['routes','subs','umrah','vip','winch','ads','reclient'],
        home: {},                                  // section key -> false when switched off
        ticker: [],                                // custom ticker lines (empty = the built-in ones)
        maintenance: {on:false, text:''},
        assistant: true,
        texts: {},                                 // page id (or '*') -> {original text: replacement}
        hidden: {},                                // page id -> [css selectors hidden from visitors]
        required: {},                              // page id -> {field key: true (mandatory) | false (optional)}
        sched: {}                                  // line number (or '*') -> {work:{first,last,peak,off,bands}, rest:{...}}
      },
      /* staff directory, roles and permissions (internal portal + studio) */
      roles: [
        {id:'emp', name:'موظف', perms:['portal.leave','portal.supplies','portal.invoice','portal.payslip','portal.benefits','portal.directory','portal.news','portal.policies','portal.occasions']},
        {id:'sup', name:'مدير إدارة', perms:['portal.leave','portal.supplies','portal.invoice','portal.payslip','portal.benefits','portal.directory','portal.news','portal.policies','portal.occasions','approve.leave','approve.supplies','approve.invoice','benefits.manage','occasions.post']},
        {id:'eng', name:'مهندس', perms:['portal.leave','portal.supplies','portal.invoice','portal.payslip','portal.benefits','portal.directory','portal.news','portal.policies','portal.occasions','ops.winch','ops.bookings']},
        {id:'hr', name:'الموارد البشرية', perms:['portal.leave','portal.supplies','portal.invoice','portal.payslip','portal.benefits','portal.directory','portal.news','portal.policies','portal.occasions','approve.leave','benefits.manage','benefits.claims','occasions.post','occasions.moderate','portal.admin','admin.staff']},
        {id:'content', name:'محرر الموقع', perms:['portal.leave','portal.supplies','portal.invoice','portal.payslip','portal.benefits','portal.directory','portal.news','portal.policies','portal.occasions','site.pages','site.texts','site.elements','site.home','site.news','site.tenders','site.jobs','site.sched']},
        {id:'fin', name:'الشؤون المالية', perms:['portal.leave','portal.supplies','portal.invoice','portal.payslip','portal.benefits','portal.directory','portal.news','portal.policies','portal.occasions','approve.invoice','ops.wallets','ops.bookings']},
        {id:'admin', name:'مدير النظام', perms:['*']}
      ],
      staff: {
        'KPTC-4821': {id:'KPTC-4821', email:'a.alqattan@kptc.com.kw', name:'أحمد القطان', title:'مدير التسويق والعلاقات العامة', dept:'التسويق والعلاقات العامة', role:'emp', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-900)},
        'KPTC-2891': {id:'KPTC-2891', email:'dept.manager@kptc.com.kw', name:'مدير الإدارة', title:'مشرف التسويق', dept:'التسويق والعلاقات العامة', role:'sup', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-1400)},
        'KPTC-ENG':  {id:'KPTC-ENG', email:'engineer@kptc.com.kw', name:'مهندس الصيانة', title:'مهندس أول', dept:'الإدارة الهندسية', role:'eng', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-2100)},
        'KPTC-3310': {id:'KPTC-3310', email:'hr.staff@kptc.com.kw', name:'موظف الموارد البشرية', title:'أخصائي شؤون الموظفين', dept:'الموارد البشرية', role:'hr', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-700)},
        'KPTC-5120': {id:'KPTC-5120', email:'web.editor@kptc.com.kw', name:'محرر الموقع', title:'أخصائي محتوى رقمي', dept:'التسويق والعلاقات العامة', role:'content', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-300)},
        'KPTC-1001': {id:'KPTC-1001', email:'sysadmin@kptc.com.kw', name:'مدير النظام', title:'مدير تقنية المعلومات', dept:'تقنية المعلومات', role:'admin', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-2600)}
      },
      staffSession: null, staffFails: {},
      /* benefits and offers: internal or external, for everyone, departments, or named people */
      benefits: [
        {id:'B-103', title:'اشتراك مخفّض في نادٍ صحي', desc:'خصم على الاشتراك السنوي عند إبراز رمز العرض. (عرض تجريبي للتوضيح)', type:'external', partner:'نادٍ صحي شريك', value:'خصم 40%', cat:'صحة ولياقة', aud:{mode:'all'}, approve:false, from:today(-5), until:today(60), limit:0, on:true, by:'KPTC-3310'},
        {id:'B-102', title:'بدل وجبة للمناوبين ليلاً', desc:'قسيمة وجبة لكل مناوبة ليلية خلال الشهر الحالي. (عرض تجريبي للتوضيح)', type:'internal', partner:'', value:'قسيمة وجبة', cat:'دعم المناوبين', aud:{mode:'depts', depts:['شؤون النقل','الورشة المركزية']}, approve:false, from:today(-2), until:today(28), limit:0, on:true, by:'KPTC-3310'},
        {id:'B-101', title:'دورة التسويق الرقمي المتقدم', desc:'مقعد تدريبي مدفوع من الشركة، خمسة أيام. يحتاج اعتماد مديرك. (عرض تجريبي للتوضيح)', type:'internal', partner:'مركز التدريب', value:'مقعد مدفوع', cat:'تدريب وتطوير', aud:{mode:'staff', staff:['KPTC-4821']}, approve:true, from:today(-1), until:today(14), limit:1, on:true, by:'KPTC-2891'}
      ],
      /* sections handed over by the system admin to the departments that run them */
      sections: [
        {id:'transport', name:'الخطوط والاشتراكات', pages:['routes','subs'], perms:['site.sched','ops.bookings','ops.wallets'], dept:'شؤون النقل'},
        {id:'trips', name:'العمرة وتأجير VIP', pages:['umrah','vip'], perms:['ops.bookings'], dept:'التسويق والعلاقات العامة'},
        {id:'eng', name:'الونش والورشة وفحص PDI', pages:['winch','pdi'], perms:['ops.winch','ops.pdi','ops.bookings'], dept:'الإدارة الهندسية'},
        {id:'ads', name:'الإعلان على الحافلات', pages:['ads'], perms:['ops.bookings'], dept:'التسويق والعلاقات العامة'},
        {id:'media', name:'المركز الإعلامي والأخبار', pages:['media'], perms:['site.news'], dept:'التسويق والعلاقات العامة'},
        {id:'tenders', name:'المناقصات', pages:['tenders'], perms:['site.tenders'], dept:'الشؤون المالية'},
        {id:'hr', name:'الوظائف والبوابة الداخلية', pages:['careers','portal'], perms:['site.jobs','benefits.manage','benefits.claims','occasions.post','occasions.moderate','portal.admin'], dept:'الموارد البشرية'},
        {id:'estate', name:'الأصول العقارية', pages:['reclient'], perms:['ops.bookings'], dept:'المرافق والصيانة'},
        {id:'care', name:'خدمة العملاء والمفقودات', pages:['lost','assistant','account'], perms:['ops.bookings','ops.wallets'], dept:'التسويق والعلاقات العامة'}
      ].map(function(x){ x.owner = ''; x.team = []; x.status = 'لم يُسلَّم'; x.note = ''; return x; }),
      deptInfo: {},        // contact details a department publishes in the staff directory: {dept:{p:phone, e:email}}
      tickets: [],         // support requests from a section to the system admin: {id, sec, from, text, d, status, replies:[{from,text,d}]}
      pdi: [               // pre-delivery inspection requests (engineering)
        {id:'PDI-10412', d:today(-6), name:'شركة تجريبية للسيارات', phone:'55500000', org:'وكالة مركبات', kind:'حافلة متوسطة', make:'مثال — موديل 2026', count:3, vin:'', where:'ورشة KPTC', date:today(-3), note:'(طلب تجريبي للتوضيح)', status:'مكتمل', result:'مطابق بملاحظات', remarks:'ضبط ضغط الإطارات وتحديث برمجية شاشة السائق قبل التسليم.', inspector:'KPTC-ENG', checks:{}}
      ],
      /* internal portal content (from the structure of the company's existing intranet) */
      circulars: [
        {id:'C-3', title:'تعميم: مواعيد الدوام الرسمي', body:'يُرجى الالتزام بمواعيد الحضور والانصراف المعتمدة وتسجيل البصمة عند الدخول والخروج. (مثال توضيحي)', tone:'indigo', on:true, must:true},
        {id:'C-2', title:'تنبيه أمن المعلومات', body:'لا تشارك كلمة مرورك مع أحد، وأبلغ الدعم الفني عن أي رسالة مشبوهة. (مثال توضيحي)', tone:'yellow', on:true},
        {id:'C-1', title:'عرض للعاملين', body:'عروض جديدة وصلت إلى صفحة «المزايا والعروض». راجعها قبل انتهاء مدتها. (مثال توضيحي)', tone:'green', on:true}
      ],
      decisions: [['تثبيت موظف بوظيفة مساعد مدير إدارة','شؤون وظيفية'],['تشكيل لجنة جرد المخازن الفنية','لجان'],['تعديل مسمى قسم بإدارة شؤون النقل','تنظيم إداري'],['ندب موظف للعمل بإدارة أخرى','شؤون وظيفية'],['اعتماد جدول المناوبات للربع القادم','تشغيل'],['تكليف رئيس قسم بالإنابة','شؤون وظيفية'],['تعميم بشأن استخدام المركبات الرسمية','تعاميم'],['تعميم بشأن إجراءات السلامة في الورش','تعاميم'],['اعتماد خطة التدريب السنوية','تدريب'],['تشكيل فريق التحول الرقمي','لجان'],['تعميم بشأن الإجازات الدورية','تعاميم'],['تحديث دليل الصلاحيات المالية','تنظيم إداري']].map(function(x, i){ return {id:String(4072897 - i).padStart(9, '0'), title:'قرار بشأن ' + x[0].replace(/^تعميم بشأن /, ''), cat:x[1], d:today(-i * 3 - 1), body:'نص توضيحي لحين ربط البوابة بأرشيف القرارات. يظهر هنا نص القرار ومرفقاته.'}; }),
      events: [{id:'E-2', d:today(6), title:'اجتماع مديري الإدارات'}, {id:'E-1', d:today(13), title:'دورة السلامة المهنية'}],
      ittickets: [],       // {id, from, cat, pri, sub, text, d, status, replies:[{from,text,d}]}
      library: [['دليل قواعد الحوكمة (الإصدار السادس)','الحوكمة'],['قواعد الحوكمة بالشركة','الحوكمة'],['سياسات الحوكمة','الحوكمة'],['وثيقة قواعد ممارسات العمل','الحوكمة'],['لوائح شركة النقل العام','لوائح'],['نماذج المراسلات المعتمدة 2025','لوائح'],['أرشيف الإعلانات','مراجع'],['الإجراءات الأولية لمواجهة الكوارث الطبيعية','السلامة'],['إرشادات استخدام الهاتف الرقمي','إرشادات'],['دليل السياسات والإجراءات — إدارة التسويق والعلاقات العامة وخدمة العملاء','السياسات والإجراءات'],['دليل الصلاحيات المالية','السياسات والإجراءات']].map(function(x, i){ return {id:'L-' + (i + 1), title:x[0], cat:x[1], kind:'PDF'}; }),
      requests: [],        // e-forms submitted by staff: {id, form, staff, d, data, steps:[{who, perm, status, by, at, note}], status}
      /* lost-and-found: items waiting at the Mirqab office (no personal names are kept) */
      found: [['محفظة جلد بنية','محفظة','#8B4513','77','السالمية ← حولي','تحتوي على بطاقات'],['محفظة سوداء صغيرة','محفظة','#1a1a1a','18','الشويخ ← خيطان','محفظة سوداء بسحّاب'],['شنطة تسوق','حقيبة','#2E5AAC','X1','كارفور ← حولي','أكياس تسوق من كارفور'],['شنطة ظهر بنية','حقيبة','#92400E','66','حولي ← خيطان','شنطة بنية'],['هاتف Samsung','هاتف','#1a1a1a','15','خيطان ← السالمية','هاتف Galaxy — شاشة مكسورة قليلاً'],['نقود','أخرى','#16A34A','77','السالمية ← حولي','مبلغ نقدي صغير مع باقي تذكرة'],['مفاتيح مع كيتشين','مفاتيح','#5D5C80','40','الفروانية ← القرين','مجموعة مفاتيح مع كيتشين معدني'],['نظارة طبية','نظارة','#1a1a1a','92','الجليب ← حولي','نظارة بإطار أسود'],['حقيبة مدرسية','حقيبة','#C2352E','66','حولي ← خيطان','حقيبة مدرسية حمراء'],['محفظة جلدية','محفظة','#8B4513','106','الجليب ← الشويخ','محفظة بنية بدون بطاقات'],['هاتف iPhone','هاتف','#5D5C80','15','المالية ← السالمية','iPhone بكفر شفاف'],['مفاتيح سيارة','مفاتيح','#C77A12','99','السالمية ← الكويت سيتي','مفاتيح مع ريموت سيارة ذهبي اللون']].map(function(x, i){ return {id:'F-' + (101 + i), name:x[0], type:x[1], color:x[2], bus:x[3], route:x[4], desc:x[5], d:today(-(i % 9) - (i > 8 ? 3 : 1)), status:i === 8 ? 'claimed' : i % 3 === 1 ? 'new' : 'found'}; }),
      claims: [],          // {id, bid, staff, d, status:'بانتظار الاعتماد'|'مقبول'|'مرفوض'|'مستخدم', code, msgs:[{from, text, d}]}
      /* colleagues' occasions (condolences and celebrations) */
      occasions: [
        {id:'O-3', kind:'عزاء', name:'زميل من شؤون النقل', dept:'شؤون النقل', text:'انتقل إلى رحمة الله تعالى والد زميلنا. إنا لله وإنا إليه راجعون. (مثال تجريبي)', date:today(0), time:'بعد صلاة العصر', place:'ديوان العائلة — يُحدَّث العنوان', status:'منشور', by:'KPTC-3310', marks:{}, book:[]},
        {id:'O-2', kind:'مولود', name:'زميلة من الشؤون المالية', dept:'الشؤون المالية', text:'رُزقت زميلتنا بمولود جديد، جعله الله من الصالحين. (مثال تجريبي)', date:today(-1), time:'', place:'', status:'منشور', by:'KPTC-3310', marks:{}, book:[]},
        {id:'O-1', kind:'ترقية', name:'زميل من الورشة المركزية', dept:'الورشة المركزية', text:'ترقية مستحقة إلى رئيس قسم. بالتوفيق في المهمة الجديدة. (مثال تجريبي)', date:today(-3), time:'', place:'', status:'منشور', by:'KPTC-2891', marks:{}, book:[]}
      ],
      users: { 'u-demo': {id:'u-demo', name:'أحمد العلي', phone:'55501234', email:'demo@kptc.com.kw', pass:'123456', civil:'', joined:today(-190)} },
      session: null,
      wallets: { 'u-demo': {balance:20, frozen:false, tx:[
        {id:'TX-1002', d:today(-9),  t:'خصم',  a:-10, note:'بطاقة التوفير — 31 يوماً', by:'النظام'},
        {id:'TX-1001', d:today(-10), t:'تعبئة', a:30,  note:'تعبئة عبر كي نت', by:'العميل'}
      ]}},
      bookings: [
        {id:'SUB-240611', uid:'u-demo', type:'اشتراك', page:'subs',  title:'بطاقة التوفير — 31 يوماً', d:today(-9),  status:'فعّال', amount:10,  until:today(22)},
        {id:'UMR-58213',  uid:'u-demo', type:'عمرة',  page:'umrah', title:'مكة المكرمة + المدينة (11 يوماً) — مقعدان', d:today(-4), status:'مؤكد', amount:170},
        {id:'LF-30418',   uid:'u-demo', type:'مفقودات', page:'lost', title:'محفظة جلد بنية — خط 21', d:today(-16), status:'وُجد الغرض', amount:0}
      ],
      news: [
        {id:'N-5', d:today(-3),  cat:'أخبار الشركة', title:'حافلات K-eBus الكهربائية عديمة الانبعاثات', body:'تضم صور الأسطول الرسمي حافلات K-eBus الكهربائية بشعار «Zero Emission»، ضمن توجه الشركة نحو بيئة صحية.', img:'kbus-ev.jpg', pub:true},
        {id:'N-4', d:today(-12), cat:'أخبار الشركة', title:'بطاقة التوفير: 10 د.ك لـ 31 يوماً و25 د.ك لـ 91 يوماً', body:'بطاقة شخصية تتيح التنقل بلا حدود على جميع الخطوط. للاستفسار: 1880001.', img:'kbus-fleet.jpg', pub:true},
        {id:'N-3', d:today(-25), cat:'المسؤولية الاجتماعية', title:'السلامة أولاً: معاً نعود بنقل آمن', body:'حملة توعوية تحمل شعار «السلامة أولاً» لتوعية الركاب والسائقين بقواعد السلامة.', img:'kbus-street.jpg', pub:true},
        {id:'N-2', d:today(-40), cat:'أخبار الشركة', title:'رحلات العمرة بأسعار مميزة للمجموعات والشركات', body:'رحلة 6 أيام بـ 60 د.ك ورحلة 11 يوماً بـ 85 د.ك، والسعر يشمل السكن والمواصلات والتأشيرة.', img:'umrah-art.jpg', pub:true},
        {id:'N-1', d:today(-61), cat:'بيانات صحفية', title:'مركز الأوناش يعمل على مدار الساعة', body:'خدمة سحب ونقل المركبات متاحة 24 ساعة، 7 أيام في الأسبوع، وخلال الإجازات الرسمية والعطلات.', img:'tow-1.jpg', pub:true}
      ],
      tenders: [
        {id:'T-2026-7', no:'2026/7', kind:'مناقصة',  title:'توريد وتركيب مظلات انتظار في محطات الحافلات', meet:today(6),  place:'مكتب مساعد المدير لشؤون المرافق والصيانة — صبحان الصناعية', close:today(21), box:'3', fee:75,  status:'مفتوحة'},
        {id:'T-2026-6', no:'2026/6', kind:'ممارسة',  title:'صيانة وإصلاح شبكات الإنذار والحريق في مواقع الشركة', meet:today(3),  place:'المبنى الرئيسي — إدارة المشتريات', close:today(12), box:'2', fee:75,  status:'مفتوحة'},
        {id:'T-2026-5', no:'2026/5', kind:'مزايدة',  title:'بيع حافلات خارجة عن الخدمة', meet:today(-2), place:'كراج صبحان', close:today(9),  box:'5', fee:100, status:'مفتوحة'},
        {id:'T-2026-4', no:'2026/4', kind:'مناقصة',  title:'توريد زي موحد للسائقين والفنيين', meet:today(-30), place:'المبنى الرئيسي — إدارة المشتريات', close:today(-12), box:'1', fee:50, status:'مغلقة'}
      ],
      bids: [],
      jobs: [
        {id:'J-104', title:'سائق حافلة نقل عام', dept:'شؤون النقل', loc:'جميع المحافظات', type:'دوام كامل', close:today(18), open:true, req:'رخصة قيادة حافلات سارية · خبرة سنتين · إجادة العربية أو الإنجليزية'},
        {id:'J-103', title:'فني ميكانيكا حافلات', dept:'الورشة المركزية', loc:'صبحان', type:'دوام كامل', close:today(25), open:true, req:'دبلوم ميكانيكا · خبرة 3 سنوات في المركبات الثقيلة'},
        {id:'J-102', title:'موظف خدمة عملاء', dept:'التسويق وخدمة العملاء', loc:'المبنى الرئيسي', type:'دوام كامل', close:today(10), open:true, req:'شهادة جامعية أو دبلوم · مهارات تواصل · العمل بنظام الورديات'},
        {id:'J-101', title:'محلل بيانات تشغيلية', dept:'المكتب الاستراتيجي وتطوير الأعمال', loc:'المبنى الرئيسي', type:'دوام كامل', close:today(30), open:true, req:'بكالوريوس في الإحصاء أو علوم الحاسب · خبرة في أدوات التحليل'}
      ],
      applications: [
        {id:'AP-9001', job:'J-102', name:'خالد المطيري', phone:'66012345', email:'k.m@example.com', exp:'4', note:'خبرة في مراكز الاتصال', d:today(-2), status:'قيد المراجعة'}
      ],
      log: []
    };
  }
  function load(){
    if (mem) return mem;
    try { var raw = localStorage.getItem(KEY); if (raw) mem = JSON.parse(raw); } catch(x){}
    if (!mem) { mem = seed(); }
    var s = seed(); for (var k in s) if (!(k in mem)) mem[k] = s[k];   // forward-compatible
    try { if (!mem.mig3){ mem.mig3 = 1; var add = {sup:['approve.forms'], hr:['approve.hr'], fin:['approve.fin']}; (mem.roles || []).forEach(function(r){ (add[r.id] || []).forEach(function(p){ if (r.perms.indexOf(p) < 0) r.perms.push(p); }); }); if (mem.library && mem.library.length <= 4) mem.library = s.library; } } catch(x){}
    try { var EM = {'KPTC-4821':'a.alqattan','KPTC-2891':'dept.manager','KPTC-ENG':'engineer','KPTC-3310':'hr.staff','KPTC-5120':'web.editor','KPTC-1001':'sysadmin'}; for (var ek in EM) if (mem.staff && mem.staff[ek] && !mem.staff[ek].email) mem.staff[ek].email = EM[ek] + '@kptc.com.kw'; } catch(x){}
    try { for (var sk in mem.staff) if (/\u0623\u0648\u0631\u0627\u062f/.test(mem.staff[sk].name)) mem.staff[sk].name = 'مدير الإدارة'; } catch(x){}   // a name removed at the owner's request
    return mem;
  }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch(x){} subs.forEach(function(f){ try { f(mem); } catch(x){} }); }
  window.addEventListener('storage', function(e){ if (e.key === KEY){ mem = null; load(); subs.forEach(function(f){ try { f(mem); } catch(x){} }); } });

  function id(p){ return p + '-' + String(Date.now()).slice(-6) + Math.floor(Math.random()*90+10); }
  function money(n){ return (Math.round(n*1000)/1000).toFixed(3) + ' د.ك'; }
  function fdate(s){ if (!s) return '—'; var p = String(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function log(msg, sec){ var d = load(), u = d.staffSession && d.staff && d.staff[d.staffSession]; d.log.unshift({d:new Date().toISOString(), msg:msg, sec:sec || '', by:u ? u.name : ''}); d.log = d.log.slice(0, 200); }

  var K = window.KPTC = {
    db: load, save: save, seed: seed, id: id, money: money, date: fdate, esc: esc, latin: latin, today: today,
    onChange: function(f){ subs.push(f); },
    reset: function(){ mem = seed(); save(); },

    /* accounts (demo: stored in this browser; Firebase Auth replaces this) */
    user: function(){ var d = load(); return d.session && d.users[d.session] || null; },
    register: function(o){
      var d = load(), phone = latin(o.phone||'').replace(/\D/g,'');
      if (!o.name || phone.length < 8 || !o.pass || o.pass.length < 6) return {error:'أكمل الاسم ورقم الهاتف (8 أرقام) وكلمة مرور من 6 أحرف على الأقل.'};
      for (var k in d.users) if (d.users[k].phone === phone) return {error:'هذا الرقم مسجّل من قبل. سجّل الدخول.'};
      var u = {id:id('u'), name:o.name.trim(), phone:phone, email:(o.email||'').trim(), pass:o.pass, civil:'', joined:today()};
      d.users[u.id] = u; d.wallets[u.id] = {balance:0, frozen:false, tx:[]}; d.session = u.id; log('حساب جديد: ' + u.name); save(); return {user:u};
    },
    login: function(phone, pass){
      var d = load(); phone = latin(phone||'').replace(/\D/g,'');
      for (var k in d.users) if (d.users[k].phone === phone && d.users[k].pass === pass){ d.session = k; save(); return {user:d.users[k]}; }
      return {error:'رقم الهاتف أو كلمة المرور غير صحيحة.'};
    },
    logout: function(){ load().session = null; save(); },

    /* wallet */
    wallet: function(uid){ var d = load(); uid = uid || d.session; if (!uid) return null; if (!d.wallets[uid]) d.wallets[uid] = {balance:0, frozen:false, tx:[]}; return d.wallets[uid]; },
    walletTx: function(uid, amount, type, note, by){
      var w = K.wallet(uid); if (!w) return {error:'لا يوجد حساب.'};
      amount = Math.round(Number(amount)*1000)/1000; if (!amount) return {error:'أدخل مبلغاً صحيحاً.'};
      if (w.frozen && by !== 'الإدارة') return {error:'المحفظة موقوفة مؤقتاً. تواصل مع خدمة العملاء.'};
      if (amount < 0 && w.balance + amount < 0) return {error:'الرصيد غير كافٍ.'};
      w.balance = Math.round((w.balance + amount)*1000)/1000;
      var tx = {id:id('TX'), d:today(), t:type, a:amount, note:note||'', by:by||'العميل'}; w.tx.unshift(tx);
      log((by||'العميل') + ': ' + type + ' ' + money(Math.abs(amount)) + ' — ' + (load().users[uid]||{}).name); save(); return {tx:tx, balance:w.balance};
    },

    /* bookings made on the service pages */
    addBooking: function(b){ var d = load(); b.uid = b.uid || d.session || 'guest'; b.d = b.d || today(); b.status = b.status || 'قيد المعالجة'; d.bookings.unshift(b); log('طلب جديد ' + b.id + ' — ' + b.type); save(); return b; },

    /* site studio */
    site: function(){ var d = load(), def = seed().site, s = d.site || (d.site = def); for (var k in def) if (!(k in s)) s[k] = def[k]; return s; },
    page: function(pid){ var s = K.site(); return s.pages[pid] || (s.pages[pid] = {status: load().pages[pid] === false ? 'off' : 'on'}); },
    /* 'on' | 'maint' | 'off' as a visitor sees it now (schedule and site-wide maintenance included) */
    pageState: function(pid){
      var s = K.site(), p = s.pages[pid] || {}, st = p.status || (load().pages[pid] === false ? 'off' : 'on'), t = today();
      if (st === 'on' && ((p.from && t < p.from) || (p.until && t > p.until))) st = 'off';
      if (st === 'on' && s.maintenance.on && ['siteadmin','dashboard','adminai','realestate','reai','exec','portal'].indexOf(pid) < 0) st = 'maint';
      return st;
    },
    isHidden: function(pid){ return K.pageState(pid) === 'off'; },

    /* ---- profile photos: customers (users) and employees (staff) ---- */
    person: function(kind, id){ var d = load(); return kind === 'staff' ? d.staff[id] : d.users[id]; },
    photo: function(kind, id){ var o = K.person(kind, id); return o && o.photo || ''; },
    setPhoto: function(kind, id, url){ var o = K.person(kind, id); if (!o) return; if (kind === 'staff' && !K.canPhoto()) return; if (url) o.photo = url; else delete o.photo; log((url ? 'تحديث' : 'إزالة') + ' صورة ' + o.name); save(); },
    /* a round avatar: the photo when there is one, otherwise the first letter */
    avatar: function(kind, id, cls){ var o = K.person(kind, id) || {}, ph = o.photo; return ph ? '<img class="kp-av ' + (cls || '') + '" src="' + ph + '" alt="">' : '<span class="kp-av ' + (cls || '') + '">' + esc((o.name || '?').trim().charAt(0)) + '</span>'; },
    /* opens the picker, crops the picture to a centred square, shrinks it and saves it */
    /* an employee's picture is changed only by the system administrator, or by a department the administrator has authorised (admin.photos) */
    canPhoto: function(){ var u = K.staffUser(); return !!u && K.can('admin.photos', u); },
    pickPhoto: function(kind, id, done){
      if (kind === 'staff' && !K.canPhoto()){ if (done) done('تغيير صور الموظفين لمسؤول النظام أو للإدارة المخوّلة بذلك.'); return; }
      var f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.style.display = 'none'; document.body.appendChild(f);
      f.onchange = function(){ var file = f.files && f.files[0]; f.remove(); if (!file) return;
        if (!/^image\//.test(file.type)){ if (done) done('الملف ليس صورة.'); return; }
        var r = new FileReader(); r.onload = function(){ var im = new Image(); im.onload = function(){
          var side = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = 320; c.getContext('2d').drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, 320, 320);
          K.setPhoto(kind, id, c.toDataURL('image/jpeg', .82)); if (done) done(null); };
          im.onerror = function(){ if (done) done('تعذّرت قراءة الصورة.'); }; im.src = r.result; };
        r.readAsDataURL(file); };
      f.click(); },

    /* ---- staff, roles, permissions ---- */
    DEPTS: ['التسويق والعلاقات العامة','شؤون النقل','الإدارة الهندسية','الورشة المركزية','الموارد البشرية','الشؤون المالية','تقنية المعلومات','المرافق والصيانة','المكتب الاستراتيجي وتطوير الأعمال'],
    PERMS: [
      ['البوابة الداخلية', [['portal.leave','طلب الإجازات'],['portal.supplies','طلب المستلزمات'],['portal.invoice','صرف الفواتير'],['portal.payslip','كشف الراتب'],['portal.benefits','المزايا والعروض'],['portal.directory','دليل الموظفين'],['portal.news','أخبار الشركة'],['portal.policies','سياسات الموارد البشرية'],['portal.occasions','واجب الزملاء (المناسبات)']]],
      ['الاعتمادات', [['approve.leave','اعتماد الإجازات'],['approve.supplies','اعتماد المستلزمات'],['approve.invoice','اعتماد صرف الفواتير'],['approve.forms','اعتماد نماذج موظفي الإدارة (المسؤول المباشر)'],['approve.hr','اعتماد الشؤون الإدارية والموارد البشرية'],['approve.fin','اعتماد الشؤون المالية والمراجعة'],['approve.exec','اعتماد الإدارة التنفيذية']]],
      ['المزايا والمناسبات', [['benefits.manage','إنشاء العروض وتخصيصها'],['benefits.claims','اعتماد طلبات الاستفادة'],['occasions.post','نشر مناسبة مباشرة'],['occasions.moderate','مراجعة المناسبات المقترحة'],['portal.admin','التعاميم والقرارات والتقويم ومركز المعلومات'],['it.support','الرد على بلاغات الدعم الفني']]],
      ['محتوى الموقع', [['site.pages','إظهار الصفحات وإخفاؤها وترتيبها'],['site.texts','تحرير نصوص الصفحات'],['site.elements','إخفاء عناصر الصفحات وحقولها'],['site.home','أقسام الصفحة الرئيسية والتنبيهات'],['site.news','الأخبار والمركز الإعلامي'],['site.tenders','المناقصات'],['site.jobs','الوظائف وطلبات التوظيف'],['site.sched','مواعيد الخطوط']]],
      ['العمليات', [['ops.bookings','الحجوزات والطلبات'],['ops.wallets','محافظ العملاء'],['ops.winch','طلبات الونش والورشة'],['ops.pdi','طلبات فحص PDI']]],
      ['إدارة النظام', [['admin.staff','حسابات الموظفين'],['admin.roles','الأدوار والصلاحيات'],['admin.log','سجل النشاط'],['admin.backup','النسخ والاستعادة'],['admin.sections','تسليم الأقسام والإشراف عليها'],['admin.support','الرد على طلبات الدعم'],['admin.photos','تغيير صور الموظفين']]]
    ],
    staffUser: function(){ var d = load(); return d.staffSession && d.staff[d.staffSession] || null; },
    role: function(rid){ return load().roles.filter(function(r){ return r.id === rid; })[0] || {id:rid, name:rid, perms:[]}; },
    permsOf: function(u){
      u = u || K.staffUser(); if (!u) return [];
      var all = []; K.PERMS.forEach(function(g){ g[1].forEach(function(p){ all.push(p[0]); }); });
      var base = K.role(u.role).perms, set = base.indexOf('*') > -1 ? all.slice() : base.slice();
      (u.grant || []).forEach(function(p){ if (set.indexOf(p) < 0) set.push(p); });
      K.sectionsOf(u).forEach(function(sc){ sc.perms.forEach(function(p){ if (set.indexOf(p) < 0) set.push(p); }); });
      return set.filter(function(p){ return (u.deny || []).indexOf(p) < 0; });
    },
    /* sections this person runs (received owner, or a member of the owner's team) */
    sectionsOf: function(u){ u = u || K.staffUser(); if (!u) return []; return (load().sections || []).filter(function(sc){ return sc.status === 'مُستلم' && (sc.owner === u.id || (sc.team || []).indexOf(u.id) > -1); }); },
    /* pages this person may edit: everything with the role permission, otherwise the pages of their sections */
    pagesFor: function(u){ u = u || K.staffUser(); if (!u) return []; var base = K.role(u.role).perms; if (base.indexOf('*') > -1 || base.indexOf('site.texts') > -1 || (u.grant || []).indexOf('site.texts') > -1) return null; var out = []; K.sectionsOf(u).forEach(function(sc){ sc.pages.forEach(function(p){ if (out.indexOf(p) < 0) out.push(p); }); }); return out; },
    can: function(perm, u){ return K.permsOf(u).indexOf(perm) > -1; },
    /* the employee may sign in with the employee number, the official e-mail, the mobile or the civil number */
    findStaff: function(q){
      q = latin(q || '').trim(); if (!q) return null; var d = load(), low = q.toLowerCase(), digits = q.replace(/\D/g, '');
      for (var k in d.staff){ var u = d.staff[k];
        if (k.toUpperCase() === q.toUpperCase() || (u.email && u.email.toLowerCase() === low) || (digits.length >= 8 && ((u.phone && u.phone === digits) || (u.civil && u.civil === digits)))) return u;
        if (/^\d{3,6}$/.test(q) && k.toUpperCase() === 'KPTC-' + q) return u; }   // the number without the prefix
      return null; },
    staffLogin: function(who, pass){
      var d = load(), now = Date.now(), u = K.findStaff(who), sid = u ? u.id : (latin(who || '').trim().toUpperCase() || '-'), f = d.staffFails[sid] || (d.staffFails[sid] = {n:0, until:0});
      if (f.until > now) return {error:'الحساب مقفل مؤقتاً بعد محاولات خاطئة. حاول بعد ' + Math.ceil((f.until - now) / 1000) + ' ثانية.', locked:true};
      if (!u || u.pass !== pass){ f.n++; if (f.n >= 5){ f.until = now + 30000; f.n = 0; log('قفل مؤقت لحساب ' + sid); } save(); return {error:'بيانات الدخول غير صحيحة. استعمل الرقم الوظيفي أو البريد الرسمي أو رقم الجوال.' + (u && f.n >= 3 ? ' بقيت ' + (5 - f.n) + ' محاولة قبل القفل المؤقت.' : '')}; }
      if (u.status !== 'active') return {error:'هذا الحساب موقوف. راجع الموارد البشرية.'};
      f.n = 0; u.prev = u.last || null; u.last = new Date().toISOString(); d.staffSession = u.id; log('دخول موظف: ' + u.name); save(); return {user:u};
    },
    staffLogout: function(){ load().staffSession = null; save(); },
    /* ---- benefits ---- */
    benefitFor: function(b, u){ if (!b.on || !u) return false; var t = today(); if ((b.from && t < b.from) || (b.until && t > b.until)) return false; var a = b.aud || {mode:'all'}; return a.mode === 'all' || (a.mode === 'depts' && (a.depts || []).indexOf(u.dept) > -1) || (a.mode === 'staff' && (a.staff || []).indexOf(u.id) > -1); },
    benefitsFor: function(u){ u = u || K.staffUser(); return load().benefits.filter(function(b){ return K.benefitFor(b, u); }); },
    claim: function(bid, note){
      var d = load(), u = K.staffUser(), b = d.benefits.filter(function(x){ return x.id === bid; })[0]; if (!u || !b) return {error:'سجّل الدخول أولاً.'};
      if (d.claims.some(function(c){ return c.bid === bid && c.staff === u.id && c.status !== 'مرفوض'; })) return {error:'سبق أن طلبت هذا العرض.'};
      if (b.limit && d.claims.filter(function(c){ return c.bid === bid && c.status !== 'مرفوض'; }).length >= b.limit) return {error:'اكتمل العدد المتاح لهذا العرض.'};
      var c = {id:id('CL'), bid:bid, staff:u.id, d:today(), status:b.approve ? 'بانتظار الاعتماد' : 'مقبول', code:b.approve ? '' : 'KP-' + Math.random().toString(36).slice(2, 8).toUpperCase(), msgs:note ? [{from:u.id, text:note, d:new Date().toISOString()}] : []};
      d.claims.unshift(c); log('طلب استفادة من عرض: ' + b.title + ' — ' + u.name); save(); return {claim:c};
    },
    log: log
  };
})();
