'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const environment = require('../demo/environment.js');
const controller = require('../demo/environment-ui.js');
const core = require('../demo/core.js');
const clone = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { resolve, promise }; };

function harness({ initialComposer, env = environment, accepted = true, apply } = {}) {
  const nodes = new Map(), applied = [], downloads = [];
  let changes = 0;
  const document = { activeElement: null, defaultView: { confirm: () => accepted, TextDecoder } };
  class Element {
    constructor() { this.value = ''; this.textContent = ''; this.hidden = false; this.disabled = false; this.open = false; this.children = []; this.files = []; this.listeners = new Map(); this.attributes = new Map(); }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    async dispatch(type, extra = {}) { return this.listeners.get(type)?.({ target: this, preventDefault() {}, ...extra }); }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const ids = ['composer-mode','guide-previous','guide-next','guide-step-title','guide-step-description','guide-nav','guide-task','guide-environment','guide-telemetry','guide-result','guide-summary','environment-current','environment-telemetry-summary','environment-status','environment-select','environment-new','environment-edit','environment-copy','environment-delete','environment-export','environment-apply','environment-import','environment-dialog','environment-dialog-title','environment-name','environment-target','environment-system','environment-dataSources','environment-tables','environment-fieldMappings','environment-limitations','environment-save','environment-cancel','environment-error','environment-preview-dialog','environment-preview-text','environment-import-confirm','environment-import-cancel'];
  ids.forEach(id => nodes.set(id, new Element()));
  document.getElementById = id => nodes.get(id) || null;
  document.createElement = () => new Element();
  const details = { technique: { id: 'T0800', name: 'Activate Firmware Update Mode' }, mode: 'detect', target: core.TARGETS[0], context: '' };
  const ui = controller.create({ document, environment: env, targets: core.TARGETS, getDetails: () => details,
    onApply: async (profile, hash) => { applied.push({ profile: clone(profile), hash }); if (apply) await apply(profile, hash); },
    onChange: () => changes++, download: (...args) => downloads.push(args), initialComposer });
  const $ = id => nodes.get(id);
  async function importFile(value) {
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new TextEncoder().encode(JSON.stringify(value));
    $('environment-import').files = [{ size: bytes.byteLength, arrayBuffer: async () => bytes.buffer }];
    await $('environment-import').dispatch('change');
  }
  async function add(name = 'Local SOC') {
    await $('environment-new').dispatch('click'); $('environment-name').value = name;
    await $('environment-save').dispatch('click'); return ui.snapshot().profiles.at(-1);
  }
  return { ui, $, document, applied, downloads, details, importFile, add, changes: () => changes };
}

test('new guided and explicit quick views preserve state while moving between four steps', async () => {
  const h = harness(); assert.equal(h.ui.snapshot().composer, 'guided');
  assert.equal(h.$('guide-task').hidden, false); assert.equal(h.$('guide-result').hidden, true);
  for (let i = 0; i < 3; i++) await h.$('guide-next').dispatch('click');
  assert.equal(h.ui.snapshot().guideStep, 4); assert.equal(h.$('guide-result').hidden, false);
  assert.equal(h.$('guide-next').disabled, true); assert.match(h.$('guide-summary').textContent, /T0800/);
  h.$('composer-mode').value = 'quick'; await h.$('composer-mode').dispatch('change');
  assert.equal(h.$('guide-task').hidden, false); assert.equal(h.$('guide-result').hidden, false);
  assert.equal(h.$('guide-nav').hidden, true); assert.equal(h.applied.length, 0);
  assert.equal(harness({ initialComposer: 'quick' }).ui.snapshot().composer, 'quick');
});

test('saved profile changes never apply automatically and edits retain an applied immutable revision', async () => {
  const h = harness(); const initial = await h.add(); assert.equal(h.applied.length, 0);
  await h.$('environment-apply').dispatch('click');
  assert.equal(h.applied[0].hash, await environment.hash(initial));
  await h.$('environment-edit').dispatch('click'); h.$('environment-tables').value = 'RealEvents';
  await h.$('environment-save').dispatch('click');
  const snapshot = h.ui.snapshot();
  assert.equal(snapshot.profiles[0].revision, 2); assert.equal(snapshot.activeEnvironment.revision, 1);
  assert.equal(snapshot.activeEnvironment.tables, ''); assert.equal(h.applied.length, 1);
  snapshot.activeEnvironment.name = 'Mutated outside'; assert.equal(h.ui.snapshot().activeEnvironment.name, 'Local SOC');
  await h.$('environment-apply').dispatch('click');
  assert.equal(h.ui.snapshot().activeEnvironment.revision, 2); assert.equal(h.applied.length, 2);
});

test('copy and cancel are recoverable; deleting a saved profile leaves applied context intact', async () => {
  const h = harness(); const initial = await h.add(); await h.$('environment-apply').dispatch('click');
  h.$('environment-copy').focus(); await h.$('environment-copy').dispatch('click');
  h.$('environment-name').value = 'Unsaved copy'; await h.$('environment-dialog').dispatch('cancel');
  assert.equal(h.ui.snapshot().profiles.length, 1); assert.equal(h.$('environment-dialog').open, false);
  assert.equal(h.document.activeElement, h.$('environment-copy'));
  await h.$('environment-copy').dispatch('click'); await h.$('environment-save').dispatch('click');
  const copy = h.ui.snapshot().profiles[1]; assert.notEqual(copy.id, initial.id); assert.equal(copy.revision, 1);
  h.$('environment-select').value = initial.id; await h.$('environment-select').dispatch('change');
  await h.$('environment-delete').dispatch('click');
  assert.equal(h.ui.snapshot().profiles.length, 1); assert.equal(h.ui.snapshot().activeEnvironment.id, initial.id);
  assert.equal(h.applied.length, 1);
});

test('imports preview literal text and require confirmation that creates a new identity', async () => {
  const h = harness(); const source = environment.create('<script>Lower</script> <SCRIPT>Upper</SCRIPT> <ScRiPt>Mixed</ScRiPt>', core.TARGETS[1]);
  source.provenance = 'example'; source.system = '<img src=x onerror=alert(1)>';
  await h.importFile(source); assert.equal(h.ui.snapshot().profiles.length, 0);
  assert.equal(h.$('environment-preview-dialog').open, true);
  const previewText = h.$('environment-preview-text').textContent;
  assert.ok(previewText.includes(source.name)); assert.ok(previewText.includes(source.system));
  await h.$('environment-import-cancel').dispatch('click'); assert.equal(h.ui.snapshot().profiles.length, 0);
  await h.importFile(source); await h.$('environment-import-confirm').dispatch('click');
  const imported = h.ui.snapshot().profiles[0]; assert.notEqual(imported.id, source.id);
  assert.equal(imported.provenance, 'example'); assert.equal(imported.system, source.system); assert.equal(h.applied.length, 0);
});

test('invalid and oversized imports preserve existing data and never open a preview', async () => {
  const h = harness(); await h.add(); const before = h.ui.snapshot();
  await h.importFile('{"schemaVersion":1,"schemaVersion":1}');
  assert.deepEqual(h.ui.snapshot(), before); assert.equal(h.$('environment-preview-dialog').open, false);
  let read = false; h.$('environment-import').files = [{ size: 1024 * 1024, arrayBuffer() { read = true; } }];
  await h.$('environment-import').dispatch('change'); assert.equal(read, false);
  assert.deepEqual(h.ui.snapshot(), before); assert.match(h.$('environment-status').textContent, /not imported/i);
});

test('new imports and restores invalidate stale asynchronous file reads', async () => {
  const h = harness(); const gate = deferred(); const source = environment.create('Stale', core.TARGETS[0]);
  const bytes = new TextEncoder().encode(JSON.stringify(source));
  h.$('environment-import').files = [{ size: bytes.length, arrayBuffer: () => gate.promise }];
  const pending = h.$('environment-import').dispatch('change');
  assert.match(h.$('environment-status').textContent, /reading profile/i);
  await h.importFile(environment.create('Current', core.TARGETS[0])); gate.resolve(bytes.buffer); await pending;
  assert.match(h.$('environment-preview-text').textContent, /Current/);
  h.ui.restore({ profiles: [], activeEnvironment: null, composer: 'quick', guideStep: 1 });
  await h.$('environment-import-confirm').dispatch('click'); assert.equal(h.ui.snapshot().profiles.length, 0);
});

test('restoring a workspace or changing selection cancels an in-flight profile hash before applying', async () => {
  const gate = deferred(); const h = harness({ env: { ...environment, hash: () => gate.promise } });
  await h.add(); const pending = h.$('environment-apply').dispatch('click');
  h.ui.restore({ profiles: [], activeEnvironment: null, composer: 'quick', guideStep: 1 });
  gate.resolve('a'.repeat(64)); await pending;
  assert.equal(h.applied.length, 0); assert.equal(h.ui.snapshot().activeEnvironment, null);
  assert.equal(h.$('environment-apply').disabled, false);
});

test('failed validation or application does not overwrite profile state and detaching is explicit', async () => {
  const h = harness({ apply: () => { throw new Error('private error'); } }); const initial = await h.add();
  await h.$('environment-apply').dispatch('click'); assert.equal(h.ui.snapshot().activeEnvironment, null);
  assert.doesNotMatch(h.$('environment-status').textContent, /private error/);
  await h.$('environment-edit').dispatch('click'); h.$('environment-name').value = '';
  await h.$('environment-save').dispatch('click'); assert.deepEqual(h.ui.snapshot().profiles, [initial]);
  assert.equal(h.$('environment-dialog').open, true);
  assert.throws(() => h.ui.restore({ profiles: [initial, initial], activeEnvironment: null, composer: 'quick', guideStep: 1 }));
  assert.deepEqual(h.ui.snapshot().profiles, [initial]);
  h.ui.detach(); assert.equal(h.ui.snapshot().activeEnvironment, null); assert.equal(h.ui.snapshot().profiles.length, 1);
});

test('profile limit rejects a new profile and import without losing existing profiles', async () => {
  const h = harness(); const profiles = Array.from({ length: 100 }, (_, i) => environment.create('Profile ' + i, core.TARGETS[0]));
  h.ui.restore({ profiles, activeEnvironment: null, composer: 'quick', guideStep: 1 });
  await h.$('environment-new').dispatch('click'); assert.equal(h.$('environment-dialog').open, false);
  await h.importFile(environment.create('Overflow', core.TARGETS[0]));
  await h.$('environment-import-confirm').dispatch('click'); assert.equal(h.ui.snapshot().profiles.length, 100);
});

test('guide warns when additional context has edits that are not applied to the prompt', () => {
  const h = harness(); h.details.context = 'Applied notes'; h.details.contextInput = 'New notes'; h.ui.refresh();
  assert.match(h.$('guide-summary').textContent, /unapplied context/i);
  h.details.contextInput = 'Applied notes'; h.ui.refresh(); assert.doesNotMatch(h.$('guide-summary').textContent, /unapplied context/i);
});

test('guide distinguishes retained draft context from context set for new prompts', () => {
  const h = harness(); h.details.context = 'Latest notes'; h.details.contextInput = 'Latest notes'; h.details.draftContext = 'Earlier notes'; h.ui.refresh();
  assert.match(h.$('guide-summary').textContent, /retained draft uses earlier context/i);
  assert.match(h.$('guide-summary').textContent, /Earlier notes/);
  assert.doesNotMatch(h.$('guide-summary').textContent, /Additional context is included separately/);
  h.details.draftContext = 'Latest notes'; h.ui.refresh(); assert.doesNotMatch(h.$('guide-summary').textContent, /retained draft uses earlier context/i);
});

test('invalid UTF-8 and a lying file size are rejected without importing partial text', async () => {
  const h = harness(); const profile = await h.add(); const before = h.ui.snapshot();
  const invalid = Uint8Array.from([123, 34, 192, 175, 34, 58, 49, 125]);
  h.$('environment-import').files = [{ size: invalid.length, arrayBuffer: async () => invalid.buffer }];
  await h.$('environment-import').dispatch('change'); assert.deepEqual(h.ui.snapshot(), before);
  const bytes = new TextEncoder().encode(environment.serialize(profile));
  h.$('environment-import').files = [{ size: 2, arrayBuffer: async () => bytes.buffer }];
  await h.$('environment-import').dispatch('change'); assert.deepEqual(h.ui.snapshot(), before);
  assert.equal(h.$('environment-preview-dialog').open, false);
});

test('export preserves exact profile and cancelled deletion leaves it recoverable', async () => {
  const h = harness({ accepted: false }); const profile = await h.add();
  await h.$('environment-export').dispatch('click'); const [filename, text, mime] = h.downloads[0];
  assert.equal(filename, 'environment-' + profile.id + '.pad-environment.json');
  assert.deepEqual(environment.parse(text), profile); assert.equal(mime, 'application/json');
  await h.$('environment-delete').dispatch('click'); assert.deepEqual(h.ui.snapshot().profiles, [profile]);
  await h.$('environment-apply').dispatch('click'); h.ui.detach();
  assert.equal(h.applied.length, 1); assert.equal(h.ui.snapshot().activeEnvironment, null);
  assert.deepEqual(h.ui.snapshot().profiles, [profile]);
});

test('changing selected profile cancels hashing without silently applying the old choice', async () => {
  const gate = deferred(); const h = harness({ env: { ...environment, hash: () => gate.promise } });
  await h.add(); const pending = h.$('environment-apply').dispatch('click');
  h.$('environment-select').value = ''; await h.$('environment-select').dispatch('change');
  gate.resolve('b'.repeat(64)); await pending;
  assert.equal(h.applied.length, 0); assert.equal(h.ui.snapshot().activeEnvironment, null);
  assert.equal(h.$('environment-apply').disabled, false);
});

test('importing a profile while a prior apply is hashing cannot leave the apply button locked', async () => {
  const gate = deferred(); const h = harness({ env: { ...environment, hash: () => gate.promise } });
  await h.add(); const pending = h.$('environment-apply').dispatch('click');
  await h.importFile(environment.create('Imported profile', core.TARGETS[1]));
  gate.resolve('c'.repeat(64)); await pending;
  assert.equal(h.applied.length, 0);
  await h.$('environment-import-cancel').dispatch('click');
  assert.equal(h.$('environment-apply').disabled, false);
  assert.equal(h.$('environment-apply').textContent, 'Use selected profile');
});

test('parent navigation can cancel pending work without detaching the applied snapshot', async () => {
  const gate = deferred(); let delayed = false;
  const h = harness({ env: { ...environment, hash: profile => delayed ? gate.promise : environment.hash(profile) } });
  const applied = await h.add(); await h.$('environment-apply').dispatch('click');
  await h.add('Second choice'); delayed = true; const pending = h.$('environment-apply').dispatch('click');
  h.ui.cancelPending(); gate.resolve('d'.repeat(64)); await pending;
  assert.equal(h.applied.length, 1); assert.deepEqual(h.ui.snapshot().activeEnvironment, applied);
  assert.equal(h.$('environment-apply').disabled, false);
});

test('pointer-opened profile dialogs return focus to the actual invoker, not a previously focused control', async () => {
  const h = harness(); await h.add();
  for (const kind of ['new', 'edit', 'copy']) {
    h.$('composer-mode').focus();
    // WebKit pointer clicks do not necessarily focus the clicked button.
    await h.$('environment-' + kind).dispatch('click');
    h.$('environment-save').focus();
    await h.$('environment-dialog').dispatch('cancel');
    assert.equal(h.document.activeElement, h.$('environment-' + kind), kind);
  }
});

test('profile preview cancellation returns focus to the file input even if pointer selection did not focus it', async () => {
  const h = harness(); h.$('composer-mode').focus();
  await h.importFile(environment.create('Imported preview', core.TARGETS[0]));
  h.$('environment-import-confirm').focus();
  await h.$('environment-preview-dialog').dispatch('cancel');
  assert.equal(h.document.activeElement, h.$('environment-import'));
});

test('delete confirmation returns to its invoker on cancel and an enabled selector after deletion', async () => {
  const cancelled = harness({ accepted: false }); await cancelled.add(); cancelled.$('composer-mode').focus();
  await cancelled.$('environment-delete').dispatch('click');
  assert.equal(cancelled.document.activeElement, cancelled.$('environment-delete'));
  const confirmed = harness(); await confirmed.add(); confirmed.$('composer-mode').focus();
  await confirmed.$('environment-delete').dispatch('click');
  assert.equal(confirmed.document.activeElement, confirmed.$('environment-select'));
  assert.equal(confirmed.$('environment-delete').disabled, true);
});
