'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLibrary } = require('../demo/defenses.js');
const NS = 'http://d3fend.mitre.org/ontologies/d3fend.owl#';
const sourceUrl = 'https://d3fend.mitre.org/ontologies/d3fend/1.6.0/d3fend-full-mappings.csv';
function fixture() {
  return {
    schemaVersion: 'pad-d3fend-1', version: '1.6.0', sourceUrl, sourceSha256: 'a'.repeat(64),
    licenseUrl: 'https://d3fend.mitre.org/tou/', coverage: {},
    sourceNotice: 'Synthetic D3FEND fixture license notice.',
    techniques: [{ id: 'D3-CH', name: 'Credential Hardening', definition: 'Literal <script>text</script> ${context}',
      url: 'https://d3fend.mitre.org/technique/d3f:CredentialHardening/', tactics: ['Harden'] }],
    records: {
      'T1003.005': [{ defenseId: 'D3-CH', queryLabel: 'Token Binding', topLabel: 'Credential Hardening',
        defenseArtifact: NS + 'Credential', defenseArtifactLabel: 'Credential',
        offenseArtifact: NS + 'EncryptedCredential', offenseArtifactLabel: 'Encrypted Credential',
        defenseRelation: NS + 'hardens', offenseRelation: NS + 'accesses', sourceRows: [1, 4] }],
      T1059: [], 'T1059.001': [], 'AML.T0051': [],
    },
  };
}
const record = { id: 'T1003.005', name: 'Cached Domain Credentials', domain: 'Enterprise', attackVersion: '19.2',
  sourceUrl: 'https://attack.mitre.org/techniques/T1003/005/', context: 'PRIVATE SENTINEL', validation: { level: 'field-confirmed' } };

test('D3FEND lookup preserves two artifacts, relation-bearing technique and query provenance', () => {
  const result = createLibrary(fixture()).lookup(record.id);
  assert.equal(result.status, 'mapped');
  assert.equal(result.mappingKind, 'inferred');
  assert.equal(result.d3fendVersion, '1.6.0');
  assert.equal(result.techniqueId, record.id);
  assert.equal(result.techniques[0].id, 'D3-CH');
  const path = result.techniques[0].paths[0];
  assert.equal(path.queryLabel, 'Token Binding');
  assert.equal(path.defenseArtifactLabel, 'Credential');
  assert.equal(path.offenseArtifactLabel, 'Encrypted Credential');
  assert.deepEqual(path.sourceRows, [1, 4]);
});

test('missing exact mappings never inherit parent results or imply no defense exists', () => {
  const data = fixture(); data.records.T1059 = data.records['T1003.005'];
  const library = createLibrary(data);
  assert.equal(library.lookup('T1059').status, 'mapped');
  assert.equal(library.lookup('T1059.001').status, 'unmapped');
  assert.equal(library.lookup('AML.T0051').status, 'unmapped');
  assert.match(library.composeBrief({ id: 'AML.T0051', name: 'LLM Prompt Injection', framework: 'ATLAS', atlasVersion: '2026.08' }), /does not mean no defense exists/i);
  for (const id of ['T9999', '__proto__', 'T1003.005\n', '../T1003']) assert.throws(() => library.lookup(id), /technique/i);
});

test('defensive brief is literal, bounded research guidance with no private context or validation promotion', () => {
  const library = createLibrary(fixture());
  const text = library.composeBrief(record);
  assert.match(text, /DEFENSIVE RESEARCH BRIEF.*DRAFT/);
  assert.match(text, /not.*effectiveness/i);
  assert.match(text, /<script>text<\/script> \$\{context\}/);
  assert.match(text, /Credential Hardening/);
  assert.match(text, /Encrypted Credential/);
  assert.match(text, /source rows: 1, 4/i);
  assert.doesNotMatch(text, /PRIVATE SENTINEL|field-confirmed/);
  const json = JSON.parse(library.exportJSON(record));
  assert.equal(json.status, 'mapped');
  assert.equal(json.mappingKind, 'inferred');
  assert.equal(json.offensiveTechnique.id, record.id);
  assert.equal(json.offensiveTechnique.sourceVersion, '19.2');
  assert.doesNotMatch(library.exportJSON(record), /PRIVATE SENTINEL|field-confirmed/);
});

test('catalog and returned objects cannot change subsequent lookup results', () => {
  const data = fixture(); const library = createLibrary(data);
  data.techniques[0].name = 'CHANGED'; data.records['T1003.005'][0].sourceRows.push(99);
  const first = library.lookup(record.id); first.techniques[0].name = 'MUTATED'; first.techniques[0].paths[0].sourceRows.push(100);
  const again = library.lookup(record.id);
  assert.equal(again.techniques[0].name, 'Credential Hardening');
  assert.deepEqual(again.techniques[0].paths[0].sourceRows, [1, 4]);
});

test('standalone exports carry the complete source notice and missing notices fail closed', () => {
  const data = fixture(); const library = createLibrary(data);
  assert.equal(JSON.parse(library.exportJSON(record)).sourceNotice, data.sourceNotice);
  assert.ok(library.composeBrief(record).includes(data.sourceNotice));
  delete data.sourceNotice;
  assert.throws(() => createLibrary(data), /D3FEND/);
});

test('invalid or externally redirected defensive links and broken references fail closed', () => {
  for (const url of ['javascript:alert(1)', 'https://d3fend.mitre.org.evil.test/technique/d3f:CredentialHardening/',
    'https://user@d3fend.mitre.org/technique/d3f:CredentialHardening/', 'https://d3fend.mitre.org/technique/d3f:CredentialHardening/?redirect=https://example.com']) {
    const data = fixture(); data.techniques[0].url = url;
    assert.throws(() => createLibrary(data), /D3FEND/);
  }
  const broken = fixture(); broken.records['T1003.005'][0].defenseId = 'D3-UNKNOWN';
  assert.throws(() => createLibrary(broken), /D3FEND/);
  const artifact = fixture(); artifact.records['T1003.005'][0].offenseArtifact = 'https://evil.test/payload';
  assert.throws(() => createLibrary(artifact), /D3FEND/);
  const rows = fixture(); rows.records['T1003.005'][0].sourceRows = [-1];
  assert.throws(() => createLibrary(rows), /D3FEND/);
});
