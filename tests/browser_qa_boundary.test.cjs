'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const premiumChecks = require('../scripts/premium_browser_checks.cjs');

test('premium QA rejects private or ambiguous base URLs before creating a context', async () => {
  for (const base of ['http://user:pass@localhost:8798/', 'http://localhost:8798/?private=value',
    'http://localhost:8798/#private', 'http://localhost:8798/demo', 'not a URL']) {
    let contexts = 0;
    await assert.rejects(premiumChecks({ base, browser: { newContext() {
      contexts++; throw new Error('Context must not be created');
    } } }), /plain loopback HTTP directory URL/);
    assert.equal(contexts, 0);
  }
});

test('QA boundary validates plain loopback directory URLs without echoing rejected input', () => {
  const { createBrowserBoundary } = require('../scripts/browser_qa_boundary.cjs');
  for (const base of ['http://localhost:8798/', 'http://127.0.0.1:8798/demo/', 'http://[::1]:8798/']) {
    assert.equal(createBrowserBoundary(base).base, base);
  }
  for (const base of ['https://localhost/', 'http://example.com/', 'http://localhost.evil.invalid/',
    'http://user:pass@localhost/', 'http://localhost/?private=value', 'http://localhost/#private',
    'http://localhost/demo', 'http://localhost/?', 'http://localhost/#', 'not a URL',
    'http://localhost/\n', 'http://localhost/demo%2f/', null]) {
    assert.throws(() => createBrowserBoundary(base), error => {
      assert.equal(error.message, 'QA requires a plain loopback HTTP directory URL.');
      assert.equal(Object.hasOwn(error, 'input'), false);
      return true;
    });
  }
});

test('QA routing matches parsed origins and directory boundaries, not URL prefixes', () => {
  const { createBrowserBoundary } = require('../scripts/browser_qa_boundary.cjs');
  const boundary = createBrowserBoundary('http://localhost:8798/demo/');
  for (const url of ['http://localhost:8798/demo/', 'http://localhost:8798/demo/app.js',
    'http://localhost:8798/demo/?technique=T1068', 'blob:http://localhost:8798/synthetic-id']) {
    assert.equal(boundary.allowsRequest(url), true, url);
  }
  for (const url of ['http://localhost:87980/demo/', 'http://localhost.evil.invalid:8798/demo/',
    'http://localhost:8798/demo-other/', 'http://localhost:8798/demo/../private',
    'http://localhost:8798/demo/%2e%2e/private', 'http://localhost:8798/demo/%2f..%2fprivate',
    'http://localhost:8798/demo/%5c..%5cprivate', 'http://user:pass@localhost:8798/demo/',
    'https://localhost:8798/demo/', 'blob:https://example.com/id', 'blob:null/id',
    'file:///private/test.json', 'data:text/html,test', 'invalid', null]) {
    assert.equal(boundary.allowsRequest(url), false, String(url));
  }
});

test('file-mode QA allows only the explicitly configured local demo directory', () => {
  const { createBrowserBoundary } = require('../scripts/browser_qa_boundary.cjs');
  const root = path.resolve(__dirname, '../demo');
  const boundary = createBrowserBoundary('http://127.0.0.1:8798/', { fileRoot: root });
  assert.equal(boundary.allowsRequest(pathToFileURL(path.join(root, 'index.html')).href + '?technique=T1068'), true);
  assert.equal(boundary.allowsRequest(pathToFileURL(path.join(root, 'core.js')).href), true);
  assert.equal(boundary.allowsRequest(pathToFileURL(path.join(root, '../SECURITY.md')).href), false);
  assert.equal(boundary.allowsRequest(pathToFileURL(root + '-other/index.html').href), false);
  assert.equal(boundary.allowsRequest('file://external.invalid/private/test.json'), false);
  assert.equal(boundary.allowsRequest('blob:null/synthetic-file-download'), true);
});

test('QA report diagnostics retain occurrence counts without free-text payloads', () => {
  const { reportDiagnostics } = require('../scripts/browser_qa_boundary.cjs');
  const details = 'http://localhost:8798/private-preview/ synthetic private content';
  const result = reportDiagnostics({ errors: [details, details], externalRequests: [details], failure: new Error(details) });
  assert.equal(result.errors.length, 2);
  assert.equal(result.externalRequests.length, 1);
  assert.equal(result.failure, 'Browser QA failed; inspect local runner output.');
  assert.equal(JSON.stringify(result).includes(details), false);
  assert.equal(JSON.stringify(result).includes('localhost'), false);
  assert.deepEqual(reportDiagnostics({}), { errors: [], externalRequests: [], failure: null });
});

test('environment QA failure report omits navigation URLs and preserves cleanup', async t => {
  const fs = require('node:fs');
  const Module = require('node:module');
  const { run } = require('../scripts/environment_browser_smoke.cjs');
  const target = 'http://localhost:8798/private-preview/';
  const navigationError = new Error(`page.goto: synthetic failure at ${target}`);
  const reports = [], closed = [];
  const page = { async goto() { throw navigationError; } };
  const context = { async route() {}, on() {}, async newPage() { return page; }, async close() { closed.push('context'); } };
  const browser = { version: () => 'synthetic', async newContext() { return context; }, async close() { closed.push('browser'); } };
  const originalLoad = Module._load;
  t.mock.method(Module, '_load', function (id, ...args) {
    if (id === '../qa/node_modules/playwright') return { chromium: { async launch() { return browser; } } };
    return originalLoad.call(this, id, ...args);
  });
  const output = path.resolve(__dirname, '../work/environment-browser/chromium');
  t.mock.method(fs, 'mkdirSync', dir => assert.equal(dir, output));
  t.mock.method(fs, 'writeFileSync', (file, data) => {
    assert.equal(file, path.join(output, 'report.json'));
    reports.push(JSON.parse(data));
  });
  await assert.rejects(run({ DEMO_URL: target }), error => error === navigationError);
  assert.deepEqual(closed, ['context', 'browser']);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].basePath, '/private-preview/');
  assert.equal(reports[0].failure, 'Browser QA failed; inspect local runner output.');
  assert.equal(JSON.stringify(reports[0]).includes('http://localhost:8798'), false);
  assert.equal(JSON.stringify(reports[0]).includes('page.goto'), false);
});
