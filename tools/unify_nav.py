#!/usr/bin/env python3
"""One main menu on every public page: the same links in the same order, «الرئيسية» first.
Idempotent. Also gives the home page the standard header (it had its own, different one)."""
import re, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAV = [('KPTC_Home.html', 'الرئيسية'), ('KPTC_Routes.html', 'الخطوط'), ('KPTC_Subscriptions.html', 'الاشتراكات'), ('KPTC_Umrah.html', 'العمرة'), ('KPTC_VIP.html', 'VIP'),
       ('KPTC_Winch.html', 'الونش'), ('KPTC_Advertising.html', 'أعلن معنا'), ('KPTC_RE_Client.html', 'العقارات')]

def rd(p): return open(p, encoding='utf-8').read()

def nav_html(cur):
    return ''.join('<a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if h == cur else '', t) for h, t in NAV)

def main():
    ads = rd(os.path.join(ROOT, 'pages/routes.html'))
    blk = re.search(r'(<div class="k2-util">.*?</div></div>\n<header class="k2-head">.*?</header>\n<div class="k2-drawer".*?</div></div>\n<script>function k2Drawer.*?</script>)', ads, re.S)
    std = blk.group(1)
    for p in sorted(glob.glob(os.path.join(ROOT, 'pages/*.html'))):
        s = rd(p); name = os.path.basename(p)
        if name == 'home.html' and '<header class="k2-head">' not in s:
            a = s.index('<div class="util">'); b = s.index('<div class="kx-ticker"')
            d = std.replace(' aria-current="page"', '').replace('<a href="KPTC_Home.html">الرئيسية</a>', '<a href="KPTC_Home.html" aria-current="page">الرئيسية</a>')
            s = s[:a] + d + '\n\n' + s[b:]
        def fix(m):
            cur = re.search(r'<a href="([^"]+)"[^>]*aria-current="page"', m.group(2))
            extra = re.findall(r'<a href="(KPTC_(?:LostFound|PDI)\.html)"[^>]*>[^<]*</a>', m.group(2))
            cur = 'KPTC_Home.html' if name == 'home.html' else (cur.group(1) if cur else '')
            return m.group(1) + nav_html(cur) + '</div>'
        s2 = re.sub(r'(<div class="k2-nav"[^>]*>)(.*?)</div>', fix, s, count=1, flags=re.S)
        if s2 != s or name == 'home.html': open(p, 'w', encoding='utf-8').write(s2)
    print('nav unified')
if __name__ == '__main__': main()
