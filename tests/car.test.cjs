'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const generator = require('../scripts/build_car_catalog.cjs');
const car = require('../demo/car.js');
const root = path.resolve(__dirname, '..');

test('CAR preserves all pinned analytics and exact active source joins', () => {
  const source = generator.loadSources(root);
  const catalog = generator.createCatalog(source, require('../demo/catalog.js'));
  assert.equal(source.analytics.length, 102);
  assert.equal(catalog.analytics.length, 102);
  const library = car.createLibrary(catalog);
  const powerShell = library.lookup('T1059.001').analytics.find(row => row.id === 'CAR-2014-04-003');
  assert.ok(powerShell);
  assert.equal(powerShell.hypothesis, source.analytics.find(row => row.data.id === powerShell.id).data.description);
  assert.deepEqual(powerShell.telemetry, ['process/create/exe', 'process/create/parent_exe']);
  assert.match(powerShell.pseudocode[0].code, /parent_exe != "explorer.exe"/);
  assert.equal(powerShell.license, 'Apache-2.0');
  assert.equal(powerShell.status, 'upstream-research');
  assert.ok(library.lookup('T1059').analytics.some(row => row.id === powerShell.id));
  assert.ok(!library.lookup('T1059.002').analytics.some(row => row.id === powerShell.id));
  assert.deepEqual(library.lookup('T0800').analytics, []);
  assert.deepEqual(library.lookup('AML.T0051').analytics, []);
  assert.deepEqual(library.lookup('T9999').analytics, []);
  assert.ok(catalog.excludedTechniqueIds.length > 0);
});

test('CAR caller boundaries reject invalid IDs, malformed catalogs and unsafe source links', () => {
  const catalog = generator.createCatalog(generator.loadSources(root), require('../demo/catalog.js'));
  const library = car.createLibrary(catalog);
  for (const value of [null, {}, '', '../T1059', 'T1059 '.repeat(1000), '<script>']) {
    assert.throws(() => library.lookup(value), /technique/i);
  }
  assert.throws(() => car.createLibrary(null), /catalog/i);
  const unsafe = structuredClone(catalog);
  unsafe.analytics[0].sourceUrl = 'javascript:alert(1)';
  assert.throws(() => car.createLibrary(unsafe), /source/i);
  const duplicate = structuredClone(catalog);
  duplicate.analytics.push(duplicate.analytics[0]);
  assert.throws(() => car.createLibrary(duplicate), /duplicate/i);
  const claimed = structuredClone(catalog);
  claimed.analytics[0].status = 'lab-validated';
  assert.throws(() => car.createLibrary(claimed), /status/i);
});

test('CAR lookup snapshots are immutable and exports preserve complete notices', () => {
  const catalog = generator.createCatalog(generator.loadSources(root), require('../demo/catalog.js'));
  const library = car.createLibrary(catalog);
  catalog.analytics.length = 0;
  const result = library.lookup('T1059.001');
  assert.ok(result.analytics.length);
  assert.ok(Object.isFrozen(result.analytics[0]));
  assert.equal(result.sourceNotice, fs.readFileSync(path.join(root, generator.SOURCE_DIRECTORY, 'raw/NOTICE.txt'), 'utf8'));
  assert.equal(result.sourceLicense, fs.readFileSync(path.join(root, generator.SOURCE_DIRECTORY, 'raw/LICENSE.txt'), 'utf8'));
  assert.match(result.warning, /not locally validated/);
});

test('CAR generated browser data verifies deterministically without YAML runtime dependencies', () => {
  const {catalog, text} = generator.expectedOutput(root);
  assert.equal(fs.readFileSync(path.join(root, 'demo/car-catalog.js'), 'utf8'), text);
  const context = vm.createContext({});
  vm.runInContext(text, context, {timeout: 2000});
  vm.runInContext(fs.readFileSync(path.join(root, 'demo/car.js'), 'utf8'), context, {timeout: 2000});
  assert.deepEqual(JSON.parse(JSON.stringify(context.PAD_CAR_CATALOG)), catalog);
  assert.ok(context.PAD_CAR.createLibrary(context.PAD_CAR_CATALOG).lookup('T1059.001').analytics.length);
  assert.ok(!text.includes('</script'));
});

