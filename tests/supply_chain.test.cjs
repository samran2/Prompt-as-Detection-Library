const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const core = require('../demo/core.js');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function actionPolicyFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pad-action-policy-'));
  fs.mkdirSync(path.join(root, 'scripts'), {recursive: true});
  fs.cpSync(path.join(ROOT, 'scripts', 'verify_actions_pinned.cjs'), path.join(root, 'scripts', 'verify_actions_pinned.cjs'));
  fs.cpSync(path.join(ROOT, '.github'), path.join(root, '.github'), {recursive: true});
  return root;
}

test('every remote GitHub Action is allowlisted and pinned to an exact commit', () => {
  const result = spawnSync(process.execPath, ['scripts/verify_actions_pinned.cjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /verified remote action reference/);
});

test('the action policy fails closed on flow-style uses mappings', t => {
  const root = actionPolicyFixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, '.github', 'workflows', 'flow-bypass.yml'), [
    'name: Flow bypass fixture',
    'on: workflow_dispatch',
    'jobs:',
    '  bypass:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - { uses: attacker/action@main }',
    '',
  ].join('\n'));
  const result = spawnSync(process.execPath, ['scripts/verify_actions_pinned.cjs'], {cwd: root, encoding: 'utf8'});
  assert.notEqual(result.status, 0, 'flow-style uses must not evade policy review');
  assert.match(result.stderr, /unsupported uses syntax/i);
});

test('the action policy fails closed on explicit and escaped YAML uses keys', t => {
  for (const [name, step] of [
    ['explicit', ['      - ? uses', '        : attacker/action@main']],
    ['escaped', ['      - "us\\u0065s": attacker/action@main']],
    ['explicit-escaped', ['      - ? "us\\u0065s"', '        : attacker/action@main']],
    ['escaped-long', ['      - "us\\U00000065s": attacker/action@main']],
    ['continued-key', ['      - "us\\', '        es": attacker/action@main']],
  ]) {
    const root = actionPolicyFixture();
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    fs.writeFileSync(path.join(root, '.github', 'workflows', `${name}-bypass.yml`), [
      `name: ${name} bypass fixture`,
      'on: workflow_dispatch',
      'jobs:',
      '  bypass:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      ...step,
      '',
    ].join('\n'));
    const result = spawnSync(process.execPath, ['scripts/verify_actions_pinned.cjs'], {cwd: root, encoding: 'utf8'});
    assert.notEqual(result.status, 0, `${name} YAML uses key must not evade policy review`);
    assert.match(result.stderr, /unsupported (?:uses|workflow YAML) syntax/i);
  }
});

test('the action policy rejects local composite-action wrappers', t => {
  const root = actionPolicyFixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, '.github', 'actions', 'wrapper'), {recursive: true});
  fs.writeFileSync(path.join(root, '.github', 'actions', 'wrapper', 'action.yml'), [
    'name: Wrapper',
    "runs:",
    "  using: composite",
    '  steps:',
    '    - uses: attacker/action@main',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(root, '.github', 'workflows', 'local-bypass.yml'), [
    'name: Local bypass fixture',
    'on: workflow_dispatch',
    'jobs:',
    '  bypass:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: ./.github/actions/wrapper',
    '',
  ].join('\n'));
  const result = spawnSync(process.execPath, ['scripts/verify_actions_pinned.cjs'], {cwd: root, encoding: 'utf8'});
  assert.notEqual(result.status, 0, 'local composite wrappers must not evade policy review');
  assert.match(result.stderr, /local action reference/i);
});

