const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, '.agents/agent-skills.lock.json'), 'utf8'));

function regularFiles(relative) {
  const stat = fs.lstatSync(path.join(root, relative));
  assert.equal(stat.isSymbolicLink(), false, `Symlink in skill pack: ${relative}`);
  if (stat.isFile()) return [relative];
  assert.ok(stat.isDirectory(), `Unsupported skill entry: ${relative}`);
  return fs.readdirSync(path.join(root, relative)).flatMap(name => regularFiles(`${relative}/${name}`));
}

test('project skill pack retains a pinned source, complete file inventory and MIT notice', () => {
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.repository, 'https://github.com/addyosmani/agent-skills');
  assert.match(lock.commit, /^[a-f0-9]{40}$/);
  assert.equal(lock.license, 'MIT');
  assert.equal(lock.installation, 'project-local');
  assert.equal(lock.licenseFile, '.agents/AGENT_SKILLS_LICENSE');
  assert.equal(new Set(lock.files.map(file => file.path)).size, lock.files.length);
  const expected = [...lock.files.map(file => file.path), '.agents/README.md',
    '.agents/agent-skills.lock.json'].sort();
  const actual = regularFiles('.agents').sort();
  assert.deepEqual(actual, expected, 'Missing or unrecorded upstream files');
  for (const file of lock.files) {
    assert.equal(file.sourcePath, file.path === lock.licenseFile ? 'LICENSE' : file.path.slice('.agents/'.length));
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    const bytes = fs.readFileSync(path.join(root, file.path));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
    assert.equal(file.mode, file.sourcePath === 'skills/idea-refine/scripts/idea-refine.sh' ? '100755' : '100644');
    if (process.platform !== 'win32') {
      const executable = (fs.statSync(path.join(root, file.path)).mode & 0o111) !== 0;
      assert.equal(executable, file.mode === '100755', `Unexpected executable bit: ${file.path}`);
    }
  }
  const license = fs.readFileSync(path.join(root, lock.licenseFile), 'utf8');
  assert.match(license, /Copyright \(c\) 2025 Addy Osmani/);
  assert.match(license, /MIT License/);
});

test('development skill files stay outside Pages and OCI runtime inputs', () => {
  const { PUBLIC_FILES } = require('../scripts/build_demo.cjs');
  assert.ok(PUBLIC_FILES.every(name => !name.includes('/') && !name.includes('agents')));
  const dockerRules = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8')
    .split(/\r?\n/).filter(line => line && !line.startsWith('#'));
  assert.equal(dockerRules[0], '**');
  assert.ok(dockerRules.every(line => !line.startsWith('!.agents')));
});

test('all 25 project skills have discoverable names and descriptions', () => {
  assert.equal(lock.skills.length, 25);
  assert.deepEqual(fs.readdirSync(path.join(root, '.agents/skills')).sort(), lock.skills);
  for (const name of lock.skills) {
    assert.match(name, /^[a-z][a-z0-9-]+$/);
    const skill = fs.readFileSync(path.join(root, '.agents/skills', name, 'SKILL.md'), 'utf8');
    assert.ok(skill.startsWith(`---\nname: ${name}\n`), name);
    assert.match(skill, /\ndescription: \S[^\n]+\n---\n/);
  }
});

test('shared and skill-local Markdown references resolve inside the installed pack', () => {
  let checked = 0;
  for (const file of lock.files.filter(file => file.path.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(root, file.path), 'utf8');
    // Upstream uses code-formatted paths for its shared reference checklists.
    for (const [, reference] of text.matchAll(/`(\.\.\/\.\.\/references\/[a-z-]+\.md)`/g)) {
      const resolved = path.resolve(root, path.dirname(file.path), reference);
      assert.ok(resolved.startsWith(path.join(root, '.agents') + path.sep));
      assert.ok(fs.statSync(resolved).isFile(), `${file.path}: ${reference}`);
      checked++;
    }
  }
  assert.ok(checked >= 15, 'Shared reference checks must not silently become vacuous');
  assert.ok(fs.statSync(path.join(root, '.agents/skills/constraint-driven-development/references/floor-guard.md')).isFile());
});
