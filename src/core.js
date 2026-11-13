/* KPTC design-system runtime.
   1) Replaces emoji pictographs with one consistent line-icon set (presentation only:
      no ids, handlers or data are touched; form values/options are left as data).
   2) Adds the governorate route strip to the public footer.
   3) When a page is opened on its own (outside the gateway), internal links still work. */
(function(){
  if (window.__kptcCore) return; window.__kptcCore = 1;

  var P = {
    check:'<path d="M20 6 9 17l-5-5"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    alert:'<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.2"/>',
    clip:'<rect x="8" y="2.5" width="8" height="4" rx="1"/><path d="M16 4.5h2a2 2 0 0 1 2 2V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h2M8.5 12h7M8.5 16h5"/>',
    bus:'<rect x="4" y="3" width="16" height="14.5" rx="2.5"/><path d="M4 10.5h16M8 3v7.5M16 3v7.5M7.5 14h1M15.5 14h1M6.5 17.5V20M17.5 17.5V20"/>',
    chart:'<path d="M3.5 20.5h17M6.5 20.5V12M11 20.5V5M15.5 20.5v-6M20 20.5V9"/>',
    money:'<rect x="2.5" y="6" width="19" height="12" rx="1.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
    card:'<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
    wrench:'<path d="M14.7 6.3a4.5 4.5 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4.5 4.5 0 0 0 5.6-5.6l-2.7 2.7-2.5-.5-.5-2.5z"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5M4 20.5h16"/>',
    upload:'<path d="M12 20V8M7 13l5-5 5 5M4 3.5h16"/>',
    phone:'<path d="M21.5 16.6v3a2 2 0 0 1-2.2 2A19.5 19.5 0 0 1 2.4 4.7 2 2 0 0 1 4.4 2.5h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.4 10.3a16 16 0 0 0 5.3 5.3l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    search:'<circle cx="11" cy="11" r="6.5"/><path d="m20.5 20.5-4.8-4.8"/>',
    pin:'<path d="M12 21.5s-7-6.3-7-11.8a7 7 0 0 1 14 0c0 5.5-7 11.8-7 11.8z"/><circle cx="12" cy="9.6" r="2.5"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    cal:'<rect x="3" y="4.5" width="18" height="16.5" rx="1.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>',
    map:'<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 13.8a6.5 6.5 0 0 1 3.5 6.2"/>',
    mobile:'<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M11 18h2"/>',
    edit:'<path d="M4 20h4.5L19.5 9 15 4.5 4 15.5z"/><path d="m13 6.5 4.5 4.5"/>',
    building:'<path d="M4.5 21V4.5A1.5 1.5 0 0 1 6 3h8a1.5 1.5 0 0 1 1.5 1.5V21M15.5 9h3a1.5 1.5 0 0 1 1.5 1.5V21M3 21h18M8 7h4M8 11h4M8 15h4"/>',
    eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    mega:'<path d="M3.5 10v4a1 1 0 0 0 1 1H7l7 4.5v-15L7 9H4.5a1 1 0 0 0-1 1zM7 15l1 5h2.5M18 8.5a5 5 0 0 1 0 7"/>',
    doc:'<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h5"/>',
    crown:'<path d="M3 7.5 7 12l5-7 5 7 4-4.5-1.8 11H4.8z"/><path d="M5 21h14"/>',
    refresh:'<path d="M20 11.5A8 8 0 0 0 5.4 7M4 3.5V8h4.5M4 12.5A8 8 0 0 0 18.6 17M20 20.5V16h-4.5"/>',
    bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1V16h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
    bolt:'<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
    mosque:'<path d="M12 2.5v2M7.5 11.5C7.5 8 12 6.5 12 4.5c0 2 4.5 3.5 4.5 7M6 11.5h12M4 21V9.5M20 21V9.5M3 21h18M6 11.5V21M18 11.5V21M10 21v-3.5a2 2 0 0 1 4 0V21"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    trend:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    timer:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9 2.5h6"/>',
    store:'<path d="M4 10.5V21h16V10.5M2.8 10.5 4.5 4h15l1.7 6.5zM9.5 21v-5.5h5V21"/>',
    chat:'<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.6A8.5 8.5 0 1 1 20.5 12z"/>',
    bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15.5 6 9M10 21a2.2 2.2 0 0 0 4 0"/>',
    home:'<path d="m3 11 9-7.5 9 7.5"/><path d="M5.5 9V21h13V9M10 21v-6h4v6"/>',
    cpu:'<rect x="5.5" y="5.5" width="13" height="13" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3"/>',
    truck:'<path d="M2.5 17V6h11v11M13.5 9.5h4L21 13v4h-2"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="16.5" cy="17.5" r="2"/><path d="M8.5 17.5h6"/>',
    gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    box:'<path d="M21 7.5 12 3 3 7.5v9L12 21l9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>',
    lock:'<rect x="4.5" y="10.5" width="15" height="10.5" rx="1.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5M12 14.5v2.5"/>',
    unlock:'<rect x="4.5" y="10.5" width="15" height="10.5" rx="1.5"/><path d="M8 10.5V7a4 4 0 0 1 7.6-1.7M12 14.5v2.5"/>',
    star:'<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9z"/>',
    save:'<path d="M5 3h11.5L20 6.5V21H5z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
    plane:'<path d="M21 3.5 3 10.5l6.5 2.5L12 20l3-6 6-10.5zM9.5 13 21 3.5"/>',
    bank:'<path d="m3 9.5 9-6 9 6zM5 9.5V18M9.5 9.5V18M14.5 9.5V18M19 9.5V18M3 21h18M4 18h16"/>',
    trash:'<path d="M4 6.5h16M9.5 6.5V3.5h5v3M6 6.5 7 21h10l1-14.5M10 11v6M14 11v6"/>',
    ticket:'<path d="M3 6h18v3.5a2.5 2.5 0 0 0 0 5V18H3v-3.5a2.5 2.5 0 0 0 0-5z"/><path d="M14.5 6v12" stroke-dasharray="2 2"/>',
    siren:'<path d="M7 18v-5.5a5 5 0 0 1 10 0V18M4.5 21h15v-3h-15zM12 2.5v2M4.5 6.5l1.5 1M19.5 6.5 18 7.5"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    seat:'<path d="M7 3.5v9.5h9.5M7 13l-1.5 7.5M16.5 13l1.5 7.5M7 17h10"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    food:'<path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2.2 1-3.5 4-3.5 8.5H17"/>',
    shield:'<path d="M12 3 4.5 6v5.5c0 5 3.3 8.3 7.5 9.5 4.2-1.2 7.5-4.5 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
    crane:'<path d="M5 21V5.5l10-3V21M5 5.5h15V9M18 9v4.5M3 21h14M8.5 9h3M8.5 13h3"/>',
    brush:'<path d="M14 4 20 10l-9.5 9.5H4.5v-6z"/><path d="m12 6 6 6"/>',
    car:'<path d="M4.5 16.5h15V12l-2-5.5h-11L4.5 12zM3 12h18"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/>',
    book:'<path d="M3.5 4.5h6a2.5 2.5 0 0 1 2.5 2.5v13.5a2 2 0 0 0-2-2H3.5zM20.5 4.5h-6A2.5 2.5 0 0 0 12 7v13.5a2 2 0 0 1 2-2h6.5z"/>',
    hourglass:'<path d="M6 2.5h12M6 21.5h12M7 2.5c0 5 10 5.5 10 9.5s-10 4.5-10 9.5M17 2.5c0 5-10 5.5-10 9.5s10 4.5 10 9.5"/>',
    bag:'<path d="M5 8h14l-1.2 13H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    down:'<path d="M12 4v16M6 14l6 6 6-6"/>',
    up:'<path d="M12 20V4M6 10l6-6 6 6"/>',
    stop:'<path d="M12 21.5V10M7.5 2.5h9v7.5h-9zM9 21.5h6M10 5.5h4"/>',
    folder:'<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2h8.8A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    medical:'<path d="M4.5 21V5h15v16M3 21h18M12 8.5v6M9 11.5h6"/>',
    medal:'<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5 6 3h4l2 5 2-5h4l-2.5 7.5M12 12.8v4.4"/>',
    school:'<path d="M3 21V10l9-6 9 6v11M3 21h18M9.5 21v-5h5v5M12 4v3"/>',
    tire:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
    receipt:'<path d="M5.5 2.5h13v19l-2.6-1.8-2.2 1.8-2.2-1.8-2.2 1.8-2.2-1.8-1.6 1.8z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.8 12.2 9.7-9.7M17 6l3 3M14.5 8.5l2 2"/>',
    flag:'<path d="M5 21.5V3.5M5 4h13l-2.5 4.5L18 13H5"/>',
    camera:'<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13.5" r="3.8"/>',
    attach:'<path d="m20.5 11.5-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/>',
    coffee:'<path d="M4 8.5h13V14a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5v3M12 2.5v3"/>',
    bed:'<path d="M3 20V5.5M3 14.5h18V20M3 10.5h6.5v4M21 14.5v-1.5a3.5 3.5 0 0 0-3.5-3.5h-8"/>',
    cart:'<circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/><path d="M2.5 3.5h3l2.3 11.5h11l2-8H6.3"/>',
    battery:'<rect x="2.5" y="7" width="16.5" height="10" rx="1.5"/><path d="M21.5 10.5v3M6 10v4M9.5 10v4"/>',
    moon:'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    door:'<path d="M5.5 21V3h11v18M3 21h16.5M13 12.5v.5"/>',
    snow:'<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
    idcard:'<rect x="2.5" y="5" width="19" height="14" rx="1.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16a3 3 0 0 1 6 0M14 10h4.5M14 13.5h3"/>',
    signal:'<path d="M4.5 11.5a11 11 0 0 1 15 0M7.8 14.8a6.4 6.4 0 0 1 8.4 0M12 18.5v.3"/>',
    screen:'<rect x="2.5" y="4" width="19" height="12.5" rx="1.5"/><path d="M8 20.5h8M12 16.5v4"/>',
    fuel:'<path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3h6A1.5 1.5 0 0 1 13 4.5V21M3 21h11.5M4 9.5h9M13 10.5h2a2 2 0 0 1 2 2V16a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
    link:'<path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1"/>',
    pause:'<path d="M9 5v14M15 5v14"/>',
    glasses:'<circle cx="6.5" cy="15" r="3.5"/><circle cx="17.5" cy="15" r="3.5"/><path d="M10 15h4M3 15l1.5-7M21 15l-1.5-7"/>',
    drop:'<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    image:'<rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9.5 9"/>',
    gift:'<rect x="3" y="8" width="18" height="4.5"/><path d="M5 12.5V21h14v-8.5M12 8v13M12 8C10 4 6.5 4 6.5 6.3S10 8 12 8c2 0 5.5 0 5.5-1.7S14 4 12 8z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    tag:'<path d="M3 3h8.5l9.5 9.5-8.5 8.5L3 11.5z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
    diamond:'<path d="M6.5 3.5h11l3.5 5.5-9 12-9-12z"/><path d="M3 9h18M9.5 3.5 12 9l2.5-5.5M12 9v12"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2.2-2.4 4M12 17v.3"/>',
    send:'<path d="M20.5 3.5 3.5 10.5l7 3 3 7z"/><path d="m10.5 13.5 4-4"/>',
    flagkw:'<path d="M5 21.5V3.5M5 4h14v9H5"/><path d="M5 4l3.5 4.5L5 13"/>',
    square:'<rect x="4.5" y="4.5" width="15" height="15" rx="1"/>'
  };

  // emoji → icon name ; null = decorative, removed ; "dot:x" = coloured status dot
  var E = {
    '✅':'check|ok','❌':'x|bad','⚠':'alert|warn','📋':'clip','🚌':'bus','🚍':'bus','🚐':'bus','📊':'chart','💰':'money','💵':'money','💸':'money',
    '💳':'card','🔧':'wrench','🔩':'wrench','🛠':'wrench','📥':'download','📤':'upload','📞':'phone','🔍':'search','🔎':'search','📍':'pin','📌':'pin',
    '📧':'mail','📬':'mail','📭':'mail','📅':'cal','📆':'cal','🗺':'map','👤':'user','👥':'users','🧑':'user','👔':'user','👷':'user','👶':'user','📱':'mobile','🍎':'mobile',
    '✏':'edit','📝':'doc','📄':'doc','🏢':'building','🏙':'building','🏭':'building','🏨':'building','🏬':'store','👁':'eye','📢':'mega','👑':'crown',
    '🔄':'refresh','🔁':'refresh','💡':'bulb','⚡':'bolt','🔥':'bolt','🕌':'mosque','☪':'mosque','🕐':'clock','⏰':'clock','📈':'trend','🚀':'trend','⏱':'timer',
    '🏪':'store','💬':'chat','🔔':'bell','🏠':'home','🧠':'cpu','🤖':'cpu','🚛':'truck','⚙':'gear','📦':'box','🔒':'lock','🔐':'lock','🔓':'unlock',
    '⭐':'star','🌟':'star','🆕':'star','💾':'save','✈':'plane','🏦':'bank','🏛':'bank','🗑':'trash','🎫':'ticket','🎟':'ticket','🚨':'siren',
    '🌐':'globe','🌍':'globe','💺':'seat','🪑':'seat','🎯':'target','🍽':'food','🍔':'food','🥧':'food','🥤':'food','🛡':'shield','🏗':'crane','🎨':'brush',
    '🚗':'car','🚙':'car','🛻':'car','📖':'book','📚':'book','⏳':'hourglass','⌛':'hourglass','🛍':'bag','👜':'bag','🎒':'bag','👛':'bag','⬇':'down','👇':'down',
    '⬆':'up','🔝':'up','🚉':'stop','🚏':'stop','📁':'folder','🏥':'medical','💊':'medical','🦷':'medical','🏆':'medal','🥇':'medal','🥈':'medal','🥉':'medal',
    '🏫':'school','🎓':'school','🛞':'tire','🧾':'receipt','🔑':'key','🗝':'key','🏁':'flag','📸':'camera','📷':'camera','🎥':'camera','📎':'attach',
    '☕':'coffee','🛏':'bed','🛒':'cart','🔋':'battery','🌙':'moon','☀':'sun','🏖':'sun','🚪':'door','❄':'snow','🛂':'idcard','📡':'signal','📶':'signal',
    '🖥':'screen','💻':'screen','📺':'screen','⛽':'fuel','🛢':'fuel','🔗':'link','⏸':'pause','👓':'glasses','🚿':'drop','🧭':'compass','🖼':'image',
    '🎁':'gift','➕':'plus','🏷':'tag','💎':'diamond','❓':'help','💥':'alert','📐':'square','🔲':'square','🅿':'square',
    '🔴':'dot:bad','🟥':'dot:bad','🟡':'dot:warn','🟢':'dot:ok','🟩':'dot:ok','🔵':'dot:info','🟦':'dot:info',
    '👋':null,'😊':null,'😔':null,'🤔':null,'🎉':null,'✨':null,'💛':null,'🌸':null,'💐':null,'🙏':null,'👆':null,'💪':null,'💨':null
  };
  var FLAG = /(?:\uD83C[\uDDE6-\uDDFF]){2}/;
  var RX = /(?:\uD83C[\uDDE6-\uDDFF]){2}|(?:[⌀-⏿☀-✒✔✖✘-➣➥-➿⬀-⯿]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDEFF])️?/g;
  var SKIP = {SCRIPT:1,STYLE:1,TEXTAREA:1,OPTION:1,TITLE:1,NOSCRIPT:1,svg:1,SVG:1,CODE:1,PRE:1};

  function icon(ch){
    var k = FLAG.test(ch) ? 'flagkw' : E[ch.replace('️','')];
    if (k === null) return null;
    if (k === undefined) return document.createTextNode(ch);
    if (k.indexOf('dot:') === 0){ var d=document.createElement('i'); d.className='ki-dot d-'+k.slice(4); d.setAttribute('aria-hidden','true'); return d; }
    var p = k.split('|'), i = document.createElement('i');
    i.className = 'ki' + (p[1] ? ' ki-'+p[1] : '');
    i.setAttribute('aria-hidden','true');
    i.innerHTML = '<svg viewBox="0 0 24 24">' + (P[p[0]]||P.square) + '</svg>';
    return i;
  }
  function swapText(t){
    var v = t.nodeValue; RX.lastIndex = 0;
    if (!v || !RX.test(v)) return;
    var par = t.parentNode; if (!par || SKIP[par.nodeName] || (par.closest && par.closest('svg,textarea,[contenteditable],.ki'))) return;
    var f = document.createDocumentFragment(), last = 0; RX.lastIndex = 0; var m;
    while ((m = RX.exec(v))){
      if (m.index > last) f.appendChild(document.createTextNode(v.slice(last, m.index)));
      var n = icon(m[0]);
      if (n) f.appendChild(n);
      else if (v.charAt(m.index + m[0].length) === ' ') RX.lastIndex++;   // eat the trailing space of a removed decoration
      last = RX.lastIndex;
    }
    if (last < v.length) f.appendChild(document.createTextNode(v.slice(last)));
    par.replaceChild(f, t);
  }
  function walk(root){
    if (root.nodeType === 3) return swapText(root);
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) list.push(n);
    list.forEach(swapText);
    // presentation-only attributes
    root.querySelectorAll && root.querySelectorAll('[placeholder],[title]').forEach(function(el){
      ['placeholder','title'].forEach(function(a){ var v = el.getAttribute(a); if (v){ RX.lastIndex=0; if (RX.test(v)) el.setAttribute(a, v.replace(RX,'').replace(/^\s+/,'')); } });
    });
    root.querySelectorAll && root.querySelectorAll('option').forEach(function(o){ RX.lastIndex=0; if (RX.test(o.text) && !o.hasAttribute('value')) { o.value = o.value; o.text = o.text.replace(RX,'').replace(/^\s+/,''); } });
  }

  function footerStrip(){
    var f = document.querySelector('.k2-foot .k2-w, body > footer > .wrap');
    if (!f || f.querySelector('.kp-strip')) return;
    var s = document.createElement('div'); s.className = 'kp-strip'; s.setAttribute('aria-hidden','true');
    ['العاصمة','حولي','الفروانية','مبارك الكبير','الأحمدي','الجهراء'].forEach(function(g){ var e=document.createElement('span'); e.textContent=g; s.appendChild(e); });
    f.insertBefore(s, f.firstChild);
  }

  var MAP = {"KPTC_Executive_Landing.html":"exec","KPTC_Home.html":"home","KPTC_Routes.html":"routes","KPTC_Subscriptions.html":"subs","KPTC_Umrah.html":"umrah","KPTC_VIP.html":"vip","KPTC_Winch.html":"winch","KPTC_LostFound.html":"lost","KPTC_Advertising.html":"ads","KPTC_AI_Assistant.html":"assistant","KPTC_Admin_Dashboard_v3.html":"dashboard","KPTC_Admin_AI.html":"adminai","KPTC_Portal.html":"portal","KPTC_RealEstate.html":"realestate","KPTC_RE_AI.html":"reai","KPTC_RE_Client.html":"reclient","KPTC_Client_Portal.html":"tenant","KPTC_Website_Prototype.html":"home","KPTC_Subscriptions_v2.html":"subs"};
  function standalone(){
    if (window.parent !== window) return;
    // inside the gateway, the page posts kptcNav to the parent; on its own, go through the gateway
    document.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      var raw = a.getAttribute('href'), h = raw.split('#')[0].split('/').pop(), hash = raw.split('#')[1];
      if (!MAP[h]) return;
      e.preventDefault();
      var own = location.pathname.split('/').pop().replace('.html','');
      if (MAP[h] === own && hash){ var t = document.getElementById(hash); if (t) t.scrollIntoView({behavior:'smooth'}); return; }
      location.href = '../index.html#/' + MAP[h];
    });
  }


  /* ---- motion & workflow helpers ---------------------------------------- */
  function countUp(){
    // only static display figures that no page script reads back
    var els = document.querySelectorAll('.facts strong.num, .facts .since b, .kp-stats .hstat-num, .kp-stats .hnum-val, .kp-stats .hstat-val');
    if (!els.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (!e.isIntersecting) return; io.unobserve(e.target); run(e.target); }); }, {threshold:.6});
    function run(el){
      var txt = el.textContent, m = txt.match(/^(\D*)([\d,]+)(.*)$/); if (!m || el.children.length) return;
      var end = parseInt(m[2].replace(/,/g,''),10); if (!(end > 9)) return;
      var comma = m[2].indexOf(',') > -1, t0 = performance.now(), dur = 900;
      (function tick(t){
        var k = Math.min(1,(t - t0)/dur), v = Math.round(end * (1 - Math.pow(1-k,3)));
        el.textContent = m[1] + (comma ? v.toLocaleString('en-US') : v) + m[3];
        if (k < 1) requestAnimationFrame(tick); else el.textContent = txt;
      })(t0);
    }
    els.forEach(function(el){ io.observe(el); });
  }
  function backToTop(){
    if (!document.querySelector('.k2-foot, body > footer')) return;
    var b = document.createElement('button'); b.className = 'kp-top'; b.type = 'button'; b.setAttribute('aria-label','العودة إلى أعلى الصفحة');
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
    b.addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); });
    document.body.appendChild(b);
    var tick = false;
    window.addEventListener('scroll', function(){ if (tick) return; tick = true; requestAnimationFrame(function(){ b.classList.toggle('on', window.scrollY > 700); tick = false; }); }, {passive:true});
  }
  function lineBus(){
    document.querySelectorAll('.network .stops').forEach(function(list){
      var bus = document.createElement('i'); bus.className = 'kp-linebus'; bus.setAttribute('aria-hidden','true'); list.appendChild(bus);
      list.querySelectorAll('li').forEach(function(li){
        li.addEventListener('mouseenter', function(){ bus.style.top = (li.offsetTop - 8) + 'px'; bus.style.opacity = 1; });
      });
      list.addEventListener('mouseleave', function(){ bus.style.opacity = 0; });
    });
  }
  function gatewayKeys(){
    // inside the gateway the page has keyboard focus; hand presentation shortcuts up to it
    if (window.parent === window) return;
    document.addEventListener('keydown', function(e){
      var msg = null;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) msg = {kptcPalette:1};
      else if (e.altKey && e.key === 'ArrowLeft') msg = {kptcStep:1};
      else if (e.altKey && e.key === 'ArrowRight') msg = {kptcStep:-1};
      if (!msg) return;
      e.preventDefault(); try { parent.postMessage(msg, '*'); } catch(x){}
    });
  }


  function homeExtras(){
    var hero = document.querySelector('main > section.hero'); if (!hero) return;
    var road = document.createElement('div'); road.className = 'hero-road'; road.setAttribute('aria-hidden','true'); road.innerHTML = '<i></i>'; hero.appendChild(road);
    var sw = document.getElementById('swap'), f = document.getElementById('finder');
    if (sw && f) sw.addEventListener('click', function(){ f.classList.remove('swapped'); void f.offsetWidth; f.classList.add('swapped'); });
  }


  function forms(){
    // forms that point at another page (the home trip finder) go through the same routing as links
    document.addEventListener('submit', function(e){
      var f = e.target, act = (f.getAttribute && f.getAttribute('action') || '').split('/').pop().split('#')[0];
      if (!MAP[act]) return;
      e.preventDefault();
      f.classList.add('kp-punched');
      setTimeout(function(){
        f.classList.remove('kp-punched');
        if (window.parent !== window) { try { parent.postMessage({kptcNav: MAP[act]}, '*'); } catch(x){} }
        else location.href = '../index.html#/' + MAP[act];
      }, 420);
    });
  }

  function init(){
    walk(document.body);
    forms();
    homeExtras();
    footerStrip();
    standalone();
    countUp(); backToTop(); lineBus(); gatewayKeys();
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if (m.type === 'characterData') return swapText(m.target);
        m.addedNodes.forEach(function(n){ if (!(n.nodeType===1 && n.classList && (n.classList.contains('ki')||n.classList.contains('ki-dot')))) walk(n); });
      });
    }).observe(document.body, {childList:true, subtree:true, characterData:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
