'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRECTORY = 'sources/car-1b922fe';
const COMMIT = '1b922fe1527d956e222a99473472e594f10f610b';
const MANIFEST_HASH = 'f83609dd99e98f6d9265d5b3cc32c45ab3323f569454c8db7fc1dfbf501cb098';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function inspect(filename, missing = false) {
  const absolute = path.resolve(filename);
  let current = path.parse(absolute).root;
  let stat;
  for (const part of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, part);
    try { stat = fs.lstatSync(current); } catch (error) {
      if (missing && error.code === 'ENOENT') return null;
      throw error;
    }
    ensure(!stat.isSymbolicLink(), 'Refusing symbolic link');
    if (current !== absolute) ensure(stat.isDirectory(), 'Invalid parent directory');
  }
  return stat;
}

function readPinned(filename, size, hash) {
  const stat = inspect(filename);
  ensure(stat.isFile() && stat.nlink === 1 && stat.size === size && size <= 2_000_000, 'CAR source integrity size/type mismatch');
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(fd);
    ensure(opened.size === size && opened.isFile() && opened.nlink === 1, 'CAR source integrity changed');
    const bytes = Buffer.alloc(size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, null);
      if (!count) break;
      offset += count;
    }
    ensure(offset === size && sha256(bytes.subarray(0, offset)) === hash, 'CAR source integrity hash mismatch');
    return bytes.subarray(0, offset);
  } finally { fs.closeSync(fd); }
}

function loadSources(root = PROJECT_ROOT) {
  const directory = path.join(root, SOURCE_DIRECTORY);
  const manifest = JSON.parse(readPinned(path.join(directory, 'manifest.json'), 18557, MANIFEST_HASH));
  ensure(manifest.commit === COMMIT && manifest.license === 'Apache-2.0' && manifest.analytics === 102, 'CAR manifest integrity mismatch');
  const allowed = new Set(['manifest.json', ...manifest.files.map(file => file.path)]);
  const walk = relative => {
    const absolute = path.join(directory, relative);
    ensure(inspect(absolute).isDirectory(), 'Invalid CAR source directory');
    for (const name of fs.readdirSync(absolute)) {
      const child = relative ? `${relative}/${name}` : name;
      const stat = inspect(path.join(directory, child));
      if (stat.isDirectory()) {
        ensure([...allowed].some(file => file.startsWith(`${child}/`)), 'Unexpected CAR directory');
        walk(child);
      } else ensure(allowed.has(child), 'Unexpected CAR source file');
    }
  };
  walk('');
  const buffers = new Map(manifest.files.map(file => [file.path,
    readPinned(path.join(directory, file.path), file.bytes, file.sha256)]));
  const analytics = JSON.parse(buffers.get('derived/analytics.json'));
  ensure(analytics.length === manifest.analytics, 'CAR analytic count mismatch');
  for (const row of analytics) {
    ensure(row.path === `raw/analytics/${row.data.id}.yaml` && buffers.has(row.path)
      && sha256(buffers.get(row.path)) === row.sha256, 'CAR analytic provenance mismatch');
  }
  return {manifest, analytics, sourceNotice: buffers.get('raw/NOTICE.txt').toString('utf8'),
    sourceLicense: buffers.get('raw/LICENSE.txt').toString('utf8')};
}

