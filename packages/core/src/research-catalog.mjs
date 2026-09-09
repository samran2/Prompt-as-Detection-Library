import {createHash, timingSafeEqual} from 'node:crypto';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CURSOR = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashed(value) {
  return Object.freeze({...value, contentHash: `sha256:${sha256(canonicalJson(value))}`});
}

function immutableJson(value, depth = 0, ancestors = new Set()) {
  if (depth > 64) throw new TypeError('Catalog metadata is too deeply nested');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object') throw new TypeError('Catalog metadata must be JSON-compatible');
  if (ancestors.has(value)) throw new TypeError('Catalog metadata must not contain cycles');
  ancestors.add(value);
  let copy;
  if (Array.isArray(value)) copy = value.map(item => immutableJson(item, depth + 1, ancestors));
  else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Catalog metadata must contain plain objects');
    copy = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, immutableJson(item, depth + 1, ancestors)]));
  }
  ancestors.delete(value);
  return Object.freeze(copy);
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value || value.length > 100_000) throw new TypeError(`Invalid ${field}`);
  return value;
}

function requiredId(value, field = 'id') {
  requiredString(value, field);
  if (!ID.test(value)) throw new TypeError(`Invalid ${field}`);
  return value;
}

function strings(value, field) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new TypeError(`Invalid ${field}`);
  return Object.freeze([...value]);
}

function index(resources, name) {
  const data = new Map();
  for (const resource of resources) {
    if (data.has(resource.id)) throw new TypeError(`Duplicate ${name} id`);
    data.set(resource.id, resource);
  }
  let view;
  view = Object.freeze({
    get size() { return data.size; },
    get(key) { return data.get(key); },
    has(key) { return data.has(key); },
    entries() { return data.entries(); },
    keys() { return data.keys(); },
    values() { return data.values(); },
    forEach(callback, thisArg) {
      if (typeof callback !== 'function') throw new TypeError('callback must be a function');
      for (const [key, value] of data) callback.call(thisArg, value, key, view);
    },
    [Symbol.iterator]() { return data[Symbol.iterator](); },
  });
  return view;
}

function technique(record) {
  return hashed({
    id: requiredId(record.id),
    name: requiredString(record.name, 'name'),
    domain: requiredString(record.domain, 'domain'),
    kind: requiredString(record.kind, 'kind'),
    tactics: strings(record.tactics, 'tactics'),
    platforms: strings(record.platforms, 'platforms'),
    attackVersion: requiredString(record.attackVersion, 'attackVersion'),
    stixId: requiredId(record.stixId, 'stixId'),
    parentId: record.parentId === null ? null : requiredId(record.parentId, 'parentId'),
    sourceUrl: requiredString(record.sourceUrl, 'sourceUrl'),
    behavior: requiredString(record.behavior, 'behavior'),
    telemetry: strings(record.telemetry, 'telemetry'),
  });
}

function prompt(record) {
  const text = requiredString(record.text, 'text');
  const promptSha256 = sha256(text);
  if (record.promptSha256 !== undefined && record.promptSha256 !== promptSha256) throw new TypeError('Prompt hash does not match text');
  return hashed({
    id: requiredId(record.id),
    techniqueId: requiredId(record.techniqueId, 'techniqueId'),
    domain: requiredString(record.domain, 'domain'),
    status: requiredString(record.status, 'status'),
    promptSha256,
    ...(record.metadata === undefined ? {} : {metadata: immutableJson(record.metadata)}),
    text,
  });
}

function suppliedResource(record, name) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError(`Invalid ${name}`);
  requiredId(record.id);
  return hashed(immutableJson(record));
}

function relationship(id, type, source, target) {
  return hashed({id, type, source: immutableJson(source), target: immutableJson(target)});
}

