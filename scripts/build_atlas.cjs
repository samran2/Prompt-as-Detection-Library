'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const core = require('../demo/core.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRECTORY = 'sources/atlas-2026.08';
const CONTENT_VERSION = '2026.08';
const FORMAT_VERSION = '6.0.0';
const SOURCE_COMMIT = '41d4f5ca4112f0e492ffaa3ebff07dc80a75afa5';
const SOURCE_TAG_OBJECT = 'b86134041efd5eac8038f9e56e40b262f511ac1e';
const MANIFEST_PIN = [2748, '4ee16b5b2ebbc917f926fa6c8eb90368746c1cc3bfce43b5d49702ad2d17cdaa'];
const SOURCE_PINS = Object.freeze([
  ['raw/ATLAS-2026.08.yaml', 808834, 'a8d32f676854cc57721c217ec5b39f07db518076dee4a6c1335df0a7bc8271a2'],
  ['raw/LICENSE.txt', 551, 'fa6c92ab3dc75d41413884e8b38cc54cd4e72f4c8f68fc7e77824e48e3047d40'],
  ['raw/APACHE-2.0.txt', 11358, 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30'],
  ['raw/README.md', 7124, '757dbd6f0eb86159eac808ab56ab63f0e0a88ae485743fcdd2a78e3982620002'],
  ['raw/manifest.yaml', 6246, '666c4abcb291348e68d7caa07126413cde3def780d5de9819d34af43fdb81d24'],
  ['derived/ATLAS-2026.08.json', 926421, 'e70433e5faeb022e09d637d87b56eb09befba7496dd05283ea4ca94ab80f0224'],
]);
const TOP_LEVEL_KEYS = ['format-version', 'collection', 'matrix', 'tactics', 'techniques', 'mitigations', 'case-studies', 'relationships'];
const RELATION_TYPES = ['sequences', 'achieves', 'specializes', 'mitigates', 'employs'];
const MATURITY = new Set(['Feasible', 'Demonstrated', 'Realized']);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };

function pathPrefixes(input, pathApi = path) {
  const absolute = pathApi.resolve(input);
  const root = pathApi.parse(absolute).root;
  let current = root;
  return absolute.slice(root.length).split(pathApi.sep).filter(Boolean).map(part => {
    current = pathApi.join(current, part);
    return current;
  });
}

function inspectPath(input, allowMissing = false) {
  const absolute = path.resolve(input);
  for (const current of pathPrefixes(absolute)) {
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) {
      if (allowMissing && error.code === 'ENOENT') return null;
      throw error;
    }
    requireCondition(!stat.isSymbolicLink(), 'Refusing symbolic link path');
    if (current !== absolute) requireCondition(stat.isDirectory(), 'Invalid parent directory');
  }
  return fs.lstatSync(absolute);
}

function object(value, label) {
  requireCondition(value !== null && typeof value === 'object' && !Array.isArray(value), `Invalid ${label}`);
  return value;
}

function exactKeys(value, allowed, label) {
  object(value, label);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  requireCondition(unknown.length === 0, `Unknown ${label} field`);
}

function string(value, label, empty = false) {
  requireCondition(typeof value === 'string' && value.length <= 1_000_000 && (empty || value.trim()), `Invalid ${label}`);
  return value;
}

function array(value, label, maximum = 100_000) {
  requireCondition(Array.isArray(value) && value.length <= maximum, `Invalid ${label}`);
  return value;
}

function strings(value, label) {
  return array(value, label).map(item => string(item, label));
}

function verifyFile(root, relative, expectedBytes, expectedHash) {
  const filename = path.join(root, SOURCE_DIRECTORY, relative);
  const stat = inspectPath(filename);
  requireCondition(stat.isFile() && stat.nlink === 1 && stat.size === expectedBytes, `Source integrity size mismatch: ${relative}`);
  const bytes = fs.readFileSync(filename);
  requireCondition(sha256(bytes) === expectedHash, `Source integrity checksum mismatch: ${relative}`);
  return bytes;
}

