import {createHash} from 'node:crypto';
import {page} from '../../../packages/core/src/research-catalog.mjs';

const COLLECTIONS = new Set(['techniques', 'prompts', 'rules', 'validations', 'versions', 'relationships']);
const STATUS = new Set(['generated', 'reviewed', 'lab-validated', 'field-confirmed', 'unassessed', 'not-applicable', 'passed', 'failed', 'pinned']);
const DOMAINS = new Set(['Enterprise', 'Mobile', 'ICS']);
const KINDS = new Set(['technique', 'subtechnique']);
const BACKENDS = new Set(['panther', 'sentinel', 'defender-xdr', 'splunk']);
const RESOURCE_TYPES = new Set(['technique', 'prompt', 'rule', 'validation', 'version']);
const SEARCH_TYPES = new Set(['technique', 'prompt', 'rule', 'validation']);
const ALLOWED = Object.freeze({
  techniques: new Set(['pageSize', 'cursor', 'domain', 'tactic', 'platform', 'kind']),
  prompts: new Set(['pageSize', 'cursor', 'domain', 'status', 'techniqueId']),
  rules: new Set(['pageSize', 'cursor', 'domain', 'status', 'techniqueId', 'backend']),
  validations: new Set(['pageSize', 'cursor', 'status', 'ruleId', 'promptId']),
  versions: new Set(['pageSize', 'cursor', 'status']),
  relationships: new Set(['pageSize', 'cursor', 'type', 'sourceType', 'sourceId', 'targetType', 'targetId']),
  search: new Set(['pageSize', 'cursor', 'q', 'resourceType', 'domain']),
});
const TECHNIQUE_ID = /^T\d{4}(?:\.\d{3})?$/;
const RESOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const BASE_HEADERS = Object.freeze({
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
});

class RequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function headerDigest(body) {
  const digest = createHash('sha256').update(body).digest();
  return {etag: `"${digest.toString('hex')}"`, contentDigest: `sha-256=:${digest.toString('base64')}:`};
}

function conditionalMatch(value, etag) {
  return typeof value === 'string' && value.split(',').map(item => item.trim()).some(item => item === '*' || item === etag);
}

function sendJson(req, response, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  const {etag, contentDigest} = headerDigest(body);
  const headers = {...BASE_HEADERS, ...extraHeaders, ETag: etag, 'Content-Digest': contentDigest};
  if (status === 200 && conditionalMatch(req.headers['if-none-match'], etag)) {
    response.writeHead(304, headers);
    response.end();
    return;
  }
  headers['Content-Type'] = 'application/json; charset=utf-8';
  headers['Content-Length'] = Buffer.byteLength(body).toString();
  response.writeHead(status, headers);
  response.end(req.method === 'HEAD' ? undefined : body);
}

function fail(req, response, status, code, message, headers) {
  sendJson(req, response, status, {error: {code, message}}, headers);
}

