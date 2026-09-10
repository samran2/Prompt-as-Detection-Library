'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync(require.resolve('../demo/workspace-ui.js'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const pause = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

function harness({ consent = true, saved = [], enabled = false, realContract = false } = {}) {
  const nodes = new Map(), downloads = [], timers = new Map(), events = new Map();
  const storage = new Map(enabled ? [['pad-workspaces-enabled', 'yes']] : []);
  const persisted = new Map(saved.map(value => [value.id, { id: value.id, revision: 40, value: clone(value) }]));
  let nextTimer = 0, counter = 40, opens = 0, saves = 0, clears = 0, closed = false;
  let saveError = null, captureHook = null, saveHook = null;
  const sources = { attack: '19.2', atlas: '2026.08', d3fend: '1.6.0', car: '1b922fe', attackFlow: '2.0.0' };
  const core = require('../demo/core.js');
  const snapshot = { drafts: [], context: '', contextInput: '', flow: { title: 'Hypothesis', steps: [] },
    view: { query: '', domain: '', tactic: '', platform: '', mode: 'detect', target: core.TARGETS[0], technique: 'T1059.001', compare: [], theme: 'system', tab: 'prompt', paneWidth: 330, listScroll: 0, mobileView: 'list' } };
  const restored = [];
  class Element {
    constructor(tag = 'div') { this.tag = tag; this.value = ''; this.textContent = ''; this.hidden = false; this.disabled = false; this.checked = false; this.children = []; this.handlers = new Map(); this.attributes = new Map(); this.files = []; }
    addEventListener(name, handler) { this.handlers.set(name, handler); }
    dispatch(name) { return this.handlers.get(name)?.({ target: this, preventDefault() {} }); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); }
    focus() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
    remove() {}
    click() { if (this.tag === 'a') downloads.push({ filename: this.download, blob: blobs.get(this.href) }); else return this.dispatch('click'); }
  }
  const ids = ['workspace-open','workspace-dialog','workspace-close','workspace-name','workspace-select','workspace-new','workspace-export','workspace-file','workspace-preview','workspace-preview-text','workspace-import-confirm','workspace-import-cancel','workspace-autosave','workspace-storage-status','workspace-delete-local','favorite-toggle','favorites-list','collection-name','collection-create','collection-select','collection-add','collection-items','workspace-warnings'];
  for (const id of ids) nodes.set(id, new Element());
  Object.defineProperty(nodes.get('workspace-file'), 'value', {
    get() { return this.fileValue || ''; },
    set(value) { this.fileValue = value; if (value === '') this.files = []; },
  });
  const $ = id => { assert.ok(nodes.has(id), id); return nodes.get(id); };
  let api = {
    create(name, sources) { return { schemaVersion: 1, id: crypto.randomUUID(), name, sources: clone(sources), ...clone(snapshot), favorites: [], collections: [] }; },
    validate(value) { if (!value || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120 || !Array.isArray(value.favorites)) throw new Error('Rejected'); return clone(value); },
    parse(text) { return this.validate(JSON.parse(text)); },
    serialize(value) { return JSON.stringify(this.validate(value)); },
    async inspect(value) { if (value.badHash) throw new Error('Hash mismatch'); const unresolved = [...value.favorites, ...value.flow.steps].filter(id => id === 'T9999'); return { warnings: unresolved.map(id => ({ code: 'unknown', message: id + ' unresolved' })), unresolved }; },
  };
  const blobs = new Map();
  const window = {
    crypto: crypto.webcrypto, Blob, TextDecoder,
    URL: { createObjectURL(blob) { const id = 'blob:' + blobs.size; blobs.set(id, blob); return id; }, revokeObjectURL() {} },
    confirm: () => consent,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    addEventListener: (key, handler) => events.set(key, handler),
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
  };
  const document = { defaultView: window, getElementById: $, createElement: tag => new Element(tag), body: new Element('body') };
  const store = { async open() { opens++; closed = false; return {
    async list() { return clone([...persisted.values()]); },
    async save(value, expectedRevision) { saves++; if (saveHook) await saveHook(); if (saveError) throw Object.assign(new Error('Untrusted details'), { code: saveError }); const old = persisted.get(value.id); if ((old?.revision || 0) !== expectedRevision) throw Object.assign(new Error('Conflict'), { code: 'CONFLICT' }); const record = { id: value.id, revision: ++counter, value: clone(value) }; persisted.set(value.id, record); return clone(record); },
    async clear() { clears++; persisted.clear(); closed = true; }, close() { closed = true; },
  }; } };
  const context = vm.createContext({ ...window, TextEncoder, PAD_WORKSPACE: api, PAD_WORKSPACE_STORE: store });
  if (realContract) {
    // Production contract and controller share one browser realm. Keep that
    // boundary here instead of weakening strict plain-object validation.
    vm.runInContext(fs.readFileSync(require.resolve('../demo/core.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(require.resolve('../demo/workspace.js'), 'utf8'), context);
    api = context.PAD_WORKSPACE;
  }
  const inRealm = value => realContract
    ? vm.runInContext('JSON.parse(' + JSON.stringify(JSON.stringify(value)) + ')', context)
    : clone(value);
  vm.runInContext(source, context);
  const ui = context.PAD_WORKSPACE_UI.create({ document, catalog: inRealm([{ id: 'T1059.001', name: 'PowerShell' }]), core: realContract ? context.PAD : core, sources: inRealm(sources), capture: async () => inRealm(await (captureHook ? captureHook() : snapshot)), restore: value => { restored.push(clone(value)); Object.assign(snapshot, clone({ drafts: value.drafts, context: value.context, contextInput: value.contextInput, flow: value.flow, view: value.view })); }, navigate() {} });
  async function runTimers() { const pending = [...timers.values()]; timers.clear(); for (const callback of pending) callback(); for (let i = 0; i < 5; i++) await pause(); }
  async function exported() { const count = downloads.length; await $('workspace-export').dispatch('click'); assert.equal(downloads.length, count + 1, $('workspace-storage-status').textContent); return JSON.parse(await downloads.at(-1).blob.text()); }
  function importFile(value) { const bytes = new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)); $('workspace-file').files = [{ size: bytes.length, arrayBuffer: async () => bytes.buffer }]; return $('workspace-file').dispatch('change'); }
  return { $, ui, api, snapshot, persisted, restored, storage, events, downloads, runTimers, exported, importFile, stats: () => ({ opens, saves, clears, closed }), captureWith(fn) { captureHook = fn; }, saveWith(fn) { saveHook = fn; }, failSave(code) { saveError = code; } };
}