function verifySourceTree(root) {
  const sourceRoot = path.join(root, SOURCE_DIRECTORY);
  const allowed = new Set(['manifest.json', ...SOURCE_PINS.map(([relative]) => relative)]);
  const walk = relative => {
    const absolute = path.join(sourceRoot, relative);
    const stat = inspectPath(absolute);
    requireCondition(stat.isDirectory(), 'Invalid ATLAS source directory');
    for (const entry of fs.readdirSync(absolute)) {
      const child = relative ? `${relative}/${entry}` : entry;
      const childStat = inspectPath(path.join(sourceRoot, child));
      if (childStat.isDirectory()) {
        requireCondition(['raw', 'derived'].includes(child), `Unexpected ATLAS source path: ${child}`);
        walk(child);
      } else requireCondition(childStat.isFile() && allowed.has(child), `Unexpected ATLAS source path: ${child}`);
    }
  };
  walk('');
}

function loadSources(root = PROJECT_ROOT) {
  verifySourceTree(root);
  const manifestBytes = verifyFile(root, 'manifest.json', ...MANIFEST_PIN);
  const manifest = JSON.parse(manifestBytes);
  requireCondition(manifest.framework === 'MITRE ATLAS' && manifest.requestedRelease === 'v2026.08'
    && manifest.contentVersion === CONTENT_VERSION && manifest.formatVersion === FORMAT_VERSION,
  'Source manifest release integrity mismatch');
  requireCondition(manifest.tag?.objectSha === SOURCE_TAG_OBJECT && manifest.tag?.commitSha === SOURCE_COMMIT
    && manifest.tag?.signatureVerified === false, 'Source manifest tag integrity mismatch');
  requireCondition(manifest.license?.spdx === 'Apache-2.0' && manifest.license?.path === 'raw/LICENSE.txt'
    && manifest.license?.fullTextPath === 'raw/APACHE-2.0.txt', 'Source manifest license integrity mismatch');
  const buffers = new Map();
  for (const pin of SOURCE_PINS) buffers.set(pin[0], verifyFile(root, ...pin));
  for (const entry of manifest.files) {
    const pin = SOURCE_PINS.find(([relative]) => relative === entry.path);
    requireCondition(pin && entry.bytes === pin[1] && entry.sha256 === pin[2], 'Source manifest file pin mismatch');
  }
  const derived = manifest.derivedSource;
  const derivedPin = SOURCE_PINS.find(([relative]) => relative === derived?.path);
  requireCondition(derivedPin && derived.bytes === derivedPin[1] && derived.sha256 === derivedPin[2], 'Derived source pin mismatch');
  const data = JSON.parse(buffers.get('derived/ATLAS-2026.08.json'));
  return {
    manifest, manifestBytes, data,
    licenseNotice: buffers.get('raw/LICENSE.txt').toString('utf8'),
    fullLicense: buffers.get('raw/APACHE-2.0.txt').toString('utf8'),
  };
}

function sourceObjectType(id) {
  if (id === 'ATLAS-matrix') return 'matrix';
  if (/^AML\.TA\d{4}$/.test(id)) return 'tactic';
  if (/^AML\.T\d{4}(?:\.\d{3})?$/.test(id)) return 'technique';
  if (/^AML\.M\d{4}$/.test(id)) return 'mitigation';
  if (/^AML\.CS\d{4}$/.test(id)) return 'case-study';
  throw new Error('Invalid ATLAS object ID');
}

