'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PUBLIC_FILES } = require('../scripts/build_demo.cjs');
const read = name => fs.readFileSync(path.join(__dirname, '../demo', name), 'utf8');

test('environment modules are published locally before their consumers', () => {
  for (const file of ['environment.js', 'environment-ui.js']) assert.ok(PUBLIC_FILES.includes(file), file);
  for (const page of ['index.html', 'research.html']) {
    const html = read(page);
    assert.ok(html.indexOf('src="./environment.js"') >= 0);
    assert.ok(html.indexOf('src="./environment.js"') < html.indexOf('src="./core.js"'));
    assert.match(html, /connect-src 'none'/);
  }
});

test('guided creation retains existing controls and exposes explicit profile application', () => {
  const html = read('index.html');
  for (const id of ['composer-mode', 'guide-nav', 'guide-task', 'guide-environment', 'guide-telemetry', 'guide-result',
    'guide-summary', 'environment-apply', 'environment-dialog', 'environment-preview-dialog', 'workspace-import-legacy',
    'mode', 'target', 'context', 'prompt', 'copy', 'download']) {
    assert.equal([...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length, 1, id);
  }
  assert.match(html, /Use selected profile/);
  assert.match(html, /Import as new profile/);
});
