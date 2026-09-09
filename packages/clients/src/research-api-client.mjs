const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const TECHNIQUE_ID = /^T\d{4}(?:\.\d{3})?$/;
const RESOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class ResearchApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ResearchApiError';
    this.status = status;
    this.code = code;
  }
}

function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('baseUrl must be an absolute HTTP or HTTPS URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new TypeError('baseUrl must be an absolute HTTP or HTTPS URL without credentials, query or fragment');
  }
  return url.href.replace(/\/$/, '');
}

function identifier(value, kind) {
  const pattern = kind === 'technique' || kind === 'prompt' ? TECHNIQUE_ID : RESOURCE_ID;
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new TypeError(kind === 'technique' || kind === 'prompt'
      ? 'Expected a valid ATT&CK technique ID'
      : 'Expected a valid resource ID');
  }
  return encodeURIComponent(value);
}

function parameters(options) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options || {})) {
    if (value === undefined || key === 'ifNoneMatch') continue;
    if (!['string', 'number'].includes(typeof value)) throw new TypeError('Query option values must be strings or numbers');
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function readBoundedText(response, maximum = MAX_RESPONSE_BYTES) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    throw new ResearchApiError(502, 'invalid_response', 'The API returned an unreadable response body.');
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        await reader.cancel();
        throw new ResearchApiError(502, 'invalid_response', 'The API returned an unreadable response body.');
      }
      total += value.byteLength;
      if (total > maximum) {
        await reader.cancel();
        throw new ResearchApiError(502, 'response_too_large', 'The API response exceeds the client limit.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ResearchApiError) throw error;
    throw new ResearchApiError(502, 'invalid_response', 'The API response could not be read.');
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), total).toString('utf8');
}

export function createResearchApiClient({baseUrl, fetch: fetchImplementation = globalThis.fetch, timeoutMs = 10_000}) {
  const root = normalizeBaseUrl(baseUrl);
  if (typeof fetchImplementation !== 'function') throw new TypeError('A fetch implementation is required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw new TypeError('timeoutMs must be 1 through 60000');

  async function request(path, options = {}) {
    const headers = {Accept: 'application/json'};
    if (options.ifNoneMatch !== undefined) {
      if (typeof options.ifNoneMatch !== 'string' || options.ifNoneMatch.length > 256 || /[\r\n]/.test(options.ifNoneMatch)) {
        throw new TypeError('ifNoneMatch is invalid');
      }
      headers['If-None-Match'] = options.ifNoneMatch;
    }
    const response = await fetchImplementation(root + path + parameters(options), {
      method: 'GET', headers, signal: AbortSignal.timeout(timeoutMs), redirect: 'error',
    });
    const etag = response.headers.get('etag');
    if (response.status === 304) return {status: 304, etag, body: null};
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) throw new ResearchApiError(502, 'response_too_large', 'The API response exceeds the client limit.');
    const raw = await readBoundedText(response);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ResearchApiError(502, 'invalid_response', 'The API returned invalid JSON.');
    }
    if (!response.ok) {
      const error = body?.error;
      throw new ResearchApiError(response.status, typeof error?.code === 'string' ? error.code : 'api_error',
        typeof error?.message === 'string' ? error.message : 'The API request failed.');
    }
    return {status: response.status, etag, body};
  }

  const list = resource => options => request(`/v1/${resource}`, options);
  const get = (resource, kind) => async id => request(`/v1/${resource}/${identifier(id, kind)}`);
  return Object.freeze({
    listTechniques: list('techniques'), getTechnique: get('techniques', 'technique'),
    listPrompts: list('prompts'), getPrompt: get('prompts', 'prompt'),
    listRules: list('rules'), getRule: get('rules', 'rule'),
    listValidations: list('validations'), getValidation: get('validations', 'validation'),
    listVersions: list('versions'), getVersion: get('versions', 'version'),
    listRelationships: list('relationships'), getRelationship: get('relationships', 'relationship'),
    search: options => request('/v1/search', options),
  });
}
