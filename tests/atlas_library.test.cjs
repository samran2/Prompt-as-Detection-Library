'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../demo/core.js');
const generator = require('../scripts/build_atlas.cjs');

const root = path.resolve(__dirname, '..');
const sourceJson = path.join(root, 'sources/atlas-2026.08/derived/ATLAS-2026.08.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const sorted = values => [...values].sort();

test('pinned ATLAS v2026.08 source and normalized inventory are exact', () => {
  const loaded = generator.loadSources(root);
  const converted = generator.convertAtlas(loaded.data);
  assert.equal(loaded.manifest.tag.commitSha, '41d4f5ca4112f0e492ffaa3ebff07dc80a75afa5');
  assert.equal(loaded.manifest.contentVersion, '2026.08');
  assert.equal(loaded.manifest.formatVersion, '6.0.0');
  assert.equal(loaded.manifest.license.spdx, 'Apache-2.0');
  assert.equal(converted.records.length, 197);
  assert.equal(converted.records.filter(record => record.kind === 'technique').length, 114);
  assert.equal(converted.records.filter(record => record.kind === 'subtechnique').length, 83);
  assert.equal(converted.tactics.length, 16);
  assert.equal(converted.mitigations.length, 39);
  assert.equal(converted.caseStudies.length, 72);
  assert.equal(converted.relationships.length, 1318);
  assert.deepEqual(Object.fromEntries(Object.entries(converted.relationshipCounts).sort()), {
    achieves: 214, employs: 659, mitigates: 346, sequences: 16, specializes: 83,
  });
  assert.deepEqual(Object.fromEntries(Object.entries(converted.maturityCounts).sort()), {
    Demonstrated: 84, Feasible: 18, Realized: 95,
  });
});

test('every ATLAS technique preserves source text, AML relationships and maturity without invented validation', () => {
  const source = JSON.parse(fs.readFileSync(sourceJson, 'utf8'));
  const converted = generator.convertAtlas(source);
  const records = new Map(converted.records.map(record => [record.id, record]));
  for (const [id, raw] of Object.entries(source.techniques)) {
    const record = records.get(id);
    assert.ok(record, id);
    assert.equal(record.framework, 'ATLAS');
    assert.equal(record.domain, 'ATLAS');
    assert.equal(record.atlasVersion, '2026.08');
    assert.equal(record.contentVersion, '2026.08');
    assert.equal(record.name, raw.name);
    assert.equal(record.behavior, raw.description);
    assert.equal(record.sourceMaturity, raw.maturity);
    assert.equal(core.validationState(record).level, 'generated');
    assert.deepEqual(record.platforms, raw.platforms);
    assert.deepEqual(record.telemetry, []);
    assert.deepEqual(record.strategies, []);
    assert.deepEqual(record.projectGuidance, {telemetry: [], falsePositives: []});
    if (/^AML\.T\d{4}\.\d{3}$/.test(id)) {
      const parent = source.relationships[id].specializes;
      assert.equal(parent.length, 1, id);
      assert.equal(record.parentId, parent[0].target);
      assert.equal(record.parentName, source.techniques[parent[0].target].name);
    } else {
      assert.equal(record.parentId, null);
      assert.equal(record.parentName, null);
    }
    const tacticNames = (source.relationships[id].achieves || [])
      .map(relation => source.tactics[relation.target].name);
    assert.deepEqual(sorted(record.tactics), sorted(tacticNames));
    for (const reference of record.references) {
      assert.equal(typeof reference.source_name, 'string');
      assert.match(reference.url, /^https?:\/\//);
    }
    for (const linked of [...record.caseStudies, ...record.mitigations]) {
      assert.equal(typeof linked.description, 'string');
      assert.match(linked.url, /^https:\/\/atlas\.mitre\.org\//);
      assert.ok(linked.relationships.length > 0);
    }
  }
});

test('ATLAS generated catalog, metadata and prompt files match deterministic outputs', () => {
  const expected = generator.expectedOutputs(root);
  const browserCatalog = require('../demo/atlas-catalog.js');
  const coverage = JSON.parse(fs.readFileSync(path.join(root, 'content/atlas/coverage.json'), 'utf8'));
  const index = JSON.parse(fs.readFileSync(path.join(root, 'content/atlas/index.json'), 'utf8'));
  assert.equal(browserCatalog.length, 197);
  assert.equal(index.records.length, 197);
  assert.equal(coverage.framework, 'ATLAS');
  assert.equal(coverage.atlasVersion, '2026.08');
  assert.deepEqual(coverage.counts, {
    recordCount: 197, techniques: 114, subtechniques: 83, tactics: 16,
    mitigations: 39, caseStudies: 72, relationships: 1318, prompts: 197,
  });
  assert.equal(coverage.generatedFiles.length, expected.outputs.size - 1);
  for (const [relative, content] of expected.outputs) {
    const bytes = fs.readFileSync(path.join(root, relative));
    assert.equal(bytes.toString('utf8'), content, relative);
    const evidence = coverage.generatedFiles.find(file => file.path === relative);
    if (relative !== 'content/atlas/coverage.json') {
      assert.equal(evidence.bytes, bytes.length, relative);
      assert.equal(evidence.sha256, sha256(bytes), relative);
    }
  }
  for (const record of browserCatalog) {
    const prompt = fs.readFileSync(path.join(root, `content/atlas/prompts/${record.id}.txt`), 'utf8');
    assert.equal(prompt, core.composePrompt(record));
    assert.match(prompt, /GENERATED|generated/);
    assert.ok(prompt.includes(record.behavior));
    assert.ok(prompt.includes(record.sourceUrl));
  }
});

test('ATLAS source loading fails closed on changed bytes or unexpected files', t => {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pad-atlas-')));
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  fs.cpSync(path.join(root, 'sources/atlas-2026.08'), path.join(temporary, 'sources/atlas-2026.08'), {recursive: true});
  fs.appendFileSync(path.join(temporary, 'sources/atlas-2026.08/derived/ATLAS-2026.08.json'), '\n');
  assert.throws(() => generator.loadSources(temporary), /integrity|checksum|size/i);
  fs.cpSync(path.join(root, 'sources/atlas-2026.08/derived/ATLAS-2026.08.json'),
    path.join(temporary, 'sources/atlas-2026.08/derived/ATLAS-2026.08.json'));
  fs.writeFileSync(path.join(temporary, 'sources/atlas-2026.08/unexpected.txt'), 'unexpected');
  assert.throws(() => generator.loadSources(temporary), /unexpected|unknown/i);
});

test('browser module encodes imported strings as inert literal data', () => {
  const text = generator.renderCatalog([{id: 'AML.T9000', behavior: '</script><script>globalThis.pwned=true</script> ${HOME}\u2028'}]);
  assert.ok(!text.includes('</script>'));
  assert.ok(!text.includes('\u2028'));
  const sandbox = {};
  vm.runInNewContext(text, sandbox);
  assert.equal(sandbox.pwned, undefined);
  assert.equal(sandbox.PAD_ATLAS_CATALOG[0].behavior, '</script><script>globalThis.pwned=true</script> ${HOME}\u2028');
});
