'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PUBLIC_FILES } = require('../scripts/build_demo.cjs');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('unified desk retains prompt/evidence/defenses and adds flow without orphaning comparison', () => {
  const html = read('demo/index.html');
  for (const id of ['tab-prompt', 'tab-source', 'tab-defenses', 'tab-flow', 'comparison-dialog', 'compare-open',
    'pane-resize', 'pane-reset', 'command-open', 'command-dialog', 'command-search', 'command-results', 'command-close',
    'mobile-back', 'mobile-open', 'desk-flow-steps', 'desk-flow-add', 'desk-flow-export']) {
    assert.ok(new RegExp(`id="${id}"`).test(html), id);
  }
  assert.doesNotMatch(html, /id="tab-map"|id="tab-compare"/);
  assert.match(html, /id="pane-resize"[^>]*type="range"|type="range"[^>]*id="pane-resize"/);
});

test('workspace import is explicitly previewed and storage consent is not preselected', () => {
  const html = read('demo/index.html');
  for (const id of ['workspace-open', 'workspace-dialog', 'workspace-close', 'workspace-name', 'workspace-new',
    'workspace-export', 'workspace-file', 'workspace-preview', 'workspace-preview-text', 'workspace-import-confirm',
    'workspace-import-cancel', 'workspace-autosave', 'workspace-storage-status', 'workspace-delete-local',
    'favorite-toggle', 'favorites-list', 'collection-name', 'collection-create', 'collection-select', 'collection-add', 'collection-items']) {
    assert.ok(new RegExp(`id="${id}"`).test(html), id);
  }
  const consent = html.match(/<input\b[^>]*id="workspace-autosave"[^>]*>/)?.[0];
  assert.ok(consent, 'Explicit autosave control must exist');
  assert.doesNotMatch(consent, /\bchecked\b/);
});

test('new shared modules are explicitly published and loaded locally', () => {
  const html = read('demo/index.html');
  for (const file of ['workspace.js', 'workspace-store.js', 'workspace-ui.js', 'research-components.js']) {
    assert.ok(PUBLIC_FILES.includes(file), `${file} must be allowlisted`);
    assert.match(html, new RegExp(`src="\\./${file.replace('.', '\\.')}"`));
  }
});
