'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const libraryBuilder = require('./build_library.cjs');
const core = require('../demo/core.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKENDS = [
  { id: 'defender-xdr', name: 'Microsoft Defender XDR' },
  { id: 'panther', name: 'Panther' },
  { id: 'sentinel', name: 'Microsoft Sentinel' },
  { id: 'splunk', name: 'Splunk' },
];
const DOMAIN_SLUGS = new Map([
  ['Enterprise', 'enterprise'],
  ['ICS', 'ics'],
  ['Mobile', 'mobile'],
]);
const BUNDLE_PATHS = new Map([
  ['Enterprise', 'sources/attack-19.2/raw/enterprise-attack-19.2.json'],
  ['ICS', 'sources/attack-19.2/raw/ics-attack-19.2.json'],
  ['Mobile', 'sources/attack-19.2/raw/mobile-attack-19.2.json'],
]);
const OUTPUT_PATHS = new Set([
  'content/prompts/index.json',
  'content/native-rules/support-matrix.json',
  'validation/review-rubric.json',
  'validation/results/review-summary.json',
]);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };

function readRegularFile(root, relative) {
  requireCondition(path.isAbsolute(root), 'Invalid project root');
  requireCondition(!path.isAbsolute(relative) && !relative.split('/').includes('..'), 'Invalid relative path');
  const absolute = path.join(root, relative);
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    requireCondition(!stat.isSymbolicLink(), 'Refusing symbolic link path');
  }
  const stat = fs.lstatSync(absolute);
  requireCondition(stat.isFile() && stat.nlink === 1, 'Expected a regular singly linked file');
  return fs.readFileSync(absolute);
}

function promptPath(record) {
  const slug = DOMAIN_SLUGS.get(record.domain);
  requireCondition(slug, 'Unknown ATT&CK domain');
  return `library/prompts/${slug}/${record.id}.txt`;
}

function sourceBundle(root, domain) {
  const relative = BUNDLE_PATHS.get(domain);
  requireCondition(relative, 'Unknown ATT&CK source domain');
  const bytes = readRegularFile(root, relative);
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}

function lifecycle() {
  return {
    status: 'generated',
    claim: 'Deterministically generated from pinned source data; not human reviewed or operationally validated.',
    requiredIndependentHumanReviews: 2,
    humanReviews: [],
    reviewedAt: null,
    rubricVersion: null,
  };
}

function validation() {
  return {
    lab: { status: 'not-run', environment: null, fixtureHashes: [], evidence: [] },
    field: { status: 'not-reported', environment: null, evidence: [] },
    modelEvals: [],
  };
}