function validateReference(reference) {
  exactKeys(reference, ['id', 'title', 'url'], 'ATLAS reference');
  string(reference.id, 'ATLAS reference id');
  string(reference.title, 'ATLAS reference title');
  requireCondition(/^https?:\/\//.test(string(reference.url, 'ATLAS reference URL')), 'Invalid ATLAS reference URL');
}

function validateAttackReference(reference) {
  exactKeys(reference, ['id', 'url'], 'ATT&CK reference');
  string(reference.id, 'ATT&CK reference id');
  requireCondition(/^https:\/\/attack\.mitre\.org\//.test(string(reference.url, 'ATT&CK reference URL')), 'Invalid ATT&CK reference URL');
}

const BASE_FIELDS = ['name', 'description', 'references', 'created-date', 'modified-date', 'id', 'uuid', 'object-type'];
const TYPE_FIELDS = Object.freeze({
  tactic: [...BASE_FIELDS, 'attack-reference'],
  technique: [...BASE_FIELDS, 'maturity', 'platforms', 'attack-reference'],
  mitigation: [...BASE_FIELDS, 'lifecycle-phases', 'categories', 'attack-reference'],
  'case-study': [...BASE_FIELDS, 'type', 'actor', 'target', 'reporter', 'date', 'date-granularity'],
});

function validateAtlasObject(id, value, expectedType) {
  exactKeys(value, TYPE_FIELDS[expectedType], `${expectedType} object`);
  requireCondition(value.id === id && value['object-type'] === expectedType && sourceObjectType(id) === expectedType,
    `Invalid ${expectedType} identity`);
  for (const field of ['name', 'description', 'created-date', 'modified-date', 'uuid']) string(value[field], `${expectedType} ${field}`, field === 'description');
  array(value.references, `${expectedType} references`).forEach(validateReference);
  if (value['attack-reference'] !== undefined) validateAttackReference(value['attack-reference']);
  if (expectedType === 'technique') {
    requireCondition(MATURITY.has(value.maturity), 'Invalid ATLAS source maturity');
    strings(value.platforms, 'ATLAS platforms');
  } else if (expectedType === 'mitigation') {
    strings(value['lifecycle-phases'], 'ATLAS mitigation lifecycle phases');
    strings(value.categories, 'ATLAS mitigation categories');
  } else if (expectedType === 'case-study') {
    requireCondition(['Exercise', 'Incident'].includes(value.type), 'Invalid ATLAS case-study type');
    for (const field of ['actor', 'target', 'date', 'date-granularity']) string(value[field], `case-study ${field}`);
    if (value.reporter !== undefined) string(value.reporter, 'case-study reporter', true);
  }
}

function normalizedRelationship(sourceId, type, value, index, allIds) {
  exactKeys(value, ['source', 'target', 'relationship-type', 'description', 'tactic', 'step-id', 'leads-to', 'position'], 'ATLAS relationship');
  requireCondition(value.source === sourceId && value['relationship-type'] === type && allIds.has(value.target), 'Invalid ATLAS relationship identity');
  if (value.description !== undefined) string(value.description, 'ATLAS relationship description', true);
  if (value.tactic !== undefined) requireCondition(/^AML\.TA\d{4}$/.test(value.tactic) && allIds.has(value.tactic), 'Invalid relationship tactic');
  if (value['step-id'] !== undefined) requireCondition(/^S\d{2}$/.test(value['step-id']), 'Invalid relationship step ID');
  const leadsTo = value['leads-to'] === undefined ? [] : strings(value['leads-to'], 'relationship leads-to');
  if (value.position !== undefined) requireCondition(Number.isSafeInteger(value.position) && value.position > 0, 'Invalid relationship position');
  const sourceType = sourceObjectType(sourceId);
  const targetType = sourceObjectType(value.target);
  const expected = {
    sequences: ['matrix', 'tactic'], achieves: ['technique', 'tactic'], specializes: ['technique', 'technique'],
    mitigates: ['mitigation', 'technique'], employs: ['case-study', 'technique'],
  }[type];
  requireCondition(expected[0] === sourceType && expected[1] === targetType, 'Invalid ATLAS relationship endpoint types');
  return {
    id: `atlas:${sourceId}:${type}:${String(index + 1).padStart(4, '0')}`,
    framework: 'ATLAS', type,
    source: {type: sourceType, id: sourceId}, target: {type: targetType, id: value.target},
    sourceId, targetId: value.target,
    description: value.description ?? null, tacticId: value.tactic ?? null,
    stepId: value['step-id'] ?? null, leadsTo, position: value.position ?? null,
  };
}

function normalizedReferences(id, url, rawReferences) {
  return [
    {source_name: 'mitre-atlas', external_id: id, url},
    ...rawReferences.map(reference => ({source_name: reference.id, title: reference.title, url: reference.url})),
  ];
}

function resourceUrl(type, id) {
  const section = type === 'case-study' ? 'studies' : `${type}s`;
  return `https://atlas.mitre.org/${section}/${id}`;
}

function linkedCaseStudy(raw, relationships) {
  const url = resourceUrl('case-study', raw.id);
  return {
    id: raw.id, name: raw.name, description: raw.description, url,
    caseStudyType: raw.type, actor: raw.actor, target: raw.target,
    date: raw.date, dateGranularity: raw['date-granularity'], reporter: raw.reporter ?? null,
    references: normalizedReferences(raw.id, url, raw.references), relationships,
  };
}

function linkedMitigation(raw, relationships) {
  const url = resourceUrl('mitigation', raw.id);
  return {
    id: raw.id, name: raw.name, description: raw.description, url,
    lifecyclePhases: raw['lifecycle-phases'], categories: raw.categories,
    references: normalizedReferences(raw.id, url, raw.references), relationships,
  };
}

function convertAtlas(data) {
  exactKeys(data, TOP_LEVEL_KEYS, 'ATLAS export');
  requireCondition(data['format-version'] === FORMAT_VERSION, 'Unexpected ATLAS format version');
  exactKeys(data.collection, [...BASE_FIELDS, 'version'], 'ATLAS collection');
  exactKeys(data.matrix, BASE_FIELDS, 'ATLAS matrix');
  requireCondition(data.collection.id === 'ATLAS-collection' && data.collection.version === CONTENT_VERSION
    && data.collection['object-type'] === 'collection', 'Unexpected ATLAS collection');
  requireCondition(data.matrix.id === 'ATLAS-matrix' && data.matrix['object-type'] === 'matrix', 'Unexpected ATLAS matrix');

  const maps = {
    tactics: object(data.tactics, 'ATLAS tactics'), techniques: object(data.techniques, 'ATLAS techniques'),
    mitigations: object(data.mitigations, 'ATLAS mitigations'), caseStudies: object(data['case-studies'], 'ATLAS case studies'),
  };
  for (const [id, value] of Object.entries(maps.tactics)) validateAtlasObject(id, value, 'tactic');
  for (const [id, value] of Object.entries(maps.techniques)) validateAtlasObject(id, value, 'technique');
  for (const [id, value] of Object.entries(maps.mitigations)) validateAtlasObject(id, value, 'mitigation');
  for (const [id, value] of Object.entries(maps.caseStudies)) validateAtlasObject(id, value, 'case-study');
  requireCondition(Object.keys(maps.tactics).length === 16 && Object.keys(maps.techniques).length === 197
    && Object.keys(maps.mitigations).length === 39 && Object.keys(maps.caseStudies).length === 72,
  'Pinned ATLAS inventory mismatch');

  const allIds = new Set(['ATLAS-matrix', ...Object.keys(maps.tactics), ...Object.keys(maps.techniques),
    ...Object.keys(maps.mitigations), ...Object.keys(maps.caseStudies)]);
  const relationGroups = object(data.relationships, 'ATLAS relationships');
  const relationships = [];
  for (const sourceId of Object.keys(relationGroups).sort(compare)) {
    requireCondition(allIds.has(sourceId), 'Unknown ATLAS relationship source');
    exactKeys(relationGroups[sourceId], RELATION_TYPES, 'ATLAS relationship group');
    for (const type of RELATION_TYPES) {
      if (relationGroups[sourceId][type] === undefined) continue;
      array(relationGroups[sourceId][type], `${type} relationships`).forEach((value, index) => {
        relationships.push(normalizedRelationship(sourceId, type, value, index, allIds));
      });
    }
  }
  const relationshipCounts = Object.fromEntries(RELATION_TYPES.map(type => [type, relationships.filter(item => item.type === type).length]));
  requireCondition(relationships.length === 1318 && relationshipCounts.sequences === 16 && relationshipCounts.achieves === 214
    && relationshipCounts.specializes === 83 && relationshipCounts.mitigates === 346 && relationshipCounts.employs === 659,
  'Pinned ATLAS relationship count mismatch');

  const parents = new Map();
  for (const relation of relationships.filter(item => item.type === 'specializes')) {
    requireCondition(!parents.has(relation.sourceId), 'Invalid ATLAS parent relationship');
    parents.set(relation.sourceId, relation.targetId);
  }
  const caseRelations = new Map();
  const mitigationRelations = new Map();
  for (const relation of relationships) {
    const target = relation.type === 'employs' ? caseRelations : relation.type === 'mitigates' ? mitigationRelations : null;
    if (!target) continue;
    if (!target.has(relation.targetId)) target.set(relation.targetId, new Map());
    const grouped = target.get(relation.targetId);
    if (!grouped.has(relation.sourceId)) grouped.set(relation.sourceId, []);
    grouped.get(relation.sourceId).push(relation);
  }

  const records = Object.values(maps.techniques).map(raw => {
    const kind = /^AML\.T\d{4}\.\d{3}$/.test(raw.id) ? 'subtechnique' : 'technique';
    const parentId = parents.get(raw.id) || null;
    requireCondition((kind === 'subtechnique') === Boolean(parentId), 'Invalid ATLAS sub-technique parent coverage');
    const achieves = relationships.filter(item => item.type === 'achieves' && item.sourceId === raw.id);
    requireCondition(achieves.length > 0, 'ATLAS technique has no tactic relationship');
    const sourceUrl = resourceUrl('technique', raw.id);
    const studies = [...(caseRelations.get(raw.id) || new Map())]
      .map(([id, links]) => linkedCaseStudy(maps.caseStudies[id], links));
    const mitigations = [...(mitigationRelations.get(raw.id) || new Map())]
      .map(([id, links]) => linkedMitigation(maps.mitigations[id], links));
    return {
      framework: 'ATLAS', domain: 'ATLAS', atlasVersion: CONTENT_VERSION, contentVersion: CONTENT_VERSION,
      id: raw.id, name: raw.name, kind, parentId, parentName: parentId ? maps.techniques[parentId].name : null,
      tactics: achieves.map(item => maps.tactics[item.targetId].name), platforms: [...raw.platforms],
      behavior: raw.description, sourceUrl, references: normalizedReferences(raw.id, sourceUrl, raw.references),
      sourceMaturity: raw.maturity, caseStudies: studies, mitigations,
      projectGuidance: {telemetry: [], falsePositives: []},
      telemetry: [], strategies: [], procedureCount: 0, procedureExamples: [],
    };
  }).sort((left, right) => compare(left.id, right.id));
  requireCondition(records.filter(record => record.kind === 'technique').length === 114
    && records.filter(record => record.kind === 'subtechnique').length === 83, 'Pinned ATLAS technique count mismatch');
  const maturityCounts = Object.fromEntries([...MATURITY].map(maturity => [maturity, records.filter(record => record.sourceMaturity === maturity).length]));
  requireCondition(maturityCounts.Feasible === 18 && maturityCounts.Demonstrated === 84 && maturityCounts.Realized === 95,
    'Pinned ATLAS maturity count mismatch');
  return {
    records,
    tactics: Object.values(maps.tactics), mitigations: Object.values(maps.mitigations), caseStudies: Object.values(maps.caseStudies),
    relationships, relationshipCounts, maturityCounts,
  };
}

function renderCatalog(records) {
  const literal = JSON.stringify(records).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `(function (root) {\n  'use strict';\n  // Generated from pinned MITRE ATLAS v2026.08 under Apache-2.0. See ATLAS_LICENSE.txt.\n  // Catalog completeness and source maturity do not establish detection validation.\n  const records = ${literal};\n  const catalog = Object.freeze(records.map(record => Object.freeze(record)));\n  if (typeof module !== 'undefined' && module.exports) module.exports = catalog;\n  else root.PAD_ATLAS_CATALOG = catalog;\n})(globalThis);\n`;
}

function json(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function expectedOutputs(root = PROJECT_ROOT) {
  const source = loadSources(root);
  const converted = convertAtlas(source.data);
  const outputs = new Map();
  outputs.set('demo/atlas-catalog.js', renderCatalog(converted.records));
  outputs.set('demo/ATLAS_LICENSE.txt', `MITRE ATLAS source notice (verbatim):\n\n${source.licenseNotice.trimEnd()}\n\nFull Apache License 2.0 text:\n\n${source.fullLicense}`);
  outputs.set('content/atlas/catalog.json', json(converted.records));
  outputs.set('content/atlas/relationships.json', json(converted.relationships));
  for (const record of converted.records) outputs.set(`content/atlas/prompts/${record.id}.txt`, core.composePrompt(record));
  const promptRecords = converted.records.map(record => {
    const relative = `content/atlas/prompts/${record.id}.txt`;
    const prompt = outputs.get(relative);
    return {
      id: record.id, techniqueId: record.id, framework: 'ATLAS', domain: 'ATLAS', atlasVersion: CONTENT_VERSION,
      status: 'generated', sourceMaturity: record.sourceMaturity,
      prompt: {path: relative, bytes: Buffer.byteLength(prompt), sha256: sha256(prompt),
        generation: {catalogBuilder: 'scripts/build_atlas.cjs', composer: 'demo/core.js', mode: 'detect', target: 'Platform-neutral'}},
    };
  });
  outputs.set('content/atlas/index.json', json({
    schemaVersion: 1, framework: 'ATLAS', atlasVersion: CONTENT_VERSION, contentVersion: CONTENT_VERSION,
    scope: 'Every technique and sub-technique present in the pinned ATLAS v2026.08 format-v6 distribution.',
    caveat: 'Source maturity and prompt coverage do not establish human review, product compatibility or detection effectiveness.',
    totals: {prompts: promptRecords.length, statuses: {generated: promptRecords.length, reviewed: 0, 'lab-validated': 0, 'field-confirmed': 0}},
    records: promptRecords,
  }));
  const generatedFiles = [...outputs].map(([file, content]) => ({path: file, bytes: Buffer.byteLength(content), sha256: sha256(content)}))
    .sort((left, right) => compare(left.path, right.path));
  const sourceManifestPath = `${SOURCE_DIRECTORY}/manifest.json`;
  const coverage = {
    schemaVersion: 1, framework: 'ATLAS', atlasVersion: CONTENT_VERSION, contentVersion: CONTENT_VERSION,
    formatVersion: FORMAT_VERSION, sourceCommit: SOURCE_COMMIT,
    sourceManifest: {path: sourceManifestPath, bytes: source.manifestBytes.length, sha256: sha256(source.manifestBytes)},
    sourceLicense: `${SOURCE_DIRECTORY}/${source.manifest.license.path}`,
    status: 'source-backed generated drafts; not human reviewed or operationally validated',
    scope: 'All techniques and sub-techniques present in the pinned ATLAS v2026.08 format-v6 distribution. Coverage is catalog completeness, not detection effectiveness.',
    recordPolicy: source.manifest.recordPolicy,
    counts: {
      recordCount: converted.records.length,
      techniques: converted.records.filter(record => record.kind === 'technique').length,
      subtechniques: converted.records.filter(record => record.kind === 'subtechnique').length,
      tactics: converted.tactics.length, mitigations: converted.mitigations.length,
      caseStudies: converted.caseStudies.length, relationships: converted.relationships.length,
      prompts: promptRecords.length,
    },
    relationshipCounts: converted.relationshipCounts, maturityCounts: converted.maturityCounts,
    sourceFiles: SOURCE_PINS.map(([file, bytes, digest]) => ({path: `${SOURCE_DIRECTORY}/${file}`, bytes, sha256: digest})),
    generatedFiles,
  };
  outputs.set('content/atlas/coverage.json', json(coverage));
  return {outputs, coverage, records: converted.records, relationships: converted.relationships};
}

function permittedOutput(relative) {
  return ['demo/atlas-catalog.js', 'demo/ATLAS_LICENSE.txt', 'content/atlas/catalog.json',
    'content/atlas/relationships.json', 'content/atlas/index.json', 'content/atlas/coverage.json'].includes(relative)
    || /^content\/atlas\/prompts\/AML\.T\d{4}(?:\.\d{3})?\.txt$/.test(relative);
}

function writeOutputs(root, outputs, check) {
  const directories = new Set(['content', 'content/atlas', 'content/atlas/prompts', 'demo']);
  let totalBytes = 0;
  for (const [relative, content] of outputs) {
    requireCondition(permittedOutput(relative), 'Unknown generated ATLAS path');
    requireCondition(typeof content === 'string' && Buffer.byteLength(content) <= 32 * 1024 * 1024, 'Generated ATLAS output exceeds size limit');
    totalBytes += Buffer.byteLength(content);
    const stat = inspectPath(path.join(root, relative), true);
    if (stat) requireCondition(stat.isFile() && stat.nlink === 1, 'Refusing nonregular generated ATLAS file');
  }
  requireCondition(outputs.size <= 210 && totalBytes <= 64 * 1024 * 1024, 'Generated ATLAS library exceeds size limit');
  const contentRoot = path.join(root, 'content/atlas');
  const walk = relative => {
    const absolute = path.join(root, relative);
    const stat = inspectPath(absolute, true);
    if (!stat) return;
    if (stat.isDirectory()) {
      requireCondition(directories.has(relative), 'Unknown generated ATLAS directory');
      for (const entry of fs.readdirSync(absolute)) walk(`${relative}/${entry}`);
    } else requireCondition(outputs.has(relative), `Unknown generated ATLAS path: ${relative}`);
  };
  if (inspectPath(contentRoot, true)) walk('content/atlas');
  if (check) {
    for (const [relative, content] of outputs) {
      const absolute = path.join(root, relative);
      const stat = inspectPath(absolute, true);
      requireCondition(stat?.isFile() && stat.size === Buffer.byteLength(content)
        && fs.readFileSync(absolute, 'utf8') === content, `Generated ATLAS file differs: ${relative}`);
    }
    return;
  }
  for (const relative of [...directories].sort((left, right) => left.split('/').length - right.split('/').length || compare(left, right))) {
    const absolute = path.join(root, relative);
    const stat = inspectPath(absolute, true);
    if (!stat) fs.mkdirSync(absolute);
    else requireCondition(stat.isDirectory(), 'Invalid generated ATLAS directory');
  }
  for (const [relative, content] of outputs) {
    const absolute = path.join(root, relative);
    const stat = inspectPath(absolute, true);
    if (stat && stat.size === Buffer.byteLength(content) && fs.readFileSync(absolute, 'utf8') === content) continue;
    const descriptor = fs.openSync(absolute, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW, 0o644);
    try { fs.writeFileSync(descriptor, content, 'utf8'); } finally { fs.closeSync(descriptor); }
  }
}

function buildAtlas({root = PROJECT_ROOT, check = false} = {}) {
  requireCondition(typeof check === 'boolean', 'Invalid ATLAS check option');
  const {outputs, coverage} = expectedOutputs(root);
  writeOutputs(root, outputs, check);
  return {checked: check, promptCount: coverage.counts.prompts, relationshipCount: coverage.counts.relationships, generatedFiles: outputs.size};
}

if (require.main === module) {
  try {
    const arguments_ = process.argv.slice(2);
    requireCondition(arguments_.length === 0 || (arguments_.length === 1 && arguments_[0] === '--check'),
      'Usage: node scripts/build_atlas.cjs [--check]');
    const result = buildAtlas({check: arguments_[0] === '--check'});
    process.stdout.write(`${result.checked ? 'Verified' : 'Generated'} ${result.promptCount} ATLAS prompts and ${result.relationshipCount} source relationships.\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {loadSources, convertAtlas, renderCatalog, expectedOutputs, writeOutputs, buildAtlas, pathPrefixes};
