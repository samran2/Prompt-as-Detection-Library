'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createServer} = require('node:http');
const {pathToFileURL} = require('node:url');

const ROOT = path.resolve(__dirname, '..');

const techniqueFixtures = [
  {
    id: 'T1001', name: 'Data Obfuscation', domain: 'Enterprise', kind: 'technique',
    tactics: ['Command and Control'], platforms: ['Linux'], attackVersion: '19.2',
    stixId: 'attack-pattern--one', parentId: null, sourceUrl: 'https://attack.mitre.org/techniques/T1001',
    behavior: 'Obfuscate command and control traffic.', telemetry: ['Network Traffic Content'],
  },
  {
    id: 'T1002', name: 'Data Compressed', domain: 'Enterprise', kind: 'technique',
    tactics: ['Exfiltration'], platforms: ['Windows'], attackVersion: '19.2',
    stixId: 'attack-pattern--two', parentId: null, sourceUrl: 'https://attack.mitre.org/techniques/T1002',
    behavior: 'Compress collected data.', telemetry: ['File Creation'],
  },
  {
    id: 'T1003', name: 'OS Credential Dumping', domain: 'Enterprise', kind: 'technique',
    tactics: ['Credential Access'], platforms: ['Windows'], attackVersion: '19.2',
    stixId: 'attack-pattern--three', parentId: null, sourceUrl: 'https://attack.mitre.org/techniques/T1003',
    behavior: 'Dump credentials.', telemetry: ['Process Access'],
  },
];

async function apiModules() {
  const core = await import(pathToFileURL(path.join(ROOT, 'packages', 'core', 'src', 'research-catalog.mjs')));
  const api = await import(pathToFileURL(path.join(ROOT, 'apps', 'research-api', 'src', 'handler.mjs')));
  const client = await import(pathToFileURL(path.join(ROOT, 'packages', 'clients', 'src', 'research-api-client.mjs')));
  return {core, api, client};
}

