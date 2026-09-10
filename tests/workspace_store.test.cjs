'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const store = require('../demo/workspace-store.js');

// Serial transactions snapshot at start, commit atomically, and can abort after
// successful requests. This fake exercises transaction ordering, not browser APIs.
function fakeIndexedDB() {
  const tables = new Map();
  const pending = [];
  let running = false;
  let initialized = false;
  const control = {opens: [], failNextCommit: false, commits: 0};
  const copy = value => value === undefined ? undefined : structuredClone(value);
  const advance = () => {
    if (running || pending.length === 0) return;
    running = true;
    const tx = pending.shift();
    tx.start();
  };
  function transaction(names, mode) {
    const requests = [];
    let snapshot;
    let stopped = false;
    let scheduled = false;
    const finish = event => {
      if (stopped) return;
      stopped = true;
      if (event === 'complete' && mode === 'readwrite') {
        for (const name of names) tables.set(name, snapshot.get(name));
        control.commits += 1;
      }
      setImmediate(() => { tx['on' + event]?.({target: tx}); running = false; advance(); });
    };
    const pump = () => {
      if (!snapshot || stopped || scheduled) return;
      scheduled = true;
      setImmediate(() => {
        scheduled = false;
        if (stopped) return;
        const job = requests.shift();
        if (!job) {
          if (mode === 'readwrite' && control.failNextCommit) {
            control.failNextCommit = false;
            tx.error = new Error('synthetic private database error');
            finish('abort');
          } else finish('complete');
          return;
        }
        try { job.request.result = job.run(); job.request.onsuccess?.({target: job.request}); }
        catch { tx.error = new Error('synthetic private request error'); tx.onerror?.({target: tx}); finish('abort'); }
        pump();
      });
    };
    const request = run => {
      if (stopped) throw new Error('Inactive transaction');
      const result = {};
      requests.push({request: result, run});
      pump();
      return result;
    };
    const tx = {
      start() { snapshot = new Map(names.map(name => [name, new Map([...tables.get(name)].map(([id, value]) => [id, copy(value)]))])); pump(); },
      abort() { finish('abort'); },
      objectStore(name) {
        assert.ok(names.includes(name));
        return {
          get(id) { return request(() => copy(snapshot.get(name).get(id))); },
          getAll(_query, count) { return request(() => [...snapshot.get(name).values()].slice(0, count).map(copy)); },
          count() { return request(() => snapshot.get(name).size); },
          put(value) { const captured = copy(value); return request(() => { assert.equal(mode, 'readwrite'); snapshot.get(name).set(value.id || value.key, captured); return value.id || value.key; }); },
          delete(id) { return request(() => { assert.equal(mode, 'readwrite'); snapshot.get(name).delete(id); }); },
          clear() { return request(() => { assert.equal(mode, 'readwrite'); snapshot.get(name).clear(); }); },
        };
      },
    };
    pending.push(tx); queueMicrotask(advance);
    return tx;
  }
  control.open = (name, version) => {
    control.opens.push({name, version});
    const request = {};
    const db = {
      createObjectStore(name) { tables.set(name, new Map()); return {put(value) { tables.get(name).set(value.id || value.key, copy(value)); }}; },
      transaction, close() {},
    };
    setImmediate(() => {
      request.result = db;
      if (!initialized) { initialized = true; request.onupgradeneeded?.({target: request}); }
      request.onsuccess?.({target: request});
    });
    return request;
  };
  control.seed = (name, id, value) => tables.get(name).set(id, copy(value));
  return control;
}

const workspace = (id = 'workspace-1', title = 'Synthetic workspace') => ({id, title, drafts: {T1001: 'literal ${HOME} <script>inert</script>'}});

test('storage opens only explicitly and saves detached records after transaction completion', async () => {
  const idb = fakeIndexedDB();
  assert.equal(idb.opens.length, 0);
  const handle = await store.open(idb);
  assert.deepEqual(idb.opens, [{name: 'pad-workspaces-v1', version: 1}]);
  assert.deepEqual(await handle.list(), []);
  assert.equal(await handle.read('missing'), null);
  const input = workspace();
  const pending = handle.save(input, 0);
  input.title = 'Changed after save call';
  const saved = await pending;
  assert.ok(idb.commits > 0);
  assert.equal(saved.id, 'workspace-1');
  assert.equal(saved.revision, 1);
  assert.equal(saved.value.title, 'Synthetic workspace');
  saved.value.title = 'Caller changes output';
  assert.equal((await handle.read(saved.id)).value.title, 'Synthetic workspace');
  assert.equal((await handle.list()).length, 1);
  handle.close();
});

