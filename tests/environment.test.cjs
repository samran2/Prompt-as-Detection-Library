'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');
const environment = require('../demo/environment.js');
const core = require('../demo/core.js');
const record = require('../demo/catalog.js').find(item => item.id === 'T1059.001');

function profile() {
  return { ...environment.create('Synthetic lab', 'Sentinel KQL'),
    system: 'Synthetic Windows lab', dataSources: 'Synthetic process collector',
    tables: 'SyntheticProcesses', fieldMappings: 'Time:datetime; Host:string; Command:string',
    limitations: 'Only process events; no network collection' };
}

test('environment create has a strict complete contract with unknown empty details', () => {
  const value = environment.create('My profile', 'Sigma');
  assert.equal(value.schemaVersion, 1);
  assert.match(value.id, /^[a-f0-9-]{36}$/);
  assert.equal(value.revision, 1);
  assert.equal(value.provenance, 'user');
  assert.equal(value.system, '');
  assert.equal(environment.summarize(value).status, 'incomplete');
  assert.deepEqual(environment.summarize(value).missing, ['system', 'dataSources', 'tables', 'fieldMappings', 'limitations']);
});

test('canonical profile round trip and SHA-256 are independent of input key order', async () => {
  const value = profile();
  const reversed = Object.fromEntries(Object.entries(value).reverse());
  const text = environment.serialize(value);
  assert.equal(environment.serialize(reversed), text);
  assert.deepEqual(environment.parse(text), value);
  assert.equal(await environment.hash(reversed), createHash('sha256').update(text).digest('hex'));
  const checked = environment.validate(value);
  checked.name = 'Changed copy';
  assert.equal(value.name, 'Synthetic lab');
  assert.deepEqual(environment.SCHEMA, JSON.parse(fs.readFileSync(path.join(__dirname, '../packages/schemas/environment.schema.json'), 'utf8')));
  assert.ok(Object.isFrozen(environment.SCHEMA.properties.target.enum));
  assert.deepEqual(environment.SCHEMA.properties.target.enum, core.TARGETS);
});

test('provided fields and examples never imply validation or actual collection availability', () => {
  const value = profile();
  assert.deepEqual(environment.summarize(value), { status: 'provided-unverified', missing: [] });
  assert.equal(environment.summarize({ ...value, provenance: 'example' }).status, 'example');
  assert.match(environment.render(value), /not.*validat/i);
  assert.match(environment.render({ ...value, provenance: 'example' }), /example.*not.*confirmed/i);
  assert.match(environment.render(environment.create('Empty', 'Platform-neutral')), /Unknown/);
  assert.match(environment.render({ ...value, system: '   ' }), /System \/ operating environment:\nUnknown/);
});

test('profile validation rejects unsupported types, keys, version, identity and oversized fields', () => {
  for (const update of [{ schemaVersion: 2 }, { revision: 0 }, { revision: 1.5 }, { revision: Number.MAX_SAFE_INTEGER + 1 },
    { id: 'bad-id' }, { target: 'Unknown product' }, { provenance: 'validated' }, { name: ' ' },
    { name: 'x'.repeat(121) }, { system: 'x'.repeat(4001) }, { tables: ['SyntheticProcesses'] },
    { fieldMappings: null }, { status: 'lab-validated' }, { system: '\u001b[31m' }, { system: '\ud800' }]) {
    assert.throws(() => environment.validate({ ...profile(), ...update }));
  }
  const missing = profile(); delete missing.tables;
  assert.throws(() => environment.validate(missing));
  for (const value of [null, [], 'text', new Date()]) assert.throws(() => environment.validate(value));
});

test('profile parsing refuses duplicate aliases, nested structures, controls and size excess', () => {
  const valid = environment.serialize(profile());
  for (const input of [valid.replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1'),
    valid.replace('"schemaVersion":1', '"schemaVersion":1,"schema\\u0056ersion":1'),
    '{"x":' + '['.repeat(10000) + '0' + ']'.repeat(10000) + '}',
    ' '.repeat(environment.LIMITS.bytes + 1), '{"__proto__":{}}', valid + 'x']) {
    assert.throws(() => environment.parse(input));
  }
});

test('profile validation does not invoke getters or inherited serializers', () => {
  let called = false;
  const value = profile();
  Object.defineProperty(value, 'system', { enumerable: true, get() { called = true; return ''; } });
  assert.throws(() => environment.validate(value));
  assert.equal(called, false);
  const inherited = Object.assign(Object.create({ toJSON() { called = true; return {}; } }), profile());
  assert.throws(() => environment.serialize(inherited));
  assert.equal(called, false);
  const hidden = profile(); Object.defineProperty(hidden, 'private', { value: 'hidden' });
  assert.throws(() => environment.validate(hidden));
});

