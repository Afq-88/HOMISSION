#!/usr/bin/env python3
"""One-time visual migration of a legacy KPTC page into the new design language.

Applied to the baseline pages once. It changes presentation only — never ids,
classes, handlers or script logic:
  * re-maps the generic UI palette (Tailwind-like greens/reds/purples) onto the
    KPTC palette, and the cold off-whites onto the warm "ticket paper" tone
  * flattens linear/radial gradients to the first solid stop (conic charts stay)
  * replaces soft "glow" shadows with the crisp elevation tokens
  * tightens corner radii to the signage scale (4 / 6 / 8 px)
  * points every font stack at the design-system fonts
  * drops letter-spacing on Arabic text (it breaks the joined script)
  * removes the legacy k2 chrome stylesheet (the core layer now owns it)
"""
import re, sys

COLOR_MAP = {
    # status / accents
    '#10b981': '#1E7F55', '#059669': '#1E7F55', '#0f766e': '#1E7F55', '#1fa971': '#1E7F55',
    '#ef4444': '#C2352E', '#dc2626': '#C2352E', '#d93c42': '#C2352E', '#991b1b': '#8E241F',
    '#f59e0b': '#C77A12', '#d97706': '#C77A12', '#c2410c': '#B4561B',
    '#3b82f6': '#2E5AAC', '#1d4ed8': '#2E5AAC',
    '#8b5cf6': '#4B49A6', '#7c3aed': '#4B49A6',
    # inks
    '#06102a': '#14133A', '#060e30': '#14133A', '#0b1535': '#14133A', '#0a0f24': '#14133A',
    '#060c24': '#0E0D2B', '#0c1547': '#1F1D5C',
    # surfaces & lines
    '#f5f5fa': '#F3F2EC', '#f2f5fc': '#F3F2EC', '#f4f7fd': '#F3F2EC', '#fafbff': '#FAF9F5',
    '#deddec': '#E0DED4', '#e2e8f5': '#E0DED4',
    # golds collapse to one
    '#d4a017': '#C9971A', '#c9a227': '#C9971A', '#d9a21b': '#C9971A',
}
RGB_MAP = {
    '16,185,129': '30,127,85', '5,150,105': '30,127,85',
    '239,68,68': '194,53,46', '220,38,38': '194,53,46',
    '245,158,11': '199,122,18', '217,119,6': '199,122,18',
    '59,130,246': '46,90,172',
    '139,92,246': '75,73,166', '124,58,237': '75,73,166',
    '6,16,42': '20,19,58',
}

def remap_colors(s):
    def hx(m):
        v = m.group(0).lower()
        return COLOR_MAP.get(v, m.group(0))
    s = re.sub(r'#[0-9a-fA-F]{6}\b', hx, s)
    def rg(m):
        key = re.sub(r'\s+', '', m.group(2))
        return m.group(1) + RGB_MAP.get(key, m.group(2))
    return re.sub(r'(rgba?\()(\s*\d+\s*,\s*\d+\s*,\s*\d+)', rg, s)

def _args(s, i):
    """s[i] == '(' ; return index after matching ')'."""
    depth = 0
    for j in range(i, len(s)):
        if s[j] == '(':
            depth += 1
        elif s[j] == ')':
            depth -= 1
            if depth == 0:
                return j + 1
    return len(s)

def _split_top(arg):
    out, depth, cur = [], 0, ''
    for ch in arg:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return [x.strip() for x in out]

def flatten_gradients(s):
    out, i = [], 0
    pat = re.compile(r'(?:repeating-)?(linear|radial)-gradient\(')
    while True:
        m = pat.search(s, i)
        if not m:
            out.append(s[i:]); break
        out.append(s[i:m.start()])
        end = _args(s, m.end() - 1)
        parts = _split_top(s[m.end():end - 1])
        if m.group(1) == 'radial':
            rep = 'transparent'
        else:
            stops = [p for p in parts if not re.match(r'^(to\s|-?[\d.]+deg|-?[\d.]+turn)', p)]
            first = stops[0] if stops else 'transparent'
            # drop a trailing position ("#fff 40%")
            first = re.sub(r'\s+-?[\d.]+(%|px)?(\s+-?[\d.]+(%|px)?)?$', '', first)
            rep = first
        out.append(rep)
        i = end
    return ''.join(out)

