#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const API_ORIGIN = 'https://api.rosti.dev';
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_PAGES = 20;
const MAX_IOCS = 2000;
const REQUEST_TIMEOUT_MS = 15000;
const REPORT_ID = /^[A-Za-z0-9]{8}$/;
const TECHNIQUE_ID = /^T\d{4}(?:\.\d{3})?$/;
const PROJECT_ROOT = path.resolve(__dirname, '..');

class RostiError extends Error {}

function safeText(value, field, maximum = 4096) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum || value.includes('\0')) {
    throw new RostiError(`Invalid ${field} in Rösti response.`);
  }
  return value;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function readBoundedJsonResponse(response, maximum = MAX_RESPONSE_BYTES) {
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new RostiError('Invalid response size limit.');
  if (!response || typeof response.status !== 'number') throw new RostiError('Rösti returned an invalid response.');
  if (!response.ok) throw new RostiError(`Rösti request failed with HTTP ${response.status}.`);
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maximum) throw new RostiError('Rösti response exceeds the decoded size limit.');
  if (!response.body) throw new RostiError('Rösti returned an empty response.');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) {
        await reader.cancel();
        throw new RostiError('Rösti response exceeds the decoded size limit.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RostiError) throw error;
    throw new RostiError('Rösti response could not be read.');
  }
  const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), total);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new RostiError('Rösti response is not valid UTF-8.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new RostiError('Rösti returned invalid JSON.');
  }
}

async function collectPages(fetchPage, { maxPages = MAX_PAGES, maxItems = MAX_IOCS } = {}) {
  if (typeof fetchPage !== 'function' || !Number.isSafeInteger(maxPages) || maxPages < 1 ||
      !Number.isSafeInteger(maxItems) || maxItems < 0) throw new RostiError('Invalid pagination limits.');
  const items = [];
  const cursors = new Set();
  let cursor;
  for (let page = 0; page < maxPages; page++) {
    const envelope = await fetchPage(cursor);
    if (!envelope || !Array.isArray(envelope.data) || !envelope.meta || typeof envelope.meta.has_more !== 'boolean') {
      throw new RostiError('Rösti returned an invalid pagination envelope.');
    }
    if (items.length + envelope.data.length > maxItems) throw new RostiError('Rösti result exceeds the configured item limit.');
    items.push(...envelope.data);
    if (!envelope.meta.has_more) return items;
    const next = envelope.meta.next_cursor;
    if (typeof next !== 'string' || next.length < 1 || next.length > 4096) throw new RostiError('Rösti returned an invalid cursor.');
    if (cursors.has(next)) throw new RostiError('Rösti pagination cursor repeated.');
    cursors.add(next);
    cursor = next;
  }
  throw new RostiError('Rösti pagination exceeds the configured page limit.');
}

function createClient({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  if (typeof apiKey !== 'string' || apiKey.length < 1 || apiKey.length > 1024 || /[\r\n]/.test(apiKey)) {
    throw new RostiError('ROSTI_API_KEY must contain a valid API key.');
  }
  if (typeof fetchImpl !== 'function') throw new RostiError('A Fetch-compatible implementation is required.');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000) throw new RostiError('Invalid request timeout.');

  async function get(relative, parameters = {}) {
    if (!relative.startsWith('/v2/') || relative.includes('..')) throw new RostiError('Invalid Rösti API path.');
    const url = new URL(relative, API_ORIGIN);
    if (url.origin !== API_ORIGIN) throw new RostiError('Invalid Rösti API origin.');
    for (const [name, value] of Object.entries(parameters)) {
      if (value !== undefined) url.searchParams.set(name, value);
    }
    let response;
    try {
      response = await fetchImpl(url.href, {
        method: 'GET',
        headers: { Accept: 'application/json', 'X-API-Key': apiKey },
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new RostiError('Rösti request failed before a response was received.');
    }
    return readBoundedJsonResponse(response);
  }

  function validateReportId(id) {
    if (typeof id !== 'string' || !REPORT_ID.test(id)) throw new RostiError('Invalid Rösti report id.');
    return id;
  }

  return Object.freeze({
    getReport: id => get(`/v2/reports/${validateReportId(id)}`),
    getMitreIds: id => collectPages(
      cursor => get(`/v2/reports/${validateReportId(id)}/mitre-ids`, { limit: '100', cursor }),
      { maxPages: MAX_PAGES, maxItems: 1000 },
    ),
    getIocs: id => collectPages(
      cursor => get(`/v2/reports/${validateReportId(id)}/iocs`, { limit: '100', cursor }),
      { maxPages: MAX_PAGES, maxItems: MAX_IOCS },
    ),
  });
}

function countBy(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)));
}

