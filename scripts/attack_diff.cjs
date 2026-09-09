#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const LIMITS = Object.freeze({bytes: 64 * 1024 * 1024, objects: 50000, depth: 32, nodes: 4000000, string: 1024 * 1024, traversal: 250000});
const DOMAINS = Object.freeze({Enterprise: 'enterprise-attack', Mobile: 'mobile-attack', ICS: 'ics-attack'});
const STIX_ID = /^[a-z][a-z0-9-]{0,79}--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![\s\S])/;
const ATTACK_ID = /^T\d{4}(?:\.\d{3})?(?![\s\S])/;
const ROOT = path.resolve(__dirname, '..');
// Same reviewed manifest pin as build_library.cjs; its file entries bind all three baselines.
const MANIFEST_SHA256 = '2868b0038dc6d6ace411fae5d8098f08895e6581a2b0fe4b9720fdd09512df7d';
const hash = value => createHash('sha256').update(value).digest('hex');
const active = value => Boolean(value) && value.revoked !== true && value.x_mitre_deprecated !== true;
const order = (left, right) => left < right ? -1 : left > right ? 1 : 0;
class DiffError extends Error {}
function requireCondition(condition, message) { if (!condition) throw new DiffError(message); }
function domainId(domain) {
  requireCondition(typeof domain === 'string' && Object.hasOwn(DOMAINS, domain), 'Domain must be Enterprise, Mobile or ICS.');
  return DOMAINS[domain];
}

function readBundleBytes(filename, maximum = LIMITS.bytes) {
  requireCondition(Number.isSafeInteger(maximum) && maximum > 0 && maximum <= LIMITS.bytes, 'Invalid input byte limit.');
  requireCondition(typeof filename === 'string' && filename.length > 0 && filename.length <= 4096
    && path.isAbsolute(filename) && !/[\0-\x1f\x7f]/.test(filename), 'Input must be an absolute local file path.');
  const absolute = path.resolve(filename);
  const inspected = [];
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    requireCondition(!stat.isSymbolicLink(), 'Input path must not contain symbolic links.');
    requireCondition(current === absolute ? stat.isFile() : stat.isDirectory(), 'Input must be a regular file with directory parents.');
    inspected.push({filename: current, stat});
  }
  const descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = fs.fstatSync(descriptor);
    const original = inspected.at(-1)?.stat;
    requireCondition(original && before.dev === original.dev && before.ino === original.ino, 'Input was replaced before it was opened.');
    requireCondition(before.isFile() && before.size <= maximum, 'Input exceeds its regular-file size limit.');
    const chunks = [];
    let total = 0;
    while (total <= maximum) {
      const chunk = Buffer.alloc(Math.min(65536, maximum + 1 - total));
      const count = fs.readSync(descriptor, chunk, 0, chunk.length, null);
      if (!count) break;
      chunks.push(chunk.subarray(0, count));
      total += count;
    }
    const after = fs.fstatSync(descriptor);
    requireCondition(total <= maximum, 'Input exceeds the byte limit.');
    requireCondition(before.dev === after.dev && before.ino === after.ino && before.size === after.size
      && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs && total === after.size, 'Input changed while it was read.');
    for (const entry of inspected) {
      const stat = fs.lstatSync(entry.filename);
      requireCondition(!stat.isSymbolicLink() && stat.dev === entry.stat.dev && stat.ino === entry.stat.ino, 'Input path changed while it was read.');
    }
    return Buffer.concat(chunks, total);
  } finally { fs.closeSync(descriptor); }
}