test('concurrent handles use one atomic expected-revision check with exactly one winner', async () => {
  const idb = fakeIndexedDB();
  const first = await store.open(idb); const second = await store.open(idb);
  const saved = await first.save(workspace(), 0);
  const results = await Promise.allSettled([first.save(workspace('workspace-1', 'first'), saved.revision), second.save(workspace('workspace-1', 'second'), saved.revision)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'CONFLICT');
  assert.ok((await first.read(saved.id)).revision > saved.revision);
});

test('removal cannot be reversed by stale saves and recreated IDs retain increasing revisions', async () => {
  const handle = await store.open(fakeIndexedDB());
  const first = await handle.save(workspace(), 0);
  await assert.rejects(handle.remove(first.id, first.revision + 1), {code: 'CONFLICT'});
  assert.equal(await handle.remove(first.id, first.revision), true);
  assert.equal(await handle.read(first.id), null);
  await assert.rejects(handle.save(workspace(), first.revision), {code: 'CONFLICT'});
  await assert.rejects(handle.remove(first.id, first.revision), {code: 'CONFLICT'});
  const recreated = await handle.save(workspace(), 0);
  assert.ok(recreated.revision > first.revision);
});

test('clear invalidates every existing handle including its caller and preserves monotonic revisions', async () => {
  const idb = fakeIndexedDB();
  const first = await store.open(idb); const stale = await store.open(idb);
  const saved = await first.save(workspace(), 0);
  await first.clear();
  for (const operation of [() => first.list(), () => stale.read(saved.id), () => stale.save(workspace(), 0),
    () => stale.save(workspace(), saved.revision), () => stale.remove(saved.id, saved.revision), () => stale.clear()]) {
    await assert.rejects(operation(), {code: 'CONFLICT'});
  }
  const fresh = await store.open(idb);
  assert.deepEqual(await fresh.list(), []);
  const recreated = await fresh.save(workspace(), 0);
  assert.ok(recreated.revision > saved.revision);
});

test('aborted transactions never resolve successful writes or leave partially changed state', async () => {
  const idb = fakeIndexedDB(); const handle = await store.open(idb);
  idb.failNextCommit = true;
  await assert.rejects(handle.save(workspace(), 0), error => error.code === 'STORAGE' && !error.message.includes('private'));
  assert.equal(await handle.read('workspace-1'), null);
  const saved = await handle.save(workspace(), 0);
  idb.failNextCommit = true;
  await assert.rejects(handle.clear(), {code: 'STORAGE'});
  assert.deepEqual(await handle.read(saved.id), saved);
});

test('closed and unavailable storage return safe errors without changing caller memory', async () => {
  await assert.rejects(store.open(null), {code: 'STORAGE'});
  const handle = await store.open(fakeIndexedDB());
  handle.close(); handle.close();
  await assert.rejects(handle.list(), {code: 'CLOSED'});
  await assert.rejects(handle.save(workspace(), 0), {code: 'CLOSED'});
});

test('loading the browser module does not probe storage and a denied getter is safely reported', async () => {
  let reads = 0;
  const sandbox = {TextEncoder};
  Object.defineProperty(sandbox, 'indexedDB', {get() { reads += 1; throw new Error('private origin denied'); }});
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../demo/workspace-store.js'), 'utf8'), sandbox);
  assert.equal(reads, 0);
  await assert.rejects(sandbox.PAD_WORKSPACE_STORE.open(), error => error.code === 'STORAGE' && !error.message.includes('private'));
  assert.equal(reads, 1);
});

test('invalid inputs are bounded inert JSON and cannot run accessors or serialization hooks', async () => {
  const handle = await store.open(fakeIndexedDB());
  let called = false;
  const hooked = {id: 'hooked', toJSON() { called = true; return {}; }};
  const accessor = {id: 'accessor'};
  Object.defineProperty(accessor, 'private', {get() { called = true; throw new Error('private'); }, enumerable: true});
  const cyclic = workspace(); cyclic.loop = cyclic;
  for (const value of [null, [], {id: '../path'}, {...workspace(), bytes: 'x'.repeat(5 * 1024 * 1024)},
    {...workspace(), value: new Date()}, {...workspace(), value: undefined}, {...workspace(), value: NaN},
    {...workspace(), value: new Array(1)}, hooked, accessor, cyclic]) {
    await assert.rejects(handle.save(value, 0), error => error.code === 'INVALID' && !error.message.includes('private'));
  }
  assert.equal(called, false);
  for (const value of [-1, 0.5, NaN, '0', Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(handle.save(workspace(), value), {code: 'INVALID'});
    await assert.rejects(handle.remove('workspace-1', value), {code: 'INVALID'});
  }
  assert.deepEqual(await handle.list(), []);
});

test('corrupt stored wrappers or metadata fail safely instead of being silently rewritten', async () => {
  const idb = fakeIndexedDB(); const handle = await store.open(idb);
  const saved = await handle.save(workspace(), 0);
  idb.seed('workspaces', saved.id, {...saved, private: 'do-not-echo'});
  await assert.rejects(handle.read(saved.id), error => error.code === 'STORAGE' && !error.message.includes('do-not-echo'));
  await assert.rejects(handle.list(), {code: 'STORAGE'});
  await assert.rejects(handle.save(workspace(), saved.revision), {code: 'STORAGE'});
  idb.seed('metadata', 'control', {key: 'control', epoch: -1, counter: 0});
  await assert.rejects(handle.clear(), {code: 'STORAGE'});
  await assert.rejects(store.open(idb), {code: 'STORAGE'});
});

test('clear commits before a queued stale save can create new data', async () => {
  const idb = fakeIndexedDB(); const first = await store.open(idb); const stale = await store.open(idb);
  const cleared = first.clear();
  const attempted = stale.save(workspace('new-after-clear'), 0);
  await cleared;
  await assert.rejects(attempted, {code: 'CONFLICT'});
  const fresh = await store.open(idb);
  assert.deepEqual(await fresh.list(), []);
});

// Optional real-engine checks reuse the repository's locked QA dependency and
// installed browsers. No dependency install, external page request or user profile.
if (process.env.WORKSPACE_BROWSER_TEST === '1') {
  process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(__dirname, '../work/browser-runtimes');
  const engines = require('../qa/node_modules/playwright');
  for (const name of ['chromium', 'firefox', 'webkit']) test(`native ${name} IndexedDB commits, cross-tab CAS, deletion and rollback`, async () => {
    const browser = await engines[name].launch({headless: true,
      ...(name === 'chromium' ? {executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'} : {})});
    try {
      const context = await browser.newContext();
      await context.route('**/*', route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Isolated workspace storage test</title>'}));
      const first = await context.newPage(); const second = await context.newPage();
      const source = fs.readFileSync(path.join(__dirname, '../demo/workspace-store.js'), 'utf8');
      for (const page of [first, second]) {
        await page.goto('https://workspace.example.invalid/');
        await page.addScriptTag({content: source});
        await page.evaluate(async () => { window.handle = await PAD_WORKSPACE_STORE.open(); });
      }
      const saved = await first.evaluate(() => handle.save({id: 'native-1', title: 'Synthetic native workspace'}, 0));
      const writes = await Promise.all([first, second].map((page, index) => page.evaluate(async ({revision, index}) => {
        try { const value = await handle.save({id: 'native-1', title: `Writer ${index}`}, revision); return {ok: true, revision: value.revision}; }
        catch (error) { return {ok: false, code: error.code}; }
      }, {revision: saved.revision, index})));
      assert.equal(writes.filter(value => value.ok).length, 1);
      assert.equal(writes.find(value => !value.ok).code, 'CONFLICT');
      const current = await first.evaluate(() => handle.read('native-1'));
      await first.evaluate(revision => handle.remove('native-1', revision), current.revision);
      assert.equal(await second.evaluate(async revision => {
        try { await handle.save({id: 'native-1'}, revision); return 'wrong'; } catch (error) { return error.code; }
      }, current.revision), 'CONFLICT');
      const recreated = await first.evaluate(() => handle.save({id: 'native-1'}, 0));
      assert.ok(recreated.revision > current.revision);
      // Abort after the row put succeeds: save must still reject and roll back.
      const aborted = await first.evaluate(async () => {
        const put = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
          const request = put.apply(this, args);
          if (this.name === 'workspaces') request.addEventListener('success', () => this.transaction.abort(), {once: true});
          return request;
        };
        let code;
        try { await handle.save({id: 'must-rollback'}, 0); code = 'wrong'; } catch (error) { code = error.code; }
        finally { IDBObjectStore.prototype.put = put; }
        return {code, record: await handle.read('must-rollback')};
      });
      assert.deepEqual(aborted, {code: 'STORAGE', record: null});
      await first.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('unrelated-test-database', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('keep');
        request.onerror = () => reject(new Error('Synthetic database initialization failed'));
        request.onsuccess = () => {
          const db = request.result; const tx = db.transaction('keep', 'readwrite');
          tx.objectStore('keep').put('unchanged', 'marker');
          tx.oncomplete = () => { db.close(); resolve(); };
        };
      }));
      await first.evaluate(() => handle.clear());
      for (const page of [first, second]) assert.equal(await page.evaluate(async () => {
        try { await handle.save({id: 'stale-recreation'}, 0); return 'wrong'; } catch (error) { return error.code; }
      }), 'CONFLICT');
      const afterClear = await first.evaluate(async () => {
        handle.close(); window.handle = await PAD_WORKSPACE_STORE.open();
        const records = await handle.list(); const fresh = await handle.save({id: 'native-1'}, 0);
        const untouched = await new Promise((resolve, reject) => {
          const request = indexedDB.open('unrelated-test-database', 1);
          request.onerror = () => reject(new Error('Synthetic database read failed'));
          request.onsuccess = () => {
            const db = request.result; const tx = db.transaction('keep', 'readonly');
            const read = tx.objectStore('keep').get('marker');
            tx.oncomplete = () => { const result = read.result; db.close(); resolve(result); };
          };
        });
        return {records, revision: fresh.revision, untouched};
      });
      assert.deepEqual(afterClear.records, []);
      assert.ok(afterClear.revision > recreated.revision);
      assert.equal(afterClear.untouched, 'unchanged');
    } finally { await browser.close(); }
  });
}
