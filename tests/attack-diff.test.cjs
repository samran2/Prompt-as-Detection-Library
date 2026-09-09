'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const script = path.resolve(__dirname, '../scripts/attack_diff.cjs');
const id = (type, n) => `${type}--00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const bytes = value => Buffer.from(JSON.stringify(value));
const object = (type, n, properties = {}) => ({type, id: id(type, n), modified: '2026-01-01T00:00:00.000Z', ...properties});
const technique = (n, properties = {}) => object('attack-pattern', n, {
  name: `Technique ${n}`, x_mitre_domains: ['enterprise-attack'],
  external_references: [{source_name: 'mitre-attack', external_id: `T${String(n).padStart(4, '0')}`}], ...properties,
});
const bundle = (objects, version = 'fixture-1') => ({
  type: 'bundle', id: id('bundle', 1), objects: [
    object('x-mitre-collection', 1, {name: 'Enterprise ATT&CK', x_mitre_version: version}), ...objects,
  ],
});
const compare = (baseline, candidate) => require(script).compareBundles({domain: 'Enterprise', baselineBytes: bytes(baseline), candidateBytes: bytes(candidate)});
const changedIds = records => records.map(record => record.stixId);
function temporary(t) {
  const directory = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pad-attack-diff-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  return directory;
}
function cli(args) {
  return spawnSync(process.execPath, [script, ...args], {encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024});
}

test('diff reports exact hashes, versions and distinct changes without implying an upgrade', () => {
  const baseline = bundle([technique(1), technique(2), technique(3), technique(4)]);
  const candidate = bundle([technique(1, {description: 'literal <script> data'}), technique(2, {revoked: true}), technique(3, {x_mitre_deprecated: true}), technique(5)], 'fixture-2');
  const result = compare(baseline, candidate);
  assert.equal(result.status, 'proposed');
  assert.equal(result.baseline.sha256, createHash('sha256').update(bytes(baseline)).digest('hex'));
  assert.equal(result.candidate.collectionVersion, 'fixture-2');
  assert.equal(result.baseline.bundleId, baseline.id);
  assert.deepEqual(changedIds(result.changes.added), [id('attack-pattern', 5)]);
  assert.deepEqual(changedIds(result.changes.removed), [id('attack-pattern', 4)]);
  assert.deepEqual(changedIds(result.changes.revoked), [id('attack-pattern', 2)]);
  assert.deepEqual(changedIds(result.changes.deprecated), [id('attack-pattern', 3)]);
  assert.ok(result.changes.changed.find(change => change.stixId === id('attack-pattern', 1)).changedFields.includes('description'));
  assert.deepEqual(result.impactedPromptIds, ['T0001', 'T0002', 'T0003', 'T0004']);
  assert.deepEqual(result.newTechniqueIds, ['T0005']);
  assert.equal(Object.hasOwn(result, 'generatedAt'), false);
});

test('object key and bundle order changes do not create content changes; array order is retained', () => {
  const baseline = bundle([technique(1, {labels: ['a', 'b']}), technique(2)]);
  const candidate = JSON.parse(JSON.stringify(baseline));
  candidate.objects.reverse();
  candidate.objects = candidate.objects.map(record => Object.fromEntries(Object.entries(record).reverse()));
  const result = compare(baseline, candidate);
  for (const changes of Object.values(result.changes)) assert.deepEqual(changes, []);
  assert.notEqual(result.baseline.sha256, result.candidate.sha256);
  assert.deepEqual(result.impactedPromptIds, []);
  candidate.objects.find(record => record.id === id('attack-pattern', 1)).labels.reverse();
  assert.deepEqual(changedIds(compare(baseline, candidate).changes.changed), [id('attack-pattern', 1)]);
});

test('omitted false lifecycle defaults and already inactive objects are not new revocations', () => {
  const baseline = bundle([technique(1), technique(2, {revoked: true}), technique(3, {x_mitre_deprecated: true})]);
  const candidate = structuredClone(baseline);
  candidate.objects.find(record => record.id === id('attack-pattern', 1)).revoked = false;
  candidate.objects.find(record => record.id === id('attack-pattern', 1)).x_mitre_deprecated = false;
  for (const changes of Object.values(compare(baseline, candidate).changes)) assert.deepEqual(changes, []);
  candidate.objects.push(technique(4, {revoked: true}));
  const report = compare(baseline, candidate);
  assert.equal(report.changes.added.length, 1);
  assert.deepEqual(report.changes.revoked, []);
  assert.deepEqual(report.newTechniqueIds, []);
});

test('impact follows analytics, data components, procedures and old plus new relationship endpoints', () => {
  const analytic = object('x-mitre-analytic', 1, {description: 'a', x_mitre_log_source_references: [{x_mitre_data_component_ref: id('x-mitre-data-component', 1)}]});
  const strategy = object('x-mitre-detection-strategy', 1, {x_mitre_analytic_refs: [analytic.id]});
  const detection = object('relationship', 1, {relationship_type: 'detects', source_ref: strategy.id, target_ref: id('attack-pattern', 1)});
  const actor = object('tool', 1, {name: 'Source tool'});
  const procedure = object('relationship', 2, {relationship_type: 'uses', source_ref: actor.id, target_ref: id('attack-pattern', 2)});
  const parent = object('relationship', 3, {relationship_type: 'subtechnique-of', source_ref: id('attack-pattern', 3), target_ref: id('attack-pattern', 1)});
  const baseline = bundle([technique(1), technique(2), technique(3), analytic, strategy, detection, actor, procedure, parent, object('x-mitre-data-component', 1, {name: 'Logs'})]);
  for (const [changedId, expected] of [[analytic.id, ['T0001']], [id('x-mitre-data-component', 1), ['T0001']], [actor.id, ['T0002']], [procedure.id, ['T0002']], [id('attack-pattern', 1), ['T0001', 'T0003']]]) {
    const candidate = structuredClone(baseline);
    candidate.objects.find(record => record.id === changedId).description = 'Changed source';
    assert.deepEqual(compare(baseline, candidate).impactedPromptIds, expected, changedId);
  }
  const rewired = structuredClone(baseline);
  rewired.objects.find(record => record.id === detection.id).target_ref = id('attack-pattern', 2);
  assert.deepEqual(compare(baseline, rewired).impactedPromptIds, ['T0001', 'T0002']);
  const removed = structuredClone(baseline);
  removed.objects = removed.objects.filter(record => record.id !== analytic.id);
  assert.deepEqual(compare(baseline, removed).impactedPromptIds, ['T0001']);
});

test('inactive source edges and unrelated analytics do not inflate existing prompt impact', () => {
  const unlinked = object('x-mitre-analytic', 1, {description: 'Unlinked'});
  const inactive = object('relationship', 1, {relationship_type: 'detects', source_ref: unlinked.id, target_ref: id('attack-pattern', 1), revoked: true});
  const baseline = bundle([technique(1), unlinked, inactive]);
  const candidate = structuredClone(baseline);
  candidate.objects.find(record => record.id === unlinked.id).description = 'Edited';
  assert.deepEqual(compare(baseline, candidate).impactedPromptIds, []);
});

test('added procedure relationships and removed analytics stay connected to existing prompts', () => {
  const tool = object('tool', 1);
  const analytic = object('x-mitre-analytic', 1);
  const strategy = object('x-mitre-detection-strategy', 1, {x_mitre_analytic_refs: [analytic.id]});
  const detection = object('relationship', 1, {relationship_type: 'detects', source_ref: strategy.id, target_ref: id('attack-pattern', 1)});
  const baseline = bundle([technique(1), technique(2), tool, analytic, strategy, detection]);
  const candidate = structuredClone(baseline);
  candidate.objects.push(object('relationship', 2, {relationship_type: 'uses', source_ref: tool.id, target_ref: id('attack-pattern', 2)}));
  candidate.objects.find(record => record.id === analytic.id).revoked = true;
  assert.deepEqual(compare(baseline, candidate).impactedPromptIds, ['T0001', 'T0002']);
});

test('candidate boundary rejects duplicates, wrong domains, invalid identities, lifecycle types and deep input', () => {
  const baseline = bundle([technique(1)]);
  const variants = [
    bundle([technique(1), technique(1)]),
    bundle([technique(1), technique(2, {external_references: technique(1).external_references})]),
    bundle([technique(1, {x_mitre_domains: ['mobile-attack']})]),
    bundle([technique(1, {id: '../../private'})]),
    bundle([technique(1, {revoked: 'false'})]),
    bundle([technique(1), object('relationship', 1, {relationship_type: 'uses', source_ref: 'bad', target_ref: id('attack-pattern', 1)})]),
    {type: 'bundle', id: id('bundle', 1), objects: [technique(1)]},
  ];
  let nested = 'literal';
  for (let n = 0; n < 40; n++) nested = {nested};
  variants.push(bundle([technique(1, {nested})]));
  for (const candidate of variants) assert.throws(() => compare(baseline, candidate));
  assert.throws(() => require(script).compareBundles({domain: 'ATLAS', baselineBytes: bytes(baseline), candidateBytes: bytes(baseline)}), /domain/i);
  assert.throws(() => require(script).compareBundles({domain: 'Enterprise', baselineBytes: bytes(baseline), candidateBytes: Buffer.from([0xff])}), /UTF-8/i);
  assert.throws(() => compare(baseline, {...baseline, objects: Array(require(script).LIMITS.objects + 1).fill(technique(1))}), /object count/i);
  assert.throws(() => compare(baseline, bundle([technique(1, {description: 'x'.repeat(require(script).LIMITS.string + 1)})])), /string.*limit/i);
});

test('plain JSON prototype keys remain data and cannot alter object prototypes', () => {
  const baseline = bundle([technique(1)]);
  const candidate = JSON.parse(JSON.stringify(baseline).replace('"name":"Technique 1"', '"name":"Technique 1","__proto__":{"polluted":true}'));
  const result = compare(baseline, candidate);
  assert.deepEqual(result.changes.changed[0].changedFields, ['__proto__']);
  assert.equal({}.polluted, undefined);
  const emptyPrototype = JSON.parse(JSON.stringify(baseline).replace('"name":"Technique 1"', '"name":"Technique 1","__proto__":{}'));
  assert.deepEqual(compare(baseline, emptyPrototype).changes.changed[0].changedFields, ['__proto__']);
});

test('small repeated dependency inputs cannot trigger unbounded relationship expansion', () => {
  const analytic = object('x-mitre-analytic', 1, {x_mitre_log_source_references: Array(100).fill({x_mitre_data_component_ref: id('x-mitre-data-component', 1)})});
  const strategy = object('x-mitre-detection-strategy', 1, {x_mitre_analytic_refs: Array(100).fill(analytic.id)});
  const relations = Array.from({length: 200}, (_, index) => object('relationship', index, {relationship_type: 'detects', source_ref: strategy.id, target_ref: id('attack-pattern', 1)}));
  const expanded = bundle([technique(1), analytic, strategy, ...relations]);
  assert.throws(() => compare(bundle([technique(1)]), expanded), /traversal.*limit/i);
});

test('many external references are resolved once instead of for every incoming relationship', () => {
  const program = `
    const id = ${id}; const object = ${object}; const technique = ${technique}; const bundle = ${bundle};
    const api = require(process.argv[1]);
    const baseline = bundle([technique(1)]);
    const candidate = structuredClone(baseline);
    candidate.objects[1].external_references.push(...Array.from({length: 50000}, () => ({source_name: 'unrelated', external_id: 'literal'})));
    candidate.objects.push(object('tool', 1));
    for (let n = 0; n < 30000; n++) candidate.objects.push(object('relationship', n, {
      relationship_type: 'uses', source_ref: id('tool', 1), target_ref: id('attack-pattern', 1),
    }));
    const result = api.compareBundles({domain: 'Enterprise', baselineBytes: Buffer.from(JSON.stringify(baseline)), candidateBytes: Buffer.from(JSON.stringify(candidate))});
    process.stdout.write(JSON.stringify(result.impactedPromptIds));
  `;
  const result = spawnSync(process.execPath, ['-e', program, script], {encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024});
  assert.equal(result.status, 0, result.error?.message || result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ['T0001']);
});

test('identifiers reject coercible arrays and trailing line breaks at every bundle boundary', () => {
  const baseline = bundle([technique(1)]);
  const candidates = [
    bundle([technique(1, {external_references: [{source_name: 'mitre-attack', external_id: ['T0001']}]})]),
    bundle([technique(1, {external_references: [{source_name: 'mitre-attack', external_id: 'T0001\n'}]})]),
    bundle([technique(1, {id: `${id('attack-pattern', 1)}\n`})]),
    {...baseline, id: `${baseline.id}\n`},
    bundle([technique(1), object('relationship', 1, {relationship_type: 'uses', source_ref: `${id('tool', 1)}\n`, target_ref: id('attack-pattern', 1)})]),
  ];
  for (const candidate of candidates) assert.throws(() => compare(baseline, candidate));
});

test('bounded local reader refuses final and ancestor symlinks, directories, oversize files and invalid UTF-8', t => {
  const root = temporary(t);
  const candidate = path.join(root, 'candidate.json');
  fs.writeFileSync(candidate, bytes(bundle([technique(1)])));
  const api = require(script);
  assert.deepEqual(api.readBundleBytes(candidate), fs.readFileSync(candidate));
  fs.symlinkSync(candidate, path.join(root, 'link.json'));
  fs.symlinkSync(root, path.join(root, 'directory-link'));
  for (const target of [path.join(root, 'link.json'), path.join(root, 'directory-link', 'candidate.json'), root]) assert.throws(() => api.readBundleBytes(target));
  const oversized = path.join(root, 'oversized.json');
  const fd = fs.openSync(oversized, 'w');
  fs.ftruncateSync(fd, api.LIMITS.bytes + 1);
  fs.closeSync(fd);
  assert.throws(() => api.readBundleBytes(oversized), /limit|size/i);
  fs.writeFileSync(candidate, Buffer.from([0xff]));
  assert.throws(() => api.proposeAttackDiff({domain: 'Enterprise', candidatePath: candidate}), /UTF-8/i);
});

test('local reader rejects a file replaced between inspection and open', t => {
  const root = temporary(t);
  const candidate = path.join(root, 'candidate.json');
  const replacement = path.join(root, 'replacement.json');
  fs.writeFileSync(candidate, bytes(bundle([technique(1)])));
  fs.writeFileSync(replacement, bytes(bundle([technique(2)])));
  const open = fs.openSync;
  fs.openSync = function(filename, ...args) {
    if (filename === candidate) fs.renameSync(replacement, candidate);
    return open.call(this, filename, ...args);
  };
  try { assert.throws(() => require(script).readBundleBytes(candidate), /changed|replaced/i); }
  finally { fs.openSync = open; }
});

test('CLI requires explicit safe arguments and emits JSON errors without filesystem paths or stack traces', () => {
  for (const args of [[], ['--domain', 'Enterprise'], ['--domain', 'ATLAS', '--candidate', '/not-read'], ['--domain', 'ICS', '--candidate', 'https://example.test/bundle.json'], ['--domain', 'ICS', '--candidate', '/not-read', '--output', '/not-written'], ['--domain', 'ICS', '--domain', 'ICS', '--candidate', '/not-read']]) {
    const result = cli(args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(typeof JSON.parse(result.stderr).error.message, 'string');
    assert.doesNotMatch(result.stderr, /\n\s+at |\/not-read|\/not-written/);
  }
});

test('CLI compares the pinned ICS bundle unchanged without modifying its bytes', () => {
  const candidate = path.resolve(__dirname, '../sources/attack-19.2/raw/ics-attack-19.2.json');
  const before = fs.readFileSync(candidate);
  const result = cli(['--domain', 'ICS', '--candidate', candidate]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.baseline.sha256, '08b83d2cea6b6d6752468ef0e62e2ab2a53c9443ef72c439ecccb07ab9e89da9');
  assert.equal(report.baseline.collectionVersion, '19.2');
  assert.equal(report.candidate.sha256, report.baseline.sha256);
  assert.deepEqual(report.impactedPromptIds, []);
  for (const changes of Object.values(report.changes)) assert.deepEqual(changes, []);
  assert.deepEqual(fs.readFileSync(candidate), before);
});
