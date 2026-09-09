'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const controller = fs.readFileSync(path.join(__dirname, '../demo/research.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../demo/research.html'), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// A deliberately small DOM model for controller state and scheduling, not layout
// or browser accessibility certification. Feature-module contracts are stubbed.
function harness({ invalidCar = false } = {}) {
  const nodes = new Map();
  const downloads = [];
  const imports = new Map();
  const template = deferred();
  let activeElement = null;
  class Element {
    constructor(tag = 'div') {
      this.tag = tag; this.children = []; this.handlers = new Map(); this.attributes = new Map();
      this.value = ''; this.textContent = ''; this.disabled = false; this.hidden = false;
      this.files = []; this.dataset = {};
    }
    addEventListener(name, handler) { this.handlers.set(name, handler); }
    dispatch(name) { return this.handlers.get(name)?.({ target: this }); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    querySelectorAll(selector) {
      return this.children.flatMap(child => [
        ...(child.tag === 'button' && (selector === 'button' || selector === 'button:not(:disabled)' && !child.disabled) ? [child] : []),
        ...child.querySelectorAll(selector),
      ]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    focus() { if (!this.disabled) activeElement = this; }
    click() { if (this.tag === 'a') downloads.push(this.download); }
    remove() {}
  }
  for (const match of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const element = new Element(match[1]);
    element.hidden = /\bhidden\b/.test(match[0]);
    element.disabled = /\bdisabled\b/.test(match[0]);
    nodes.set(match[2], element);
  }
  const $ = id => {
    assert.ok(nodes.has(id), `Controller requested an unknown HTML target: ${id}`);
    return nodes.get(id);
  };
  $('coverage-domain').value = 'Enterprise'; $('car-technique').value = 'T1059.001';
  const document = { getElementById: $, createElement: tag => new Element(tag), documentElement: new Element(), body: new Element('body') };
  const records = [{ id: 'T1059.001', name: 'PowerShell', domain: 'Enterprise' }, { id: 'T0800', name: 'Activate Firmware Update Mode', domain: 'ICS' }];
  const context = vm.createContext({
    document, Blob, TextDecoder, URL: class extends URL {
      static createObjectURL() { return 'blob:local-controller-test'; }
      static revokeObjectURL() {}
    },
    setTimeout(callback) { callback(); },
    PAD_CATALOG: records, PAD: {}, PAD_CAR_CATALOG: {},
    PAD_NAVIGATOR: { summarize: () => ({ total: 2, reviewed: 0, labValidated: 0, tactics: [] }) },
    PAD_CAR: { createLibrary() {
      if (invalidCar) throw new Error('Invalid synthetic CAR catalog');
      return { lookup: () => ({ analytics: [], warning: 'Unverified', sourceNotice: 'Fixture notice', sourceLicense: 'Fixture license' }) };
    } },
    PAD_ATTACK_FLOW: {}, PAD_ROBUSTNESS: { LEVELS: [], ORIGINS: [] },
    PAD_LAB: {
      createPlan: async () => ({ planId: 'synthetic-plan' }),
      createResultTemplate: () => template.promise,
      importResults(text) { const pending = deferred(); imports.set(text, pending); return pending.promise; },
    },
  });
  vm.runInContext(controller, context, { filename: 'demo/research.js' });
  function add(id = records[0].id) { $('flow-choice').value = id; $('flow-add').dispatch('click'); }
  async function preparePlan() {
    add(); $('lab-title-input').value = 'Synthetic laboratory'; $('lab-authorization').value = 'LAB-TEST';
    await $('lab-plan').dispatch('click');
    assert.equal($('lab-file').disabled, false);
  }
  function importFile(text, bytes = new TextEncoder().encode(text)) {
    $('lab-file').value = `${text}.json`;
    $('lab-file').files = [{ size: bytes.length, arrayBuffer: async () => bytes.buffer }];
    return $('lab-file').dispatch('change');
  }
  return { $, add, preparePlan, importFile, imports, downloads, template, focus: () => activeElement };
}

test('a slower old import cannot replace a newer accepted result for the same plan', async () => {
  const app = harness(); await app.preparePlan();
  const old = app.importFile('old'); await flush();
  const fresh = app.importFile('new'); await flush();
  app.imports.get('new').resolve({ result: 'new evidence' }); await fresh;
  app.imports.get('old').resolve({ result: 'old evidence' }); await old;
  assert.deepEqual(JSON.parse(app.$('lab-result').textContent), { result: 'new evidence' });
  assert.equal(app.$('lab-result').hidden, false);
  assert.match(app.$('lab-status').textContent, /Evidence remains unverified/);
});

test('a stale failed import cannot change current status or clear the newer file selection', async () => {
  const app = harness(); await app.preparePlan();
  const old = app.importFile('old'); await flush();
  const fresh = app.importFile('new'); await flush();
  const status = app.$('lab-status').textContent;
  app.imports.get('old').reject(new Error('Old envelope rejected')); await old;
  assert.equal(app.$('lab-status').textContent, status);
  assert.equal(app.$('lab-file').value, 'new.json');
  app.imports.get('new').resolve({ result: 'new evidence' }); await fresh;
  assert.equal(app.$('lab-file').value, '');
});

test('changing plan inputs suppresses a pending import and preserves invalidation status', async () => {
  const app = harness(); await app.preparePlan();
  const pending = app.importFile('old'); await flush();
  app.$('lab-authorization').dispatch('input');
  app.imports.get('old').resolve({ result: 'obsolete evidence' }); await pending;
  assert.equal(app.$('lab-result').hidden, true);
  assert.equal(app.$('lab-result').textContent, '');
  assert.equal(app.$('lab-file').disabled, true);
  assert.match(app.$('lab-status').textContent, /Create a new plan/);
});

test('invalidating a pending template export cannot re-enable its button or download stale data', async () => {
  const app = harness(); await app.preparePlan();
  const pending = app.$('lab-template').dispatch('click');
  app.$('lab-title-input').dispatch('input');
  app.template.resolve({ status: 'synthetic-template' }); await pending;
  assert.equal(app.$('lab-template').disabled, true);
  assert.equal(app.$('lab-file').disabled, true);
  assert.deepEqual(app.downloads, ['offline-lab-plan.json']);
  assert.match(app.$('lab-status').textContent, /Plan changed/);
});

test('invalid CAR initialization fails visibly without an uncaught boot error', () => {
  const app = harness({ invalidCar: true });
  assert.equal(app.$('research-content').hidden, true);
  assert.match(app.$('research-status').textContent, /CAR source data is invalid/);
});

test('reordering and removing flow steps restores focus to an enabled current control', () => {
  const app = harness(); app.add('T1059.001'); app.add('T0800');
  app.$('flow-steps').children[1].querySelectorAll('button')[0].dispatch('click');
  const firstRow = app.$('flow-steps').children[0];
  assert.equal(firstRow.children[0].textContent, 'T0800 · Activate Firmware Update Mode');
  assert.equal(app.focus(), firstRow.querySelector('button:not(:disabled)'));
  assert.equal(app.focus().disabled, false);
  firstRow.querySelectorAll('button')[2].dispatch('click');
  const remainingRow = app.$('flow-steps').children[0];
  assert.equal(app.focus(), remainingRow.querySelector('button:not(:disabled)'));
  assert.equal(app.focus().disabled, false);
  remainingRow.querySelectorAll('button')[2].dispatch('click');
  assert.equal(app.focus(), app.$('flow-add'));
});

test('oversized and invalid UTF-8 imports are rejected before reaching the lab parser', async () => {
  const app = harness(); await app.preparePlan();
  await app.importFile('oversized', new Uint8Array(256 * 1024 + 1));
  assert.match(app.$('lab-status').textContent, /at most 256 KiB/);
  await app.importFile('invalid-encoding', new Uint8Array([0xc0, 0xaf]));
  assert.match(app.$('lab-status').textContent, /Import rejected/);
  assert.equal(app.imports.size, 0);
});
