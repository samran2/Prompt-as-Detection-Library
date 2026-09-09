'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const core = require('../demo/core.js');
const attack = require('../demo/catalog.js');
const script = path.resolve(__dirname, '../scripts/library_cli.cjs');
const fixture = {
  id: 'AML.T9000', framework: 'ATLAS', domain: 'ATLAS', atlasVersion: 'synthetic-test',
  name: 'Synthetic AI behavior', kind: 'technique', parentId: null, parentName: null,
  behavior: 'Synthetic AI evidence', tactics: ['Synthetic AI tactic'], platforms: [],
  sourceUrl: 'https://atlas.mitre.org/techniques/AML.T9000', sourceMaturity: 'Realized',
  references: [], mitigations: [], caseStudies: [], telemetry: [], strategies: [],
  procedureCount: 0, procedureExamples: [],
};
const atlas = [fixture, { ...fixture, id: 'AML.T9000.001', kind: 'subtechnique', parentId: fixture.id, parentName: fixture.name }];

// Substitute only the catalog boundary for focused synthetic cases; CLI parsing,
// composition and private no-clobber file I/O run as the actual implementation.
function syntheticCLI() {
  const module = { exports: {} };
  const load = createRequire(script);
  vm.runInNewContext(fs.readFileSync(script, 'utf8'), {
    require(name) { return name === '../demo/atlas-catalog.js' ? atlas : load(name); },
    module, process, Buffer, TextDecoder,
  }, { filename: script });
  return module.exports.main;
}

test('CLI defaults retain ATT&CK and framework selection includes only intended catalogs', () => {
  const cli = syntheticCLI();
  assert.equal(JSON.parse(cli(['list', '--json'])).length, 918);
  for (const selector of [['--domain', 'ATLAS'], ['--framework', 'ATLAS']]) {
    const rows = JSON.parse(cli(['list', ...selector, '--json']));
    assert.deepEqual(rows.map(row => row.id), atlas.map(row => row.id));
    assert.ok(rows.every(row => row.framework === 'ATLAS'));
  }
  assert.equal(JSON.parse(cli(['list', '--framework', 'all', '--json'])).length, attack.length + atlas.length);
  assert.deepEqual(JSON.parse(cli(['list', '--framework', 'all', '--domain', 'OT', '--json'])).map(row => row.id), attack.filter(row => row.domain === 'ICS').map(row => row.id));
  assert.deepEqual(JSON.parse(cli(['list', '--framework', 'ATLAS', '--tactic', fixture.tactics[0], '--platform', '__unspecified__', '--json'])).map(row => row.id), atlas.map(row => row.id));
});

test('CLI AML parent and subtechnique prompt lookup autodetects ATLAS with shared bytes', () => {
  const cli = syntheticCLI();
  for (const record of atlas) for (const mode of Object.keys(core.MODES)) for (const target of core.TARGETS) {
    assert.equal(cli(['prompt', record.id, '--mode', mode, '--target', target]), core.composePrompt(record, { mode, target }));
  }
});

test('CLI AI export preserves literal private context, version provenance, hash and no-clobber output', t => {
  const cli = syntheticCLI();
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pad-atlas-cli-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const contextFile = path.join(root, 'context.txt');
  const output = path.join(root, 'atlas.jsonl');
  const context = '${PRIVATE} <script>inert</script> [[SCHEMA]]';
  fs.writeFileSync(contextFile, context);
  const result = JSON.parse(cli(['export', '--domain', 'ATLAS', '--context-file', contextFile, '--output', output]));
  const content = fs.readFileSync(output, 'utf8');
  const rows = content.trimEnd().split('\n').map(JSON.parse);
  assert.equal(result.records, atlas.length);
  assert.equal(result.sha256, createHash('sha256').update(content).digest('hex'));
  for (const [index, row] of rows.entries()) {
    assert.equal(row.atlas_version, fixture.atlasVersion);
    assert.equal(row.prompt, core.composePrompt(atlas[index], { context }));
    assert.equal(row.prompt_sha256, createHash('sha256').update(row.prompt).digest('hex'));
    assert.equal(row.attack_version, undefined);
  }
  assert.throws(() => cli(['export', '--domain', 'ATLAS', '--output', output]), /already exists/);
  assert.equal(fs.readFileSync(output, 'utf8'), content);
  if (process.platform !== 'win32') assert.equal(fs.statSync(output).mode & 0o777, 0o600);
});

