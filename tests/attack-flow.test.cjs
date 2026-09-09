'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createFlow } = require('../demo/attack-flow.js');
const catalog = require('../demo/catalog.js');
const schema = require('../sources/attack-flow-2.0.0/schema.json');
const extension = require('../sources/attack-flow-2.0.0/extension.json');
const EXTENSION_ID = extension.objects[0].id;
const records = [catalog.find(x => x.id === 'T1059.001'), catalog.find(x => x.id === 'T0800')];

test('ordered Attack Flow export uses the official 2.0.0 STIX extension and exact technique references', () => {
  const bundle = createFlow(records, { title: 'Research hypothesis' });
  assert.equal(bundle.type, 'bundle');
  const flow = bundle.objects.find(x => x.type === 'attack-flow');
  const actions = bundle.objects.filter(x => x.type === 'attack-action');
  assert.deepEqual(flow.start_refs, [actions[0].id]);
  assert.deepEqual(actions[0].effect_refs, [actions[1].id]);
  assert.equal(actions[1].effect_refs, undefined);
  assert.deepEqual(actions.map(x => x.technique_id), records.map(x => x.id));
  assert.deepEqual(actions.map(x => x.technique_ref), records.map(x => x.stixId));
  assert.deepEqual(bundle.objects.find(x => x.type === 'extension-definition'), extension.objects[0]);
  for (const object of [flow, ...actions]) {
    const definition = schema.$defs[object.type];
    for (const field of definition.required) assert.ok(Object.hasOwn(object, field), field);
    for (const [key, field] of Object.entries(definition.properties)) {
      if (!Object.hasOwn(object, key)) continue;
      if (field.const) assert.equal(object[key], field.const);
      if (field.enum) assert.ok(field.enum.includes(object[key]));
      if (field.type === 'string') assert.equal(typeof object[key], 'string');
      if (field.type === 'array') assert.ok(Array.isArray(object[key]) && object[key].length >= (field.minItems || 0));
    }
    assert.deepEqual(object.extensions, { [EXTENSION_ID]: { extension_type: 'new-sdo' } });
    assert.equal(object.confidence, 0);
    assert.match(object.description, /hypothesis/i);
    assert.match(object.created, /^\d{4}-\d{2}-\d{2}T.*\.\d{3}Z$/);
    assert.equal(object.created, object.modified);
    assert.equal(object.created_by_ref, undefined);
    assert.equal(object.execution_start, undefined);
    assert.equal(object.command_ref, undefined);
  }
  assert.equal(new Set(bundle.objects.map(x => x.id)).size, bundle.objects.length);
});

test('export is literal and discards private context and asserted evidence', () => {
  const modified = records.map(x => ({ ...x, context: 'PRIVATE_SENTINEL', validation: { level: 'field-confirmed' }, command: 'PRIVATE_SENTINEL' }));
  const bundle = createFlow(modified, { title: '<script>${name}</script>', description: '${context} $(example)' });
  const flow = bundle.objects.find(x => x.type === 'attack-flow');
  assert.equal(flow.name, '<script>${name}</script>');
  assert.match(flow.description, /\$\{context\} \$\(example\)/);
  assert.doesNotMatch(JSON.stringify(bundle), /PRIVATE_SENTINEL|field-confirmed/);
  assert.equal(flow.scope, 'other');
});

test('bounds reject malformed inputs and unsupported records without mutation', () => {
  const before = JSON.stringify(records);
  for (const input of [null, {}, [], [records[0]], Array(21).fill(records[0])]) assert.throws(() => createFlow(input, { title: 'Test' }), /2.*20/);
  for (const title of ['', ' ', 'x'.repeat(201), 5, null, 'bad\u0000title']) assert.throws(() => createFlow(records, { title }), /title/i);
  assert.throws(() => createFlow(records, { title: 'Test', description: 'x'.repeat(4001) }), /description/i);
  for (const patch of [{ id: 'AML.T0051' }, { id: 'T1059.001\n' }, { domain: 'ATLAS' }, { stixId: 'attack-pattern--bad' }, { attackVersion: '99.0' }, { name: '' }]) {
    assert.throws(() => createFlow([{ ...records[0], ...patch }, records[1]], { title: 'Test' }), /record|ATT&CK/i);
  }
  createFlow(records, { title: 'Test' });
  assert.equal(JSON.stringify(records), before);
});

test('repeated technique steps have fresh action IDs and consecutive exports do not collide', () => {
  const a = createFlow(Array(20).fill(records[0]), { title: 'Repeat' });
  const b = createFlow(records, { title: 'Second' });
  const actions = a.objects.filter(x => x.type === 'attack-action');
  assert.equal(new Set(actions.map(x => x.id)).size, 20);
  assert.notEqual(a.id, b.id);
  assert.notEqual(actions[0].id, b.objects.find(x => x.type === 'attack-action').id);
});

test('C1 controls are rejected in free-text metadata', () => {
  assert.throws(() => createFlow(records, { title: 'C1\u0085control' }), /title/i);
  assert.throws(() => createFlow(records, { title: 'Valid', description: 'C1\u009fcontrol' }), /description/i);
});

test('sparse technique arrays fail at the input boundary', () => {
  assert.throws(() => createFlow(Array(2), { title: 'Missing steps' }), /record/i);
});

test('browser UMD uses cryptographic IDs and fails safely when unavailable', () => {
  const source = fs.readFileSync(require.resolve('../demo/attack-flow.js'), 'utf8');
  const browser = vm.createContext({ crypto: crypto.webcrypto, PAD_CATALOG: catalog });
  vm.runInContext(source, browser);
  assert.equal(browser.PAD_ATTACK_FLOW.createFlow(records, { title: 'Browser' }).type, 'bundle');
  const unavailable = vm.createContext({ PAD_CATALOG: catalog });
  vm.runInContext(source, unavailable);
  assert.throws(() => unavailable.PAD_ATTACK_FLOW.createFlow(records, { title: 'No crypto' }), /cryptograph|secure/i);
});

test('official source pins and complete exported license remain intact', () => {
  const manifest = require('../sources/attack-flow-2.0.0/manifest.json');
  assert.equal(manifest.upstreamCommit, '0bd4a2d45dceacce499d7e94b85f7966e70f5399');
  for (const entry of manifest.files) {
    const bytes = fs.readFileSync(require.resolve('../sources/attack-flow-2.0.0/' + entry.path));
    assert.equal(bytes.length, entry.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256);
  }
  const license = fs.readFileSync(require.resolve('../sources/attack-flow-2.0.0/LICENSE'), 'utf8');
  const bundle = createFlow(records, { title: 'Notice test' });
  const note = bundle.objects.find(x => x.type === 'note');
  assert.ok(note.content.endsWith(license));
  assert.deepEqual(note.object_refs, extension.objects.map(x => x.id));
  bundle.objects[0].name = 'Tampered output';
  assert.deepEqual(createFlow(records, { title: 'Fresh' }).objects[0], extension.objects[0]);
});

test('every pinned active ATT&CK record exports but fabricated identifiers and mismatched references fail', () => {
  for (const record of catalog) {
    const flow = createFlow([record, record], { title: 'Catalog coverage' });
    assert.equal(flow.objects.filter(x => x.type === 'attack-action').length, 2);
  }
  assert.throws(() => createFlow([{ ...records[0], id: 'T9999' }, records[1]], { title: 'Forged' }), /pinned catalog/i);
  assert.throws(() => createFlow([{ ...records[0], stixId: records[1].stixId }, records[1]], { title: 'Mismatched' }), /pinned catalog/i);
});
