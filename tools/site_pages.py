#!/usr/bin/env python3
"""Build the v4 pages (account, media, tenders, careers, siteadmin) from src/site/*.html.
Public pages get the same header/footer as the rest of the site (taken from routes.html).
Run before tools/build.py."""
import re, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref = open(os.path.join(ROOT, 'pages/routes.html'), encoding='utf-8').read()
ref = re.sub(r'<!--kptc:[a-z-]+-->.*?<!--/kptc:[a-z-]+-->\n?', '', ref, flags=re.S)
head = ref[ref.index('<div class="k2-util">'):ref.index('</script>', ref.index('function k2Drawer')) + 9].replace(' aria-current="page"', '')
foot = ref[ref.index('<footer class="k2-foot">'):ref.index('</footer>') + 9]
css = open(os.path.join(ROOT, 'src/site/site.css'), encoding='utf-8').read()
for f in sorted(glob.glob(os.path.join(ROOT, 'src/site/*.html'))):
    name = os.path.basename(f)[:-5]; s = open(f, encoding='utf-8').read()
    title = re.search(r'<!--title:(.*?)-->', s).group(1); admin = '<!--chrome:admin-->' in s
    s = re.sub(r'<!--(title|hero|chrome):.*?-->\n?', '', s)
    own = re.search(r'<style>(.*?)</style>', s, re.S); body = s[own.end():] if own else s
    out = ('<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
           f'<title>{title}</title>\n<style>\n{css}{own.group(1) if own else ""}</style>\n</head>\n<body>\n'
           + ('' if admin else head + '\n') + body.strip() + '\n' + ('' if admin else foot + '\n') + '</body>\n</html>\n')
    open(os.path.join(ROOT, 'pages', name + '.html'), 'w', encoding='utf-8').write(out)
    print('built', name)
