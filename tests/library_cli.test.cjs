'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const core = require('../demo/core.js');
const records = require('../demo/catalog.js');
const script = path.resolve(__dirname, '../scripts/library_cli.cjs');
const sample = records.find(record => record.id === 'T1059.001');

function cli(args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 15000, ...options,
  });
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pad-cli-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function succeeds(result) {
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.equal(result.stderr, '');
}

function fails(result, pattern) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, pattern);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

test('CLI help identifies the independent local workflow and exact options', () => {
  const result = cli(['--help']);
  succeeds(result);
  for (const word of ['list', 'prompt', 'export', '--context-file', '--output', '--json', '4,000', 'SHA-256']) {
    assert.ok(result.stdout.includes(word), word);
  }
  assert.match(result.stdout, /independently rebuilt/i);
});

test('list includes every catalog ID and uses the shared combined filters', () => {
  const complete = cli(['list', '--json']);
  succeeds(complete);
  assert.deepEqual(JSON.parse(complete.stdout).map(record => record.id), records.map(record => record.id));
  const filters = { query: 'powershell', domain: 'Enterprise', tactic: 'Execution', platform: 'Windows' };
  const result = cli(['list', '--query', filters.query, '--domain', filters.domain,
    '--tactic', filters.tactic, '--platform', filters.platform, '--json']);
  succeeds(result);
  assert.deepEqual(JSON.parse(result.stdout).map(record => record.id), core.filterTechniques(records, filters).map(record => record.id));
  const empty = cli(['list', '--query', 'this-query-has-no-record-31a7', '--json']);
  succeeds(empty);
  assert.deepEqual(JSON.parse(empty.stdout), []);
});

test('text listing has readable names and domains', () => {
  const result = cli(['list', '--query', sample.id]);
  succeeds(result);
  assert.ok(result.stdout.includes(sample.id));
  assert.ok(result.stdout.includes(sample.name));
  assert.ok(result.stdout.includes(sample.domain));
});

