// Shared helpers for the acceptance scripts (Playwright + Chromium).
// Start the app first:  python server.py   (or set AEGISWALL_URL)
const { chromium } = require('playwright');
exports.open = async (opts = {}) => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 860 }, colorScheme: opts.scheme || 'dark', acceptDownloads: true, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  await page.goto(opts.url || process.env.AEGISWALL_URL || 'http://localhost:8765/index.html');
  if (!opts.keep) { await page.evaluate(() => localStorage.clear()); await page.reload(); }
  const api = {
    browser, page, errs,
    shot: (n) => page.screenshot({ path: __dirname + '/out/' + n + '.png' }),
    ev: (expr) => page.evaluate(expr),
    login: async (who = 'admin') => { await page.click('[data-demo="' + who + '"]'); await page.waitForTimeout(350); if (await page.locator('#intro-skip').isVisible()) await page.click('#intro-skip'); await page.waitForTimeout(500); },
    mode: async (m) => { await page.locator('label:has(input[value="' + m + '"])').click(); if (m === 'edit') await page.waitForFunction(() => AW.stage.aligned() && AW.stage.settled(), null, { timeout: 15000 }); else await page.waitForTimeout(2500); },
    done: async () => { console.log(errs.join('\n') || 'no page errors'); await browser.close(); },
  };
  return api;
};
