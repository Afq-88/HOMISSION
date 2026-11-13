#!/usr/bin/env python3
"""Dev helper: print a page's CSS rules whose selector matches a regex, or a markup slice.
usage: inspect.py css <page> <regex> | inspect.py html <page> <start-regex> [chars]"""
import re, sys
mode, page = sys.argv[1], sys.argv[2]
s = open(f'pages/{page}.html', encoding='utf-8').read()
s = re.sub(r'<!--kptc:core-css-->.*?<!--/kptc:core-css-->', '', s, flags=re.S)
s = re.sub(r'<!--kptc:core-js-->.*?<!--/kptc:core-js-->', '', s, flags=re.S)
if mode == 'css':
    css = ''.join(re.findall(r'<style[^>]*>(.*?)</style>', s, re.S))
    rx = re.compile(sys.argv[3])
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel = m.group(1).strip()
        if rx.search(sel): print(sel + '{' + m.group(2).strip() + '}')
else:
    body = re.sub(r'<style[^>]*>.*?</style>', '', s, flags=re.S)
    i = re.search(sys.argv[3], body).start()
    print(body[i:i + int(sys.argv[4] if len(sys.argv) > 4 else 3000)])
