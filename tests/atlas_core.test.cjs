'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const core = require('../demo/core.js');
const attack = require('../demo/catalog.js');

// Deliberately synthetic records exercise the framework boundary without
// presenting this fixture as a MITRE statement or published validation.
const parent = {
  framework: 'ATLAS', domain: 'ATLAS', atlasVersion: 'test-content',
  id: 'AML.T9000', name: 'Synthetic AI behavior', kind: 'technique',
  parentId: null, parentName: null, tactics: ['Synthetic AI tactic'], platforms: [],
  behavior: 'Synthetic reference: ${HOME} <script>inert</script>.',
  sourceUrl: 'https://atlas.mitre.org/techniques/AML.T9000', references: [],
  sourceMaturity: 'Feasible', caseStudies: [], mitigations: [],
  telemetry: [], strategies: [], procedureCount: 0, procedureExamples: [],
};
const child = { ...parent, id: 'AML.T9000.001', name: 'Synthetic child', kind: 'subtechnique',
  parentId: parent.id, parentName: parent.name, behavior: 'A synthetic child behavior.' };

test('ATLAS is a separate domain and AML parent lookup includes only its children', () => {
  const other = { ...parent, id: 'AML.T9001', behavior: 'Mentions AML.T9000 as untrusted reference data.' };
  const records = [...attack.slice(0, 2), parent, child, other];
  assert.equal(core.normalizeDomain('ATLAS'), 'ATLAS');
  assert.deepEqual(core.filterTechniques(records, { domain: 'ATLAS', query: 'aml.t9000' }).map(r => r.id), [parent.id, child.id]);
  assert.deepEqual(core.filterTechniques(records, { query: child.id }).map(r => r.id), [child.id]);
  assert.deepEqual(core.filterTechniques(records, { domain: 'ATLAS', tactic: 'Synthetic AI tactic', platform: '__unspecified__' }).map(r => r.id), [parent.id, child.id, other.id]);
  assert.equal(core.domainFilterCount(records, 'ATLAS'), 3);
});

test('AML subtechnique URL state and mixed comparisons survive sharing without private context', () => {
  const state = core.parseUiState(`?domain=ATLAS&technique=${child.id}&compare=T1059.001,${child.id}&context=private`);
  assert.equal(state.domain, 'ATLAS');
  assert.equal(state.technique, child.id);
  assert.deepEqual(state.compare, ['T1059.001', child.id]);
  const url = core.serializeUiState(state);
  assert.equal(core.parseUiState(url).technique, child.id);
  assert.doesNotMatch(url, /private|context/);
  assert.equal(core.parseUiState(`?technique=${child.id}garbage`).technique, '');
});

test('every AI mode and target emits source-faithful generated drafts with literal context', () => {
  const context = '${SECRET} <script>do-not-run</script> [[SCHEMA]]';
  for (const mode of Object.keys(core.MODES)) for (const target of core.TARGETS) {
    const prompt = core.composePrompt(child, { mode, target, context });
    assert.ok(prompt.includes(`ATLAS ${child.atlasVersion}`));
    assert.ok(prompt.includes(child.id));
    assert.ok(prompt.includes(`Parent technique: ${parent.id}`));
    assert.ok(prompt.includes(child.behavior));
    assert.ok(prompt.includes(context));
    assert.ok(prompt.includes(target));
    assert.ok(prompt.includes(core.MODES[mode]));
    assert.match(prompt, /GENERATED|generated/);
    assert.match(prompt, /not.*local.*validation|not.*validation evidence/i);
    assert.match(prompt, /schema/i);
    assert.match(prompt, /non-executable pseudocode/i);
    if (mode === 'detect' || mode === 'validate') assert.match(prompt, /inert synthetic/i);
    assert.match(prompt, /privacy|sensitive.*data/i);
    assert.match(prompt, /benign lookalike/i);
    assert.doesNotMatch(prompt, /ATT&CK 19\.2|selected DET\/AN|undefined/);
  }
});

test('ATLAS source maturity never upgrades project validation and JSONL names its own version', () => {
  for (const sourceMaturity of ['Feasible', 'Demonstrated', 'Realized']) {
    const record = { ...parent, sourceMaturity };
    assert.equal(core.validationState(record).level, 'generated');
    const row = JSON.parse(core.exportJSONL([record]));
    assert.equal(row.framework, 'ATLAS');
    assert.equal(row.atlas_version, record.atlasVersion);
    assert.equal(row.reference_version, record.atlasVersion);
    assert.equal(row.source_maturity, sourceMaturity);
    assert.equal(row.validation_status, 'generated');
    assert.equal(row.sample, false);
    assert.equal(row.attack_version, undefined);
    assert.deepEqual(row.validated_backends, []);
  }
});

test('AI research export preserves source relationships and mixed-framework provenance', () => {
  const record = { ...parent, caseStudies: [{ id: 'AML.CS9000', name: 'Synthetic study', sourceUrl: 'https://atlas.mitre.org/studies/AML.CS9000' }],
    mitigations: [{ id: 'AML.M9000', name: 'Synthetic mitigation', sourceUrl: 'https://atlas.mitre.org/mitigations/AML.M9000' }] };
  const exported = JSON.parse(core.exportResearchJSON([record]));
  assert.deepEqual(exported.reference, { source: 'MITRE ATLAS', atlas_version: record.atlasVersion });
  assert.equal(exported.records[0].provenance.atlas_version, record.atlasVersion);
  assert.equal(exported.records[0].provenance.attack_version, undefined);
  assert.deepEqual(exported.records[0].relationships.case_studies, record.caseStudies);
  assert.deepEqual(exported.records[0].relationships.mitigations, record.mitigations);
  assert.equal(exported.records[0].validation.level, 'generated');
  const mixed = JSON.parse(core.exportResearchJSON([attack[0], record]));
  assert.deepEqual(mixed.references, [{ source: 'MITRE ATT&CK', attack_version: '19.2' }, { source: 'MITRE ATLAS', atlas_version: record.atlasVersion }]);
  assert.equal(mixed.reference, undefined);
});

test('all ATT&CK prompt combinations and default exports match the reviewed v3 template snapshot', () => {
  const hash = createHash('sha256');
  for (const record of attack) for (const mode of Object.keys(core.MODES)) for (const target of core.TARGETS) {
    hash.update(core.composePrompt(record, { mode, target }));
  }
  assert.equal(hash.digest('hex'), '817a98499ffdf0fc0421dee52572fc222effef1fcee43611899036a447746da4');
  assert.equal(createHash('sha256').update(core.exportJSONL(attack)).digest('hex'), 'e3ba6fe689f4df9b66b2170b6a025d39573dc0b9ee16a657f6ebc24b29e9cbca');
  assert.equal(createHash('sha256').update(core.exportResearchJSON(attack)).digest('hex'), '7010a4bbaf60b9aad3e772dc42790cd1d0f731ae97f222d283bff5d19ea31c49');
});
