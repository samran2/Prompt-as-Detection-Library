'use strict';
// Optional locked QA tooling; never shipped to the public demo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function premiumChecks({ page: callerPage, browser: suppliedBrowser, base, check, output }) {
  const parsed = new URL(base);
  assert.ok(parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname), 'Premium QA requires an isolated loopback target');
  const browser = suppliedBrowser || callerPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const failures = [], external = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'blob:' || url.origin === parsed.origin && url.pathname.startsWith(parsed.pathname)) return route.continue();
    external.push(url.href); return route.abort();
  });
  context.on('page', child => {
    child.setDefaultTimeout(7000);
    child.on('dialog', dialog => {
      if (dialog.type() === 'beforeunload') return dialog.accept();
      if (child.listenerCount('dialog') === 1) return dialog.dismiss();
    });
    child.on('pageerror', error => failures.push(error.message));
    child.on('console', message => { if (['error', 'warning'].includes(message.type())) failures.push(message.text()); });
  });
  const page = await context.newPage();
  const goto = async (target = base, child = page) => { await child.goto(target); await child.locator('#app-content').waitFor(); };
  const tab = async name => { await page.locator(`#tab-${name}`).click(); };
  const downloadJSON = async (selector, child = page) => {
    const pending = child.waitForEvent('download'); await child.locator(selector).click();
    const downloaded = await pending;
    assert.equal(await downloaded.failure(), null);
    return JSON.parse(fs.readFileSync(await downloaded.path(), 'utf8'));
  };
  const workspace = async (child = page) => {
    if (!await child.locator('#workspace-dialog').isVisible()) await child.locator('#workspace-open').click();
  };
  const closeWorkspace = async (child = page) => { await child.locator('#workspace-close').click(); };
  const snapshot = async (child = page) => { await workspace(child); return downloadJSON('#workspace-export', child); };
  const uploadWorkspace = async (value, child = page) => {
    await workspace(child);
    await child.locator('#workspace-file').setInputFiles({ name: 'synthetic-workspace.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
  };
  try {
    await check('premium OT deep links preserve domain alias and exact selected technique', async () => {
      await goto(new URL('?domain=OT&q=T0800&technique=T0800', base).href);
      assert.equal(await page.locator('#technique-id').textContent(), 'T0800');
      assert.equal(await page.locator('[data-domain="OT"]').getAttribute('aria-pressed'), 'true');
      assert.equal(new URL(page.url()).searchParams.get('domain'), 'OT');
      assert.match(await page.locator('#prompt').inputValue(), /DRAFT/);
    });
    await check('premium desk exposes four coherent tabs and keyboard command search', async () => {
      assert.deepEqual(await page.getByRole('tab').allTextContents(), ['Prompt', 'Evidence', 'Defenses', 'Flow']);
      const commandBox = await page.locator('#command-open').boundingBox();
      const shortcutBox = await page.locator('#command-open kbd').boundingBox();
      assert.ok(commandBox && shortcutBox && shortcutBox.x >= commandBox.x && shortcutBox.x + shortcutBox.width <= commandBox.x + commandBox.width,
        'Command shortcut badge must stay inside its button instead of overlapping Appearance');
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
      await page.locator('#command-dialog').waitFor();
      assert.equal(await page.locator('#command-search').evaluate(node => node === document.activeElement), true);
      await page.locator('#command-search').fill('T1059.001');
      await page.locator('#command-results button').first().click();
      assert.equal(await page.locator('#technique-id').textContent(), 'T1059.001');
      assert.equal(await page.locator('#command-dialog').isVisible(), false);
      await page.locator('#tab-prompt').focus(); await page.keyboard.press('/');
      assert.equal(await page.locator('#search').evaluate(node => node === document.activeElement), true);
      await page.locator('#prompt').fill('Slash stays in editor'); await page.keyboard.press('/');
      assert.equal(await page.locator('#command-dialog').isVisible(), false);
      assert.match(await page.locator('#prompt').inputValue(), /\/$/);
    });
    await check('premium Evidence shows exact CAR analytics and honest unmapped OT context', async () => {
      await goto(new URL('?q=T1059.001&technique=T1059.001', base).href); await tab('source');
      const evidence = page.locator('#desk-car-results');
      assert.match(await evidence.textContent(), /CAR-2014-04-003/);
      assert.match(await evidence.textContent(), /exact CAR mappings/);
      await goto(new URL('?domain=OT&q=T0800&technique=T0800', base).href); await tab('source');
      assert.match(await evidence.textContent(), /0 exact CAR mappings/);
    });
    await check('premium Flow survives technique changes and exports the authored sequence', async () => {
      await goto(new URL('?q=T1059.001&technique=T1059.001', base).href); await tab('flow');
      await page.locator('#desk-flow-title').fill('Synthetic persistent flow'); await page.locator('#desk-flow-add').click();
      await page.locator('#search').fill('T1053.005'); await page.locator('#desk-flow-add').click();
      assert.equal(await page.locator('#desk-flow-steps .flow-step').count(), 2);
      await page.locator('#search').fill('T1003');
      assert.equal(await page.locator('#desk-flow-steps .flow-step').count(), 2);
      const exported = await downloadJSON('#desk-flow-export');
      assert.deepEqual(exported.objects.filter(item => item.type === 'attack-action').map(item => item.technique_id), ['T1059.001', 'T1053.005']);
      assert.match(exported.objects.find(item => item.type === 'attack-flow').description, /hypothesis/);
    });
    await check('premium separator supports keyboard resizing and reset', async () => {
      await page.locator('.layout-settings > summary').click();
      const separator = page.locator('#pane-resize');
      const before = Number(await separator.inputValue());
      await separator.focus(); await page.keyboard.press('ArrowRight');
      assert.ok(Number(await separator.inputValue()) > before);
      await page.keyboard.press('Home'); assert.equal(await separator.inputValue(), '240');
      await page.keyboard.press('End'); assert.equal(await separator.inputValue(), '480');
      await page.locator('#pane-reset').click(); assert.equal(Number(await separator.inputValue()), before);
    });

    // Workspace round-trip and persistence checks below are exercised only through
    // isolated UI and downloaded synthetic data, never a user's browser profile.
    await check('premium workspaces do not persist without explicit consent', async () => {
      await goto(); await workspace();
      assert.equal(await page.locator('#workspace-autosave').isChecked(), false);
      await page.locator('#workspace-name').fill('Synthetic unsaved workspace'); await closeWorkspace();
      await page.locator('#prompt').fill('Synthetic draft that must clear on reload');
      await page.reload(); await page.locator('#app-content').waitFor();
      assert.notEqual(await page.locator('#prompt').inputValue(), 'Synthetic draft that must clear on reload');
      await workspace(); assert.equal(await page.locator('#workspace-autosave').isChecked(), false); await closeWorkspace();
    });

    let exportedWorkspace;
    const editedDraft = 'Synthetic edited draft <script>not executed</script> ääkköset';
    const appliedContext = 'Synthetic applied telemetry context ${LOCAL_TEST}';
    const pendingContext = 'Synthetic pending context, not yet applied';
    await check('premium workspace export preserves drafts, both contexts, favorites, collections and flow', async () => {
      await goto(new URL('?q=T1059.001&technique=T1059.001', base).href);
      await page.locator('#target').selectOption('Platform-neutral');
      await page.locator('.context-box > summary').click();
      await page.locator('#context').fill(appliedContext); await page.locator('#apply-context').click();
      await page.locator('#prompt').fill(editedDraft); await page.locator('#context').fill(pendingContext);
      await page.locator('#favorite-toggle').click();
      await workspace(); await page.locator('#workspace-name').fill('Synthetic portable workspace');
      await page.locator('#collection-name').fill('Synthetic investigations'); await page.locator('#collection-create').click();
      await page.locator('#collection-add').click(); await closeWorkspace();
      await tab('flow'); await page.locator('#desk-flow-title').fill('Synthetic portable flow');
      await page.locator('#desk-flow-add').click(); await page.locator('#search').fill('T1053.005'); await page.locator('#desk-flow-add').click();
      exportedWorkspace = await snapshot();
      assert.equal(exportedWorkspace.schemaVersion, 1);
      assert.equal(exportedWorkspace.context, appliedContext); assert.equal(exportedWorkspace.contextInput, pendingContext);
      assert.ok(exportedWorkspace.favorites.includes('T1059.001'));
      assert.ok(exportedWorkspace.collections.some(item => item.name === 'Synthetic investigations' && item.techniqueIds.includes('T1059.001')));
      assert.deepEqual(exportedWorkspace.flow.steps, ['T1059.001', 'T1053.005']);
      const draft = exportedWorkspace.drafts.find(item => item.techniqueId === 'T1059.001' && item.target === 'Platform-neutral' && item.mode === 'detect');
      assert.equal(draft.text, editedDraft); assert.equal(draft.context, appliedContext);
      const hash = require('node:crypto').createHash('sha256').update(draft.template).digest('hex');
      assert.equal(draft.templateSha256, hash);
      assert.equal(page.url().includes('Synthetic'), false);
      await closeWorkspace();
    });
    await check('premium workspace preview cancellation and invalid imports leave current memory unchanged', async () => {
      await goto(); const before = await snapshot();
      await uploadWorkspace(exportedWorkspace); await page.locator('#workspace-preview').waitFor();
      assert.match(await page.locator('#workspace-preview-text').textContent(), /Synthetic portable workspace/);
      assert.deepEqual(await snapshot(), before, 'Preview must not modify the active workspace');
      await page.locator('#workspace-import-cancel').click();
      assert.equal(await page.locator('#workspace-preview').isVisible(), false);
      assert.deepEqual(await snapshot(), before);
      await uploadWorkspace({ ...exportedWorkspace, validationLevel: 'field-confirmed' });
      await page.waitForFunction(() => document.getElementById('workspace-file').value === '');
      assert.equal(await page.locator('#workspace-preview').isVisible(), false);
      assert.match(await page.locator('#workspace-storage-status').textContent(), /Import rejected/);
      assert.deepEqual(await snapshot(), before, 'Rejected fields cannot mutate current memory');
    });
    await check('premium workspace opens a portable file as a new identity with exact analyst text', async () => {
      await uploadWorkspace(exportedWorkspace); await page.locator('#workspace-preview').waitFor();
      await page.locator('#workspace-import-confirm').click();
      await page.locator('#workspace-preview').waitFor({ state: 'hidden' });
      const imported = await snapshot();
      assert.notEqual(imported.id, exportedWorkspace.id, 'Imported file must open as a new workspace');
      for (const field of ['drafts', 'context', 'contextInput', 'favorites', 'collections', 'flow', 'sources']) assert.deepEqual(imported[field], exportedWorkspace[field], field);
      await closeWorkspace(); await tab('prompt'); await page.locator('#search').fill('T1059.001');
      assert.equal(await page.locator('#prompt').inputValue(), editedDraft);
      assert.equal(await page.locator('#context').inputValue(), pendingContext);
      assert.equal(await page.locator('script:not([src])').count(), 0);
      assert.equal(await page.locator('#favorite-toggle').getAttribute('aria-pressed'), 'true');
      await tab('flow'); assert.equal(await page.locator('#desk-flow-steps .flow-step').count(), 2);
    });

    const saved = async (child = page) => {
      await child.waitForFunction(() => document.getElementById('workspace-storage-status').textContent.includes('Saved locally'));
    };
    await check('premium local autosave requires consent, survives reload and can be disabled', async () => {
      await workspace();
      page.once('dialog', dialog => dialog.dismiss()); await page.locator('#workspace-autosave').click();
      assert.equal(await page.locator('#workspace-autosave').isChecked(), false, 'Declined consent must leave persistence off');
      page.once('dialog', dialog => dialog.accept()); await page.locator('#workspace-autosave').check(); await saved();
      const persisted = await snapshot(); await closeWorkspace();
      await page.reload(); await page.locator('#app-content').waitFor(); await workspace();
      await page.locator('#workspace-select').selectOption(persisted.id);
      await page.waitForFunction(name => document.getElementById('workspace-name').value === name, persisted.name);
      const restored = await snapshot();
      assert.deepEqual(restored.drafts, persisted.drafts); assert.deepEqual(restored.flow, persisted.flow);
      await page.locator('#workspace-autosave').uncheck();
      assert.equal(await page.locator('#workspace-autosave').isChecked(), false);
      await closeWorkspace(); await page.reload(); await page.locator('#app-content').waitFor(); await workspace();
      assert.equal(await page.locator('#workspace-autosave').isChecked(), false);
      await closeWorkspace();
    });

    await check('premium two-tab revision conflicts retain unsaved edits and stop stale autosave', async () => {
      await workspace(); page.once('dialog', dialog => dialog.accept()); await page.locator('#workspace-autosave').check(); await saved();
      const baseline = await snapshot(); await closeWorkspace();
      const other = await context.newPage();
      try {
        await goto(base, other); await workspace(other); await other.locator('#workspace-select').selectOption(baseline.id);
        await other.waitForFunction(name => document.getElementById('workspace-name').value === name, baseline.name);
        await closeWorkspace(other);
        await tab('prompt'); await page.locator('#prompt').fill('Synthetic tab A winning edit');
        await workspace(); await saved(); await closeWorkspace();
        await other.locator('#tab-prompt').click(); await other.locator('#prompt').fill('Synthetic tab B retained conflict edit');
        await workspace(other);
        await other.waitForFunction(() => document.getElementById('workspace-storage-status').textContent.includes('Autosave stopped'));
        assert.equal(await other.locator('#workspace-autosave').isChecked(), false);
        const retained = await snapshot(other);
        assert.ok(retained.drafts.some(draft => draft.text === 'Synthetic tab B retained conflict edit'));
        assert.equal((await snapshot()).drafts.some(draft => draft.text === 'Synthetic tab A winning edit'), true);
        await closeWorkspace();
      } finally { await other.close(); }
    });
    await check('premium deleting local workspaces removes stored copies without discarding memory', async () => {
      await workspace(); const before = await snapshot();
      page.once('dialog', dialog => dialog.accept()); await page.locator('#workspace-delete-local').click();
      await page.waitForFunction(() => !document.getElementById('workspace-autosave').checked);
      assert.deepEqual((await snapshot()).drafts, before.drafts, 'Deleting storage must not silently discard current in-memory edits');
      await closeWorkspace(); await page.reload(); await page.locator('#app-content').waitFor(); await workspace();
      assert.equal(await page.locator('#workspace-autosave').isChecked(), false);
      assert.equal(await page.locator(`#workspace-select option[value="${before.id}"]`).count(), 0);
      await closeWorkspace();
    });

    for (const width of [320, 768, 1024, 1440]) await check(`premium workspace reflows without overflow at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      await goto(new URL('?q=T0800&domain=OT&technique=T0800', base).href);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (await page.locator('#mobile-back').isVisible()) {
        await page.locator('#mobile-back').click(); assert.equal(await page.locator('#search').isVisible(), true);
        await page.locator('#techniques button').first().click();
        assert.equal(await page.locator('#prompt').isVisible(), true);
      }
      // Locked Playwright injects an inline animation-sync stylesheet in WebKit
      // screenshots, correctly rejected by our CSP. Do not weaken CSP or filter
      // console output; visual captures are made in Chromium and Firefox only.
      if (browser.browserType().name() !== 'webkit') {
        await page.locator('h1').click(); await page.locator('h1').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `premium-${width}.png`) });
      }
    });
    await check('premium isolated browser has no console errors or external requests', async () => {
      assert.deepEqual(failures, []); assert.deepEqual(external, []);
    });
  } finally { await context.close(); }
}

module.exports = premiumChecks;
if (require.main === module) {
  (async () => {
    const playwright = require(process.env.PLAYWRIGHT_MODULE || '../qa/node_modules/playwright');
    const engine = process.env.PREMIUM_BROWSER || 'chromium';
    assert.ok(['chromium', 'firefox', 'webkit'].includes(engine), 'Unsupported browser engine');
    const base = process.env.DEMO_URL || 'http://127.0.0.1:8793/';
    const output = path.resolve(__dirname, '../work/premium-browser', engine);
    fs.mkdirSync(output, { recursive: true });
    const browser = await playwright[engine].launch({ headless: true, ...(engine === 'chromium' && process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
    const checks = [];
    try {
      await premiumChecks({ browser, base, output, check: async (name, fn) => { await fn(); checks.push(name); console.log(`PASS ${name}`); } });
      fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ browser: browser.version(), engine, base, checks,
        limitations: ['Synthetic isolated browser checks, not independent WCAG or screen-reader certification.', 'No hosted publication, human prompt reviews or actual laboratory execution is asserted.',
          ...(engine === 'webkit' ? ['WebKit screenshots omitted: locked Playwright injects an inline animation-sync stylesheet blocked by the unchanged app CSP; functional console checks are not filtered.'] : [])] }, null, 2) + '\n');
      console.log(`${checks.length} premium browser checks passed.`);
    } finally { await browser.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