function parseJson(input) {
  requireCondition(Buffer.isBuffer(input) && input.length <= LIMITS.bytes, 'Input must be bounded bundle bytes.');
  let text;
  try { text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(input); }
  catch { throw new DiffError('Input must contain valid UTF-8.'); }
  let value;
  try { value = JSON.parse(text); } catch { throw new DiffError('Input must contain valid JSON.'); }
  const pending = [[value, 0]];
  let nodes = 0;
  while (pending.length) {
    const [item, depth] = pending.pop();
    requireCondition(++nodes <= LIMITS.nodes && depth <= LIMITS.depth, 'Input exceeds the structure limit.');
    if (typeof item === 'string') requireCondition(item.length <= LIMITS.string, 'Input string exceeds the limit.');
    if (typeof item === 'number') requireCondition(Number.isFinite(item), 'Input contains a non-finite number.');
    if (item && typeof item === 'object') {
      requireCondition(Object.keys(item).length <= 100000, 'Input collection exceeds the limit.');
      for (const [key, child] of Object.entries(item)) {
        requireCondition(key.length <= 256, 'Input field name exceeds the limit.');
        pending.push([child, depth + 1]);
      }
    }
  }
  return value;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort(order).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function techniqueId(record) {
  if (record.type !== 'attack-pattern') return null;
  requireCondition(Array.isArray(record.external_references), 'Technique requires ATT&CK references.');
  const references = record.external_references.filter(reference => reference &&
    ['mitre-attack', 'mitre-mobile-attack', 'mitre-ics-attack'].includes(reference.source_name)
    && typeof reference.external_id === 'string' && ATTACK_ID.test(reference.external_id));
  requireCondition(references.length === 1, 'Technique ATT&CK ID is missing or ambiguous.');
  return references[0].external_id;
}

function indexBundle(input, domain) {
  const expectedDomain = domainId(domain);
  const bundle = parseJson(input);
  requireCondition(bundle && bundle.type === 'bundle' && typeof bundle.id === 'string'
    && STIX_ID.test(bundle.id) && bundle.id.startsWith('bundle--'), 'Invalid STIX bundle identity.');
  requireCondition(Array.isArray(bundle.objects) && bundle.objects.length > 0 && bundle.objects.length <= LIMITS.objects, 'Bundle object count exceeds the limit or is empty.');
  const objects = new Map();
  const techniques = new Map();
  for (const record of bundle.objects) {
    requireCondition(record && typeof record.type === 'string' && typeof record.id === 'string'
      && STIX_ID.test(record.id) && record.id.startsWith(`${record.type}--`), 'Invalid STIX object identity.');
    requireCondition(!objects.has(record.id), 'Duplicate STIX object ID; provide one snapshot per ID.');
    for (const field of ['revoked', 'x_mitre_deprecated']) {
      requireCondition(!Object.hasOwn(record, field) || typeof record[field] === 'boolean', 'Invalid lifecycle flag.');
    }
    if (record.type === 'relationship') requireCondition(typeof record.relationship_type === 'string'
      && /^[a-z][a-z0-9-]{0,79}(?![\s\S])/.test(record.relationship_type)
      && typeof record.source_ref === 'string' && STIX_ID.test(record.source_ref)
      && typeof record.target_ref === 'string' && STIX_ID.test(record.target_ref), 'Invalid relationship endpoints or type.');
    if (record.type === 'x-mitre-detection-strategy' && Object.hasOwn(record, 'x_mitre_analytic_refs')) {
      requireCondition(Array.isArray(record.x_mitre_analytic_refs) && record.x_mitre_analytic_refs.every(ref => typeof ref === 'string'
        && STIX_ID.test(ref) && ref.startsWith('x-mitre-analytic--')), 'Invalid analytic references.');
    }
    if (record.type === 'x-mitre-analytic' && Object.hasOwn(record, 'x_mitre_log_source_references')) {
      requireCondition(Array.isArray(record.x_mitre_log_source_references) && record.x_mitre_log_source_references.every(ref => ref
        && typeof ref.x_mitre_data_component_ref === 'string' && STIX_ID.test(ref.x_mitre_data_component_ref)
        && ref.x_mitre_data_component_ref.startsWith('x-mitre-data-component--')), 'Invalid data component references.');
    }
    const externalId = techniqueId(record);
    if (externalId) {
      requireCondition(Array.isArray(record.x_mitre_domains) && record.x_mitre_domains.includes(expectedDomain), 'Technique domain does not match the selected domain.');
      requireCondition(!techniques.has(externalId), 'Duplicate technique ATT&CK ID.');
      techniques.set(externalId, record);
    }
    objects.set(record.id, record);
  }
  const collections = bundle.objects.filter(record => record.type === 'x-mitre-collection');
  requireCondition(collections.length === 1 && typeof collections[0].x_mitre_version === 'string'
    && collections[0].x_mitre_version.length > 0 && collections[0].x_mitre_version.length <= 128, 'A single versioned ATT&CK collection is required.');
  requireCondition(techniques.size > 0, 'A domain snapshot must contain technique objects.');
  const collection = collections[0];
  return {objects, techniques, metadata: {
    sha256: hash(input), bytes: input.length, bundleId: bundle.id,
    collectionId: collection.id, collectionVersion: collection.x_mitre_version,
    objectCount: objects.size,
  }};
}

function objectContent(record) {
  if (!record) return null;
  // The omitted STIX revocation/ATT&CK deprecation flags default to false.
  return Object.fromEntries(Object.entries(record).filter(([key, value]) => !(['revoked', 'x_mitre_deprecated'].includes(key) && value === false)));
}

function changeRecord(before, after) {
  const left = objectContent(before);
  const right = objectContent(after);
  const record = after || before;
  return {
    stixId: record.id, type: record.type, attackId: techniqueId(record),
    beforeSha256: left ? hash(canonical(left)) : null,
    afterSha256: right ? hash(canonical(right)) : null,
    changedFields: before && after ? [...new Set([...Object.keys(left), ...Object.keys(right)])]
      .filter(key => canonical(Object.hasOwn(left, key) ? left[key] : undefined)
        !== canonical(Object.hasOwn(right, key) ? right[key] : undefined)).sort(order) : [],
  };
}

function dependencies(snapshot) {
  const result = new Map();
  let traversed = 0;
  const visit = () => requireCondition(++traversed <= LIMITS.traversal, 'Dependency traversal exceeds the limit.');
  const add = (reference, promptId) => {
    visit();
    if (!result.has(reference)) result.set(reference, new Set());
    result.get(reference).add(promptId);
  };
  const activeTechniques = new Map();
  const activeTechnique = stixId => activeTechniques.get(stixId) || null;
  const tactics = new Map();
  for (const record of snapshot.objects.values()) {
    visit();
    if (record.type === 'x-mitre-tactic' && active(record)) tactics.set(record.x_mitre_shortname, record.id);
  }
  for (const [promptId, record] of snapshot.techniques) {
    visit();
    if (!active(record)) continue;
    activeTechniques.set(record.id, promptId);
    add(record.id, promptId);
    if (Array.isArray(record.kill_chain_phases)) for (const phase of record.kill_chain_phases) {
      visit();
      const tactic = tactics.get(phase?.phase_name);
      if (tactic) add(tactic, promptId);
    }
  }
  for (const relation of snapshot.objects.values()) {
    visit();
    if (relation.type !== 'relationship' || !active(relation)) continue;
    const source = snapshot.objects.get(relation.source_ref);
    const targetPrompt = activeTechnique(relation.target_ref);
    if (relation.relationship_type === 'subtechnique-of' && targetPrompt) {
      const childPrompt = activeTechnique(relation.source_ref);
      if (childPrompt) { add(relation.id, childPrompt); add(relation.target_ref, childPrompt); }
    }
    if (!targetPrompt || !active(source)) continue;
    if (relation.relationship_type === 'uses' && ['intrusion-set', 'malware', 'tool', 'campaign'].includes(source.type)) {
      add(relation.id, targetPrompt);
      add(source.id, targetPrompt);
    }
    if (relation.relationship_type !== 'detects' || source.type !== 'x-mitre-detection-strategy') continue;
    add(relation.id, targetPrompt);
    add(source.id, targetPrompt);
    for (const reference of source.x_mitre_analytic_refs || []) {
      visit();
      const analytic = snapshot.objects.get(reference);
      if (analytic?.type !== 'x-mitre-analytic' || !active(analytic)) continue;
      add(reference, targetPrompt);
      for (const log of analytic.x_mitre_log_source_references || []) add(log.x_mitre_data_component_ref, targetPrompt);
    }
  }
  return result;
}

function compareBundles({domain, baselineBytes, candidateBytes}) {
  const baseline = indexBundle(baselineBytes, domain);
  const candidate = indexBundle(candidateBytes, domain);
  const changes = {added: [], changed: [], removed: [], revoked: [], deprecated: []};
  const affectedIds = new Set();
  const ids = [...new Set([...baseline.objects.keys(), ...candidate.objects.keys()])].sort(order);
  for (const stixId of ids) {
    const before = baseline.objects.get(stixId);
    const after = candidate.objects.get(stixId);
    const change = changeRecord(before, after);
    if (change.beforeSha256 === change.afterSha256) continue;
    affectedIds.add(stixId);
    changes[!before ? 'added' : !after ? 'removed' : 'changed'].push(change);
    if (before && after?.revoked === true && before.revoked !== true) changes.revoked.push(change);
    if (before && after?.x_mitre_deprecated === true && before.x_mitre_deprecated !== true) changes.deprecated.push(change);
  }
  const existing = new Set([...baseline.techniques].filter(([, record]) => active(record)).map(([id]) => id));
  const impacts = new Set();
  for (const dependencyMap of [dependencies(baseline), dependencies(candidate)]) {
    for (const stixId of affectedIds) for (const promptId of dependencyMap.get(stixId) || []) {
      if (existing.has(promptId)) impacts.add(promptId);
    }
  }
  return {
    schemaVersion: 'pad-attack-diff/v1', status: 'proposed', domain, domainId: domainId(domain),
    baseline: baseline.metadata, candidate: candidate.metadata, changes,
    impactedPromptIds: [...impacts].sort(order),
    newTechniqueIds: [...candidate.techniques].filter(([id, record]) => active(record) && !existing.has(id)).map(([id]) => id).sort(order),
    limitations: [
      'This is a local comparison proposal, not an approved source upgrade or detection validation.',
      'Candidate bytes and claimed collection version are unauthenticated user-supplied data.',
      'Removed means absent from this candidate snapshot, not revoked; an incomplete snapshot can overstate removal.',
      'Revoked and deprecated contain newly true flags on existing objects and overlap changed.',
      'Impact follows the library dependency paths in both snapshots; it does not prove prompt bytes would change.',
      'This tool checks bounded structure and relevant identifiers, not the complete STIX/ATT&CK schema or versioning rules.',
    ],
  };
}

function proposeAttackDiff({domain, candidatePath}) {
  const selectedDomain = domainId(domain);
  const candidateBytes = readBundleBytes(candidatePath);
  const sourceRoot = path.join(ROOT, 'sources', 'attack-19.2');
  const manifestBytes = readBundleBytes(path.join(sourceRoot, 'manifest.json'), 100000);
  requireCondition(hash(manifestBytes) === MANIFEST_SHA256, 'Pinned source manifest checksum does not match.');
  const manifest = parseJson(manifestBytes);
  requireCondition(manifest.requested_release === 'v19.2', 'Pinned source release does not match.');
  const relative = `raw/${selectedDomain}-19.2.json`;
  const pin = manifest.files.find(file => file.path === relative);
  requireCondition(Boolean(pin), 'Pinned domain bundle is missing from the manifest.');
  const baselineBytes = readBundleBytes(path.join(sourceRoot, relative));
  requireCondition(baselineBytes.length === pin.bytes && hash(baselineBytes) === pin.sha256, 'Pinned domain bundle checksum does not match.');
  const report = compareBundles({domain, baselineBytes, candidateBytes});
  report.baseline.pinnedSource = {release: manifest.requested_release, commitSha: manifest.commit_sha, manifestSha256: MANIFEST_SHA256};
  return report;
}

function parseArguments(args) {
  requireCondition(Array.isArray(args) && args.length === 4, 'Usage: node scripts/attack_diff.cjs --domain Enterprise|Mobile|ICS --candidate /absolute/local/bundle.json');
  const options = Object.create(null);
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    requireCondition(['--domain', '--candidate'].includes(option) && !Object.hasOwn(options, option), 'Only one --domain and one --candidate are accepted.');
    requireCondition(typeof args[index + 1] === 'string' && args[index + 1].length > 0, 'Every option requires a value.');
    options[option] = args[index + 1];
  }
  domainId(options['--domain']);
  return {domain: options['--domain'], candidatePath: options['--candidate']};
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
      process.stdout.write('Read-only ATT&CK comparison proposal; no network, source upgrade or file writes.\nUsage: node scripts/attack_diff.cjs --domain Enterprise|Mobile|ICS --candidate /absolute/local/bundle.json\nJSON report to stdout; JSON errors to stderr. Candidate limit: 64 MiB, 50,000 objects.\n');
    } else process.stdout.write(`${JSON.stringify(proposeAttackDiff(parseArguments(args)))}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({error: {code: 'invalid_comparison', message: error instanceof DiffError ? error.message : 'Could not read or compare the local bundle.'}})}\n`);
    process.exitCode = 1;
  }
}

module.exports = {LIMITS, readBundleBytes, compareBundles, proposeAttackDiff};
