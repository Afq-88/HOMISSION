#!/usr/bin/env python3
"""Prepare phone-wallet passes for KPTC staff IDs (run by the administrator, on the administrator's own computer).

Why this is a tool and not part of the web page: a wallet pass must be signed with a private key that belongs to
the company. That key must never be inside the website, so the passes are signed here and the finished, harmless
files are published as static files in /passes (Firebase Hosting, free).

Input: the studio's backup JSON (مركز الإدارة ← إعدادات عامة ← «نسخة من الإعدادات»  or localStorage 'kptc.db.v2').
It only needs the "staff" object.

  Apple Wallet  (needs an Apple Developer account, 99 USD / year; there is no free route for iPhone):
      python3 tools/wallet_pass.py apple  --db backup.json --site https://kptc-4ea83.web.app \
          --pass-type pass.com.kptc.staff --team ABCDE12345 --cert pass.pem --key pass.key --wwdr wwdr.pem
      -> passes/<EMPLOYEE-ID>.pkpass   (the portal button finds them by name)

  Google Wallet (free: Google Pay & Wallet Console -> issuer ID, and a service account key):
      python3 tools/wallet_pass.py google --db backup.json --site https://kptc-4ea83.web.app \
          --issuer 3388000000012345678 --sa service-account.json
      -> passes/google.json  ({employee id: "Add to Google Wallet" link})

Both need only Python 3 and the openssl command (present on macOS, Linux and Cloud Shell). Add --barcode to print the
verification QR on the pass (off by default: the card design has no barcode).
"""
import argparse, base64, hashlib, json, os, struct, subprocess, sys, tempfile, time, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_staff(path):
    d = json.load(open(path, encoding='utf-8'))
    d = d.get('staff') if 'staff' in d else d
    if not isinstance(d, dict):
        sys.exit('no "staff" object found in ' + path)
    return [u for u in d.values() if isinstance(u, dict) and u.get('status', 'active') == 'active']


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def verify_url(u, site):
    d = {'i': u['id'], 'n': u['name'], 't': u.get('title', ''), 'd': u.get('dept', ''), 'j': u.get('joined', ''), 's': 1, 'v': 1}
    return site.rstrip('/') + '/pages/staffid.html#' + b64u(json.dumps(d, ensure_ascii=False, separators=(',', ':')).encode())


def fdate(s):
    p = (s or '').split('-')
    return '/'.join(reversed(p)) if len(p) == 3 else (s or '')


# ---------------------------------------------------------------- Apple
def png(size, text, bg=(255, 201, 60), fg=(20, 19, 58)):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 4, fill=bg + (255,))
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size * .6))
    except Exception:
        f = ImageFont.load_default()
    w = d.textlength(text, font=f); d.text(((size - w) / 2, size * .12), text, font=f, fill=fg + (255,))
    import io
    b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()


def apple(a):
    out = os.path.join(ROOT, 'passes'); os.makedirs(out, exist_ok=True)
    staff = load_staff(a.db); n = 0
    for u in staff:
        files = {
            'pass.json': json.dumps({
                'formatVersion': 1, 'passTypeIdentifier': a.pass_type, 'teamIdentifier': a.team, 'serialNumber': u['id'],
                'organizationName': 'شركة النقل العام الكويتية', 'description': 'هوية موظف KPTC', 'logoText': 'KPTC',
                'foregroundColor': 'rgb(255,255,255)', 'backgroundColor': 'rgb(46,44,120)', 'labelColor': 'rgb(255,201,60)',
                'generic': {
                    'primaryFields': [{'key': 'name', 'label': 'الاسم', 'value': u['name']}],
                    'secondaryFields': [{'key': 'title', 'label': 'المسمى الوظيفي', 'value': u.get('title', '')}, {'key': 'dept', 'label': 'الإدارة', 'value': u.get('dept', '')}],
                    'auxiliaryFields': [{'key': 'id', 'label': 'الرقم الوظيفي', 'value': u['id']}, {'key': 'since', 'label': 'في الخدمة منذ', 'value': fdate(u.get('joined', ''))}],
                    'backFields': [{'key': 'verify', 'label': 'التحقق من الهوية', 'value': verify_url(u, a.site)}, {'key': 'hot', 'label': 'الخط الساخن', 'value': '1880001'}],
                },
                **({'barcodes': [{'format': 'PKBarcodeFormatQR', 'message': verify_url(u, a.site), 'messageEncoding': 'iso-8859-1'}]} if a.barcode else {}),
            }, ensure_ascii=False).encode('utf-8'),
            'icon.png': png(58, 'K'), 'icon@2x.png': png(116, 'K'), 'logo.png': png(50, 'K'), 'logo@2x.png': png(100, 'K'),
        }
        manifest = {k: hashlib.sha1(v).hexdigest() for k, v in files.items()}
        files['manifest.json'] = json.dumps(manifest).encode()
        with tempfile.TemporaryDirectory() as t:
            mp = os.path.join(t, 'manifest.json'); open(mp, 'wb').write(files['manifest.json'])
            sp = os.path.join(t, 'signature')
            cmd = ['openssl', 'smime', '-binary', '-sign', '-certfile', a.wwdr, '-signer', a.cert, '-inkey', a.key, '-in', mp, '-out', sp, '-outform', 'DER']
            if a.key_pass: cmd += ['-passin', 'pass:' + a.key_pass]
            r = subprocess.run(cmd, capture_output=True)
            if r.returncode: sys.exit('openssl failed: ' + r.stderr.decode()[:300])
            files['signature'] = open(sp, 'rb').read()
        path = os.path.join(out, u['id'] + '.pkpass')
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
            for k, v in files.items(): z.writestr(k, v)
        n += 1
    print(n, 'Apple passes written to passes/')


