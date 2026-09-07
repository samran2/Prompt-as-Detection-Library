'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const generator = require('../scripts/build_library.cjs');
const root = path.resolve(__dirname, '..');

test('path prefixes preserve a Windows drive root exactly once', () => {
  assert.deepEqual(generator.pathPrefixes('C:\\project\\sources\\..\\library\\coverage.json', path.win32), [
    'C:\\project', 'C:\\project\\library', 'C:\\project\\library\\coverage.json',
  ]);
  assert.deepEqual(generator.pathPrefixes('C:\\', path.win32), []);
});

test('path prefixes preserve a Windows UNC share root exactly once', () => {
  assert.deepEqual(generator.pathPrefixes('\\\\server\\share\\project\\catalog.js', path.win32), [
    '\\\\server\\share\\project', '\\\\server\\share\\project\\catalog.js',
  ]);
});

test('native and POSIX path prefixes retain parent-to-leaf inspection order', () => {
  assert.deepEqual(generator.pathPrefixes('/project/sources/../library/coverage.json', path.posix), [
    '/project', '/project/library', '/project/library/coverage.json',
  ]);
  const absolute = path.join(root, 'library', 'coverage.json');
  const prefixes = generator.pathPrefixes(absolute);
  assert.equal(prefixes.at(-1), absolute);
  for (let index = 1; index < prefixes.length; index++) assert.equal(path.dirname(prefixes[index]), prefixes[index - 1]);
});

function temporaryRoot(t) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pad-generator-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('pinned sources and converted records meet the exact release counts', () => {
  const loaded = generator.loadSources(root);
  const result = generator.convertBundles(loaded.bundles);
  assert.equal(result.records.length, 918);
  assert.equal(result.procedures.length, 18885);
  assert.equal(result.excludedTechniques.length, 248);
  assert.deepEqual(['Enterprise', 'Mobile', 'ICS'].map(domain => result.records.filter(record => record.domain === domain).length), [697, 124, 97]);
  assert.equal(result.records.filter(record => record.kind === 'subtechnique').length, 540);
  assert.equal(result.records.filter(record => !record.platforms.length).length, 24);
  assert.equal(result.records.filter(record => !record.procedureCount).length, 108);
  assert.equal(result.unlinkedAnalytics.length, 13);
  assert.equal(result.records.flatMap(record => record.strategies).length, 918);
  assert.equal(result.records.flatMap(record => record.strategies.flatMap(strategy => strategy.analytics)).length, 2053);
  for (const record of result.records) {
    assert.equal(record.procedureExamples.length, Math.min(record.procedureCount, 3));
    assert.equal(record.attackVersion, '19.2');
    assert.match(record.falsePositives, /^Local-baseline guidance/);
  }
});

test('unknown and malformed source shapes fail closed', () => {
  const { bundles } = generator.loadSources(root);
  const first = bundles[0];
  const technique = first.objects.find(object => object.type === 'attack-pattern' && !object.revoked && !object.x_mitre_deprecated);
  const replacement = value => [{ ...first, objects: first.objects.map(object => object === technique ? value : object) }, ...bundles.slice(1)];
  assert.throws(() => generator.convertBundles(replacement({ ...technique, x_unknown_payload: 'unrecognized' })), /Unknown source field/);
  assert.throws(() => generator.convertBundles(replacement({ ...technique, x_mitre_platforms: 'Windows' })), /platforms/);
  assert.throws(() => generator.convertBundles(replacement({ ...technique, revoked: 'false' })), /revoked/);
  assert.throws(() => generator.convertBundles(replacement({ ...technique, description: '' })), /description/);
});

test('present null source arrays are rejected while absent arrays are preserved as absent evidence', () => {
  const { bundles } = generator.loadSources(root);
  const first = bundles[0];
  const analytic = first.objects.find(object => object.type === 'x-mitre-analytic' && !object.revoked && !object.x_mitre_deprecated);
  for (const field of ['x_mitre_log_source_references', 'x_mitre_mutable_elements', 'external_references']) {
    const changed = [{ ...first, objects: first.objects.map(object => object === analytic ? { ...object, [field]: null } : object) }, ...bundles.slice(1)];
    assert.throws(() => generator.convertBundles(changed), /Invalid source/);
  }
});

