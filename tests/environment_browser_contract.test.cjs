'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { settings } = require('../scripts/environment_browser_smoke.cjs');

test('environment browser QA defaults to a local isolated Chromium target', () => {
  assert.deepEqual(settings({}), { base: 'http://127.0.0.1:8798/', engine: 'chromium', executablePath: undefined });
});

test('environment browser QA supports all three locked engines and scoped directory URLs', () => {
  for (const engine of ['chromium', 'firefox', 'webkit']) {
    const config = settings({ BROWSER: engine, DEMO_URL: 'http://localhost:8798/Prompt-as-Detection-Library/', CHROME_PATH: '/test/chrome' });
    assert.equal(config.engine, engine);
    assert.equal(config.executablePath, engine === 'chromium' ? '/test/chrome' : undefined);
  }
});

test('environment browser QA refuses remote origins, credentials, queries and ambiguous targets', () => {
  for (const DEMO_URL of ['https://samran2.github.io/', 'http://127.0.0.1.evil.test/', 'http://user:password@localhost/',
    'http://localhost/?context=private', 'http://localhost/#private', 'file:///private/tmp/index.html', 'http://localhost/index.html']) {
    assert.throws(() => settings({ DEMO_URL }));
  }
  assert.throws(() => settings({ BROWSER: 'safari' }), /Unsupported browser/);
});