function parseQuery(url, resource) {
  const allowed = ALLOWED[resource];
  const values = Object.create(null);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) throw new RequestError(400, 'invalid_request', 'The request contains an unsupported query parameter.');
    const all = url.searchParams.getAll(key);
    if (all.length !== 1) throw new RequestError(400, 'invalid_request', 'Each query parameter may be supplied only once.');
    const value = all[0];
    if (value.length > 512 || /[\0-\x1f\x7f]/.test(value)) throw new RequestError(400, 'invalid_request', 'A query parameter is invalid.');
    values[key] = value;
  }
  const rawPageSize = values.pageSize;
  if (rawPageSize !== undefined && !/^[1-9]\d{0,2}$/.test(rawPageSize)) {
    throw new RequestError(400, 'invalid_request', 'pageSize must be an integer from 1 through 100.');
  }
  const pageSize = rawPageSize === undefined ? 20 : Number(rawPageSize);
  if (pageSize > 100) throw new RequestError(400, 'invalid_request', 'pageSize must be an integer from 1 through 100.');
  if (values.cursor !== undefined && (values.cursor.length > 512 || !values.cursor)) {
    throw new RequestError(400, 'invalid_request', 'cursor is invalid.');
  }
  for (const [key, value] of Object.entries(values)) {
    if (!['pageSize', 'cursor', 'q'].includes(key) && (!value || value.length > 128)) {
      throw new RequestError(400, 'invalid_request', 'A filter is invalid.');
    }
  }
  if (values.status !== undefined && !STATUS.has(values.status)) throw new RequestError(400, 'invalid_request', 'status is invalid.');
  if (values.domain !== undefined && !DOMAINS.has(values.domain)) throw new RequestError(400, 'invalid_request', 'domain is invalid.');
  if (values.kind !== undefined && !KINDS.has(values.kind)) throw new RequestError(400, 'invalid_request', 'kind is invalid.');
  if (values.backend !== undefined && !BACKENDS.has(values.backend)) throw new RequestError(400, 'invalid_request', 'backend is invalid.');
  if (values.resourceType !== undefined && !SEARCH_TYPES.has(values.resourceType)) throw new RequestError(400, 'invalid_request', 'resourceType is invalid.');
  if (values.sourceType !== undefined && !RESOURCE_TYPES.has(values.sourceType)) throw new RequestError(400, 'invalid_request', 'sourceType is invalid.');
  if (values.targetType !== undefined && !RESOURCE_TYPES.has(values.targetType)) throw new RequestError(400, 'invalid_request', 'targetType is invalid.');
  for (const key of ['techniqueId', 'promptId']) {
    if (values[key] !== undefined && !TECHNIQUE_ID.test(values[key])) throw new RequestError(400, 'invalid_request', `${key} is invalid.`);
  }
  for (const key of ['ruleId', 'sourceId', 'targetId']) {
    if (values[key] !== undefined && !RESOURCE_ID.test(values[key])) throw new RequestError(400, 'invalid_request', `${key} is invalid.`);
  }
  return {values, pageSize};
}

function matches(resource, filters) {
  for (const [key, expected] of Object.entries(filters)) {
    if (['pageSize', 'cursor'].includes(key)) continue;
    if (key === 'tactic' && !resource.tactics?.includes(expected)) return false;
    else if (key === 'platform' && !resource.platforms?.includes(expected)) return false;
    else if (key === 'sourceType' && resource.source?.type !== expected) return false;
    else if (key === 'sourceId' && resource.source?.id !== expected) return false;
    else if (key === 'targetType' && resource.target?.type !== expected) return false;
    else if (key === 'targetId' && resource.target?.id !== expected) return false;
    else if (!['tactic', 'platform', 'sourceType', 'sourceId', 'targetType', 'targetId'].includes(key) && resource[key] !== expected) return false;
  }
  return true;
}

function searchDocuments(catalog) {
  const documents = [];
  for (const item of catalog.collections.techniques) documents.push({
    resourceType: 'technique', resourceId: item.id, title: `${item.id} — ${item.name}`,
    domain: item.domain, href: `/v1/techniques/${encodeURIComponent(item.id)}`, contentHash: item.contentHash,
    fields: {id: item.id, name: item.name, domain: item.domain, behavior: item.behavior,
      tactics: item.tactics.join(' '), platforms: item.platforms.join(' '), telemetry: item.telemetry.join(' ')},
  });
  for (const item of catalog.collections.prompts) documents.push({
    resourceType: 'prompt', resourceId: item.id, title: `${item.id} detection prompt`,
    domain: item.domain, href: `/v1/prompts/${encodeURIComponent(item.id)}`, contentHash: item.contentHash,
    fields: {id: item.id, domain: item.domain, text: item.text},
  });
  for (const collection of ['rules', 'validations']) {
    for (const item of catalog.collections[collection]) documents.push({
      resourceType: collection.slice(0, -1), resourceId: item.id, title: item.name || item.id,
      domain: item.domain || null, href: `/v1/${collection}/${encodeURIComponent(item.id)}`, contentHash: item.contentHash,
      fields: {id: item.id, name: item.name || '', domain: item.domain || '', backend: item.backend || ''},
    });
  }
  return Object.freeze(documents);
}