test('CAR projection retains source descriptions, pseudocode, telemetry and coverage without fabricated fields', () => {
  const source = generator.loadSources(root);
  const catalog = generator.createCatalog(source, require('../demo/catalog.js'));
  assert.equal(new Set(catalog.analytics.flatMap(row => row.techniqueIds)).size, 117);
  assert.equal(catalog.analytics.filter(row => row.pseudocode.length).length, 91);
  for (const row of source.analytics) {
    const projected = catalog.analytics.find(item => item.id === row.data.id);
    assert.equal(projected.sourceSha256, row.sha256);
    assert.equal(projected.hypothesis, row.data.description);
    assert.deepEqual(projected.coverage, row.data.coverage || []);
    assert.deepEqual(projected.telemetry, row.data.data_model_references || []);
    const pseudocode = (row.data.implementations || []).filter(item => ['pseudocode', 'psuedocode'].includes(item.type.toLowerCase()));
    assert.deepEqual(projected.pseudocode.map(item => item.code), pseudocode.map(item => item.code || ''));
    assert.equal(Object.hasOwn(projected, 'unit_tests'), false);
    assert.equal(Object.hasOwn(projected, 'true_positives'), false);
  }
  const literal = structuredClone(catalog);
  literal.analytics[0].hypothesis = '<script>throw new Error("untrusted")</script> ${API_KEY}';
  assert.equal(car.createLibrary(literal).lookup(literal.analytics[0].techniqueIds[0]).analytics[0].hypothesis, literal.analytics[0].hypothesis);
});

test('CAR source verification rejects tampered data, extra files and symlink paths', t => {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pad-car-source-test-')));
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  const target = path.join(temporary, generator.SOURCE_DIRECTORY);
  fs.cpSync(path.join(root, generator.SOURCE_DIRECTORY), target, {recursive: true});
  fs.appendFileSync(path.join(target, 'derived/analytics.json'), ' ');
  assert.throws(() => generator.loadSources(temporary), /integrity/);
  fs.copyFileSync(path.join(root, generator.SOURCE_DIRECTORY, 'derived/analytics.json'), path.join(target, 'derived/analytics.json'));
  fs.writeFileSync(path.join(target, 'private.txt'), 'must not enter projection');
  assert.throws(() => generator.loadSources(temporary), /Unexpected/);
  fs.unlinkSync(path.join(target, 'private.txt'));
  fs.unlinkSync(path.join(target, 'raw/NOTICE.txt'));
  fs.symlinkSync(path.join(root, generator.SOURCE_DIRECTORY, 'raw/NOTICE.txt'), path.join(target, 'raw/NOTICE.txt'));
  assert.throws(() => generator.loadSources(temporary), /symbolic link/);
});

test('CAR rejects invalid projection inputs and no inherited subtechnique matches are synthesized', () => {
  const source = generator.loadSources(root);
  const local = require('../demo/catalog.js');
  assert.throws(() => generator.createCatalog(source, [...local, local[0]]), /Duplicate/);
  const invalid = structuredClone(source);
  invalid.analytics[0].data.coverage[0].technique = 'javascript:alert(1)';
  assert.throws(() => generator.createCatalog(invalid, local), /technique/);
  const single = structuredClone(source);
  single.analytics = single.analytics.filter(row => row.data.id === 'CAR-2014-04-003');
  single.analytics[0].data.coverage = [{technique: 'T1059', tactics: ['TA0002'], coverage: 'High'}];
  const library = car.createLibrary(generator.createCatalog(single, local));
  assert.equal(library.lookup('T1059').analytics.length, 1);
  assert.equal(library.lookup('T1059.001').analytics.length, 0);
});