async function withApi(fn) {
  const {core, api, client} = await apiModules();
  const catalog = core.createResearchCatalog({
    techniques: techniqueFixtures,
    prompts: techniqueFixtures.map(item => ({
      id: item.id,
      techniqueId: item.id,
      domain: item.domain,
      status: 'generated',
      text: `DETECTION PROMPT ${item.id} ${item.name}`,
    })),
    rules: [],
    validations: [],
    version: {
      id: 'attack-19.2',
      attackVersion: '19.2',
      libraryVersion: '0.4.0-dev.1',
      status: 'pinned',
      sourceCommit: '6cda5ad8462c79e14fbb872f4e09059b18e0cfc4',
    },
  });
  const server = createServer(api.createResearchApiHandler({catalog}));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await fn({baseUrl, client});
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

async function json(response) {
  return JSON.parse(await response.text());
}

test('OpenAPI 3.1 documents every read-only v1 collection and shared response contract', () => {
  const contract = fs.readFileSync(path.join(ROOT, 'apps', 'research-api', 'openapi.yaml'), 'utf8');
  assert.match(contract, /^openapi: 3\.1\.0$/m);
  for (const resource of ['techniques', 'prompts', 'rules', 'validations', 'versions', 'relationships', 'search']) {
    assert.match(contract, new RegExp(`^  /v1/${resource}:$`, 'm'), resource);
  }
  assert.match(contract, /If-None-Match/);
  assert.match(contract, /ETag/);
  assert.match(contract, /nextCursor/);
  assert.match(contract, /contentHash/);
  assert.match(contract, /ErrorEnvelope/);
  assert.match(contract, /enum: \[Enterprise, Mobile, ICS, OT, OperationalTechnology, Operational-Technology, Operational_Technology, 'Operational Technology'\]/);
  assert.match(contract, /Compatibility metadata copied from content\/prompts\/index\.json/);
  assert.doesNotMatch(contract, /Metadata conforming to packages\/schemas\/v1\/prompt-metadata\.schema\.json/);
  assert.doesNotMatch(contract, /^\s+(post|put|patch|delete):/m);
});

test('technique pagination is deterministic and supports conditional ETags', async t => {
  await withApi(async ({baseUrl}) => {
    const firstResponse = await fetch(`${baseUrl}/v1/techniques?pageSize=2`);
    assert.equal(firstResponse.status, 200);
    assert.equal(firstResponse.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    assert.match(firstResponse.headers.get('etag'), /^"[a-f0-9]{64}"$/);
    const first = await json(firstResponse);
    assert.deepEqual(first.data.map(item => item.id), ['T1001', 'T1002']);
    assert.equal(first.meta.pageSize, 2);
    assert.equal(first.meta.totalItems, 3);
    assert.match(first.meta.nextCursor, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    assert.ok(first.data.every(item => /^sha256:[a-f0-9]{64}$/.test(item.contentHash)));

    const secondResponse = await fetch(`${baseUrl}/v1/techniques?pageSize=2&cursor=${encodeURIComponent(first.meta.nextCursor)}`);
    assert.equal(secondResponse.status, 200);
    const second = await json(secondResponse);
    assert.deepEqual(second.data.map(item => item.id), ['T1003']);
    assert.equal(second.meta.nextCursor, null);

    const notModified = await fetch(`${baseUrl}/v1/techniques?pageSize=2`, {
      headers: {'If-None-Match': firstResponse.headers.get('etag')},
    });
    assert.equal(notModified.status, 304);
    assert.equal(await notModified.text(), '');
  }, t);
});

test('cursors reject tampering and cannot be replayed against changed filters', async t => {
  await withApi(async ({baseUrl}) => {
    const response = await fetch(`${baseUrl}/v1/techniques?pageSize=1&domain=Enterprise`);
    const body = await json(response);
    const cursor = body.meta.nextCursor;
    const changed = `${cursor.slice(0, -1)}${cursor.endsWith('A') ? 'B' : 'A'}`;

    for (const url of [
      `${baseUrl}/v1/techniques?pageSize=1&domain=Enterprise&cursor=${encodeURIComponent(changed)}`,
      `${baseUrl}/v1/techniques?pageSize=1&domain=Mobile&cursor=${encodeURIComponent(cursor)}`,
    ]) {
      const invalid = await fetch(url);
      assert.equal(invalid.status, 400);
      const error = await json(invalid);
      assert.deepEqual(Object.keys(error), ['error']);
      assert.equal(error.error.code, 'invalid_cursor');
      assert.equal(typeof error.error.message, 'string');
      assert.doesNotMatch(JSON.stringify(error), /research-catalog|publication-repository|at file:/i);
    }
}, t);
});

test('the API rejects unbounded, duplicate, unknown and malformed inputs', async t => {
  await withApi(async ({baseUrl}) => {
    const urls = [
      '/v1/techniques?pageSize=0',
      '/v1/techniques?pageSize=101',
      '/v1/techniques?pageSize=1.5',
      '/v1/techniques?pageSize=01',
      '/v1/techniques?pageSize=2&pageSize=3',
      '/v1/techniques?unexpected=true',
      '/v1/techniques?domain=enterprise',
      '/v1/techniques?kind=parent',
      '/v1/prompts?techniqueId=not-an-id',
      '/v1/rules?backend=made-up',
      `/v1/search?q=${'x'.repeat(257)}`,
      '/v1/search?q=%20%20',
      '/v1/search?q=data&resourceType=version',
    ];
    for (const pathname of urls) {
      const response = await fetch(baseUrl + pathname);
      assert.equal(response.status, 400, pathname);
      assert.equal((await json(response)).error.code, 'invalid_request', pathname);
    }
}, t);
});

test('the API normalizes OT aliases to the canonical ICS domain before filtering', async t => {
  await withApi(async ({baseUrl}) => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/v1/techniques?domain=OT`),
      fetch(`${baseUrl}/v1/techniques?domain=OperationalTechnology`),
      fetch(`${baseUrl}/v1/techniques?domain=Operational-Technology`),
      fetch(`${baseUrl}/v1/techniques?domain=ICS`),
      fetch(`${baseUrl}/v1/search?q=Data&domain=OT&pageSize=50`),
    ]);
    for (const response of responses.slice(0, 4)) assert.equal(response.status, 200);
    const normalized = await Promise.all(responses.slice(0, 4).map(json));
    assert.deepEqual(normalized[0].data, normalized[1].data);
    assert.deepEqual(normalized[0].data, normalized[2].data);
    assert.deepEqual(normalized[0].data, normalized[3].data);
    assert.deepEqual(normalized[0].meta, normalized[1].meta);
    assert.deepEqual(normalized[0].meta, normalized[2].meta);
    assert.deepEqual(normalized[0].meta, normalized[3].meta);

    const search = await json(responses[4]);
    assert.equal(responses[4].status, 200);
    assert.deepEqual(search.data, []);
}, t);
});

test('all public resources are present and unresolved evidence collections remain honestly empty', async t => {
  await withApi(async ({baseUrl}) => {
    for (const resource of ['techniques', 'prompts', 'rules', 'validations', 'versions', 'relationships']) {
      const response = await fetch(`${baseUrl}/v1/${resource}`);
      assert.equal(response.status, 200, resource);
      const body = await json(response);
      assert.ok(Array.isArray(body.data), resource);
      assert.equal(typeof body.meta.snapshotHash, 'string', resource);
    }
    const rules = await json(await fetch(`${baseUrl}/v1/rules`));
    const validations = await json(await fetch(`${baseUrl}/v1/validations`));
    assert.deepEqual(rules.data, []);
    assert.deepEqual(validations.data, []);
    assert.equal(rules.meta.totalItems, 0);
    assert.equal(validations.meta.totalItems, 0);

    const technique = await json(await fetch(`${baseUrl}/v1/techniques/T1001`));
    assert.equal(technique.data.id, 'T1001');
    const prompt = await json(await fetch(`${baseUrl}/v1/prompts/T1001`));
    assert.match(prompt.data.text, /DETECTION PROMPT T1001/);
    const version = await json(await fetch(`${baseUrl}/v1/versions/attack-19.2`));
    assert.equal(version.data.status, 'pinned');

    const search = await json(await fetch(`${baseUrl}/v1/search?q=credential&pageSize=10`));
    assert.ok(search.data.some(result => result.resourceType === 'technique' && result.resourceId === 'T1003'));
}, t);
});

test('non-read methods, unknown resources and malformed paths return bounded generic errors', async t => {
  await withApi(async ({baseUrl}) => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const response = await fetch(`${baseUrl}/v1/techniques`, {method, body: method === 'POST' ? '{"secret":"do-not-echo"}' : undefined});
      assert.equal(response.status, 405, method);
      assert.equal(response.headers.get('allow'), 'GET, HEAD');
      const raw = await response.text();
      assert.equal(JSON.parse(raw).error.code, 'method_not_allowed');
      assert.doesNotMatch(raw, /do-not-echo|publication-repository|stack/i);
    }

    const missing = await fetch(`${baseUrl}/v1/techniques/%2e%2e%2fprivate-key`);
    assert.equal(missing.status, 404);
    assert.equal((await json(missing)).error.code, 'not_found');
}, t);
});

test('HEAD exposes validators and security headers without a response body', async t => {
  await withApi(async ({baseUrl}) => {
    const response = await fetch(`${baseUrl}/v1/techniques/T1001`, {method: 'HEAD'});
    assert.equal(response.status, 200);
    assert.match(response.headers.get('etag'), /^"[a-f0-9]{64}"$/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('content-security-policy'), "default-src 'none'; frame-ancestors 'none'");
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(await response.text(), '');
}, t);
});

test('the zero-dependency client follows the same contract and caches validators explicitly', async t => {
  await withApi(async ({baseUrl, client}) => {
    const api = client.createResearchApiClient({baseUrl});
    const first = await api.listTechniques({pageSize: 2});
    assert.equal(first.status, 200);
    assert.equal(first.body.data.length, 2);
    assert.match(first.etag, /^"[a-f0-9]{64}"$/);

    const cached = await api.listTechniques({pageSize: 2, ifNoneMatch: first.etag});
    assert.equal(cached.status, 304);
    assert.equal(cached.body, null);

    const one = await api.getTechnique('T1001');
    assert.equal(one.body.data.id, 'T1001');
    await assert.rejects(() => api.getTechnique('../secrets'), /valid ATT&CK technique ID/i);
}, t);
});

test('the client stops consuming a chunked response when the decoded body exceeds its limit', async () => {
  const {client} = await apiModules();
  const chunk = new Uint8Array(256 * 1024).fill(0x61);
  let pulls = 0;
  let canceled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulls += 1;
      if (pulls > 100) controller.close();
      else controller.enqueue(chunk);
    },
    cancel() {
      canceled = true;
    },
  });
  const api = client.createResearchApiClient({
    baseUrl: 'https://research.example',
    fetch: async () => new Response(body, {headers: {'content-type': 'application/json'}}),
  });

  await assert.rejects(() => api.listTechniques(), error => {
    assert.equal(error.code, 'response_too_large');
    return true;
  });
  assert.equal(canceled, true);
  assert.ok(pulls < 100, `expected early cancellation, consumed ${pulls} chunks`);
});

test('the local adapter exposes all pinned prompts and hashes the exact source manifest bytes', async () => {
  const {loadResearchCatalog} = await import(pathToFileURL(path.join(ROOT, 'apps', 'research-api', 'src', 'catalog-adapter.mjs')));
  const catalog = loadResearchCatalog({root: ROOT});
  assert.equal(catalog.collections.techniques.length, 918);
  assert.equal(catalog.collections.prompts.length, 918);
  assert.equal(catalog.collections.rules.length, 0);
  assert.equal(catalog.collections.validations.length, 0);
  const prompt = catalog.indexes.prompts.get('T1001');
  assert.equal(prompt.status, 'generated');
  assert.equal(prompt.metadata.attackVersion, '19.2');
  assert.match(prompt.text, /^DETECTION PROMPT/m);
  assert.equal(prompt.promptSha256, prompt.metadata.prompt.sha256);

  const manifestBytes = fs.readFileSync(path.join(ROOT, 'sources', 'attack-19.2', 'manifest.json'));
  const expected = require('node:crypto').createHash('sha256').update(manifestBytes).digest('hex');
  assert.equal(catalog.indexes.versions.get('attack-19.2').sourceManifestHash, `sha256:${expected}`);
});

test('catalog construction snapshots nested metadata instead of retaining mutable caller objects', async () => {
  const {createResearchCatalog} = await import(pathToFileURL(path.join(ROOT, 'packages', 'core', 'src', 'research-catalog.mjs')));
  const metadata = {lifecycle: {status: 'generated'}, reviewers: []};
  const catalog = createResearchCatalog({
    techniques: [techniqueFixtures[0]],
    prompts: [{id: 'T1001', techniqueId: 'T1001', domain: 'Enterprise', status: 'generated', text: 'prompt', metadata}],
    version: {id: 'attack-19.2', status: 'pinned'},
  });
  metadata.lifecycle.status = 'field-confirmed';
  metadata.reviewers.push('invented-reviewer');
  const stored = catalog.indexes.prompts.get('T1001').metadata;
  assert.equal(stored.lifecycle.status, 'generated');
  assert.deepEqual(stored.reviewers, []);
  assert.equal(Object.isFrozen(stored), true);
  assert.equal(Object.isFrozen(stored.lifecycle), true);
  assert.equal(Object.isFrozen(stored.reviewers), true);
  assert.equal(typeof catalog.indexes.prompts.set, 'undefined');
  assert.equal(typeof catalog.indexes.prompts.delete, 'undefined');
  assert.equal(typeof catalog.indexes.prompts.clear, 'undefined');
});
