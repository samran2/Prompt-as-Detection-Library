'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const registryBuilder = require('../scripts/build_review_registry.cjs');

const ROOT = path.resolve(__dirname, '..');
const BACKENDS = ['defender-xdr', 'panther', 'sentinel', 'splunk'];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const promptKey = record => `${record.domain}:${record.id}`;
const sorted = values => [...values].sort();
const DOMAIN_SOURCES = [
  ['Enterprise', 'enterprise-attack-19.2.json'],
  ['ICS', 'ics-attack-19.2.json'],
  ['Mobile', 'mobile-attack-19.2.json'],
];

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

function activeSourceKeys() {
  return DOMAIN_SOURCES.flatMap(([domain, filename]) => {
    const bundle = readJson(`sources/attack-19.2/raw/${filename}`);
    return bundle.objects.filter(object => object.type === 'attack-pattern' && object.revoked !== true && object.x_mitre_deprecated !== true)
      .map(object => {
        const reference = object.external_references.find(item => item.source_name === 'mitre-attack');
        assert.ok(reference, `${object.id}: missing canonical ATT&CK reference`);
        return `${domain}:${reference.external_id}`;
      });
  });
}

test('review registry covers exactly every active ATT&CK 19.2 prompt', () => {
  const catalog = require('../demo/catalog.js');
  const registry = readJson('content/prompts/index.json');
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.attackVersion, '19.2');
  assert.equal(registry.records.length, 918);
  assert.deepEqual(sorted(registry.records.map(record => record.key)), sorted(catalog.map(promptKey)));
  assert.deepEqual(sorted(registry.records.map(record => record.key)), sorted(activeSourceKeys()));
  assert.equal(new Set(registry.records.map(record => record.key)).size, 918);

  const catalogByKey = new Map(catalog.map(record => [promptKey(record), record]));
  for (const record of registry.records) {
    const source = catalogByKey.get(record.key);
    assert.ok(source, `${record.key}: missing catalog source`);
    assert.equal(record.attackId, source.id);
    assert.equal(record.stixId, source.stixId);
    assert.equal(record.name, source.name);
    assert.equal(record.domain, source.domain);
    assert.deepEqual(record.tactics, source.tactics);
    assert.deepEqual(record.platforms, source.platforms);
    assert.equal(record.attackVersion, '19.2');
    assert.equal(record.source.url, source.sourceUrl);
    assert.match(record.source.bundle.sha256, /^[a-f0-9]{64}$/);

    const bytes = fs.readFileSync(path.join(ROOT, record.prompt.path));
    assert.equal(record.prompt.bytes, bytes.length, `${record.key}: prompt byte count`);
    assert.equal(record.prompt.sha256, sha256(bytes), `${record.key}: prompt hash`);
  }
});

test('new records truthfully remain generated with no invented review or validation evidence', () => {
  const registry = readJson('content/prompts/index.json');
  assert.deepEqual(registry.totals.statuses, {
    generated: 918,
    reviewed: 0,
    'lab-validated': 0,
    'field-confirmed': 0,
  });
  assert.equal(registry.totals.completedHumanReviews, 0);
  assert.equal(registry.totals.requiredHumanReviews, 1836);
  for (const record of registry.records) {
    assert.equal(record.lifecycle.status, 'generated');
    assert.deepEqual(record.lifecycle.humanReviews, []);
    assert.equal(record.lifecycle.reviewedAt, null);
    assert.equal(record.lifecycle.rubricVersion, null);
    assert.deepEqual(record.telemetry.required, []);
    assert.deepEqual(record.telemetry.fieldMappings, []);
    assert.equal(record.validation.lab.status, 'not-run');
    assert.deepEqual(record.validation.lab.evidence, []);
    assert.equal(record.validation.field.status, 'not-reported');
    assert.deepEqual(record.validation.field.evidence, []);
    assert.deepEqual(record.validation.modelEvals, []);
  }
});

