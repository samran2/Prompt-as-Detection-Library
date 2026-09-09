'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('release documentation describes the phased v1.0 evidence gates', () => {
  const roadmap = read('ROADMAP.md');
  const releaseProcess = read('docs/release-process.md');
  const versioning = read('docs/versioning.md');

  for (const required of [
    '0.4.0.dev0',
    '918',
    'two independent',
    '400',
    'Mobile',
    '97',
    'WCAG 2.2 AA',
    'API beta',
  ]) {
    assert.match(roadmap, new RegExp(required, 'i'));
  }

  for (const required of ['SBOM', 'SHA-256', 'Sigstore', 'SLSA Build L2', 'rollback']) {
    assert.match(releaseProcess, new RegExp(required, 'i'));
  }

  assert.match(versioning, /vMAJOR\.MINOR\.PATCH/);
  assert.match(versioning, /must not be published as stable/i);
  assert.match(versioning, /918[\s\S]+two independent/i);
});

test('repository settings are an unapplied checklist, not an implementation claim', () => {
  const settings = read('docs/repository-settings.md');

  assert.match(settings, /desired state/i);
  assert.match(settings, /not evidence/i);
  assert.doesNotMatch(settings, /^- \[[xX]\]/m);

  for (const required of [
    'homepage',
    'topics',
    'two approvals',
    'CODEOWNERS',
    'signed commits',
    'linear history',
    'force-push',
    'deletion',
    'SHA-pinned',
  ]) {
    assert.match(settings, new RegExp(required, 'i'));
  }
});

test('contribution templates ask for reproducible and review evidence', () => {
  const promptIssue = read('.github/ISSUE_TEMPLATE/prompt_quality.md');
  const nativeRuleIssue = read('.github/ISSUE_TEMPLATE/native_rule.md');
  const pullRequest = read('.github/pull_request_template.md');

  assert.match(promptIssue, /independent reviewer/i);
  assert.match(promptIssue, /rubric version/i);
  assert.match(nativeRuleIssue, /benign-lookalike/i);
  assert.match(nativeRuleIssue, /missing telemetry/i);
  assert.match(nativeRuleIssue, /not-applicable/i);
  assert.match(pullRequest, /validation status/i);
  assert.match(pullRequest, /rollback/i);
  assert.match(pullRequest, /DCO/i);
});
