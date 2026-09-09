'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const core = require('../demo/core.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRECTORY = 'sources/attack-19.2';
const COMMIT = '6cda5ad8462c79e14fbb872f4e09059b18e0cfc4';
const TAG_OBJECT = 'e400737ebdbfd36b72c63181257de7a2759c5945';
const DOMAINS = [
  { id: 'enterprise-attack', name: 'Enterprise', directory: 'enterprise', count: 697 },
  { id: 'mobile-attack', name: 'Mobile', directory: 'mobile', count: 124 },
  { id: 'ics-attack', name: 'ICS', directory: 'ics', count: 97 },
];
// Reviewed pins are independent of the adjacent, user-readable source manifest.
const SOURCE_PINS = [
  ['raw/tag-ref.json', 398, 'bc292534cf22774fe2c3aa71a48c8fcfd181c26c01b28fa23726b6b5a05ec8ff'],
  ['raw/tag-object.json', 814, 'd0a0acaa16c65c9284826a447724b0ad46e252db9f77c17df252acd3e8cf92ee'],
  ['raw/enterprise-attack-19.2.json', 53835637, 'dc1639caa5501d720e280cf1cbd8fbe009884a0c9b3e6e9ed9d0c25166c3d8f4'],
  ['raw/mobile-attack-19.2.json', 5750325, 'acfa5ca2d93484476f79bf38590e2b55bb675fc0ce85e76bffa0af2c82dada64'],
  ['raw/ics-attack-19.2.json', 4057891, '08b83d2cea6b6d6752468ef0e62e2ab2a53c9443ef72c439ecccb07ab9e89da9'],
  ['raw/LICENSE.txt', 1354, '738144f7fb054722a4ef9d3367c51710341dc12fc574c6ac3a41daaaecd8bf5e'],
  ['raw/README.md', 5278, 'dc0317fd9f727bb878861bd6122d8da4928203bbad0f950b7b70009a5a7dbd5f'],
  ['raw/USAGE.md', 38733, 'bf7745170e5455b452ef662599a690701ccc6a23fb5409409f06f05c589ba207'],
  ['raw/index.json', 32340, '470688307ba183e4f8a5031faa43a59eb7a84507d621bc7b0c3192e6875c1c04'],
];
const COMMON_FIELDS = 'created created_by_ref description external_references id modified name object_marking_refs revoked spec_version type x_mitre_attack_spec_version x_mitre_deprecated x_mitre_domains x_mitre_modified_by_ref x_mitre_version'.split(' ');
const FIELD_EXTRAS = {
  'attack-pattern': 'kill_chain_phases x_mitre_contributors x_mitre_impact_type x_mitre_is_subtechnique x_mitre_platforms x_mitre_remote_support x_mitre_tactic_type',
  'relationship': 'relationship_type source_ref target_ref',
  'x-mitre-analytic': 'x_mitre_log_source_references x_mitre_mutable_elements x_mitre_platforms',
  'x-mitre-detection-strategy': 'x_mitre_analytic_refs',
  'x-mitre-data-component': 'x_mitre_log_sources',
  'x-mitre-tactic': 'x_mitre_shortname',
  'intrusion-set': 'aliases x_mitre_contributors',
  'malware': 'is_family x_mitre_aliases x_mitre_contributors x_mitre_platforms',
  'tool': 'x_mitre_aliases x_mitre_contributors x_mitre_platforms',
  'campaign': 'aliases first_seen last_seen x_mitre_contributors x_mitre_first_seen_citation x_mitre_last_seen_citation',
  'x-mitre-collection': 'x_mitre_contents',
  'course-of-action': 'labels',
  'x-mitre-matrix': 'tactic_refs',
  'x-mitre-data-source': 'x_mitre_collection_layers x_mitre_contributors x_mitre_platforms',
  'x-mitre-asset': 'x_mitre_platforms x_mitre_related_assets x_mitre_sectors',
  'identity': 'identity_class',
  'marking-definition': 'definition definition_type',
};
const KNOWN_TYPES = new Set(Object.keys(FIELD_EXTRAS));
const ACTOR_TYPES = new Set(['intrusion-set', 'malware', 'tool', 'campaign']);
const TECHNIQUE_ID = /^T\d{4}(?:\.\d{3})?$/;
const STIX_ID = /^[a-z][a-z0-9-]*--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const hash = value => createHash('sha256').update(value).digest('hex');
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const active = object => Boolean(object) && object.revoked !== true && object.x_mitre_deprecated !== true;
const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };

