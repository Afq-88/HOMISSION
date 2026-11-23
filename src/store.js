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
  /* the organisation chart and the board, as one editable record (transcribed from the company's published chart; editable in the studio) */
  function seedOrg(){
    var P = {b1:'742b03c3-463f-48a1-9b53-1563fe755626', ceo:'d9405575-38cc-41e4-9320-a3f0a16784f1', sup:'02ba90d0-fc1b-47fd-96ba-34205b2b6393', str:'75f24b90-dcf2-43c2-8c28-09bc47b1d38f', trn:'54b8bb27-ba8c-4342-9b8d-4304aad84952', prj:'43db1d7b-3772-4508-b757-7cf858a7563e', hr:'9863df3b-1be0-4435-92ea-887a0beb2039'};
    function U(id, p, n, lv, o){ o = o || {}; var u = {id:id, p:p, n:n, lv:lv}; for (var k in o) u[k] = o[k]; return u; }
    return {
      board: [
        {id:'b1', n:'السيد/ عيسى الوقيان', t:'رئيس مجلس الإدارة', uid:P.b1},
        {id:'b2', n:'السيد/ خالد العصفور', t:'نائب رئيس مجلس الإدارة', uid:'d43b3c8e-d377-4c1a-9dec-2692904c35d0'},
        {id:'b3', n:'السيد/ نزار العواد', t:'عضو مجلس الإدارة', uid:'70228d24-9388-45d9-b3cf-3e2ba58fd339'},
        {id:'b4', n:'السيدة/ لولوه الذربان', t:'عضو مجلس الإدارة', uid:'d8df04e6-b579-4ffe-be53-401d9244bac9'},
        {id:'b5', n:'السيد/ جاسم الهاجري', t:'عضو مجلس الإدارة', uid:'6930a97a-65bf-4915-8f7d-74a1206e61ff'}
      ],
      units: [
        U('u0','','رئيس مجلس الإدارة','board',{ref:'b1'}),
        U('u1','u0','مكتب أمانة السر ومتابعة الحوكمة','cmt'), U('u2','u0','لجنة الاستثمار','cmt'), U('u3','u0','لجنة التدقيق والمخاطر','cmt'), U('u4','u3','مكتب التدقيق الداخلي والمخاطر','cmt'),
        U('u5','u0','الرئيس التنفيذي','ceo',{who:'المهندس/ منصور السعد', uid:P.ceo, t:'الرئيس التنفيذي', ex:1}),
        U('u6','u5','إدارة الأصول العقارية والمنشآت','unit',{dk:'المرافق والصيانة'}), U('u7','u5','إدارة الشئون القانونية','unit'), U('u8','u5','إدارة التسويق والعلاقات العامة وخدمة العملاء','unit',{dk:'التسويق والعلاقات العامة'}),
        U('u9','u5','مكتب الدراسات الاستراتيجية وتطوير الأعمال','unit',{dk:'المكتب الاستراتيجي وتطوير الأعمال', who:'المهندس/ عبدالله ناصر', uid:P.str, t:'رئيس المكتب الاستراتيجي وتطوير الأعمال', ex:1}), U('u10','u5','الإدارة البحرية','unit'),
        U('u11','u5','نائب الرئيس التنفيذي لشئون الخدمات المساندة','dep',{who:'السيد/ محمد المزيدي', uid:P.sup, t:'نائب الرئيس التنفيذي لشئون الخدمات المساندة', ex:1}),
        U('u12','u11','مدير تنفيذي للشئون المالية','exe'), U('u13','u12','إدارة المخازن الفنية','unit'), U('u14','u12','إدارة الشئون المالية','unit',{dk:'الشؤون المالية'}), U('u15','u12','إدارة المشتريات','unit'),
        U('u16','u11','مدير تنفيذي لشئون الموارد البشرية والإدارية','exe',{who:'السيد/ حمد البدر', uid:P.hr, t:'مدير تنفيذي لشئون الموارد البشرية والإدارية', ex:1}), U('u17','u16','إدارة الموارد البشرية والتدريب','unit',{dk:'الموارد البشرية'}), U('u18','u16','إدارة الشئون الإدارية','unit'),
        U('u19','u11','مكتب المراجعة المالية','stf'), U('u20','u11','مكتب المناقصات','stf'), U('u21','u11','إدارة تقنية المعلومات','stf',{dk:'تقنية المعلومات'}),
        U('u22','u5','نائب الرئيس التنفيذي لشئون العمليات والمشاريع','dep'),
        U('u23','u22','مدير تنفيذي لشئون النقل','exe',{dk:'شؤون النقل', who:'السيد/ محمد الفهيد', uid:P.trn, t:'مدير تنفيذي لشئون النقل', ex:1}), U('u24','u23','إدارة النقل العام','unit'), U('u25','u23','إدارة النقل الخاص','unit'),
        U('u26','u22','مدير تنفيذي لشئون إدارة المشاريع والخدمات اللوجستية','exe',{who:'المهندس/ عايد السعيدي', uid:P.prj, t:'مدير تنفيذي لشئون المشاريع والخدمات اللوجستية', ex:1}), U('u27','u26','إدارة العمليات الهندسية والدعم الفني','unit',{dk:'الإدارة الهندسية'}), U('u28','u26','إدارة المشاريع والخدمات اللوجستية','unit')
      ]
    };
  }
  function personOf(u, d){
    if (u.ref){ var b = d.org.board.concat((d.orgDraft || {board:[]}).board).filter(function(x){ return x.id === u.ref; })[0]; if (b) return {n:b.n, t:b.t}; }
    if (u.sid && d.staff[u.sid]) return {n:d.staff[u.sid].name, t:u.t || ''};
    return u.who ? {n:u.who, t:u.t || ''} : null; }
  /* making a snapshot live: employees follow their unit when its name changes, and move up when a unit is removed */
  function orgApply(d, snap, meta){
    var key = function(u){ return u.dk || u.n; }, old = {}, nu = {}; d.org.units.forEach(function(u){ old[u.id] = u; }); snap.units.forEach(function(u){ nu[u.id] = u; });
    var map = {}; Object.keys(old).forEach(function(i){
      var o = old[i], n = nu[i]; if (n){ if (key(n) !== key(o)) map[key(o)] = key(n); return; }
      var p = old[o.p]; while (p && !nu[p.id]) p = old[p.o || p.p]; map[key(o)] = p && nu[p.id] && p.lv !== 'board' && p.lv !== 'ceo' ? key(nu[p.id]) : ''; });
    Object.keys(d.staff || {}).forEach(function(i){ var k = d.staff[i].dept; if (k in map) d.staff[i].dept = map[k]; });
    Object.keys(map).forEach(function(k){ if (d.deptInfo && d.deptInfo[k]){ if (map[k]) d.deptInfo[map[k]] = d.deptInfo[k]; delete d.deptInfo[k]; } });
    (d.sections || []).forEach(function(s){ if (s.dept in map) s.dept = map[s.dept]; });
    d.org = JSON.parse(JSON.stringify(snap)); (d.orgHist = d.orgHist || []).unshift({id:id('H'), at:meta.at, eff:meta.eff, note:meta.note, by:meta.by, snap:JSON.parse(JSON.stringify(snap))}); if (d.orgHist.length > 40) d.orgHist.length = 40; }
  /* a change scheduled for a date takes effect the first time the site is opened on or after it */
  function orgQueueRun(d){
    var q = d.orgQueue; if (!q || !q.length) return; var t = today(), due = q.filter(function(x){ return x.eff <= t; }); if (!due.length) return;
    due.sort(function(a, b){ return a.eff < b.eff ? -1 : 1; }).forEach(function(x){ orgApply(d, x.snap, {at:t, eff:x.eff, note:x.note + ' (بجدولة مسبقة)', by:x.by}); });
    d.orgQueue = q.filter(function(x){ return x.eff > t; }); setTimeout(function(){ save(); }, 0); }
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
        wallet: {worker: ''},                      // address of the free wallet-signing service (worker/wallet-worker.js), for customer passes
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
        {id:'asst', name:'مساعد مدير إدارة', perms:['portal.leave','portal.supplies','portal.invoice','portal.payslip','portal.benefits','portal.directory','portal.news','portal.policies','portal.occasions','approve.leave','approve.supplies','occasions.post']},
        {id:'admin', name:'مدير النظام', perms:['*']},
        {id:'owner', name:'مسؤول النظام', perms:['*']}
      ],
      staff: {
        'KPTC-4821': {id:'KPTC-4821', email:'a.alqattan@kptc.com.kw', name:'أحمد القطان', title:'مدير التسويق والعلاقات العامة', dept:'التسويق والعلاقات العامة', role:'emp', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-900)},
        'KPTC-2891': {id:'KPTC-2891', email:'dept.manager@kptc.com.kw', name:'مدير الإدارة', title:'مشرف التسويق', dept:'التسويق والعلاقات العامة', role:'sup', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-1400)},
        'KPTC-ENG':  {id:'KPTC-ENG', email:'engineer@kptc.com.kw', name:'مهندس الصيانة', title:'مهندس أول', dept:'الإدارة الهندسية', role:'eng', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-2100)},
        'KPTC-3310': {id:'KPTC-3310', email:'hr.staff@kptc.com.kw', name:'موظف الموارد البشرية', title:'أخصائي شؤون الموظفين', dept:'الموارد البشرية', role:'hr', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-700)},
        'KPTC-5120': {id:'KPTC-5120', email:'web.editor@kptc.com.kw', name:'محرر الموقع', title:'أخصائي محتوى رقمي', dept:'التسويق والعلاقات العامة', role:'content', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-300)},
        'KPTC-0001': {id:'KPTC-0001', email:'owner@kptc.com.kw', name:'مسؤول النظام', title:'مسؤول أنظمة المعلومات', dept:'تقنية المعلومات', role:'owner', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-2900)},
        'KPTC-1001': {id:'KPTC-1001', email:'sysadmin@kptc.com.kw', name:'مدير النظام', title:'مدير تقنية المعلومات', dept:'تقنية المعلومات', role:'admin', pass:'12345678', status:'active', grant:[], deny:[], phone:'', joined:today(-2600)}
      },
      staffSession: null, staffAt: 0, staffFails: {}, userFails: {},
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
      org: seedOrg(),      // {units:[{id,p,n,lv,who,uid,ph,t,dk,sid,ref,ex,d}], board:[{id,n,t,uid,ph}]} — drives the org chart, the board page and the department lists
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
    try { if (!mem.mig4){ mem.mig4 = 1;   /* two top roles: the system owner (everything) and the system manager (the site, not the accounts) */
        var RESTRICT = ['admin.staff','admin.roles','admin.accounts','admin.backup','admin.photos'], ALL = []; K.PERMS.forEach(function(g){ g[1].forEach(function(p){ ALL.push(p[0]); }); });
        var R = mem.roles = mem.roles || []; if (!R.some(function(r){ return r.id === 'owner'; })) R.push({id:'owner', name:'مسؤول النظام', perms:['*']});
        R.forEach(function(r){ if (r.id === 'admin'){ r.perms = ALL.filter(function(p){ return RESTRICT.indexOf(p) < 0; }); } });
        if (mem.staff && !mem.staff['KPTC-0001']) mem.staff['KPTC-0001'] = seed().staff['KPTC-0001']; } } catch(x){}
    try { if (!mem.mig6){ mem.mig6 = 1; var RR = mem.roles = mem.roles || []; if (!RR.some(function(r){ return r.id === 'asst'; })) RR.splice(Math.max(0, RR.length - 2), 0, seed().roles.filter(function(r){ return r.id === 'asst'; })[0]); } } catch(x){}
    try { if (!mem.mig7){ mem.mig7 = 1;   /* the old home-page switches become ordinary section hides, so one panel controls every page */
        var HM = {ticker:['.kx-ticker','الشريط المتحرك'],tasks:['.kx-tasks','المهام السريعة'],facts:['.facts','خط الأرقام'],services:['#services','خريطة الخدمات'],calc:['#calc','حاسبة التوفير'],fares:['#fares','جدول الاشتراكات'],steps:['.kx-steps-sec','ثلاث خطوات'],umrah:['.kx-umrah','شريط العمرة'],sos:['.sos','شريط الونش'],biz:['#business','قسم الأعمال'],app:['.block.app','قسم التطبيق'],close:['.kx-close','الدعوة الختامية'],contact:['#contact','تواصل معنا']};
        var SS = mem.site = mem.site || {}, HH = SS.home || {}; SS.hidden = SS.hidden || {}; SS.hiddenLabels = SS.hiddenLabels || {};
        (mem.roles || []).forEach(function(r){ if (r.id === 'admin' && r.perms.indexOf('*') < 0 && r.perms.indexOf('org.manage') < 0) r.perms.push('org.manage'); });
        Object.keys(HM).forEach(function(k){ if (HH[k] === false){ var L = SS.hidden.home = SS.hidden.home || []; if (L.indexOf(HM[k][0]) < 0){ L.push(HM[k][0]); (SS.hiddenLabels.home = SS.hiddenLabels.home || {})[HM[k][0]] = {l:HM[k][1], i:0}; } HH[k] = true; } });
      } } catch(x){}
    try { if (!mem.mig5){ mem.mig5 = 1; (mem.roles || []).forEach(function(r){ if ((r.id === 'admin' || r.id === 'content') && r.perms.indexOf('*') < 0 && r.perms.indexOf('site.marketing') < 0) r.perms.push('site.marketing'); }); } } catch(x){}
    try { if (!mem.mig3){ mem.mig3 = 1; var add = {sup:['approve.forms'], hr:['approve.hr'], fin:['approve.fin']}; (mem.roles || []).forEach(function(r){ (add[r.id] || []).forEach(function(p){ if (r.perms.indexOf(p) < 0) r.perms.push(p); }); }); if (mem.library && mem.library.length <= 4) mem.library = s.library; } } catch(x){}
    try { if (!mem.mig8){ mem.mig8 = 1; /* no plaintext passwords stay in storage; factory passwords must be changed at first sign-in */
        Object.keys(mem.staff || {}).forEach(function(k){ var o = mem.staff[k]; if (typeof o.pass === 'string'){ var def = DEFAULT_PASSES.indexOf(o.pass) > -1; K.setPass(o, o.pass); if (def) o.mustChange = true; } });
        Object.keys(mem.users || {}).forEach(function(k){ var o = mem.users[k]; if (typeof o.pass === 'string') K.setPass(o, o.pass); }); } } catch(x){}
    try { var EM = {'KPTC-4821':'a.alqattan','KPTC-2891':'dept.manager','KPTC-ENG':'engineer','KPTC-3310':'hr.staff','KPTC-5120':'web.editor','KPTC-1001':'sysadmin'}; for (var ek in EM) if (mem.staff && mem.staff[ek] && !mem.staff[ek].email) mem.staff[ek].email = EM[ek] + '@kptc.com.kw'; } catch(x){}
    try { for (var sk in mem.staff) if (/\u0623\u0648\u0631\u0627\u062f/.test(mem.staff[sk].name)) mem.staff[sk].name = 'مدير الإدارة'; } catch(x){}   // a name removed at the owner's request
    return mem;
  }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch(x){} subs.forEach(function(f){ try { f(mem); } catch(x){} }); }
  window.addEventListener('storage', function(e){ if (e.key === KEY){ mem = null; load(); subs.forEach(function(f){ try { f(mem); } catch(x){} }); } });


  /* ---- security primitives (local-mode hardening; the real enforcement is firestore.rules) ---- */
  var SHA_K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function sha256(msg){
    var m = new TextEncoder().encode(String(msg)), l = m.length, n = ((l + 9 + 63) >> 6) << 6, w8 = new Uint8Array(n); w8.set(m); w8[l] = 0x80;
    var dv = new DataView(w8.buffer); dv.setUint32(n - 8, Math.floor(l / 0x20000000)); dv.setUint32(n - 4, (l << 3) >>> 0);
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], W = new Array(64), i, j;
    function R(x, k){ return (x >>> k) | (x << (32 - k)); }
    for (var o = 0; o < n; o += 64){
      for (i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (i = 16; i < 64; i++){ var s0 = R(W[i-15], 7) ^ R(W[i-15], 18) ^ (W[i-15] >>> 3), s1 = R(W[i-2], 17) ^ R(W[i-2], 19) ^ (W[i-2] >>> 10); W[i] = (W[i-16] + s0 + W[i-7] + s1) | 0; }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++){
        var S1 = R(e, 6) ^ R(e, 11) ^ R(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + SHA_K[j] + W[j]) | 0, S0 = R(a, 2) ^ R(a, 13) ^ R(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0; }
    return H.map(function(x){ return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  function rnd(n){ var a = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function(x){ return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function same(a, b){ a = String(a); b = String(b); var r = a.length ^ b.length; for (var i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return r === 0; }
  var HASH_ROUNDS = 8000, DEFAULT_PASSES = ['12345678', '123456'];
  function hashPass(p, salt){ var h = sha256(salt + '|' + p); for (var i = 0; i < HASH_ROUNDS; i++) h = sha256(h + salt + p); return 'v1$' + h; }
  /* escalating lock: 30 s, 1 min, 2 min ... up to 15 min, after every 5 wrong tries (the same for existing and unknown names, so nothing leaks) */
  function lockOf(map, key){ return map[key] || (map[key] = {n:0, until:0, r:0}); }
  function lockLeft(f){ return Math.max(0, Math.ceil((f.until - Date.now()) / 1000)); }
  function lockFail(f){ f.n++; if (f.n >= 5){ f.n = 0; f.r = Math.min((f.r || 0) + 1, 5); f.until = Date.now() + Math.min(30000 * Math.pow(2, f.r - 1), 900000); return true; } return false; }
  function lockMsg(f){ var s = lockLeft(f); return 'الحساب مقفل مؤقتاً بعد محاولات خاطئة. حاول بعد ' + (s > 90 ? Math.ceil(s / 60) + ' دقيقة' : s + ' ثانية') + '.'; }

  function id(p){ return p + '-' + String(Date.now()).slice(-6) + Math.floor(Math.random()*90+10); }
  function money(n){ return (Math.round(n*1000)/1000).toFixed(3) + ' د.ك'; }
  function fdate(s){ if (!s) return '—'; var p = String(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function log(msg, sec){ var d = load(), u = d.staffSession && d.staff && d.staff[d.staffSession], e = {d:new Date().toISOString(), msg:msg, sec:sec || '', by:u ? u.name : ''}; e.prev = d.log.length && d.log[0].h ? d.log[0].h : '0'; e.h = sha256(e.prev + '|' + e.d + '|' + e.msg + '|' + e.sec + '|' + e.by); d.log.unshift(e); d.log = d.log.slice(0, 200); }

  var K = window.KPTC = {
    db: load, save: save, seed: seed, id: id, money: money, date: fdate, esc: esc, latin: latin, today: today,
    onChange: function(f){ subs.push(f); },
    reset: function(){ mem = seed(); save(); },


    /* ---- credentials ---- */
    DEMO: (function(){ try { return window.KPTC_DEMO === true || location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); } catch(x){ return false; } })(),
    sha256: sha256,
    setPass: function(o, p){ o.salt = rnd(16); o.ph = hashPass(p, o.salt); delete o.pass; delete o.mustChange; o.pwAt = new Date().toISOString(); return o; },
    checkPass: function(o, p){
      if (!o || typeof p !== 'string') return false;
      if (o.ph) return same(hashPass(p, o.salt || ''), o.ph);
      if (typeof o.pass === 'string' && same(o.pass, p)){ var def = DEFAULT_PASSES.indexOf(p) > -1; K.setPass(o, p); if (def) o.mustChange = true; return true; }   // an old plaintext record is upgraded on first use
      return false; },
    isDefaultPass: function(o){ return !!o && (!!o.mustChange || DEFAULT_PASSES.indexOf(o.pass) > -1); },
    /* password rules: staff 10+ characters mixing letters and digits (or symbols); customers 8+; never a known factory or trivial password */
    passPolicy: function(p, staff){
      p = String(p || ''); var min = staff ? 10 : 8;
      if (p.length < min) return 'كلمة المرور قصيرة: ' + min + ' أحرف على الأقل.';
      if (DEFAULT_PASSES.indexOf(p) > -1 || /^(.)\1+$/.test(p) || /^(0123456789|1234567890|123456789|password|qwerty)/i.test(p)) return 'كلمة المرور سهلة التخمين. اختر غيرها.';
      if (staff && !(/[A-Za-z\u0600-\u06FF]/.test(p) && /[0-9]/.test(p))) return 'استعمل حروفاً وأرقاماً معاً (ويُفضّل رمز).';
      return ''; },
    verifyLog: function(){ var L = load().log, bad = -1; for (var i = 0; i < L.length; i++){ var e = L[i]; if (!e.h) continue; if (e.h !== sha256(e.prev + '|' + e.d + '|' + e.msg + '|' + e.sec + '|' + e.by) || (L[i + 1] && L[i + 1].h && e.prev !== L[i + 1].h)){ bad = i; break; } } return {ok:bad < 0, bad:bad, n:L.length}; },

    /* accounts (demo: stored in this browser; Firebase Auth replaces this) */
    user: function(){ var d = load(), u = d.session && d.users[d.session] || null; return u && !u.suspended ? u : null; },
    register: function(o){
      var d = load(), phone = latin(o.phone||'').replace(/\D/g,'');
      if (!o.name || phone.length < 8) return {error:'أكمل الاسم ورقم الهاتف (8 أرقام).'}; var pe = K.passPolicy(o.pass || '', false); if (pe) return {error:pe};
      for (var k in d.users) if (d.users[k].phone === phone) return {error:'هذا الرقم مسجّل من قبل. سجّل الدخول.'};
      var u = {id:id('u'), name:o.name.trim(), phone:phone, email:(o.email||'').trim(), civil:'', joined:today()}; K.setPass(u, o.pass);
      d.users[u.id] = u; d.wallets[u.id] = {balance:0, frozen:false, tx:[]}; d.session = u.id; log('حساب جديد: ' + u.name); save(); return {user:u};
    },
    login: function(phone, pass){
      var d = load(); phone = latin(phone||'').replace(/\D/g,''); var f = lockOf(d.userFails = d.userFails || {}, phone || '-');
      if (f.until > Date.now()) return {error:lockMsg(f), locked:true};
      for (var k in d.users) if (d.users[k].phone === phone && K.checkPass(d.users[k], pass)){ if (d.users[k].suspended) return {error:'هذا الحساب موقوف. تواصل مع خدمة العملاء 1880001.'}; f.n = 0; f.r = 0; d.session = k; save(); return {user:d.users[k]}; }
      lockFail(f); save(); return {error:'رقم الهاتف أو كلمة المرور غير صحيحة.'};
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
      if (st === 'on' && s.maintenance.on && ['siteadmin','adminai','realestate','reai','exec','portal'].indexOf(pid) < 0) st = 'maint';
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
    /* the system owner is the one account class nobody else may change */
    isOwner: function(u){ u = u || K.staffUser(); return !!u && u.role === 'owner'; },
    /* may the signed-in staff member act on this staff account? (owners are untouchable by anyone but owners) */
    canTouch: function(target){ var me = K.staffUser(); if (!me || !target) return false; if (target.role === 'owner' && me.role !== 'owner') return false; return true; },
    /* picture of a news item: an uploaded one (kept as a small JPEG in the data), otherwise one of the library's */
    newsImg: function(n){ return (n && n.imgData) || '../assets/' + ((n && n.img) || 'kbus-fleet.jpg'); },
    /* shrink a picture the user picked and hand back a JPEG data URL: done(err, dataUrl, w, h) */
    compressImage: function(file, max, q, done){
      if (!file || !/^image\//.test(file.type)) return done('الملف ليس صورة.');
      var r = new FileReader(); r.onerror = function(){ done('تعذّرت قراءة الملف.'); };
      r.onload = function(){ var im = new Image(); im.onerror = function(){ done('تعذّرت قراءة الصورة.'); }; im.onload = function(){
        var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); done(null, c.toDataURL('image/jpeg', q), c.width, c.height); }; im.src = r.result; };
      r.readAsDataURL(file); },
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
    /* ---- organisation: one record behind the chart, the board page, department lists and the staff directory ---- */
    /* the live chart is what visitors see. The studio edits a DRAFT of it, then publishes (now, or from a given date) with the decision noted. */
    orgEditing: false,
    org: function(){
      var d = load(); if (!d.org || !d.org.units) d.org = seedOrg(); orgQueueRun(d);
      var pv = false; try { pv = window.parent !== window && location.hash === '#kpprev' && sessionStorage.getItem('kptc.pvDraft') === '1'; } catch(x){}
      if (K.orgEditing){ if (!d.orgDraft) d.orgDraft = JSON.parse(JSON.stringify(d.org)); return d.orgDraft; }
      return pv && d.orgDraft ? d.orgDraft : d.org; },
    orgDirty: function(){ var d = load(); return !!d.orgDraft && JSON.stringify(d.orgDraft) !== JSON.stringify(d.org); },
    /* a plain list of what the draft changes compared with what is live */
    orgDiff: function(){
      var d = load(), L = d.org, D = d.orgDraft || d.org, out = [], lu = {}, du = {};
      L.units.forEach(function(u){ lu[u.id] = u; }); D.units.forEach(function(u){ du[u.id] = u; });
      var nm = function(i, m){ return i && m[i] ? m[i].n : 'أعلى مستوى'; }, per = function(u){ var p = personOf(u, d); return p ? p.n + (p.t ? ' (' + p.t + ')' : '') : 'بلا اسم'; };
      D.units.forEach(function(u){ var o = lu[u.id];
        if (!o){ out.push({k:'add', t:'إضافة «' + u.n + '» تحت «' + nm(u.p, du) + '»'}); return; }
        if (o.n !== u.n) out.push({k:'ren', t:'تغيير الاسم: «' + o.n + '» ← «' + u.n + '»'});
        if ((o.p || '') !== (u.p || '')) out.push({k:'move', t:'نقل «' + u.n + '» من «' + nm(o.p, lu) + '» إلى «' + nm(u.p, du) + '»'});
        if (o.lv !== u.lv) out.push({k:'ren', t:'تغيير نوع «' + u.n + '»'});
        if (per(o, d) !== per(u, d) || !!o.vacant !== !!u.vacant) out.push({k:'who', t:'مسؤول «' + u.n + '»: ' + (u.vacant ? 'المنصب شاغر' : per(u))}); });
      L.units.forEach(function(u){ if (!du[u.id]) out.push({k:'del', t:'حذف «' + u.n + '»'}); });
      var lb = {}, db = {}; L.board.forEach(function(b){ lb[b.id] = b; }); D.board.forEach(function(b){ db[b.id] = b; });
      D.board.forEach(function(b){ var o = lb[b.id]; if (!o) out.push({k:'add', t:'عضو مجلس جديد: ' + b.n}); else if (o.n !== b.n || o.t !== b.t) out.push({k:'who', t:'عضو المجلس: ' + o.n + ' ← ' + b.n + ' (' + b.t + ')'}); });
      L.board.forEach(function(b){ if (!db[b.id]) out.push({k:'del', t:'خروج عضو من المجلس: ' + b.n}); });
      if (!out.length && JSON.stringify(D) !== JSON.stringify(L)) out.push({k:'ren', t:'تعديلات في الترتيب أو التفاصيل'});
      return out; },
    orgDiscard: function(){ var d = load(); delete d.orgDraft; log('تجاهل مسودة الهيكل'); save(); },
    orgPublish: function(note, eff){
      var d = load(); if (!d.orgDraft) return false; var u = K.staffUser(), snap = JSON.parse(JSON.stringify(d.orgDraft));
      if (eff && eff > today()){ (d.orgQueue = d.orgQueue || []).push({id:id('Q'), eff:eff, note:note || '', by:u ? u.name : '', snap:snap}); delete d.orgDraft; log('جدولة تغيير في الهيكل لتاريخ ' + eff + ': ' + (note || '')); save(); return 'queued'; }
      orgApply(d, snap, {at:today(), eff:eff || today(), note:note || '', by:u ? u.name : ''}); delete d.orgDraft; log('نشر تغيير في الهيكل: ' + (note || '')); save(); return 'live'; },
    orgHistory: function(){ return load().orgHist || []; },
    orgQueue: function(){ return load().orgQueue || []; },
    orgUnqueue: function(qid){ var d = load(); d.orgQueue = (d.orgQueue || []).filter(function(x){ return x.id !== qid; }); save(); },
    orgRestore: function(hid){ var d = load(), h = (d.orgHist || []).filter(function(x){ return x.id === hid; })[0]; if (!h) return false; d.orgDraft = JSON.parse(JSON.stringify(h.snap)); log('استعادة نسخة سابقة من الهيكل إلى المسودة'); save(); return true; },
    unit: function(id){ return K.org().units.filter(function(u){ return u.id === id; })[0] || null; },
    kids: function(id){ return K.org().units.filter(function(u){ return (u.p || '') === (id || ''); }); },
    unitKey: function(u){ return u.dk || u.n; },
    /* the person who holds a unit: a board member (ref), a staff account (sid) or a typed name */
    orgPerson: function(u){
      if (!u) return null;
      if (u.ref){ var b = K.org().board.filter(function(x){ return x.id === u.ref; })[0]; if (b) return {n:b.n, t:b.t, ph:b.ph || '', uid:b.uid || '', since:b.since || ''}; }
      if (u.sid){ var s = load().staff[u.sid]; if (s) return {n:s.name, t:u.t || s.title || '', ph:s.photo || '', uid:''}; }
      return u.who ? {n:u.who, t:u.t || '', ph:u.ph || '', uid:u.uid || '', since:u.since || ''} : null; },
    orgImg: function(p, base){ if (!p) return ''; if (p.ph) return p.ph; return p.uid ? (base == null ? '../assets/board/' : base) + p.uid + '.jpg' : ''; },
    /* every unit that can own employees; names already used by accounts stay valid so nobody is orphaned */
    depts: function(){
      var out = [], seen = {}; function add(n){ if (n && !seen[n]){ seen[n] = 1; out.push(n); } }
      K.org().units.forEach(function(u){ if (u.lv !== 'board' && u.lv !== 'ceo') add(K.unitKey(u)); });
      var d = load(); Object.keys(d.staff || {}).forEach(function(i){ add(d.staff[i].dept); }); return out; },
    unitStaff: function(u){ var k = K.unitKey(u), d = load(); return Object.keys(d.staff || {}).filter(function(i){ return d.staff[i].dept === k; }); },
    descendants: function(id){ var o = []; (function w(x){ K.kids(x).forEach(function(k){ o.push(k); w(k.id); }); })(id); return o; },
    orgAdd: function(p, n, lv){ var o = K.org(), u = {id:id('U'), p:p || '', n:n, lv:lv || 'unit'}; o.units.push(u); log('إضافة وحدة تنظيمية: ' + n); save(); return u; },
    orgSet: function(uid_, f){
      var u = K.unit(uid_); if (!u) return;
      Object.keys(f).forEach(function(k){ if (f[k] === '' || f[k] == null) delete u[k]; else u[k] = f[k]; });
      log('تعديل وحدة تنظيمية: ' + u.n); save(); },
    /* moving a unit under another one; refuses a move into its own branch */
    orgMove: function(uid_, np){ var u = K.unit(uid_); if (!u || uid_ === np) return false; if (np && K.descendants(uid_).some(function(x){ return x.id === np; })) return false; u.p = np || ''; log('نقل وحدة: ' + u.n); save(); return true; },
    orgOrder: function(uid_, dir){ var o = K.org().units, u = K.unit(uid_); if (!u) return; var sib = o.filter(function(x){ return (x.p || '') === (u.p || ''); }), i = sib.indexOf(u), j = i + dir; if (j < 0 || j >= sib.length) return; var a = o.indexOf(u), b = o.indexOf(sib[j]); o[a] = sib[j]; o[b] = u; save(); },
    /* removing a unit lifts its children one level and moves its employees to the unit above */
    orgDel: function(uid_){
      var o = K.org(), u = K.unit(uid_); if (!u || !u.p) return false; 
      o.units.forEach(function(x){ if (x.p === uid_) x.p = u.p; });
      o.units = o.units.filter(function(x){ return x.id !== uid_; }); log('حذف وحدة تنظيمية: ' + u.n); save(); return true; },
    /* job grades: pick the position, and the system role that normally goes with it is suggested */
    GRADES: [['gm','مدير عام','sup'],['dm','مدير إدارة','sup'],['adm','مساعد مدير إدارة','asst'],['head','رئيس قسم','sup'],['sv','مشرف','emp'],['eng','مهندس','eng'],['spec','أخصائي','emp'],['acc','محاسب','emp'],['tech','فني','emp'],['clerk','موظف','emp'],['driver','سائق','emp'],['other','أخرى (اكتبها)','emp']],
    PERMS: [
      ['البوابة الداخلية', [['portal.leave','طلب الإجازات'],['portal.supplies','طلب المستلزمات'],['portal.invoice','صرف الفواتير'],['portal.payslip','كشف الراتب'],['portal.benefits','المزايا والعروض'],['portal.directory','دليل الموظفين'],['portal.news','أخبار الشركة'],['portal.policies','سياسات الموارد البشرية'],['portal.occasions','واجب الزملاء (المناسبات)']]],
      ['الاعتمادات', [['approve.leave','اعتماد الإجازات'],['approve.supplies','اعتماد المستلزمات'],['approve.invoice','اعتماد صرف الفواتير'],['approve.forms','اعتماد نماذج موظفي الإدارة (المسؤول المباشر)'],['approve.hr','اعتماد الشؤون الإدارية والموارد البشرية'],['approve.fin','اعتماد الشؤون المالية والمراجعة'],['approve.exec','اعتماد الإدارة التنفيذية']]],
      ['المزايا والمناسبات', [['benefits.manage','إنشاء العروض وتخصيصها'],['benefits.claims','اعتماد طلبات الاستفادة'],['occasions.post','نشر مناسبة مباشرة'],['occasions.moderate','مراجعة المناسبات المقترحة'],['portal.admin','التعاميم والقرارات والتقويم ومركز المعلومات'],['it.support','الرد على بلاغات الدعم الفني']]],
      ['محتوى الموقع', [['site.pages','إظهار الصفحات وإخفاؤها وترتيبها'],['site.marketing','كاتب المحتوى والخبير التسويقي'],['org.manage','إدارة الهيكل التنظيمي ومجلس الإدارة'],['site.texts','تحرير نصوص الصفحات'],['site.elements','إخفاء عناصر الصفحات وحقولها'],['site.home','أقسام الصفحة الرئيسية والتنبيهات'],['site.news','الأخبار والمركز الإعلامي'],['site.tenders','المناقصات'],['site.jobs','الوظائف وطلبات التوظيف'],['site.sched','مواعيد الخطوط']]],
      ['العمليات', [['ops.bookings','الحجوزات والطلبات'],['ops.wallets','محافظ العملاء'],['ops.winch','طلبات الونش والورشة'],['ops.pdi','طلبات فحص PDI']]],
      ['إدارة النظام', [['admin.staff','حسابات الموظفين'],['admin.roles','الأدوار والصلاحيات'],['admin.log','سجل النشاط'],['admin.backup','النسخ والاستعادة'],['admin.sections','تسليم الأقسام والإشراف عليها'],['admin.support','الرد على طلبات الدعم'],['admin.photos','تغيير صور الموظفين'],['admin.accounts','الحسابات: البحث والتحكم بحسابات الموظفين والعملاء'],['studio.access','دخول مركز التحكم']]]
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
      var d = load(), u = K.findStaff(who), sid = u ? u.id : (latin(who || '').trim().toUpperCase() || '-'), f = lockOf(d.staffFails, sid);
      if (f.until > Date.now()) return {error:lockMsg(f), locked:true};
      if (!u || !K.checkPass(u, pass)){ if (lockFail(f)) log('قفل مؤقت لحساب ' + sid); else log('محاولة دخول فاشلة: ' + sid); save(); return {error:'بيانات الدخول غير صحيحة. استعمل الرقم الوظيفي أو البريد الرسمي أو رقم الجوال.'}; }
      if (u.status !== 'active') return {error:'هذا الحساب موقوف. راجع الموارد البشرية.'};
      f.n = 0; f.r = 0; u.prev = u.last || null; u.last = new Date().toISOString(); d.staffSession = u.id; d.staffAt = Date.now(); log('دخول موظف: ' + u.name); save(); return {user:u, mustChange:!!u.mustChange};
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
  /* the department list now follows the organisation chart (kept as a property so older code keeps working) */
  window.addEventListener('message', function(e){ if (e.data && e.data.kpRedraw){ subs.forEach(function(f){ try { f(mem); } catch(x){} }); } });
  Object.defineProperty(K, "DEPTS", {get: function(){ return K.depts(); }});
})();
