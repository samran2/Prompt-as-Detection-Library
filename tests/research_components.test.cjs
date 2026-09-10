'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ui = require('../demo/research-components.js');

function dom() {
  let active;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.handlers = new Map(); this.attributes = {}; this.value = ''; this.textContent = ''; this.disabled = false; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(name, callback) { this.handlers.set(name, callback); }
    dispatch(name) { return this.handlers.get(name)?.({target: this}); }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelector(selector) { return this.all().find(child => child.tag === 'button' && (selector !== 'button:not(:disabled)' || !child.disabled)); }
    all() { return this.children.flatMap(child => [child, ...child.all()]); }
    focus() { if (!this.disabled) active = this; }
  }
  return {createElement: tag => new Element(tag), active: () => active};
}
const records = [{id: 'T1059.001', name: 'PowerShell', domain: 'Enterprise'}, {id: 'T0800', name: 'Firmware', domain: 'ICS'}, {id: 'AML.T0051', name: 'Prompt injection', domain: 'ATLAS'}];
function flow(options = {}) {
  const document = dom();
  const nodes = Object.fromEntries(['list', 'empty', 'addButton', 'exportButton', 'clearButton', 'status', 'title'].map(key => [key, document.createElement(key === 'title' ? 'input' : 'div')]));
  const changes = [], exports = [];
  const component = ui.createFlow({document, ...nodes, catalog: records, onChange: value => changes.push(value), onExport: value => exports.push(value), ...options});
  return {document, nodes, changes, exports, component};
}

test('CAR renders source text literally, complete notices, exact mappings and ATLAS unsupported state', () => {
  const document = dom(), root = document.createElement('div');
  const library = require('../demo/car.js').createLibrary(require('../demo/car-catalog.js'));
  const component = ui.createCar({document, root, library});
  component.show(records[0]);
  assert.ok(root.all().some(node => node.textContent.includes('CAR-2014-04-003')));
  assert.ok(root.all().some(node => node.textContent.includes('Apache License')));
  assert.ok(root.all().filter(node => node.tag === 'a').every(node => /^https:\/\/github.com\/mitre-attack\/car\/blob\/[a-f0-9]{40}\//.test(node.href)));
  component.show(records[2]);
  assert.match(root.children[0].textContent, /ATLAS.*not supported/i);
  assert.equal(root.all().filter(node => node.tag === 'a').length, 0);
  component.show(records[1]);
  assert.match(root.children[0].textContent, /0 exact CAR mappings/);
  component.show(null);
  assert.match(root.children[0].textContent, /Choose/);
});

test('CAR never interprets markup or follows malformed source URLs', () => {
  const document = dom(), root = document.createElement('div');
  const literal = '<img src=x onerror=alert(1)> ${API_KEY}';
  const component = ui.createCar({document, root, library: {lookup: () => ({analytics: [{id: 'CAR-2014-04-003', title: literal, hypothesis: literal, telemetry: [literal], pseudocode: [{code: literal}], sourceUrl: 'javascript:alert(1)', sourceSha256: 'a'.repeat(64)}], warning: 'Unverified', sourceNotice: literal, sourceLicense: 'License'})}});
  component.show(records[0]);
  assert.ok(root.all().some(node => node.textContent === literal));
  assert.equal(root.all().some(node => node.tag === 'img' || node.tag === 'script' || node.tag === 'a'), false);
});

test('flow preserves repeated steps, canonical labels and its 20-step bound', () => {
  const app = flow();
  assert.equal(app.nodes.exportButton.disabled, true);
  app.component.setSelected(records[0]);
  assert.equal(app.nodes.addButton.disabled, false);
  app.nodes.addButton.dispatch('click');
  app.component.add({...records[0], name: 'Untrusted replacement'});
  assert.deepEqual(app.component.snapshot().steps, ['T1059.001', 'T1059.001']);
  assert.equal(app.nodes.list.children[0].children[0].textContent, 'T1059.001 · PowerShell');
  assert.equal(app.nodes.exportButton.disabled, false);
  for (let index = 2; index < 20; index++) app.component.add(records[0]);
  assert.throws(() => app.component.add(records[0]), /20/);
  assert.equal(app.nodes.addButton.disabled, true);
  assert.equal(app.changes.length, 20);
});

test('restore validates every step before mutation and does not silently remove unresolved or ATLAS IDs', () => {
  const app = flow();
  app.component.restore({title: 'Saved hypothesis', steps: ['T1059.001', 'T0800', 'T1059.001']});
  const before = app.component.snapshot();
  for (const value of [{title: 'Bad', steps: ['T9999']}, {title: 'Bad', steps: ['AML.T0051']}, {title: 'x'.repeat(201), steps: []}, {title: 'Bad', steps: Array(21).fill('T0800')}, null]) {
    assert.throws(() => app.component.restore(value));
    assert.deepEqual(app.component.snapshot(), before);
  }
  assert.equal(app.changes.length, 1);
  before.steps.length = 0;
  assert.equal(app.component.snapshot().steps.length, 3);
  app.component.setSelected(records[2]);
  assert.equal(app.nodes.addButton.disabled, true);
  assert.throws(() => app.component.add(records[2]), /ATT&CK/);
});

test('reorder/remove/clear/title edits notify once and preserve focus on an enabled control', () => {
  const app = flow(); app.component.setSelected(records[0]);
  app.component.add(records[0]); app.component.add(records[1]);
  app.nodes.list.children[1].children[1].children[0].dispatch('click');
  assert.deepEqual(app.component.snapshot().steps, ['T0800', 'T1059.001']);
  assert.equal(app.document.active(), app.nodes.list.children[0].querySelector('button:not(:disabled)'));
  app.nodes.list.children[0].children[1].children[2].dispatch('click');
  app.nodes.title.value = 'Edited'; app.nodes.title.dispatch('input');
  assert.equal(app.component.snapshot().title, 'Edited');
  app.nodes.clearButton.dispatch('click');
  assert.deepEqual(app.component.snapshot().steps, []);
  assert.equal(app.changes.length, 6);
  assert.equal(app.nodes.empty.hidden, false);
});

test('optional search keeps a bounded ATT&CK-only list and exports snapshots through the callback', async () => {
  const document = dom(), search = document.createElement('input'), choice = document.createElement('select');
  const app = flow({search, choice});
  assert.equal(choice.children.length, 2);
  choice.value = 'T0800'; app.nodes.addButton.dispatch('click'); app.nodes.addButton.dispatch('click');
  await app.nodes.exportButton.dispatch('click');
  assert.deepEqual(app.exports, [{title: '', steps: ['T0800', 'T0800']}]);
  search.value = 'not found'; search.dispatch('input');
  assert.equal(choice.children.length, 0); assert.equal(app.nodes.addButton.disabled, true);
});

test('export rejects invalid size and reports callback failure without losing draft', async () => {
  const app = flow({onExport: () => { throw new Error('Synthetic export failure'); }});
  await app.nodes.exportButton.dispatch('click');
  assert.match(app.nodes.status.textContent, /2.*20/);
  app.component.add(records[0]); app.component.add(records[1]);
  await app.nodes.exportButton.dispatch('click');
  assert.match(app.nodes.status.textContent, /Synthetic export failure/);
  assert.equal(app.nodes.exportButton.disabled, false);
  assert.equal(app.component.snapshot().steps.length, 2);
});

test('removing the final step focuses the title when selected ATLAS disables Add', () => {
  const app = flow(); app.component.add(records[0]); app.component.setSelected(records[2]);
  app.nodes.list.children[0].children[1].children[2].dispatch('click');
  assert.equal(app.document.active(), app.nodes.title);
});
