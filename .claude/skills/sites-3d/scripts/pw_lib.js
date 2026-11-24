// Playwright helpers for testing a 3D web app (Sites 3D skill).
// Usage:  const { open, check } = require('./pw_lib');
//         const T = await open({ url: 'http://localhost:8765/index.html' });
//         check('grid shows 15', (await T.ev('app.total()')) === 15);
//         await T.shot('wall'); await T.done();
// Works with the Chromium preinstalled in Claude Code cloud sessions (no "playwright install").
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

let passed = 0, failed = 0;
// Prints one PASS/FAIL line per check; summary printed by done().
exports.check = (name, cond, extra) => {
  if (cond) passed++; else failed++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : ''));
};

exports.open = async (opts = {}) => {
  // Software WebGL so the 3D stage renders without a GPU.
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 860 },
    colorScheme: opts.scheme || 'dark',
    reducedMotion: opts.reduced ? 'reduce' : 'no-preference',
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  await page.goto(opts.url || process.env.APP_URL || 'http://localhost:8765/index.html');
  if (!opts.keepStorage) { await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} }); await page.reload(); }
  const outDir = opts.outDir || path.join(process.cwd(), 'tests', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  return {
    browser, page, errs,
    ev: (expr) => page.evaluate(expr),
    shot: (name) => page.screenshot({ path: path.join(outDir, name + '.png') }),
    // Click a radio that sits inside a styled <label>: clicking the input itself is intercepted.
    radio: (name, value) => page.locator('label:has(input[name="' + name + '"][value="' + value + '"])').click(),
    // Wait for a camera transition instead of a fixed sleep (expression must become truthy).
    until: (expr, timeout = 15000) => page.waitForFunction(expr, null, { timeout }),
    // Save a download the page triggers and return its text.
    download: async (trigger) => { const [d] = await Promise.all([page.waitForEvent('download'), trigger()]); return { name: d.suggestedFilename(), text: fs.readFileSync(await d.path(), 'utf8') }; },
    done: async () => {
      console.log(errs.length ? errs.join('\n') : 'no page errors');
      console.log('SUMMARY ' + passed + ' passed, ' + failed + ' failed');
      await browser.close();
    },
  };
};
