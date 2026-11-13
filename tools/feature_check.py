#!/usr/bin/env python3
"""Feature-preservation checker.

Compares a baseline copy of the site with the redesigned one and fails if any
functional hook disappeared: element ids, JS function names, inline event
handlers, form controls, links between pages, or postMessage navigation.

usage: python3 tools/feature_check.py <baseline_dir> <new_dir>
"""
import re, sys, glob, os
from collections import Counter

def load(p):
    return open(p, encoding='utf-8').read()

# Content removals requested by the owner (applied to the baseline before comparing)
REWRITES = [('للمهندس عبدالله', 'للإدارة العليا'), ('لـ المهندس عبدالله', 'للإدارة العليا'),
            ('المهندس عبدالله', 'الإدارة العليا'), ('إرسال للمهندس', 'إرسال للإدارة'),
            ('للمديرة', 'للمدير'), ('المديرة', 'المدير'), ('مشرفة التسويق', 'مشرف التسويق')]

def strip_injected(s):
    for a, b in REWRITES:
        s = s.replace(a, b)
    # shared design-system blocks are additive; ignore them
    s = re.sub(r'<!--kptc:core-css-->.*?<!--/kptc:core-css-->', '', s, flags=re.S)
    s = re.sub(r'<!--kptc:core-js-->.*?<!--/kptc:core-js-->', '', s, flags=re.S)
    s = re.sub(r'<!--kptc:head-js-->.*?<!--/kptc:head-js-->', '', s, flags=re.S)
    return s

def facts(s):
    s = strip_injected(s)
    scripts = ''.join(re.findall(r'<script[^>]*>(.*?)</script>', s, re.S))
    html = re.sub(r'<script[^>]*>.*?</script>', '', s, flags=re.S)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.S)
    f = {}
    f['ids'] = Counter(re.findall(r'\sid="([^"]+)"', html))
    f['js_functions'] = Counter(re.findall(r'function\s+([A-Za-z_$][\w$]*)\s*\(', scripts))
    f['js_arrow_consts'] = Counter(re.findall(r'(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>', scripts))
    handlers = re.findall(r'\s(on[a-z]+)="([^"]*)"', html)
    f['handlers'] = Counter(f'{k}={re.sub(r"\s+"," ",v.strip())}' for k, v in handlers)
    f['controls'] = Counter(re.findall(r'<(input|select|textarea|button|form)\b', html))
    f['input_types'] = Counter(re.findall(r'<input[^>]*type="([^"]+)"', html))
    f['page_links'] = Counter(re.findall(r'kptcNav\s*:\s*[\'"](\w+)', s)) + Counter(re.findall(r'href="([^"#][^"]*\.html[^"]*)"', html))
    f['names'] = Counter(re.findall(r'\sname="([^"]+)"', html))
    return f

# Intentional, documented changes (bug fixes) — never feature removals.
ALLOWED = {
    # original called window.scrollTo('#payments') → TypeError; now uses the page's own helper
    ('pages/tenant.html', 'handlers', "onclick=scrollTo('#payments')"),
}

def main(a, b):
    files = sorted(os.path.relpath(p, a) for p in glob.glob(os.path.join(a, '**/*.html'), recursive=True))
    bad = 0
    for rel in files:
        nb = os.path.join(b, rel)
        if not os.path.exists(nb):
            print(f'MISSING FILE {rel}'); bad += 1; continue
        fa, fb = facts(load(os.path.join(a, rel))), facts(load(nb))
        for k in fa:
            lost = fa[k] - fb[k]
            for x in list(lost):
                if (rel, k, x) in ALLOWED:
                    del lost[x]
            if lost:
                bad += 1
                print(f'{rel}: lost {k}: ' + ', '.join(f'{x}×{n}' for x, n in list(lost.items())[:12]))
    print('OK — all functional hooks preserved' if not bad else f'{bad} problem group(s)')
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))
