const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

test('the world-class foundation exposes the intended repository boundaries', () => {
  const required = [
    'apps/workbench/README.md',
    'apps/workbench/package.json',
    'apps/research-api',
    'packages/core',
    'packages/schemas',
    'packages/clients',
    'content/attack/README.md',
    'content/prompts',
    'content/native-rules',
    'validation/fixtures',
    'validation/results',
    'validation/evals',
    'governance/decisions',
    'governance/threat-models',
  ];
  for (const relative of required) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, `missing ${relative}`);
  }
});

test('all public package versions agree on the development release', () => {
  const canonical = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  const npmVersion = readJson('package.json').version;
  assert.equal(canonical, '0.4.0.dev0');
  assert.equal(npmVersion, '0.4.0-dev.0');
  for (const relative of [
    'apps/workbench/package.json', 'apps/research-api/package.json',
    'packages/core/package.json', 'packages/clients/package.json', 'qa/package.json',
  ]) assert.equal(readJson(relative).version, npmVersion, `${relative} version drift`);
});

test('the compatibility layout is explicit instead of duplicating canonical data', () => {
  const workbench = fs.readFileSync(path.join(root, 'apps/workbench/README.md'), 'utf8');
  const attack = fs.readFileSync(path.join(root, 'content/attack/README.md'), 'utf8');
  assert.match(workbench, /demo\//);
  assert.match(workbench, /compatibility/i);
  assert.match(attack, /sources\/attack-19\.2/);
  assert.match(attack, /pinned/i);
});

test('the OCI build context is deny-by-default and cannot include repository state', () => {
  const rules = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8')
    .split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  assert.equal(rules[0], '**');
  for (const allowed of [
    '!.dockerignore', '!package.json', '!LICENSE', '!apps/research-api/Dockerfile',
    '!apps/research-api/package.json', '!apps/research-api/src/catalog-adapter.mjs',
    '!apps/research-api/src/handler.mjs', '!apps/research-api/src/server.mjs',
    '!packages/core/package.json', '!packages/core/src/research-catalog.mjs',
    '!demo/catalog.js', '!library/prompts/enterprise/T*.txt',
    '!library/prompts/mobile/T*.txt', '!library/prompts/ics/T*.txt',
    '!content/prompts/index.json',
    '!sources/attack-19.2/manifest.json', '!sources/attack-19.2/raw/LICENSE.txt',
  ]) assert.equal(rules.includes(allowed), true, `missing ${allowed}`);
  for (const forbidden of [
    '!.git/**', '!work/**', '!outputs/**', '!integrations/**', '!apps/research-api/**',
    '!packages/core/**', '!library/prompts/**',
  ]) {
    assert.equal(rules.includes(forbidden), false, `unsafe Docker context rule ${forbidden}`);
  }
});
