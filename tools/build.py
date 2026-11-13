#!/usr/bin/env python3
"""Inject the shared design-system layer (src/core.css + src/core.js) into every page.

Pages stay self-contained single files (no extra folders to upload). Re-run after
editing anything in src/. Idempotent: replaces the blocks between kptc:core markers.

usage: python3 tools/build.py
"""
import re, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css = open(os.path.join(ROOT, 'src/core.css'), encoding='utf-8').read()
js = open(os.path.join(ROOT, 'src/core.js'), encoding='utf-8').read()
CSS_BLOCK = '<!--kptc:core-css--><style id="kptc-core">\n' + css + '</style><!--/kptc:core-css-->'
store = open(os.path.join(ROOT, 'src/store.js'), encoding='utf-8').read()
HEAD_BLOCK = '<!--kptc:head-js--><script id="kptc-store">\n' + store + '</script><!--/kptc:head-js-->'
JS_BLOCK = '<!--kptc:core-js--><script id="kptc-core-js">\n' + js + '</script><!--/kptc:core-js-->'

def inject(html):
    html = re.sub(r'<!--kptc:core-css-->.*?<!--/kptc:core-css-->\n?', '', html, flags=re.S)
    html = re.sub(r'<!--kptc:core-js-->.*?<!--/kptc:core-js-->\n?', '', html, flags=re.S)
    html = re.sub(r'<!--kptc:head-js-->.*?<!--/kptc:head-js-->\n?', '', html, flags=re.S)
    # core first so each page's own sheet can refine it
    m = re.search(r'<style', html) or re.search(r'</head>', html)
    html = html[:m.start()] + HEAD_BLOCK + '\n' + CSS_BLOCK + '\n' + html[m.start():]
    i = html.rfind('</body>')
    html = html[:i] + JS_BLOCK + '\n' + html[i:]
    return html

import json
DECOR = json.load(open(os.path.join(ROOT, 'src/decorate.json'), encoding='utf-8'))

def decorate(html, page):
    """Add design-system classes to existing elements (by one of their class tokens).
    Additive only: never removes or renames a class, id or attribute."""
    for token, extra in DECOR.get(page, {}).items():
        def add(m):
            classes = m.group(2).split()
            for c in extra.split():
                if c not in classes:
                    classes.append(c)
            return m.group(1) + ' '.join(classes) + m.group(3)
        html = re.sub(r'(<[a-zA-Z][^<>]*?\sclass=")([^"]*\b' + re.escape(token) + r'\b[^"]*)(")',
                      lambda m: add(m) if token in m.group(2).split() else m.group(0), html)
    return html

def page_layer(html, page):
    """Per-page redesign layer from src/pages/<page>.css, placed after the page's own styles."""
    html = re.sub(r'<!--kptc:page-css-->.*?<!--/kptc:page-css-->\n?', '', html, flags=re.S)
    f = os.path.join(ROOT, 'src/pages', page + '.css')
    if not os.path.exists(f):
        return html
    css = open(f, encoding='utf-8').read()
    if page == 'home':   # home's stylesheet was rewritten wholesale
        return re.sub(r'(<style id="kptc-page">).*?(</style>)', lambda m: m.group(1) + '\n' + css + m.group(2), html, flags=re.S)
    i = html.find('</head>')
    return html[:i] + '<!--kptc:page-css--><style id="kptc-layer">\n' + css + '</style><!--/kptc:page-css-->\n' + html[i:]

if __name__ == '__main__':
    for p in sorted(glob.glob(os.path.join(ROOT, 'pages/*.html'))):
        page = os.path.basename(p)[:-5]
        s = open(p, encoding='utf-8').read()
        s = page_layer(decorate(inject(s), page), page)
        open(p, 'w', encoding='utf-8').write(s)
    print('core injected into', len(glob.glob(os.path.join(ROOT, 'pages/*.html'))), 'pages')