function search(documents, query, filters) {
  const needle = query.toLocaleLowerCase('en-US');
  return documents.filter(document => {
    if (filters.resourceType && document.resourceType !== filters.resourceType) return false;
    if (filters.domain && document.domain !== filters.domain) return false;
    return Object.values(document.fields).some(value => String(value).toLocaleLowerCase('en-US').includes(needle));
  }).map(({fields, ...document}) => Object.freeze({
    ...document,
    matchedFields: Object.freeze(Object.entries(fields)
      .filter(([, value]) => String(value).toLocaleLowerCase('en-US').includes(needle))
      .map(([name]) => name)),
  }));
}

export function createResearchApiHandler({catalog}) {
  if (!catalog?.collections || !catalog?.indexes || typeof catalog.snapshotHash !== 'string') throw new TypeError('A research catalog is required');
  const documents = searchDocuments(catalog);
  return function researchApiHandler(req, response) {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        fail(req, response, 405, 'method_not_allowed', 'This API is read-only.', {'Allow': 'GET, HEAD'});
        return;
      }
      if (typeof req.url !== 'string' || req.url.length > 2048) throw new RequestError(414, 'uri_too_long', 'The request URI is too long.');
      let url;
      try {
        url = new URL(req.url, 'http://127.0.0.1');
      } catch {
        throw new RequestError(400, 'invalid_request', 'The request URI is invalid.');
      }
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'v1' || parts.length < 2 || parts.length > 3) throw new RequestError(404, 'not_found', 'The requested resource was not found.');
      const resource = parts[1];
      if (resource === 'search' && parts.length === 2) {
        const {values, pageSize} = parseQuery(url, 'search');
        if (values.q === undefined || !values.q.trim() || values.q.length > 256) throw new RequestError(400, 'invalid_request', 'q must contain 1 through 256 characters.');
        const filters = Object.fromEntries(Object.entries({q: values.q, resourceType: values.resourceType, domain: values.domain, pageSize})
          .filter(([, value]) => value !== undefined));
        const found = search(documents, values.q, values);
        let result;
        try {
          result = page(found, {resource: 'search', pageSize, cursor: values.cursor, filters, snapshotHash: catalog.snapshotHash});
        } catch {
          throw new RequestError(400, 'invalid_cursor', 'The cursor is invalid for this query and dataset version.');
        }
        sendJson(req, response, 200, result);
        return;
      }
      if (!COLLECTIONS.has(resource)) throw new RequestError(404, 'not_found', 'The requested resource was not found.');
      if (parts.length === 3) {
        if (url.search) throw new RequestError(400, 'invalid_request', 'Item requests do not accept query parameters.');
        let id;
        try {
          id = decodeURIComponent(parts[2]);
        } catch {
          throw new RequestError(400, 'invalid_request', 'The resource identifier is invalid.');
        }
        const pattern = ['techniques', 'prompts'].includes(resource) ? TECHNIQUE_ID : RESOURCE_ID;
        if (!pattern.test(id)) throw new RequestError(404, 'not_found', 'The requested resource was not found.');
        const item = catalog.indexes[resource].get(id);
        if (!item) throw new RequestError(404, 'not_found', 'The requested resource was not found.');
        sendJson(req, response, 200, {data: item, meta: {snapshotHash: catalog.snapshotHash}});
        return;
      }
      const {values, pageSize} = parseQuery(url, resource);
      const filters = Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'cursor'));
      filters.pageSize = pageSize;
      const filtered = catalog.collections[resource].filter(item => matches(item, values));
      let result;
      try {
        result = page(filtered, {resource, pageSize, cursor: values.cursor, filters, snapshotHash: catalog.snapshotHash});
      } catch {
        throw new RequestError(400, 'invalid_cursor', 'The cursor is invalid for this query and dataset version.');
      }
      sendJson(req, response, 200, result);
    } catch (error) {
      if (error instanceof RequestError) fail(req, response, error.status, error.code, error.message);
      else fail(req, response, 500, 'internal_error', 'The request could not be completed.');
    }
  };
}
