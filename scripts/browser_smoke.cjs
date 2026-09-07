// Optional QA dependency is isolated under qa/. No runtime dependency is shipped.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '../qa/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const catalog = require('../demo/catalog.js');
const core = require('../demo/core.js');

(async () => {
  const base = process.env.DEMO_URL || 'http://127.0.0.1:8766/';
  const parsed = new URL(base);
  assert.ok(parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname), 'QA target must be loopback HTTP');
  const output = path.resolve(__dirname, '../work/browser-demo');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const results = []; const failures = []; const external = [];
  async function check(name, fn) { await fn(); results.push(name); console.log(`PASS ${name}`); }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) failures.push(message.text()); });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base) || url.startsWith('blob:') || url.startsWith('file:')) return route.continue();
    external.push(url); return route.abort();
  });
  try {
    await page.goto(base); await page.locator('#prompt').waitFor();
    await check('complete active library loads with bounded first-page rendering', async () => {
      assert.equal(catalog.length, 918);
      assert.equal(await page.locator('#techniques button').count(), 50);
      assert.match(await page.locator('#library-count').textContent(), /918/);
      assert.match(await page.locator('#coverage-summary').textContent(), /378/);
      assert.match(await page.locator('#prompt').inputValue(), /DRAFT · NOT VALIDATED/);
    });
    await check('first, next and last pages make every record reachable', async () => {
      await page.locator('#page-next').click();
      assert.equal(await page.locator('#techniques button').first().getAttribute('data-id'), catalog[50].id);
      await page.locator('#page-last').click();
      assert.equal(await page.locator('#techniques button').count(), 18);
      assert.equal(await page.locator('#techniques button').last().getAttribute('data-id'), catalog[917].id);
      await page.locator('#techniques button').last().click();
      assert.equal(await page.locator('#technique-id').textContent(), catalog[917].id);
      await page.locator('#page-first').click();
      assert.equal(await page.locator('#techniques button').first().getAttribute('data-id'), catalog[0].id);
    });
    await check('search and empty-state reset work', async () => {
      await page.locator('#search').fill('T1053.005'); assert.equal(await page.locator('#techniques button').count(), 1);
      assert.equal(await page.locator('#technique-title').textContent(), 'Scheduled Task');
      await page.locator('#search').fill('not-a-technique'); assert.equal(await page.locator('#empty-results').isVisible(), true);
      assert.equal(await page.locator('#export-library').isDisabled(), true);
      await page.locator('#clear-filters').click(); assert.equal(await page.locator('#techniques button').count(), 50);
    });
    await check('all domains and source metadata are usable', async () => {
      await page.locator('[data-domain="Mobile"]').click(); assert.equal(await page.locator('#techniques button').count(), 50);
      assert.match(await page.locator('#domain-count').textContent(), /124/);
      await page.locator('[data-domain="ICS"]').click(); assert.equal(await page.locator('#techniques button').count(), 50);
      assert.match(await page.locator('#domain-count').textContent(), /97/);
      await page.locator('#platform').selectOption('__unspecified__');
      const unspecifiedCount = core.filterTechniques(catalog,{domain:'ICS',platform:'__unspecified__'}).length;
      assert.equal(await page.locator('#techniques button').count(), Math.min(50, unspecifiedCount));
      assert.equal(await page.locator('#result-count').textContent(), `${unspecifiedCount} matches`);
      await page.locator('[data-domain="Enterprise"]').click();
      await page.locator('#tactic').selectOption('Credential Access');
      assert.equal(await page.locator('#techniques button').count(), Math.min(50,core.filterTechniques(catalog,{domain:'Enterprise',tactic:'Credential Access'}).length));
      await page.locator('#tactic').selectOption('');
    });
    await check('complete linked source guidance is visible and included in the prompt', async () => {
      await page.locator('#search').fill('T1059.001');
      const record = catalog.find(item=>item.id === 'T1059.001');
      await page.locator('#tab-source').click();
      assert.equal(await page.locator('#source-behavior').textContent(), record.behavior);
      assert.ok((await page.locator('#strategies').textContent()).includes(record.strategies[0].analytics[0].description));
      assert.ok((await page.locator('#procedure-count').textContent()).includes(String(record.procedureCount)));
      await page.locator('#tab-prompt').click();
      assert.ok((await page.locator('#prompt').inputValue()).includes(record.strategies[0].analytics[0].description));
      await page.locator('#search').fill('');
    });
    await check('mode and target change the generated prompt', async () => {
      await page.locator('#techniques button').first().click();
      await page.locator('#mode').selectOption('hunt'); await page.locator('#target').selectOption('Sentinel KQL');
      const text = await page.locator('#prompt').inputValue(); assert.match(text, /hunting hypothesis/); assert.match(text, /Sentinel KQL/);
    });
    await check('edited drafts survive selection and configuration changes', async () => {
      await page.locator('#prompt').fill('A manually edited draft.');
      await page.locator('#mode').selectOption('triage'); await page.locator('#mode').selectOption('hunt');
      assert.equal(await page.locator('#prompt').inputValue(), 'A manually edited draft.');
      await page.locator('#techniques button').nth(1).click(); await page.locator('#techniques button').first().click();
      assert.equal(await page.locator('#prompt').inputValue(), 'A manually edited draft.');
    });
    await check('literal HTML and variable-shaped input remain inert', async () => {
      await page.locator('.context-box > summary').click();
      const payload = '<img src=x onerror="window.demoInjected=true"> ${HOME} [[SCHEMA]]';
      await page.locator('#context').fill(payload);
      const pendingExport = page.waitForEvent('download');
      await page.locator('#export-library').click();
      const beforeApply = await pendingExport;
      assert.equal(fs.readFileSync(await beforeApply.path(), 'utf8').includes('demoInjected'), false, 'Context is pending until Apply');
      page.once('dialog', dialog => dialog.accept()); await page.locator('#apply-context').click();
      assert.ok((await page.locator('#prompt').inputValue()).includes(payload));
      assert.equal(await page.evaluate(() => Boolean(window.demoInjected)), false);
      assert.equal(await page.locator('img[src="x"]').count(), 0);
    });
    await check('copy denial has a usable manual-copy fallback', async () => {
      // Test-only permission simulation; no user clipboard content is read.
      await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Test denial'); }; });
      await page.locator('#copy').click(); assert.match(await page.locator('#action-status').textContent(), /Clipboard unavailable/);
    });
    await check('text download preserves the exact edited draft', async () => {
      const expected = await page.locator('#prompt').inputValue();
      const pending = page.waitForEvent('download'); await page.locator('#download').click(); const download = await pending;
      assert.match(download.suggestedFilename(), /^T\d{4}(\.\d{3})?-hunt-draft\.txt$/);
      assert.equal(fs.readFileSync(await download.path(), 'utf8'), expected);
    });
    await check('JSONL exports filtered full-library templates without editor changes', async () => {
      await page.locator('#search').fill('T1059.001');
      await page.locator('#prompt').fill('An editor-only note, excluded from batch export.');
      const pending = page.waitForEvent('download'); await page.locator('#export-library').click(); const download = await pending;
      const lines = fs.readFileSync(await download.path(), 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(lines.length, 1); assert.equal(lines[0].sample, false); assert.equal(lines[0].status, 'draft');
      assert.equal(lines[0].technique_id, 'T1059.001');
      assert.equal(lines[0].prompt.includes('An editor-only note'), false);
      await page.locator('#search').fill('');
    });
    await check('detail tabs support arrow-key navigation', async () => {
      await page.locator('#tab-prompt').focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#panel-source').isVisible(), true);
      await page.keyboard.press('End'); assert.equal(await page.locator('#panel-review').isVisible(), true);
      await page.keyboard.press('Home'); assert.equal(await page.locator('#panel-prompt').isVisible(), true);
    });
    await check('about dialog closes with Escape and restores focus', async () => {
      await page.locator('#about-open').click(); assert.equal(await page.locator('#about-dialog').isVisible(), true);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#about-dialog').isVisible(), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'about-open');
    });
    await page.goto(base);
    await check('draft context clears on reload', async () => { assert.equal(await page.locator('#context').inputValue(), ''); assert.equal((await page.locator('#prompt').inputValue()).includes('demoInjected'), false); });
    for (const width of [320, 768, 1024, 1440]) await check(`no horizontal overflow at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('#copy').isVisible(), true);
      await page.screenshot({ path: path.join(output, `demo-${width}.png`), fullPage: true });
    });
    await check('200% text scaling remains within the viewport', async () => {
      // Test-only accessibility preference emulation, restored immediately afterward.
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    });
    await check('reduced-motion preference is supported', async () => { await page.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true); });
    await check('no browser console errors or external requests', async () => { assert.deepEqual(failures, []); assert.deepEqual(external, []); });
    await check('double-click local-file demo also runs', async () => {
      await page.goto(pathToFileURL(path.resolve(__dirname, '../demo/index.html')).href);
      assert.equal(await page.locator('#techniques button').count(), 50);
      assert.match(await page.locator('#prompt').inputValue(), /DRAFT/);
    });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ version:'0.3.0-dev.3', catalogRecords:catalog.length, browser: browser.version(), node: process.version, basePath:parsed.pathname, checks: results, failures, externalRequests: external, limitations: ['No screen-reader audit or complete WCAG certification.', 'Clipboard denial tested; actual platform clipboard success is not asserted.', 'Hosted GitHub Pages and original application were not tested.'] }, null, 2) + '\n');
    console.log(`${results.length} browser checks passed.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
