'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const generator = require('../scripts/build_d3fend.cjs');

const root = path.resolve(__dirname, '..');
const sourceRelative = 'sources/d3fend-1.6.0';
const iri = 'http://d3fend.mitre.org/ontologies/d3fend.owl#';
const local = [...require('../demo/catalog.js'), ...require('../demo/atlas-catalog.js')];

test('pinned D3FEND source creates exact domain coverage without inherited or fabricated links', () => {
  const source = generator.loadSources(root);
  const catalog = generator.createCatalog(source.ontology, source.mappings, local);
  assert.equal(source.manifest.version, '1.6.0');
  assert.equal(source.mappings.length, 16249);
  assert.equal(Object.keys(catalog.records).length, 1115);
  assert.equal(catalog.techniques.length, 154);
  assert.deepEqual(catalog.coverage.domains, {
    Enterprise: {records: 697, mapped: 311, unmapped: 386},
    ICS: {records: 97, mapped: 58, unmapped: 39},
    Mobile: {records: 124, mapped: 0, unmapped: 124},
    ATLAS: {records: 197, mapped: 0, unmapped: 197},
  });
  assert.equal(catalog.coverage.matchedSourceRows, 14830);
  assert.equal(catalog.coverage.mappedRecords, 369);
  assert.deepEqual(catalog.records['T1059.001'], []);
  assert.ok(!Object.hasOwn(catalog.records, 'T0812'));
  assert.ok(local.filter(r => ['Mobile', 'ATLAS'].includes(r.domain)).every(r => catalog.records[r.id].length === 0));
});

test('source paths preserve both artifacts, explicit defense identity and query context', () => {
  const source = generator.loadSources(root);
  const catalog = generator.createCatalog(source.ontology, source.mappings, local);
  const credential = catalog.records['T1003.005'].find(r => r.queryLabel === 'Token Binding' && r.defenseId === 'D3-CH');
  assert.ok(credential);
  assert.equal(credential.topLabel, 'Credential Hardening');
  assert.equal(credential.defenseArtifact, `${iri}Credential`);
  assert.equal(credential.offenseArtifact, `${iri}EncryptedCredential`);
  assert.equal(credential.defenseRelation, `${iri}hardens`);
  assert.equal(credential.offenseRelation, `${iri}accesses`);
  assert.ok(credential.sourceRows.includes(1));
  const firmware = catalog.records.T0800.find(r => r.defenseRelation === `${iri}detects` && r.offenseRelation === `${iri}produces`);
  const defense = catalog.techniques.find(r => r.id === firmware.defenseId);
  assert.equal(defense.name, 'Remote Firmware Update Monitoring');
  assert.match(defense.url, /^https:\/\/d3fend\.mitre\.org\/technique\/d3f:/);
  assert.ok(defense.definition);
  assert.ok(defense.tactics.includes('Detect'));
});

test('every accepted source row is accounted exactly once and deduplication retains evidence', () => {
  const {ontology, mappings} = generator.loadSources(root);
  const catalog = generator.createCatalog(ontology, mappings, local);
  const accepted = new Set();
  for (const [id, relations] of Object.entries(catalog.records)) {
    for (const relation of relations) for (const row of relation.sourceRows) {
      assert.ok(Number.isInteger(row) && row > 0 && row <= mappings.length);
      assert.ok(!accepted.has(row));
      accepted.add(row);
      assert.equal(mappings[row - 1].off_tech_id, id);
    }
  }
  assert.equal(accepted.size, 14830);
  const same = [mappings[0], {...mappings[0]}];
  const one = generator.createCatalog(ontology, same, local);
  assert.equal(one.records['T1003.005'].length, 1);
  assert.deepEqual(one.records['T1003.005'][0].sourceRows, [1, 2]);
});

