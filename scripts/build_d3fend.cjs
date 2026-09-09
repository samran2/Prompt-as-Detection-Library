'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRECTORY = 'sources/d3fend-1.6.0';
const VERSION = '1.6.0';
const IRI = 'http://d3fend.mitre.org/ontologies/d3fend.owl#';
const SOURCE_URL = 'https://d3fend.mitre.org/ontologies/d3fend/1.6.0/d3fend-full-mappings.csv';
const SOURCE_PINS = Object.freeze([
  ['manifest.json', 2137, '517bdd4a82337e2afdb57e0fe637c38717136c17a964b09ea5c1be9d7c19b43c'],
  ['d3fend-full-mappings.csv', 14751588, '2b86a5a19de143560b75fb2b443a7ac60335d60dfb6b08a7a6e9a53a052ad79f'],
  ['d3fend.json', 4833645, 'e1546d432c6aa64d45b62dd9e9484b0774ae84de7ff3605ff9dd4e20278957bf'],
  ['d3fend.csv', 38047, '979c5b82324893dd3f3c6bb2acbcd6b2a14b49566cbfb2052564665de13506c6'],
  ['TERMS_OF_USE.html', 95542, 'ddc51d7b3ff9bda0ac6d2768ca9ec8085a07979e42028044ab9985bdb34c8045'],
  ['NOTICE.txt', 3136, '479c6784fccb142d5bb8594b1e1acb92f94c2737739fe65881ca3a0a0ce7a42c'],
]);
const HEADERS = ('query_def_tech_label,top_def_tech_label,def_tactic_label,def_tactic_rel_label,def_tech_label,'
  + 'def_artifact_rel_label,def_artifact_label,off_artifact_label,off_artifact_rel_label,off_tech_label,off_tech_id,'
  + 'framework_root_iri,off_tech_parent_label,off_tech_parent_is_toplevel,off_tactic_rel_label,off_tactic_label,'
  + 'def_tactic,def_tactic_rel,def_tech,def_artifact_rel,def_artifact,off_artifact,off_artifact_rel,off_tech,'
  + 'off_tech_parent,off_tactic_rel,off_tactic').split(',');
const DOMAINS = new Map([
  [`${IRI}ATTACKEnterpriseTechnique`, 'Enterprise'], [`${IRI}ATTACKICSTechnique`, 'ICS'],
  [`${IRI}ATTACKMobileTechnique`, 'Mobile'], [`${IRI}ATLASTechnique`, 'ATLAS'], [`${IRI}SPARTATechnique`, 'SPARTA'],
]);
const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = value => createHash('sha256').update(value).digest('hex');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function inspectPath(filename, allowMissing = false) {
  const absolute = path.resolve(filename);
  const anchor = path.parse(absolute).root;
  let current = anchor;
  let stat;
  for (const part of absolute.slice(anchor.length).split(path.sep)) {
    current = path.join(current, part);
    try { stat = fs.lstatSync(current); } catch (error) {
      if (allowMissing && error.code === 'ENOENT') return null;
      throw error;
    }
    requireCondition(!stat.isSymbolicLink(), 'Refusing symbolic link path');
    if (current !== absolute) requireCondition(stat.isDirectory(), 'Invalid parent directory');
  }
  return stat;
}

function readBounded(filename, maximum) {
  const stat = inspectPath(filename);
  requireCondition(stat.isFile() && stat.nlink === 1 && stat.size <= maximum, 'File integrity size/type limit');
  const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(descriptor);
    requireCondition(opened.isFile() && opened.nlink === 1 && opened.size === stat.size, 'File integrity changed during read');
    const bytes = Buffer.alloc(opened.size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const read = fs.readSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (!read) break;
      offset += read;
    }
    requireCondition(offset === opened.size, 'File integrity changed during read');
    return bytes.subarray(0, offset);
  } finally { fs.closeSync(descriptor); }
}

