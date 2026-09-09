import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createAtlasResearchCatalog, createResearchCatalog} from '../../../packages/core/src/research-catalog.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DOMAIN_SLUGS = Object.freeze({Enterprise: 'enterprise', Mobile: 'mobile', ICS: 'ics'});
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const MAX_PROMPT_BYTES = 100 * 1024;

function regularFile(filename, maximum) {
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximum) throw new Error('Catalog input is not an allowed regular file');
  return stat;
}

function readJson(filename) {
  regularFile(filename, MAX_JSON_BYTES);
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function readJsonWithBytes(filename) {
  regularFile(filename, MAX_JSON_BYTES);
  const bytes = fs.readFileSync(filename);
  return {value: JSON.parse(bytes.toString('utf8')), bytes};
}

function readUtf8(filename) {
  const stat = regularFile(filename, MAX_PROMPT_BYTES);
  const bytes = fs.readFileSync(filename);
  let text;
  try {
    text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
  } catch {
    throw new Error('Catalog prompt is not valid UTF-8');
  }
  return {bytes, text, size: stat.size};
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function loadCatalogModule(root) {
  const filename = path.join(root, 'demo', 'catalog.js');
  regularFile(filename, MAX_JSON_BYTES);
  const require = createRequire(import.meta.url);
  const records = require(filename);
  if (!Array.isArray(records) || records.length === 0) throw new Error('Catalog module did not export records');
  return records;
}

export function loadResearchCatalog({root = DEFAULT_ROOT} = {}) {
  const resolvedRoot = path.resolve(root);
  const techniques = loadCatalogModule(resolvedRoot);
  const metadata = readJson(path.join(resolvedRoot, 'content', 'prompts', 'index.json'));
  const metadataById = new Map(metadata.records.map(record => [record.attackId, record]));
  if (metadataById.size !== techniques.length || metadata.records.length !== techniques.length) {
    throw new Error('Prompt metadata does not match the technique catalog');
  }
  const prompts = techniques.map(record => {
    const entry = metadataById.get(record.id);
    const slug = DOMAIN_SLUGS[record.domain];
    if (!entry || !slug || entry.domain !== record.domain || entry.stixId !== record.stixId) {
      throw new Error('Prompt metadata identity does not match the technique catalog');
    }
    const relative = path.posix.join('library', 'prompts', slug, `${record.id}.txt`);
    if (entry.prompt?.path !== relative) throw new Error('Prompt metadata path is not canonical');
    const {bytes, text, size} = readUtf8(path.join(resolvedRoot, ...relative.split('/')));
    if (size !== entry.prompt.bytes || digest(bytes) !== entry.prompt.sha256) throw new Error('Prompt bytes do not match metadata');
    return {
      id: record.id,
      techniqueId: record.id,
      domain: record.domain,
      status: entry.lifecycle?.status,
      promptSha256: entry.prompt.sha256,
      metadata: entry,
      text,
    };
  });
  const manifestFile = readJsonWithBytes(path.join(resolvedRoot, 'sources', 'attack-19.2', 'manifest.json'));
  const manifest = manifestFile.value;
  const project = readJson(path.join(resolvedRoot, 'package.json'));
  return createResearchCatalog({
    techniques,
    prompts,
    rules: [],
    validations: [],
    version: {
      id: 'attack-19.2',
      attackVersion: '19.2',
      libraryVersion: project.version,
      contentVersion: metadata.contentVersion,
      status: 'pinned',
      sourceCommit: manifest.commit_sha,
      sourceTag: manifest.requested_release,
      sourceManifestHash: `sha256:${digest(manifestFile.bytes)}`,
      counts: Object.freeze({techniques: techniques.length, prompts: prompts.length, rules: 0, validations: 0}),
      limitations: Object.freeze([
        'Prompt coverage does not establish human review, product compatibility or detection effectiveness.',
        'No native rule or validation evidence is published by this reference adapter.',
      ]),
    },
  });
}

export function loadAtlasResearchCatalog({root = DEFAULT_ROOT} = {}) {
  const resolvedRoot = path.resolve(root);
  const manifestFile = readJsonWithBytes(path.join(resolvedRoot, 'sources', 'atlas-2026.08', 'manifest.json'));
  const manifest = manifestFile.value;
  const coverageFile = readJsonWithBytes(path.join(resolvedRoot, 'content', 'atlas', 'coverage.json'));
  const coverage = coverageFile.value;
  if (coverage.framework !== 'ATLAS' || coverage.atlasVersion !== manifest.contentVersion
      || coverage.sourceCommit !== manifest.tag?.commitSha || !Array.isArray(coverage.generatedFiles)) {
    throw new Error('ATLAS coverage does not match the pinned source manifest');
  }
  if (coverage.sourceManifest?.path !== 'sources/atlas-2026.08/manifest.json'
      || coverage.sourceManifest.bytes !== manifestFile.bytes.length
      || coverage.sourceManifest.sha256 !== digest(manifestFile.bytes)) {
    throw new Error('ATLAS source manifest bytes do not match coverage');
  }
  const files = new Map(coverage.generatedFiles.map(file => [file.path, file]));
  if (files.size !== coverage.generatedFiles.length) throw new Error('ATLAS coverage contains duplicate files');
  function verifyBytes(relative, bytes) {
    const entry = files.get(relative);
    if (!entry || entry.bytes !== bytes.length || entry.sha256 !== digest(bytes)) {
      throw new Error('ATLAS bytes do not match coverage');
    }
  }
  function verifiedJson(relative) {
    const input = readJsonWithBytes(path.join(resolvedRoot, ...relative.split('/')));
    verifyBytes(relative, input.bytes);
    return input.value;
  }
  const techniques = verifiedJson('content/atlas/catalog.json');
  const metadata = verifiedJson('content/atlas/index.json');
  if (!Array.isArray(techniques) || !techniques.length || !Array.isArray(metadata.records)) {
    throw new Error('ATLAS catalog and prompt metadata must contain records');
  }
  const metadataById = new Map(metadata.records.map(entry => [entry.id, entry]));
  if (metadataById.size !== techniques.length || metadata.records.length !== techniques.length) {
    throw new Error('ATLAS prompt metadata does not match the catalog');
  }
  const prompts = techniques.map(record => {
    if (record.framework !== 'ATLAS' || record.domain !== 'ATLAS'
        || record.atlasVersion !== manifest.contentVersion || !/^AML\.T\d{4}(?:\.\d{3})?$/.test(record.id)) {
      throw new Error('ATLAS catalog identity is invalid');
    }
    const entry = metadataById.get(record.id);
    if (!entry || entry.techniqueId !== record.id || entry.framework !== 'ATLAS'
        || entry.domain !== 'ATLAS' || entry.atlasVersion !== manifest.contentVersion || entry.status !== 'generated') {
      throw new Error('ATLAS prompt metadata identity or evidence status is invalid');
    }
    const relative = `content/atlas/prompts/${record.id}.txt`;
    if (entry.prompt?.path !== relative) throw new Error('ATLAS prompt metadata path is not canonical');
    const {bytes, text} = readUtf8(path.join(resolvedRoot, ...relative.split('/')));
    verifyBytes(relative, bytes);
    if (entry.prompt.bytes !== bytes.length || entry.prompt.sha256 !== digest(bytes)) {
      throw new Error('ATLAS prompt bytes do not match metadata');
    }
    return {
      id: record.id, techniqueId: record.id, framework: 'ATLAS', domain: 'ATLAS', atlasVersion: record.atlasVersion,
      status: 'generated', promptSha256: entry.prompt.sha256, metadata: entry, text,
    };
  });
  const project = readJson(path.join(resolvedRoot, 'package.json'));
  return createAtlasResearchCatalog({
    techniques, prompts,
    version: {
      id: `atlas-${manifest.contentVersion}`, framework: 'ATLAS', atlasVersion: manifest.contentVersion,
      formatVersion: manifest.formatVersion, libraryVersion: project.version, status: 'pinned',
      sourceCommit: manifest.tag.commitSha, sourceTag: manifest.requestedRelease,
      sourceManifestHash: `sha256:${digest(manifestFile.bytes)}`, coverageHash: `sha256:${digest(coverageFile.bytes)}`,
      counts: {techniques: techniques.length, prompts: prompts.length, rules: 0, validations: 0},
      limitations: [
        'ATLAS source maturity is separate from project prompt review or detection validation.',
        'All ATLAS prompts are generated drafts; no native rule or validation evidence is published.',
      ],
    },
  });
}