export function createResearchCatalog({techniques, prompts, rules = [], validations = [], version}) {
  if (![techniques, prompts, rules, validations].every(Array.isArray)) throw new TypeError('Catalog collections must be arrays');
  const techniqueItems = Object.freeze(techniques.map(technique).sort((a, b) => a.id.localeCompare(b.id)));
  const promptItems = Object.freeze(prompts.map(prompt).sort((a, b) => a.id.localeCompare(b.id)));
  const ruleItems = Object.freeze(rules.map(item => suppliedResource(item, 'rule')).sort((a, b) => a.id.localeCompare(b.id)));
  const validationItems = Object.freeze(validations.map(item => suppliedResource(item, 'validation')).sort((a, b) => a.id.localeCompare(b.id)));
  const versionItems = Object.freeze([suppliedResource(version, 'version')]);
  const techniqueIndex = index(techniqueItems, 'technique');
  const promptIndex = index(promptItems, 'prompt');
  for (const item of promptItems) {
    if (!techniqueIndex.has(item.techniqueId)) throw new TypeError('Prompt references an unknown technique');
  }
  const relationships = [];
  for (const item of techniqueItems) {
    if (item.parentId) relationships.push(relationship(
      `technique:${item.id}:parent:${item.parentId}`,
      'subtechnique-of',
      {type: 'technique', id: item.id},
      {type: 'technique', id: item.parentId},
    ));
  }
  for (const item of promptItems) relationships.push(relationship(
    `technique:${item.techniqueId}:prompt:${item.id}`,
    'has-prompt',
    {type: 'technique', id: item.techniqueId},
    {type: 'prompt', id: item.id},
  ));
  const collections = Object.freeze({
    techniques: techniqueItems,
    prompts: promptItems,
    rules: ruleItems,
    validations: validationItems,
    versions: versionItems,
    relationships: Object.freeze(relationships.sort((a, b) => a.id.localeCompare(b.id))),
  });
  const indexes = Object.freeze(Object.fromEntries(Object.entries(collections).map(([name, items]) => [name, index(items, name)])));
  const snapshotHash = `sha256:${sha256(canonicalJson(Object.fromEntries(
    Object.entries(collections).map(([name, items]) => [name, items.map(item => item.contentHash)]),
  )))}`;
  return Object.freeze({collections, indexes, snapshotHash});
}

export function queryFingerprint(value) {
  return sha256(canonicalJson(value));
}

export function encodeCursor({resource, offset, queryHash, snapshotHash}) {
  const payload = Buffer.from(canonicalJson({v: 1, resource, offset, queryHash, snapshotHash})).toString('base64url');
  const signature = createHash('sha256').update(`pad-cursor-v1\0${snapshotHash}\0${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}

export function decodeCursor(cursor, expected) {
  if (typeof cursor !== 'string' || cursor.length > 512 || !CURSOR.test(cursor)) throw new TypeError('Invalid cursor');
  const [payload, signature] = cursor.split('.');
  const actual = Buffer.from(signature, 'base64url');
  const wanted = createHash('sha256').update(`pad-cursor-v1\0${expected.snapshotHash}\0${payload}`).digest();
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) throw new TypeError('Invalid cursor');
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw new TypeError('Invalid cursor');
  }
  if (!parsed || parsed.v !== 1 || parsed.resource !== expected.resource || parsed.queryHash !== expected.queryHash
      || parsed.snapshotHash !== expected.snapshotHash || !Number.isSafeInteger(parsed.offset) || parsed.offset < 0) {
    throw new TypeError('Invalid cursor');
  }
  return parsed.offset;
}

export function page(items, {resource, pageSize, cursor, filters, snapshotHash}) {
  const queryHash = queryFingerprint(filters);
  const offset = cursor ? decodeCursor(cursor, {resource, queryHash, snapshotHash}) : 0;
  if (offset > items.length) throw new TypeError('Invalid cursor');
  const data = Object.freeze(items.slice(offset, offset + pageSize));
  const nextOffset = offset + data.length;
  const nextCursor = nextOffset < items.length
    ? encodeCursor({resource, offset: nextOffset, queryHash, snapshotHash})
    : null;
  return Object.freeze({data, meta: Object.freeze({pageSize, totalItems: items.length, nextCursor, snapshotHash})});
}
