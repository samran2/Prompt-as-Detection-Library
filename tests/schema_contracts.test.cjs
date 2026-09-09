'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemas = require('../packages/schemas/index.cjs');

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const NOW = '2026-09-08T08:30:00Z';

function provenance(artifactSha256 = HASH_A) {
  return {
    artifactSha256,
    sources: [{
      title: 'MITRE ATT&CK Enterprise v19.2',
      url: 'https://attack.mitre.org/versions/v19/',
      license: 'LicenseRef-MITRE-ATTACK',
      sha256: HASH_B,
    }],
    generation: {
      method: 'deterministic-template',
      tool: 'scripts/build_library.cjs',
      toolVersion: '0.4.0-dev.0',
      generatedAt: NOW,
      sourceRevision: '6cda5ad8462c79e14fbb872f4e09059b18e0cfc4',
    },
  };
}

function promptMetadata(overrides = {}) {
  return {
    schemaVersion: '1.0.0',
    id: 'prompt:enterprise:T1059.001',
    attackId: 'T1059.001',
    attackVersion: '19.2',
    domain: 'enterprise',
    title: 'PowerShell detection prompt',
    tactics: ['execution'],
    platforms: ['Windows'],
    contentVersion: '0.4.0-dev.0',
    status: 'generated',
    artifactPath: 'library/prompts/enterprise/T1059.001.txt',
    promptSha256: HASH_A,
    license: 'MIT',
    provenance: provenance(),
    telemetryRequirements: [{
      source: 'WinEventLog:Microsoft-Windows-PowerShell/Operational',
      channel: 'EventCode=4104',
      dataComponent: 'Command Execution',
      requiredFields: ['event.code', 'powershell.file.script_block_text'],
    }],
    fieldMappings: [{
      semanticField: 'command_line',
      nativeField: 'powershell.file.script_block_text',
      dataType: 'string',
      required: true,
      notes: 'Preserve literal source text.',
    }],
    limitations: ['Generated guidance is not evidence of detection effectiveness.'],
    reviewSlots: [
      {slot: 1, status: 'pending'},
      {slot: 2, status: 'pending'},
    ],
    validationEvidenceIds: [],
    ...overrides,
  };
}

function reviewEvidence(overrides = {}) {
  return {
    schemaVersion: '1.0.0',
    id: 'review:prompt:enterprise:T1059.001:1:2026-09-08',
    subject: {
      type: 'prompt',
      id: 'prompt:enterprise:T1059.001',
      contentVersion: '0.4.0-dev.0',
      sha256: HASH_A,
    },
    slot: 1,
    reviewer: {reviewerId: 'reviewer-001', displayName: 'Independent reviewer'},
    independentAttestation: true,
    rubricVersion: '1.0.0',
    reviewedAt: NOW,
    scores: {
      factualAccuracy: 5,
      attackAlignment: 5,
      telemetryFeasibility: 4,
      benignCases: 4,
      safety: 5,
      sourceQuality: 5,
      platformAssumptions: 4,
    },
    criticalFindings: [],
    recommendation: 'approve',
    summary: 'The prompt is source-aligned and feasible for the stated telemetry.',
    provenance: provenance(HASH_B),
    ...overrides,
  };
}

function fixtureResult(type, expected = 'match', actual = expected) {
  return {
    id: `fixture-${type}`,
    type,
    fixtureSha256: HASH_A,
    expected: {outcome: expected},
    actual: {outcome: actual},
    passed: expected === actual,
  };
}

function validationEvidence(overrides = {}) {
  return {
    schemaVersion: '1.0.0',
    id: 'validation:rule:panther:T1059.001:lab:2026-09-08',
    subject: {
      type: 'native-rule',
      id: 'rule:panther:T1059.001',
      contentVersion: '0.4.0-dev.0',
      sha256: HASH_A,
    },
    validationLevel: 'lab-validated',
    environment: {
      environmentId: 'lab-windows-001',
      kind: 'lab',
      description: 'Isolated Windows test environment with synthetic events.',
      product: 'Panther',
      productVersion: '2026.09',
      operatingSystems: ['Windows 11'],
      dataClassification: 'synthetic',
    },
    validatedBy: {reviewerId: 'validator-001', displayName: 'Lab validator'},
    validatedAt: NOW,
    fixtureResults: [
      fixtureResult('positive'),
      fixtureResult('benign-lookalike', 'no-match'),
      fixtureResult('missing-telemetry', 'indeterminate'),
      fixtureResult('boundary'),
    ],
    limitations: ['Validation is limited to the recorded product and fixture versions.'],
    provenance: provenance(HASH_B),
    ...overrides,
  };
}