async function enable(h) { h.$('workspace-autosave').checked = true; await h.$('workspace-autosave').dispatch('change'); }

test('workspace content stays in memory unless the user explicitly enables persistence', async () => {
  const h = harness(); await h.ui.ready;
  h.snapshot.context = 'Private context'; h.ui.changed(); await h.runTimers();
  assert.equal(h.stats().opens, 0); assert.equal(h.storage.size, 0);
  const result = await h.exported(); assert.equal(result.context, 'Private context');
  assert.equal(h.downloads[0].filename, 'research.pad-workspace.json');
});

test('import preview and cancellation do not mutate current workspace; acceptance always gets a new ID', async () => {
  const h = harness(); await h.ui.ready;
  const before = await h.exported();
  const imported = { ...before, name: '<script>Literal title</script>', context: 'Imported context' };
  await h.importFile(imported); assert.equal(h.$('workspace-preview').hidden, false);
  assert.match(h.$('workspace-preview-text').textContent, /<script>Literal title<\/script>/);
  await h.$('workspace-import-cancel').dispatch('click');
  assert.deepEqual(await h.exported(), before);
  await h.importFile(imported); await h.$('workspace-import-confirm').dispatch('click');
  const after = await h.exported(); assert.notEqual(after.id, before.id); assert.equal(after.context, 'Imported context');
});

test('stored workspace listing never replaces the initial explicit view automatically', async () => {
  const seed = harness(); await seed.ui.ready; const saved = await seed.exported(); saved.view.technique = 'T9999';
  const h = harness({ saved: [saved], enabled: true }); await h.ui.ready;
  assert.equal(h.restored.length, 0); assert.equal(h.snapshot.view.technique, 'T1059.001');
  h.$('workspace-select').value = saved.id; await h.$('workspace-select').dispatch('change');
  assert.equal(h.restored.length, 1); assert.equal(h.snapshot.view.technique, 'T9999');
});

test('declined consent does not open storage and export does not count as a persisted revision', async () => {
  const declined = harness({ consent: false }); await declined.ui.ready; await enable(declined);
  assert.equal(declined.stats().opens, 0); assert.equal(declined.$('workspace-autosave').checked, false);
  const h = harness(); await h.ui.ready; const exported = await h.exported(); await enable(h);
  assert.equal(h.persisted.get(exported.id).value.name, exported.name);
  assert.equal(h.storage.get('pad-workspaces-enabled'), 'yes');
  assert.match(h.$('workspace-storage-status').textContent, /Saved locally/);
});

test('late capture is retried before switching so the newest edit survives', async () => {
  const h = harness(); await h.ui.ready;
  const gate = deferred(); let calls = 0;
  h.captureWith(() => { const value = clone(h.snapshot); return ++calls === 1 ? gate.promise.then(() => value) : value; });
  h.snapshot.context = 'Old'; h.ui.changed();
  const copying = h.$('workspace-new').dispatch('click'); await pause();
  h.snapshot.context = 'Newest'; h.ui.changed(); gate.resolve(); await copying;
  assert.equal((await h.exported()).context, 'Newest');
});

test('edits made while an autosave is pending are captured before copying or switching', async () => {
  const h = harness(); await h.ui.ready; await enable(h);
  const gate = deferred(); let calls = 0;
  h.saveWith(() => ++calls === 1 ? gate.promise : undefined);
  h.snapshot.context = 'Old'; h.ui.changed();
  const copying = h.$('workspace-new').dispatch('click'); await pause();
  h.snapshot.context = 'Newest during save'; h.ui.changed();
  assert.match(h.$('workspace-storage-status').textContent, /Unsaved/);
  gate.resolve(); await copying;
  assert.equal((await h.exported()).context, 'Newest during save');
});