// This source is SPARQL CSV, with RFC 4180 quoting, not comma-split lines.
// https://www.w3.org/TR/sparql11-results-csv-tsv/
function parseMappings(text) {
  requireCondition(typeof text === 'string' && Buffer.byteLength(text) <= 16 * 1024 * 1024, 'CSV size limit');
  const rows = [];
  let fields = [], field = '', quoted = false, closed = false;
  const pushField = () => {
    requireCondition(field.length <= 4096, 'CSV field limit');
    fields.push(field); field = ''; closed = false;
    requireCondition(fields.length <= HEADERS.length, rows.length ? 'CSV row width limit' : 'CSV header width limit');
  };
  const pushRow = () => {
    pushField(); rows.push(fields); fields = [];
    requireCondition(rows.length <= 20001, 'CSV row limit');
  };
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') { field += '"'; index++; }
        else { quoted = false; closed = true; }
      } else field += character;
    } else if (character === ',') pushField();
    else if (character === '\n' || character === '\r') {
      if (character === '\r') {
        requireCondition(text[index + 1] === '\n', 'CSV invalid newline'); index++;
      }
      pushRow();
    } else if (character === '"' && !field && !closed) quoted = true;
    else {
      requireCondition(!closed && character !== '"', 'CSV invalid quoting');
      field += character;
    }
    requireCondition(field.length <= 4096, 'CSV field limit');
  }
  requireCondition(!quoted, 'CSV unclosed quote');
  if (field || fields.length || closed) pushRow();
  requireCondition(JSON.stringify(rows.shift()) === JSON.stringify(HEADERS), 'CSV header mismatch');
  return rows.map((values, index) => {
    requireCondition(values.length === HEADERS.length && values.every(value => value.trim()), `CSV row width/value mismatch at ${index + 1}`);
    return Object.fromEntries(HEADERS.map((key, column) => [key, values[column]]));
  });
}

function loadSources(root = PROJECT_ROOT) {
  const directory = path.join(root, SOURCE_DIRECTORY);
  requireCondition(inspectPath(directory).isDirectory(), 'Invalid D3FEND source directory');
  const expectedNames = SOURCE_PINS.map(([name]) => name).sort();
  requireCondition(JSON.stringify(fs.readdirSync(directory).sort()) === JSON.stringify(expectedNames), 'Unexpected D3FEND source path');
  const buffers = new Map();
  for (const [name, size, digest] of SOURCE_PINS) {
    const bytes = readBounded(path.join(directory, name), size);
    requireCondition(bytes.length === size && sha256(bytes) === digest, `Source integrity mismatch: ${name}`);
    buffers.set(name, bytes);
  }
  const manifest = JSON.parse(buffers.get('manifest.json'));
  requireCondition(manifest.version === VERSION && manifest.files.length === SOURCE_PINS.length - 1, 'Source manifest integrity mismatch');
  for (const entry of manifest.files) {
    const pin = SOURCE_PINS.find(([name]) => name === entry.path);
    requireCondition(pin && pin[1] === entry.bytes && pin[2] === entry.sha256, 'Source manifest file integrity mismatch');
  }
  const mappingText = buffers.get('d3fend-full-mappings.csv').toString('utf8');
  return {manifest, mappingText, mappings: parseMappings(mappingText), ontology: JSON.parse(buffers.get('d3fend.json')),
    licenseNotice: buffers.get('NOTICE.txt').toString('utf8')};
}

function ontologyUri(value) {
  requireCondition(typeof value === 'string' && value.startsWith(IRI)
    && /^[A-Za-z0-9_.-]+$/.test(value.slice(IRI.length)), 'Invalid D3FEND URI');
  return value;
}

