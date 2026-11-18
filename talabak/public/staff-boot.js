(function () {
  'use strict';
  const ST = window.ST;
  function parse() {
    const h = (location.hash || '#/').replace(/^#\/?/, '');
    if (!h) return ['', null];
    const parts = h.split('/');
    if (parts[0] === 'r') return ['r', parts[1]];
    return [parts.join('/'), null];
  }
  async function route() {
    if (!ST.me) return;
    if (ST.cleanup) { ST.cleanup(); ST.cleanup = null; }
    ST.shell();
    const [name, arg] = parse();
    const fn = ST.routes[name];
    if (!fn || (name.startsWith('admin/') && !ST.isAdmin())) { ST.app.innerHTML = '<div class="notice bad">الصفحة غير متاحة.</div>'; return; }
    try { await fn(arg); } catch (e) { if (e.status === 401 || (e.data && e.data.must_change)) return; ST.app.innerHTML = `<div class="notice bad" role="alert">${ST.esc(e.message)}</div>`; }
    window.scrollTo(0, 0);
  }
  ST.start = async function () {
    if (ST.me && ST.me.must_change) return ST.renderMustChange();
    try { ST.cfg = await ST.api('GET', '/api/staff/config'); } catch (e) { return; }
    if (!location.hash) location.hash = '#/';
    route();
  };
  window.addEventListener('hashchange', route);
  (async function init() {
    try { const r = await ST.api('GET', '/api/auth/me'); if (r.user) { ST.me = r.user; ST.start(); } else ST.renderLogin(); }
    catch (e) { ST.app.innerHTML = `<div class="notice bad">${ST.esc(e.message)}</div>`; }
  })();
})();