test('composer keeps profile and free context separate and rejects target conflicts', () => {
  const value = { ...profile(), system: '<script>literal</script> ${HOME} $(not-executed)\nsecond line' };
  const context = 'Additional synthetic context';
  const composed = core.composePrompt(record, { environment: value, context });
  assert.ok(composed.includes(value.system));
  assert.ok(composed.includes(environment.render(value)));
  assert.match(composed, /Output target: Sentinel KQL/);
  assert.ok(composed.indexOf(environment.render(value)) < composed.indexOf('Analyst context (literal reference data):'));
  assert.ok(composed.includes(context));
  assert.throws(() => core.composePrompt(record, { environment: value, target: 'Sigma' }), /target.*(conflict|match|agree)/i);
  assert.throws(() => core.composePrompt(record, { environment: { ...value, status: 'validated' } }));
  const atlas = require('../demo/atlas-catalog.js')[0];
  assert.ok(core.composePrompt(atlas, { environment: value }).includes(environment.render(value)));
  assert.equal(core.composePrompt(record, { environment: null }), core.composePrompt(record));
});

test('all modes and targets keep one shared environment block in prompts and JSONL', () => {
  for (const mode of Object.keys(core.MODES)) for (const target of core.TARGETS) {
    const value = { ...profile(), target };
    const prompt = core.composePrompt(record, { mode, target, environment: value });
    assert.equal(prompt.split(environment.render(value)).length, 2);
    const exported = JSON.parse(core.exportJSONL([record], { mode, target, environment: value }));
    assert.equal(exported.prompt, prompt);
    assert.equal(exported.status, 'draft');
    assert.deepEqual(exported.validated_backends, []);
  }
});

test('all 1115 techniques support every profile target and task without promoting validation status', () => {
  const catalog = [...require('../demo/catalog.js'), ...require('../demo/atlas-catalog.js')];
  assert.equal(catalog.length, 1115);
  const synthetic = { ...profile(), id: '00000000-0000-4000-8000-000000000001',
    system: 'Synthetic schema fixture only; no collection is asserted for any domain.',
    dataSources: 'Inert synthetic records only', tables: 'SyntheticEvents',
    fieldMappings: 'SyntheticTime:datetime; SyntheticEntity:string; SyntheticAction:string',
    limitations: 'Structural generation check only; no real product or detector has been validated.' };
  let checked = 0;
  for (const target of core.TARGETS) {
    const selectedProfile = { ...synthetic, target };
    const expectedBlock = environment.render(selectedProfile);
    for (const mode of Object.keys(core.MODES)) for (const technique of catalog) {
      const description = `${technique.id} / ${target} / ${mode}`;
      const exported = JSON.parse(core.exportJSONL([technique], { target, mode, environment: selectedProfile }));
      assert.equal(exported.technique_id, technique.id, description);
      assert.equal(exported.prompt.split(expectedBlock).length, 2, description);
      assert.ok(exported.prompt.includes(`Output target: ${target}. This is an output instruction, not a verified integration.`), description);
      assert.ok(exported.prompt.includes(`Task: ${core.MODES[mode]}\n`), description);
      assert.equal(exported.status, 'draft', description);
      assert.deepEqual(exported.validated_backends, [], description);
      if (technique.framework === 'ATLAS') assert.equal(exported.validation_status, 'generated', description);
      else assert.equal(Object.hasOwn(exported, 'validation_status'), false, description);
      assert.equal(exported.sample, false, description);
      checked++;
    }
  }
  assert.equal(checked, 26760);
});

test('all 26760 no-profile combinations remain byte-identical to the pinned dev3 composer', () => {
  const baselinePath = path.join(__dirname, '../validation/evals/comparison/baseline-core-dev3.cjs');
  const baselineBytes = fs.readFileSync(baselinePath);
  assert.equal(createHash('sha256').update(baselineBytes).digest('hex'),
    'b182929412a7e94a85138e0930c3f25db111e207e58d230c5662decace4fa8fd');
  const previous = require(baselinePath);
  const catalog = [...require('../demo/catalog.js'), ...require('../demo/atlas-catalog.js')];
  let checked = 0;
  for (const technique of catalog) for (const mode of Object.keys(core.MODES)) for (const target of core.TARGETS) {
    const options = { mode, target, context: 'Synthetic literal context ${HOME} <script>not executed</script>' };
    assert.equal(core.composePrompt(technique, options), previous.composePrompt(technique, options),
      `${technique.id} / ${target} / ${mode}`);
    checked++;
  }
  assert.equal(checked, 26760);
});

test('browser UMD profile and composer are byte-identical with Node and need no network', async () => {
  const browser = vm.createContext({ crypto: webcrypto, TextEncoder });
  for (const file of ['environment.js', 'core.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8'), browser);
  const value = profile();
  browser.input = environment.serialize(value);
  assert.equal(vm.runInContext('PAD_ENVIRONMENT.serialize(PAD_ENVIRONMENT.parse(input))', browser), environment.serialize(value));
  assert.equal(await vm.runInContext('PAD_ENVIRONMENT.hash(PAD_ENVIRONMENT.parse(input))', browser), await environment.hash(value));
  browser.recordJSON = JSON.stringify(record);
  assert.equal(vm.runInContext('PAD.composePrompt(JSON.parse(recordJSON), { environment: PAD_ENVIRONMENT.parse(input) })', browser), core.composePrompt(record, { environment: value }));
});