function supportedRule(overrides = {}) {
  return {
    schemaVersion: '1.0.0',
    id: 'support:enterprise:T1059.001:panther',
    attackId: 'T1059.001',
    attackVersion: '19.2',
    domain: 'enterprise',
    tactics: ['execution'],
    platforms: ['Windows'],
    backend: 'panther',
    contentVersion: '0.4.0-dev.0',
    supportStatus: 'supported',
    telemetryAssessment: {
      status: 'available',
      requiredTelemetry: ['PowerShell script-block logging'],
      notes: 'Requires Event ID 4104 collection.',
    },
    rule: {
      id: 'rule:panther:T1059.001',
      title: 'Suspicious PowerShell execution',
      language: 'panther-python',
      artifactPath: 'content/native-rules/panther/T1059.001.py',
      sha256: HASH_A,
      license: 'MIT',
      status: 'lab-validated',
      provenance: provenance(),
      fieldMappings: [{
        semanticField: 'command_line',
        nativeField: 'powershell.file.script_block_text',
        dataType: 'string',
        required: true,
      }],
      limitations: ['Requires script-block logging.'],
      validationEvidenceIds: ['validation:rule:panther:T1059.001:lab:2026-09-08'],
    },
    ...overrides,
  };
}

test('all public contracts are strict JSON Schema 2020-12 documents with stable versioned URN identifiers', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'schemas', 'manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(schemas.CONTRACT_FILES).sort(), [
    'catalog-envelope', 'common', 'native-rule-support', 'prompt-metadata', 'review-evidence', 'validation-evidence',
  ]);
  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.equal(manifest.jsonSchemaDialect, 'https://json-schema.org/draft/2020-12/schema');
  assert.deepEqual(manifest.contracts.map(contract => contract.name).sort(), Object.keys(schemas.CONTRACT_FILES).sort());
  for (const [kind, relative] of Object.entries(schemas.CONTRACT_FILES)) {
    const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'schemas', relative), 'utf8'));
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.$id, `urn:prompt-as-detection:schema:v1:${kind}`);
    if (kind !== 'common') assert.equal(schema.properties.schemaVersion.const, '1.0.0');
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(manifest.contracts.find(contract => contract.name === kind), {
      name: kind,
      $id: schema.$id,
      path: relative,
    });
  }
});

test('prompt metadata requires provenance, telemetry mapping, limitations and two honest review slots', () => {
  assert.deepEqual(schemas.validateContract('prompt-metadata', promptMetadata()), []);
  assert.match(schemas.validateContract('prompt-metadata', promptMetadata({promptSha256: 'not-a-hash'})).join('\n'), /promptSha256/);
  assert.match(schemas.validateContract('prompt-metadata', promptMetadata({reviewSlots: [{slot: 1, status: 'pending'}]})).join('\n'), /reviewSlots/);
  assert.match(schemas.validateContract('prompt-metadata', promptMetadata({inventedEvidence: true})).join('\n'), /inventedEvidence/);
  const missingAttackVersion = promptMetadata();
  delete missingAttackVersion.attackVersion;
  assert.match(schemas.validateContract('prompt-metadata', missingAttackVersion).join('\n'), /attackVersion/);
});

test('maturity cannot claim review or validation without linked evidence', () => {
  const reviewed = promptMetadata({
    status: 'reviewed',
    reviewSlots: [
      {slot: 1, status: 'completed', evidenceId: 'review:one'},
      {slot: 2, status: 'completed', evidenceId: 'review:two'},
    ],
  });
  assert.deepEqual(schemas.validateContract('prompt-metadata', reviewed), []);
  assert.match(schemas.validateContract('prompt-metadata', {...reviewed, reviewSlots: [reviewed.reviewSlots[0], {slot: 2, status: 'pending'}]}).join('\n'), /reviewSlots/);
  assert.match(schemas.validateContract('prompt-metadata', {...reviewed, reviewSlots: [
    {slot: 1, status: 'completed', evidenceId: 'review:same'},
    {slot: 2, status: 'completed', evidenceId: 'review:same'},
  ]}).join('\n'), /distinct evidence/);
  assert.match(schemas.validateContract('prompt-metadata', {...reviewed, status: 'lab-validated'}).join('\n'), /validationEvidenceIds/);
  assert.deepEqual(schemas.validateContract('prompt-metadata', {...reviewed, status: 'lab-validated', validationEvidenceIds: ['validation:one']}), []);
});