function createCatalog(source, localRecords) {
  ensure(Array.isArray(source?.analytics) && source.analytics.length <= 256, 'Invalid CAR analytics');
  ensure(Array.isArray(localRecords) && localRecords.length <= 2000, 'Invalid local records');
  const ids = new Map();
  for (const record of localRecords) {
    ensure(/^T\d{4}(?:\.\d{3})?$/.test(record?.id) && ['Enterprise', 'Mobile', 'ICS'].includes(record.domain), 'Invalid local technique');
    ensure(!ids.has(record.id), 'Duplicate local technique');
    ids.set(record.id, record.domain);
  }
  const excluded = new Set();
  const analytics = source.analytics.map(({data, path: sourcePath, sha256: digest}) => {
    ensure(/^CAR-\d{4}-\d{2}-\d{3}$/.test(data?.id), 'Invalid CAR analytic ID');
    const explicitIds = [...new Set((data.coverage || []).flatMap(row => [row.technique, ...(row.subtechniques || [])]))].sort(compare);
    for (const id of explicitIds) {
      ensure(/^T\d{4}(?:\.\d{3})?$/.test(id), 'Invalid CAR technique reference');
      // CAR is Enterprise research. Do not reinterpret IDs as Mobile/ICS mappings.
      if (ids.get(id) !== 'Enterprise') excluded.add(id);
    }
    const implementations = data.implementations || [];
    return {
      id: data.id, title: data.title, hypothesis: data.description,
      informationDomain: data.information_domain, platforms: data.platforms || [],
      contributors: data.contributors || [], submissionDate: data.submission_date, updateDate: data.update_date || null,
      techniqueIds: explicitIds.filter(id => ids.get(id) === 'Enterprise'),
      coverage: data.coverage || [],
      // Preserve upstream spelling (including "psuedocode"), never execute code.
      pseudocode: implementations.filter(row => ['pseudocode', 'psuedocode'].includes(row.type.toLowerCase())).map(row => ({
        type: row.type, description: row.description || '', code: row.code || '', dataModel: row.data_model || '',
      })),
      telemetry: data.data_model_references || [],
      implementations: implementations.map(row => ({type: row.type, dataModel: row.data_model || '', description: row.description || ''})),
      sourceUrl: `https://github.com/mitre-attack/car/blob/${COMMIT}/${sourcePath.slice(4)}`,
      sourcePath: `${SOURCE_DIRECTORY}/${sourcePath}`, sourceSha256: digest,
      license: 'Apache-2.0', status: 'upstream-research',
    };
  }).sort((a, b) => compare(a.id, b.id));
  const catalog = {schemaVersion: 1, attackVersion: '19.2',
    source: {name: 'MITRE Cyber Analytics Repository', repository: 'https://github.com/mitre-attack/car', commit: COMMIT},
    sourceNotice: source.sourceNotice, sourceLicense: source.sourceLicense,
    warning: 'Upstream research examples; not locally validated. Telemetry names are CAR abstractions, not guaranteed product fields. Source coverage ratings are not local detection effectiveness.',
    excludedTechniqueIds: [...excluded].sort(compare), analytics};
  require('../demo/car.js').createLibrary(catalog);
  return catalog;
}

function expectedOutput(root = PROJECT_ROOT) {
  const catalog = createCatalog(loadSources(root), require(path.join(root, 'demo/catalog.js')));
  const json = JSON.stringify(catalog).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  return {catalog, text: `/* Project-generated CAR projection; modified representation of pinned Apache-2.0 sources. Full license and notices are included in the data. */\n(function(root){'use strict';const data=${json};if(typeof module==='object'&&module.exports)module.exports=data;else root.PAD_CAR_CATALOG=data;})(typeof globalThis!=='undefined'?globalThis:this);\n`};
}

function build({root = PROJECT_ROOT, check = false} = {}) {
  const {catalog, text} = expectedOutput(root);
  const filename = path.join(root, 'demo/car-catalog.js');
  const stat = inspect(filename, !check);
  if (check) ensure(readPinned(filename, Buffer.byteLength(text), sha256(text)).toString('utf8') === text, 'CAR output mismatch');
  else {
    ensure(!stat || (stat.isFile() && stat.nlink === 1), 'Invalid CAR output file');
    const fd = fs.openSync(filename, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o644);
    try {
      const opened = fs.fstatSync(fd);
      ensure(opened.isFile() && opened.nlink === 1, 'Invalid CAR output file');
      fs.ftruncateSync(fd, 0); fs.writeFileSync(fd, text);
    } finally { fs.closeSync(fd); }
  }
  return catalog.analytics.length;
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    ensure(args.length === 0 || (args.length === 1 && args[0] === '--check'), 'Usage: node scripts/build_car_catalog.cjs [--check]');
    console.log(`${args.length ? 'Verified' : 'Generated'} ${build({check: args.length === 1})} CAR research analytics.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {SOURCE_DIRECTORY, loadSources, createCatalog, expectedOutput, build};
