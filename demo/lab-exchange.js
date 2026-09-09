(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./core.js'), root.crypto);
  else root.PAD_LAB = factory(root.PAD, root.crypto);
})(globalThis, function (core, cryptoProvider) {
  'use strict';

  const LIMITS = Object.freeze({records: 50, jsonBytes: 1024 * 1024, promptBytes: 1024 * 1024, totalPromptBytes: 4 * 1024 * 1024});
  const STATUSES = Object.freeze(['observed', 'not-observed', 'inconclusive', 'not-run']);
  const ROW_KEYS = ['techniqueId', 'framework', 'domain', 'sourceUrl', 'promptSha256'];
  const PLAN_KEYS = ['schemaVersion', 'title', 'authorizationReference', 'status', 'evidenceStatus', 'records', 'planId'];
  const HASH = /^[a-f0-9]{64}$/;
  const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
  const SECRET = /-----BEGIN .*PRIVATE KEY-----|\b(?:gh[pousr]_|github_pat_|sk-(?:proj-|ant-)?)[A-Za-z0-9_-]{20,}|\bAKIA[A-Z0-9]{16}\b|\bBearer\s+\S+|\b(?:api[_ -]?key|password|token|secret)\s*[:=]\s*\S+/i;
  const requireCondition = (value, message) => { if (!value) throw new Error(message); };
  const key = row => `${row.framework}:${row.domain}:${row.techniqueId}`;

  function object(value) {
    requireCondition(value !== null && typeof value === 'object' && !Array.isArray(value)
      && [Object.prototype, null].includes(Object.getPrototypeOf(value)), 'Expected a plain lab object');
  }

  function exactKeys(value, keys) {
    object(value);
    requireCondition(Object.keys(value).length === keys.length && Object.keys(value).every(field => keys.includes(field)),
      'Unsupported or missing lab fields');
  }

  function boundedRows(rows) {
    requireCondition(Array.isArray(rows) && rows.length > 0 && rows.length <= LIMITS.records, 'Lab plans and results require 1–50 records');
    for (let index = 0; index < rows.length; index += 1) requireCondition(Object.hasOwn(rows, index), 'Lab selections must not contain empty slots');
  }

  function labels(options) {
    exactKeys(options, ['title', 'authorizationReference']);
    requireCondition(typeof options.title === 'string' && options.title.trim().length > 0 && options.title.length <= 120
      && !CONTROL.test(options.title) && !SECRET.test(options.title), 'Use a short non-sensitive lab title');
    requireCondition(typeof options.authorizationReference === 'string'
      && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(options.authorizationReference)
      && !SECRET.test(options.authorizationReference), 'Use a non-sensitive authorization reference of at most 64 characters');
    return {title: options.title.trim(), authorizationReference: options.authorizationReference};
  }

  function identity(techniqueId, framework, domain, sourceUrl) {
    const atlas = framework === 'ATLAS';
    requireCondition(typeof techniqueId === 'string'
      && (atlas ? /^AML\.T\d{4}(?:\.\d{3})?$/ : /^T\d{4}(?:\.\d{3})?$/).test(techniqueId), 'Invalid lab technique identifier');
    requireCondition(atlas ? domain === 'ATLAS' : framework === 'ATT&CK' && ['Enterprise', 'Mobile', 'ICS'].includes(domain),
      'Invalid lab framework or domain');
    const expected = atlas ? `https://atlas.mitre.org/techniques/${techniqueId}`
      : `https://attack.mitre.org/techniques/${techniqueId.replace('.', '/')}`;
    requireCondition(sourceUrl === expected, 'Lab source must match its official technique reference');
    return {techniqueId, framework, domain, sourceUrl};
  }

  async function digest(text) {
    requireCondition(cryptoProvider?.subtle && typeof TextEncoder !== 'undefined', 'Local SHA-256 requires Web Crypto in a secure browser context');
    const bytes = await cryptoProvider.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function createPlan(records, options) {
    boundedRows(records);
    const metadata = labels(options);
    requireCondition(typeof core?.composePrompt === 'function', 'The local prompt composer is unavailable');
    const seen = new Set();
    let totalBytes = 0;
    // Capture all inputs before awaiting hashes, so later UI edits cannot alter this plan.
    const captured = records.map(record => {
      object(record);
      const framework = record.framework === undefined ? (record.domain === 'ATLAS' ? 'ATLAS' : 'ATT&CK') : record.framework;
      const row = identity(record.id, framework, record.domain, record.sourceUrl);
      requireCondition(!seen.has(key(row)), 'Duplicate lab technique');
      seen.add(key(row));
      let prompt;
      try { prompt = core.composePrompt(record); } catch { throw new Error('Cannot compose the selected lab prompt'); }
      requireCondition(typeof prompt === 'string' && prompt.length <= LIMITS.promptBytes, 'Lab prompt exceeds its size limit');
      const bytes = new TextEncoder().encode(prompt).length;
      totalBytes += bytes;
      requireCondition(bytes <= LIMITS.promptBytes && totalBytes <= LIMITS.totalPromptBytes, 'Lab prompts exceed their size limit');
      return {row, prompt};
    });
    const rows = await Promise.all(captured.map(async ({row, prompt}) => ({...row, promptSha256: await digest(prompt)})));
    const plan = {schemaVersion: 'pad-lab-plan-1', ...metadata, status: 'planned', evidenceStatus: 'unverified', records: rows};
    return {...plan, planId: `sha256:${await digest(JSON.stringify(plan))}`};
  }

  async function validatedPlan(input) {
    exactKeys(input, PLAN_KEYS);
    requireCondition(input.schemaVersion === 'pad-lab-plan-1' && input.status === 'planned'
      && input.evidenceStatus === 'unverified', 'Unsupported lab plan');
    const metadata = labels({title: input.title, authorizationReference: input.authorizationReference});
    requireCondition(metadata.title === input.title, 'Lab plan title is not canonical');
    boundedRows(input.records);
    const seen = new Set();
    const records = input.records.map(record => {
      exactKeys(record, ROW_KEYS);
      const row = identity(record.techniqueId, record.framework, record.domain, record.sourceUrl);
      requireCondition(typeof record.promptSha256 === 'string' && HASH.test(record.promptSha256), 'Invalid lab prompt hash');
      requireCondition(!seen.has(key(row)), 'Duplicate lab technique');
      seen.add(key(row));
      return {...row, promptSha256: record.promptSha256};
    });
    const planId = input.planId;
    requireCondition(typeof planId === 'string' && /^sha256:[a-f0-9]{64}$/.test(planId), 'Invalid lab plan identity');
    const plan = {schemaVersion: 'pad-lab-plan-1', ...metadata, status: 'planned', evidenceStatus: 'unverified', records};
    requireCondition(planId === `sha256:${await digest(JSON.stringify(plan))}`, 'Lab plan identity mismatch');
    return {...plan, planId};
  }

  async function createResultTemplate(input) {
    const plan = await validatedPlan(input);
    return {schemaVersion: 'pad-lab-results-1', planId: plan.planId, results: plan.records.map(row => ({
      techniqueId: row.techniqueId, framework: row.framework, domain: row.domain,
      promptSha256: row.promptSha256, fixtureSha256: null, runSha256: null, status: 'not-run',
    }))};
  }

  function parseEnvelope(text) {
    requireCondition(typeof text === 'string' && text.length > 0 && text.length <= LIMITS.jsonBytes
      && new TextEncoder().encode(text).length <= LIMITS.jsonBytes, 'Lab result JSON exceeds its size limit');
    try {
      // Inspect structure before JSON.parse: depth and duplicate keys must fail closed.
      const stack = [];
      for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (char === '"') {
          const start = index;
          for (index += 1; index < text.length && text[index] !== '"'; index += 1) if (text[index] === '\\') index += 1;
          const token = JSON.parse(text.slice(start, index + 1));
          let next = index + 1;
          while (/\s/.test(text[next] || '') && next < text.length) next += 1;
          if (text[next] === ':') {
            const keys = stack[stack.length - 1];
            requireCondition(keys instanceof Set && !keys.has(token), 'Duplicate lab field');
            keys.add(token);
          }
        } else if (char === '{' || char === '[') {
          stack.push(char === '{' ? new Set() : null);
          requireCondition(stack.length <= 8, 'Lab JSON nesting limit');
        } else if (char === '}' || char === ']') stack.pop();
      }
      return JSON.parse(text);
    } catch { throw new Error('Invalid lab JSON: use a bounded project result envelope with unique fields'); }
  }

  async function importResults(jsonString, inputPlan) {
    const envelope = parseEnvelope(jsonString);
    exactKeys(envelope, ['schemaVersion', 'planId', 'results']);
    requireCondition(envelope.schemaVersion === 'pad-lab-results-1', 'Only the project lab result envelope is accepted');
    const plan = await validatedPlan(inputPlan);
    requireCondition(envelope.planId === plan.planId, 'Lab result plan identity mismatch');
    boundedRows(envelope.results);
    const planned = new Map(plan.records.map(row => [key(row), row]));
    const seen = new Set();
    const results = envelope.results.map(row => {
      exactKeys(row, ['techniqueId', 'framework', 'domain', 'promptSha256', 'fixtureSha256', 'runSha256', 'status']);
      for (const field of ['techniqueId', 'framework', 'domain']) requireCondition(typeof row[field] === 'string', 'Invalid lab result identity');
      const record = planned.get(key(row));
      requireCondition(record && !seen.has(key(row)), 'Lab result is duplicate or outside the plan');
      seen.add(key(row));
      for (const field of ['promptSha256', 'fixtureSha256', 'runSha256']) {
        requireCondition(typeof row[field] === 'string' && HASH.test(row[field]), 'Lab results require prompt, fixture and run SHA-256 references');
      }
      requireCondition(row.promptSha256 === record.promptSha256, 'Lab result prompt hash mismatch');
      requireCondition(STATUSES.includes(row.status), 'Unsupported lab outcome status');
      return {techniqueId: record.techniqueId, framework: record.framework, domain: record.domain,
        promptSha256: record.promptSha256, fixtureSha256: row.fixtureSha256, runSha256: row.runSha256, status: row.status};
    });
    return {schemaVersion: 'pad-lab-import-1', planId: plan.planId, evidenceStatus: 'unverified', validationLevel: 'generated',
      results, unreportedRecords: plan.records.length - results.length};
  }

  return Object.freeze({LIMITS, STATUSES, createPlan, createResultTemplate, importResults});
});
