(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PAD_PREFERENCES = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'pad-module-visibility-v1';
  const MAX_BYTES = 512;
  const KEYS = Object.freeze(['compare', 'defenses', 'flow', 'research']);
  const DEFAULTS = Object.freeze(Object.fromEntries(KEYS.map(key => [key, true])));
  const freshDefaults = () => ({ ...DEFAULTS });

  function validate(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value) ||
          ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return null;
      const keys = Reflect.ownKeys(value);
      if (keys.length !== KEYS.length || keys.some(key => typeof key !== 'string' || !KEYS.includes(key))) return null;
      const result = {};
      for (const key of KEYS) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'boolean') return null;
        result[key] = descriptor.value;
      }
      return result;
    } catch { return null; }
  }

  function load(storage) {
    if (!storage || typeof storage.getItem !== 'function') return { preferences: freshDefaults(), status: 'unavailable' };
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch { return { preferences: freshDefaults(), status: 'unavailable' }; }
    if (raw === null) return { preferences: freshDefaults(), status: 'default' };
    if (typeof raw !== 'string' || raw.length > MAX_BYTES) {
      return { preferences: freshDefaults(), status: 'invalid' };
    }
    let oversized = true;
    try { oversized = new TextEncoder().encode(raw).length > MAX_BYTES; }
    catch { oversized = raw.length > MAX_BYTES; }
    if (oversized) return { preferences: freshDefaults(), status: 'invalid' };
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { return { preferences: freshDefaults(), status: 'invalid' }; }
    const preferences = validate(parsed);
    return preferences
      ? { preferences, status: 'stored' }
      : { preferences: freshDefaults(), status: 'invalid' };
  }

  function save(storage, value) {
    const preferences = validate(value);
    if (!preferences) return { preferences: freshDefaults(), status: 'invalid' };
    if (!storage || typeof storage.setItem !== 'function') return { preferences, status: 'unavailable' };
    try { storage.setItem(STORAGE_KEY, JSON.stringify(preferences)); }
    catch { return { preferences, status: 'unavailable' }; }
    return { preferences, status: 'saved' };
  }

  return Object.freeze({ STORAGE_KEY, MAX_BYTES, KEYS, DEFAULTS, load, save });
});
