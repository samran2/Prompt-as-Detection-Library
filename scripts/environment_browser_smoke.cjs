'use strict';
// Optional locked browser QA. Only synthetic data and isolated loopback pages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createBrowserBoundary, reportDiagnostics } = require('./browser_qa_boundary.cjs');

function settings(environment = process.env) {
  const boundary = createBrowserBoundary(environment.DEMO_URL || 'http://127.0.0.1:8798/');
  const engine = environment.BROWSER || environment.BROWSER_ENGINE || 'chromium';
  assert.ok(['chromium', 'firefox', 'webkit'].includes(engine), 'Unsupported browser engine');
  return { base: boundary.base, engine, executablePath: engine === 'chromium' ? environment.CHROME_PATH : undefined };
}

async function run(environment = process.env) {
  const config = settings(environment);
  const playwright = require('../qa/node_modules/playwright');
  const output = path.resolve(__dirname, '../work/environment-browser', config.engine);
  fs.mkdirSync(output, { recursive: true });
  const checks = [], errors = [], externalRequests = [], requests = [];
  let browser, context, page, failure;
  const report = () => ({ version: require('../package.json').version, engine: config.engine,
    browser: browser?.version() || null, node: process.version, basePath: new URL(config.base).pathname,
    checks, ...reportDiagnostics({ errors, externalRequests, failure }),
    limitations: ['Synthetic local UI checks only, not a screen-reader or independent WCAG audit.',
      'No model requests or measured response-quality improvement is asserted.',
      ...(config.engine === 'webkit' ? ['WebKit screenshots omitted because locked screenshot preparation conflicts with the unchanged app CSP.'] : [])] });
  const check = async (name, task) => { await task(); checks.push(name); console.log(`PASS ${name}`); };
  try {
    browser = await playwright[config.engine].launch({ headless: true,
      ...(config.executablePath ? { executablePath: config.executablePath } : {}) });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const boundary = createBrowserBoundary(config.base);
    await context.route('**/*', route => {
      const request = route.request(); const url = request.url();
      requests.push({ url, body: request.postData() || '' });
      if (boundary.allowsRequest(url)) return route.continue();
      externalRequests.push(url); return route.abort();
    });
    context.on('page', child => {
      child.setDefaultTimeout(7000);
      child.on('pageerror', error => errors.push(error.message));
      child.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      child.on('dialog', dialog => {
        if (dialog.type() === 'beforeunload') return dialog.accept();
        if (child.listenerCount('dialog') === 1) return dialog.dismiss();
      });
    });
    page = await context.newPage();
    const goto = async (query = '') => { await page.goto(new URL(query, config.base).href); await page.locator('#app-content').waitFor(); };
    const quick = async () => { await page.getByRole('combobox', { name: 'Prompt creation', exact: true }).selectOption('quick'); };
    const guided = async () => { await page.getByRole('combobox', { name: 'Prompt creation', exact: true }).selectOption('guided'); };
    const openWorkspace = async (child = page) => { if (!await child.locator('#workspace-dialog').isVisible()) await child.getByRole('button', { name: 'Workspaces', exact: true }).click(); };
    const downloadJSON = async (selector, child = page) => {
      const pending = child.waitForEvent('download'); await child.locator(selector).click();
      const download = await pending;
      assert.equal(await download.failure(), null);
      return { value: JSON.parse(fs.readFileSync(await download.path(), 'utf8')), name: download.suggestedFilename() };
    };
    const snapshot = async (child = page) => {
      await openWorkspace(child); const result = await downloadJSON('#workspace-export', child);
      await child.getByRole('button', { name: 'Close workspaces', exact: true }).click(); return result.value;
    };
    const upload = (selector, value, name) => page.locator(selector).setInputFiles({ name,
      mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
    const chooseProfile = async (name, child = page) => {
      const id = await child.locator('#environment-select option').evaluateAll((options, label) => options.find(option => option.textContent === label || option.textContent.startsWith(label + ' · revision '))?.value, name);
      assert.ok(id, `Saved profile ${name} is available`);
      await child.getByLabel('Saved environment', { exact: true }).selectOption(id);
    };
    const applyProfile = () => page.getByRole('button', { name: 'Use selected profile', exact: true }).click();
    const saveProfile = () => page.getByRole('button', { name: 'Save profile', exact: true }).click();
    const profileOptions = () => page.locator('#environment-select option').allTextContents();
    const showProfileTransfer = async () => {
      if (!await page.locator('.profile-transfer').evaluate(node => node.open)) await page.getByText('Import or export a profile', { exact: true }).click();
    };

    await check('new workspace defaults to the four-step guided composer with a quick alternative', async () => {
      await goto();
      assert.equal(await page.getByRole('combobox', { name: 'Prompt creation', exact: true }).inputValue(), 'guided');
      for (let step = 1; step <= 4; step++) {
        assert.match(await page.locator('#guide-step-title').textContent(), new RegExp(`(?:Step\\s+)?${step}\\b`, 'i'));
        if (step < 4) { await page.getByRole('button', { name: 'Next step', exact: true }).focus(); await page.keyboard.press('Enter'); }
      }
      assert.equal(await page.getByRole('button', { name: /^Copy prompt/ }).isVisible(), true);
      await page.getByRole('button', { name: 'Previous step', exact: true }).click();
      assert.match(await page.locator('#guide-step-title').textContent(), /3\b/);
      await quick(); assert.equal(await page.locator('#prompt').isVisible(), true);
    });

    await check('existing technique links open quick composition and retain the OT alias', async () => {
      await goto('?domain=OT&q=T0800&technique=T0800');
      assert.equal(await page.getByRole('combobox', { name: 'Prompt creation', exact: true }).inputValue(), 'quick');
      assert.equal(await page.locator('#technique-id').textContent(), 'T0800');
      assert.equal(new URL(page.url()).searchParams.get('domain'), 'OT');
    });

    const privacyMarker = 'SYNTHETIC_ENVIRONMENT_PRIVATE_8798';
    let firstProfile, exportedProfile;
    await check('creating a named profile preserves the editor until explicit application', async () => {
      await page.locator('#prompt').fill('Synthetic untouched editor before selecting an environment.');
      const before = await page.locator('#prompt').inputValue();
      await page.getByRole('button', { name: 'New profile', exact: true }).click();
      await page.getByLabel('Profile name', { exact: true }).fill('Synthetic Sentinel');
      await page.getByLabel('Profile output target', { exact: true }).selectOption('Sentinel KQL');
      await page.getByLabel('Operating environment', { exact: true }).fill(`Synthetic Windows lab ${privacyMarker}`);
      await page.getByLabel('Available data sources', { exact: true }).fill('Synthetic process events');
      await page.getByLabel('Tables or log types', { exact: true }).fill('SyntheticProcessEvents');
      await page.getByLabel('Field mappings', { exact: true }).fill('timestamp = TimeGenerated\ncommand_line = CommandLine');
      await page.getByLabel('Known gaps and limitations', { exact: true }).fill('No network records. Synthetic schema only; no detector validation.');
      await saveProfile();
      assert.equal(await page.locator('#environment-dialog').isVisible(), false);
      assert.equal(await page.locator('#prompt').inputValue(), before);
      assert.ok((await profileOptions()).some(name => name.startsWith('Synthetic Sentinel · revision ')));
      firstProfile = await page.locator('#environment-select').inputValue();
      await applyProfile();
      assert.equal(await page.locator('#target').inputValue(), 'Sentinel KQL');
      assert.ok((await page.locator('#prompt').inputValue()).includes(privacyMarker));
      assert.match(await page.locator('#prompt').inputValue(), /DRAFT/);
      assert.equal(page.url().includes(privacyMarker), false);
    });

    const firstDraft = 'Synthetic profile-specific edited draft: keep me byte for byte.';
    await check('duplicating and switching profiles preserves the original keyed draft', async () => {
      await page.locator('#prompt').fill(firstDraft);
      await page.getByRole('button', { name: 'Duplicate profile', exact: true }).click();
      await page.getByLabel('Profile name', { exact: true }).fill('Synthetic Sentinel copy');
      await saveProfile();
      const copyId = await page.locator('#environment-select').inputValue();
      assert.notEqual(copyId, firstProfile);
      assert.equal(await page.locator('#prompt').inputValue(), firstDraft);
      await applyProfile(); await page.locator('#prompt').fill('Synthetic copy-specific draft.');
      await chooseProfile('Synthetic Sentinel'); await applyProfile();
      assert.equal(await page.locator('#prompt').inputValue(), firstDraft);
      const saved = await snapshot();
      assert.equal(saved.schemaVersion, 2);
      assert.ok(saved.drafts.some(draft => draft.text === firstDraft));
      assert.ok(saved.drafts.some(draft => draft.text === 'Synthetic copy-specific draft.'));
    });

    await check('editing a profile creates a new composition without changing its older draft', async () => {
      await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
      await page.getByLabel('Known gaps and limitations', { exact: true }).fill('Synthetic revised profile: network logs remain unknown.');
      await saveProfile();
      assert.equal(await page.locator('#prompt').inputValue(), firstDraft);
      await applyProfile();
      assert.notEqual(await page.locator('#prompt').inputValue(), firstDraft);
      assert.ok((await page.locator('#prompt').inputValue()).includes('Synthetic revised profile'));
      assert.ok((await snapshot()).drafts.some(draft => draft.text === firstDraft));
      if (config.engine !== 'webkit') {
        await page.locator('h1').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, 'environment-applied-1440.png'), fullPage: true });
      }
    });

    await check('profile file export is versioned, portable and separate from workspace export', async () => {
      await showProfileTransfer();
      const exported = await downloadJSON('#environment-export');
      assert.match(exported.name, /\.pad-environment\.json$/);
      assert.equal(exported.value.schemaVersion, 1);
      assert.ok(JSON.stringify(exported.value).includes(privacyMarker));
      assert.equal(Object.hasOwn(exported.value, 'drafts'), false);
      exportedProfile = exported.value;
    });

    await check('profile import preview cancellation leaves profiles and current work untouched', async () => {
      const before = await snapshot();
      const payload = '<img src=x onerror="window.syntheticProfileInjected=true"> ${HOME}';
      await upload('#environment-import', { ...exportedProfile, system: payload }, 'synthetic.pad-environment.json');
      await page.locator('#environment-preview-dialog').waitFor();
      assert.ok((await page.locator('#environment-preview-text').textContent()).includes(payload));
      assert.equal(await page.locator('img[src="x"]').count(), 0);
      await page.getByRole('button', { name: 'Cancel import', exact: true }).click();
      assert.equal(await page.locator('#environment-preview-dialog').isVisible(), false);
      assert.deepEqual(await snapshot(), before);
    });

    await check('malformed and dangerous profile files cannot alter the current workspace', async () => {
      const before = await snapshot();
      for (const value of ['{broken', '{"schemaVersion":1,"schemaVersion":2}', '{"__proto__":{"injected":true}}', ' '.repeat(128 * 1024 + 1)]) {
        await upload('#environment-import', value, 'rejected.pad-environment.json');
        await page.waitForFunction(() => /reject|invalid|unsupported|error|not imported/i.test(document.getElementById('environment-status').textContent));
        assert.equal(await page.locator('#environment-preview-dialog').isVisible(), false);
        assert.deepEqual(await snapshot(), before);
      }
      assert.equal(await page.locator('script:not([src])').count(), 0);
    });

    await check('profile import creates a new identity and does not apply it automatically', async () => {
      const previous = await page.locator('#prompt').inputValue();
      const ids = await page.locator('#environment-select option').evaluateAll(options => options.map(option => option.value));
      await upload('#environment-import', exportedProfile, 'synthetic.pad-environment.json');
      await page.locator('#environment-preview-dialog').waitFor();
      await page.getByRole('button', { name: 'Import as new profile', exact: true }).click();
      await page.locator('#environment-preview-dialog').waitFor({ state: 'hidden' });
      assert.equal(ids.includes(await page.locator('#environment-select').inputValue()), false);
      assert.equal(await page.locator('#prompt').inputValue(), previous);
    });

    await check('deleting a selected profile requires confirmation and keeps current draft text', async () => {
      const before = await page.locator('#prompt').inputValue();
      const count = await page.locator('#environment-select option').count();
      await page.getByRole('button', { name: 'Delete profile', exact: true }).click();
      assert.equal(await page.locator('#environment-select option').count(), count, 'Default dialog dismissal cancels deletion');
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Delete profile', exact: true }).click();
      assert.equal(await page.locator('#environment-select option').count(), count - 1);
      assert.equal(await page.locator('#prompt').inputValue(), before);
    });

    await check('quick and guided views share choices without losing edited text', async () => {
      await page.locator('#prompt').fill('Synthetic guide-switch draft.');
      await guided();
      for (let count = 0; count < 3 && await page.locator('#guide-next').isVisible() && await page.locator('#guide-next').isEnabled(); count++) await page.locator('#guide-next').click();
      assert.equal(await page.locator('#prompt').inputValue(), 'Synthetic guide-switch draft.');
      await quick();
      assert.equal(await page.locator('#prompt').inputValue(), 'Synthetic guide-switch draft.');
    });

    await check('workspace export/import retains profiles, snapshots and profile-specific drafts', async () => {
      const before = await snapshot();
      const beforeProfiles = await profileOptions();
      await openWorkspace();
      await upload('#workspace-file', before, 'synthetic.pad-workspace.json');
      await page.locator('#workspace-preview').waitFor();
      await page.locator('#workspace-import-confirm').click();
      await page.locator('#workspace-preview').waitFor({ state: 'hidden' });
      await page.locator('#workspace-close').click();
      const after = await snapshot();
      assert.notEqual(after.id, before.id);
      assert.deepEqual(after.drafts, before.drafts);
      assert.ok(JSON.stringify(after).includes(privacyMarker));
      assert.deepEqual(await profileOptions(), beforeProfiles);
    });

    await check('simultaneous profile edits stop stale autosave without losing either tab\'s work', async () => {
      await openWorkspace(); page.once('dialog', dialog => dialog.accept()); await page.locator('#workspace-autosave').check();
      await page.waitForFunction(() => document.getElementById('workspace-storage-status').textContent.includes('Saved locally'));
      const baseline = await snapshot();
      const other = await context.newPage();
      try {
        await other.goto(new URL('?technique=T0800', config.base).href); await other.locator('#app-content').waitFor();
        await openWorkspace(other); await other.locator('#workspace-select').selectOption(baseline.id);
        await other.waitForFunction(name => document.getElementById('workspace-name').value === name, baseline.name);
        await other.locator('#workspace-close').click();
        assert.equal(await other.locator('#composer-mode').inputValue(), 'quick');
        await chooseProfile('Synthetic Sentinel'); await page.locator('#environment-edit').click();
        await page.getByLabel('Known gaps and limitations', { exact: true }).fill('Synthetic tab A environment winner.'); await saveProfile();
        await page.waitForFunction(() => document.getElementById('workspace-storage-status').textContent.includes('Saved locally'));
        await chooseProfile('Synthetic Sentinel', other); await other.locator('#environment-edit').click();
        await other.getByLabel('Known gaps and limitations', { exact: true }).fill('Synthetic tab B retained environment conflict.');
        await other.locator('#environment-save').click();
        await openWorkspace(other);
        await other.waitForFunction(() => document.getElementById('workspace-storage-status').textContent.includes('Autosave stopped'));
        assert.equal(await other.locator('#workspace-autosave').isChecked(), false);
        const retained = await snapshot(other);
        assert.ok(JSON.stringify(retained.profiles).includes('Synthetic tab B retained environment conflict.'));
        assert.ok(JSON.stringify((await snapshot()).profiles).includes('Synthetic tab A environment winner.'));
      } finally { await other.close(); }
      await openWorkspace(); page.once('dialog', dialog => dialog.accept()); await page.locator('#workspace-delete-local').click();
      await page.waitForFunction(() => /local workspace data deleted/i.test(document.getElementById('workspace-storage-status').textContent));
      assert.equal(await page.locator('#workspace-autosave').isChecked(), false);
      await page.locator('#workspace-close').click();
    });

    await check('saved draft selector restores an older edited profile revision even after profile deletion', async () => {
      const versions = page.getByLabel('Saved draft versions', { exact: true });
      const oldKey = await page.locator('#draft-select option').evaluateAll(options => options.find(option => option.textContent.includes('Synthetic Sentinel (revision 1)'))?.value);
      assert.ok(oldKey, 'Older environment revision remains available in saved draft versions');
      await versions.selectOption(oldKey);
      assert.equal(await page.locator('#prompt').inputValue(), firstDraft);
      await chooseProfile('Synthetic Sentinel');
      page.once('dialog', dialog => dialog.accept()); await page.locator('#environment-delete').click();
      assert.equal(await page.locator('#prompt').inputValue(), firstDraft);
      const otherKey = await page.locator('#draft-select option').evaluateAll((options, old) => options.find(option => option.value !== old)?.value, oldKey);
      assert.ok(otherKey); await versions.selectOption(otherKey);
      if (!await page.locator('.context-box').evaluate(node => node.open)) await page.locator('.context-box > summary').click();
      await page.locator('#context').fill('Synthetic newer global context must not be mistaken for the old draft context.');
      page.once('dialog', dialog => dialog.accept()); await page.locator('#apply-context').click();
      await versions.selectOption(oldKey);
      assert.equal(await page.locator('#prompt').inputValue(), firstDraft);
      assert.match(await page.locator('#guide-summary').textContent(), /Context saved with this draft:\s*None\./);
      const retained = await snapshot();
      assert.ok(retained.drafts.some(draft => draft.text === firstDraft && draft.environment?.revision === 1));
      assert.equal(retained.profiles.some(profile => profile.id === firstProfile), false);
    });

    await check('legacy v1 import requires preview and preserves literal drafts without inventing a profile', async () => {
      const before = await snapshot();
      const legacy = { schemaVersion: 1, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Synthetic legacy workspace',
        sources: before.sources, drafts: [{ techniqueId: 'T0800', mode: 'detect', target: 'Platform-neutral',
          text: '<img src=x onerror="window.syntheticInjected=true"> Legacy untouched draft ${HOME}', template: 'Synthetic legacy template',
          templateSha256: require('node:crypto').createHash('sha256').update('Synthetic legacy template').digest('hex'), context: 'Synthetic legacy applied context' }],
        context: 'Synthetic legacy applied context', contextInput: 'Synthetic legacy pending context', collections: [], favorites: [],
        flow: { title: 'Research hypothesis', steps: [] }, view: { query: 'T0800', domain: 'OT', tactic: '', platform: '', mode: 'detect', target: 'Platform-neutral',
          technique: 'T0800', compare: [], theme: 'system', tab: 'prompt', paneWidth: 330, listScroll: 0, mobileView: 'detail' } };
      await openWorkspace(); await upload('#workspace-file', legacy, 'legacy.pad-workspace.json');
      await page.locator('#workspace-preview').waitFor();
      await page.locator('#workspace-import-cancel').click(); await page.locator('#workspace-close').click();
      assert.deepEqual(await snapshot(), before);
      await openWorkspace(); await upload('#workspace-file', legacy, 'legacy.pad-workspace.json');
      await page.locator('#workspace-preview').waitFor(); await page.locator('#workspace-import-confirm').click();
      await page.locator('#workspace-preview').waitFor({ state: 'hidden' }); await page.locator('#workspace-close').click();
      assert.equal(await page.locator('#prompt').inputValue(), legacy.drafts[0].text);
      assert.equal(await page.locator('#context').inputValue(), legacy.contextInput);
      assert.equal(await page.locator('#composer-mode').inputValue(), 'quick');
      assert.equal(await page.locator('#environment-select option').count(), 1);
      assert.equal(await page.locator('img[src="x"]').count(), 0);
      const migrated = await snapshot(); assert.equal(migrated.schemaVersion, 2); assert.notEqual(migrated.id, legacy.id);
      assert.ok(migrated.drafts.some(draft => draft.text === legacy.drafts[0].text));
    });

    for (const width of [320, 768, 1024, 1440]) await check(`guided profile controls reflow and work by keyboard at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 }); await goto('?technique=T1001'); await guided();
      if (!await page.locator('#selected-detail').isVisible()) await page.locator('#techniques button').first().click();
      for (let step = 1; step <= 4; step++) {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (step === 2 && config.engine !== 'webkit') {
          await page.locator('h1').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, `environment-guided-${width}.png`), fullPage: true });
        }
        if (step < 4) { await page.locator('#guide-next').focus(); await page.keyboard.press('Enter'); }
      }
      await page.locator('#copy').focus();
      assert.notEqual(await page.locator('#copy').evaluate(node => getComputedStyle(node).outlineStyle), 'none');
      await quick(); await page.getByRole('button', { name: 'New profile', exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (config.engine !== 'webkit') await page.screenshot({ path: path.join(output, `environment-editor-${width}.png`) });
      await page.getByRole('button', { name: 'Save profile', exact: true }).focus();
      const saveBox = await page.locator('#environment-save').boundingBox();
      assert.ok(saveBox && saveBox.y >= 0 && saveBox.y + saveBox.height <= 1000, 'Save remains keyboard-reachable inside the scrollable profile dialog');
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#environment-dialog').isVisible(), false);
      assert.equal(await page.locator('#environment-new').evaluate(node => node === document.activeElement), true);
      if (config.engine !== 'webkit') { await page.locator('h1').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, `environment-${width}.png`), fullPage: true }); }
    });

    await check('profiles remain opt-in local data and no private value leaves via URL or network', async () => {
      await openWorkspace(); assert.equal(await page.locator('#workspace-autosave').isChecked(), false); await page.locator('#workspace-close').click();
      await page.reload(); await page.locator('#app-content').waitFor();
      assert.equal(await page.locator('#environment-select option').count(), 1);
      assert.equal(page.url().includes(privacyMarker), false);
      assert.equal(requests.some(request => request.url.includes(privacyMarker) || request.body.includes(privacyMarker)), false);
      assert.deepEqual(externalRequests, []); assert.deepEqual(errors, []);
    });
    console.log(`${checks.length} environment browser checks passed.`);
  } catch (error) { failure = error; throw error; }
  finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report(), null, 2) + '\n');
    await context?.close(); await browser?.close();
  }
}

module.exports = { settings, run };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