def tame_shadows(css):
    def fix(m):
        val = m.group(2)
        if val.strip() in ('none', 'inherit', 'initial') or 'var(' in val:
            return m.group(0)
        if re.search(r'255\s*,\s*201\s*,\s*60|rgba\(\s*201\s*,\s*151', val):  # yellow glows
            return m.group(1) + 'none'
        blurs = [float(b) for b in re.findall(r'-?[\d.]+px\s+-?[\d.]+px\s+([\d.]+)px', val)]
        if 'inset' in val and not blurs:
            return m.group(0)
        if blurs and max(blurs) >= 30:
            return m.group(1) + 'var(--sh-3)'
        if blurs and max(blurs) >= 10:
            return m.group(1) + 'var(--sh-2)'
        return m.group(0)
    return re.sub(r'(box-shadow\s*:\s*)([^;}]+)', fix, css)

def tame_radii(css):
    def one(v):
        n = float(v)
        if n <= 4: return v
        if n < 10: return '4'
        if n < 19: return '6'
        return '8'
    def fix(m):
        val = re.sub(r'(\d+(?:\.\d+)?)px', lambda x: one(x.group(1)) + 'px', m.group(2))
        return m.group(1) + val
    return re.sub(r'(border-radius\s*:\s*)([^;}]+)', fix, css)

def fonts(css):
    def fix(m):
        v = m.group(2)
        if re.search(r'inherit|var\(|monospace|Courier|Consolas|Menlo', v):
            return m.group(0)
        return m.group(1) + 'var(--f-body)'
    css = re.sub(r'(font-family\s*:\s*)([^;}]+)', fix, css)
    # font shorthand with a stack ("font:700 15px/1 -apple-system, ...")
    css = re.sub(r'(font\s*:\s*[^;{}]*?)(-apple-system[^;}]*)', r'\1var(--f-body)', css)
    return css

def arabic_spacing(css):
    """Positive letter-spacing tears Arabic letters apart; keep it only for Latin caps/mono."""
    def rule(r):
        body = r.group(2)
        if 'uppercase' in body or 'direction:ltr' in body or 'monospace' in body:
            return r.group(0)
        return r.group(1) + re.sub(r'letter-spacing\s*:\s*(?!0[;}\s]|-|normal)[\d.]+(px|em|rem)', 'letter-spacing:0', body) + '}'
    return re.sub(r'([^{}]+\{)([^{}]*)\}', rule, css)

def calm_hover(css):
    """Cards that float up on hover are a template tell; keep the colour change, drop the lift."""
    def rule(r):
        if ':hover' not in r.group(1):
            return r.group(0)
        body = re.sub(r'transform\s*:\s*(?:translate[XY]?\([^)]*\)\s*|scale\([^)]*\)\s*)+(?=[;}]|$)', 'transform:none', r.group(2))
        return r.group(1) + body + '}'
    return re.sub(r'([^{}]+\{)([^{}]*)\}', rule, css)

def migrate_style(css):
    css = calm_hover(css)
    css = arabic_spacing(css)
    css = tame_shadows(css)
    css = tame_radii(css)
    css = fonts(css)
    return css

def migrate(html):
    blocks = list(re.finditer(r'(<style[^>]*>)(.*?)(</style>)', html, re.S))
    for b in reversed(blocks):
        css = b.group(2)
        body = re.sub(r'@media[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}', '', css)
        rules = re.findall(r'([^{}]+)\{', body)
        if rules and all('k2-' in r or r.strip() in (':root','html,body','body') for r in rules):
            html = html[:b.start()] + html[b.end():]   # legacy chrome sheet -> owned by core
            continue
        html = html[:b.start()] + b.group(1) + migrate_style(css) + b.group(3) + html[b.end():]
    # data, not decoration: tags whose event handlers carry colour values (colour
    # pickers) are left byte-for-byte untouched
    keep = {}
    def protect(m):
        k = f'\x00{len(keep)}\x00'; keep[k] = m.group(0); return k
    html = re.sub(r'<[a-zA-Z][^<>]*\son[a-z]+="[^"]*(?:#[0-9a-fA-F]{3,8}|gradient)[^"]*"[^<>]*>', protect, html)
    html = flatten_gradients(html)
    html = remap_colors(html)
    for k, v in keep.items():
        html = html.replace(k, v)
    return html

if __name__ == '__main__':
    for p in sys.argv[1:]:
        s = open(p, encoding='utf-8').read()
        open(p, 'w', encoding='utf-8').write(migrate(s))
        print('migrated', p)
