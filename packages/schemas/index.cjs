'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SCHEMA_VERSION = '1.0.0';
const CONTRACT_FILES = Object.freeze({
  common: 'v1/common.schema.json',
  'prompt-metadata': 'v1/prompt-metadata.schema.json',
  'review-evidence': 'v1/review-evidence.schema.json',
  'validation-evidence': 'v1/validation-evidence.schema.json',
  'native-rule-support': 'v1/native-rule-support.schema.json',
  'catalog-envelope': 'v1/catalog-envelope.schema.json',
});

const SHA256 = /^[a-f0-9]{64}$/;
const ATTACK_ID = /^T[0-9]{4}(?:\.[0-9]{3})?$/;
const ATTACK_VERSION = /^[0-9]+\.[0-9]+(?:\.[0-9]+)?$/;
const CONTENT_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;
const SOURCE_REVISION = /^[A-Za-z0-9._/-]{7,255}$/;
const DOMAINS = new Set(['enterprise', 'mobile', 'ics']);
const MATURITY = new Set(['generated', 'reviewed', 'lab-validated', 'field-confirmed']);
const BACKENDS = new Set(['panther', 'sentinel', 'defender-xdr', 'splunk']);
const LANGUAGES = Object.freeze({
  panther: 'panther-python',
  sentinel: 'sentinel-kql',
  'defender-xdr': 'defender-advanced-hunting-kql',
  splunk: 'splunk-spl',
});

function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError('Canonical JSON accepts only finite JSON values');
}

