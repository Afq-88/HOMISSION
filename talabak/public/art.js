/* رسوم «محطة الجناح»: أفق الكويت بحسب وقت اليوم، حافلة KPTC، وأيقونات الخدمات. كلها SVG مضمَّن — لا صور خارجية. */
(function () {
  'use strict';
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // وقت اليوم بتوقيت الكويت (يمكن فرضه للتجربة: ?tod=night)
  function tod() {
    try { const f = new URLSearchParams(location.search).get('tod'); if (['day', 'dusk', 'night'].includes(f)) return f; } catch { /* */ }
    const d = new Date(Date.now() + 3 * 3600e3), h = d.getUTCHours() + d.getUTCMinutes() / 60;
    if (h >= 18 || h < 5.5) return 'night';
    if (h >= 16.25) return 'dusk';
    return 'day';
  }

  function skyline(seed, base, minH, maxH, wMin, wMax, lit) {
    const r = rng(seed); let x = -30, out = '';
    while (x < 1480) {
      const w = wMin + r() * (wMax - wMin), h = minH + r() * (maxH - minH);
      out += `<rect x="${x | 0}" y="${(base - h) | 0}" width="${w | 0}" height="${(h + 60) | 0}"/>`;
      if (lit) for (let k = 0; k < Math.floor(w / 14); k++) for (let j = 0; j < Math.floor(h / 22); j++) if (r() > 0.62) out += `<rect class="win" x="${(x + 5 + k * 13) | 0}" y="${(base - h + 8 + j * 20) | 0}" width="5" height="7"/>`;
      x += w + r() * 10;
    }
    return out;
  }

  // ---------- مشهد الأفق (٣ طبقات + أبراج الكويت + برج الحمراء + سحب + نجوم) ----------
  function scene(t) {
    const night = t === 'night', r = rng(7);
    let stars = '';
    if (night) for (let i = 0; i < 46; i++) stars += `<circle class="star s${i % 3}" cx="${(r() * 1440) | 0}" cy="${(r() * 190) | 0}" r="${(0.8 + r() * 1.5).toFixed(1)}"/>`;
    const orb = t === 'day' ? { x: 340, y: 84, r: 34 } : t === 'dusk' ? { x: 350, y: 232, r: 50 } : { x: 340, y: 80, r: 26 };
    const cloud = (x, y, s, c) => `<g class="cloud ${c}"><g transform="translate(${x} ${y}) scale(${s})"><circle cx="30" cy="30" r="22"/><circle cx="58" cy="22" r="28"/><circle cx="92" cy="30" r="20"/><rect x="14" y="30" width="96" height="22" rx="11"/></g></g>`;
    return `<svg class="scene" viewBox="0 0 1440 420" preserveAspectRatio="xMinYMax slice" aria-hidden="true" focusable="false">
      <defs><radialGradient id="glow"><stop offset="0" stop-color="var(--orb)" stop-opacity=".75"/><stop offset="1" stop-color="var(--orb)" stop-opacity="0"/></radialGradient><linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fog)" stop-opacity="0"/><stop offset="1" stop-color="var(--fog)" stop-opacity=".55"/></linearGradient></defs>
      <g class="stars">${stars}</g>
      <circle class="orbglow" cx="${orb.x}" cy="${orb.y}" r="${orb.r * 3.2}" fill="url(#glow)"/>
      <circle class="orb" cx="${orb.x}" cy="${orb.y}" r="${orb.r}"/>
      ${t === 'night' ? `<circle cx="${orb.x - 12}" cy="${orb.y - 6}" r="${orb.r * 0.8}" fill="var(--sky-1)"/>` : ''}
      ${t !== 'night' ? cloud(120, 60, 1.1, 'c1') + cloud(700, 36, 0.8, 'c2') + cloud(1100, 120, 0.9, 'c3') : ''}
      <g class="far">${skyline(11, 360, 40, 150, 22, 54, false)}</g>
      <g class="mid">${skyline(23, 372, 70, 190, 26, 64, night)}
        <path d="M40 372V150L94 112V372Z"/><path class="band" d="M40 190H94M40 230H94M40 270H94" />
      </g>
      <g class="towers">
        <path d="M185 380 L190 152 L194 152 L199 380Z"/><line x1="192" y1="152" x2="192" y2="34" stroke="var(--tower)" stroke-width="2.4"/>
        <circle cx="192" cy="140" r="25"/><ellipse class="tband" cx="192" cy="140" rx="25" ry="7"/>
        <circle cx="192" cy="232" r="14"/><ellipse class="tband" cx="192" cy="232" rx="14" ry="4"/>
        <path d="M236 380 L240 192 L244 192 L248 380Z"/><circle cx="242" cy="182" r="13"/><ellipse class="tband" cx="242" cy="182" rx="13" ry="3.6"/><line x1="242" y1="170" x2="242" y2="112" stroke="var(--tower)" stroke-width="2"/>
        <path d="M276 380 L279.6 214 L281.4 214 L285 380Z"/><line x1="280.5" y1="214" x2="280.5" y2="170" stroke="var(--tower)" stroke-width="1.6"/>
      </g>
      <rect class="fog" x="0" y="170" width="1440" height="250" fill="url(#fog)"/>
      <g class="near">${skyline(41, 400, 24, 100, 34, 80, false)}</g>
    </svg>`;
  }

  // ---------- حافلة KPTC (تواجه اليسار) ----------
  function bus(cls = '') {
    let dia = ''; for (let i = 0; i < 9; i++) dia += `<path d="M${46 + i * 22} 58l11-11 11 11-11 11z" />`;
    return `<svg class="bus ${cls}" viewBox="0 0 270 108" aria-hidden="true" focusable="false">
      <ellipse cx="135" cy="101" rx="118" ry="5" fill="#000" opacity=".22"/>
      <rect x="6" y="12" width="258" height="72" rx="16" fill="#fff"/>
      <path d="M6 62h258v8a14 14 0 0 1-14 14H20a14 14 0 0 1-14-14z" fill="#2e6fd8"/>
      <g fill="#fff" opacity=".9">${dia}</g>
      <rect x="14" y="20" width="36" height="32" rx="7" fill="#9fd0ff"/><path d="M18 24h16l-9 24h-7z" fill="#fff" opacity=".35"/>
      <rect x="58" y="22" width="34" height="24" rx="4" fill="#9fd0ff"/><rect x="98" y="22" width="34" height="24" rx="4" fill="#9fd0ff"/><rect x="138" y="22" width="34" height="24" rx="4" fill="#9fd0ff"/>
      <rect x="178" y="22" width="34" height="24" rx="4" fill="#9fd0ff"/><rect x="218" y="22" width="34" height="24" rx="4" fill="#9fd0ff"/>
      <rect x="6" y="52" width="20" height="9" rx="4" fill="#ffc933"/><rect x="236" y="50" width="22" height="8" rx="4" fill="#e23b3b"/>
      <text x="136" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="#2e6fd8" font-family="Reem Kufi, sans-serif" letter-spacing="2">KPTC</text>
      <g class="wheel"><circle cx="60" cy="86" r="15" fill="#14133a"/><circle cx="60" cy="86" r="6" fill="#d7d6ee"/><path d="M60 74v24M48 86h24" stroke="#d7d6ee" stroke-width="2"/></g>
      <g class="wheel"><circle cx="206" cy="86" r="15" fill="#14133a"/><circle cx="206" cy="86" r="6" fill="#d7d6ee"/><path d="M206 74v24M194 86h24" stroke="#d7d6ee" stroke-width="2"/></g>
    </svg>`;
  }

  // ---------- أيقونات الخدمات (مرسومة على لوحة ملوّنة؛ currentColor = لون الخط) ----------
  const wheel = (x, y) => `<g class="a-wheel"><circle cx="${x}" cy="${y}" r="8" fill="#14133a"/><circle cx="${x}" cy="${y}" r="3" fill="#ffc933"/><path d="M${x} ${y - 6}v12M${x - 6} ${y}h12" stroke="#ffc933" stroke-width="1.4"/></g>`;
  const wins = (xs, y, w, h, o) => xs.map(x => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="currentColor" opacity="${o}"/>`).join('');
  const icons = {
    subscriptions: `<svg viewBox="0 0 120 90"><g class="a-card"><rect x="20" y="22" width="66" height="44" rx="8" fill="#fff"/><rect x="20" y="32" width="66" height="9" fill="currentColor" opacity=".35"/><rect x="28" y="49" width="24" height="5" rx="2.5" fill="currentColor" opacity=".5"/><circle cx="74" cy="54" r="6.5" fill="#ffc933"/></g><g class="a-waves" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"><path d="M95 36q9 11 0 22" opacity=".95"/><path d="M103 29q14 18 0 36" opacity=".6"/></g></svg>`,
    charter: `<svg viewBox="0 0 120 90"><g class="a-bus"><rect x="8" y="26" width="104" height="38" rx="10" fill="#fff"/><rect x="8" y="49" width="104" height="7" fill="currentColor" opacity=".45"/>${wins([15, 39, 57, 75], 32, 15, 13, '.32')}<path class="a-star" d="M97 31l2.7 5.4 6 .9-4.3 4.2 1 5.9-5.4-2.8-5.4 2.8 1-5.9-4.3-4.2 6-.9z" fill="#ffc933"/>${wheel(34, 66)}${wheel(88, 66)}</g></svg>`,
    ads: `<svg viewBox="0 0 120 90"><g class="a-bus"><rect x="8" y="30" width="104" height="36" rx="10" fill="#fff"/><g fill="currentColor" opacity=".55"><path d="M20 48l8-8 8 8-8 8z"/><path d="M40 48l8-8 8 8-8 8z"/><path d="M60 48l8-8 8 8-8 8z"/><path d="M80 48l8-8 8 8-8 8z"/></g>${wheel(34, 68)}${wheel(88, 68)}</g><g class="a-sparks" fill="#ffc933"><path d="M18 16l2.5 6.5 6.5 2.5-6.5 2.5L18 34l-2.5-6.5L9 25l6.5-2.5z"/><path d="M98 10l1.8 4.7 4.7 1.8-4.7 1.8L98 23l-1.8-4.7-4.7-1.8 4.7-1.8z" opacity=".8"/></g></svg>`,
    towing: `<svg viewBox="0 0 120 90"><g class="a-truck"><rect x="8" y="42" width="62" height="16" rx="4" fill="#fff"/><path d="M72 34h18l12 14v12H72z" fill="#fff"/><path d="M78 38h10l8 9H78z" fill="currentColor" opacity=".35"/><path class="a-boom" d="M26 42L56 14" stroke="#ffc933" stroke-width="6" stroke-linecap="round"/><g class="a-hook"><path d="M56 14v22" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M56 36q-6 0-6 5t6 4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g>${wheel(26, 62)}${wheel(58, 62)}${wheel(90, 62)}</g></svg>`,
    workshop: `<svg viewBox="0 0 120 90"><g class="a-gear"><circle cx="46" cy="46" r="19" fill="none" stroke="#fff" stroke-width="11" stroke-dasharray="7.4 7.4"/><circle cx="46" cy="46" r="14" fill="#fff"/><circle cx="46" cy="46" r="6" fill="currentColor" opacity=".5"/></g><g class="a-wrench" transform="rotate(38 82 46)"><rect x="77" y="26" width="10" height="46" rx="5" fill="#ffc933"/><path d="M71 22a11 11 0 1 1 22 0v8H71z" fill="#ffc933"/><rect x="78" y="14" width="8" height="12" fill="currentColor" opacity=".9"/></g></svg>`,
    other: `<svg viewBox="0 0 120 90"><g class="a-chat1"><path d="M22 20h50a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H44l-14 11V56h-8a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" fill="#fff"/><circle cx="36" cy="38" r="3.4" fill="currentColor" opacity=".55"/><circle cx="48" cy="38" r="3.4" fill="currentColor" opacity=".55"/><circle cx="60" cy="38" r="3.4" fill="currentColor" opacity=".55"/></g><g class="a-chat2"><path d="M70 50h26a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-4v9l-11-9H70a8 8 0 0 1-8-8V58a8 8 0 0 1 8-8z" fill="#ffc933"/></g></svg>`,
  };
  const lines = {
    subscriptions: ['#2f6fe0', '#1c4cb4'], charter: ['#6c47d8', '#46299f'], ads: ['#f0901f', '#c4600a'],
    towing: ['#dc4a40', '#a52a26'], workshop: ['#17a37b', '#0c7152'], other: ['#3a37a8', '#16144a'],
  };
  const lineOf = id => lines[id] || lines.other;
  const icon = id => icons[id] || icons.other;
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const num = n => String(n).replace(/\d/g, d => AR[d]);

  window.KArt = { tod, scene, bus, icon, lineOf, num };
})();
