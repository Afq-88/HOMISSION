#!/usr/bin/env python3
"""Dev helper: write pages/<page>.html without the injected core/layer blocks to /tmp/strip/<page>.html"""
import re, sys, os
os.makedirs('/tmp/strip', exist_ok=True)
for p in sys.argv[1:]:
    s = open(f'pages/{p}.html', encoding='utf-8').read()
    s = re.sub(r'<!--kptc:[a-z-]+-->.*?<!--/kptc:[a-z-]+-->\n?', '', s, flags=re.S)
    open(f'/tmp/strip/{p}.html', 'w', encoding='utf-8').write(s)