test('unspecified platform selection matches the shared browser filter for list and export', t => {
  const selected = core.filterTechniques(records, { platform: '__unspecified__' });
  assert.ok(selected.length > 0);
  assert.ok(selected.every(record => !record.platforms.length || record.platforms.every(value => value === 'None')));
  const result = cli(['list', '--platform', '__unspecified__', '--json']);
  succeeds(result);
  assert.deepEqual(JSON.parse(result.stdout).map(record => record.id), selected.map(record => record.id));
  const output = path.join(fixture(t), 'unspecified.jsonl');
  succeeds(cli(['export', '--platform', '__unspecified__', '--output', output]));
  const exported = fs.readFileSync(output, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(exported.map(row => row.technique_id), selected.map(record => record.id));
  assert.match(cli(['--help']).stdout, /--platform __unspecified__/);
});

test('prompt stdout is exactly shared composer output from outside the checkout', t => {
  const root = fixture(t);
  const result = cli(['prompt', sample.id], { cwd: root });
  succeeds(result);
  assert.equal(result.stdout, core.composePrompt(sample));
});

test('all supported modes and targets preserve the shared prompt contract', () => {
  for (const mode of Object.keys(core.MODES)) for (const target of core.TARGETS) {
    const result = cli(['prompt', sample.id, '--mode', mode, '--target', target]);
    succeeds(result);
    assert.equal(result.stdout, core.composePrompt(sample, { mode, target }));
  }
});

test('context stays literal and a new prompt file is private and byte-identical', t => {
  const root = fixture(t);
  const contextFile = path.join(root, 'context.txt');
  const output = path.join(root, 'prompt.txt');
  const context = '<script>synthetic</script> ${HOME} $(touch never-created) [[SCHEMA]]\nsynthetic context 🧪';
  fs.writeFileSync(contextFile, context);
  const result = cli(['prompt', sample.id, '--mode', 'hunt', '--target', 'Sigma',
    '--context-file', contextFile, '--output', output]);
  succeeds(result);
  const text = core.composePrompt(sample, { mode: 'hunt', target: 'Sigma', context });
  assert.equal(fs.readFileSync(output, 'utf8'), text);
  assert.deepEqual(JSON.parse(result.stdout), { records: 1, sha256: sha256(text) });
  if (process.platform !== 'win32') assert.equal(fs.statSync(output).mode & 0o777, 0o600);
  assert.deepEqual(fs.readdirSync(root).sort(), ['context.txt', 'prompt.txt']);
});

test('export preserves shared JSONL metadata and adds verifiable deterministic hashes', t => {
  const root = fixture(t);
  const first = path.join(root, 'first.jsonl');
  const second = path.join(root, 'second.jsonl');
  const args = ['export', '--domain', 'Mobile', '--mode', 'triage', '--target', 'Sentinel KQL'];
  const result = cli([...args, '--output', first]);
  succeeds(result);
  const actual = fs.readFileSync(first);
  const rows = actual.toString('utf8').trim().split('\n').map(JSON.parse);
  const selected = core.filterTechniques(records, { domain: 'Mobile' });
  const expected = core.exportJSONL(selected, { mode: 'triage', target: 'Sentinel KQL' }).trim().split('\n').map(JSON.parse);
  assert.equal(rows.length, selected.length);
  rows.forEach((row, index) => {
    const { prompt_sha256, ...metadata } = row;
    assert.deepEqual(metadata, expected[index]);
    assert.equal(prompt_sha256, sha256(row.prompt));
  });
  assert.deepEqual(JSON.parse(result.stdout), { records: selected.length, sha256: sha256(actual) });
  succeeds(cli([...args, '--output', second]));
  assert.deepEqual(fs.readFileSync(second), actual);
});

test('empty selection exports zero rows and the empty-file checksum', t => {
  const output = path.join(fixture(t), 'empty.jsonl');
  const result = cli(['export', '--query', 'no-technique-matches-68f4', '--output', output]);
  succeeds(result);
  assert.equal(fs.readFileSync(output, 'utf8'), '');
  assert.deepEqual(JSON.parse(result.stdout), { records: 0, sha256: sha256('') });
});

test('invalid commands, IDs, enum selectors and duplicate flags fail without echoing values', () => {
  const privateValue = 'synthetic-private-marker-6729';
  const cases = [[], [privateValue], ['prompt'], ['prompt', privateValue], ['prompt', 'T9999'],
    ['prompt', sample.id, 'T1000'], ['list', '--output', privateValue], ['list', '--domain', privateValue],
    ['list', '--tactic', privateValue], ['list', '--platform', privateValue], ['list', '--json=true'],
    ['list', '--json', '--json'], ['list', '--query', 'x', '--query', privateValue],
    ['list', '--query'], ['list', '--query', '--json'], ['list', '--' + privateValue],
    ['prompt', sample.id, '--mode', privateValue], ['prompt', sample.id, '--target', privateValue],
    ['export'], ['export', '--output', ''], ['prompt', sample.id, '--output', '-'],
    ['list', '--query', 'x'.repeat(1001)]];
  for (const args of cases) {
    const result = cli(args);
    fails(result, /^Error: /);
    assert.ok(!result.stderr.includes(privateValue));
  }
});

test('context enforces UTF-8 and character limits before creating output', t => {
  const root = fixture(t);
  const contextFile = path.join(root, 'context.txt');
  const output = path.join(root, 'must-not-exist.txt');
  for (const context of ['x'.repeat(4001), '🧪'.repeat(2001), Buffer.from([0xc3, 0x28])]) {
    fs.writeFileSync(contextFile, context);
    fails(cli(['prompt', sample.id, '--context-file', contextFile, '--output', output]), /Context/);
    assert.equal(fs.existsSync(output), false);
  }
  fs.writeFileSync(contextFile, '漢'.repeat(4000));
  const result = cli(['prompt', sample.id, '--context-file', contextFile]);
  succeeds(result);
  assert.equal(result.stdout, core.composePrompt(sample, { context: '漢'.repeat(4000) }));
  fs.writeFileSync(contextFile, '');
  fs.truncateSync(contextFile, 1024 * 1024 * 1024);
  fails(cli(['prompt', sample.id, '--context-file', contextFile]), /Context/);
});

test('missing, directory, and symbolic-link context inputs are rejected without path disclosure', t => {
  const root = fixture(t);
  const contextFile = path.join(root, 'synthetic-private-path.txt');
  const linked = path.join(root, 'linked.txt');
  fails(cli(['prompt', sample.id, '--context-file', contextFile]), /Context/);
  fs.writeFileSync(contextFile, 'synthetic');
  fs.symlinkSync(contextFile, linked);
  for (const input of [root, linked]) {
    const result = cli(['prompt', sample.id, '--context-file', input]);
    fails(result, /Context/);
    assert.ok(!result.stderr.includes(root));
  }
});

test('output refuses existing files, directories, dangling symlinks, and symlink parents', t => {
  const root = fixture(t);
  const file = path.join(root, 'keep.txt');
  const link = path.join(root, 'linked.txt');
  const dangling = path.join(root, 'dangling.txt');
  const linkParent = path.join(root, 'linked-directory');
  fs.writeFileSync(file, 'keep');
  fs.symlinkSync(file, link);
  fs.symlinkSync(path.join(root, 'absent.txt'), dangling);
  fs.symlinkSync(root, linkParent);
  for (const output of [file, root, link, dangling, path.join(linkParent, 'new.txt'), path.join(root, 'absent', 'new.txt')]) {
    fails(cli(['prompt', sample.id, '--output', output]), /Output/);
  }
  assert.equal(fs.readFileSync(file, 'utf8'), 'keep');
  assert.ok(fs.lstatSync(link).isSymbolicLink());
  assert.ok(fs.lstatSync(dangling).isSymbolicLink());
  assert.equal(fs.existsSync(path.join(root, 'new.txt')), false);
  assert.equal(fs.existsSync(path.join(root, 'absent.txt')), false);
});

test('concurrent exports have exactly one winner and never expose partial final content', async t => {
  const root = fixture(t);
  const output = path.join(root, 'race.jsonl');
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, 'export', '--query', sample.id, '--output', output]);
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', status => resolve({ status, stdout, stderr }));
  });
  const results = await Promise.all([run(), run()]);
  assert.deepEqual(results.map(result => result.status).sort(), [0, 1]);
  const bytes = fs.readFileSync(output);
  assert.equal(JSON.parse(results.find(result => result.status === 0).stdout).sha256, sha256(bytes));
  const row = JSON.parse(bytes.toString('utf8'));
  assert.equal(row.prompt, core.composePrompt(sample));
  assert.deepEqual(fs.readdirSync(root), ['race.jsonl']);
});