test('CSV rejects malformed quotes, altered headers, width and unbounded fields', () => {
  const {mappingText} = generator.loadSources(root);
  const [header, first] = mappingText.split('\r\n');
  assert.throws(() => generator.parseMappings(`${header}\r\n"unterminated`), /CSV/);
  assert.throws(() => generator.parseMappings(`${header},unexpected\r\n${first}`), /header/);
  assert.throws(() => generator.parseMappings(`${header}\r\n${first},extra`), /width/);
  assert.throws(() => generator.parseMappings(`${header}\r\n${'x'.repeat(5000)}`), /limit/);
});

test('CSV preserves quoted commas, escaped quotes and embedded newlines as literal data', () => {
  const {mappingText, mappings} = generator.loadSources(root);
  const header = mappingText.split('\r\n')[0];
  const example = {...mappings[0], query_def_tech_label: 'A, "quoted"\nlabel'};
  const csv = Object.values(example).map(value => `"${value.replaceAll('"', '""')}"`).join(',');
  assert.deepEqual(generator.parseMappings(`${header}\r\n${csv}\r\n`), [example]);
});

test('invalid relation URIs, unknown defenses and duplicate local IDs fail closed', () => {
  const {ontology, mappings} = generator.loadSources(root);
  assert.throws(() => generator.createCatalog(ontology, [{...mappings[0], def_tech: `${iri}MadeUp`}], local), /defense/);
  assert.throws(() => generator.createCatalog(ontology, [{...mappings[0], def_artifact_rel: 'javascript:alert(1)'}], local), /URI/);
  assert.throws(() => generator.createCatalog(ontology, mappings, [...local, local[0]]), /duplicate/i);
});

test('source tree rejects changed pins, unexpected files and symbolic links', t => {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pad-d3fend-source-')));
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  const target = path.join(temporary, sourceRelative);
  fs.cpSync(path.join(root, sourceRelative), target, {recursive: true});
  fs.appendFileSync(path.join(target, 'd3fend.json'), ' ');
  assert.throws(() => generator.loadSources(temporary), /integrity/);
  fs.copyFileSync(path.join(root, sourceRelative, 'd3fend.json'), path.join(target, 'd3fend.json'));
  fs.writeFileSync(path.join(target, 'private.txt'), 'should never be imported');
  assert.throws(() => generator.loadSources(temporary), /Unexpected/);
  fs.unlinkSync(path.join(target, 'private.txt'));
  fs.unlinkSync(path.join(target, 'd3fend.json'));
  fs.symlinkSync(path.join(root, sourceRelative, 'd3fend.json'), path.join(target, 'd3fend.json'));
  assert.throws(() => generator.loadSources(temporary), /symbolic link/);
});

test('browser artifact is deterministic data in both CommonJS and browser contexts', () => {
  const {outputs, catalog} = generator.expectedOutputs(root);
  assert.equal(catalog.sourceNotice, fs.readFileSync(path.join(root, sourceRelative, 'NOTICE.txt'), 'utf8'));
  generator.writeOutputs(root, outputs, true);
  const expected = outputs.get('demo/d3fend-catalog.js');
  const context = vm.createContext({});
  vm.runInContext(expected, context, {timeout: 2000});
  assert.deepEqual(JSON.parse(JSON.stringify(context.PAD_D3FEND_CATALOG)), catalog);
  assert.deepEqual(require('../demo/d3fend-catalog.js'), catalog);
  assert.ok(!expected.includes('</script'));
});

test('output allowlist refuses unrelated paths and symlink destinations before writing', t => {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pad-d3fend-output-')));
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  assert.throws(() => generator.writeOutputs(temporary, new Map([['private.txt', 'data']]), false), /Unknown/);
  fs.mkdirSync(path.join(temporary, 'demo'));
  fs.symlinkSync(path.join(temporary, 'outside.txt'), path.join(temporary, 'demo/d3fend-catalog.js'));
  assert.throws(() => generator.writeOutputs(temporary, new Map([['demo/d3fend-catalog.js', 'data']]), false), /symbolic link/);
  assert.ok(!fs.existsSync(path.join(temporary, 'outside.txt')));
});
