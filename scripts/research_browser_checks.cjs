const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function researchChecks({ page, base, check, output, screenshot = options => page.screenshot(options) }) {
  const downloaded = async selector => {
    const pending = page.waitForEvent('download');
    await page.locator(selector).click();
    const download = await pending;
    return JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  };
  await page.goto(new URL('research.html', base).href);
  await page.locator('#research-content').waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await screenshot({ path: path.join(output, 'research-overview.png') });
  await check('research tools load offline with exact domain coverage and Navigator exports', async () => {
    for (const [domain, count] of [['Enterprise', 697], ['Mobile', 124], ['ICS', 97]]) {
      await page.locator('#coverage-domain').selectOption(domain);
      assert.match(await page.locator('#coverage-counts').textContent(), new RegExp(`${count} generated · 0 reviewed · 0 lab-validated`));
      const layer = await downloaded('#navigator-export');
      assert.equal(layer.domain, `${domain.toLowerCase()}-attack`);
      assert.equal(new Set(layer.techniques.map(item => item.techniqueID)).size, count);
      assert.equal(layer.versions.layer, '4.5');
    }
  });
  await check('CAR exact mappings expose source hypotheses and honest unmapped ICS state', async () => {
    assert.match(await page.locator('#car-results').textContent(), /CAR-\d{4}/);
    await page.locator('#car-results details').first().locator('summary').click();
    assert.ok(await page.locator('#car-results pre').count() > 0);
    await page.locator('#car-technique').fill('T0800'); await page.locator('#car-find').click();
    assert.match(await page.locator('#car-results').textContent(), /0 exact CAR mappings/);
  });
  await check('Attack Flow authoring supports keyboard-safe reorder, remove and real export', async () => {
    await page.locator('#flow-name').fill('Synthetic research hypothesis');
    for (const id of ['T1059.001', 'T1053.005', 'T1003']) {
      await page.locator('#flow-search').fill(id); await page.locator('#flow-choice').selectOption(id); await page.locator('#flow-add').click();
    }
    await page.getByRole('button', { name: 'Move up: step 2, T1053.005', exact: true }).click();
    assert.match(await page.locator('.flow-step').first().textContent(), /T1053\.005/);
    assert.equal(await page.evaluate(() => document.activeElement.tagName === 'BUTTON' && !document.activeElement.disabled), true);
    await page.getByRole('button', { name: 'Remove: step 3, T1003', exact: true }).click();
    const bundle = await downloaded('#flow-export');
    assert.equal(bundle.type, 'bundle');
    assert.equal(bundle.objects.filter(item => item.type === 'attack-action').length, 2);
    assert.match(bundle.objects.find(item => item.type === 'attack-flow').description, /hypothes/i);
  });
  await check('manual observable assessment preserves literal evidence and unverified status', async () => {
    for (const key of ['telemetry', 'observable', 'rationale', 'benignContext', 'evidenceReference']) await page.locator(`#assessment-${key}`).fill(`Synthetic ${key} <script>not executed</script>`);
    const result = await downloaded('#assessment-export');
    assert.equal(result.status, 'manual-unverified');
    assert.match(result.assessment.observable, /<script>not executed<\/script>/);
    assert.equal(await page.locator('script:not([src])').count(), 0);
  });
  let plan; let envelope;
  await check('lab plan and template bind actual canonical prompt hashes without exporting prompts', async () => {
    await page.locator('#lab-title-input').fill('Synthetic isolated test');
    await page.locator('#lab-authorization').fill('SYNTHETIC-LAB-001');
    plan = await downloaded('#lab-plan'); envelope = await downloaded('#lab-template');
    assert.match(plan.planId, /^sha256:[a-f0-9]{64}$/);
    assert.equal(plan.records.length, 2); assert.equal(envelope.planId, plan.planId);
    assert.equal(Object.hasOwn(plan.records[0], 'prompt'), false);
    assert.equal(envelope.results[0].fixtureSha256, null);
  });
  const upload = async value => {
    await page.locator('#lab-file').setInputFiles({ name: 'synthetic-results.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  };
  await check('lab import rejects incomplete templates and secret/native fields, accepts only structural evidence', async () => {
    await upload(envelope);
    await page.waitForFunction(() => document.getElementById('lab-status').textContent.startsWith('Import rejected:'));
    const completed = structuredClone(envelope);
    for (const row of completed.results) { row.fixtureSha256 = 'a'.repeat(64); row.runSha256 = 'b'.repeat(64); row.status = 'not-run'; }
    await upload({ ...completed, api_key: 'SYNTHETIC_NOT_A_REAL_KEY' });
    await page.waitForFunction(() => document.getElementById('lab-file').value === '');
    assert.match(await page.locator('#lab-status').textContent(), /Import rejected/);
    await upload(completed); await page.locator('#lab-result').waitFor();
    const result = JSON.parse(await page.locator('#lab-result').textContent());
    assert.equal(result.evidenceStatus, 'unverified'); assert.equal(result.validationLevel, 'generated');
    await page.locator('#lab-authorization').fill('SYNTHETIC-LAB-002');
    assert.equal(await page.locator('#lab-template').isDisabled(), true);
    assert.equal(await page.locator('#lab-file').isDisabled(), true);
    assert.equal(await page.locator('#lab-result').isVisible(), false);
  });
  for (const width of [320, 768, 1024, 1440]) await check(`research tools fit ${width}px with visible labeled controls`, async () => {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#coverage').scrollIntoViewIfNeeded();
    await screenshot({ path: path.join(output, `research-${width}.png`), fullPage: true });
  });
  await check('research high contrast and local-file loading remain usable', async () => {
    await page.locator('#research-theme').selectOption('contrast');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'contrast');
    const { pathToFileURL } = require('node:url');
    await page.goto(pathToFileURL(path.resolve(__dirname, '../demo/research.html')).href);
    await page.locator('#research-content').waitFor();
    assert.match(await page.locator('#coverage-counts').textContent(), /697 generated/);
  });
};