function publicIoc(ioc) {
  if (!ioc || typeof ioc !== 'object') throw new RostiError('Invalid IOC in Rösti response.');
  const result = {
    id: safeText(ioc.id, 'IOC id', 256),
    type: safeText(ioc.type, 'IOC type', 128),
    value: safeText(ioc.value, 'IOC value', 8192),
    category: typeof ioc.category === 'string' ? ioc.category : null,
    idsSuitable: ioc.ids === true,
    risk: typeof ioc.risk?.meaning === 'string' ? ioc.risk.meaning : 'unknown',
    tags: Array.isArray(ioc.tags) ? ioc.tags.filter(tag => typeof tag === 'string').slice(0, 100) : [],
  };
  return result;
}

function buildEnrichment({ report, mitreIds, iocs, activeTechniqueIds, retrievedAt, includeIocValues = false }) {
  if (!report || typeof report !== 'object' || !REPORT_ID.test(report.id) || !Array.isArray(mitreIds) ||
      !Array.isArray(iocs) || !(activeTechniqueIds instanceof Set)) throw new RostiError('Invalid Rösti enrichment input.');
  if (Number.isNaN(Date.parse(retrievedAt))) throw new RostiError('A valid retrieval timestamp is required.');
  const explicit = new Set();
  const unmapped = new Set();
  for (const entry of mitreIds) {
    const id = typeof entry?.id === 'string' ? entry.id : '';
    if (entry?.object_type === 'techniques' && TECHNIQUE_ID.test(id) && activeTechniqueIds.has(id)) explicit.add(id);
    else if (id) unmapped.add(id);
  }
  const normalizedIocs = iocs.map(publicIoc);
  const base = {
    schemaVersion: '1.0.0',
    provider: 'rosti',
    providerApiVersion: '2.8.1',
    retrievedAt: new Date(retrievedAt).toISOString(),
    evidenceStatus: 'external-corroboration',
    validationStatus: 'unvalidated',
    mapping: {
      method: 'provider-explicit',
      limitation: 'Provider mappings are external research leads, not independent ATT&CK validation.',
    },
    report: {
      id: report.id,
      title: safeText(report.title, 'report title', 4096),
      url: safeHttpsUrl(report.url),
      date: typeof report.date === 'string' ? report.date : null,
      checksum: typeof report.checksum === 'string' ? report.checksum : null,
      source: report.source && typeof report.source === 'object' ? {
        id: typeof report.source.id === 'string' ? report.source.id : null,
        name: typeof report.source.name === 'string' ? report.source.name : null,
        url: safeHttpsUrl(report.source.url),
      } : null,
    },
    techniqueIds: [...explicit].sort(),
    unmappedMitreIds: [...unmapped].sort(),
    iocSummary: {
      total: normalizedIocs.length,
      idsSuitable: normalizedIocs.filter(ioc => ioc.idsSuitable).length,
      byType: countBy(normalizedIocs.map(ioc => ioc.type)),
      byCategory: countBy(normalizedIocs.map(ioc => ioc.category || 'unknown')),
      falsePositiveRisk: countBy(normalizedIocs.map(ioc => ioc.risk)),
    },
  };
  if (includeIocValues) {
    base.iocValueWarning = 'IOC values are unvalidated external data for local research; review freshness, rights and false-positive risk before use.';
    base.iocs = normalizedIocs;
  }
  const hashInput = stableJson(base);
  return { ...base, contentSha256: createHash('sha256').update(hashInput).digest('hex') };
}

