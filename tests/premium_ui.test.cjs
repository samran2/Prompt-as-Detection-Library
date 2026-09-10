const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../demo/core.js');

const record = {
  id: 'T1059.001', name: 'PowerShell', domain: 'Enterprise', kind: 'subtechnique',
  parentId: 'T1059', parentName: 'Command and Scripting Interpreter', attackVersion: '19.2',
  tactics: ['Execution'], platforms: ['Windows'], behavior: 'Investigate unusual PowerShell execution.',
  telemetry: ['Process Creation', 'Command Execution'],
  falsePositives: 'Local baseline guidance: verify ordinary administration.',
  sourceUrl: 'https://attack.mitre.org/techniques/T1059/001/', procedureCount: 2,
  procedureExamples: [],
  strategies: [{
    id: 'DET0455', name: 'PowerShell Execution',
    url: 'https://attack.mitre.org/detectionstrategies/DET0455/',
    analytics: [{
      id: 'AN1234', name: 'Synthetic analytic', description: 'Reference analytic.',
      platforms: ['Windows'], logSources: [{ name: 'Process', channel: 'PowerShell', dataComponent: 'Process Creation' }],
      mutableElements: [],
    }],
  }],
};

test('shareable UI state has a bounded canonical URL representation', () => {
  const parsed = core.parseUiState('?q=powershell&domain=Enterprise&tactic=Execution&platform=Windows&mode=hunt&target=Splunk+SPL&technique=T1059.001&compare=T1059.001,T1003&theme=dark&unknown=ignored');
  assert.deepEqual(parsed, {
    query: 'powershell', domain: 'Enterprise', tactic: 'Execution', platform: 'Windows',
    mode: 'hunt', target: 'Splunk SPL', technique: 'T1059.001',
    compare: ['T1059.001', 'T1003'], theme: 'dark',
  });
  assert.equal(
    core.serializeUiState(parsed),
    '?q=powershell&domain=Enterprise&tactic=Execution&platform=Windows&mode=hunt&target=Splunk+SPL&technique=T1059.001&compare=T1059.001%2CT1003&theme=dark',
  );
});

test('untrusted or unsupported URL values fall back without entering state', () => {
  const parsed = core.parseUiState(`?q=${'x'.repeat(240)}&domain=Other&mode=break&target=Unknown&technique=javascript%3Aalert(1)&compare=T1000,invalid,T1000,T2000&theme=neon`);
  assert.equal(parsed.query.length, 200);
  assert.equal(parsed.domain, '');
  assert.equal(parsed.mode, 'detect');
  assert.equal(parsed.target, 'Panther Python');
  assert.equal(parsed.technique, '');
  assert.deepEqual(parsed.compare, ['T1000', 'T2000']);
  assert.equal(parsed.theme, 'system');
});

test('URL parsing normalizes OT aliases to ICS domain in shareable state', () => {
  const parsed = core.parseUiState('?q=ICS+logic&domain=OperationalTechnology');
  assert.equal(parsed.domain, 'ICS');
  assert.equal(parsed.query, 'ICS logic');
  assert.equal(parsed.domainSelection, 'OT');
  assert.equal(
    core.serializeUiState(parsed),
    '?q=ICS+logic&domain=OT',
  );

  const parsedWithSpaces = core.parseUiState('?q=ICS+logic&domain=Operational+Technology');
  assert.equal(parsedWithSpaces.domain, 'ICS');
  assert.equal(parsedWithSpaces.domainSelection, 'OT');
  assert.equal(
    core.serializeUiState(parsedWithSpaces),
    '?q=ICS+logic&domain=OT',
  );
});

test('research export describes provenance, relationships and unvalidated state without overclaiming', () => {
  const exported = JSON.parse(core.exportResearchJSON([record], { mode: 'detect', target: 'Panther Python' }));
  assert.equal(exported.schema_version, 'pad-research-export-1');
  assert.equal(exported.reference.attack_version, '19.2');
  assert.equal(exported.records.length, 1);
  const item = exported.records[0];
  assert.deepEqual(item.validation, {
    level: 'generated', human_reviews: 0, lab_validated: false,
    field_confirmed: false, validated_backends: [],
  });
  assert.deepEqual(item.relationships.telemetry, ['Process Creation', 'Command Execution']);
  assert.deepEqual(item.relationships.detection_strategies, [{ id: 'DET0455', analytics: ['AN1234'] }]);
  assert.match(item.native_rule_readiness, /not published|not available/i);
  assert.match(item.prompt, /DRAFT/);
});