test('native-rule matrix starts with four explicitly unassessed backend cells per prompt', () => {
  const registry = readJson('content/prompts/index.json');
  const matrix = readJson('content/native-rules/support-matrix.json');
  assert.equal(matrix.attackVersion, '19.2');
  assert.deepEqual(matrix.backends.map(backend => backend.id).sort(), BACKENDS);
  assert.equal(matrix.cells.length, 918 * BACKENDS.length);
  assert.equal(matrix.totals.statuses.unassessed, 918 * BACKENDS.length);
  assert.equal(matrix.totals.statuses.supported, 0);
  assert.equal(matrix.totals.statuses['not-applicable'], 0);
  assert.deepEqual(matrix.packTargets.map(target => [target.domain, target.plannedCases, target.selectionStatus]), [
    ['Enterprise', 100, 'pending-expert-curation'],
    ['ICS', 97, 'pending-expert-curation'],
    ['Mobile', 100, 'pending-expert-curation'],
  ]);
  assert.ok(matrix.packTargets.every(target => target.selectedPromptKeys.length === 0));

  const expected = registry.records.flatMap(record => BACKENDS.map(backend => `${record.key}:${backend}`));
  assert.deepEqual(sorted(matrix.cells.map(cell => cell.key)), sorted(expected));
  for (const cell of matrix.cells) {
    assert.equal(cell.status, 'unassessed');
    assert.equal(cell.applicability.decision, null);
    assert.equal(cell.applicability.rationale, null);
    assert.deepEqual(cell.applicability.evidence, []);
    assert.equal(cell.nativeRule.path, null);
    assert.equal(cell.nativeRule.sha256, null);
    assert.equal(cell.validation.status, 'not-run');
    assert.deepEqual(cell.validation.fixtures, []);
    assert.deepEqual(cell.validation.results, []);
  }
});

test('support-cell validation rejects unsupported claims and unaudited not-applicable decisions', () => {
  const base = {
    key: 'Enterprise:T1001:panther', promptKey: 'Enterprise:T1001', backend: 'panther', status: 'unassessed',
    applicability: { decision: null, rationale: null, evidence: [], assessedBy: null, assessedAt: null },
    nativeRule: { path: null, sha256: null, spdxLicense: null, origin: null },
    validation: { status: 'not-run', environment: null, fixtures: [], results: [], validatedBy: null, validatedAt: null },
  };
  assert.doesNotThrow(() => registryBuilder.validateSupportCell(base));
  assert.throws(() => registryBuilder.validateSupportCell({ ...base, status: 'supported' }), /supported.*rule.*evidence/i);
  assert.throws(() => registryBuilder.validateSupportCell({
    ...base,
    status: 'not-applicable',
    applicability: { decision: 'not-applicable', rationale: 'No telemetry', evidence: [] },
  }), /not-applicable.*evidence/i);
});

test('summary blocks stable release until real review and lab evidence exist', () => {
  const summary = readJson('validation/results/review-summary.json');
  assert.equal(summary.stableReleaseEligible, false);
  assert.equal(summary.outcome, 'not-ready');
  assert.deepEqual(summary.humanReviewProgress, { completed: 0, required: 1836 });
  assert.equal(summary.nativeRuleProgress.labValidated, 0);
  assert.ok(summary.blockers.some(blocker => /1,836 independent human reviews/.test(blocker)));
  assert.ok(summary.blockers.some(blocker => /laboratory validation/.test(blocker)));
});

test('check mode is deterministic, read-only and detects stale generated bytes', t => {
  const generated = [
    'content/prompts/index.json',
    'content/native-rules/support-matrix.json',
    'validation/results/review-summary.json',
  ];
  const before = generated.map(relative => fs.statSync(path.join(ROOT, relative)).mtimeMs);
  const result = registryBuilder.buildReviewRegistry({ root: ROOT, check: true });
  assert.equal(result.promptCount, 918);
  assert.equal(result.matrixCellCount, 3672);
  assert.deepEqual(generated.map(relative => fs.statSync(path.join(ROOT, relative)).mtimeMs), before);

  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pad-review-registry-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const relative = 'content/prompts/index.json';
  const file = path.join(directory, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'stale\n');
  const expected = new Map([[relative, 'expected\n']]);
  assert.throws(() => registryBuilder.writeOutputs(directory, expected, true), /differs/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'stale\n');
});

test('CLI fails closed on unknown arguments', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build_review_registry.cjs'), '--output', '/tmp/private'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/);
  assert.ok(!result.stderr.includes('/tmp/private'));
});
