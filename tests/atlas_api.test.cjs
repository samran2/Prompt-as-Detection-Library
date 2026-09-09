'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');

const atlasTechniques = [
  {
    framework: 'ATLAS', domain: 'ATLAS', atlasVersion: 'test-fixture',
    id: 'AML.T0051', name: 'LLM Prompt Injection', kind: 'technique',
    parentId: null, parentName: null, tactics: ['Execution'], platforms: [],
    behavior: 'Untrusted source text <script>literal</script>.',
    sourceUrl: 'https://atlas.mitre.org/techniques/AML.T0051',
    references: [], sourceMaturity: 'demonstrated', caseStudies: [], mitigations: [],
    telemetry: [], strategies: [], procedureCount: 0, procedureExamples: [],
  },
  {
    framework: 'ATLAS', domain: 'ATLAS', atlasVersion: 'test-fixture',
    id: 'AML.T0051.001', name: 'Indirect', kind: 'subtechnique',
    parentId: 'AML.T0051', parentName: 'LLM Prompt Injection', tactics: ['Execution'], platforms: [],
    behavior: 'An inert subtechnique fixture.',
    sourceUrl: 'https://atlas.mitre.org/techniques/AML.T0051.001',
    references: [], sourceMaturity: 'feasible', caseStudies: [], mitigations: [],
    telemetry: [], strategies: [], procedureCount: 0, procedureExamples: [],
  },
];

async function catalogs() {
  const core = await import('../packages/core/src/research-catalog.mjs');
  const atlasCatalog = core.createAtlasResearchCatalog({
    techniques: atlasTechniques,
    prompts: atlasTechniques.map(record => ({
      id: record.id, techniqueId: record.id, framework: 'ATLAS', domain: 'ATLAS',
      atlasVersion: record.atlasVersion, status: 'generated', text: `DRAFT ${record.id}`,
    })),
    version: {id: 'atlas-test-fixture', framework: 'ATLAS', atlasVersion: 'test-fixture', status: 'pinned'},
  });
  const catalog = core.createResearchCatalog({
    techniques: [{
      id: 'T1001', name: 'ATT&CK fixture', domain: 'Enterprise', kind: 'technique',
      tactics: [], platforms: [], attackVersion: '19.2', stixId: 'attack-pattern--fixture',
      parentId: null, sourceUrl: 'https://attack.mitre.org/techniques/T1001', behavior: 'Fixture.', telemetry: [],
    }],
    prompts: [{id: 'T1001', techniqueId: 'T1001', domain: 'Enterprise', status: 'generated', text: 'ATT&CK draft'}],
    version: {id: 'attack-19.2', status: 'pinned'},
  });
  return {core, catalog, atlasCatalog};
}