test('review evidence binds an independent named reviewer and a complete versioned rubric to immutable subject bytes', () => {
  assert.deepEqual(schemas.validateContract('review-evidence', reviewEvidence()), []);
  assert.match(schemas.validateContract('review-evidence', reviewEvidence({independentAttestation: false})).join('\n'), /independentAttestation/);
  const badScore = reviewEvidence();
  badScore.scores.safety = 6;
  assert.match(schemas.validateContract('review-evidence', badScore).join('\n'), /scores\.safety/);
  const fabricatedApproval = reviewEvidence({criticalFindings: ['source-fabrication'], recommendation: 'approve'});
  assert.match(schemas.validateContract('review-evidence', fabricatedApproval).join('\n'), /recommendation/);
});

test('lab validation requires the four fixture classes and internally consistent expected and actual results', () => {
  assert.deepEqual(schemas.validateContract('validation-evidence', validationEvidence()), []);
  const incomplete = validationEvidence({fixtureResults: [fixtureResult('positive')]});
  assert.match(schemas.validateContract('validation-evidence', incomplete).join('\n'), /fixtureResults/);
  const inconsistent = validationEvidence();
  inconsistent.fixtureResults[0].actual.outcome = 'no-match';
  assert.match(schemas.validateContract('validation-evidence', inconsistent).join('\n'), /passed/);
});

test('native support distinguishes executable rules from audited not-applicable decisions', () => {
  assert.deepEqual(schemas.validateContract('native-rule-support', supportedRule()), []);
  const missingEvidence = supportedRule();
  missingEvidence.rule.validationEvidenceIds = [];
  assert.match(schemas.validateContract('native-rule-support', missingEvidence).join('\n'), /validationEvidenceIds/);
  const notApplicable = {
    schemaVersion: '1.0.0',
    id: 'support:mobile:T1663:splunk',
    attackId: 'T1663',
    attackVersion: '19.2',
    domain: 'mobile',
    tactics: ['command-and-control'],
    platforms: ['Android', 'iOS'],
    backend: 'splunk',
    contentVersion: '0.4.0-dev.0',
    supportStatus: 'not-applicable',
    telemetryAssessment: {
      status: 'unavailable',
      requiredTelemetry: ['Device-local permission prompt observation'],
      notes: 'No server-side event path has been established.',
    },
    rationale: 'No documented Splunk-ingestible telemetry path is available for this behavior.',
    audit: {
      reviewerId: 'reviewer-mobile-001',
      displayName: 'Mobile telemetry reviewer',
      reviewedAt: NOW,
      evidenceUrls: ['https://attack.mitre.org/techniques/T1663/'],
    },
  };
  assert.deepEqual(schemas.validateContract('native-rule-support', notApplicable), []);
  const unaudited = {...notApplicable};
  delete unaudited.audit;
  assert.match(schemas.validateContract('native-rule-support', unaudited).join('\n'), /audit/);
});

test('catalog envelopes bind their declared kind, item count and content hash', () => {
  const item = promptMetadata();
  const envelope = {
    schemaVersion: '1.0.0',
    catalogKind: 'prompt-metadata',
    contentVersion: '0.4.0-dev.0',
    generatedAt: NOW,
    sourceRevision: '6cda5ad8462c79e14fbb872f4e09059b18e0cfc4',
    catalogSha256: schemas.sha256Canonical([item]),
    itemCount: 1,
    items: [item],
  };
  assert.deepEqual(schemas.validateContract('catalog-envelope', envelope), []);
  assert.match(schemas.validateContract('catalog-envelope', {...envelope, itemCount: 2}).join('\n'), /itemCount/);
  assert.match(schemas.validateContract('catalog-envelope', {...envelope, catalogKind: 'review-evidence'}).join('\n'), /items\[0\]/);
  assert.match(schemas.validateContract('catalog-envelope', {...envelope, catalogSha256: HASH_B}).join('\n'), /catalogSha256/);
});

test('evidence catalogs inherit content version from their immutable subjects', () => {
  for (const [catalogKind, item] of [
    ['review-evidence', reviewEvidence()],
    ['validation-evidence', validationEvidence()],
  ]) {
    const envelope = {
      schemaVersion: '1.0.0',
      catalogKind,
      contentVersion: item.subject.contentVersion,
      generatedAt: NOW,
      sourceRevision: '6cda5ad8462c79e14fbb872f4e09059b18e0cfc4',
      catalogSha256: schemas.sha256Canonical([item]),
      itemCount: 1,
      items: [item],
    };
    assert.deepEqual(schemas.validateContract('catalog-envelope', envelope), []);
  }
});