function buildPromptRegistry(root, records, contentVersion) {
  const bundles = new Map([...DOMAIN_SLUGS.keys()].map(domain => [domain, sourceBundle(root, domain)]));
  const registryRecords = records.map(record => {
    const relative = promptPath(record);
    const bytes = readRegularFile(root, relative);
    requireCondition(bytes.toString('utf8') === core.composePrompt(record), `Prompt differs from deterministic source output: ${record.domain}:${record.id}`);
    return {
      key: `${record.domain}:${record.id}`,
      attackId: record.id,
      stixId: record.stixId,
      name: record.name,
      domain: record.domain,
      kind: record.kind,
      tactics: record.tactics,
      platforms: record.platforms,
      attackVersion: record.attackVersion,
      contentVersion,
      prompt: {
        path: relative,
        bytes: bytes.length,
        sha256: sha256(bytes),
        generation: {
          catalogBuilder: 'scripts/build_library.cjs',
          composer: 'demo/core.js',
          mode: 'detect',
          target: 'Platform-neutral',
        },
      },
      source: {
        url: record.sourceUrl,
        stixId: record.stixId,
        bundle: bundles.get(record.domain),
        license: 'sources/attack-19.2/raw/LICENSE.txt',
      },
      telemetry: {
        sourceListed: record.telemetry,
        required: [],
        fieldMappings: [],
        limitations: [
          'No local collection configuration, schema, field semantics or samples have been reviewed.',
          'Source-listed telemetry is reference data and does not prove local availability or product support.',
        ],
      },
      lifecycle: lifecycle(),
      validation: validation(),
    };
  }).sort((left, right) => compare(left.key, right.key));

  const statuses = { generated: registryRecords.length, reviewed: 0, 'lab-validated': 0, 'field-confirmed': 0 };
  return {
    schemaVersion: 1,
    attackVersion: '19.2',
    contentVersion,
    scope: 'Every active technique and subtechnique in the three pinned ATT&CK 19.2 domain bundles.',
    caveat: 'Coverage and hash integrity do not establish detection effectiveness, human review or product compatibility.',
    policy: {
      requiredIndependentHumanReviewsPerPrompt: 2,
      lifecycleOrder: ['generated', 'reviewed', 'lab-validated', 'field-confirmed'],
      evidenceRule: 'A lifecycle status may advance only through reviewed evidence contributed separately from this generated registry.',
    },
    totals: {
      prompts: registryRecords.length,
      requiredHumanReviews: registryRecords.length * 2,
      completedHumanReviews: 0,
      statuses,
      domains: Object.fromEntries([...DOMAIN_SLUGS.keys()].map(domain => [domain, registryRecords.filter(record => record.domain === domain).length])),
    },
    records: registryRecords,
  };
}

function blankSupportCell(record, backend) {
  return {
    key: `${record.key}:${backend.id}`,
    promptKey: record.key,
    backend: backend.id,
    status: 'unassessed',
    applicability: { decision: null, rationale: null, evidence: [], assessedBy: null, assessedAt: null },
    nativeRule: { path: null, sha256: null, spdxLicense: null, origin: null },
    validation: { status: 'not-run', environment: null, fixtures: [], results: [], validatedBy: null, validatedAt: null },
  };
}

function validateSupportCell(cell) {
  requireCondition(cell && typeof cell === 'object' && ['unassessed', 'supported', 'not-applicable'].includes(cell.status), 'Invalid support status');
  requireCondition(cell.applicability && Array.isArray(cell.applicability.evidence), 'Invalid applicability evidence');
  requireCondition(cell.nativeRule && cell.validation && Array.isArray(cell.validation.fixtures) && Array.isArray(cell.validation.results), 'Invalid support evidence shape');
  if (cell.status === 'unassessed') {
    requireCondition(cell.applicability.decision === null && cell.applicability.rationale === null && cell.applicability.evidence.length === 0
      && cell.applicability.assessedBy === null && cell.applicability.assessedAt === null, 'Unassessed cell cannot contain applicability claims');
    requireCondition(cell.nativeRule.path === null && cell.validation.status === 'not-run', 'Unassessed cell cannot contain rule or validation claims');
  }
  if (cell.status === 'not-applicable') {
    requireCondition(cell.applicability.decision === 'not-applicable' && typeof cell.applicability.rationale === 'string' && cell.applicability.rationale.trim().length > 0 && cell.applicability.evidence.length > 0, 'Not-applicable status requires audited evidence');
    requireCondition(typeof cell.applicability.assessedBy === 'string' && cell.applicability.assessedBy.length > 0
      && /^\d{4}-\d{2}-\d{2}T/.test(cell.applicability.assessedAt || ''), 'Not-applicable status requires a named assessor and date');
    requireCondition(cell.nativeRule.path === null, 'Not-applicable status cannot include a native rule');
  }
  if (cell.status === 'supported') {
    requireCondition(typeof cell.nativeRule.path === 'string' && /^[a-zA-Z0-9._/-]+$/.test(cell.nativeRule.path)
      && /^[a-f0-9]{64}$/.test(cell.nativeRule.sha256 || '')
      && typeof cell.nativeRule.spdxLicense === 'string' && cell.nativeRule.spdxLicense.length > 0
      && typeof cell.nativeRule.origin === 'string' && cell.nativeRule.origin.length > 0
      && cell.validation.status === 'lab-validated' && cell.validation.environment
      && cell.validation.fixtures.length >= 4 && cell.validation.results.length >= 4
      && typeof cell.validation.validatedBy === 'string' && cell.validation.validatedBy.length > 0
      && /^\d{4}-\d{2}-\d{2}T/.test(cell.validation.validatedAt || ''),
    'Supported status requires a native rule and laboratory evidence');
  }
  return cell;
}

