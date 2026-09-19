'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const environment = require('../demo/environment.js');
const core = require('../demo/core.js');
const records = require('../demo/catalog.js');
const script = path.resolve(__dirname, '../scripts/library_cli.cjs');
const record = records.find(item => item.id === 'T1059.001');

function cli(args) { return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 15000, maxBuffer: 32 * 1024 * 1024 }); }
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pad-environment-cli-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const profile = { ...environment.create('Synthetic profile', 'Sentinel KQL'),
    system: 'Synthetic Windows lab', dataSources: 'Synthetic process events',
    tables: 'SyntheticProcess', fieldMappings: 'Time:datetime; Command:string; Host:string',
    limitations: 'No network collection. ${HOME} $(literal) <script>literal</script>' };
  const filename = path.join(directory, 'synthetic.pad-environment.json');
  fs.writeFileSync(filename, environment.serialize(profile));
  return { directory, filename, profile };
}
function success(result) { assert.equal(result.status, 0, result.stderr || result.error?.message); assert.equal(result.stderr, ''); }
function failure(result, pattern) { assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.match(result.stderr, pattern); }

test('CLI profile supplies the absent target and matches browser composition including separate context', t => {
  const { directory, filename, profile } = fixture(t);
  const contextFile = path.join(directory, 'context.txt'), context = 'Separate synthetic note, not another profile.';
  fs.writeFileSync(contextFile, context);
  const result = cli(['prompt', record.id, '--mode', 'hunt', '--profile-file', filename, '--context-file', contextFile]);
  success(result);
  assert.equal(result.stdout, core.composePrompt(record, { mode: 'hunt', environment: profile, context }));
  const explicit = cli(['prompt', record.id, '--profile-file', filename, '--target', profile.target]);
  success(explicit);
  assert.equal(explicit.stdout, core.composePrompt(record, { environment: profile }));
  assert.match(cli(['--help']).stdout, /--profile-file/);
});

test('CLI profile/target conflicts reject before creating output and do not echo private profile fields', t => {
  const { directory, filename } = fixture(t), output = path.join(directory, 'must-not-exist.txt');
  const result = cli(['prompt', record.id, '--profile-file', filename, '--target', 'Sigma', '--output', output]);
  failure(result, /target.*(agree|conflict|match)/i);
  assert.equal(fs.existsSync(output), false);
  assert.doesNotMatch(result.stderr, /Synthetic profile|SyntheticProcess/);
});

test('profile export uses shared composition, private no-clobber files and exact prompt hashes', t => {
  const { directory, filename, profile } = fixture(t), output = path.join(directory, 'new.jsonl');
  const result = cli(['export', '--query', record.id, '--profile-file', filename, '--output', output]);
  success(result);
  const content = fs.readFileSync(output, 'utf8');
  const rows = content.trim().split('\n').map(JSON.parse);
  for (const row of rows) {
    assert.equal(row.prompt, core.composePrompt(records.find(item => item.id === row.technique_id), { environment: profile }));
    assert.equal(row.prompt_sha256, createHash('sha256').update(row.prompt).digest('hex'));
  }
  assert.equal(JSON.parse(result.stdout).sha256, createHash('sha256').update(content).digest('hex'));
  if (process.platform !== 'win32') assert.equal(fs.statSync(output).mode & 0o777, 0o600);
  failure(cli(['export', '--profile-file', filename, '--output', output]), /already exists/);
  assert.equal(fs.readFileSync(output, 'utf8'), content);
});

test('CLI rejects malformed, oversize, control-bearing and nonregular profile inputs', t => {
  const { directory, filename, profile } = fixture(t), output = path.join(directory, 'must-not-exist.txt');
  for (const input of [Buffer.from([0xc3, 0x28]), 'x'.repeat(environment.LIMITS.bytes + 1),
    JSON.stringify({ ...profile, system: '\u001b[31m' }), JSON.stringify({ ...profile, system: 'x'.repeat(4001) }),
    JSON.stringify({ ...profile, status: 'validated' }), '{"schemaVersion":1,"schemaVersion":1}', 'not JSON']) {
    fs.writeFileSync(filename, input);
    const result = cli(['prompt', record.id, '--profile-file', filename, '--output', output]);
    failure(result, /[Pp]rofile/);
    assert.equal(fs.existsSync(output), false);
  }
  fs.writeFileSync(filename, environment.serialize(profile));
  const linked = path.join(directory, 'linked.pad-environment.json'); fs.symlinkSync(filename, linked);
  for (const input of [linked, directory, path.join(directory, 'missing.json')]) {
    failure(cli(['prompt', record.id, '--profile-file', input]), /[Pp]rofile/);
  }
});

test('CLI rejects profile options where unsupported, empty paths and duplicate selectors', () => {
  for (const args of [['list', '--profile-file', 'private-name'], ['prompt', record.id, '--profile-file', ''],
    ['prompt', record.id, '--profile-file', '-'], ['prompt', record.id, '--profile-file', 'a', '--profile-file', 'b']]) {
    const result = cli(args); failure(result, /^Error:/); assert.doesNotMatch(result.stderr, /private-name/);
  }
});