async function withApi(fn) {
  const {catalog, atlasCatalog} = await catalogs();
  const {createResearchApiHandler} = await import('../apps/research-api/src/handler.mjs');
  const server = createServer(createResearchApiHandler({catalog, atlasCatalog}));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}`, {catalog, atlasCatalog});
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('ATLAS catalogs preserve their own identity and keep source maturity separate from generated status', async () => {
  const {atlasCatalog} = await catalogs();
  const item = atlasCatalog.indexes.techniques.get('AML.T0051');
  assert.equal(item.framework, 'ATLAS');
  assert.equal(item.atlasVersion, 'test-fixture');
  assert.equal(item.sourceMaturity, 'demonstrated');
  assert.equal(Object.hasOwn(item, 'attackVersion'), false);
  assert.equal(Object.hasOwn(item, 'stixId'), false);
  assert.equal(atlasCatalog.indexes.prompts.get(item.id).status, 'generated');
  assert.ok(atlasCatalog.collections.relationships.some(relation => relation.type === 'subtechnique-of'
    && relation.source.id === 'AML.T0051.001' && relation.target.id === 'AML.T0051'));
});

test('ATLAS API is additive and exposes literal source text, exact prompts and scoped search links', async () => {
  await withApi(async (base, {catalog}) => {
    const legacy = await (await fetch(`${base}/v1/techniques`)).json();
    assert.deepEqual(legacy.data, catalog.collections.techniques);
    assert.equal(legacy.meta.snapshotHash, catalog.snapshotHash);
    const item = await (await fetch(`${base}/v1/atlas/techniques/AML.T0051`)).json();
    assert.equal(item.data.behavior, atlasTechniques[0].behavior);
    const prompt = await (await fetch(`${base}/v1/atlas/prompts?techniqueId=AML.T0051`)).json();
    assert.equal(prompt.data.length, 1);
    assert.equal(prompt.data[0].text, 'DRAFT AML.T0051');
    assert.equal(prompt.data[0].framework, 'ATLAS');
    const search = await (await fetch(`${base}/v1/atlas/search?q=Injection&resourceType=technique`)).json();
    assert.deepEqual(search.data.map(record => record.resourceId), ['AML.T0051', 'AML.T0051.001']);
    assert.ok(search.data.every(record => record.href.startsWith('/v1/atlas/techniques/')));
    for (const collection of ['versions', 'relationships', 'rules', 'validations']) {
      const response = await fetch(`${base}/v1/atlas/${collection}`);
      assert.equal(response.status, 200, collection);
      if (['rules', 'validations'].includes(collection)) assert.deepEqual((await response.json()).data, []);
    }
    assert.equal((await fetch(`${base}/v1/techniques/AML.T0051`)).status, 404);
    assert.equal((await fetch(`${base}/v1/atlas/techniques/T1001`)).status, 404);
  });
});

test('ATLAS cursors, ETags and input limits retain the read-only API boundaries', async () => {
  await withApi(async base => {
    const first = await fetch(`${base}/v1/atlas/techniques?pageSize=1`);
    assert.equal(first.status, 200);
    const body = await first.json();
    const cursor = encodeURIComponent(body.meta.nextCursor);
    const second = await (await fetch(`${base}/v1/atlas/techniques?pageSize=1&cursor=${cursor}`)).json();
    assert.equal(second.data[0].id, 'AML.T0051.001');
    for (const route of [
      `/v1/techniques?pageSize=1&cursor=${cursor}`,
      `/v1/atlas/prompts?pageSize=1&cursor=${cursor}`,
      '/v1/atlas/prompts?techniqueId=T1001',
      '/v1/atlas/techniques?domain=Enterprise',
      '/v1/atlas/techniques?pageSize=101',
      '/v1/atlas/techniques?domain=ATLAS&domain=ATLAS',
      '/v1/atlas/techniques?unknown=value',
    ]) assert.equal((await fetch(base + route)).status, 400, route);
    const cached = await fetch(`${base}/v1/atlas/techniques?pageSize=1`, {headers: {'If-None-Match': first.headers.get('etag')}});
    assert.equal(cached.status, 304);
    const head = await fetch(`${base}/v1/atlas/techniques/AML.T0051`, {method: 'HEAD'});
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await head.text(), '');
    assert.equal((await fetch(`${base}/v1/atlas/prompts`, {method: 'POST', body: 'private-context'})).status, 405);
    assert.equal((await fetch(`${base}/v1/atlas/prompts/%2e%2e%2fprivate`)).status, 404);
  });
});

function adapterFixture() {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pad-atlas-api-'));
  const generatedFiles = [];
  const write = (relative, value, generated = false) => {
    const filename = path.join(root, relative);
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    fs.writeFileSync(filename, text);
    const entry = {path: relative, bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex')};
    if (generated) generatedFiles.push(entry);
    return entry;
  };
  write('package.json', {version: 'test-fixture'});
  const sourceManifest = write('sources/atlas-2026.08/manifest.json', {
    contentVersion: 'test-fixture', formatVersion: '6.0.0', requestedRelease: 'test-fixture',
    tag: {commitSha: 'a'.repeat(40)},
  });
  write('content/atlas/catalog.json', atlasTechniques, true);
  const records = atlasTechniques.map(record => ({
    id: record.id, techniqueId: record.id, framework: 'ATLAS', domain: 'ATLAS',
    atlasVersion: record.atlasVersion, status: 'generated',
    prompt: write(`content/atlas/prompts/${record.id}.txt`, `DRAFT ${record.id}`, true),
  }));
  write('content/atlas/index.json', {records}, true);
  const coverage = {
    framework: 'ATLAS', atlasVersion: 'test-fixture', sourceCommit: 'a'.repeat(40), sourceManifest, generatedFiles,
  };
  write('content/atlas/coverage.json', coverage);
  return {root, coverage, records, write};
}

test('ATLAS adapter verifies the catalog and exact prompt bytes against generated source provenance', async () => {
  const {loadAtlasResearchCatalog} = await import('../apps/research-api/src/catalog-adapter.mjs');
  const {root} = adapterFixture();
  try {
    const catalog = loadAtlasResearchCatalog({root});
    assert.equal(catalog.collections.techniques.length, 2);
    assert.equal(catalog.indexes.prompts.get('AML.T0051').text, 'DRAFT AML.T0051');
    assert.equal(catalog.indexes.prompts.get('AML.T0051').metadata.status, 'generated');
    const version = catalog.collections.versions[0];
    const manifest = fs.readFileSync(path.join(root, 'sources/atlas-2026.08/manifest.json'));
    assert.equal(version.sourceManifestHash, `sha256:${createHash('sha256').update(manifest).digest('hex')}`);
    assert.equal(version.atlasVersion, 'test-fixture');
    assert.equal(Object.hasOwn(version, 'attackVersion'), false);

    fs.appendFileSync(path.join(root, 'content/atlas/prompts/AML.T0051.txt'), '\n');
    assert.throws(() => loadAtlasResearchCatalog({root}), /bytes do not match/i);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('ATLAS adapter rejects catalog corruption, noncanonical prompt paths and forged maturity claims', async () => {
  const {loadAtlasResearchCatalog} = await import('../apps/research-api/src/catalog-adapter.mjs');
  assert.equal(typeof loadAtlasResearchCatalog, 'function');
  for (const change of ['catalog', 'path', 'status', 'commit', 'manifest']) {
    const {root, records, coverage, write} = adapterFixture();
    try {
      if (change === 'catalog') fs.appendFileSync(path.join(root, 'content/atlas/catalog.json'), ' ');
      if (change === 'path' || change === 'status') {
        if (change === 'path') records[0].prompt.path = '../private.txt';
        if (change === 'status') records[0].status = 'field-confirmed';
        const updated = write('content/atlas/index.json', {records});
        coverage.generatedFiles = coverage.generatedFiles.map(file => file.path === updated.path ? updated : file);
        write('content/atlas/coverage.json', coverage);
      }
      if (change === 'commit') write('content/atlas/coverage.json', {...coverage, sourceCommit: 'b'.repeat(40)});
      if (change === 'manifest') fs.appendFileSync(path.join(root, 'sources/atlas-2026.08/manifest.json'), ' ');
      assert.throws(() => loadAtlasResearchCatalog({root}), /ATLAS/i, change);
    } finally {
      fs.rmSync(root, {recursive: true, force: true});
    }
  }
});

test('the checked-in ATLAS adapter serves all pinned AI prompts with exact file hashes', async () => {
  const {loadAtlasResearchCatalog} = await import('../apps/research-api/src/catalog-adapter.mjs');
  const root = path.resolve(__dirname, '..');
  const catalog = loadAtlasResearchCatalog({root});
  const source = JSON.parse(fs.readFileSync(path.join(root, 'content/atlas/catalog.json'), 'utf8'));
  assert.equal(source.length, 197);
  assert.equal(catalog.collections.techniques.length, source.length);
  assert.equal(catalog.collections.prompts.length, source.length);
  for (const item of catalog.collections.prompts) {
    const bytes = fs.readFileSync(path.join(root, `content/atlas/prompts/${item.id}.txt`));
    assert.equal(item.promptSha256, createHash('sha256').update(bytes).digest('hex'), item.id);
    assert.equal(item.text, bytes.toString('utf8'), item.id);
    assert.equal(item.status, 'generated');
  }
  assert.equal(catalog.collections.versions[0].sourceCommit, '41d4f5ca4112f0e492ffaa3ebff07dc80a75afa5');
  assert.deepEqual(catalog.collections.rules, []);
  assert.deepEqual(catalog.collections.validations, []);
});
