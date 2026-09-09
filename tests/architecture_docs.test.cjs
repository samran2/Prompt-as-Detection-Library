'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const DOCUMENTS = [
  'docs/api.md',
  'docs/data-contracts.md',
  'docs/validation-program.md',
  'docs/privacy.md',
  'docs/accessibility.md',
  'docs/release-evidence.md',
  'governance/decisions/0001-local-first-static-workbench.md',
  'governance/decisions/0002-read-only-versioned-research-api.md',
  'governance/decisions/0003-postgresql-oci-production-service.md',
  'governance/decisions/0004-native-rule-evidence-and-not-applicable.md',
  'governance/decisions/0005-human-review-release-gates.md',
  'governance/threat-models/static-workbench.md',
  'governance/threat-models/research-api.md',
];

const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

test('architecture documentation set is complete and separates current from future scope', () => {
  for (const relative of DOCUMENTS) {
    assert.ok(fs.statSync(path.join(ROOT, relative)).isFile(), `${relative} must exist`);
    const content = read(relative);
    assert.match(content, /^# /, `${relative} must have a title`);
    assert.doesNotMatch(content, /\b(?:TODO|TBD|FIXME)\b/, `${relative} must not rely on ambiguous placeholders`);
  }

  assert.match(read('docs/api.md'), /experimental, read-only local reference service/i);
  assert.match(read('docs/api.md'), /not a hosted public beta/i);
  assert.match(read('docs/api.md'), /OpenAPI 3\.1/);
  assert.match(read('docs/data-contracts.md'), /ATT&CK 19\.2/);
  assert.match(read('docs/validation-program.md'), /generated.*reviewed.*lab-validated.*field-confirmed/is);
});

test('ADRs use stable metadata and capture required decisions', () => {
  for (const relative of DOCUMENTS.filter(file => file.startsWith('governance/decisions/'))) {
    const content = read(relative);
    assert.match(content, /\n## Status\n/);
    assert.match(content, /\n## Date\n\n\d{4}-\d{2}-\d{2}\n/);
    assert.match(content, /\n## Context\n/);
    assert.match(content, /\n## Decision\n/);
    assert.match(content, /\n## Consequences\n/);
  }
});

test('threat models are repository-grounded and use stable threat identifiers', () => {
  const staticModel = read('governance/threat-models/static-workbench.md');
  const apiModel = read('governance/threat-models/research-api.md');

  assert.match(staticModel, /scripts\/build_demo\.cjs/);
  assert.match(staticModel, /demo\/app\.js/);
  assert.match(apiModel, /future|proposed/i);
  assert.match(apiModel, /PostgreSQL/);
  assert.match(apiModel, /rate limit/i);
  for (const content of [staticModel, apiModel]) {
    assert.match(content, /```mermaid\nflowchart (?:TD|LR)/);
    assert.match(content, /TM-00[1-9]/);
    assert.match(content, /## Scope and assumptions/);
    assert.match(content, /## Threat model table/);
    assert.match(content, /## Focus paths for security review/);
  }
});

test('owned documentation uses only resolvable local Markdown links', () => {
  for (const relative of DOCUMENTS) {
    const content = read(relative);
    const links = [...content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
    for (const target of links) {
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      const fileTarget = decodeURIComponent(target.split('#')[0]);
      assert.ok(fs.existsSync(path.resolve(ROOT, path.dirname(relative), fileTarget)),
        `${relative} contains an unresolved local link: ${target}`);
    }
  }
});