test('review catalogs reject duplicate slots or the same reviewer in both independent slots', () => {
  const first = reviewEvidence();
  const second = reviewEvidence({
    id: 'review:prompt:enterprise:T1059.001:2:2026-09-08',
    slot: 2,
  });
  const envelope = {
    schemaVersion: '1.0.0',
    catalogKind: 'review-evidence',
    contentVersion: first.subject.contentVersion,
    generatedAt: NOW,
    sourceRevision: '6cda5ad8462c79e14fbb872f4e09059b18e0cfc4',
    catalogSha256: schemas.sha256Canonical([first, second]),
    itemCount: 2,
    items: [first, second],
  };
  assert.match(schemas.validateContract('catalog-envelope', envelope).join('\n'), /independent reviewer/);

  second.reviewer = {reviewerId: 'reviewer-002', displayName: 'Second independent reviewer'};
  envelope.catalogSha256 = schemas.sha256Canonical(envelope.items);
  assert.deepEqual(schemas.validateContract('catalog-envelope', envelope), []);

  second.slot = 1;
  envelope.catalogSha256 = schemas.sha256Canonical(envelope.items);
  assert.match(schemas.validateContract('catalog-envelope', envelope).join('\n'), /review slot/);
});

test('boundary validation reports malformed untrusted records instead of throwing', () => {
  const malformedPrompt = promptMetadata();
  delete malformedPrompt.validationEvidenceIds;
  assert.doesNotThrow(() => schemas.validateContract('prompt-metadata', malformedPrompt));
  assert.match(schemas.validateContract('prompt-metadata', malformedPrompt).join('\n'), /validationEvidenceIds/);

  const malformedSupport = supportedRule();
  delete malformedSupport.telemetryAssessment.requiredTelemetry;
  delete malformedSupport.rule.validationEvidenceIds;
  assert.doesNotThrow(() => schemas.validateContract('native-rule-support', malformedSupport));
  assert.match(schemas.validateContract('native-rule-support', malformedSupport).join('\n'), /requiredTelemetry|validationEvidenceIds/);
});

test('evidence graph resolves review references to the exact prompt version and independent slot', () => {
  const first = reviewEvidence();
  const second = reviewEvidence({
    id: 'review:prompt:enterprise:T1059.001:2:2026-09-08',
    slot: 2,
    reviewer: {reviewerId: 'reviewer-002', displayName: 'Second independent reviewer'},
  });
  const prompt = promptMetadata({
    status: 'reviewed',
    reviewSlots: [
      {slot: 1, status: 'completed', evidenceId: first.id},
      {slot: 2, status: 'completed', evidenceId: second.id},
    ],
  });

  assert.deepEqual(schemas.validateEvidenceGraph({prompts: [prompt], reviews: [first, second]}), []);
  assert.match(
    schemas.validateEvidenceGraph({prompts: [prompt], reviews: [first]}).join('\n'),
    /reviewSlots\[1\]\.evidenceId.*does not resolve/,
  );
  second.subject.sha256 = HASH_B;
  assert.match(
    schemas.validateEvidenceGraph({prompts: [prompt], reviews: [first, second]}).join('\n'),
    /reviewSlots\[1\]\.evidenceId.*exact prompt subject/,
  );
});

test('evidence graph binds prompt and native-rule maturity to matching validation evidence', () => {
  const first = reviewEvidence();
  const second = reviewEvidence({
    id: 'review:prompt:enterprise:T1059.001:2:2026-09-08',
    slot: 2,
    reviewer: {reviewerId: 'reviewer-002', displayName: 'Second independent reviewer'},
  });
  const promptValidation = validationEvidence({
    id: 'validation:prompt:enterprise:T1059.001:lab:2026-09-08',
    subject: {
      type: 'prompt',
      id: 'prompt:enterprise:T1059.001',
      contentVersion: '0.4.0-dev.0',
      sha256: HASH_A,
    },
  });
  const prompt = promptMetadata({
    status: 'lab-validated',
    reviewSlots: [
      {slot: 1, status: 'completed', evidenceId: first.id},
      {slot: 2, status: 'completed', evidenceId: second.id},
    ],
    validationEvidenceIds: [promptValidation.id],
  });
  const rule = supportedRule();
  const ruleValidation = validationEvidence();

  assert.deepEqual(schemas.validateEvidenceGraph({
    prompts: [prompt], reviews: [first, second], validations: [promptValidation, ruleValidation], nativeRules: [rule],
  }), []);

  ruleValidation.subject.sha256 = HASH_B;
  assert.match(schemas.validateEvidenceGraph({nativeRules: [rule], validations: [ruleValidation]}).join('\n'), /exact native-rule subject/);
});
