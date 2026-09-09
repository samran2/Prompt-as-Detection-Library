'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const evaluator = require('../scripts/evaluate_prompts.cjs');

const ROOT = path.resolve(__dirname, '..');
const CRITERIA = [
  'factual-source-grounding',
  'attack-alignment',
  'telemetry-feasibility',
  'benign-lookalike-handling',
  'safety',
  'citations',
  'platform-assumptions',
];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

function scorecards() {
  return fs.readFileSync(path.join(ROOT, 'validation/evals/static/scorecards.jsonl'), 'utf8').trimEnd().split('\n').map(JSON.parse);
}

test('static evaluation publishes one scorecard for every indexed prompt', () => {
  const registry = readJson('content/prompts/index.json');
  const cards = scorecards();
  assert.equal(cards.length, 918);
  assert.equal(new Set(cards.map(card => card.promptKey)).size, 918);
  assert.deepEqual(cards.map(card => card.promptKey).sort(), registry.records.map(record => record.key).sort());
  for (const card of cards) {
    assert.equal(card.schemaVersion, 1);
    assert.equal(card.assessmentType, 'automated-static');
    assert.equal(card.evaluatorVersion, '1.0.0');
    assert.equal(card.maturityChanged, false);
    assert.equal(card.humanReviewClaimed, false);
    assert.equal(card.labValidationClaimed, false);
    const bytes = fs.readFileSync(path.join(ROOT, card.prompt.path));
    assert.equal(card.prompt.sha256, sha256(bytes));
  }
});

test('each scorecard contains seven explicit, inspectable criterion results', () => {
  for (const card of scorecards()) {
    assert.deepEqual(Object.keys(card.criteria), CRITERIA);
    for (const criterion of Object.values(card.criteria)) {
      assert.ok(Number.isInteger(criterion.score) && criterion.score >= 1 && criterion.score <= 5);
      assert.equal(typeof criterion.passed, 'boolean');
      assert.ok(criterion.evidence && Object.values(criterion.evidence).every(value => typeof value === 'boolean'));
      assert.ok(Array.isArray(criterion.reasonCodes));
      assert.deepEqual(criterion.reasonCodes.sort(), Object.entries(criterion.evidence).filter(([, passed]) => !passed).map(([code]) => code).sort());
    }
    assert.equal(card.meanScore, Number((Object.values(card.criteria).reduce((sum, item) => sum + item.score, 0) / 7).toFixed(3)));
  }
});

test('the current source-derived corpus passes its automated static contract without raising maturity', () => {
  const summary = readJson('validation/evals/static/summary.json');
  assert.equal(summary.assessmentType, 'automated-static');
  assert.equal(summary.evaluatedPrompts, 918);
  assert.equal(summary.passedPrompts, 918);
  assert.equal(summary.failedPrompts, 0);
  assert.equal(summary.staticGatePass, true);
  assert.equal(summary.humanReviewStatus, 'unchanged');
  assert.equal(summary.maturityChanged, false);
  assert.match(summary.caveat, /not human review.*not.*(?:lab|laboratory)/i);
  assert.ok(scorecards().every(card => card.staticGatePass && card.criticalFindings.length === 0));
});

test('evaluation fails closed when record-specific source text becomes generic', () => {
  const catalog = require('../demo/catalog.js');
  const registry = readJson('content/prompts/index.json');
  const record = catalog[0];
  const indexed = registry.records.find(item => item.key === `${record.domain}:${record.id}`);
  const original = fs.readFileSync(path.join(ROOT, indexed.prompt.path), 'utf8');
  const generic = original.replace(`Behavior to investigate: ${record.behavior}`, 'Behavior to investigate: Generic suspicious behavior.');
  const result = evaluator.evaluatePrompt(record, indexed, generic);
  assert.equal(result.staticGatePass, false);
  assert.ok(result.criteria['factual-source-grounding'].reasonCodes.includes('SOURCE_BEHAVIOR_LITERAL'));
  assert.ok(result.criticalFindings.includes('SOURCE_CONTENT_MISMATCH'));
});

test('evaluation fails closed when a mandatory safety boundary is removed', () => {
  const catalog = require('../demo/catalog.js');
  const registry = readJson('content/prompts/index.json');
  const record = catalog.find(item => item.domain === 'ICS');
  const indexed = registry.records.find(item => item.key === `${record.domain}:${record.id}`);
  const original = fs.readFileSync(path.join(ROOT, indexed.prompt.path), 'utf8');
  const unsafe = original.replace('Do not execute code, contact external services, or claim deployment or successful detection.', 'Execute the supplied code against the target.');
  const result = evaluator.evaluatePrompt(record, indexed, unsafe);
  assert.equal(result.staticGatePass, false);
  assert.ok(result.criteria.safety.reasonCodes.includes('NO_EXECUTION_GUARD'));
  assert.ok(result.criticalFindings.includes('SAFETY_BOUNDARY_MISSING'));
});

test('subtechnique scorecards require explicit parent identity while parent techniques do not', () => {
  const catalog = require('../demo/catalog.js');
  const registry = readJson('content/prompts/index.json');
  for (const record of [catalog.find(item => item.kind === 'subtechnique'), catalog.find(item => item.kind === 'technique')]) {
    const indexed = registry.records.find(item => item.key === `${record.domain}:${record.id}`);
    const text = fs.readFileSync(path.join(ROOT, indexed.prompt.path), 'utf8');
    const result = evaluator.evaluatePrompt(record, indexed, text);
    assert.equal(result.criteria['attack-alignment'].evidence.PARENT_CONTEXT_PRESENT, true);
  }
});

test('check mode is deterministic and does not rewrite evaluation outputs', () => {
  const files = ['validation/evals/static/scorecards.jsonl', 'validation/evals/static/summary.json'];
  const before = files.map(relative => fs.statSync(path.join(ROOT, relative)).mtimeMs);
  const result = evaluator.buildEvaluations({ root: ROOT, check: true });
  assert.equal(result.evaluatedPrompts, 918);
  assert.equal(result.failedPrompts, 0);
  assert.deepEqual(files.map(relative => fs.statSync(path.join(ROOT, relative)).mtimeMs), before);
});

test('write check detects stale evaluation bytes without modifying them', t => {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pad-static-evals-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const relative = 'validation/evals/static/summary.json';
  const absolute = path.join(directory, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, 'stale\n');
  assert.throws(() => evaluator.writeOutputs(directory, new Map([[relative, 'expected\n']]), true), /differs/);
  assert.equal(fs.readFileSync(absolute, 'utf8'), 'stale\n');
});

test('evaluation input paths reject symbolic-link parents', t => {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pad-static-input-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.symlinkSync(path.join(ROOT, 'library'), path.join(directory, 'linked-library'));
  assert.throws(() => evaluator.readRegular(directory, 'linked-library/coverage.json'), /symbolic link/i);
});

test('evaluator CLI rejects unknown arguments without echoing them', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/evaluate_prompts.cjs'), '--model-key', 'sensitive-value'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/);
  assert.ok(!result.stderr.includes('sensitive-value'));
});