function createCatalog(ontology, mappings, localRecords) {
  requireCondition(Array.isArray(ontology?.['@graph']) && ontology['@graph'].length <= 10000, 'Invalid ontology graph');
  requireCondition(Array.isArray(mappings) && mappings.length <= 20000, 'Invalid mapping row limit');
  requireCondition(Array.isArray(localRecords) && localRecords.length <= 2000, 'Invalid local record limit');
  const graph = new Map();
  for (const node of ontology['@graph']) {
    requireCondition(node && typeof node['@id'] === 'string' && !graph.has(node['@id']), 'Invalid or duplicate ontology node');
    graph.set(node['@id'], node);
  }
  requireCondition(graph.get('http://d3fend.mitre.org/ontologies/d3fend.owl')?.['owl:versionInfo'] === VERSION, 'Ontology version mismatch');
  const domains = Object.fromEntries(['Enterprise', 'ICS', 'Mobile', 'ATLAS'].map(domain => [domain, {records: 0, mapped: 0, unmapped: 0}]));
  const localById = new Map();
  const relationMaps = new Map();
  for (const local of localRecords) {
    requireCondition(local && /^(?:T\d{4}(?:\.\d{3})?|AML\.T\d{4}(?:\.\d{3})?)$/.test(local.id)
      && Object.hasOwn(domains, local.domain), 'Invalid local technique');
    requireCondition(!localById.has(local.id), 'Duplicate local technique ID');
    localById.set(local.id, local); relationMaps.set(local.id, new Map()); domains[local.domain].records++;
  }
  const techniques = new Map();
  const sourceDomains = {};
  const excludedIds = new Map();
  let matchedSourceRows = 0;
  mappings.forEach((row, index) => {
    requireCondition(row && Object.keys(row).length === HEADERS.length
      && HEADERS.every(key => typeof row[key] === 'string' && row[key].length > 0 && row[key].length <= 4096), 'Invalid mapping shape');
    for (const key of ['framework_root_iri', 'def_tactic', 'def_tactic_rel', 'def_tech', 'def_artifact_rel',
      'def_artifact', 'off_artifact', 'off_artifact_rel', 'off_tech', 'off_tech_parent', 'off_tactic_rel', 'off_tactic']) ontologyUri(row[key]);
    const domain = DOMAINS.get(row.framework_root_iri);
    requireCondition(domain, 'Unknown source framework');
    requireCondition(row.off_tech === `${IRI}${row.off_tech_id}`, 'Source offensive ID mismatch');
    sourceDomains[domain] = (sourceDomains[domain] || 0) + 1;
    const local = localById.get(row.off_tech_id);
    if (!local || local.domain !== domain) {
      excludedIds.set(`${domain}:${row.off_tech_id}`, {domain, id: row.off_tech_id}); return;
    }
    const node = graph.get(`d3f:${row.def_tech.slice(IRI.length)}`);
    requireCondition(node && /^D3-[A-Z0-9-]+$/.test(node['d3f:d3fend-id'])
      && node['rdfs:label'] === row.def_tech_label && typeof node['d3f:definition'] === 'string'
      && node['d3f:definition'].length > 0 && node['d3f:definition'].length <= 100000, 'Invalid source defense');
    const id = node['d3f:d3fend-id'];
    const url = `https://d3fend.mitre.org/technique/${node['@id']}/`;
    const technique = techniques.get(id) || {id, name: node['rdfs:label'], definition: node['d3f:definition'], url, tactics: []};
    requireCondition(technique.url === url, 'Duplicate source defense ID');
    if (!technique.tactics.includes(row.def_tactic_label)) technique.tactics.push(row.def_tactic_label);
    techniques.set(id, technique);
    const relation = {
      defenseId: id, queryLabel: row.query_def_tech_label, topLabel: row.top_def_tech_label,
      defenseArtifact: row.def_artifact, defenseArtifactLabel: row.def_artifact_label,
      offenseArtifact: row.off_artifact, offenseArtifactLabel: row.off_artifact_label,
      defenseRelation: row.def_artifact_rel, offenseRelation: row.off_artifact_rel,
    };
    const key = JSON.stringify(relation);
    const grouped = relationMaps.get(local.id);
    if (!grouped.has(key)) grouped.set(key, {...relation, sourceRows: []});
    grouped.get(key).sourceRows.push(index + 1);
    matchedSourceRows++;
  });
  const records = {};
  for (const id of [...localById.keys()].sort(compare)) {
    records[id] = [...relationMaps.get(id).entries()].sort(([a], [b]) => compare(a, b)).map(([, value]) => value);
    domains[localById.get(id).domain][records[id].length ? 'mapped' : 'unmapped']++;
  }
  const coverage = {
    sourceRows: mappings.length, matchedSourceRows, excludedSourceRows: mappings.length - matchedSourceRows,
    totalRecords: localRecords.length, mappedRecords: Object.values(domains).reduce((sum, value) => sum + value.mapped, 0),
    relationPaths: Object.values(records).reduce((sum, value) => sum + value.length, 0), defensiveTechniques: techniques.size,
    domains, sourceDomains,
    excludedSourceIds: [...excludedIds.values()].sort((a, b) => compare(`${a.domain}:${a.id}`, `${b.domain}:${b.id}`)),
    status: 'inferred-experimental',
    policy: 'Exact active IDs only; no inherited, renamed or inferred local links. Missing links do not mean no applicable defense. Mapping coverage is not validated detection coverage.',
  };
  return {schemaVersion: 'pad-d3fend-1', version: VERSION, sourceUrl: SOURCE_URL,
    sourceSha256: SOURCE_PINS[1][2], licenseUrl: 'https://d3fend.mitre.org/tou/',
    techniques: [...techniques.values()].map(technique => ({...technique, tactics: technique.tactics.sort(compare)})).sort((a, b) => compare(a.id, b.id)),
    records, coverage};
}

