import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createResearchCatalog} from '../../../packages/core/src/research-catalog.mjs';

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