test('source directory rejects unexpected files and symbolic links', t => {
  const directory = temporaryRoot(t);
  fs.cpSync(path.join(root, 'sources'), path.join(directory, 'sources'), { recursive: true });
  const unexpected = path.join(directory, 'sources/attack-19.2/raw/unexpected.json');
  fs.writeFileSync(unexpected, '{}');
  assert.throws(() => generator.loadSources(directory), /Unknown source path/);
  fs.unlinkSync(unexpected);
  const license = path.join(directory, 'sources/attack-19.2/raw/LICENSE.txt');
  fs.unlinkSync(license);
  fs.symlinkSync(path.join(root, 'sources/attack-19.2/raw/LICENSE.txt'), license);
  assert.throws(() => generator.loadSources(directory), /symbolic|symlink/i);
});

test('source checksum mismatch cannot be accepted by editing the manifest', t => {
  const directory = temporaryRoot(t);
  fs.cpSync(path.join(root, 'sources'), path.join(directory, 'sources'), { recursive: true });
  const file = path.join(directory, 'sources/attack-19.2/raw/ics-attack-19.2.json');
  fs.appendFileSync(file, '\n');
  assert.throws(() => generator.loadSources(directory), /checksum|size|integrity/i);
  const manifestPath = path.join(directory, 'sources/attack-19.2/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.files.find(item => item.path === 'raw/ics-attack-19.2.json').bytes++;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(() => generator.loadSources(directory), /checksum|size|integrity/i);
});

test('generated JavaScript encodes source strings as literal data', () => {
  const text = generator.renderCatalog([{ id: 'T0000', behavior: '</script><script>globalThis.pwned = true</script> ${HOME}\u2028\u2029' }]);
  assert.ok(!text.includes('</script>'));
  assert.ok(!text.includes('\u2028'));
  const vm = require('node:vm');
  const sandbox = {};
  vm.runInNewContext(text, sandbox);
  assert.equal(sandbox.pwned, undefined);
  assert.equal(sandbox.PAD_CATALOG[0].behavior, '</script><script>globalThis.pwned = true</script> ${HOME}\u2028\u2029');
});

test('check mode confirms byte parity without rewriting files', () => {
  const files = ['demo/catalog.js', 'library/coverage.json', 'library/procedures.jsonl', 'library/prompts/enterprise/T1059.001.txt'];
  const before = files.map(file => fs.statSync(path.join(root, file)).mtimeMs);
  const result = generator.buildLibrary({ root, check: true });
  assert.equal(result.promptCount, 918);
  assert.deepEqual(files.map(file => fs.statSync(path.join(root, file)).mtimeMs), before);
});

test('check mode detects stale bytes without changing them', t => {
  const directory = temporaryRoot(t);
  fs.mkdirSync(path.join(directory, 'demo'));
  const expected = new Map([['demo/catalog.js', 'expected\n']]);
  const file = path.join(directory, 'demo/catalog.js');
  fs.writeFileSync(file, 'stale\n');
  assert.throws(() => generator.writeOutputs(directory, expected, true), /differs/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'stale\n');
});

test('unknown generated paths and symlinks fail before known files are changed', t => {
  const directory = temporaryRoot(t);
  fs.mkdirSync(path.join(directory, 'demo'));
  fs.mkdirSync(path.join(directory, 'library/prompts/enterprise'), { recursive: true });
  const catalogPath = path.join(directory, 'demo/catalog.js');
  fs.writeFileSync(catalogPath, 'original');
  const unknown = path.join(directory, 'library/prompts/enterprise/T9999.txt');
  fs.writeFileSync(unknown, 'user file');
  const expected = new Map([['demo/catalog.js', 'replacement'], ['library/prompts/enterprise/T1059.txt', 'prompt']]);
  assert.throws(() => generator.writeOutputs(directory, expected, false), /Unknown generated path/);
  assert.equal(fs.readFileSync(catalogPath, 'utf8'), 'original');
  fs.unlinkSync(unknown);
  const outside = path.join(directory, 'outside.txt');
  fs.writeFileSync(outside, 'untouched');
  fs.symlinkSync(outside, path.join(directory, 'library/prompts/enterprise/T1059.txt'));
  assert.throws(() => generator.writeOutputs(directory, expected, false), /symbolic|symlink/i);
  assert.equal(fs.readFileSync(catalogPath, 'utf8'), 'original');
  assert.equal(fs.readFileSync(outside, 'utf8'), 'untouched');
});

test('CLI rejects unknown arguments without printing source contents', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/build_library.cjs'), '--destination', '/tmp/private'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/);
  assert.ok(!result.stderr.includes('/tmp/private'));
});
