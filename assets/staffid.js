/* KPTC — digital staff ID.
   KPStaffID.card(o)    → HTML of the ID (front + back), o = {name,title,dept,id,joined,photo,qr,email,phone,url}
   KPStaffID.url(u,base)→ the link the QR opens: the ID's public data travels inside the link itself, so the
                          verification page works on any phone without a server. (Photos stay on the card.)
   KPStaffID.read(hash) → the data back out of that link
   KPStaffID.qr(text)   → QR as SVG, KPStaffID.png(o, done) → the front of the ID as a PNG picture
   The flip is a plain 2-D turn (scaleX) so it looks the same on every browser, iPad Safari included. */
(function(){
  var F = '"Noto Kufi Arabic","IBM Plex Sans Arabic",sans-serif';
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fdate(s){ if (!s) return '—'; var p = String(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }
  var CSS = [
    '.sid{width:340px;max-width:100%;margin-inline:auto;color:#14133A}',
    '.sid-card{position:relative;aspect-ratio:.64;width:100%;transition:transform .22s ease-in;transform-origin:50% 50%}',
    '.sid-card.turn{transform:scaleX(.02)}',
    '.sid-f,.sid-b{position:absolute;inset:0;border-radius:22px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 26px 44px -22px rgba(31,29,92,.7),0 0 0 1px rgba(20,19,58,.06)}',
    '.sid-f{background:#fff}.sid-b{background:linear-gradient(160deg,#1b1950,#2E2C78);color:#fff;display:none}',
    '.sid-card.back .sid-f{display:none}.sid-card.back .sid-b{display:flex}',
    '.sid-top{position:relative;flex:0 0 40%;background:linear-gradient(150deg,#1b1950 0%,#2E2C78 55%,#3d3a96 100%);color:#fff;padding:26px 20px 0;overflow:hidden}',
    '.sid-top::before{content:"";position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'340\' height=\'220\' fill=\'none\' stroke=\'%23fff\' stroke-opacity=\'.1\' stroke-width=\'3\'%3E%3Cpath d=\'M-10 170 C60 170 70 100 130 100 S210 160 260 110 S320 40 360 50\'/%3E%3Ccircle cx=\'130\' cy=\'100\' r=\'8\'/%3E%3Ccircle cx=\'260\' cy=\'110\' r=\'8\'/%3E%3C/svg%3E") center/cover}',
    '.sid-top::after{content:"";position:absolute;inset-inline-end:-60px;top:-70px;width:190px;height:190px;border-radius:50%;border:30px solid rgba(255,201,60,.14)}',
    '.sid-slot{position:absolute;top:9px;left:50%;translate:-50% 0;width:54px;height:9px;border-radius:6px;background:rgba(0,0,0,.35);box-shadow:inset 0 1px 2px rgba(0,0,0,.5)}',
    '.sid-brand{position:relative;z-index:1;display:flex;align-items:center;gap:9px;margin-top:6px}',
    '.sid-mk{width:30px;height:30px;border-radius:9px;background:#FFC93C;color:#14133A;display:grid;place-items:center;flex:none}.sid-mk svg{width:17px;height:17px}',
    '.sid-brand b{display:block;font:800 15px/1.1 ' + F + ';letter-spacing:.16em;direction:ltr;text-align:start}.sid-brand small{display:block;font-size:10.5px;color:#CFCDEA;margin-top:2px}',
    '.sid-ph{position:relative;z-index:2;width:118px;height:118px;border-radius:50%;margin:-60px auto 0;border:5px solid #fff;box-shadow:0 0 0 4px #FFC93C,0 12px 22px -10px rgba(0,0,0,.5);overflow:hidden;background:#FFC93C;display:grid;place-items:center;flex:none}',
    '.sid-ph .kp-av,.sid-ph img{width:100%;height:100%;object-fit:cover;display:grid;place-items:center;font:700 48px ' + F + ';color:#14133A;border-radius:0}',
    '.sid-body{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:14px 20px 0;min-height:0}',
    '.sid-body h3{font:800 clamp(18px,5.2vw,22px)/1.3 ' + F + ';overflow-wrap:anywhere}',
    '.sid-t{font:700 13.5px ' + F + ';color:#2E2C78;margin-top:2px}',
    '.sid-d{display:inline-block;margin-top:8px;font:600 12px ' + F + ';background:#F3F2EC;border:1px solid #E0DED4;border-radius:14px;padding:2px 12px}',
    '.sid-dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;margin-top:auto;padding:12px 0;border-top:1px dashed #CFCCBF}',
    '.sid-dl dt{font-size:10.5px;color:#6E6C85}.sid-dl dd{font:800 14px ' + F + ';text-align:center;direction:ltr;unicode-bidi:isolate}',
    '.sid-foot{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#2E2C78;color:#fff;padding:11px 18px;border-top:5px solid #FFC93C}',
    '.sid-tag{font:800 15px/1.2 ' + F + '}.sid-tag small{display:block;font:600 10px ' + F + ';letter-spacing:.2em;color:#FFC93C;direction:ltr;text-align:start}',
    '.sid-q{display:flex;align-items:center;gap:9px;font-size:10.5px;color:#CFCDEA;line-height:1.5}.sid-q i{display:block;width:62px;height:62px;background:#fff;border-radius:9px;padding:5px;flex:none}.sid-q svg{width:100%;height:100%;display:block}',
    '.sid-stripe{height:46px;background:#0d0c26;margin-top:26px;flex:none}',
    '.sid-bk{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:20px 22px 20px;gap:10px;min-height:0}',
    '.sid-bk .sid-big{width:156px;height:156px;background:#fff;border-radius:16px;padding:10px;box-shadow:0 10px 22px -10px rgba(0,0,0,.6);flex:none}.sid-big svg{width:100%;height:100%;display:block}',
    '.sid-bk h4{font:800 16px ' + F + '}.sid-bk p{font-size:12px;line-height:1.7;color:#D7D5F0}',
    '.sid-bk ul{list-style:none;width:100%;display:grid;gap:5px;margin-top:2px;text-align:start;padding:0}.sid-bk li{display:flex;justify-content:space-between;gap:10px;font-size:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:6px 11px}.sid-bk li span{color:#B9B7DD}.sid-bk li b{font-weight:700;direction:ltr;unicode-bidi:isolate;overflow-wrap:anywhere;text-align:end}',
    '.sid-bk em{font:normal 10.5px/1.6 ' + F + ';color:#B9B7DD;margin-top:auto}',
    '@media(prefers-reduced-motion:reduce){.sid-card{transition:none}}'
  ].join('\n');
  function css(){ if (document.getElementById('kpsid-css')) return; var s = document.createElement('style'); s.id = 'kpsid-css'; s.textContent = CSS; document.head.appendChild(s); }
  var PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  function enc(o){ return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(h){ try { var s = String(h || '').replace(/^#/, '').replace(/^d=/, '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch(e){ return null; } }
  function url(u, base){ return base + '#' + enc({i: u.id, n: u.name, t: u.title || '', d: u.dept || '', j: u.joined || '', s: u.status === 'active' ? 1 : 0, v: 1}); }
  function qr(txt, cell){ try { var q = window.qrcode(0, 'M'); q.addData(txt); q.make(); return q.createSvgTag({cellSize: cell || 4, margin: 0, scalable: true}); } catch(e){ return ''; } }

  function card(o){
    css();
    var short = (o.url || '').replace(/^https?:\/\//, '').split('#')[0];
    return '<div class="sid"><div class="sid-card' + (o.back ? ' back' : '') + '">' +
      '<div class="sid-f"><div class="sid-top"><i class="sid-slot"></i><div class="sid-brand"><span class="sid-mk">' + PIN + '</span><span><b>KPTC</b><small>شركة النقل العام الكويتية</small></span></div></div>' +
      '<div class="sid-ph">' + (o.photo || '') + '</div>' +
      '<div class="sid-body"><h3>' + esc(o.name) + '</h3><div class="sid-t">' + esc(o.title || 'موظف') + '</div><span class="sid-d">' + esc(o.dept || '') + '</span>' +
      '<dl class="sid-dl"><div><dt>الرقم الوظيفي</dt><dd>' + esc(o.id) + '</dd></div><div><dt>في الخدمة منذ</dt><dd>' + esc(fdate(o.joined)) + '</dd></div></dl></div>' +
      '<div class="sid-foot"><div class="sid-tag">موظف<small>EMPLOYEE</small></div><div class="sid-q"><span>امسح للتحقق<br>من الهوية</span><i>' + (o.qr || '') + '</i></div></div></div>' +
      '<div class="sid-b"><div class="sid-stripe"></div><div class="sid-bk"><div class="sid-big">' + (o.qr || '') + '</div><h4>تحقّق من هذه الهوية</h4><p>امسح الرمز بكاميرا الجوال لتفتح بطاقة صاحب الهوية.</p>' +
      '<ul>' + (o.email ? '<li><span>البريد</span><b>' + esc(o.email) + '</b></li>' : '') + (o.phone ? '<li><span>الهاتف</span><b>' + esc(o.phone) + '</b></li>' : '') + '<li><span>الخط الساخن</span><b>1880001</b></li></ul>' +
      '<em>هذه البطاقة ملك لشركة النقل العام الكويتية. عند العثور عليها يرجى الاتصال بالخط الساخن.</em></div></div>' +
      '</div></div>';
  }
  /* turn the card over: shrink to a line, swap the face, grow back */
  function flip(root){ var c = root.querySelector('.sid-card'); if (!c || c.classList.contains('turn')) return; c.classList.add('turn'); setTimeout(function(){ c.classList.toggle('back'); c.classList.remove('turn'); }, 230); return c; }

  /* the front of the ID as a picture, for the phone's gallery */
  function png(o, done){
    var W = 680, H = 1062, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d');
    function rr(a, b, w, h, r){ x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
    rr(0, 0, W, H, 44); x.fillStyle = '#fff'; x.fill(); x.save(); rr(0, 0, W, H, 44); x.clip();
    var g = x.createLinearGradient(0, 0, W, 430); g.addColorStop(0, '#1b1950'); g.addColorStop(.55, '#2E2C78'); g.addColorStop(1, '#3d3a96'); x.fillStyle = g; x.fillRect(0, 0, W, 425);
    x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 6; x.beginPath(); x.moveTo(-20, 340); x.bezierCurveTo(120, 340, 140, 200, 260, 200); x.bezierCurveTo(380, 200, 420, 320, 520, 220); x.bezierCurveTo(600, 140, 640, 100, 720, 110); x.stroke();
    x.beginPath(); x.arc(W - 40, -10, 130, 0, 7); x.lineWidth = 60; x.strokeStyle = 'rgba(255,201,60,.14)'; x.stroke();
    x.fillStyle = 'rgba(0,0,0,.35)'; rr(W / 2 - 54, 16, 108, 18, 10); x.fill();
    x.fillStyle = '#FFC93C'; rr(W - 96, 62, 60, 60, 18); x.fill(); x.fillStyle = '#14133A'; x.font = '800 34px ' + F; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('K', W - 66, 94);
    x.fillStyle = '#fff'; x.textAlign = 'right'; x.font = '800 32px ' + F; x.fillText('KPTC', W - 112, 80); x.fillStyle = '#CFCDEA'; x.font = '600 21px ' + F; x.direction = 'rtl'; x.fillText('شركة النقل العام الكويتية', W - 112, 112);
    x.restore();
    function rest(img){
      var cx = W / 2, cy = 425;
      x.beginPath(); x.arc(cx, cy, 128, 0, 7); x.fillStyle = '#FFC93C'; x.fill(); x.beginPath(); x.arc(cx, cy, 118, 0, 7); x.fillStyle = '#fff'; x.fill();
      x.save(); x.beginPath(); x.arc(cx, cy, 108, 0, 7); x.clip(); x.fillStyle = '#FFC93C'; x.fillRect(cx - 108, cy - 108, 216, 216);
      if (img){ var s = Math.min(img.width, img.height); x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, cx - 108, cy - 108, 216, 216); } else { x.fillStyle = '#14133A'; x.font = '800 96px ' + F; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(o.name || '?').trim().charAt(0), cx, cy + 6); }
      x.restore();
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillStyle = '#14133A'; x.font = '800 46px ' + F; x.fillText(o.name, cx, 600);
      x.fillStyle = '#2E2C78'; x.font = '700 28px ' + F; x.fillText(o.title || 'موظف', cx, 652);
      x.font = '600 23px ' + F; var tw = x.measureText(o.dept || '').width + 44; x.fillStyle = '#F3F2EC'; rr(cx - tw / 2, 684, tw, 44, 22); x.fill(); x.strokeStyle = '#E0DED4'; x.lineWidth = 2; x.stroke(); x.fillStyle = '#14133A'; x.fillText(o.dept || '', cx, 707);
      x.strokeStyle = '#CFCCBF'; x.setLineDash([8, 8]); x.beginPath(); x.moveTo(40, 770); x.lineTo(W - 40, 770); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#6E6C85'; x.font = '500 20px ' + F; x.fillText('الرقم الوظيفي', W * .73, 806); x.fillText('في الخدمة منذ', W * .27, 806);
      x.fillStyle = '#14133A'; x.font = '800 28px ' + F; x.direction = 'ltr'; x.fillText(o.id, W * .73, 848); x.fillText(fdate(o.joined), W * .27, 848);
      x.fillStyle = '#2E2C78'; x.fillRect(0, 900, W, H - 900); x.fillStyle = '#FFC93C'; x.fillRect(0, 900, W, 10);
      x.fillStyle = '#fff'; x.textAlign = 'right'; x.direction = 'rtl'; x.font = '800 34px ' + F; x.fillText('موظف', W - 44, 970); x.fillStyle = '#FFC93C'; x.font = '600 18px ' + F; x.direction = 'ltr'; x.fillText('EMPLOYEE', W - 44, 1006);
      x.fillStyle = '#CFCDEA'; x.textAlign = 'left'; x.font = '500 19px ' + F; x.direction = 'rtl'; x.textAlign = 'center'; x.fillText('امسح للتحقق', 262, 960); x.fillText('من الهوية', 262, 988);
      var qx = 44, qy = 920, qs = 120; x.fillStyle = '#fff'; rr(qx, qy, qs + 16, qs + 16, 14); x.fill();
      try { var q = window.qrcode(0, 'M'); q.addData(o.url); q.make(); var n = q.getModuleCount(), c = qs / n; x.fillStyle = '#14133A'; for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(qx + 8 + k * c, qy + 8 + r * c, Math.ceil(c), Math.ceil(c)); } catch(e){}
      done(cv.toDataURL('image/png'));
    }
    if (o.photoUrl){ var im = new Image(); im.onload = function(){ rest(im); }; im.onerror = function(){ rest(null); }; im.src = o.photoUrl; } else rest(null);
  }
  window.KPStaffID = {card: card, url: url, read: dec, qr: qr, png: png, flip: flip, css: css};
})();