test('supply-chain workflows cover dependency, secret, scorecard and release evidence gates', () => {
  const supplyChain = read('.github/workflows/supply-chain.yml');
  const scorecard = read('.github/workflows/scorecard.yml');
  const releaseEvidence = read('.github/workflows/release-evidence.yml');

  assert.match(supplyChain, /actions\/dependency-review-action@[0-9a-f]{40}/);
  assert.match(supplyChain, /gitleaks\/gitleaks-action@[0-9a-f]{40}/);
  assert.match(scorecard, /ossf\/scorecard-action@[0-9a-f]{40}/);
  assert.match(scorecard, /publish_results: false/);
  assert.match(releaseEvidence, /anchore\/sbom-action@[0-9a-f]{40}/);
  assert.match(releaseEvidence, /actions\/attest-build-provenance@[0-9a-f]{40}/);
  assert.match(releaseEvidence, /sigstore\/cosign-installer@[0-9a-f]{40}/);
  assert.doesNotMatch(releaseEvidence, /\bgh\s+release\s+create\b|softprops\/action-gh-release|actions\/create-release/);
  assert.match(releaseEvidence, /workflow_dispatch:/);
  assert.doesNotMatch(releaseEvidence, /^\s+(?:push|release):/m);
  assert.doesNotMatch(releaseEvidence, /inputs\.source_ref/);
  assert.match(releaseEvidence, /git merge-base --is-ancestor HEAD refs\/remotes\/origin\/main/);
  const verifyJob = releaseEvidence.match(/^  verify:\n([\s\S]*?)(?=^  evidence:)/m)?.[1] || '';
  const evidenceJob = releaseEvidence.match(/^  evidence:\n([\s\S]*)/m)?.[1] || '';
  assert.match(verifyJob, /npm run build/);
  assert.doesNotMatch(verifyJob, /id-token:\s*write|attestations:\s*write/);
  assert.match(evidenceJob, /needs:\s*verify/);
  assert.match(evidenceJob, /id-token:\s*write/);
  assert.doesNotMatch(evidenceJob, /npm\s+(?:run|test|exec)|node\s+scripts\//);
});

test('Dependabot covers Actions and every checked-in package-manager boundary', () => {
  const dependabot = read('.github/dependabot.yml');
  for (const ecosystem of ['github-actions', 'npm', 'pip']) {
    assert.match(dependabot, new RegExp(`package-ecosystem: ['"]?${ecosystem}`));
  }
  assert.match(dependabot, /directory: ['"]?\/qa['"]?$/m);
});

test('main ruleset is intentionally disabled until it can be applied without locking out the owner', () => {
  const ruleset = JSON.parse(read('.github/rulesets/main.json'));
  assert.equal(ruleset.target, 'branch');
  assert.equal(ruleset.enforcement, 'disabled');
  assert.deepEqual(ruleset.conditions.ref_name.include, ['refs/heads/main']);
  assert.ok(ruleset.rules.some(rule => rule.type === 'deletion'));
  assert.ok(ruleset.rules.some(rule => rule.type === 'non_fast_forward'));
  assert.ok(ruleset.rules.some(rule => rule.type === 'required_signatures'));
  const pullRequest = ruleset.rules.find(rule => rule.type === 'pull_request');
  assert.equal(pullRequest.parameters.required_approving_review_count, 2);
  assert.equal(pullRequest.parameters.require_code_owner_review, true);
  assert.equal(pullRequest.parameters.required_review_thread_resolution, true);
});

test('the only OCI build boundary is digest-pinned and has a blocking image scan', () => {
  const containerFiles = [];
  const pending = [ROOT];
  const excluded = new Set(['.git', 'dist', 'node_modules', 'work']);
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || excluded.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else if (/^(?:Dockerfile(?:\..*)?|Containerfile(?:\..*)?)$/.test(entry.name)) {
        containerFiles.push(path.relative(ROOT, absolute));
      }
    }
  }
  assert.deepEqual(containerFiles, ['apps/research-api/Dockerfile']);
  const dockerfile = read(containerFiles[0]);
  assert.match(dockerfile, /^FROM\s+[^\s@]+@sha256:[0-9a-f]{64}$/m);
  assert.match(
    dockerfile,
    /^FROM gcr\.io\/distroless\/nodejs24-debian13:nonroot@sha256:774b7d020b24214835769e24c3544835526cd0288f0b094eae48e8b2c2429a79$/m,
  );
  assert.doesNotMatch(dockerfile, /^RUN\b/m, 'runtime construction must not depend on mutable package repositories');
  assert.doesNotMatch(dockerfile, /\b(?:apk|apt(?:-get)?|npm|npx|corepack|yarn)\b/);
  assert.match(dockerfile, /^COPY --chown=65532:65532 /m);
  assert.match(dockerfile, /^USER 65532:65532$/m);
  assert.match(dockerfile, /^\s*CMD \["\/nodejs\/bin\/node", "-e", /m);
  assert.match(dockerfile, /^CMD \["apps\/research-api\/src\/server\.mjs"\]$/m);
  const dockerignore = read('.dockerignore');
  assert.match(dockerignore, /^\*\*$/m);
  assert.doesNotMatch(dockerignore, /^!(?:apps\/research-api|packages\/core|library\/prompts)\/\*\*$/m);
  for (const required of [
    '!apps/research-api/Dockerfile',
    '!apps/research-api/package.json',
    '!apps/research-api/src/catalog-adapter.mjs',
    '!apps/research-api/src/handler.mjs',
    '!apps/research-api/src/server.mjs',
    '!packages/core/package.json',
    '!packages/core/src/research-catalog.mjs',
  ]) assert.match(dockerignore, new RegExp(`^${required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
  for (const domain of ['enterprise', 'mobile', 'ics']) {
    assert.match(dockerignore, new RegExp(`^!library/prompts/${domain}/T\\*\\.txt$`, 'm'));
  }
  assert.doesNotMatch(dockerignore, /^!\.git(?:\/|$)/m);

  const workflow = read('.github/workflows/container-scan.yml');
  assert.match(workflow, /docker build --file apps\/research-api\/Dockerfile --tag prompt-as-detection-research-api:ci \./);
  assert.match(workflow, /aquasecurity\/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25/);
  assert.match(workflow, /severity: ['"]?HIGH,CRITICAL/);
  assert.match(workflow, /exit-code: ['"]1['"]/);
  assert.match(workflow, /ignore-unfixed: false/);
  assert.match(workflow, /version: v0\.70\.0/);
  assert.doesNotMatch(workflow, /docker\s+(?:push|login)|push-to-registry/);

  const ruleset = JSON.parse(read('.github/rulesets/main.json'));
  const statusChecks = ruleset.rules.find(rule => rule.type === 'required_status_checks');
  assert.ok(statusChecks.parameters.required_status_checks.some(check => check.context === 'Container image scan'));
});

test('deterministic adversarial smoke preserves bounded untrusted text literally', () => {
  const record = {
    id: 'T0000', name: 'Fuzz fixture', domain: 'Enterprise', tactics: [], platforms: [],
    behavior: 'A synthetic behavior used only for deterministic boundary testing.',
    telemetry: [], falsePositives: 'Synthetic benign input used only by this test.',
    sourceUrl: 'https://attack.mitre.org/',
  };
  let state = 0x5eed1234;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  const alphabet = '<>&"\'`${}[]\\/\n\r\t ABCxyz09';
  for (let iteration = 0; iteration < 256; iteration += 1) {
    const length = next() % 512;
    let context = '';
    for (let index = 0; index < length; index += 1) context += alphabet[next() % alphabet.length];
    const prompt = core.composePrompt(record, { context });
    assert.ok(prompt.includes(context));
  }
  assert.throws(() => core.composePrompt(record, { context: 'x'.repeat(4001) }), /4,000-character limit/);
});