function sha256Canonical(value) {
  return crypto.createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function loadSchema(kind) {
  const relative = CONTRACT_FILES[kind];
  if (!relative) throw new RangeError(`Unknown schema contract: ${kind}`);
  return JSON.parse(fs.readFileSync(path.join(__dirname, relative), 'utf8'));
}

function validation() {
  const errors = [];
  const add = (location, message) => errors.push(`${location}: ${message}`);

  function object(value, location, required, optional = []) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      add(location, 'must be an object');
      return false;
    }
    const allowed = new Set([...required, ...optional]);
    for (const key of required) if (!Object.hasOwn(value, key)) add(`${location}.${key}`, 'is required');
    for (const key of Object.keys(value)) if (!allowed.has(key)) add(`${location}.${key}`, 'is not allowed');
    return true;
  }

  function string(value, location, {min = 1, max = 4096, pattern} = {}) {
    if (typeof value !== 'string' || value.length < min || value.length > max || (pattern && !pattern.test(value))) {
      add(location, 'must be a valid string');
      return false;
    }
    return true;
  }

  function enumeration(value, location, allowed) {
    if (!allowed.has(value)) {
      add(location, `must be one of ${[...allowed].join(', ')}`);
      return false;
    }
    return true;
  }

  function array(value, location, {min = 0, max = 1000000, unique = false} = {}) {
    if (!Array.isArray(value) || value.length < min || value.length > max) {
      add(location, `must contain between ${min} and ${max} items`);
      return false;
    }
    if (unique && new Set(value.map(item => JSON.stringify(item))).size !== value.length) add(location, 'must contain unique items');
    return true;
  }

  function stringArray(value, location, options = {}) {
    if (!array(value, location, options)) return false;
    value.forEach((item, index) => string(item, `${location}[${index}]`, {max: options.itemMax || 4096, pattern: options.pattern}));
    return true;
  }

  function hash(value, location) {
    string(value, location, {min: 64, max: 64, pattern: SHA256});
  }

  function contentVersion(value, location) {
    string(value, location, {min: 5, max: 128, pattern: CONTENT_VERSION});
  }

  function identifier(value, location) {
    string(value, location, {min: 3, max: 256, pattern: IDENTIFIER});
  }

  function timestamp(value, location) {
    if (!string(value, location, {min: 20, max: 64}) || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) {
      if (typeof value === 'string') add(location, 'must be an RFC 3339 date-time');
    }
  }

  function uri(value, location) {
    if (!string(value, location, {max: 4096})) return;
    try {
      const parsed = new URL(value);
      if (!parsed.protocol) add(location, 'must be an absolute URI');
    } catch {
      add(location, 'must be an absolute URI');
    }
  }

  function relativePath(value, location) {
    if (!string(value, location, {max: 1024})) return;
    if (path.isAbsolute(value) || value.includes('\\') || value.split('/').includes('..')) add(location, 'must be a contained POSIX-relative path');
  }

  function schemaVersion(value, location = '$.schemaVersion') {
    if (value !== SCHEMA_VERSION) add(location, `must equal ${SCHEMA_VERSION}`);
  }

  function source(value, location) {
    if (!object(value, location, ['title', 'url', 'license'], ['sha256'])) return;
    string(value.title, `${location}.title`);
    uri(value.url, `${location}.url`);
    string(value.license, `${location}.license`, {max: 128, pattern: /^(?:[A-Za-z0-9.-]+|LicenseRef-[A-Za-z0-9.-]+)$/});
    if (Object.hasOwn(value, 'sha256')) hash(value.sha256, `${location}.sha256`);
  }

  function provenance(value, location) {
    if (!object(value, location, ['artifactSha256', 'sources', 'generation'])) return;
    hash(value.artifactSha256, `${location}.artifactSha256`);
    if (array(value.sources, `${location}.sources`, {min: 1, max: 256})) value.sources.forEach((item, index) => source(item, `${location}.sources[${index}]`));
    const generation = value.generation;
    if (object(generation, `${location}.generation`, ['method', 'tool', 'toolVersion', 'generatedAt', 'sourceRevision'])) {
      string(generation.method, `${location}.generation.method`);
      string(generation.tool, `${location}.generation.tool`);
      contentVersion(generation.toolVersion, `${location}.generation.toolVersion`);
      timestamp(generation.generatedAt, `${location}.generation.generatedAt`);
      string(generation.sourceRevision, `${location}.generation.sourceRevision`, {min: 7, max: 255, pattern: SOURCE_REVISION});
    }
  }

  function telemetry(value, location) {
    if (!object(value, location, ['source', 'channel', 'dataComponent', 'requiredFields'])) return;
    string(value.source, `${location}.source`);
    if (value.channel !== null) string(value.channel, `${location}.channel`);
    string(value.dataComponent, `${location}.dataComponent`);
    stringArray(value.requiredFields, `${location}.requiredFields`, {max: 256, unique: true, itemMax: 512});
  }

  function fieldMapping(value, location) {
    if (!object(value, location, ['semanticField', 'nativeField', 'dataType', 'required'], ['notes'])) return;
    string(value.semanticField, `${location}.semanticField`, {max: 256, pattern: /^[A-Za-z0-9_.:-]+$/});
    string(value.nativeField, `${location}.nativeField`, {max: 512});
    enumeration(value.dataType, `${location}.dataType`, new Set(['string', 'integer', 'number', 'boolean', 'timestamp', 'ip', 'array', 'object', 'unknown']));
    if (typeof value.required !== 'boolean') add(`${location}.required`, 'must be boolean');
    if (Object.hasOwn(value, 'notes')) string(value.notes, `${location}.notes`);
  }

  function person(value, location) {
    if (!object(value, location, ['reviewerId', 'displayName'], ['affiliation'])) return;
    identifier(value.reviewerId, `${location}.reviewerId`);
    string(value.displayName, `${location}.displayName`);
    if (Object.hasOwn(value, 'affiliation')) string(value.affiliation, `${location}.affiliation`, {max: 512});
  }

  function subject(value, location) {
    if (!object(value, location, ['type', 'id', 'contentVersion', 'sha256'])) return;
    enumeration(value.type, `${location}.type`, new Set(['prompt', 'native-rule']));
    identifier(value.id, `${location}.id`);
    contentVersion(value.contentVersion, `${location}.contentVersion`);
    hash(value.sha256, `${location}.sha256`);
  }

  function validatePrompt(value, location = '$') {
    const required = ['schemaVersion', 'id', 'attackId', 'attackVersion', 'domain', 'title', 'tactics', 'platforms', 'contentVersion', 'status', 'artifactPath', 'promptSha256', 'license', 'provenance', 'telemetryRequirements', 'fieldMappings', 'limitations', 'reviewSlots', 'validationEvidenceIds'];
    if (!object(value, location, required)) return;
    schemaVersion(value.schemaVersion, `${location}.schemaVersion`);
    string(value.attackId, `${location}.attackId`, {min: 5, max: 9, pattern: ATTACK_ID});
    string(value.attackVersion, `${location}.attackVersion`, {min: 3, max: 32, pattern: ATTACK_VERSION});
    enumeration(value.domain, `${location}.domain`, DOMAINS);
    string(value.id, `${location}.id`, {max: 256, pattern: /^prompt:(?:enterprise|mobile|ics):T[0-9]{4}(?:\.[0-9]{3})?$/});
    if (DOMAINS.has(value.domain) && ATTACK_ID.test(value.attackId) && value.id !== `prompt:${value.domain}:${value.attackId}`) add(`${location}.id`, 'must match domain and attackId');
    string(value.title, `${location}.title`);
    stringArray(value.tactics, `${location}.tactics`, {min: 1, max: 32, unique: true, pattern: /^[a-z][a-z0-9-]{1,127}$/});
    stringArray(value.platforms, `${location}.platforms`, {max: 64, unique: true, itemMax: 128});
    contentVersion(value.contentVersion, `${location}.contentVersion`);
    enumeration(value.status, `${location}.status`, MATURITY);
    relativePath(value.artifactPath, `${location}.artifactPath`);
    hash(value.promptSha256, `${location}.promptSha256`);
    string(value.license, `${location}.license`, {max: 128, pattern: /^(?:[A-Za-z0-9.-]+|LicenseRef-[A-Za-z0-9.-]+)$/});
    provenance(value.provenance, `${location}.provenance`);
    if (value.provenance && value.provenance.artifactSha256 !== value.promptSha256) add(`${location}.provenance.artifactSha256`, 'must match promptSha256');
    if (array(value.telemetryRequirements, `${location}.telemetryRequirements`, {max: 256})) value.telemetryRequirements.forEach((item, index) => telemetry(item, `${location}.telemetryRequirements[${index}]`));
    if (array(value.fieldMappings, `${location}.fieldMappings`, {max: 512})) value.fieldMappings.forEach((item, index) => fieldMapping(item, `${location}.fieldMappings[${index}]`));
    stringArray(value.limitations, `${location}.limitations`, {min: 1, max: 128, unique: true});
    if (array(value.reviewSlots, `${location}.reviewSlots`, {min: 2, max: 2})) {
      value.reviewSlots.forEach((slot, index) => {
        if (!object(slot, `${location}.reviewSlots[${index}]`, ['slot', 'status'], ['evidenceId'])) return;
        if (slot.slot !== index + 1) add(`${location}.reviewSlots[${index}].slot`, `must equal ${index + 1}`);
        enumeration(slot.status, `${location}.reviewSlots[${index}].status`, new Set(['pending', 'completed']));
        if (slot.status === 'completed') {
          if (!Object.hasOwn(slot, 'evidenceId')) add(`${location}.reviewSlots[${index}].evidenceId`, 'is required for completed review');
          else identifier(slot.evidenceId, `${location}.reviewSlots[${index}].evidenceId`);
        } else if (Object.hasOwn(slot, 'evidenceId')) add(`${location}.reviewSlots[${index}].evidenceId`, 'is not allowed for pending review');
      });
    }
    if (array(value.validationEvidenceIds, `${location}.validationEvidenceIds`, {max: 256, unique: true})) value.validationEvidenceIds.forEach((id, index) => identifier(id, `${location}.validationEvidenceIds[${index}]`));
    if (MATURITY.has(value.status) && Array.isArray(value.reviewSlots)) {
      const completed = value.reviewSlots.filter(slot => slot && slot.status === 'completed').length;
      const evidenceIds = value.reviewSlots.filter(slot => slot && slot.status === 'completed').map(slot => slot.evidenceId);
      if (new Set(evidenceIds).size !== evidenceIds.length) add(`${location}.reviewSlots`, 'completed slots must link to distinct evidence records');
      if (value.status === 'generated' && completed === 2) add(`${location}.reviewSlots`, 'generated status must retain at least one pending review');
      if (value.status !== 'generated' && completed !== 2) add(`${location}.reviewSlots`, `${value.status} status requires two completed reviews`);
      const needsValidation = value.status === 'lab-validated' || value.status === 'field-confirmed';
      if (Array.isArray(value.validationEvidenceIds)) {
        if (needsValidation && value.validationEvidenceIds.length === 0) add(`${location}.validationEvidenceIds`, `${value.status} status requires validation evidence`);
        if (!needsValidation && value.validationEvidenceIds.length > 0) add(`${location}.validationEvidenceIds`, `${value.status} status cannot claim validation evidence`);
      }
    }
  }

  function validateReview(value, location = '$') {
    const required = ['schemaVersion', 'id', 'subject', 'slot', 'reviewer', 'independentAttestation', 'rubricVersion', 'reviewedAt', 'scores', 'criticalFindings', 'recommendation', 'summary', 'provenance'];
    if (!object(value, location, required)) return;
    schemaVersion(value.schemaVersion, `${location}.schemaVersion`);
    identifier(value.id, `${location}.id`);
    subject(value.subject, `${location}.subject`);
    if (value.slot !== 1 && value.slot !== 2) add(`${location}.slot`, 'must be 1 or 2');
    person(value.reviewer, `${location}.reviewer`);
    if (value.independentAttestation !== true) add(`${location}.independentAttestation`, 'must be true');
    contentVersion(value.rubricVersion, `${location}.rubricVersion`);
    timestamp(value.reviewedAt, `${location}.reviewedAt`);
    const scoreNames = ['factualAccuracy', 'attackAlignment', 'telemetryFeasibility', 'benignCases', 'safety', 'sourceQuality', 'platformAssumptions'];
    if (object(value.scores, `${location}.scores`, scoreNames)) {
      for (const name of scoreNames) if (!Number.isInteger(value.scores[name]) || value.scores[name] < 1 || value.scores[name] > 5) add(`${location}.scores.${name}`, 'must be an integer from 1 to 5');
    }
    const critical = new Set(['source-fabrication', 'dangerous-guidance', 'unsupported-validation-claim', 'incorrect-attack-mapping', 'unusable-telemetry']);
    if (array(value.criticalFindings, `${location}.criticalFindings`, {max: 32, unique: true})) value.criticalFindings.forEach((finding, index) => enumeration(finding, `${location}.criticalFindings[${index}]`, critical));
    enumeration(value.recommendation, `${location}.recommendation`, new Set(['approve', 'changes-required', 'reject']));
    if (Array.isArray(value.criticalFindings) && value.criticalFindings.length > 0 && value.recommendation === 'approve') add(`${location}.recommendation`, 'cannot approve a review with critical findings');
    string(value.summary, `${location}.summary`, {min: 10, max: 10000});
    provenance(value.provenance, `${location}.provenance`);
  }

  function outcome(value, location) {
    if (!object(value, location, ['outcome'], ['errorCode', 'details'])) return;
    enumeration(value.outcome, `${location}.outcome`, new Set(['match', 'no-match', 'indeterminate', 'error']));
    if (value.outcome === 'error') {
      if (!Object.hasOwn(value, 'errorCode')) add(`${location}.errorCode`, 'is required for error outcome');
      else string(value.errorCode, `${location}.errorCode`, {max: 128, pattern: /^[A-Z][A-Z0-9_]{2,127}$/});
    } else if (Object.hasOwn(value, 'errorCode')) add(`${location}.errorCode`, 'is only allowed for error outcome');
    if (Object.hasOwn(value, 'details')) string(value.details, `${location}.details`);
  }

  function validateEvidence(value, location = '$') {
    const required = ['schemaVersion', 'id', 'subject', 'validationLevel', 'environment', 'validatedBy', 'validatedAt', 'fixtureResults', 'limitations', 'provenance'];
    if (!object(value, location, required)) return;
    schemaVersion(value.schemaVersion, `${location}.schemaVersion`);
    identifier(value.id, `${location}.id`);
    subject(value.subject, `${location}.subject`);
    enumeration(value.validationLevel, `${location}.validationLevel`, new Set(['lab-validated', 'field-confirmed']));
    const environment = value.environment;
    if (object(environment, `${location}.environment`, ['environmentId', 'kind', 'description', 'product', 'productVersion', 'operatingSystems', 'dataClassification'])) {
      identifier(environment.environmentId, `${location}.environment.environmentId`);
      enumeration(environment.kind, `${location}.environment.kind`, new Set(['lab', 'field']));
      string(environment.description, `${location}.environment.description`, {min: 10, max: 10000});
      string(environment.product, `${location}.environment.product`);
      string(environment.productVersion, `${location}.environment.productVersion`, {max: 256});
      stringArray(environment.operatingSystems, `${location}.environment.operatingSystems`, {min: 1, max: 64, unique: true, itemMax: 256});
      enumeration(environment.dataClassification, `${location}.environment.dataClassification`, new Set(['synthetic', 'sanitized', 'production']));
      if (value.validationLevel === 'lab-validated' && environment.kind !== 'lab') add(`${location}.environment.kind`, 'must be lab for lab-validated evidence');
      if (value.validationLevel === 'field-confirmed' && environment.kind !== 'field') add(`${location}.environment.kind`, 'must be field for field-confirmed evidence');
    }
    person(value.validatedBy, `${location}.validatedBy`);
    timestamp(value.validatedAt, `${location}.validatedAt`);
    const fixtureTypes = new Set(['positive', 'benign-lookalike', 'missing-telemetry', 'boundary']);
    if (array(value.fixtureResults, `${location}.fixtureResults`, {min: 4, max: 256})) {
      const seenTypes = new Set();
      const ids = new Set();
      value.fixtureResults.forEach((fixture, index) => {
        const fixtureLocation = `${location}.fixtureResults[${index}]`;
        if (!object(fixture, fixtureLocation, ['id', 'type', 'fixtureSha256', 'expected', 'actual', 'passed'])) return;
        identifier(fixture.id, `${fixtureLocation}.id`);
        if (ids.has(fixture.id)) add(`${fixtureLocation}.id`, 'must be unique within evidence');
        ids.add(fixture.id);
        enumeration(fixture.type, `${fixtureLocation}.type`, fixtureTypes);
        seenTypes.add(fixture.type);
        hash(fixture.fixtureSha256, `${fixtureLocation}.fixtureSha256`);
        outcome(fixture.expected, `${fixtureLocation}.expected`);
        outcome(fixture.actual, `${fixtureLocation}.actual`);
        if (typeof fixture.passed !== 'boolean') add(`${fixtureLocation}.passed`, 'must be boolean');
        const outcomesMatch = fixture.expected && fixture.actual && fixture.expected.outcome === fixture.actual.outcome && fixture.expected.errorCode === fixture.actual.errorCode;
        if (fixture.passed !== outcomesMatch) add(`${fixtureLocation}.passed`, 'must reflect expected and actual outcomes');
        if (fixture.passed !== true) add(`${fixtureLocation}.passed`, `${value.validationLevel} evidence requires every fixture to pass`);
      });
      for (const type of fixtureTypes) if (!seenTypes.has(type)) add(`${location}.fixtureResults`, `must include a ${type} fixture`);
    }
    stringArray(value.limitations, `${location}.limitations`, {min: 1, max: 128, unique: true});
    provenance(value.provenance, `${location}.provenance`);
  }

  function validateNativeRule(value, location = '$') {
    const required = ['schemaVersion', 'id', 'attackId', 'attackVersion', 'domain', 'tactics', 'platforms', 'backend', 'contentVersion', 'supportStatus', 'telemetryAssessment'];
    if (!object(value, location, required, ['rule', 'rationale', 'audit'])) return;
    schemaVersion(value.schemaVersion, `${location}.schemaVersion`);
    string(value.attackId, `${location}.attackId`, {min: 5, max: 9, pattern: ATTACK_ID});
    string(value.attackVersion, `${location}.attackVersion`, {min: 3, max: 32, pattern: ATTACK_VERSION});
    enumeration(value.domain, `${location}.domain`, DOMAINS);
    stringArray(value.tactics, `${location}.tactics`, {min: 1, max: 32, unique: true, pattern: /^[a-z][a-z0-9-]{1,127}$/});
    stringArray(value.platforms, `${location}.platforms`, {max: 64, unique: true, itemMax: 128});
    enumeration(value.backend, `${location}.backend`, BACKENDS);
    string(value.id, `${location}.id`, {max: 256, pattern: /^support:(?:enterprise|mobile|ics):T[0-9]{4}(?:\.[0-9]{3})?:(?:panther|sentinel|defender-xdr|splunk)$/});
    if (DOMAINS.has(value.domain) && ATTACK_ID.test(value.attackId) && BACKENDS.has(value.backend) && value.id !== `support:${value.domain}:${value.attackId}:${value.backend}`) add(`${location}.id`, 'must match domain, attackId and backend');
    contentVersion(value.contentVersion, `${location}.contentVersion`);
    enumeration(value.supportStatus, `${location}.supportStatus`, new Set(['supported', 'not-applicable', 'planned', 'unassessed']));
    const telemetryAssessment = value.telemetryAssessment;
    if (object(telemetryAssessment, `${location}.telemetryAssessment`, ['status', 'requiredTelemetry', 'notes'])) {
      enumeration(telemetryAssessment.status, `${location}.telemetryAssessment.status`, new Set(['available', 'unavailable', 'unknown']));
      stringArray(telemetryAssessment.requiredTelemetry, `${location}.telemetryAssessment.requiredTelemetry`, {max: 128, unique: true});
      string(telemetryAssessment.notes, `${location}.telemetryAssessment.notes`, {max: 10000});
    }
    if (value.supportStatus === 'supported') {
      if (!Object.hasOwn(value, 'rule')) add(`${location}.rule`, 'is required for supported status');
      if (telemetryAssessment && telemetryAssessment.status !== 'available') add(`${location}.telemetryAssessment.status`, 'must be available for supported status');
      if (telemetryAssessment && Array.isArray(telemetryAssessment.requiredTelemetry) && telemetryAssessment.requiredTelemetry.length === 0) add(`${location}.telemetryAssessment.requiredTelemetry`, 'must identify the required telemetry for supported status');
      if (Object.hasOwn(value, 'rationale')) add(`${location}.rationale`, 'is not allowed for supported status');
      if (Object.hasOwn(value, 'audit')) add(`${location}.audit`, 'is not allowed for supported status');
    } else if (value.supportStatus === 'not-applicable') {
      if (Object.hasOwn(value, 'rule')) add(`${location}.rule`, 'is not allowed for not-applicable status');
      if (!Object.hasOwn(value, 'rationale')) add(`${location}.rationale`, 'is required for not-applicable status');
      if (!Object.hasOwn(value, 'audit')) add(`${location}.audit`, 'is required for not-applicable status');
      if (telemetryAssessment && telemetryAssessment.status !== 'unavailable') add(`${location}.telemetryAssessment.status`, 'must be unavailable for not-applicable status');
    } else {
      for (const field of ['rule', 'rationale', 'audit']) if (Object.hasOwn(value, field)) add(`${location}.${field}`, `is not allowed for ${value.supportStatus} status`);
    }
    if (Object.hasOwn(value, 'rule')) {
      const rule = value.rule;
      const ruleRequired = ['id', 'title', 'language', 'artifactPath', 'sha256', 'license', 'status', 'provenance', 'fieldMappings', 'limitations', 'validationEvidenceIds'];
      if (object(rule, `${location}.rule`, ruleRequired)) {
        string(rule.id, `${location}.rule.id`, {max: 256, pattern: /^rule:(?:panther|sentinel|defender-xdr|splunk):T[0-9]{4}(?:\.[0-9]{3})?$/});
        if (BACKENDS.has(value.backend) && ATTACK_ID.test(value.attackId) && rule.id !== `rule:${value.backend}:${value.attackId}`) add(`${location}.rule.id`, 'must match backend and attackId');
        string(rule.title, `${location}.rule.title`);
        enumeration(rule.language, `${location}.rule.language`, new Set(Object.values(LANGUAGES)));
        if (LANGUAGES[value.backend] && rule.language !== LANGUAGES[value.backend]) add(`${location}.rule.language`, `must be ${LANGUAGES[value.backend]} for ${value.backend}`);
        relativePath(rule.artifactPath, `${location}.rule.artifactPath`);
        hash(rule.sha256, `${location}.rule.sha256`);
        string(rule.license, `${location}.rule.license`, {max: 128, pattern: /^(?:[A-Za-z0-9.-]+|LicenseRef-[A-Za-z0-9.-]+)$/});
        enumeration(rule.status, `${location}.rule.status`, MATURITY);
        provenance(rule.provenance, `${location}.rule.provenance`);
        if (rule.provenance && rule.provenance.artifactSha256 !== rule.sha256) add(`${location}.rule.provenance.artifactSha256`, 'must match rule sha256');
        if (array(rule.fieldMappings, `${location}.rule.fieldMappings`, {min: 1, max: 512})) rule.fieldMappings.forEach((item, index) => fieldMapping(item, `${location}.rule.fieldMappings[${index}]`));
        stringArray(rule.limitations, `${location}.rule.limitations`, {min: 1, max: 128, unique: true});
        if (array(rule.validationEvidenceIds, `${location}.rule.validationEvidenceIds`, {max: 256, unique: true})) rule.validationEvidenceIds.forEach((id, index) => identifier(id, `${location}.rule.validationEvidenceIds[${index}]`));
        const needsValidation = rule.status === 'lab-validated' || rule.status === 'field-confirmed';
        if (Array.isArray(rule.validationEvidenceIds)) {
          if (needsValidation && rule.validationEvidenceIds.length === 0) add(`${location}.rule.validationEvidenceIds`, `${rule.status} status requires validation evidence`);
          if (!needsValidation && rule.validationEvidenceIds.length > 0) add(`${location}.rule.validationEvidenceIds`, `${rule.status} status cannot claim validation evidence`);
        }
      }
    }
    if (Object.hasOwn(value, 'rationale')) string(value.rationale, `${location}.rationale`, {min: 20, max: 10000});
    if (Object.hasOwn(value, 'audit')) {
      const audit = value.audit;
      if (object(audit, `${location}.audit`, ['reviewerId', 'displayName', 'reviewedAt', 'evidenceUrls'])) {
        identifier(audit.reviewerId, `${location}.audit.reviewerId`);
        string(audit.displayName, `${location}.audit.displayName`);
        timestamp(audit.reviewedAt, `${location}.audit.reviewedAt`);
        if (array(audit.evidenceUrls, `${location}.audit.evidenceUrls`, {min: 1, max: 64, unique: true})) audit.evidenceUrls.forEach((url, index) => uri(url, `${location}.audit.evidenceUrls[${index}]`));
      }
    }
  }

  function validateCatalog(value, location = '$') {
    const required = ['schemaVersion', 'catalogKind', 'contentVersion', 'generatedAt', 'sourceRevision', 'catalogSha256', 'itemCount', 'items'];
    if (!object(value, location, required, ['page'])) return;
    schemaVersion(value.schemaVersion, `${location}.schemaVersion`);
    const kinds = new Set(['prompt-metadata', 'review-evidence', 'validation-evidence', 'native-rule-support']);
    enumeration(value.catalogKind, `${location}.catalogKind`, kinds);
    contentVersion(value.contentVersion, `${location}.contentVersion`);
    timestamp(value.generatedAt, `${location}.generatedAt`);
    string(value.sourceRevision, `${location}.sourceRevision`, {min: 7, max: 255, pattern: SOURCE_REVISION});
    hash(value.catalogSha256, `${location}.catalogSha256`);
    if (!Number.isInteger(value.itemCount) || value.itemCount < 0 || value.itemCount > 1000000) add(`${location}.itemCount`, 'must be an integer from 0 to 1000000');
    if (array(value.items, `${location}.items`, {max: 1000000})) {
      if (value.itemCount !== value.items.length) add(`${location}.itemCount`, 'must equal items.length');
      try {
        if (value.catalogSha256 !== sha256Canonical(value.items)) add(`${location}.catalogSha256`, 'must match canonical items bytes');
      } catch {
        add(`${location}.items`, 'must contain canonicalizable JSON values');
      }
      const ids = new Set();
      value.items.forEach((item, index) => {
        const before = errors.length;
        if (value.catalogKind === 'prompt-metadata') validatePrompt(item, `${location}.items[${index}]`);
        else if (value.catalogKind === 'review-evidence') validateReview(item, `${location}.items[${index}]`);
        else if (value.catalogKind === 'validation-evidence') validateEvidence(item, `${location}.items[${index}]`);
        else if (value.catalogKind === 'native-rule-support') validateNativeRule(item, `${location}.items[${index}]`);
        if (errors.length > before) add(`${location}.items[${index}]`, `does not conform to declared catalogKind ${value.catalogKind}`);
        if (item && typeof item.id === 'string') {
          if (ids.has(item.id)) add(`${location}.items[${index}].id`, 'must be unique within catalog');
          ids.add(item.id);
        }
        const itemContentVersion = value.catalogKind === 'review-evidence' || value.catalogKind === 'validation-evidence'
          ? item && item.subject && item.subject.contentVersion
          : item && item.contentVersion;
        if (itemContentVersion !== value.contentVersion) add(`${location}.items[${index}].contentVersion`, 'must match catalog contentVersion');
      });
      if (value.catalogKind === 'review-evidence') {
        const groups = new Map();
        value.items.forEach((item, index) => {
          if (!item || !item.subject || !item.reviewer) return;
          const key = [item.subject.type, item.subject.id, item.subject.contentVersion, item.subject.sha256].join(':');
          const group = groups.get(key) || {slots: new Map(), reviewers: new Map()};
          if (group.slots.has(item.slot)) add(`${location}.items[${index}].slot`, 'review slot is already occupied for this subject version');
          else group.slots.set(item.slot, index);
          if (group.reviewers.has(item.reviewer.reviewerId)) add(`${location}.items[${index}].reviewer.reviewerId`, 'each completed slot requires a distinct independent reviewer');
          else group.reviewers.set(item.reviewer.reviewerId, index);
          groups.set(key, group);
        });
      }
    }
    if (Object.hasOwn(value, 'page')) {
      const page = value.page;
      if (object(page, `${location}.page`, ['limit', 'cursor'], ['nextCursor'])) {
        if (!Number.isInteger(page.limit) || page.limit < 1 || page.limit > 1000) add(`${location}.page.limit`, 'must be an integer from 1 to 1000');
        for (const field of ['cursor', 'nextCursor']) if (Object.hasOwn(page, field) && page[field] !== null) string(page[field], `${location}.page.${field}`, {min: 0, max: 2048});
      }
    }
  }

  return {errors, validatePrompt, validateReview, validateEvidence, validateNativeRule, validateCatalog};
}