test('CLI rejects malformed AML identifiers and contradictory framework filters without echoing data', () => {
  const cli = syntheticCLI();
  for (const args of [
    ['prompt', 'AML.T9000.001private'], ['prompt', 'AML.T9000.0000'], ['prompt', 'AML.T9999'],
    ['list', '--framework', 'private'], ['list', '--framework', 'ATLAS', '--domain', 'ICS'],
    ['list', '--framework', 'ATT&CK', '--domain', 'ATLAS'],
    ['list', '--framework', 'ATLAS', '--framework', 'all'],
  ]) {
    assert.throws(() => cli(args), error => !error.message.includes('private'));
  }
});

test('real CLI process selects the pinned ATLAS catalog and preserves the ATT&CK default', () => {
  const published = require('../demo/atlas-catalog.js');
  const run = args => {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: fs.realpathSync(os.tmpdir()), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 15000,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.equal(result.stderr, '');
    return JSON.parse(result.stdout);
  };
  assert.equal(published.length, 197);
  assert.equal(run(['list', '--json']).length, 918);
  for (const filters of [['--domain', 'ATLAS'], ['--framework', 'ATLAS']]) {
    assert.deepEqual(run(['list', ...filters, '--json']).map(row => row.id), published.map(row => row.id));
  }
  assert.equal(run(['list', '--framework', 'all', '--json']).length, 1115);
});

test('every pinned AML ID resolves to its published readable prompt with literal source and no claimed validation', () => {
  const published = require('../demo/atlas-catalog.js');
  const { main } = require('../scripts/library_cli.cjs');
  for (const record of published) {
    const prompt = main(['prompt', record.id]);
    assert.equal(prompt, core.composePrompt(record), record.id);
    assert.equal(prompt, fs.readFileSync(path.resolve(__dirname, '../content/atlas/prompts', `${record.id}.txt`), 'utf8'), record.id);
    assert.ok(prompt.includes(record.behavior), `${record.id}: full literal behavior`);
    assert.ok(prompt.includes(JSON.stringify(record.caseStudies)), `${record.id}: literal case studies`);
    assert.ok(prompt.includes(JSON.stringify(record.mitigations)), `${record.id}: literal mitigations`);
    assert.match(prompt, /GENERATED DRAFT · NOT VALIDATED/);
    assert.equal(core.validationState(record).level, 'generated');
  }
});

test('real CLI exports every AI prompt with ATLAS provenance and independently verified checksums', t => {
  const published = require('../demo/atlas-catalog.js');
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pad-atlas-export-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const output = path.join(root, 'ai.jsonl');
  const result = spawnSync(process.execPath, [script, 'export', '--framework', 'ATLAS', '--output', output], {
    encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const content = fs.readFileSync(output, 'utf8');
  assert.deepEqual(JSON.parse(result.stdout), {
    records: published.length, sha256: createHash('sha256').update(content).digest('hex'),
  });
  const rows = content.trimEnd().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(row => row.technique_id), published.map(record => record.id));
  for (const [index, row] of rows.entries()) {
    assert.equal(row.framework, 'ATLAS');
    assert.equal(row.atlas_version, published[index].atlasVersion);
    assert.equal(row.reference_version, published[index].atlasVersion);
    assert.equal(row.attack_version, undefined);
    assert.equal(row.validation_status, 'generated');
    assert.deepEqual(row.validated_backends, []);
    assert.equal(row.prompt, core.composePrompt(published[index]));
    assert.equal(row.prompt_sha256, createHash('sha256').update(row.prompt).digest('hex'));
  }
});
