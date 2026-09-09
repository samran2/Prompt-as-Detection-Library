// Optional QA dependency is isolated under qa/. No runtime dependency is shipped.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '../qa/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const catalog = require('../demo/catalog.js');
const atlasCatalog = require('../demo/atlas-catalog.js');
const combinedCatalog = [...catalog, ...atlasCatalog];
const core = require('../demo/core.js');
const defenses = require('../demo/defenses.js').createLibrary(require('../demo/d3fend-catalog.js'));
const project = require('../package.json');

function contrastRatio(first, second) {
  const channels = value => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const luminance = value => {
    const linear = channels(value).map(channel => {
      const normalized = channel / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

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
      assert.equal(atlasCatalog.length, 197);
      assert.equal(await page.locator('#techniques button').count(), 50);
      assert.match(await page.locator('#library-count').textContent(), /1115/);
      assert.match(await page.locator('#coverage-summary').textContent(), /Enterprise 697.*Mobile 124.*ICS 97.*ATLAS AI 197/);
      assert.match(await page.locator('#prompt').inputValue(), /DRAFT · NOT VALIDATED/);
    });
    await check('first, next and last pages make every record reachable', async () => {
      await page.locator('#page-next').click();
      assert.equal(await page.locator('#techniques button').first().getAttribute('data-id'), catalog[50].id);
      await page.locator('#page-last').click();
      assert.equal(await page.locator('#techniques button').count(), combinedCatalog.length % 50);
      assert.equal(await page.locator('#techniques button').last().getAttribute('data-id'), combinedCatalog.at(-1).id);
      await page.locator('#techniques button').last().click();
      assert.equal(await page.locator('#technique-id').textContent(), combinedCatalog.at(-1).id);
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
      const icsFirstId = await page.locator('#techniques button').first().getAttribute('data-id');
      await page.locator('[data-domain="OT"]').click();
      assert.equal(await page.locator('#techniques button').first().getAttribute('data-id'), icsFirstId);
      assert.match(await page.locator('#domain-count').textContent(), /97/);
      assert.equal(new URL(page.url()).searchParams.get('domain'), 'OT');
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
    await check('ATLAS AI filtering and parent/subtechnique search reach pinned records', async () => {
      await page.goto(base);
      await page.locator('[data-domain="ATLAS"]').click();
      await page.locator('#target').selectOption('Platform-neutral');
      assert.equal(await page.locator('#techniques button').count(), 50);
      assert.match(await page.locator('#domain-count').textContent(), /197/);
      assert.equal(await page.locator('#result-count').textContent(), '197 matches');
      await page.locator('#page-last').click();
      assert.equal(await page.locator('#techniques button').count(), 47);
      assert.equal(await page.locator('#techniques button').last().getAttribute('data-id'), atlasCatalog.at(-1).id);
      await page.locator('#page-first').click();
      const pending = page.waitForEvent('download');
      await page.locator('#export-library').click();
      const exported = fs.readFileSync(await (await pending).path(), 'utf8');
      assert.deepEqual(exported.trim().split('\n').map(line => JSON.parse(line).technique_id), atlasCatalog.map(record => record.id));
      assert.equal(exported, core.exportJSONL(atlasCatalog, { mode: 'detect', target: 'Platform-neutral', context: '' }));
      await page.locator('#search').fill('AML.T0051');
      assert.deepEqual(await page.locator('#techniques button').evaluateAll(nodes => nodes.map(node => node.dataset.id)),
        ['AML.T0051', 'AML.T0051.000', 'AML.T0051.001', 'AML.T0051.002']);
      assert.equal(await page.locator('#technique-title').textContent(), 'LLM Prompt Injection');
      await page.locator('#search').fill('AML.T0051.001');
      assert.equal(await page.locator('#techniques button').count(), 1);
      assert.equal(await page.locator('#technique-id').textContent(), 'AML.T0051.001');
      assert.match(await page.locator('#prompt').inputValue(), /MITRE ATLAS 2026\.08/);
      assert.match(await page.locator('#prompt').inputValue(), /DRAFT · NOT VALIDATED/);
    });
    await check('ATLAS source attribution and threat maturity do not imply project validation', async () => {
      const record = atlasCatalog.find(item => item.id === 'AML.T0051.001');
      await page.locator('#tab-source').click();
      assert.equal(await page.locator('#source-behavior').textContent(), record.behavior);
      assert.equal(await page.locator('#source-link').getAttribute('href'), record.sourceUrl);
      assert.equal(new URL(record.sourceUrl).hostname, 'atlas.mitre.org');
      assert.equal(await page.locator('#attack-source-context').isVisible(), false);
      assert.equal(await page.locator('#atlas-source-context').isVisible(), true);
      assert.ok((await page.locator('#atlas-source-maturity').textContent()).includes(record.sourceMaturity));
      assert.match(await page.locator('#atlas-source-maturity').textContent(), /not validation/);
      assert.match(await page.locator('#validation-level').textContent(), /Generated · not reviewed/);
      assert.match(await page.locator('#provenance-summary').textContent(), /MITRE ATLAS 2026\.08/);
      assert.equal(await page.locator('#atlas-case-studies details').count(), record.caseStudies.length);
      assert.equal(await page.locator('#atlas-mitigations details').count(), record.mitigations.length);
      await page.locator('#tab-map').click();
      assert.match(await page.locator('#relationship-text').textContent(), /ATLAS source relationships/);
      assert.match(await page.locator('#relationship-text').textContent(), /unvalidated draft target/);
      await page.locator('#tab-prompt').click();
    });
    await check('ATLAS context is literal, local and included only after Apply', async () => {
      const payload = '<img src=x onerror="window.atlasInjected=true"> ${ATLAS_TEST_SECRET} [[SCHEMA]]';
      await page.locator('.context-box > summary').click();
      await page.locator('#context').fill(payload);
      assert.equal((await page.locator('#prompt').inputValue()).includes(payload), false);
      await page.locator('#apply-context').click();
      assert.ok((await page.locator('#prompt').inputValue()).includes(payload));
      assert.equal(await page.evaluate(() => Boolean(window.atlasInjected)), false);
      assert.equal(await page.locator('img[src="x"]').count(), 0);
      assert.equal(page.url().includes('ATLAS_TEST_SECRET'), false);
    });
    await check('ATLAS TXT download preserves exact UTF-8 editor bytes', async () => {
      const expected = (await page.locator('#prompt').inputValue()) + '\nAnalyst edit: ääkköset and AI context.';
      await page.locator('#prompt').fill(expected);
      const pending = page.waitForEvent('download');
      await page.locator('#download').click();
      const download = await pending;
      assert.equal(download.suggestedFilename(), 'AML.T0051.001-detect-draft.txt');
      assert.deepEqual(fs.readFileSync(await download.path()), Buffer.from(expected, 'utf8'));
    });
    await check('ATLAS JSONL and research downloads carry source identity and generated status', async () => {
      const record = atlasCatalog.find(item => item.id === 'AML.T0051.001');
      const contextValue = await page.locator('#context').inputValue();
      const options = { mode: 'detect', target: 'Platform-neutral', context: contextValue };
      const pendingBatch = page.waitForEvent('download');
      await page.locator('#export-library').click();
      const batchDownload = await pendingBatch;
      const batchBytes = fs.readFileSync(await batchDownload.path());
      assert.deepEqual(batchBytes, Buffer.from(core.exportJSONL([record], options), 'utf8'));
      const rows = batchBytes.toString('utf8').trim().split('\n').map(JSON.parse);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].technique_id, record.id);
      assert.equal(rows[0].framework, 'ATLAS');
      assert.equal(rows[0].atlas_version, '2026.08');
      assert.equal(rows[0].validation_status, 'generated');
      assert.equal(rows[0].prompt.includes('Analyst edit:'), false);
      assert.ok(rows[0].prompt.includes(contextValue));
      const pendingResearch = page.waitForEvent('download');
      await page.locator('#export-research').click();
      const researchDownload = await pendingResearch;
      assert.equal(researchDownload.suggestedFilename(), 'AML.T0051.001-research-record.json');
      const researchBytes = fs.readFileSync(await researchDownload.path());
      assert.deepEqual(researchBytes, Buffer.from(core.exportResearchJSON([record], options), 'utf8'));
      const exported = JSON.parse(researchBytes);
      assert.equal(exported.records[0].technique.framework, 'ATLAS');
      assert.equal(exported.records[0].provenance.atlas_version, '2026.08');
      assert.equal(Object.hasOwn(exported.records[0].provenance, 'attack_version'), false);
      assert.equal(exported.records[0].validation.level, 'generated');
      assert.equal(exported.records[0].validation.lab_validated, false);
      assert.equal(exported.records[0].relationships.case_studies.length, record.caseStudies.length);
    });
    await check('ATT&CK and ATLAS comparison survives a private-context-free URL roundtrip', async () => {
      await page.locator('#compare-add').click();
      await page.locator('#clear-active-filters').click();
      await page.locator('#search').fill('T1059.001');
      await page.locator('#compare-add').click();
      assert.equal(await page.locator('#panel-compare').isVisible(), true);
      assert.match(await page.locator('#comparison-body').textContent(), /MITRE ATLAS 2026\.08/);
      assert.match(await page.locator('#comparison-body').textContent(), /MITRE ATT&CK 19\.2/);
      await page.locator('#clear-active-filters').click();
      await page.locator('[data-domain="ATLAS"]').click();
      await page.locator('#search').fill('AML.T0051.001');
      await page.locator('#tab-prompt').click();
      // No clipboard content is inspected: denial exercises the documented address-bar fallback.
      await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Test denial'); }; });
      await page.locator('#share-view').click();
      assert.match(await page.locator('#action-status').textContent(), /Copy the current address/);
      const shared = page.url();
      const params = new URL(shared).searchParams;
      assert.equal(params.get('domain'), 'ATLAS');
      assert.equal(params.get('technique'), 'AML.T0051.001');
      assert.equal(params.get('compare'), 'AML.T0051.001,T1059.001');
      assert.equal(shared.includes('ATLAS_TEST_SECRET'), false);
      assert.equal(shared.includes('Analyst'), false);
      await page.goto(shared);
      assert.equal(await page.locator('#technique-id').textContent(), 'AML.T0051.001');
      assert.equal(await page.locator('[data-domain="ATLAS"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#context').inputValue(), '');
      assert.equal((await page.locator('#prompt').inputValue()).includes('ATLAS_TEST_SECRET'), false);
      assert.equal((await page.locator('#prompt').inputValue()).includes('Analyst edit:'), false);
      await page.locator('#tab-compare').click();
      assert.equal(await page.locator('#compare-count').textContent(), '2');
      assert.match(await page.locator('#comparison-body').textContent(), /MITRE ATLAS.*MITRE ATT&CK/s);
      await page.locator('#tab-prompt').click();
    });
    for (const width of [320, 1440]) await check(`ATLAS detail and mixed-framework comparison fit ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(output, `atlas-${width}.png`), fullPage: true });
      await page.locator('#tab-compare').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(output, `atlas-comparison-${width}.png`), fullPage: true });
      await page.locator('#tab-prompt').click();
    });
    await check('D3FEND renders pinned countermeasures, source paths and explicit inferred scope', async () => {
      await page.goto(base);
      await page.locator('#search').fill('T0800');
      const record = catalog.find(item => item.id === 'T0800');
      const expected = defenses.lookup(record.id);
      assert.equal(expected.status, 'mapped');
      const originalPrompt = await page.locator('#prompt').inputValue();
      await page.locator('#tab-defenses').click();
      assert.equal(await page.locator('#panel-defenses').isVisible(), true);
      assert.equal(await page.locator('.defense-card').count(), expected.techniques.length);
      assert.match(await page.locator('#defenses-caveat').textContent(), /inferred.*not evidence of effectiveness/s);
      assert.match(await page.locator('#defenses-version').textContent(), /D3FEND 1\.6\.0/);
      const first = expected.techniques[0];
      const card = page.locator('.defense-card').first();
      assert.ok((await card.textContent()).includes(first.definition));
      await card.locator('summary').click();
      const text = await card.textContent();
      for (const value of [first.paths[0].defenseArtifact, first.paths[0].offenseArtifact,
        first.paths[0].defenseRelation, first.paths[0].offenseRelation, first.paths[0].queryLabel, first.paths[0].topLabel]) assert.ok(text.includes(value));
      assert.equal(await card.locator('a').getAttribute('href'), first.url);
      assert.equal(await page.locator('#prompt').inputValue(), originalPrompt);
      assert.match(await page.locator('#library-count').textContent(), /1115/);
    });
    await check('D3FEND TXT and JSON downloads match shared UTF-8 output without analyst context', async () => {
      const record = catalog.find(item => item.id === 'T0800');
      await page.locator('#tab-prompt').click();
      await page.locator('.context-box > summary').click();
      await page.locator('#context').fill('PRIVATE_D3FEND_TEST_CONTEXT ${HOME}');
      await page.locator('#apply-context').click();
      await page.locator('#prompt').fill('PRIVATE_D3FEND_TEST_EDITOR');
      await page.locator('#tab-defenses').click();
      for (const [selector, filename, expected] of [
        ['#download-defense-brief', 'T0800-d3fend-brief-draft.txt', defenses.composeBrief(record)],
        ['#export-defenses', 'T0800-d3fend-context.json', defenses.exportJSON(record)],
      ]) {
        const pending = page.waitForEvent('download');
        await page.locator(selector).click();
        const download = await pending;
        const bytes = fs.readFileSync(await download.path());
        assert.equal(download.suggestedFilename(), filename);
        assert.deepEqual(bytes, Buffer.from(expected, 'utf8'));
        assert.equal(bytes.toString('utf8').includes('PRIVATE_D3FEND_TEST'), false);
      }
      assert.match(await page.locator('#defenses-action-status').textContent(), /context.*not included/i);
    });
    for (const width of [320, 1440]) await check(`D3FEND cards and exact source paths fit ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const tree = await page.locator('#panel-defenses').ariaSnapshot();
      assert.match(tree, /heading "Explore related countermeasures\." \[level=3\]/);
      assert.match(tree, /button "Download defense brief \(\.txt\)"/);
      for (const button of await page.locator('.defense-actions button').all()) {
        const box = await button.boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44, 'D3FEND touch targets must be at least 44px square');
      }
      await page.locator('h1').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `d3fend-${width}.png`), fullPage: true });
      await page.locator('#panel-defenses h3').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `d3fend-detail-${width}.png`) });
    });
    await check('D3FEND exposes unmapped Mobile and ATLAS records without inheriting other relationships', async () => {
      for (const id of ['T1404', 'AML.T0051']) {
        await page.locator('#search').fill(id);
        assert.equal(await page.locator('#technique-id').textContent(), id);
        assert.equal(await page.locator('.defense-card').count(), 0);
        assert.match(await page.locator('#defenses-summary').textContent(), /No exact mapping/);
        assert.match(await page.locator('#defenses-results').textContent(), /does not mean.*no defense/s);
        assert.equal(await page.locator('#export-defenses').isDisabled(), false);
      }
    });
    await check('invalid supplemental data is unavailable while core browsing remains usable', async () => {
      const isolated = await context.newPage();
      try {
        await isolated.route('**/d3fend-catalog.js', route => route.fulfill({
          contentType: 'text/javascript', body: 'globalThis.PAD_D3FEND_CATALOG = {schemaVersion:"invalid"};',
        }));
        await isolated.goto(base);
        await isolated.locator('#tab-defenses').click();
        assert.match(await isolated.locator('#defenses-summary').textContent(), /unavailable/i);
        assert.equal(await isolated.locator('#download-defense-brief').isDisabled(), true);
        assert.equal(await isolated.locator('#export-defenses').isDisabled(), true);
        assert.match(await isolated.locator('#prompt').inputValue(), /DRAFT/);
        assert.match(await isolated.locator('#library-count').textContent(), /1115/);
      } finally { await isolated.close(); }
    });
    await check('D3FEND source rendering rejects unsafe URLs and keeps HTML source text inert', async () => {
      const isolated = await context.newPage();
      try {
        // Test-only supplemental renderer input: the source helper has its own strict validation tests.
        const injection = `const realCreate = PAD_DEFENSES.createLibrary;
          PAD_DEFENSES.createLibrary = function(catalog) {
            const library = realCreate(catalog), lookup = library.lookup;
            library.lookup = function(id) {
              const result = lookup(id);
              result.sourceUrl = 'https://d3fend.mitre.org.evil.example/';
              result.licenseUrl = 'javascript:alert(1)';
              result.techniques.forEach((item, index) => {
                item.definition = '<img src=x onerror="window.d3fendInjected=true"> literal';
                item.url = index % 2 ? 'https://user@d3fend.mitre.org/' : 'javascript:alert(1)';
              });
              return result;
            };
            return library;
          };`;
        await isolated.route('**/app.js', route => route.fulfill({
          contentType: 'text/javascript', body: injection + '\n' + fs.readFileSync(path.resolve(__dirname, '../demo/app.js'), 'utf8'),
        }));
        await isolated.goto(base);
        await isolated.locator('#search').fill('T0800');
        await isolated.locator('#tab-defenses').click();
        assert.equal(await isolated.locator('#panel-defenses a').count(), 0);
        assert.ok((await isolated.locator('.defense-card').first().textContent()).includes('<img src=x'));
        assert.equal(await isolated.locator('img[src="x"]').count(), 0);
        assert.equal(await isolated.evaluate(() => Boolean(window.d3fendInjected)), false);
      } finally { await isolated.close(); }
    });
    await check('detail tabs support arrow-key navigation', async () => {
      await page.locator('#tab-prompt').focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#panel-source').isVisible(), true);
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#panel-defenses').isVisible(), true);
      await page.keyboard.press('End'); assert.equal(await page.locator('#panel-review').isVisible(), true);
      await page.keyboard.press('Home'); assert.equal(await page.locator('#panel-prompt').isVisible(), true);
    });
    await check('about dialog closes with Escape and restores focus', async () => {
      await page.locator('#about-open').click(); assert.equal(await page.locator('#about-dialog').isVisible(), true);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#about-dialog').isVisible(), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'about-open');
    });
    await check('skip link and primary controls expose visible keyboard focus', async () => {
      await page.goto(base);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
      const skipBox = await page.locator('.skip').boundingBox();
      assert.ok(skipBox && skipBox.y >= 0);
      await page.locator('#copy').focus();
      const outline = await page.locator('#copy').evaluate(node => getComputedStyle(node).outlineStyle);
      assert.notEqual(outline, 'none');
    });
    await check('heading order and filter relationships remain explicit', async () => {
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('#search').getAttribute('aria-controls'), 'techniques');
      assert.equal(await page.locator('.domains').getAttribute('aria-controls'), 'techniques');
      assert.equal(await page.locator('#tactic').getAttribute('aria-controls'), 'techniques');
      assert.equal(await page.locator('#platform').getAttribute('aria-controls'), 'techniques');
      const accessibilityTree = await page.locator('main').ariaSnapshot();
      assert.match(accessibilityTree, /heading "Detection workbench" \[level=1\]/);
      assert.match(accessibilityTree, /list "Matching techniques"/);
      assert.match(accessibilityTree, /tablist "Technique detail"/);
      assert.match(accessibilityTree, /textbox "EDITABLE TEXT PROMPT"/);
    });
    await check('light, dark and high-contrast themes preserve readable primary actions', async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const theme of ['light', 'dark', 'contrast']) {
        await page.locator('#theme').selectOption(theme);
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        const colors = await page.locator('#copy').evaluate(node => {
          const style = getComputedStyle(node);
          return { foreground: style.color, background: style.backgroundColor };
        });
        assert.ok(contrastRatio(colors.foreground, colors.background) >= 4.5, `${theme} primary action contrast must be at least 4.5:1`);
        const navigationColors = await page.locator('.nav-item.current').evaluate(node => {
          const style = getComputedStyle(node);
          return { foreground: style.color, background: style.backgroundColor };
        });
        assert.ok(contrastRatio(navigationColors.foreground, navigationColors.background) >= 4.5, `${theme} navigation contrast must be at least 4.5:1`);
        const statusColors = await page.locator('#action-status').evaluate(node => ({
          foreground: getComputedStyle(node).color,
          background: getComputedStyle(document.querySelector('main')).backgroundColor,
        }));
        assert.ok(contrastRatio(statusColors.foreground, statusColors.background) >= 4.5, `${theme} status contrast must be at least 4.5:1`);
      }
      await page.locator('#theme').selectOption('system');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    });
    await page.goto(base);
    await check('draft context clears on reload', async () => { assert.equal(await page.locator('#context').inputValue(), ''); assert.equal((await page.locator('#prompt').inputValue()).includes('demoInjected'), false); });
    for (const width of [320, 768, 1024, 1440]) await check(`no horizontal overflow at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('#copy').isVisible(), true);
      await page.screenshot({ path: path.join(output, `demo-${width}.png`), fullPage: true });
    });
    await check('compact layouts keep key touch targets at least 44px square', async () => {
      await page.setViewportSize({ width: 320, height: 1000 });
      for (const selector of ['#theme', '.domains button', '.page-controls button', '#compare-add', '.actions button:visible']) {
        for (const box of await page.locator(selector).evaluateAll(nodes => nodes.filter(node => !node.disabled).map(node => {
          const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height };
        }))) {
          assert.ok(box.width >= 44 && box.height >= 44, `${selector} touch target is ${box.width}×${box.height}`);
        }
      }
    });
    await check('200% text scaling remains within the viewport', async () => {
      // Test-only accessibility preference emulation, restored immediately afterward.
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    });
    await check('reduced-motion preference is supported', async () => { await page.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true); });
    await check('double-click local-file demo also runs', async () => {
      await page.goto(pathToFileURL(path.resolve(__dirname, '../demo/index.html')).href);
      assert.equal(await page.locator('#techniques button').count(), 50);
      assert.match(await page.locator('#prompt').inputValue(), /DRAFT/);
      await page.locator('[data-domain="ATLAS"]').click();
      await page.locator('#search').fill('AML.T0051.001');
      assert.equal(await page.locator('#technique-id').textContent(), 'AML.T0051.001');
      assert.match(await page.locator('#prompt').inputValue(), /MITRE ATLAS 2026\.08/);
    });
    await check('no browser console errors or external requests', async () => { assert.deepEqual(failures, []); assert.deepEqual(external, []); });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ version:project.version, catalogRecords:combinedCatalog.length, attackRecords:catalog.length, atlasRecords:atlasCatalog.length, browser: browser.version(), node: process.version, basePath:parsed.pathname, checks: results, failures, externalRequests: external, limitations: ['No screen-reader audit or complete WCAG certification.', 'Clipboard denial tested; actual platform clipboard success is not asserted.', 'Hosted GitHub Pages and original application were not tested.'] }, null, 2) + '\n');
    console.log(`${results.length} browser checks passed.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
