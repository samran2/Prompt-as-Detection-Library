'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createHash, webcrypto} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../demo/core.js');
const attack = require('../demo/catalog.js');
const atlas = require('../demo/atlas-catalog.js');
const lab = require('../demo/lab-exchange.js');

const options = {title: 'Synthetic offline review', authorizationReference: 'LAB-SYNTHETIC-01'};
const sha256 = text => createHash('sha256').update(text).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));

test('lab plans contain only bounded identifiers, references and canonical prompt hashes', async () => {
  const records = [attack[0], atlas[0]];
  const plan = await lab.createPlan(records, options);
  assert.equal(plan.schemaVersion, 'pad-lab-plan-1');
  assert.equal(plan.evidenceStatus, 'unverified');
  assert.equal(plan.status, 'planned');
  assert.match(plan.planId, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(plan, await lab.createPlan(records, options));
  for (const [index, row] of plan.records.entries()) {
    assert.deepEqual(Object.keys(row).sort(), ['domain', 'framework', 'promptSha256', 'sourceUrl', 'techniqueId']);
    assert.equal(row.techniqueId, records[index].id);
    assert.equal(row.promptSha256, sha256(core.composePrompt(records[index])));
  }
  assert.notEqual(plan.planId, (await lab.createPlan(records, {...options, title: 'Other scope'})).planId);
  assert.notEqual(plan.planId, (await lab.createPlan([records[1], records[0]], options)).planId);
  assert.equal(core.validationState(records[0]).level, 'generated');
});

test('plan projection never copies extra source, credential or analyst fields', async () => {
  const secret = 'synthetic-secret-do-not-export';
  const record = {...attack[0], apiKey: secret, host: secret, analystContext: secret, command: secret};
  const plan = await lab.createPlan([record], options);
  assert.ok(!JSON.stringify(plan).includes(secret));
  assert.equal(plan.records[0].promptSha256, sha256(core.composePrompt(attack[0])));
});

test('plan inputs reject empty, oversized, duplicate and contradictory identities', async () => {
  for (const records of [[], Array(51).fill(attack[0]), [attack[0], attack[0]],
    [{...attack[0], id: '../escape'}], [{...atlas[0], domain: 'Enterprise'}],
    [{...attack[0], sourceUrl: 'https://attack.mitre.org.evil.invalid/techniques/T1001'}]]) {
    await assert.rejects(lab.createPlan(records, options));
  }
  for (const input of [{...options, title: ''}, {...options, title: 'x'.repeat(121)},
    {...options, authorizationReference: ''}, {...options, authorizationReference: 'https://private.invalid'},
    {...options, token: 'never-echo-this'}, {...options, title: '\u001b[31m'}]) {
    await assert.rejects(lab.createPlan([attack[0]], input), error => !error.message.includes('never-echo-this'));
  }
});

test('the template leaves actual run and fixture evidence unknown until supplied', async () => {
  const plan = await lab.createPlan([attack[0]], options);
  const template = await lab.createResultTemplate(plan);
  assert.equal(template.schemaVersion, 'pad-lab-results-1');
  assert.equal(template.planId, plan.planId);
  assert.equal(template.results[0].promptSha256, plan.records[0].promptSha256);
  assert.equal(template.results[0].fixtureSha256, null);
  assert.equal(template.results[0].runSha256, null);
  assert.equal(template.results[0].status, 'not-run');
  await assert.rejects(lab.importResults(JSON.stringify(template), plan));
});

test('a completed project envelope imports as unverified evidence without changing validation', async () => {
  const plan = await lab.createPlan([attack[0], atlas[0]], options);
  const envelope = await lab.createResultTemplate(plan);
  for (const row of envelope.results) {
    row.fixtureSha256 = sha256('synthetic inert fixture');
    row.runSha256 = sha256('synthetic review record; no lab was run');
    row.status = 'inconclusive';
  }
  const before = clone(plan);
  const imported = await lab.importResults(JSON.stringify(envelope), plan);
  assert.deepEqual(imported.results, envelope.results);
  assert.equal(imported.evidenceStatus, 'unverified');
  assert.equal(imported.validationLevel, 'generated');
  assert.deepEqual(plan, before);
  assert.equal(core.validationState(attack[0]).level, 'generated');
});

async function resultFixture(records = [attack[0]]) {
  const plan = await lab.createPlan(records, options);
  const envelope = await lab.createResultTemplate(plan);
  for (const row of envelope.results) {
    row.fixtureSha256 = sha256('synthetic fixture');
    row.runSha256 = sha256('synthetic run disposition, not an observed test');
  }
  return {plan, envelope};
}

test('all outcomes remain unverified and partial imports explicitly count missing records', async () => {
  const {plan, envelope} = await resultFixture([attack[0], atlas[0]]);
  envelope.results.pop();
  for (const status of ['observed', 'not-observed', 'inconclusive', 'not-run']) {
    envelope.results[0].status = status;
    const imported = await lab.importResults(JSON.stringify(envelope), plan);
    assert.equal(imported.results[0].status, status);
    assert.equal(imported.unreportedRecords, 1);
    assert.equal(imported.evidenceStatus, 'unverified');
    assert.equal(imported.validationLevel, 'generated');
  }
});

test('unknown, credential, execution and validation fields fail closed without echoing values or keys', async () => {
  const {plan, envelope} = await resultFixture();
  const secret = 'synthetic-private-value';
  for (const field of ['token', 'apiKey', 'command', 'plaintext_command', 'output', 'host_group', 'agents', 'notes', 'validationLevel', '__proto__', secret]) {
    for (const target of ['top', 'row']) {
      const payload = clone(envelope);
      Object.defineProperty(target === 'top' ? payload : payload.results[0], field, {value: secret, enumerable: true});
      await assert.rejects(lab.importResults(JSON.stringify(payload), plan), error => !error.message.includes(secret));
    }
  }
  await assert.rejects(lab.importResults(JSON.stringify({name: 'native Caldera report', host_group: [{token: secret}], steps: []}), plan),
    error => !error.message.includes(secret));
});

test('changed plans, mismatched prompt hashes, foreign identities and duplicate results are rejected', async () => {
  const {plan, envelope} = await resultFixture();
  for (const change of [payload => { payload.planId = 'sha256:' + 'f'.repeat(64); },
    payload => { payload.results[0].promptSha256 = 'f'.repeat(64); },
    payload => { payload.results[0].techniqueId = 'T9999'; },
    payload => { payload.results[0].domain = 'ICS'; },
    payload => { payload.results.push(clone(payload.results[0])); }]) {
    const payload = clone(envelope); change(payload);
    await assert.rejects(lab.importResults(JSON.stringify(payload), plan));
  }
  for (const change of [value => { value.title = 'A different plan'; },
    value => { value.records[0].promptSha256 = 'a'.repeat(64); },
    value => { value.evidenceStatus = 'validated'; },
    value => { value.token = 'secret'; }]) {
    const changed = clone(plan); change(changed);
    await assert.rejects(lab.importResults(JSON.stringify(envelope), changed));
    await assert.rejects(lab.createResultTemplate(changed));
  }
});

test('missing, malformed and uppercase digests and unsupported outcome claims are rejected', async () => {
  const {plan, envelope} = await resultFixture();
  for (const field of ['promptSha256', 'fixtureSha256', 'runSha256']) {
    for (const invalid of [null, '', 'a'.repeat(63), 'A'.repeat(64), 'z'.repeat(64), 0, {}, 'https://private.invalid/hash']) {
      const payload = clone(envelope); payload.results[0][field] = invalid;
      await assert.rejects(lab.importResults(JSON.stringify(payload), plan));
    }
    const payload = clone(envelope); delete payload.results[0][field];
    await assert.rejects(lab.importResults(JSON.stringify(payload), plan));
  }
  for (const status of ['lab-validated', 'field-confirmed', 'passed', 'success', 0, null]) {
    const payload = clone(envelope); payload.results[0].status = status;
    await assert.rejects(lab.importResults(JSON.stringify(payload), plan));
  }
});

test('malformed, oversized, deeply nested and duplicate-key JSON never exposes submitted contents', async () => {
  const {plan, envelope} = await resultFixture();
  const secret = 'private-malformed-content';
  for (const text of [`{"${secret}":`, '[', 'null', '[]', 'x'.repeat(lab.LIMITS.jsonBytes + 1),
    '['.repeat(9) + '0' + ']'.repeat(9),
    JSON.stringify(envelope).replace('"planId":', '"planId":"wrong","planId":'),
    JSON.stringify(envelope).replace('"planId":', '"plan\\u0049d":"wrong","planId":')]) {
    await assert.rejects(lab.importResults(text, plan), error => !error.message.includes(secret));
  }
});

test('a caller cannot mutate a plan while its asynchronous hash is being checked', async () => {
  const {plan, envelope} = await resultFixture();
  const pending = lab.importResults(JSON.stringify(envelope), plan);
  plan.records[0].techniqueId = 'T9999';
  plan.title = 'Changed while awaiting';
  const imported = await pending;
  assert.equal(imported.results[0].techniqueId, attack[0].id);
});

test('browser UMD uses local Web Crypto and composer without network or storage', async () => {
  const sandbox = {PAD: core, crypto: webcrypto, TextEncoder,
    fetch() { throw new Error('Unexpected network'); }, localStorage: {setItem() { throw new Error('Unexpected persistence'); }}};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo/lab-exchange.js'), 'utf8'), sandbox);
  sandbox.recordsJson = JSON.stringify([attack[0]]);
  sandbox.optionsJson = JSON.stringify(options);
  const plan = await vm.runInContext('PAD_LAB.createPlan(JSON.parse(recordsJson), JSON.parse(optionsJson))', sandbox);
  assert.equal(plan.records[0].promptSha256, sha256(core.composePrompt(attack[0])));
  assert.equal(plan.evidenceStatus, 'unverified');
});

test('secret-shaped labels fail before becoming plan metadata', async () => {
  for (const title of ['Bearer synthetic-private-token', 'password=synthetic', 'sk-' + 'x'.repeat(30)]) {
    await assert.rejects(lab.createPlan([attack[0]], {...options, title}), error => !error.message.includes(title));
  }
});

test('sparse selections and explicit invalid framework values cannot become malformed plans', async () => {
  for (const records of [new Array(1), [{...attack[0], framework: false}], [{...attack[0], framework: ''}], [{...attack[0], framework: null}]]) {
    await assert.rejects(lab.createPlan(records, options));
  }
});