function string(value, label, empty = false) {
  requireCondition(typeof value === 'string' && value.length <= 1000000 && (empty || value.trim().length > 0), `Invalid source ${label}`);
  return value;
}

function array(value, label) {
  requireCondition(Array.isArray(value) && value.length <= 100000, `Invalid source ${label}`);
  return value;
}

function strings(value, label) {
  return array(value, label).map(item => string(item, label));
}

function objectKeys(value, allowed, label) {
  requireCondition(value !== null && typeof value === 'object' && !Array.isArray(value), `Invalid source ${label}`);
  for (const key of Object.keys(value)) requireCondition(allowed.includes(key), `Unknown source field in ${label}`);
}

function references(object) {
  return array(Object.hasOwn(object, 'external_references') ? object.external_references : [], 'external_references').map(reference => {
    objectKeys(reference, ['source_name', 'url', 'external_id', 'description'], 'external_references');
    string(reference.source_name, 'reference source_name');
    for (const [key, value] of Object.entries(reference)) string(value, `reference ${key}`, true);
    return { ...reference };
  });
}

function external(object, pattern, sourceNames = ['mitre-attack']) {
  const matches = references(object).filter(reference => sourceNames.includes(reference.source_name) && reference.external_id);
  requireCondition(matches.length === 1 && pattern.test(matches[0].external_id), 'Invalid or ambiguous ATT&CK external ID');
  requireCondition(typeof matches[0].url === 'string' && /^https:\/\/attack\.mitre\.org\//.test(matches[0].url), 'Invalid ATT&CK source URL');
  return matches[0];
}

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

function sourceBytes(root, relative, expectedSize, expectedHash) {
  const file = path.join(root, SOURCE_DIRECTORY, relative);
  const stat = inspectPath(file);
  requireCondition(stat.isFile() && stat.size === expectedSize, 'Source integrity size mismatch');
  const bytes = fs.readFileSync(file);
  requireCondition(hash(bytes) === expectedHash, 'Source integrity checksum mismatch');
  return bytes;
}

function loadSources(root = PROJECT_ROOT) {
  const sourceRoot = path.join(root, SOURCE_DIRECTORY);
  const allowedFiles = new Set(['manifest.json', ...SOURCE_PINS.map(([relative]) => relative)]);
  const checkSourceDirectory = relative => {
    const absolute = path.join(sourceRoot, relative);
    const stat = inspectPath(absolute);
    requireCondition(stat.isDirectory(), 'Invalid source directory');
    for (const entry of fs.readdirSync(absolute)) {
      const child = relative ? `${relative}/${entry}` : entry;
      if (child === 'raw') checkSourceDirectory(child);
      else requireCondition(allowedFiles.has(child) && inspectPath(path.join(sourceRoot, child)).isFile(), 'Unknown source path');
    }
  };
  checkSourceDirectory('');
  const manifestPath = path.join(root, SOURCE_DIRECTORY, 'manifest.json');
  const manifestStat = inspectPath(manifestPath);
  requireCondition(manifestStat.isFile() && manifestStat.size < 100000, 'Invalid source manifest size');
  const manifestBytes = fs.readFileSync(manifestPath);
  requireCondition(hash(manifestBytes) === '2868b0038dc6d6ace411fae5d8098f08895e6581a2b0fe4b9720fdd09512df7d', 'Source manifest integrity checksum mismatch');
  const manifest = JSON.parse(manifestBytes);
  requireCondition(manifest.commit_sha === COMMIT && manifest.tag_object_sha === TAG_OBJECT && manifest.requested_release === 'v19.2', 'Source manifest release integrity mismatch');
  requireCondition(Array.isArray(manifest.files) && manifest.files.length === SOURCE_PINS.length, 'Source manifest file integrity mismatch');
  const buffers = new Map();
  for (const [relative, bytes, sha256] of SOURCE_PINS) {
    const entry = manifest.files.find(file => file.path === relative);
    requireCondition(entry && entry.bytes === bytes && entry.sha256 === sha256, 'Source manifest checksum integrity mismatch');
    buffers.set(relative, sourceBytes(root, relative, bytes, sha256));
  }
  const tagRef = JSON.parse(buffers.get('raw/tag-ref.json'));
  const tag = JSON.parse(buffers.get('raw/tag-object.json'));
  requireCondition(tagRef.ref === 'refs/tags/v19.2' && tagRef.object.sha === TAG_OBJECT && tagRef.object.type === 'tag' && tag.sha === TAG_OBJECT && tag.tag === 'v19.2' && tag.object.sha === COMMIT && tag.object.type === 'commit', 'Source tag-to-commit integrity mismatch');
  return { manifest, bundles: DOMAINS.map(domain => JSON.parse(buffers.get(`raw/${domain.id}-19.2.json`))) };
}

function validateObject(object) {
  requireCondition(object && KNOWN_TYPES.has(object.type) && typeof object.id === 'string' && STIX_ID.test(object.id) && object.id.startsWith(`${object.type}--`), 'Invalid source object type or STIX ID');
  if (Object.hasOwn(FIELD_EXTRAS, object.type)) objectKeys(object, [...COMMON_FIELDS, ...FIELD_EXTRAS[object.type].split(' ')], object.type);
  for (const field of ['revoked', 'x_mitre_deprecated', 'x_mitre_is_subtechnique']) {
    if (Object.hasOwn(object, field)) requireCondition(typeof object[field] === 'boolean', `Invalid source ${field}`);
  }
  if (Object.hasOwn(object, 'x_mitre_platforms')) strings(object.x_mitre_platforms, 'platforms');
  if (Object.hasOwn(object, 'external_references')) references(object);
  if (object.type === 'relationship') {
    string(object.relationship_type, 'relationship_type');
    requireCondition(STIX_ID.test(object.source_ref) && STIX_ID.test(object.target_ref), 'Invalid relationship endpoints');
  }
}

function indexBundle(bundle, domain) {
  objectKeys(bundle, ['type', 'id', 'objects'], 'bundle');
  requireCondition(bundle.type === 'bundle' && STIX_ID.test(bundle.id), 'Invalid source bundle');
  const objects = array(bundle.objects, 'bundle objects');
  const byId = new Map();
  for (const object of objects) {
    validateObject(object);
    requireCondition(!byId.has(object.id), 'Duplicate source STIX ID');
    byId.set(object.id, object);
  }
  const collections = objects.filter(object => object.type === 'x-mitre-collection');
  requireCondition(collections.length === 1 && collections[0].x_mitre_version === '19.2', 'Invalid source collection release');
  const techniques = objects.filter(object => object.type === 'attack-pattern' && active(object));
  requireCondition(techniques.length === domain.count, 'Source active technique count mismatch');
  const ids = techniques.map(object => external(object, TECHNIQUE_ID).external_id);
  requireCondition(new Set(ids).size === ids.length, 'Duplicate technique external ID');
  for (const technique of techniques) {
    string(technique.name, 'technique name');
    string(technique.description, 'technique description');
    requireCondition(strings(technique.x_mitre_domains, 'technique domains').includes(domain.id), 'Source technique domain mismatch');
  }
  const relationships = objects.filter(object => object.type === 'relationship' && active(object));
  for (const relationship of relationships) requireCondition(byId.has(relationship.source_ref) && byId.has(relationship.target_ref), 'Missing source relationship endpoint');
  return { objects, byId, techniques, relationships, collection: collections[0] };
}

function convertAnalytic(object, byId) {
  const reference = external(object, /^AN\d{4}$/);
  string(object.name, 'analytic name');
  string(object.description, 'analytic description');
  const logSources = array(Object.hasOwn(object, 'x_mitre_log_source_references') ? object.x_mitre_log_source_references : [], 'analytic log sources').map(log => {
    objectKeys(log, ['name', 'channel', 'x_mitre_data_component_ref'], 'analytic log source');
    const component = byId.get(log.x_mitre_data_component_ref);
    requireCondition(active(component) && component.type === 'x-mitre-data-component', 'Missing or inactive analytic data component');
    return {
      name: string(log.name, 'log source name'), channel: string(log.channel, 'log source channel', true),
      dataComponent: string(component.name, 'data component name'), dataComponentRef: component.id,
    };
  });
  const mutableElements = array(Object.hasOwn(object, 'x_mitre_mutable_elements') ? object.x_mitre_mutable_elements : [], 'analytic mutable elements').map(element => {
    objectKeys(element, ['field', 'description'], 'analytic mutable element');
    return { field: string(element.field, 'mutable field'), description: string(element.description, 'mutable description') };
  });
  return {
    id: reference.external_id, name: object.name, description: object.description,
    platforms: strings(object.x_mitre_platforms, 'analytic platforms'), logSources, mutableElements,
    stixId: object.id, url: reference.url, references: references(object),
  };
}

function groupBy(items, getter) {
  const groups = new Map();
  for (const item of items) {
    const key = getter(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function convertBundles(bundles) {
  requireCondition(Array.isArray(bundles) && bundles.length === DOMAINS.length, 'Expected three source bundles');
  const records = [];
  const procedures = [];
  const excludedTechniques = [];
  const unlinkedAnalytics = [];
  const domains = [];
  for (const [domainIndex, domain] of DOMAINS.entries()) {
    const { objects, byId, techniques, relationships, collection } = indexBundle(bundles[domainIndex], domain);
    const techniqueStixIds = new Set(techniques.map(technique => technique.id));
    const tactics = new Map(objects.filter(object => object.type === 'x-mitre-tactic' && active(object)).map(object => [string(object.x_mitre_shortname, 'tactic shortname'), string(object.name, 'tactic name')]));
    const analytics = new Map(objects.filter(object => object.type === 'x-mitre-analytic' && active(object)).map(object => [object.id, convertAnalytic(object, byId)]));
    const linkedAnalyticIds = new Set();
    const detects = groupBy(relationships.filter(relation => relation.relationship_type === 'detects' && techniqueStixIds.has(relation.target_ref) && active(byId.get(relation.source_ref)) && byId.get(relation.source_ref).type === 'x-mitre-detection-strategy'), relation => relation.target_ref);
    const parentRelations = groupBy(relationships.filter(relation => relation.relationship_type === 'subtechnique-of' && techniqueStixIds.has(relation.source_ref)), relation => relation.source_ref);
    const procedureRelations = relationships.filter(relation => relation.relationship_type === 'uses' && techniqueStixIds.has(relation.target_ref) && active(byId.get(relation.source_ref)) && ACTOR_TYPES.has(byId.get(relation.source_ref).type));
    const domainProcedures = procedureRelations.map(relation => {
      const actor = byId.get(relation.source_ref);
      const actorReference = external(actor, /^[GSC]\d{4}$/);
      return {
        id: relation.id, techniqueId: external(byId.get(relation.target_ref), TECHNIQUE_ID).external_id,
        domain: domain.name, domainId: domain.id, sourceRef: relation.source_ref, targetRef: relation.target_ref,
        actorId: actorReference.external_id, actorName: string(actor.name, 'procedure actor name'),
        description: string(relation.description, 'procedure description'), references: references(relation),
      };
    }).sort((left, right) => compare(left.techniqueId, right.techniqueId) || compare(left.id, right.id));
    const proceduresByTechnique = groupBy(domainProcedures, procedure => procedure.techniqueId);
    for (const technique of techniques) {
      const reference = external(technique, TECHNIQUE_ID);
      const parents = parentRelations.get(technique.id) || [];
      const isSubtechnique = technique.x_mitre_is_subtechnique === true;
      requireCondition(parents.length === (isSubtechnique ? 1 : 0), 'Invalid subtechnique parent relationship count');
      const parent = isSubtechnique ? byId.get(parents[0].target_ref) : null;
      requireCondition(!parent || (techniqueStixIds.has(parent.id) && parent.x_mitre_is_subtechnique !== true), 'Invalid active subtechnique parent');
      const strategies = (detects.get(technique.id) || []).map(relation => {
        const strategy = byId.get(relation.source_ref);
        const strategyReference = external(strategy, /^DET\d{4}$/);
        const analyticRefs = strings(strategy.x_mitre_analytic_refs, 'strategy analytic references');
        requireCondition(analyticRefs.length > 0 && new Set(analyticRefs).size === analyticRefs.length, 'Invalid strategy analytic references');
        const strategyAnalytics = analyticRefs.map(id => {
          requireCondition(analytics.has(id), 'Missing or inactive strategy analytic');
          linkedAnalyticIds.add(id);
          return analytics.get(id);
        }).sort((left, right) => compare(left.id, right.id));
        return {
          id: strategyReference.external_id, name: string(strategy.name, 'strategy name'),
          url: strategyReference.url, analytics: strategyAnalytics, stixId: strategy.id,
          relationshipId: relation.id, references: references(strategy),
        };
      }).sort((left, right) => compare(left.id, right.id));
      requireCondition(strategies.length > 0, 'Active technique has no detection strategy');
      const telemetry = [...new Set(strategies.flatMap(strategy => strategy.analytics.flatMap(analytic => analytic.logSources.map(log => `${log.name}; channel: ${log.channel}; data component: ${log.dataComponent}`))))];
      const techniqueTactics = array(technique.kill_chain_phases, 'technique tactics').map(phase => {
        objectKeys(phase, ['kill_chain_name', 'phase_name'], 'technique tactic');
        const expectedChain = domain.id === 'enterprise-attack' ? 'mitre-attack' : `mitre-${domain.id}`;
        requireCondition(phase.kill_chain_name === expectedChain && tactics.has(phase.phase_name), 'Unknown source tactic mapping');
        return tactics.get(phase.phase_name);
      });
      requireCondition(techniqueTactics.length > 0, 'Active technique has no source tactic');
      const examples = proceduresByTechnique.get(reference.external_id) || [];
      records.push({
        id: reference.external_id, name: technique.name, domain: domain.name,
        tactics: techniqueTactics, platforms: technique.x_mitre_platforms || [], behavior: technique.description,
        telemetry, falsePositives: 'Local-baseline guidance (not a source finding): establish approved activity, expected accounts, assets, schedules and change windows for this behavior. Review source tuning variables; require local evidence before making exclusions.',
        sourceUrl: reference.url, kind: isSubtechnique ? 'subtechnique' : 'technique',
        parentId: parent ? external(parent, TECHNIQUE_ID).external_id : null, parentName: parent ? parent.name : null,
        stixId: technique.id, attackVersion: '19.2', procedureCount: examples.length, strategies,
        procedureExamples: examples.slice(0, 3).map(({ id, actorId, actorName, description, references: refs }) => ({ id, actorId, actorName, description, references: refs })),
        references: references(technique),
      });
    }
    for (const technique of objects.filter(object => object.type === 'attack-pattern' && !active(object))) {
      excludedTechniques.push({ id: external(technique, TECHNIQUE_ID, ['mitre-attack', `mitre-${domain.id}`]).external_id, domain: domain.name, domainId: domain.id, stixId: technique.id, name: string(technique.name, 'historical technique name'), revoked: technique.revoked === true, deprecated: technique.x_mitre_deprecated === true });
    }
    for (const [stixId, analytic] of analytics) if (!linkedAnalyticIds.has(stixId)) unlinkedAnalytics.push({ id: analytic.id, domain: domain.name, domainId: domain.id, stixId, name: analytic.name });
    const domainRecords = records.filter(record => record.domain === domain.name);
    domains.push({
      domain: domain.name, domainId: domain.id, bundleId: bundles[domainIndex].id,
      collectionId: collection.id, collectionVersion: collection.x_mitre_version,
      activeTechniques: domainRecords.length, parentTechniques: domainRecords.filter(record => record.kind === 'technique').length,
      subtechniques: domainRecords.filter(record => record.kind === 'subtechnique').length,
      excludedTechniques: excludedTechniques.filter(record => record.domain === domain.name).length,
      procedures: domainProcedures.length, strategies: domainRecords.flatMap(record => record.strategies).length,
      activeAnalytics: analytics.size, linkedAnalytics: linkedAnalyticIds.size,
      unlinkedAnalytics: analytics.size - linkedAnalyticIds.size,
      unspecifiedPlatforms: domainRecords.filter(record => record.platforms.length === 0).length,
      withoutProcedures: domainRecords.filter(record => record.procedureCount === 0).length,
    });
    procedures.push(...domainProcedures);
  }
  const recordOrder = (left, right) => compare(left.domain, right.domain) || compare(left.id, right.id);
  records.sort(recordOrder);
  excludedTechniques.sort(recordOrder);
  unlinkedAnalytics.sort(recordOrder);
  requireCondition(records.length === 918 && procedures.length === 18885 && excludedTechniques.length === 248, 'Pinned coverage count mismatch');
  requireCondition(new Set(records.map(record => record.id)).size === records.length, 'Ambiguous cross-domain technique IDs');
  requireCondition(domains.reduce((sum, domain) => sum + domain.linkedAnalytics, 0) === 2053 && unlinkedAnalytics.length === 13, 'Pinned analytic linkage count mismatch');
  return { records, procedures, excludedTechniques, unlinkedAnalytics, domains };
}

function renderCatalog(records) {
  const literal = JSON.stringify(records).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `(function (root) {\n  'use strict';\n  // Generated from pinned MITRE ATT&CK 19.2. See THIRD_PARTY_LICENSE.txt.\n  // Independently rebuilt source-backed library; detection effectiveness is unvalidated.\n  const records = ${literal};\n  const catalog = Object.freeze(records.map(record => Object.freeze(record)));\n  if (typeof module !== 'undefined' && module.exports) module.exports = catalog;\n  else root.PAD_CATALOG = catalog;\n})(globalThis);\n`;
}

function expectedOutputs(root = PROJECT_ROOT) {
  const { manifest, bundles } = loadSources(root);
  const converted = convertBundles(bundles);
  const outputs = new Map();
  outputs.set('demo/catalog.js', renderCatalog(converted.records));
  outputs.set('library/procedures.jsonl', converted.procedures.map(procedure => JSON.stringify(procedure)).join('\n') + '\n');
  const textIds = [];
  for (const record of converted.records) {
    const directory = DOMAINS.find(domain => domain.name === record.domain).directory;
    const filename = `library/prompts/${directory}/${record.id}.txt`;
    outputs.set(filename, core.composePrompt(record));
    textIds.push(`${record.domain}:${record.id}`);
  }
  const ids = converted.records.map(record => `${record.domain}:${record.id}`);
  const totals = {
    activeTechniques: converted.records.length,
    parentTechniques: converted.records.filter(record => record.kind === 'technique').length,
    subtechniques: converted.records.filter(record => record.kind === 'subtechnique').length,
    promptFiles: textIds.length, procedures: converted.procedures.length,
    strategies: converted.domains.reduce((sum, domain) => sum + domain.strategies, 0),
    activeAnalytics: converted.domains.reduce((sum, domain) => sum + domain.activeAnalytics, 0),
    linkedAnalytics: converted.domains.reduce((sum, domain) => sum + domain.linkedAnalytics, 0),
    unlinkedAnalytics: converted.unlinkedAnalytics.length, excludedTechniques: converted.excludedTechniques.length,
    unspecifiedPlatforms: converted.records.filter(record => record.platforms.length === 0).length,
    withoutProcedures: converted.records.filter(record => record.procedureCount === 0).length,
    withoutTelemetryReferences: converted.records.filter(record => record.telemetry.length === 0).length,
  };
  const coverage = {
    schemaVersion: 1, attackVersion: '19.2', sourceCommit: COMMIT,
    status: 'independently rebuilt; unvalidated drafts; development snapshot',
    scope: 'All active technique and subtechnique objects in the three pinned ATT&CK 19.2 domain bundles. Coverage is catalog completeness, not detection effectiveness.',
    methods: {
      active: 'revoked !== true && x_mitre_deprecated !== true',
      key: 'domain:external ATT&CK technique ID',
      procedures: 'Active uses relationship to active same-domain technique, from active intrusion-set, malware, tool or campaign. Preserve every qualifying relation, complete description and external references.',
      strategy: 'Active detects relationship from active x-mitre-detection-strategy to active technique.',
      analytics: 'Resolve strategy.x_mitre_analytic_refs to active x-mitre-analytic objects. Do not infer links for unreferenced analytics.',
      parents: 'Resolve active subtechnique-of relationship to active parent technique.',
      tacticNames: 'Resolve source kill-chain phase_name through same-domain active x-mitre-tactic.x_mitre_shortname.',
      absence: 'Missing source arrays become empty arrays. No platform, telemetry, analytic link, procedure or tuning value is inferred.',
      examples: 'At most three qualifying procedure relationships per technique, sorted by relationship STIX ID.',
      historicalIds: 'Historical exclusions retain legacy mitre-mobile-attack and mitre-ics-attack external-reference namespaces where present.',
      prompts: 'Exactly core.composePrompt(record) with default detect mode, Platform-neutral target and empty local context.',
      validation: 'Deterministic generation and exact file parity only; no model or detection execution.',
    },
    sourceManifest: `${SOURCE_DIRECTORY}/manifest.json`,
    sourceFiles: SOURCE_PINS.map(([file, bytes, sha256]) => ({ path: `${SOURCE_DIRECTORY}/${file}`, bytes, sha256 })),
    sourceTag: { name: 'v19.2', object: TAG_OBJECT, commit: COMMIT, signatureVerified: false, signatureReason: 'unsigned' },
    sourceLicense: `${SOURCE_DIRECTORY}/${manifest.license.path}`,
    composer: { path: 'demo/core.js', sha256: hash(fs.readFileSync(path.join(PROJECT_ROOT, 'demo/core.js'))) },
    totals, domains: converted.domains,
    sourceIds: ids, catalogIds: [...ids], textIds,
    excludedTechniques: converted.excludedTechniques, unlinkedAnalytics: converted.unlinkedAnalytics,
    generatedFiles: [...outputs].map(([filename, content]) => ({ path: filename, bytes: Buffer.byteLength(content), sha256: hash(content) })).sort((left, right) => compare(left.path, right.path)),
  };
  outputs.set('library/coverage.json', JSON.stringify(coverage, null, 2) + '\n');
  return { outputs, coverage };
}

function permittedOutput(relative) {
  return relative === 'demo/catalog.js' || relative === 'library/coverage.json' || relative === 'library/procedures.jsonl' || /^library\/prompts\/(enterprise|mobile|ics)\/T\d{4}(?:\.\d{3})?\.txt$/.test(relative);
}

function writeOutputs(root, outputs, check) {
  requireCondition(path.isAbsolute(root) && inspectPath(root).isDirectory(), 'Invalid generated output root');
  const directories = new Set(['demo']);
  let totalBytes = 0;
  for (const [relative, content] of outputs) {
    requireCondition(permittedOutput(relative), 'Unknown generated path');
    requireCondition(typeof content === 'string' && Buffer.byteLength(content) <= 64 * 1024 * 1024, 'Generated output exceeds size limit');
    totalBytes += Buffer.byteLength(content);
    let directory = path.posix.dirname(relative);
    while (directory !== '.') { directories.add(directory); directory = path.posix.dirname(directory); }
    const stat = inspectPath(path.join(root, relative), true);
    if (stat) requireCondition(stat.isFile() && stat.nlink === 1, 'Refusing nonregular or multiply linked generated file');
  }
  requireCondition(totalBytes <= 128 * 1024 * 1024 && outputs.size <= 1000, 'Generated library exceeds size limit');
  const walk = relative => {
    const absolute = path.join(root, relative);
    const stat = inspectPath(absolute, true);
    if (!stat) return;
    if (stat.isDirectory()) {
      requireCondition(directories.has(relative), 'Unknown generated path');
      for (const entry of fs.readdirSync(absolute)) walk(`${relative}/${entry}`);
    } else requireCondition(outputs.has(relative), 'Unknown generated path');
  };
  // Everything under library/ is generated and accounted for. Unknown content
  // is an error to review manually, never a deletion request.
  walk('library');
  if (check) {
    for (const [relative, content] of outputs) {
      const absolute = path.join(root, relative);
      const stat = inspectPath(absolute, true);
      requireCondition(stat && stat.isFile(), `Generated file missing: ${relative}`);
      requireCondition(stat.size === Buffer.byteLength(content) && fs.readFileSync(absolute, 'utf8') === content, `Generated file differs: ${relative}`);
    }
    return;
  }
  for (const directory of [...directories].sort((left, right) => left.split('/').length - right.split('/').length || compare(left, right))) {
    const absolute = path.join(root, directory);
    const stat = inspectPath(absolute, true);
    if (!stat) fs.mkdirSync(absolute);
    else requireCondition(stat.isDirectory(), 'Invalid generated directory');
  }
  for (const [relative, content] of outputs) {
    const absolute = path.join(root, relative);
    const stat = inspectPath(absolute, true);
    if (stat && stat.size === Buffer.byteLength(content) && fs.readFileSync(absolute, 'utf8') === content) continue;
    const descriptor = fs.openSync(absolute, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW, 0o644);
    try { fs.writeFileSync(descriptor, content, 'utf8'); } finally { fs.closeSync(descriptor); }
  }
}

function buildLibrary({ root = PROJECT_ROOT, check = false } = {}) {
  requireCondition(typeof check === 'boolean', 'Invalid check option');
  const { outputs, coverage } = expectedOutputs(root);
  writeOutputs(root, outputs, check);
  return { promptCount: coverage.totals.promptFiles, procedureCount: coverage.totals.procedures, generatedFiles: outputs.size, checked: check };
}

if (require.main === module) {
  try {
    const arguments_ = process.argv.slice(2);
    requireCondition(arguments_.length === 0 || (arguments_.length === 1 && arguments_[0] === '--check'), 'Usage: node scripts/build_library.cjs [--check]');
    const result = buildLibrary({ check: arguments_[0] === '--check' });
    process.stdout.write(`${result.checked ? 'Verified' : 'Generated'} ${result.promptCount} technique prompts and ${result.procedureCount} documented procedure relationships.\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { loadSources, convertBundles, renderCatalog, expectedOutputs, writeOutputs, buildLibrary, pathPrefixes };
