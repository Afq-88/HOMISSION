/* عامل خدمة بسيط: يجعل التطبيق قابلًا للتثبيت على الشاشة الرئيسية، ويحتفظ بالقشرة الثابتة فقط.
   لا يخزّن أي استجابة من /api (بيانات العملاء لا تُحفظ في المتصفح). */
const V = 'tm-v3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname === '/healthz') return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(ch => ch.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then(m => m || new Response('لا يوجد اتصال بالإنترنت', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))));
});
