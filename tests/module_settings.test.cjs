'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const preferences = require('../demo/preferences.js');
const { PUBLIC_FILES } = require('../scripts/build_demo.cjs');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const expected = { compare: true, defenses: true, flow: true, research: true };

function storage(initial = null) {
  const values = new Map(initial === null ? [] : [[preferences.STORAGE_KEY, initial]]);
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test('module preferences expose one strict all-visible contract', () => {
  assert.equal(preferences.STORAGE_KEY, 'pad-module-visibility-v1');
  assert.deepEqual(preferences.KEYS, ['compare', 'defenses', 'flow', 'research']);
  assert.deepEqual(preferences.DEFAULTS, expected);
  assert.ok(Object.isFrozen(preferences.KEYS));
  assert.ok(Object.isFrozen(preferences.DEFAULTS));
});

test('missing and exact stored preferences load without exposing storage internals', () => {
  assert.deepEqual(preferences.load(storage()), { preferences: expected, status: 'default' });
  const chosen = { compare: false, defenses: true, flow: false, research: true };
  assert.deepEqual(preferences.load(storage(JSON.stringify(chosen))), { preferences: chosen, status: 'stored' });
});

test('malformed, excessive or unsupported stored values fail open to all modules', () => {
  const values = [
    '{', 'null', '[]', JSON.stringify({ compare: false, defenses: true, flow: true }),
    JSON.stringify({ ...expected, evidence: false }), JSON.stringify({ ...expected, flow: 'false' }),
    JSON.stringify({ compare: false, defenses: true, flow: true, research: { nested: true } }),
    ' '.repeat(preferences.MAX_BYTES + 1),
  ];
  for (const value of values) {
    assert.deepEqual(preferences.load(storage(value)), { preferences: expected, status: 'invalid' }, value.slice(0, 80));
  }
});

test('unavailable storage is non-fatal and never leaks a private exception', () => {
  const denied = {
    getItem() { throw new Error('private browser profile path'); },
    setItem() { throw new Error('private browser profile path'); },
  };
  assert.deepEqual(preferences.load(denied), { preferences: expected, status: 'unavailable' });
  const result = preferences.save(denied, { ...expected, compare: false });
  assert.deepEqual(result, { preferences: { ...expected, compare: false }, status: 'unavailable' });
  assert.doesNotMatch(JSON.stringify(result), /private browser profile path/);
});

test('save writes canonical booleans and rejects accessors or extra fields without invoking them', () => {
  const target = storage();
  const chosen = { research: false, flow: true, defenses: false, compare: true };
  assert.deepEqual(preferences.save(target, chosen), {
    preferences: { compare: true, defenses: false, flow: true, research: false }, status: 'saved',
  });
  assert.equal(target.values.get(preferences.STORAGE_KEY),
    '{"compare":true,"defenses":false,"flow":true,"research":false}');

  let called = false;
  const accessor = { defenses: true, flow: true, research: true };
  Object.defineProperty(accessor, 'compare', { enumerable: true, get() { called = true; return false; } });
  const before = target.values.get(preferences.STORAGE_KEY);
  assert.deepEqual(preferences.save(target, accessor), { preferences: expected, status: 'invalid' });
  assert.equal(called, false);
  assert.equal(target.values.get(preferences.STORAGE_KEY), before);
  assert.deepEqual(preferences.save(target, { ...expected, unknown: true }), { preferences: expected, status: 'invalid' });
});

test('settings and guide remain semantic local assets in the public build', () => {
  const html = read('demo/index.html');
  for (const id of ['settings-open', 'settings-dialog', 'settings-title', 'settings-close', 'settings-status',
    'settings-show-all', 'module-compare', 'module-defenses', 'module-flow', 'module-research',
    'guide-open', 'guide-dialog', 'guide-title', 'guide-close']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  for (const id of ['module-compare', 'module-defenses', 'module-flow', 'module-research']) {
    assert.match(html, new RegExp(`<input[^>]+id="${id}"[^>]+type="checkbox"|<input[^>]+type="checkbox"[^>]+id="${id}"`));
  }
  assert.match(html, /src="\.\/preferences\.js"/);
  assert.ok(PUBLIC_FILES.includes('preferences.js'));
  const code = read('demo/preferences.js');
  assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(|\bfetch\s*\(|XMLHttpRequest|sessionStorage/);
});