function buildSupportMatrix(registry) {
  const cells = registry.records.flatMap(record => BACKENDS.map(backend => blankSupportCell(record, backend)));
  for (const cell of cells) validateSupportCell(cell);
  return {
    schemaVersion: 1,
    attackVersion: registry.attackVersion,
    contentVersion: registry.contentVersion,
    caveat: 'Every cell is unassessed. No backend support, incompatibility or laboratory result is claimed.',
    policy: {
      statuses: ['unassessed', 'supported', 'not-applicable'],
      supported: 'Requires an item-level SPDX license, origin, rule hash, named test environment and four fixture results.',
      notApplicable: 'Requires an audited rationale and cited telemetry or product-capability evidence.',
    },
    backends: BACKENDS,
    packTargets: [
      { domain: 'Enterprise', plannedCases: 100, selectionStatus: 'pending-expert-curation', selectedPromptKeys: [] },
      { domain: 'ICS', plannedCases: 97, selectionStatus: 'pending-expert-curation', selectedPromptKeys: [] },
      { domain: 'Mobile', plannedCases: 100, selectionStatus: 'pending-expert-curation', selectedPromptKeys: [] },
    ],
    totals: { prompts: registry.records.length, cells: cells.length, statuses: { unassessed: cells.length, supported: 0, 'not-applicable': 0 } },
    cells,
  };
}

function buildRubric() {
  return {
    schemaVersion: 1,
    rubricVersion: '1.0.0',
    scale: { minimum: 1, maximum: 5, passingMean: 4 },
    independence: 'Each prompt requires two reviews by different named reviewers.',
    criteria: [
      { id: 'factual-accuracy', name: 'Factual accuracy' },
      { id: 'attack-alignment', name: 'ATT&CK alignment' },
      { id: 'telemetry-feasibility', name: 'Telemetry feasibility' },
      { id: 'benign-cases', name: 'Benign-case quality' },
      { id: 'safety', name: 'Safety' },
      { id: 'source-traceability', name: 'Source traceability' },
      { id: 'platform-assumptions', name: 'Platform-specific assumptions' },
    ],
    criticalBlockers: [
      'Source fabrication',
      'Dangerous operational instruction',
      'Unsupported validation claim',
    ],
  };
}

function buildSummary(registry, matrix) {
  return {
    schemaVersion: 1,
    attackVersion: registry.attackVersion,
    contentVersion: registry.contentVersion,
    outcome: 'not-ready',
    stableReleaseEligible: false,
    humanReviewProgress: { completed: registry.totals.completedHumanReviews, required: registry.totals.requiredHumanReviews },
    promptLifecycle: registry.totals.statuses,
    nativeRuleProgress: { labValidated: matrix.totals.statuses.supported, unassessed: matrix.totals.statuses.unassessed, notApplicable: matrix.totals.statuses['not-applicable'] },
    blockers: [
      '1,836 independent human reviews remain before the v1.0 content gate can pass.',
      'Native backend applicability decisions and laboratory validation have not been performed.',
      'No field-confirmed detections are recorded.',
    ],
  };
}