test('an enable click queued behind capture is cancelled if consent is switched off first', async () => {
  const h = harness(); await h.ui.ready;
  const gate = deferred(); h.captureWith(() => gate.promise.then(() => clone(h.snapshot)));
  h.ui.changed(); const exporting = h.$('workspace-export').dispatch('click'); await pause();
  h.$('workspace-autosave').checked = true; const enabling = h.$('workspace-autosave').dispatch('change');
  h.$('workspace-autosave').checked = false; h.$('workspace-autosave').dispatch('change');
  gate.resolve(); await exporting; await enabling;
  assert.equal(h.stats().opens, 0);
});

test('conflicting autosave stops persistence and preserves local content for export and a fresh copy', async () => {
  const h = harness(); await h.ui.ready; await enable(h);
  const old = await h.exported(); h.persisted.get(old.id).revision++;
  h.snapshot.context = 'Keep my conflicting edit'; h.ui.changed(); await h.runTimers();
  assert.match(h.$('workspace-storage-status').textContent, /Autosave stopped/);
  assert.equal(h.$('workspace-autosave').checked, false); assert.equal(h.storage.has('pad-workspaces-enabled'), false);
  assert.equal((await h.exported()).context, 'Keep my conflicting edit');
  const opens = h.stats().opens; await enable(h); assert.equal(h.stats().opens, opens);
  await h.$('workspace-new').dispatch('click'); const copy = await h.exported();
  assert.notEqual(copy.id, old.id); await enable(h);
  assert.equal(h.persisted.get(copy.id).value.context, 'Keep my conflicting edit');
});

test('quota/storage failures leave drafts in memory and clear does not silently recreate deleted records', async () => {
  const h = harness(); await h.ui.ready; await enable(h);
  h.failSave('STORAGE'); h.snapshot.context = 'Retain after quota'; h.ui.changed(); await h.runTimers();
  assert.match(h.$('workspace-storage-status').textContent, /Autosave unavailable/);
  await h.$('workspace-delete-local').dispatch('click');
  assert.equal(h.persisted.size, 0); assert.equal(h.stats().clears, 1);
  assert.equal(h.$('workspace-autosave').checked, false);
  assert.equal((await h.exported()).context, 'Retain after quota');
  await h.runTimers(); assert.equal(h.persisted.size, 0);
});

test('invalid imports and stale asynchronous previews cannot mutate current content', async () => {
  const h = harness(); await h.ui.ready; const original = await h.exported();
  await h.importFile('{bad JSON'); assert.deepEqual(await h.exported(), original);
  const gate = deferred(); const value = { ...original, name: 'Stale preview' };
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  h.$('workspace-file').files = [{ size: bytes.length, arrayBuffer: () => gate.promise }];
  const pending = h.$('workspace-file').dispatch('change');
  h.snapshot.context = 'New editing'; h.ui.changed(); gate.resolve(bytes.buffer); await pending;
  assert.equal(h.$('workspace-preview').hidden, true);
  assert.equal((await h.exported()).context, 'New editing');
});

test('unresolved references remain in exports and are disabled as navigation targets', async () => {
  const h = harness(); await h.ui.ready;
  const value = await h.exported(); value.favorites = ['T9999']; value.flow.steps = ['T9999'];
  await h.importFile(value); await h.$('workspace-import-confirm').dispatch('click');
  const exported = await h.exported(); assert.deepEqual(exported.favorites, ['T9999']); assert.deepEqual(exported.flow.steps, ['T9999']);
  assert.equal(h.$('favorites-list').children[0].children[0].disabled, true);
  assert.match(h.$('workspace-warnings').children[0].textContent, /unresolved/);
});

test('beforeunload warns about unprotected memory edits, including edits after a file export', async () => {
  const h = harness(); await h.ui.ready;
  const warning = () => { let prevented = false; h.events.get('beforeunload')({ preventDefault() { prevented = true; } }); return prevented; };
  assert.equal(warning(), false); h.ui.changed(); assert.equal(warning(), true);
  await h.exported(); assert.equal(warning(), false);
  h.ui.changed(); assert.equal(warning(), true);
});

test('real portable contract accepts controller favorites, collections and import round trips', async () => {
  const h = harness({ realContract: true }); await h.ui.ready;
  h.ui.selectionChanged({ id: 'T1059.001', name: 'PowerShell' });
  h.$('favorite-toggle').dispatch('click');
  h.$('collection-name').value = '<script>Literal collection</script>';
  h.$('collection-create').dispatch('click'); h.$('collection-add').dispatch('click');
  const exported = await h.exported();
  assert.deepEqual(exported.favorites, ['T1059.001']);
  assert.deepEqual(exported.collections[0].techniqueIds, ['T1059.001']);
  assert.equal(exported.collections[0].name, '<script>Literal collection</script>');
  await h.importFile(exported); await h.$('workspace-import-confirm').dispatch('click');
  const copy = await h.exported(); assert.notEqual(copy.id, exported.id);
  assert.deepEqual(copy.collections, exported.collections);
});
