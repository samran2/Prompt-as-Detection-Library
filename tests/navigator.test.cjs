'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const navigator = require('../demo/navigator.js');
const catalog = require('../demo/catalog.js');
const atlas = require('../demo/atlas-catalog.js');

test('Navigator exports every exact pinned domain ID and tactic in layer format 4.5', () => {
  for (const [domain, count] of [['Enterprise', 697], ['Mobile', 124], ['ICS', 97]]) {
    const records = catalog.filter(record => record.domain === domain);
    const layer = navigator.createLayer([...catalog, ...atlas], { domain });
    assert.deepEqual(layer.versions, { attack: '19.2', navigator: '5.2.0', layer: '4.5' });
    assert.equal(layer.domain, `${domain.toLowerCase()}-attack`);
    assert.equal(new Set(layer.techniques.map(item => item.techniqueID)).size, count);
    assert.deepEqual(layer.techniques.map(item => `${item.techniqueID}:${item.tactic}`).sort(),
      records.flatMap(record => record.tactics.map(tactic => `${record.id}:${tactic.toLowerCase().replaceAll(' ', '-')}`)).sort());
    assert.ok(layer.techniques.every(item => item.color === '#2563eb' && !('score' in item)));
    assert.match(layer.description, /not validated detection/);
    assert.equal(layer.selectSubtechniquesWithParent, false);
  }
});

test('Navigator summary follows official pinned matrix order and counts unique IDs per tactic', () => {
  for (const domain of ['Enterprise', 'Mobile', 'ICS']) {
    const summary = navigator.summarize(catalog, { domain });
    const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, `../sources/attack-19.2/raw/${domain.toLowerCase()}-attack-19.2.json`)));
    const matrix = bundle.objects.find(item => item.type === 'x-mitre-matrix' && !item.revoked && !item.x_mitre_deprecated);
    const objects = new Map(bundle.objects.map(item => [item.id, item]));
    assert.deepEqual(summary.tactics.map(tactic => [tactic.name, tactic.id]),
      matrix.tactic_refs.map(id => [objects.get(id).name, objects.get(id).x_mitre_shortname]));
    assert.equal(summary.total, catalog.filter(record => record.domain === domain).length);
    assert.equal(summary.generated, summary.total);
    assert.equal(summary.reviewed, 0);
    assert.equal(summary.labValidated, 0);
    assert.equal(summary.fieldConfirmed, 0);
    for (const tactic of summary.tactics) {
      assert.deepEqual(tactic.techniqueIds, catalog.filter(record => record.domain === domain && record.tactics.includes(tactic.name)).map(record => record.id).sort());
      assert.equal(tactic.total, tactic.techniqueIds.length);
      assert.equal(tactic.generated, tactic.total);
    }
  }
});

test('Navigator ignores supplied validation, source URL, context, score and description claims', () => {
  const record = { ...catalog[0], validation: { level: 'field-confirmed', humanReviews: 99, reviewers: ['a', 'b'], labValidated: true, fieldConfirmed: true },
    sourceUrl: 'javascript:alert(1)', context: 'PRIVATE_CONTEXT', behavior: 'PRIVATE_DESCRIPTION', score: 100 };
  const layer = navigator.createLayer([record], { domain: 'Enterprise' });
  const output = JSON.stringify(layer);
  assert.ok(!output.includes('PRIVATE_'));
  assert.ok(!output.includes('javascript:'));
  assert.equal(layer.techniques[0].metadata.find(item => item.name === 'Prompt status').value, 'generated');
  assert.equal(navigator.summarize([record], { domain: 'Enterprise' }).reviewed, 0);
});

test('generated-only Navigator status remains bound to the canonical review baseline', () => {
  const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/prompts/index.json')));
  assert.deepEqual(index.totals.statuses, { generated: 918, reviewed: 0, 'lab-validated': 0, 'field-confirmed': 0 });
  assert.equal(index.totals.completedHumanReviews, 0);
});

test('Navigator rejects unsupported domains, malformed or oversized input and duplicate IDs', () => {
  for (const domain of [undefined, null, '', 'ATLAS', 'All', '__proto__', 'constructor', 'enterprise-attack']) {
    assert.throws(() => navigator.createLayer(catalog, { domain }), /domain/);
    assert.throws(() => navigator.summarize(catalog, { domain }), /domain/);
  }
  for (const records of [null, {}, Array(5001).fill(catalog[0]), [null]]) {
    assert.throws(() => navigator.createLayer(records, { domain: 'Enterprise' }));
  }
  for (const change of [{ id: 'AML.T0051' }, { id: 'T1001\n' }, { attackVersion: '20.0' }, { tactics: [] }, { tactics: ['Unknown tactic'] }, { tactics: ['Discovery', 'Discovery'] }]) {
    assert.throws(() => navigator.createLayer([{ ...catalog[0], ...change }], { domain: 'Enterprise' }));
  }
  assert.throws(() => navigator.createLayer([catalog[0], catalog[0]], { domain: 'Enterprise' }), /Duplicate/);
});

test('Navigator is deterministic, does not mutate inputs and supports an empty filtered domain', () => {
  const records = catalog.slice(0, 10).map(record => Object.freeze({ ...record, tactics: Object.freeze([...record.tactics]) }));
  const first = navigator.createLayer(Object.freeze(records), { domain: 'Enterprise' });
  assert.deepEqual(first, navigator.createLayer([...records].reverse(), { domain: 'Enterprise' }));
  assert.equal(navigator.createLayer([], { domain: 'ICS' }).techniques.length, 0);
  assert.equal(navigator.summarize([], { domain: 'ICS' }).total, 0);
});

test('Navigator UMD exposes the same local-only browser contract', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo/navigator.js'), 'utf8'), context);
  assert.equal(typeof context.PAD_NAVIGATOR.createLayer, 'function');
  assert.equal(typeof context.PAD_NAVIGATOR.summarize, 'function');
  assert.equal(context.PAD_NAVIGATOR.summarize([], { domain: 'ICS' }).total, 0);
});
