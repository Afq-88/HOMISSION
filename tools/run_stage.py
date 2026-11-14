#!/usr/bin/env python3
"""Run selected sections of tools/data_v5.py:  python3 tools/run_stage.py subs [more...]
Sections are the blocks that start with '# ───────────── <name> ─────────────'."""
import re, sys, os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'data_v5.py'), encoding='utf-8').read()
parts = re.split(r'(?m)^# ─+ (.*?) ─+\s*$', src)
prelude = parts[0]; secs = {parts[i].split()[0]: parts[i+1] for i in range(1, len(parts), 2)}
g = {'__file__': os.path.join(here, 'data_v5.py'), '__name__': 'stage'}
exec(compile(prelude, 'prelude', 'exec'), g)
for name in sys.argv[1:]:
    exec(compile(secs[name], name, 'exec'), g)
