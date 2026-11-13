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
JS_BLOCK = '<!--kptc:core-js--><script id="kptc-core-js">\n' + js + '</script><!--/kptc:core-js-->'

def inject(html):
    html = re.sub(r'<!--kptc:core-css-->.*?<!--/kptc:core-css-->\n?', '', html, flags=re.S)
    html = re.sub(r'<!--kptc:core-js-->.*?<!--/kptc:core-js-->\n?', '', html, flags=re.S)
    # core first so each page's own sheet can refine it
    m = re.search(r'<style', html) or re.search(r'</head>', html)
    html = html[:m.start()] + CSS_BLOCK + '\n' + html[m.start():]
    i = html.rfind('</body>')
    html = html[:i] + JS_BLOCK + '\n' + html[i:]
    return html

if __name__ == '__main__':
    for p in sorted(glob.glob(os.path.join(ROOT, 'pages/*.html'))):
        s = open(p, encoding='utf-8').read()
        open(p, 'w', encoding='utf-8').write(inject(s))
    print('core injected into', len(glob.glob(os.path.join(ROOT, 'pages/*.html'))), 'pages')
