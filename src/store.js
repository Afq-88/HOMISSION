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
        assistant: true
      },
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
    return mem;
  }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch(x){} subs.forEach(function(f){ try { f(mem); } catch(x){} }); }
  window.addEventListener('storage', function(e){ if (e.key === KEY){ mem = null; load(); subs.forEach(function(f){ try { f(mem); } catch(x){} }); } });

  function id(p){ return p + '-' + String(Date.now()).slice(-6) + Math.floor(Math.random()*90+10); }
  function money(n){ return (Math.round(n*1000)/1000).toFixed(3) + ' د.ك'; }
  function fdate(s){ if (!s) return '—'; var p = String(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function log(msg){ var d = load(); d.log.unshift({d:new Date().toISOString(), msg:msg}); d.log = d.log.slice(0, 80); }

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
    log: log
  };
})();
