'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const robustness = require('../demo/robustness.js');

const record = { id: 'T1059.001', domain: 'Enterprise', name: 'PowerShell',
  context: 'PRIVATE RECORD CONTEXT', validation: { level: 'field-confirmed' } };
function input() {
  return { level: 1, origin: 'A', telemetry: 'Synthetic application audit events',
    observable: 'Synthetic exact executable name comparison',
    rationale: 'A file name can change; no behavior-invariant evidence supplied.',
    benignContext: 'Distinguish approved administration using synthetic allowlisted jobs.',
    evidenceReference: 'Synthetic local fixture CASE-001; not a real lab result' };
}

test('manual assessment requires evidence and never advances validation', () => {
  const result = robustness.createAssessment(record, input());
  assert.equal(result.schemaVersion, 'pad-robustness-assessment-1');
  assert.equal(result.status, 'manual-unverified');
  assert.equal(result.method, 'analyst-entered');
  assert.deepEqual(result.technique, { id: record.id, domain: record.domain, name: record.name });
  assert.equal(result.assessment.model, 'host');
  assert.equal(result.assessment.level, 1);
  assert.equal(result.methodology.documentationVersion, '4.0.0');
  assert.match(result.methodology.source, /^https:\/\/center-for-threat-informed-defense\.github\.io\//);
  assert.match(result.caveats.join(' '), /not MITRE certification/);
  assert.match(result.caveats.join(' '), /not independently verified/);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /PRIVATE RECORD CONTEXT|field-confirmed|reviewers|createdAt|validatedBackends/);
  assert.deepEqual(JSON.parse(serialized), result);
});

test('all five levels and origin dimensions are explicit analyst selections', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    for (const origin of ['A', 'U', 'K', 'P', 'H']) {
      const result = robustness.createAssessment(record, { ...input(), level, origin });
      assert.equal(result.assessment.level, level);
      assert.equal(result.assessment.origin, origin);
      assert.equal(result.assessment.model, ['P', 'H'].includes(origin) ? 'network' : 'host');
      assert.equal(result.status, 'manual-unverified');
    }
  }
  assert.deepEqual(robustness.LEVELS.map(item => item.value), [1, 2, 3, 4, 5]);
  assert.deepEqual(robustness.ORIGINS.map(item => item.value), ['A', 'U', 'K', 'P', 'H']);
  assert.ok(Object.isFrozen(robustness.LEVELS[0]));
});

test('missing, malformed and invented grades or validation fields are rejected', () => {
  for (const value of [undefined, null, [], 'assessment']) {
    assert.throws(() => robustness.createAssessment(record, value), /assessment/i);
  }
  for (const level of [undefined, '5', 0, 6, 1.5, NaN, Infinity, true, {}]) {
    assert.throws(() => robustness.createAssessment(record, { ...input(), level }), /level/i);
  }
  for (const origin of [undefined, '', 'host', 'X', [], null]) {
    assert.throws(() => robustness.createAssessment(record, { ...input(), origin }), /origin/i);
  }
  for (const extra of ['status', 'validation', 'reviewer', 'certified', 'toJSON', '__proto__']) {
    const value = JSON.parse(JSON.stringify(input()));
    Object.defineProperty(value, extra, { value: 'claimed', enumerable: true });
    assert.throws(() => robustness.createAssessment(record, value), /unsupported/i);
  }
});

test('analyst strings are mandatory, bounded, literal and free of control characters', () => {
  const fields = ['telemetry', 'observable', 'rationale', 'benignContext', 'evidenceReference'];
  for (const field of fields) {
    const maximum = field === 'evidenceReference' ? 1000 : 4000;
    for (const value of ['', ' \n ', null, [], 12, 'x'.repeat(maximum + 1), 'x\u0000', 'x\u0085']) {
      assert.throws(() => robustness.createAssessment(record, { ...input(), [field]: value }), new RegExp(field));
    }
    assert.equal(robustness.createAssessment(record, { ...input(), [field]: 'x'.repeat(maximum) }).assessment[field].length, maximum);
  }
  const literal = '<script>throw 1</script> ${HOME} `command` javascript:alert(1)';
  assert.equal(robustness.createAssessment(record, { ...input(), rationale: `  ${literal}  ` }).assessment.rationale, literal);
});

test('technique identity is projected without mutating records or analyst inputs', () => {
  const before = JSON.stringify(record); const data = input(); const original = JSON.stringify(data);
  const result = robustness.createAssessment(record, data);
  result.assessment.rationale = 'changed'; result.technique.name = 'changed'; result.caveats.length = 0;
  assert.equal(JSON.stringify(record), before);
  assert.equal(JSON.stringify(data), original);
  assert.ok(robustness.createAssessment(record, data).caveats.length > 0);
  for (const invalid of [null, [], {}, { ...record, id: 'T1059.001\n' }, { ...record, id: {} },
    { ...record, domain: 'Unknown' }, { ...record, name: ' ' }, { ...record, id: 'AML.T0051' }]) {
    assert.throws(() => robustness.createAssessment(invalid, data), /technique/i);
  }
  const atlas = robustness.createAssessment({ id: 'AML.T0051', name: 'LLM Prompt Injection', domain: 'ATLAS' }, data);
  assert.match(atlas.caveats.join(' '), /not a framework-wide applicability claim/);
});

test('browser UMD runs without network, storage, clocks or runtime dependencies', () => {
  const sandbox = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../demo/robustness.js'), 'utf8'), sandbox);
  const result = sandbox.PAD_ROBUSTNESS.createAssessment(record, input());
  assert.equal(result.status, 'manual-unverified');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), robustness.createAssessment(record, input()));
});

test('required values cannot be inherited, accessor-executed or implicitly coerced', () => {
  let executed = false;
  const value = input();
  Object.defineProperty(value, 'rationale', { get() { executed = true; return 'claimed'; } });
  assert.throws(() => robustness.createAssessment(record, value), /rationale/);
  const technique = { ...record };
  Object.defineProperty(technique, 'id', { get() { executed = true; return record.id; } });
  assert.throws(() => robustness.createAssessment(technique, input()), /technique/);
  assert.throws(() => robustness.createAssessment(record, Object.create(input())), /level/);
  assert.throws(() => robustness.createAssessment(record, { ...input(), rationale: {
    toString() { executed = true; return 'claimed'; },
  } }), /rationale/);
  assert.equal(executed, false);
});
