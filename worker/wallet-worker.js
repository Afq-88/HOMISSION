/* KPTC — customer wallet pass signer (Cloudflare Workers, free plan).
   The website calls it with the customer's card details and gets back an "Add to Google Wallet" link.
   The private key stays here, as a Worker secret, never in the website.

   Settings (Workers → Settings → Variables):
     GOOGLE_SA   (secret)  the whole service-account JSON from Google Cloud
     ISSUER      (text)    Issuer ID from Google Pay & Wallet Console
     SITE        (text)    https://kptc-4ea83.web.app   (the only site allowed to call this)
   The pass only carries what the customer already sees on their own card; it holds no balance and is not a payment card. */
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
const TIERS = { 'الأوفر': '#E8A800', 'التوفير': '#2E2C78', 'الجهات': '#101028' };

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': origin === env.SITE ? origin : env.SITE, 'Vary': 'Origin', 'Content-Type': 'application/json; charset=utf-8' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    if (origin && origin !== env.SITE) return new Response('{"error":"origin"}', { status: 403, headers: cors });
    const q = new URL(req.url).searchParams, clip = (k, n = 60) => String(q.get(k) || '').slice(0, n);
    const id = clip('id', 40), name = clip('name');
    if (!id || !name) return new Response('{"error":"missing"}', { status: 400, headers: cors });
    const sa = JSON.parse(env.GOOGLE_SA), cls = env.ISSUER + '.kptc_member_card', tier = clip('tier', 20);
    const payload = {
      genericClasses: [{ id: cls }],
      genericObjects: [{
        id: env.ISSUER + '.m_' + id.replace(/[^A-Za-z0-9]/g, '_'), classId: cls, state: 'ACTIVE',
        cardTitle: { defaultValue: { language: 'ar', value: 'KPTC · عضوية' } },
        header: { defaultValue: { language: 'ar', value: name } },
        subheader: { defaultValue: { language: 'ar', value: clip('plan') || tier || 'عضو KPTC' } },
        hexBackgroundColor: TIERS[tier] || '#2E2C78', logo: { sourceUri: { uri: env.SITE + '/assets/pass-logo.png' } },
        textModulesData: [{ id: 'no', header: 'رقم العضوية', body: clip('no') }, { id: 'until', header: 'صالحة حتى', body: clip('until') }, { id: 'hot', header: 'الخط الساخن', body: '1880001' }],
      }],
    };
    const head = enc({ alg: 'RS256', typ: 'JWT' }), body = enc({ iss: sa.client_email, aud: 'google', typ: 'savetowallet', iat: Math.floor(Date.now() / 1000), origins: [env.SITE], payload });
    const pem = sa.private_key.replace(/-----[^-]+-----|\s/g, ''), der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + body));
    return new Response(JSON.stringify({ url: 'https://pay.google.com/gp/v/save/' + head + '.' + body + '.' + b64u(sig) }), { headers: cors });
  },
};
