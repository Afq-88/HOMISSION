/* KPTC — الحجز: مخطط المقاعد والتذكرة الإلكترونية (العمرة و VIP).
   التذكرة تُرسم على Canvas ثم تُحفظ PDF حقيقياً بلا مكتبات خارجية، ورمز QR عبر assets/qrcode.min.js */
(function(){
  'use strict';
  var PAGE = (location.pathname.split('/').pop() || '').replace('.html', '');
  function $(id){ return document.getElementById(id); }
  function el(tag, cls, html){ var d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
  function toast(t){ try { showToast(t); } catch(e){} }
  function clean(s){ return String(s == null ? '' : s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim(); }

  var css = document.createElement('style');
  css.textContent = [
  /* ---- coach seat map ---- */
  '.cs{--s:38px;display:grid;gap:14px}',
  '.cs-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
  '.cs-bar button{border:2px solid var(--kp-ink);background:#fff;border-radius:4px;padding:7px 14px;font:700 13px var(--f-display);color:var(--kp-ink);cursor:pointer;transition:background .15s,translate .15s}',
  '.cs-bar button:hover{translate:0 -1px}.cs-bar .cs-auto{background:var(--kp-sign)}.cs-bar button:hover{background:var(--kp-ink);color:#fff}',
  '.cs-count{margin-inline-start:auto;font:700 13px var(--f-display);color:var(--kp-ink);background:var(--kp-paper-2,#f1efe6);border-radius:14px;padding:5px 14px}',
  '.cs-count b{color:var(--kp-indigo);font-size:15px}',
  '.cs-key{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--kp-muted);align-items:center}',
  '.cs-key span{display:inline-flex;align-items:center;gap:6px}.cs-key i{width:18px;height:18px;border-radius:5px 5px 3px 3px;border:2px solid #c9c7e0;background:#fff;display:inline-block}',
  '.cs-key .k-sel{background:var(--kp-indigo);border-color:var(--kp-indigo)}.cs-key .k-tak{background:repeating-linear-gradient(135deg,#e6e5ee 0 4px,#f4f3f8 4px 8px);border-color:#dddbe8}.cs-key .k-gold{background:#FFF6D8;border-color:#D9A514}',
  '.cs-scroll{overflow-x:auto;padding:22px 6px 26px;scrollbar-width:thin}',
  '.cs-bus{position:relative;display:flex;direction:rtl;width:max-content;margin:0 auto;background:#fff;border:3px solid var(--kp-ink);border-radius:26px 60px 60px 26px/26px 46px 46px 26px;box-shadow:0 14px 0 -8px rgba(20,19,58,.12),8px 8px 0 rgba(20,19,58,.08)}',
  '.cs-bus::before,.cs-bus::after{content:"";position:absolute;left:14%;right:16%;height:9px;background:repeating-linear-gradient(90deg,#BFD9F2 0 46px,transparent 46px 54px);border-radius:3px;opacity:.9}',
  '.cs-bus::before{top:5px}.cs-bus::after{bottom:5px}',
  '.cs-front{position:relative;width:74px;flex:none;border-inline-end:2px dashed #d5d3e6;display:grid;align-content:space-between;justify-items:center;padding:24px 0 22px;background:linear-gradient(270deg,rgba(191,217,242,.55),transparent 55%);border-radius:0 56px 56px 0/0 44px 44px 0}',
  '.cs-wheel{width:30px;height:30px;border-radius:50%;border:4px solid var(--kp-ink);position:relative}.cs-wheel::after{content:"";position:absolute;inset:8px;border-radius:50%;background:var(--kp-ink)}',
  '.cs-door{font:700 10.5px var(--f-display);color:var(--kp-ink);background:var(--kp-sign);border-radius:3px;padding:2px 7px;writing-mode:vertical-rl}',
  '.cs-grid{display:grid;grid-template-rows:repeat(2,var(--s)) 26px repeat(2,var(--s));grid-auto-columns:var(--s);gap:7px 8px;padding:22px 18px 22px 20px;direction:rtl}',
  '.cs-s{grid-column:var(--r);grid-row:var(--c);position:relative;width:var(--s);height:var(--s);border:2px solid #c9c7e0;border-inline-end-width:7px;border-radius:9px 5px 5px 9px;background:#fff;color:var(--kp-ink);font:700 12.5px var(--f-display);cursor:pointer;padding:0;display:grid;place-items:center;transition:translate .15s,background .15s,border-color .15s,box-shadow .15s}',
  '.cs-s:hover:not(.taken):not(.sel){border-color:var(--kp-indigo);translate:0 -2px;box-shadow:0 4px 0 rgba(46,44,120,.18)}',
  '.cs-s.gold{background:#FFF6D8;border-color:#D9A514}',
  '.cs-s.taken{background:repeating-linear-gradient(135deg,#e6e5ee 0 4px,#f4f3f8 4px 8px);border-color:#dddbe8;color:#b3b1c6;cursor:not-allowed}',
  '.cs-s.sel{background:var(--kp-indigo);border-color:var(--kp-ink);color:var(--kp-sign);animation:cs-pop .32s cubic-bezier(.3,1.6,.5,1)}',
  '.cs-s.gold.sel{background:#D9A514;color:var(--kp-ink)}',
  '.cs-s.sel::after{content:attr(data-i);position:absolute;top:-9px;left:-7px;width:18px;height:18px;border-radius:50%;background:var(--kp-sign);color:var(--kp-ink);font-size:10.5px;display:grid;place-items:center;border:2px solid var(--kp-ink)}',
  '.cs-s.hint{border-color:var(--kp-sign);box-shadow:0 0 0 3px rgba(255,201,60,.55)}',
  '@keyframes cs-pop{from{scale:.7}}',
  '.cs-s[data-tip]:hover::before{content:attr(data-tip);position:absolute;bottom:calc(100% + 9px);left:50%;translate:-50%;white-space:nowrap;background:var(--kp-ink);color:#fff;font:600 11px var(--f-body);padding:3px 9px;border-radius:3px;z-index:5;pointer-events:none}',
  '.cs-rn{grid-column:var(--r);grid-row:3;align-self:center;justify-self:center;font:600 10.5px var(--f-display);color:#a9a7c0}',
  '.cs-rear{width:20px;flex:none;border-inline-start:2px dashed #d5d3e6;background:repeating-linear-gradient(0deg,rgba(20,19,58,.06) 0 6px,transparent 6px 12px);border-radius:22px 0 0 22px}',
  '.cs-tyre{position:absolute;width:54px;height:10px;background:var(--kp-ink);border-radius:5px}',
  '.cs-tyre.a{top:-9px;right:96px}.cs-tyre.b{bottom:-9px;right:96px}.cs-tyre.c{top:-9px;left:70px}.cs-tyre.d{bottom:-9px;left:70px}',
  '.cs-note{font-size:12px;color:var(--kp-muted);text-align:center}',
  '@media(max-width:640px){.cs{--s:34px}.cs-grid{gap:6px}.cs-front{width:56px}.cs-note::after{content:" · اسحب يساراً لباقي المقاعد"}}',
  /* ---- e-ticket ---- */
  '.tk{display:grid;justify-items:center;gap:16px;margin:22px auto 0;max-width:460px;width:100%}',
  '.tk-img{width:100%;border-radius:14px;box-shadow:0 22px 50px -18px rgba(20,19,58,.5);animation:tk-in .8s cubic-bezier(.2,.8,.2,1) both;transform-origin:top center;display:block;background:#fff}',
  '@keyframes tk-in{from{opacity:0;translate:0 -40px;rotate:-2deg;clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}',
  '.tk-act{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%}',
  '.tk-act button{border:2px solid var(--kp-ink);background:#fff;border-radius:5px;padding:11px 6px;font:700 13.5px var(--f-display);color:var(--kp-ink);cursor:pointer;display:grid;justify-items:center;gap:5px;transition:translate .15s,background .15s}',
  '.tk-act button:hover{translate:0 -2px;background:var(--kp-sign)}.tk-act button.main{background:var(--kp-ink);color:var(--kp-sign)}',
  '.tk-act svg{width:20px;height:20px}',
  '.tk-sheet{position:fixed;inset:0;z-index:9000;background:rgba(20,19,58,.72);display:grid;place-items:end center;padding:16px;animation:kp-fade .2s both}',
  '@keyframes kp-fade{from{opacity:0}}',
  '.tk-sheet>div{background:#fff;border-radius:10px 10px 6px 6px;border-top:6px solid var(--kp-sign);width:min(430px,100%);padding:18px;display:grid;gap:8px;animation:tk-up .3s cubic-bezier(.2,.8,.2,1) both}',
  '@keyframes tk-up{from{translate:0 40px;opacity:0}}',
  '.tk-sheet h4{margin:0 0 4px;font:700 17px var(--f-display);color:var(--kp-ink)}.tk-sheet p{margin:0 0 6px;font-size:12.5px;color:var(--kp-muted)}',
  '.tk-sheet a,.tk-sheet button{display:flex;align-items:center;justify-content:space-between;text-decoration:none;border:1.5px solid var(--kp-line,#dcdaea);background:#fff;border-radius:5px;padding:12px 14px;font:700 14px var(--f-display);color:var(--kp-ink);cursor:pointer}',
  '.tk-sheet a:hover,.tk-sheet button:hover{border-color:var(--kp-ink);background:var(--kp-paper-2,#f6f3ea)}.tk-sheet .x{justify-content:center;border:0;color:var(--kp-muted);font-weight:600}'
  ].join('\n');
  document.head.appendChild(css);

  /* ================= seat map ================= */
  // cfg: {box, rows, back, taken, sel, gold(n), fn, max, onAuto(list), onClear()}
  function coach(cfg){
    var n = 1, cells = '', rowsList = [], sides = [];
    function seat(num, r, c, win){
      var tk = cfg.taken.indexOf(num) > -1, i = cfg.sel.indexOf(num), g = cfg.gold && cfg.gold(num);
      var tip = 'مقعد ' + num + ' · ' + (win ? 'نافذة' : 'ممر') + (g ? ' · VIP +3 د.ك' : '') + (tk ? ' · محجوز' : '');
      return '<button type="button" class="cs-s' + (g ? ' gold' : '') + (tk ? ' taken' : '') + (i > -1 ? ' sel' : '') + '" style="--r:' + r + ';--c:' + c + '" data-n="' + num + '" data-i="' + (i + 1) + '" data-tip="' + tip + '" aria-label="' + tip + '"' + (tk ? ' disabled' : ' onclick="' + cfg.fn + '(' + num + ')"') + '>' + num + '</button>';
    }
    for (var r = 1; r <= cfg.rows; r++){
      var a = n++, b = n++, c = n++, d = n++;
      cells += seat(a, r, 1, 1) + seat(b, r, 2, 0) + '<span class="cs-rn" style="--r:' + r + '">' + r + '</span>' + seat(c, r, 4, 0) + seat(d, r, 5, 1);
      rowsList.push([a, b, c, d]); sides.push([a, b], [c, d]);
    }
    if (cfg.back){ var br = cfg.rows + 1, bk = []; for (var k = 1; k <= cfg.back; k++){ bk.push(n); cells += seat(n++, br, cfg.back === 5 ? k : (k < 3 ? k : k + 1), k === 1 || k === cfg.back); } rowsList.push(bk); }
    var total = n - 1, max = cfg.max ? cfg.max() : 0;
    cfg.box.innerHTML = '<div class="cs"><div class="cs-bar"><button type="button" class="cs-auto" data-cs="auto">اقترح لي أفضل المقاعد</button><button type="button" data-cs="clear">مسح الاختيار</button>' +
      '<span class="cs-count">اخترت <b>' + cfg.sel.length + '</b>' + (max ? ' من ' + max : '') + '</span></div>' +
      '<div class="cs-key"><span><i></i>متاح</span><span><i class="k-sel"></i>اختيارك</span><span><i class="k-tak"></i>محجوز</span>' + (cfg.gold ? '<span><i class="k-gold"></i>VIP ذهبي +3 د.ك</span>' : '') + '</div>' +
      '<div class="cs-scroll"><div class="cs-bus"><i class="cs-tyre a"></i><i class="cs-tyre b"></i><i class="cs-tyre c"></i><i class="cs-tyre d"></i>' +
      '<div class="cs-front"><span class="cs-wheel" title="السائق"></span><span class="cs-door">الباب</span></div><div class="cs-grid">' + cells + '</div><div class="cs-rear"></div></div></div>' +
      '<div class="cs-note">حافلة بطابق واحد · ' + total + ' مقعداً · المقدمة جهة اليمين</div></div>';
    cfg.box.onclick = function(e){
      var b = e.target.closest('[data-cs]'); if (!b) return;
      if (b.getAttribute('data-cs') === 'clear') return cfg.onPick([]);
      var want = (cfg.max && cfg.max()) || 2, free = function(x){ return cfg.taken.indexOf(x) < 0; };
      var pool = cfg.gold ? rowsList.filter(function(rw){ return !cfg.gold(rw[0]); }) : rowsList, pick = [];
      var groups = want <= 2 ? sides.filter(function(s){ return !cfg.gold || !cfg.gold(s[0]); }) : pool;
      var hit = groups.filter(function(g){ return g.filter(free).length >= want; })[0];
      if (hit) pick = hit.filter(free).slice(0, want);
      else { var best = null; for (var i = 0; i < pool.length; i++){ var acc = [], j = i; for (; j < pool.length && acc.length < want; j++) acc = acc.concat(pool[j].filter(free)); if (acc.length >= want && (!best || j - i < best.span)) best = {span:j - i, s:acc.slice(0, want)}; } pick = best ? best.s : []; }
      if (!pick.length) return toast('لا مقاعد متجاورة كافية — اختر يدوياً');
      cfg.onPick(pick); toast('اخترنا لك: ' + pick.join('، '));
    };
  }

  /* ================= ticket ================= */
  var INK = '#14133A', INDIGO = '#2E2C78', SIGN = '#FFC93C', PAPER = '#F6F3EA', MUTED = '#77759A';
  var FD = '"Noto Kufi Arabic","IBM Plex Sans Arabic",Tahoma,sans-serif', FB = '"IBM Plex Sans Arabic","Noto Kufi Arabic",Tahoma,sans-serif';
  function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function fit(g, t, max, size, w, fam){ do { g.font = (w || 700) + ' ' + size + 'px ' + (fam || FD); size -= 2; } while (g.measureText(t).width > max && size > 14); }
  function draw(d){
    var W = 1080, P = 46, nRows = Math.ceil(Math.min(6, (d.fields || []).length) / 2), H = P * 2 + 372 + 132 + nRows * 112 + 18 + 150 + 430, c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'); g.direction = 'rtl';
    var vip = d.kind === 'vip', head = vip ? INK : INDIGO, x0 = P, y0 = P, w = W - P * 2, h = H - P * 2, xr = x0 + w - 56, xl = x0 + 56, yP = y0 + h - 430;
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    g.save(); rr(g, x0, y0, w, h, 40); g.clip();
    g.fillStyle = '#fff'; g.fillRect(x0, y0, w, h);
    // header
    g.fillStyle = head; g.fillRect(x0, y0, w, 250);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 14;
    [[0, 330, 300], [120, 420, 260], [-60, 200, 380]].forEach(function(a){ g.beginPath(); g.moveTo(x0 + a[0], y0 + 260); g.lineTo(x0 + a[1], y0 + 60); g.lineTo(x0 + a[1] + a[2], y0 + 60); g.stroke(); });
    g.fillStyle = SIGN; rr(g, xr - 100, y0 + 62, 100, 100, 14); g.fill();
    g.fillStyle = head; g.beginPath(); g.arc(xr - 50, y0 + 104, 25, Math.PI * .85, Math.PI * .15); g.lineTo(xr - 50, y0 + 146); g.closePath(); g.fill();
    g.fillStyle = SIGN; g.beginPath(); g.arc(xr - 50, y0 + 104, 10, 0, 7); g.fill();
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '700 58px ' + FD; g.direction = 'ltr'; g.fillText('KPTC', xr - 124, y0 + 120); g.direction = 'rtl';
    g.font = '500 23px ' + FB; g.fillStyle = 'rgba(255,255,255,.72)'; g.fillText('شركة النقل العام الكويتية', xr - 124, y0 + 158);
    g.textAlign = 'left'; g.fillStyle = SIGN; fit(g, d.title, 380, 40); g.fillText(d.title, xl, y0 + 116);
    g.direction = 'ltr'; g.font = '600 19px ' + FB; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('E - T I C K E T', xl, y0 + 156); g.direction = 'rtl';
    g.fillStyle = SIGN; g.fillRect(x0, y0 + 250, w, 10);
    // route
    var yr = y0 + 372;
    g.textAlign = 'right'; g.fillStyle = MUTED; g.font = '500 24px ' + FB; g.fillText('من', xr, yr - 52);
    g.fillStyle = INDIGO; fit(g, d.from, 360, 58); g.fillText(d.from, xr, yr + 12); var wf = g.measureText(d.from).width;
    g.textAlign = 'left'; g.fillStyle = MUTED; g.font = '500 24px ' + FB; g.fillText('إلى', xl, yr - 52);
    g.fillStyle = INDIGO; fit(g, d.to, 360, 58); g.fillText(d.to, xl, yr + 12); var wt = g.measureText(d.to).width;
    var la = xl + wt + 34, lb = xr - wf - 34, ly = yr - 8, mid = (la + lb) / 2;
    if (lb - la > 120){
      g.strokeStyle = INK; g.lineWidth = 6; g.setLineDash([2, 16]); g.lineCap = 'round'; g.beginPath(); g.moveTo(la + 14, ly); g.lineTo(lb - 14, ly); g.stroke(); g.setLineDash([]);
      [la, lb].forEach(function(x){ g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(x, ly, 11, 0, 7); g.fill(); g.stroke(); });
      g.fillStyle = '#fff'; g.fillRect(mid - 50, ly - 26, 100, 52);
      g.fillStyle = INDIGO; rr(g, mid - 40, ly - 20, 80, 34, 8); g.fill(); g.fillStyle = SIGN; for (var i = 0; i < 4; i++) g.fillRect(mid - 32 + i * 17, ly - 13, 12, 11);
      g.fillStyle = INK; g.beginPath(); g.arc(mid - 20, ly + 16, 7, 0, 7); g.arc(mid + 20, ly + 16, 7, 0, 7); g.fill();
    }
    g.textAlign = 'center'; g.fillStyle = INK; fit(g, d.sub || '', w - 140, 27, 600, FB); g.fillText(d.sub || '', x0 + w / 2, yr + 78);
    // fields (2 columns)
    var yf = yr + 132, colW = (w - 112) / 2;
    g.strokeStyle = '#E4E2F0'; g.lineWidth = 2; g.beginPath(); g.moveTo(xl, yf - 22); g.lineTo(xr, yf - 22); g.stroke();
    (d.fields || []).slice(0, 6).forEach(function(f, i){
      var col = i % 2, row = Math.floor(i / 2), x = xr - col * (colW + 0), y = yf + row * 112 + 26; if (col) x = xr - colW - 0;
      g.textAlign = 'right'; g.fillStyle = MUTED; g.font = '500 23px ' + FB; g.fillText(f[0], x, y);
      g.fillStyle = INK; fit(g, f[1], colW - 30, 33); g.fillText(f[1], x, y + 46);
    });
    var rowsN = Math.ceil(Math.min(6, (d.fields || []).length) / 2), ys = yf + rowsN * 112 + 18;
    // seats + total
    g.strokeStyle = '#E4E2F0'; g.beginPath(); g.moveTo(xl, ys - 18); g.lineTo(xr, ys - 18); g.stroke();
    g.textAlign = 'right'; g.fillStyle = MUTED; g.font = '500 23px ' + FB; g.fillText(d.seatLabel || 'المقاعد', xr, ys + 26);
    var seats = d.seats || [], sx = xr, sy = ys + 46;
    if (!seats.length){ g.fillStyle = INK; g.font = '700 32px ' + FD; g.fillText(d.seatText || 'يُحدَّد عند الصعود', xr, sy + 38); }
    seats.slice(0, 6).forEach(function(s){ g.font = '700 30px ' + FD; var sw = Math.max(64, g.measureText(String(s)).width + 30); g.fillStyle = INDIGO; rr(g, sx - sw, sy, sw, 54, 10); g.fill(); g.fillStyle = SIGN; g.textAlign = 'center'; g.fillText(String(s), sx - sw / 2, sy + 38); sx -= sw + 10; });
    if (seats.length > 6){ g.textAlign = 'right'; g.fillStyle = INK; g.font = '700 26px ' + FD; g.fillText('+' + (seats.length - 6), sx - 4, sy + 38); }
    g.textAlign = 'left'; g.fillStyle = MUTED; g.font = '500 23px ' + FB; g.fillText(d.totalLabel || 'المبلغ المدفوع', xl, ys + 26);
    g.fillStyle = INK; fit(g, d.total || '—', 380, 50); g.fillText(d.total || '—', xl, sy + 44);
    // perforation
    g.strokeStyle = '#B9B7CF'; g.lineWidth = 4; g.setLineDash([14, 12]); g.beginPath(); g.moveTo(x0 + 44, yP); g.lineTo(x0 + w - 44, yP); g.stroke(); g.setLineDash([]);
    // stub
    var qs = 270, qx = xl, qy = yP + 58;
    try {
      var q = window.qrcode(0, 'M'); q.addData(d.qr || d.ref); q.make(); var nq = q.getModuleCount(), cs = qs / nq;
      g.fillStyle = '#fff'; g.fillRect(qx - 8, qy - 8, qs + 16, qs + 16); g.fillStyle = INK;
      for (var a = 0; a < nq; a++) for (var b = 0; b < nq; b++) if (q.isDark(a, b)) g.fillRect(qx + b * cs, qy + a * cs, cs + .6, cs + .6);
    } catch(e){ g.strokeStyle = INK; g.strokeRect(qx, qy, qs, qs); }
    g.textAlign = 'right'; g.fillStyle = MUTED; g.font = '500 23px ' + FB; g.fillText('رقم الحجز', xr, yP + 86);
    g.direction = 'ltr'; g.fillStyle = INK; fit(g, d.ref, w - qs - 170, 46, 700, 'ui-monospace,Menlo,Consolas,monospace'); g.fillText(d.ref, xr, yP + 142); g.direction = 'rtl';
    g.fillStyle = INK; g.font = '600 25px ' + FB; (d.notes || []).slice(0, 3).forEach(function(t, i){ fit(g, t, w - qs - 170, 25, 600, FB); g.fillText(t, xr, yP + 202 + i * 42); });
    g.fillStyle = MUTED; g.font = '500 22px ' + FB; g.fillText('الخط الساخن', xr, yP + 336);
    g.direction = 'ltr'; g.fillStyle = INDIGO; g.font = '700 34px ' + FD; g.textAlign = 'right'; g.fillText('1880001', xr - 150, yP + 338); g.direction = 'rtl';
    // foot band
    g.fillStyle = SIGN; g.fillRect(x0, y0 + h - 34, w, 34); g.fillStyle = INK; for (var t = 0; t < 60; t++){ var bw = [3, 6, 2, 8, 4][t % 5]; g.fillRect(x0 + 40 + t * 16.4, y0 + h - 27, bw, 20); }
    g.restore();
    // notches
    g.fillStyle = PAPER; g.beginPath(); g.arc(x0, yP, 30, 0, 7); g.arc(x0 + w, yP, 30, 0, 7); g.fill();
    return c;
  }
  // a one-page PDF around a JPEG — no library needed
  function pdf(canvas, title){
    var jpg = atob(canvas.toDataURL('image/jpeg', .93).split(',')[1]), n = jpg.length, img = new Uint8Array(n); for (var i = 0; i < n; i++) img[i] = jpg.charCodeAt(i);
    var pw = 420, ph = Math.round(pw * canvas.height / canvas.width), enc = new TextEncoder(), parts = [], off = [], pos = 0;
    function put(x){ var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); pos += b.length; }
    function obj(k, body){ off[k] = pos; put(k + ' 0 obj\n' + body + '\nendobj\n'); }
    put('%PDF-1.4\n%âãÏÓ\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    off[4] = pos; put('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + canvas.width + ' /Height ' + canvas.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + n + ' >>\nstream\n'); put(img); put('\nendstream\nendobj\n');
    var cont = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
    obj(5, '<< /Length ' + cont.length + ' >>\nstream\n' + cont + '\nendstream');
    obj(6, '<< /Title (' + String(title || 'KPTC Ticket').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '') + ') /Producer (KPTC) >>');
    var xref = pos, s = 'xref\n0 7\n0000000000 65535 f \n'; for (var k = 1; k <= 6; k++) s += ('0000000000' + off[k]).slice(-10) + ' 00000 n \n';
    put(s + 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(parts, {type:'application/pdf'});
  }
  var IC = {
    pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/></svg>',
    share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.5M8.2 13.2l7.6 4.5"/></svg>'
  };
  var cur = null; // {data, canvas, blob, url, name}
  function make(d){
    var go = function(){ var c = draw(d), b = pdf(c, d.ref); if (cur && cur.url) URL.revokeObjectURL(cur.url); cur = {data:d, canvas:c, blob:b, url:URL.createObjectURL(b), name:'KPTC-' + d.ref.replace(/[^A-Za-z0-9-]/g, '') + '.pdf'}; return cur; };
    var f = document.fonts;
    if (!f || !f.load) return Promise.resolve(go());
    return Promise.race([Promise.all([f.load('700 40px "Noto Kufi Arabic"', 'تذكرة'), f.load('500 24px "IBM Plex Sans Arabic"', 'تذكرة')]), new Promise(function(r){ setTimeout(r, 1500); })]).then(go, go);
  }
  function summary(d){ return d.title + ' — KPTC\nرقم الحجز: ' + d.ref + '\n' + d.from + ' ← ' + d.to + (d.sub ? '\n' + d.sub : '') + (d.fields || []).map(function(f){ return '\n' + f[0] + ': ' + f[1]; }).join('') + (d.seats && d.seats.length ? '\nالمقاعد: ' + d.seats.join('، ') : '') + '\nالإجمالي: ' + d.total + '\nالخط الساخن 1880001'; }
  function act(what){
    if (!cur) return toast('لا توجد تذكرة بعد');
    var a = document.createElement('a'); a.href = cur.url;
    if (what === 'open'){ a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); return; }
    if (what === 'pdf'){ a.download = cur.name; document.body.appendChild(a); a.click(); a.remove(); toast('تم حفظ التذكرة: ' + cur.name); return; }
    if (what === 'share'){
      var file = null; try { file = new File([cur.blob], cur.name, {type:'application/pdf'}); } catch(e){}
      if (file && navigator.canShare && navigator.canShare({files:[file]})) return navigator.share({files:[file], title:cur.data.title, text:summary(cur.data)}).catch(function(e){ if (e && e.name !== 'AbortError') sheet(); });
      sheet();
    }
  }
  function sheet(){
    var t = summary(cur.data), s = el('div', 'tk-sheet');
    s.innerHTML = '<div role="dialog" aria-label="مشاركة التذكرة"><h4>مشاركة التذكرة</h4><p>يُحفظ ملف PDF على جهازك لترفقه، ويُرسل ملخص الحجز نصاً.</p>' +
      '<a href="https://wa.me/?text=' + encodeURIComponent(t) + '" target="_blank" rel="noopener" data-dl>واتساب <span>←</span></a>' +
      '<a href="mailto:?subject=' + encodeURIComponent(cur.data.title + ' ' + cur.data.ref) + '&body=' + encodeURIComponent(t) + '" data-dl>البريد الإلكتروني <span>←</span></a>' +
      '<button type="button" data-copy>نسخ تفاصيل الحجز <span>⧉</span></button><button type="button" data-pdf>حفظ ملف PDF فقط <span>↓</span></button><button type="button" class="x">إغلاق</button></div>';
    document.body.appendChild(s);
    s.addEventListener('click', function(e){
      if (e.target === s || e.target.closest('.x')) return s.remove();
      if (e.target.closest('[data-dl]')){ act('pdf'); setTimeout(function(){ s.remove(); }, 300); }
      if (e.target.closest('[data-pdf]')){ act('pdf'); s.remove(); }
      if (e.target.closest('[data-copy]')){ try { navigator.clipboard.writeText(t).then(function(){ toast('تم نسخ تفاصيل الحجز'); }); } catch(x){ toast('تعذّر النسخ'); } s.remove(); }
    });
  }
  // puts the ticket (image + actions) into a host element
  function mount(host, d, before){
    var old = host.querySelector('.tk'); if (old) old.remove();
    var box = el('div', 'tk', '<div style="padding:30px;font:700 15px var(--f-display);color:var(--kp-ink)">نجهّز تذكرتك…</div>');
    before ? host.insertBefore(box, before) : host.appendChild(box);
    return make(d).then(function(c){
      box.innerHTML = '<img class="tk-img" alt="' + d.title + ' — ' + d.ref + '"><div class="tk-act"><button type="button" class="main" data-tk="open">' + IC.pdf + 'فتح PDF</button><button type="button" data-tk="pdf">' + IC.down + 'تحميل</button><button type="button" data-tk="share">' + IC.share + 'مشاركة</button></div>';
      box.querySelector('img').src = c.canvas.toDataURL('image/png');
      box.querySelector('.tk-act').addEventListener('click', function(e){ var b = e.target.closest('[data-tk]'); if (b) act(b.getAttribute('data-tk')); });
    });
  }
  window.KPTicket = {act:act, mount:mount, make:make};

  /* ================= العمرة ================= */
  if (PAGE === 'umrah' && $('seatRows')){
    var G = function(n){ return n <= 8; };
    window.buildSeats = function(){
      coach({box:$('seatRows'), rows:10, back:5, taken:takenSeats, sel:selectedSeats, gold:G, fn:'toggleSeat',
        max:function(){ return paxCounts.adult + paxCounts.child; },
        onPick:function(list){ selectedSeats.length = 0; list.forEach(function(x){ selectedSeats.push(x); }); window.buildSeats(1); try { renderSelectedSeats(); updateNextBtn(); } catch(e){} }});
    };
    var ts = window.toggleSeat;
    window.toggleSeat = function(num){ // when the group is complete, a new pick replaces the oldest one
      var max = paxCounts.adult + paxCounts.child;
      if (selectedSeats.indexOf(num) < 0 && selectedSeats.length >= max && max > 0) selectedSeats.shift();
      return ts.apply(this, arguments);
    };
    try { activeFloor = 1; window.buildSeats(1); } catch(e){}
    var lab = $('seatTripLabel'); if (lab) lab.textContent = 'حافلة مكيفة فاخرة بطابق واحد — 45 مقعداً';
    var sp = $('successPage');
    if (sp) new MutationObserver(function(){
      if (!sp.classList.contains('show') || sp.getAttribute('data-tk')) return; sp.setAttribute('data-tk', '1');
      var t = null; try { t = selectedTrip; } catch(e){}
      var tx = function(id){ var x = $(id); return x ? clean(x.textContent) : ''; }, seats = []; try { seats = selectedSeats.slice().sort(function(a, b){ return a - b; }); } catch(e){}
      var ref = tx('bookingNum'), pax = 1; try { pax = paxCounts.adult + paxCounts.child + (paxCounts.infant || 0); } catch(e){}
      var d = {kind:'umrah', ref:ref, title:'تذكرة عمرة', from:'الكويت', to:'مكة المكرمة', sub:t ? clean(t.title) : tx('sc-trip'),
        fields:[['المسافر', tx('sc-name')], ['تاريخ المغادرة', t ? clean((t.weekday || '') + ' ' + t.date + ' ' + t.month) : '—'], ['عدد المسافرين', String(pax)], ['التأمين', tx('sc-ins') || '—']],
        seats:seats, seatText:'يُحدَّد عند الصعود', total:tx('sc-total'), notes:['أبرز التذكرة والجواز عند الصعود', 'الحضور قبل الموعد بساعة'],
        qr:'KPTC|UMRAH|' + ref + '|' + seats.join(',') + '|' + tx('sc-total').replace(/[^\d.]/g, '')};
      mount(sp, d, sp.querySelector('.success-actions'));
    }).observe(sp, {attributes:true, attributeFilter:['class']});
  }

  /* ================= VIP ================= */
  if (PAGE === 'vip' && $('vipRows')){
    var SHAPE = {mini:{rows:5, back:5}, mid:{rows:9, back:4}, large:{rows:10, back:5}};
    var sync = function(){ try { renderSeatPanel(); updateOrderPanel(); $('seatCountLabel').textContent = selectedSeats.length ? '— ' + selectedSeats.length + ' مقعد محدد' : '— لم تختر بعد'; } catch(e){} };
    window.buildVipSeats = function(type){
      var s = SHAPE[type] || SHAPE.mini;
      coach({box:$('vipRows'), rows:s.rows, back:s.back, taken:takenMap[type] || [], sel:selectedSeats, fn:'toggleVSeat',
        max:function(){ var p = $('d-pax'), cap = s.rows * 4 + s.back - (takenMap[type] || []).length; return Math.max(1, Math.min(cap, parseInt(p && p.value, 10) || 2)); },
        onPick:function(list){ selectedSeats.length = 0; list.forEach(function(x){ selectedSeats.push(x); }); window.buildVipSeats(type); sync(); }});
    };
    try { window.buildVipSeats(selectedBusType); } catch(e){}
    // booking summary as a live boarding pass
    var opb = document.querySelector('.order-panel .op-body'), pass = el('div', 'op-pass');
    if (opb){
      opb.insertBefore(pass, opb.firstChild);
      var paint = function(){
        var g = function(id){ var x = $(id); return x ? clean(x.textContent) : ''; }, r = g('op-route').split('←'), a = clean(r[0]), b = clean(r[1] || '');
        var has = a && a !== '—' && b;
        pass.innerHTML = '<div class="op-way' + (has ? ' on' : '') + '"><div><small>من</small><b>' + (has ? a : 'الانطلاق') + '</b></div><i><u></u></i><div><small>إلى</small><b>' + (has ? b : 'الوجهة') + '</b></div></div>' +
          '<div class="op-chips"><span>' + (g('op-date') && g('op-date') !== '—' ? g('op-date') : 'اختر التاريخ') + '</span><span>' + g('op-pax') + '</span><span>' + (selectedSeats.length ? selectedSeats.length + ' مقعد محدد' : 'الحافلة كاملة') + '</span></div>';
      };
      var uo = window.updateOrderPanel; window.updateOrderPanel = function(){ var r = uo.apply(this, arguments); try { paint(); } catch(e){} return r; };
      var rs = window.renderSeatPanel; window.renderSeatPanel = function(){ var r = rs.apply(this, arguments); try { paint(); } catch(e){} return r; };
      try { window.updateOrderPanel(); } catch(e){ paint(); }
    }
    var ov = $('successOverlay');
    if (ov) new MutationObserver(function(){
      if (!ov.classList.contains('show')){ ov.removeAttribute('data-tk'); return; }
      if (ov.getAttribute('data-tk')) return; ov.setAttribute('data-tk', '1');
      var tx = function(id){ var x = $(id); return x ? clean(x.textContent) : ''; }, ref = tx('refNum'), body = ov.querySelector('.sm-body');
      var rows = [].map.call(ov.querySelectorAll('#smRows .sm-row'), function(r){ return [clean(r.querySelector('.sm-row-label').textContent), clean(r.querySelector('.sm-row-val').textContent)]; });
      var kind = (rows[0] && rows[0][1]) || 'حجز VIP', dom = /داخلية/.test(kind), seats = []; try { if (dom) seats = selectedSeats.slice().sort(function(a, b){ return a - b; }); } catch(e){}
      var route = tx('op-route').split('←'), nm = [].filter.call(document.querySelectorAll('.form-card'), function(c){ return /بيانات العميل/.test(c.textContent); }).map(function(c){ return c.querySelector('.f-input'); })[0], name = nm && nm.value ? clean(nm.value) : 'عميل KPTC';
      var d = dom ? {kind:'vip', ref:ref, title:'حجز حافلة VIP', from:clean(route[0]) && route[0] !== '—' ? clean(route[0]) : 'نقطة الانطلاق', to:clean(route[1] || '') || 'الوجهة', sub:tx('op-bustype'),
          fields:[['العميل', name], ['التاريخ', tx('op-date') || '—'], ['الركاب', tx('op-pax') || '—'], ['طريقة الدفع', tx('op-pay') || '—']], seats:seats, seatText:'الحافلة كاملة لك', total:tx('op-total'), totalLabel:'الإجمالي',
          notes:['فريق VIP يتواصل معك لتأكيد التفاصيل', 'أبرز الرمز للسائق عند الصعود'], qr:'KPTC|VIP|' + ref + '|' + tx('op-total').replace(/[^\d.]/g, '')}
        : {kind:'vip', ref:ref, title:kind, from:'الكويت', to:(rows[1] && rows[1][1] && rows[1][1] !== '—' ? rows[1][1].split('(')[0].trim() : 'حسب الطلب'), sub:rows.slice(1).map(function(r){ return r[0] + ': ' + r[1]; }).join(' · '),
          fields:rows.concat([['العميل', name]]).slice(0, 4), seats:[], seatLabel:'الحافلة', seatText:'تُخصَّص بعد التأكيد', total:(rows.filter(function(r){ return /الإجمالي/.test(r[0]); })[0] || ['', 'يُحدَّد في العرض'])[1], totalLabel:'التكلفة',
          notes:['طلبك مسجّل وسيتواصل معك الفريق', 'احتفظ برقم الحجز للمتابعة'], qr:'KPTC|VIP|' + ref};
      mount(body, d, body.querySelector('.sm-actions'));
    }).observe(ov, {attributes:true, attributeFilter:['class']});
  }
})();
