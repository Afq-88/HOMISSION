// Runtime smoke test: open every page, click every visible button/tab, and record
// uncaught JS errors. Run against the baseline and the redesign; numbers must match.
// usage: node tools/smoke.js <site_dir>
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || '.');
(async () => {
  const b = await chromium.launch();
  const pages = ['index.html', ...fs.readdirSync(root + '/pages').filter(f => f.endsWith('.html')).map(f => 'pages/' + f)];
  let total = 0;
  for (const pg of pages) {
    const ctx = await b.newContext({viewport: {width: 1280, height: 800}});
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message.split('\n')[0]));
    p.on('dialog', d => d.dismiss().catch(() => {}));
    await p.route(/^https?:/, r => r.abort());        // offline: no fonts needed for logic
    await p.goto('file://' + root + '/' + pg);
    await p.waitForTimeout(300);
    const n = await p.evaluate(() => document.querySelectorAll('button,[onclick]').length);
    let clicked = 0;
    for (let i = 0; i < n; i++) {
      const el = p.locator('button,[onclick]').nth(i);
      try {
        if (!(await el.isVisible())) continue;
        const href = await el.evaluate(e => e.tagName === 'A' ? e.getAttribute('href') || '' : '');
        if (href && !href.startsWith('#') && !href.startsWith('javascript')) continue;
        await el.click({timeout: 400, force: true, noWaitAfter: true});
        clicked++;
        if (!p.url().endsWith(pg) && !p.url().includes(pg + '#')) { await p.goto('file://' + root + '/' + pg); await p.waitForTimeout(150); }
      } catch (e) {}
    }
    total += errs.length;
    console.log(pg.padEnd(24), 'controls', String(n).padStart(4), 'clicked', String(clicked).padStart(4), 'errors', errs.length, errs.length ? JSON.stringify([...new Set(errs)].slice(0, 3)) : '');
    await ctx.close();
  }
  console.log('TOTAL ERRORS', total);
  await b.close();
})();
