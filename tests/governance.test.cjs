'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const governanceFiles = [
  'GOVERNANCE.md',
  'MAINTAINERS.md',
  'SUPPORT.md',
  'CITATION.cff',
  '.github/CODEOWNERS',
  'docs/evidence-contributions.md',
  'docs/maintainer-onboarding.md',
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('governance foundation files are present as regular files', () => {
  for (const relativePath of governanceFiles) {
    const stat = fs.lstatSync(path.join(root, relativePath));
    assert.ok(stat.isFile(), `${relativePath} must be a regular file`);
  }
});

test('the current maintainer roster contains only the known maintainer', () => {
  const maintainers = read('MAINTAINERS.md');
  const currentSection = maintainers.match(/## Current maintainers\n([\s\S]*?)(?=\n## |$)/);
  assert.ok(currentSection, 'MAINTAINERS.md must have a current maintainer section');
  const handles = [...currentSection[1].matchAll(/`(@?[A-Za-z0-9-]+)`/g)]
    .map(match => match[1].replace(/^@/, ''));
  assert.deepEqual(handles, ['samran2']);
});

test('CODEOWNERS assigns every owned path only to the known maintainer', () => {
  const rules = read('.github/CODEOWNERS')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  assert.ok(rules.some(line => line === '* @samran2'), 'a repository-wide fallback is required');
  for (const rule of rules) {
    const owners = rule.split(/\s+/).slice(1);
    assert.deepEqual(owners, ['@samran2'], `unexpected CODEOWNER in: ${rule}`);
  }
});

test('governance tells the truth about the unavailable two-approval gate', () => {
  const governance = read('GOVERNANCE.md');
  assert.match(governance, /two independent qualified reviewers/i);
  assert.match(governance, /cannot (?:yet )?be enforced/i);
  assert.match(governance, /only (?:known|current) maintainer[^\n]*samran2/i);
  assert.match(governance, /must not (?:be represented|be described|count)[^\n]*two[- ]approval/i);
});

test('contributions use DCO sign-off and do not require a CLA', () => {
  const governance = read('GOVERNANCE.md');
  const evidence = read('docs/evidence-contributions.md');
  for (const document of [governance, evidence]) {
    assert.match(document, /Developer Certificate of Origin|\bDCO\b/);
    assert.match(document, /Signed-off-by:/);
    assert.match(document, /(?:no|does not[^.\n]*require)[^.\n]*(?:Contributor License Agreement|CLA)/i);
  }
});

test('evidence contributions remain reproducible and preserve source boundaries', () => {
  const evidence = read('docs/evidence-contributions.md');
  assert.match(evidence, /source (?:identity|version)/i);
  assert.match(evidence, /license|right to share/i);
  assert.match(evidence, /reproduc/i);
  assert.match(evidence, /false positive/i);
  assert.match(evidence, /false negative/i);
  assert.match(evidence, /synthetic/i);
  assert.match(evidence, /unvalidated draft/i);
  assert.match(evidence, /pinned ATT&CK 19\.2/i);
});

test('maintainer onboarding requires trust controls before access', () => {
  const onboarding = read('docs/maintainer-onboarding.md');
  assert.match(onboarding, /least privilege/i);
  assert.match(onboarding, /two-factor authentication|\b2FA\b/i);
  assert.match(onboarding, /conflict of interest|recus/i);
  assert.match(onboarding, /DCO|Developer Certificate of Origin/i);
  assert.match(onboarding, /does not itself grant access|no access/i);
});

test('support policy separates public help from private security reports', () => {
  const support = read('SUPPORT.md');
  assert.match(support, /best\s+effort/i);
  assert.match(support, /no (?:response|resolution|support)[ -]time guarantee|no SLA/i);
  assert.match(support, /GitHub issue/i);
  assert.match(support, /private vulnerability reporting/i);
  assert.match(support, /do not[\s\S]{0,180}public issue/i);
});

test('local links in governance documents resolve inside the repository', () => {
  const markdownFiles = governanceFiles.filter(relativePath => relativePath.endsWith('.md'));
  for (const relativePath of markdownFiles) {
    const document = read(relativePath);
    for (const match of document.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split('#', 1)[0];
      if (!target || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
      const resolved = path.resolve(root, path.dirname(relativePath), decodeURIComponent(target));
      assert.ok(fs.existsSync(resolved), `${relativePath} has a broken local link: ${match[1]}`);
    }
  }
});

test('citation metadata matches the repository identity and development version', () => {
  const citation = read('CITATION.cff');
  const packageMetadata = JSON.parse(read('package.json'));
  assert.match(citation, /^cff-version: ['"]1\.2\.0['"]$/m);
  assert.match(citation, /^title: ['"]Prompt-as-Detection Library['"]$/m);
  assert.match(citation, new RegExp(`^version: ['"]${packageMetadata.version.replaceAll('.', '\\.') }['"]$`, 'm'));
  assert.match(citation, /^license: ['"]MIT['"]$/m);
  assert.match(citation, /^repository-code: ['"]https:\/\/github\.com\/samran2\/Prompt-as-Detection-Library['"]$/m);
  assert.match(citation, /^\s+- name: ['"]samran2['"]$/m);
});
