(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PAD_WORKSPACE_STORE = api;
})(globalThis, function () {
  'use strict';

  const DB_NAME = 'pad-workspaces-v1';
  const STORES = ['workspaces', 'metadata'];
  const MAX_BYTES = 5 * 1024 * 1024;
  const MAX_WORKSPACES = 100;
  const MESSAGES = Object.freeze({
    INVALID: 'Invalid workspace storage input.',
    CONFLICT: 'Saved workspaces changed. Reload or reopen storage before saving.',
    CLOSED: 'Workspace storage is closed. Reopen it to continue.',
    BLOCKED: 'Workspace storage is blocked by another open connection.',
    STORAGE: 'Workspace storage is unavailable. Keep your changes in memory and export a file.',
  });
  class StorageFault extends Error {
    constructor(code) { super(MESSAGES[code]); this.name = 'WorkspaceStorageError'; this.code = code; }
  }
  const requireCondition = (condition, code = 'INVALID') => { if (!condition) throw new StorageFault(code); };
  const revision = value => Number.isSafeInteger(value) && value >= 0;
  const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
  const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));

  // Schema ownership stays in workspace.js. This boundary permits only bounded
  // inert JSON, never functions, accessors, toJSON hooks or mutable caller aliases.
  function copyWorkspace(value) {
    requireCondition(plain(value));
    let nodes = 0; let units = 0;
    const ancestors = new Set();
    const copy = (item, depth) => {
      requireCondition(depth <= 64 && ++nodes <= 100000);
      if (item === null || typeof item === 'boolean') return item;
      if (typeof item === 'number') { requireCondition(Number.isFinite(item)); return item; }
      if (typeof item === 'string') { units += item.length; requireCondition(units <= MAX_BYTES); return item; }
      requireCondition(Array.isArray(item) || plain(item));
      requireCondition(!ancestors.has(item) && Object.getOwnPropertySymbols(item).length === 0);
      ancestors.add(item);
      const result = Array.isArray(item) ? [] : {};
      const keys = Object.keys(item);
      if (Array.isArray(item)) requireCondition(keys.length === item.length && keys.every((key, index) => key === String(index)));
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        requireCondition(Object.hasOwn(descriptor, 'value'));
        units += key.length; requireCondition(units <= MAX_BYTES);
        Object.defineProperty(result, key, {value: copy(descriptor.value, depth + 1), enumerable: true, writable: true, configurable: true});
      }
      ancestors.delete(item);
      return result;
    };
    const result = copy(value, 0);
    requireCondition(Object.hasOwn(result, 'id') && validId(result.id));
    requireCondition(new TextEncoder().encode(JSON.stringify(result)).length <= MAX_BYTES);
    return result;
  }

  function metadata(value) {
    requireCondition(plain(value) && Object.keys(value).sort().join(',') === 'counter,epoch,key'
      && value.key === 'control' && revision(value.counter) && revision(value.epoch) && value.epoch > 0, 'STORAGE');
    return value;
  }

  function record(value, id) {
    if (value === undefined) return null;
    try {
      requireCondition(plain(value) && Object.keys(value).sort().join(',') === 'id,revision,value'
        && validId(value.id) && (id === undefined || id === value.id) && revision(value.revision) && value.revision > 0);
      const workspace = copyWorkspace(value.value);
      requireCondition(workspace.id === value.id);
      return {id: value.id, revision: value.revision, value: workspace};
    } catch { throw new StorageFault('STORAGE'); }
  }

  function connection(db) {
    let closed = false;
    const close = () => { if (!closed) { closed = true; db.close(); } };
    db.onversionchange = close;
    db.onclose = () => { closed = true; };
    function transaction(mode, epoch, action) {
      return new Promise((resolve, reject) => {
        if (closed) { reject(new StorageFault('CLOSED')); return; }
        let tx; let failure; let result; let ready = false;
        try { tx = db.transaction(STORES, mode); } catch { reject(new StorageFault('STORAGE')); return; }
        const abort = error => {
          failure = error instanceof StorageFault ? error : new StorageFault('STORAGE');
          try { tx.abort(); } catch { reject(failure); }
        };
        const watch = (request, callback) => {
          request.onsuccess = () => { try { callback(request.result); } catch (error) { abort(error); } };
        };
        tx.oncomplete = () => failure ? reject(failure) : ready ? resolve(result) : reject(new StorageFault('STORAGE'));
        tx.onabort = () => reject(failure || new StorageFault('STORAGE'));
        tx.onerror = () => { failure ||= new StorageFault('STORAGE'); };
        try {
          const meta = tx.objectStore('metadata');
          watch(meta.get('control'), value => {
            const state = metadata(value);
            requireCondition(epoch === null || epoch === state.epoch, 'CONFLICT');
            action({rows: tx.objectStore('workspaces'), meta, state, watch, done(value) { result = value; ready = true; }});
          });
        } catch (error) { abort(error); }
      });
    }
    return {close, transaction};
  }

  async function open(indexedDB) {
    const db = await new Promise((resolve, reject) => {
      let request; let settled = false;
      const fail = code => { settled = true; reject(new StorageFault(code)); };
      try {
        if (indexedDB === undefined) indexedDB = globalThis.indexedDB;
        requireCondition(indexedDB && typeof indexedDB.open === 'function', 'STORAGE');
        request = indexedDB.open(DB_NAME, 1);
      } catch { fail('STORAGE'); return; }
      request.onupgradeneeded = () => {
        try {
          const database = request.result;
          database.createObjectStore('workspaces', {keyPath: 'id'});
          database.createObjectStore('metadata', {keyPath: 'key'}).put({key: 'control', epoch: 1, counter: 0});
        } catch { try { request.transaction.abort(); } catch {} fail('STORAGE'); }
      };
      request.onerror = () => fail('STORAGE');
      request.onblocked = () => fail('BLOCKED');
      request.onsuccess = () => { if (settled) request.result.close(); else { settled = true; resolve(request.result); } };
    });
    const client = connection(db);
    let epoch;
    try { epoch = await client.transaction('readonly', null, ({state, done}) => done(state.epoch)); }
    catch (error) { client.close(); throw error; }
    return Object.freeze({
      list() {
        return client.transaction('readonly', epoch, ({rows, watch, done}) => watch(rows.getAll(undefined, MAX_WORKSPACES + 1), values => {
          requireCondition(values.length <= MAX_WORKSPACES, 'STORAGE');
          done(values.map(value => record(value)).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
        }));
      },
      async read(id) {
        requireCondition(validId(id));
        return client.transaction('readonly', epoch, ({rows, watch, done}) => watch(rows.get(id), value => done(record(value, id))));
      },
      async save(workspace, expectedRevision) {
        requireCondition(revision(expectedRevision));
        let value;
        try { value = copyWorkspace(workspace); } catch (error) { throw error instanceof StorageFault ? error : new StorageFault('INVALID'); }
        return client.transaction('readwrite', epoch, ({rows, meta, state, watch, done}) => watch(rows.get(value.id), existing => {
          const current = record(existing, value.id);
          requireCondition((current?.revision || 0) === expectedRevision, 'CONFLICT');
          requireCondition(state.counter < Number.MAX_SAFE_INTEGER && (!current || current.revision <= state.counter), 'STORAGE');
          const write = () => {
            const saved = {id: value.id, revision: state.counter + 1, value};
            rows.put(saved);
            meta.put({...state, counter: saved.revision});
            done(saved);
          };
          if (current) write();
          else watch(rows.count(), count => { requireCondition(count < MAX_WORKSPACES, 'STORAGE'); write(); });
        }));
      },
      async remove(id, expectedRevision) {
        requireCondition(validId(id) && revision(expectedRevision));
        return client.transaction('readwrite', epoch, ({rows, watch, done}) => watch(rows.get(id), value => {
          const current = record(value, id);
          requireCondition((current?.revision || 0) === expectedRevision, 'CONFLICT');
          if (current) rows.delete(id);
          done(Boolean(current));
        }));
      },
      clear() {
        return client.transaction('readwrite', epoch, ({rows, meta, state, done}) => {
          requireCondition(state.epoch < Number.MAX_SAFE_INTEGER, 'STORAGE');
          rows.clear();
          // Retain only anonymous counters. No deleted IDs, titles or contents remain.
          meta.put({...state, epoch: state.epoch + 1});
          done(undefined);
        });
      },
      close: client.close,
    });
  }

  return Object.freeze({open});
});