# ---------------------------------------------------------------- Google
def rs256(data, key_pem):
    with tempfile.NamedTemporaryFile('w', suffix='.pem', delete=False) as k:
        k.write(key_pem); kp = k.name
    try:
        r = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', kp], input=data, capture_output=True)
        if r.returncode: sys.exit('openssl failed: ' + r.stderr.decode()[:300])
        return r.stdout
    finally:
        os.unlink(kp)


def google(a):
    out = os.path.join(ROOT, 'passes'); os.makedirs(out, exist_ok=True)
    sa = json.load(open(a.sa, encoding='utf-8')); cls = a.issuer + '.kptc_staff_id'; links = {}
    logo = a.site.rstrip('/') + '/assets/pass-logo.png'
    for u in load_staff(a.db):
        payload = {
            'genericClasses': [{'id': cls}],
            'genericObjects': [{
                'id': a.issuer + '.' + ''.join(ch if ch.isalnum() else '_' for ch in u['id']), 'classId': cls, 'state': 'ACTIVE',
                'cardTitle': {'defaultValue': {'language': 'ar', 'value': 'KPTC · هوية موظف'}},
                'header': {'defaultValue': {'language': 'ar', 'value': u['name']}},
                'subheader': {'defaultValue': {'language': 'ar', 'value': u.get('title', '')}},
                'hexBackgroundColor': '#2E2C78', 'logo': {'sourceUri': {'uri': logo}},
                'textModulesData': [{'id': 'dept', 'header': 'الإدارة', 'body': u.get('dept', '')}, {'id': 'eid', 'header': 'الرقم الوظيفي', 'body': u['id']}, {'id': 'since', 'header': 'في الخدمة منذ', 'body': fdate(u.get('joined', ''))}],
                'linksModuleData': {'uris': [{'uri': verify_url(u, a.site), 'description': 'التحقق من الهوية', 'id': 'verify'}]},
                **({'barcode': {'type': 'QR_CODE', 'value': verify_url(u, a.site)}} if a.barcode else {}),
            }]
        }
        head = b64u(json.dumps({'alg': 'RS256', 'typ': 'JWT'}).encode())
        body = b64u(json.dumps({'iss': sa['client_email'], 'aud': 'google', 'typ': 'savetowallet', 'iat': int(time.time()), 'origins': [a.site.rstrip('/')], 'payload': payload}, ensure_ascii=False).encode())
        sig = b64u(rs256((head + '.' + body).encode(), sa['private_key']))
        links[u['id']] = 'https://pay.google.com/gp/v/save/' + head + '.' + body + '.' + sig
    json.dump(links, open(os.path.join(out, 'google.json'), 'w'), indent=1)
    print(len(links), 'Google Wallet links written to passes/google.json')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    for name in ('apple', 'google'):
        s = sub.add_parser(name); s.add_argument('--db', required=True); s.add_argument('--site', required=True); s.add_argument('--barcode', action='store_true')
    s = sub.choices['apple']
    for k in ('pass-type', 'team', 'cert', 'key', 'wwdr'): s.add_argument('--' + k, required=True)
    s.add_argument('--key-pass', default='')
    s = sub.choices['google']; s.add_argument('--issuer', required=True); s.add_argument('--sa', required=True)
    a = ap.parse_args()
    {'apple': apple, 'google': google}[a.cmd](a)