function validateContract(kind, value) {
  const validators = validation();
  if (kind === 'prompt-metadata') validators.validatePrompt(value);
  else if (kind === 'review-evidence') validators.validateReview(value);
  else if (kind === 'validation-evidence') validators.validateEvidence(value);
  else if (kind === 'native-rule-support') validators.validateNativeRule(value);
  else if (kind === 'catalog-envelope') validators.validateCatalog(value);
  else return [`$: unknown contract kind ${kind}`];
  return validators.errors;
}

function assertContract(kind, value) {
  const errors = validateContract(kind, value);
  if (errors.length > 0) throw new TypeError(`Invalid ${kind} contract:\n${errors.join('\n')}`);
  return value;
}

function validateEvidenceGraph({prompts = [], reviews = [], validations = [], nativeRules = []} = {}) {
  const errors = [];
  const collections = [
    ['prompts', 'prompt-metadata', prompts],
    ['reviews', 'review-evidence', reviews],
    ['validations', 'validation-evidence', validations],
    ['nativeRules', 'native-rule-support', nativeRules],
  ];
  for (const [name, kind, items] of collections) {
    if (!Array.isArray(items)) {
      errors.push(`$.${name}: must be an array`);
      continue;
    }
    items.forEach((item, index) => {
      for (const error of validateContract(kind, item)) errors.push(`$.${name}[${index}]${error.slice(1)}`);
    });
  }
  if (errors.length > 0 || collections.some(([, , items]) => !Array.isArray(items))) return errors;

  function indexEvidence(items, collection) {
    const index = new Map();
    items.forEach((item, position) => {
      if (index.has(item.id)) errors.push(`$.${collection}[${position}].id: duplicates ${item.id}`);
      else index.set(item.id, item);
    });
    return index;
  }

  const reviewById = indexEvidence(reviews, 'reviews');
  const validationById = indexEvidence(validations, 'validations');
  for (const id of reviewById.keys()) {
    if (validationById.has(id)) errors.push(`$.validations: evidence id ${id} is shared with a review`);
  }

  function subjectMatches(subject, type, id, contentVersion, sha256) {
    return subject && subject.type === type && subject.id === id
      && subject.contentVersion === contentVersion && subject.sha256 === sha256;
  }

  prompts.forEach((prompt, promptIndex) => {
    const reviewers = new Set();
    prompt.reviewSlots.forEach((slot, slotIndex) => {
      if (slot.status !== 'completed') return;
      const review = reviewById.get(slot.evidenceId);
      const location = `$.prompts[${promptIndex}].reviewSlots[${slotIndex}].evidenceId`;
      if (!review) {
        errors.push(`${location}: does not resolve to review evidence`);
        return;
      }
      if (!subjectMatches(review.subject, 'prompt', prompt.id, prompt.contentVersion, prompt.promptSha256)) {
        errors.push(`${location}: must bind the exact prompt subject, version and hash`);
      }
      if (review.slot !== slot.slot) errors.push(`${location}: review slot does not match`);
      if (review.recommendation !== 'approve' || review.criticalFindings.length !== 0) {
        errors.push(`${location}: completed maturity review must approve with no critical findings`);
      }
      const reviewerId = review.reviewer.reviewerId;
      if (reviewers.has(reviewerId)) errors.push(`${location}: completed slots require distinct independent reviewers`);
      reviewers.add(reviewerId);
    });
    prompt.validationEvidenceIds.forEach((id, evidenceIndex) => {
      const evidence = validationById.get(id);
      const location = `$.prompts[${promptIndex}].validationEvidenceIds[${evidenceIndex}]`;
      if (!evidence) {
        errors.push(`${location}: does not resolve to validation evidence`);
        return;
      }
      if (!subjectMatches(evidence.subject, 'prompt', prompt.id, prompt.contentVersion, prompt.promptSha256)) {
        errors.push(`${location}: must bind the exact prompt subject, version and hash`);
      }
      if (evidence.validationLevel !== prompt.status) errors.push(`${location}: validation level must match prompt maturity`);
    });
  });

  nativeRules.forEach((support, supportIndex) => {
    if (support.supportStatus !== 'supported' || !support.rule) return;
    support.rule.validationEvidenceIds.forEach((id, evidenceIndex) => {
      const evidence = validationById.get(id);
      const location = `$.nativeRules[${supportIndex}].rule.validationEvidenceIds[${evidenceIndex}]`;
      if (!evidence) {
        errors.push(`${location}: does not resolve to validation evidence`);
        return;
      }
      if (!subjectMatches(evidence.subject, 'native-rule', support.rule.id, support.contentVersion, support.rule.sha256)) {
        errors.push(`${location}: must bind the exact native-rule subject, version and hash`);
      }
      if (evidence.validationLevel !== support.rule.status) errors.push(`${location}: validation level must match native-rule maturity`);
    });
  });

  return errors;
}

module.exports = Object.freeze({SCHEMA_VERSION, CONTRACT_FILES, loadSchema, canonicalJson, sha256Canonical, validateContract, assertContract, validateEvidenceGraph});