function outputParent(filename) {
  const destination = path.resolve(filename);
  const relativeToProject = path.relative(PROJECT_ROOT, destination);
  if (relativeToProject === '' || (!relativeToProject.startsWith(`..${path.sep}`) && relativeToProject !== '..' && !path.isAbsolute(relativeToProject))) {
    throw new RostiError('Rösti output must be written outside the source repository.');
  }
  const parent = path.dirname(destination);
  let current = path.parse(parent).root;
  for (const part of parent.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new RostiError('Output parent must be a real existing directory.');
  }
  return { destination, parent, stat: fs.statSync(parent) };
}

function writeNewFile(filename, value) {
  let temporary;
  let descriptor;
  try {
    const { destination, parent, stat } = outputParent(filename);
    temporary = path.join(parent, `.pad-rosti-${randomUUID()}.tmp`);
    descriptor = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    fs.writeFileSync(descriptor, JSON.stringify(stable(value), null, 2) + '\n', 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    const checked = outputParent(filename);
    if (checked.stat.dev !== stat.dev || checked.stat.ino !== stat.ino) throw new RostiError('Output directory changed during the write.');
    fs.linkSync(temporary, destination);
  } catch (error) {
    if (error instanceof RostiError) throw error;
    if (error.code === 'EEXIST') throw new RostiError('Output already exists; choose a new file path.');
    throw new RostiError('Output could not be written safely.');
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (temporary) {
      try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
}

function parseArguments(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { help: true };
  const options = Object.create(null);
  const flags = new Set(['include-ioc-values']);
  const valued = new Set(['report', 'output', 'retrieved-at']);
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new RostiError('Unknown argument; use --help.');
    const name = token.slice(2);
    if (flags.has(name)) {
      if (Object.hasOwn(options, name)) throw new RostiError('Duplicate option; use --help.');
      options[name] = true;
    } else if (valued.has(name)) {
      if (Object.hasOwn(options, name)) throw new RostiError('Duplicate option; use --help.');
      const value = argv[++index];
      if (!value || value.startsWith('--') || value.includes('\0')) throw new RostiError('Missing or invalid option value; use --help.');
      options[name] = value;
    } else throw new RostiError('Unknown option; use --help.');
  }
  if (!options.report || !options.output) throw new RostiError('Both --report and --output are required.');
  if (!REPORT_ID.test(options.report)) throw new RostiError('Invalid Rösti report id.');
  return options;
}

const HELP = `Rösti local research enrichment (Node.js 22+)\n\nBefore running, inject ROSTI_API_KEY with a trusted secret manager so the value is not typed into command history.\n\nUsage:\n  node scripts/rosti_sync.cjs --report REPORT_ID --output NEW_FILE [--retrieved-at ISO_TIME] [--include-ioc-values]\n\nThe output must be outside the source repository. The command contacts only https://api.rosti.dev/v2, follows no redirects, bounds responses and pagination, and never overwrites output. The API key is read only from ROSTI_API_KEY. Default output aggregates IOC values away. All mappings remain unvalidated external corroboration.\n`;

async function main(argv = process.argv.slice(2), environment = process.env) {
  const options = parseArguments(argv);
  if (options.help) return HELP;
  const client = createClient({ apiKey: environment.ROSTI_API_KEY });
  const [report, mitreIds, iocs] = await Promise.all([
    client.getReport(options.report),
    client.getMitreIds(options.report),
    client.getIocs(options.report),
  ]);
  const catalog = require('../demo/catalog.js');
  const enrichment = buildEnrichment({
    report,
    mitreIds,
    iocs,
    activeTechniqueIds: new Set(catalog.map(record => record.id)),
    retrievedAt: options['retrieved-at'] || new Date().toISOString(),
    includeIocValues: options['include-ioc-values'] === true,
  });
  writeNewFile(options.output, enrichment);
  return JSON.stringify({ report: report.id, techniques: enrichment.techniqueIds.length, iocs: enrichment.iocSummary.total, sha256: enrichment.contentSha256 }) + '\n';
}

if (require.main === module) {
  main().then(output => process.stdout.write(output)).catch(error => {
    const message = error instanceof RostiError ? error.message : 'Rösti enrichment failed safely.';
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  API_ORIGIN,
  RostiError,
  buildEnrichment,
  collectPages,
  createClient,
  main,
  readBoundedJsonResponse,
  writeNewFile,
};