test('research export preserves supplied reviewed state but never infers lab or field validation', () => {
  const reviewed = { ...record, validation: { level: 'reviewed', humanReviews: 2, reviewers: ['reviewer-a', 'reviewer-b'] } };
  const item = JSON.parse(core.exportResearchJSON([reviewed], {})).records[0];
  assert.equal(item.validation.level, 'reviewed');
  assert.equal(item.validation.human_reviews, 2);
  assert.equal(item.validation.lab_validated, false);
  assert.equal(item.validation.field_confirmed, false);
});

test('one human review cannot advance any displayed or exported maturity claim', () => {
  const singlyReviewed = {
    ...record,
    validation: {
      level: 'field-confirmed',
      humanReviews: 1,
      reviewers: ['reviewer-a'],
      labValidated: true,
      fieldConfirmed: true,
      validatedBackends: ['Panther Python'],
    },
  };

  assert.deepEqual(core.validationState(singlyReviewed), {
    level: 'generated', human_reviews: 1, lab_validated: false,
    field_confirmed: false, validated_backends: [],
  });
  assert.deepEqual(
    JSON.parse(core.exportResearchJSON([singlyReviewed], {})).records[0].validation,
    core.validationState(singlyReviewed),
  );
});

test('review counts without two distinct non-empty reviewer identifiers cannot advance maturity', () => {
  const invalidReviewerSets = [
    { label: 'missing reviewers', reviewers: undefined },
    { label: 'duplicate reviewers', reviewers: ['reviewer-a', 'reviewer-a'] },
    { label: 'blank reviewer', reviewers: ['reviewer-a', '   '] },
  ];

  for (const { label, reviewers } of invalidReviewerSets) {
    const unverified = {
      ...record,
      validation: {
        level: 'field-confirmed', humanReviews: 2, reviewers,
        labValidated: true, fieldConfirmed: true, validatedBackends: ['Panther Python'],
      },
    };
    const expected = {
      level: 'generated', human_reviews: 2, lab_validated: false,
      field_confirmed: false, validated_backends: [],
    };

    assert.deepEqual(core.validationState(unverified), expected, label);
    assert.deepEqual(
      JSON.parse(core.exportResearchJSON([unverified], {})).records[0].validation,
      expected,
      `${label} export`,
    );
  }
});

test('incoherent maturity flags fail closed instead of displaying validation claims', () => {
  const incoherent = { ...record, validation: { level: 'field-confirmed', humanReviews: 0, labValidated: false, fieldConfirmed: true, validatedBackends: ['Panther Python'] } };
  assert.deepEqual(core.validationState(incoherent), {
    level: 'generated', human_reviews: 0, lab_validated: false,
    field_confirmed: false, validated_backends: [],
  });
});

test('premium workbench exposes theme, compare, evidence map and research export semantics', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'demo', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'demo', 'style.css'), 'utf8');
  for (const id of ['app-status', 'app-status-title', 'app-status-detail', 'reload-app', 'app-content', 'theme', 'active-filters', 'active-filter-text', 'clear-active-filters', 'compare-add', 'tab-source', 'panel-map', 'relationship-figure', 'relationship-text', 'compare-open', 'comparison-dialog', 'panel-compare', 'comparison-table', 'export-research', 'validation-level', 'provenance-summary']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `Missing #${id}`);
  }
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Loading the pinned library/i);
  assert.match(html, /value="system"/);
  assert.match(html, /value="dark"/);
  assert.match(html, /value="contrast"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /\[data-theme="dark"\]/);
  assert.match(css, /\[data-theme="contrast"\]/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media\s*\(max-width:\s*360px\)/);
  assert.match(css, /--space-1:/);
  assert.match(css, /\.status-screen/);
  assert.match(css, /@keyframes\s+skeleton/);
  assert.match(css, /\.comparison-delta/);
});

test('all appearance modes keep semantic action colors and 44px interactive targets', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'demo', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'demo', 'style.css'), 'utf8');
  assert.match(html, /id="search"[^>]*aria-controls="techniques"/);
  assert.match(html, /class="domains"[^>]*aria-controls="techniques"/);
  assert.match(html, /id="tactic"[^>]*aria-controls="techniques"/);
  assert.match(html, /id="platform"[^>]*aria-controls="techniques"/);
  assert.match(css, /--action-bg:/);
  assert.match(css, /--action-ink:/);
  assert.match(css, /\.primary\s*\{[^}]*background:\s*var\(--action-bg\)[^}]*color:\s*var\(--action-ink\)/s);
  assert.match(css, /\.nav-item\.current\s*\{[^}]*background:\s*var\(--blue-soft\)/s);
  assert.match(css, /\.action-status\s*\{[^}]*color:\s*var\(--muted\)/s);
  assert.match(css, /\.theme-control select\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.domains button\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.compare-button\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.page-controls button\s*\{[^}]*min-width:\s*44px/s);
  assert.match(css, /\.compare-chip button\s*\{[^}]*width:\s*44px[^}]*min-height:\s*44px/s);
});