function expectedOutputs(root = PROJECT_ROOT) {
  const source = loadSources(root);
  const attack = JSON.parse(readBounded(path.join(root, 'content/prompts/index.json'), 32 * 1024 * 1024));
  const atlas = JSON.parse(readBounded(path.join(root, 'content/atlas/catalog.json'), 8 * 1024 * 1024));
  requireCondition(attack.attackVersion === '19.2' && Array.isArray(attack.records) && attack.records.length === 918
    && Array.isArray(atlas) && atlas.length === 197, 'Pinned local framework inventory mismatch');
  const locals = [...attack.records.map(record => ({id: record.attackId, domain: record.domain})), ...atlas];
  const catalog = createCatalog(source.ontology, source.mappings, locals);
  catalog.sourceNotice = source.licenseNotice;
  const serialized = JSON.stringify(catalog).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  const browser = `'use strict';\n// Generated from pinned MITRE D3FEND data. See D3FEND_LICENSE.txt.\n(function (root) {\n  const catalog = ${serialized};\n  if (typeof module === 'object' && module.exports) module.exports = catalog;\n  else root.PAD_D3FEND_CATALOG = catalog;\n})(globalThis);\n`;
  const outputs = new Map([
    ['demo/d3fend-catalog.js', browser],
    ['demo/D3FEND_LICENSE.txt', source.licenseNotice],
    ['content/d3fend/coverage.json', `${JSON.stringify({schemaVersion: 'pad-d3fend-1', version: VERSION,
      sourceUrl: SOURCE_URL, sourceSha256: catalog.sourceSha256,
      generatedCatalog: {path: 'demo/d3fend-catalog.js', bytes: Buffer.byteLength(browser), sha256: sha256(browser)},
      ...catalog.coverage}, null, 2)}\n`],
  ]);
  return {outputs, catalog, coverage: catalog.coverage};
}

function writeOutputs(root, outputs, check) {
  const allowed = new Set(['demo/d3fend-catalog.js', 'demo/D3FEND_LICENSE.txt', 'content/d3fend/coverage.json']);
  requireCondition(outputs instanceof Map && outputs.size <= allowed.size && typeof check === 'boolean', 'Invalid output options');
  for (const [relative, content] of outputs) {
    requireCondition(allowed.has(relative), 'Unknown generated D3FEND path');
    requireCondition(typeof content === 'string' && Buffer.byteLength(content) <= 16 * 1024 * 1024, 'Generated D3FEND size limit');
    const stat = inspectPath(path.join(root, relative), true);
    if (stat) requireCondition(stat.isFile() && stat.nlink === 1, 'Invalid generated D3FEND file');
  }
  const contentRoot = path.join(root, 'content/d3fend');
  const directory = inspectPath(contentRoot, true);
  if (directory) {
    requireCondition(directory.isDirectory(), 'Invalid D3FEND content directory');
    for (const filename of fs.readdirSync(contentRoot)) {
      requireCondition(['coverage.json', 'README.md'].includes(filename), 'Unknown generated D3FEND file');
      const stat = inspectPath(path.join(contentRoot, filename));
      requireCondition(stat.isFile() && stat.nlink === 1, 'Invalid D3FEND content file');
    }
  }
  if (check) {
    for (const [relative, content] of outputs) {
      const filename = path.join(root, relative);
      const stat = inspectPath(filename, true);
      requireCondition(stat?.isFile() && stat.size === Buffer.byteLength(content)
        && readBounded(filename, 16 * 1024 * 1024).toString('utf8') === content, `Generated D3FEND file differs: ${relative}`);
    }
    return;
  }
  for (const directoryName of ['demo', 'content', 'content/d3fend']) {
    const filename = path.join(root, directoryName);
    const stat = inspectPath(filename, true);
    if (!stat) fs.mkdirSync(filename);
    else requireCondition(stat.isDirectory(), 'Invalid output parent directory');
  }
  for (const [relative, content] of outputs) {
    const filename = path.join(root, relative);
    const stat = inspectPath(filename, true);
    if (stat && stat.size === Buffer.byteLength(content) && readBounded(filename, 16 * 1024 * 1024).toString('utf8') === content) continue;
    const descriptor = fs.openSync(filename, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o644);
    try {
      const current = fs.fstatSync(descriptor);
      requireCondition(current.isFile() && current.nlink === 1, 'Invalid output file');
      fs.ftruncateSync(descriptor, 0);
      fs.writeFileSync(descriptor, content, 'utf8');
    } finally { fs.closeSync(descriptor); }
  }
}

function buildD3fend({root = PROJECT_ROOT, check = false} = {}) {
  const {outputs, coverage} = expectedOutputs(root);
  writeOutputs(root, outputs, check);
  return coverage;
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    requireCondition(args.length === 0 || (args.length === 1 && args[0] === '--check'), 'Usage: node scripts/build_d3fend.cjs [--check]');
    const result = buildD3fend({check: args[0] === '--check'});
    process.stdout.write(`${args[0] ? 'Verified' : 'Generated'} D3FEND relationships for ${result.mappedRecords}/${result.totalRecords} records.\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

module.exports = {loadSources, parseMappings, createCatalog, expectedOutputs, writeOutputs, buildD3fend};