function expectedOutputs(root = PROJECT_ROOT) {
  const rootStat = fs.lstatSync(root);
  requireCondition(path.isAbsolute(root) && rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'Invalid project root');
  const version = readRegularFile(root, 'VERSION').toString('utf8').trim();
  requireCondition(/^\d+\.\d+\.\d+(?:[.-][0-9A-Za-z.-]+)?$/.test(version), 'Invalid content version');
  const { bundles } = libraryBuilder.loadSources(root);
  const { records } = libraryBuilder.convertBundles(bundles);
  requireCondition(records.length === 918, 'Review registry requires exactly 918 active prompts');
  const registry = buildPromptRegistry(root, records, version);
  const matrix = buildSupportMatrix(registry);
  const rubric = buildRubric();
  const summary = buildSummary(registry, matrix);
  const outputs = new Map([
    ['content/prompts/index.json', JSON.stringify(registry, null, 2) + '\n'],
    ['content/native-rules/support-matrix.json', JSON.stringify(matrix, null, 2) + '\n'],
    ['validation/review-rubric.json', JSON.stringify(rubric, null, 2) + '\n'],
    ['validation/results/review-summary.json', JSON.stringify(summary, null, 2) + '\n'],
  ]);
  return { outputs, registry, matrix, summary };
}

function ensureDirectory(root, relative) {
  let current = root;
  for (const part of relative.split('/').filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      requireCondition(stat.isDirectory() && !stat.isSymbolicLink(), 'Invalid generated output directory');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      fs.mkdirSync(current);
    }
  }
}

function writeOutputs(root, outputs, check) {
  const rootStat = fs.lstatSync(root);
  requireCondition(path.isAbsolute(root) && rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'Invalid generated output root');
  requireCondition(outputs instanceof Map && outputs.size <= OUTPUT_PATHS.size, 'Invalid generated output collection');
  let totalBytes = 0;
  for (const [relative, content] of outputs) {
    requireCondition(OUTPUT_PATHS.has(relative) && typeof content === 'string', 'Unknown generated output path');
    totalBytes += Buffer.byteLength(content);
  }
  requireCondition(totalBytes <= 32 * 1024 * 1024, 'Review registry exceeds size limit');
  for (const [relative, content] of outputs) {
    const absolute = path.join(root, relative);
    let stat = null;
    try { stat = fs.lstatSync(absolute); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (check) {
      requireCondition(stat && stat.isFile() && !stat.isSymbolicLink(), `Generated file missing: ${relative}`);
      requireCondition(stat.size === Buffer.byteLength(content) && fs.readFileSync(absolute, 'utf8') === content, `Generated file differs: ${relative}`);
      continue;
    }
    ensureDirectory(root, path.posix.dirname(relative));
    if (stat) requireCondition(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Refusing unsafe generated output file');
    if (stat && stat.size === Buffer.byteLength(content) && fs.readFileSync(absolute, 'utf8') === content) continue;
    const descriptor = fs.openSync(absolute, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW, 0o644);
    try { fs.writeFileSync(descriptor, content, 'utf8'); } finally { fs.closeSync(descriptor); }
  }
}

function buildReviewRegistry({ root = PROJECT_ROOT, check = false } = {}) {
  requireCondition(typeof check === 'boolean', 'Invalid check option');
  const { outputs, registry, matrix } = expectedOutputs(root);
  writeOutputs(root, outputs, check);
  return { promptCount: registry.records.length, matrixCellCount: matrix.cells.length, generatedFiles: outputs.size, checked: check };
}

if (require.main === module) {
  try {
    const arguments_ = process.argv.slice(2);
    requireCondition(arguments_.length === 0 || (arguments_.length === 1 && arguments_[0] === '--check'), 'Usage: node scripts/build_review_registry.cjs [--check]');
    const result = buildReviewRegistry({ check: arguments_[0] === '--check' });
    process.stdout.write(`${result.checked ? 'Verified' : 'Generated'} ${result.promptCount} prompt review records and ${result.matrixCellCount} unassessed native-rule cells.\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildReviewRegistry, expectedOutputs, writeOutputs, validateSupportCell };
