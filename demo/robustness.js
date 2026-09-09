(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PAD_ROBUSTNESS = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const BASE = 'https://center-for-threat-informed-defense.github.io/summiting-the-pyramid/';
  const LEVELS = Object.freeze([
    { value: 1, label: 'Changeable indicator values' },
    { value: 2, label: 'Attacker-supplied tooling or external boundary' },
    { value: 3, label: 'Existing tooling or internal boundary' },
    { value: 4, label: 'Behavior shared by some technique implementations' },
    { value: 5, label: 'Behavior required across technique implementations' },
  ].map(Object.freeze));
  const ORIGINS = Object.freeze([
    { value: 'A', label: 'Host: application', model: 'host' },
    { value: 'U', label: 'Host: user mode', model: 'host' },
    { value: 'K', label: 'Host: kernel mode', model: 'host' },
    { value: 'P', label: 'Network: payload visibility', model: 'network' },
    { value: 'H', label: 'Network: header visibility', model: 'network' },
  ].map(Object.freeze));
  const FIELDS = ['telemetry', 'observable', 'rationale', 'benignContext', 'evidenceReference'];
  const CAVEATS = [
    'User-assessed and not independently verified; not MITRE certification or an official MITRE score.',
    'This worksheet records one observable assessment, not an aggregate analytic score or proof of detection effectiveness.',
    'Required text and an evidence reference do not prove that evidence exists or supports the selected level.',
    'No prompt review, lab validation or field confirmation is granted. No evidence reference is opened or uploaded.',
    'Applicability to the selected technique, environment and telemetry must be justified by the analyst; this is not a framework-wide applicability claim.',
    'The method assumes trusted telemetry. Sources, tools and environments can change; high levels do not establish accuracy or benign-case safety.',
    'Analyst text may contain private context. Inspect this export before sharing; referenced evidence is not included.',
  ];
  function check(condition, message) { if (!condition) throw new Error(message); }
  function object(value, field) {
    check(value !== null && typeof value === 'object' && !Array.isArray(value), `Invalid ${field}.`);
  }
  function own(value, field, label = field) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    check(descriptor && Object.hasOwn(descriptor, 'value'), `Invalid ${label}; an explicit data value is required.`);
    return descriptor.value;
  }
  function text(value, field, maximum) {
    check(typeof value === 'string' && value.length <= maximum && value.trim().length > 0 &&
      !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value), `Invalid ${field}; provide 1–${maximum} characters without control characters.`);
    return value.trim();
  }
  function createAssessment(record, input) {
    object(record, 'technique'); object(input, 'assessment');
    const rawId = own(record, 'id', 'technique ID');
    const id = text(rawId, 'technique ID', 14);
    check(id === rawId && /^(?:T\d{4}|AML\.T\d{4})(?:\.\d{3})?$/.test(id), 'Invalid technique ID.');
    const domain = own(record, 'domain', 'technique domain');
    check(['Enterprise', 'Mobile', 'ICS', 'ATLAS'].includes(domain) &&
      (domain === 'ATLAS') === id.startsWith('AML.'), 'Invalid technique domain.');
    const name = text(own(record, 'name', 'technique name'), 'technique name', 500);
    check(Reflect.ownKeys(input).every(key => ['level', 'origin', ...FIELDS].includes(key)), 'Unsupported assessment field.');
    const level = own(input, 'level');
    check(Number.isInteger(level) && level >= 1 && level <= 5, 'Invalid level; explicitly select an integer from 1 to 5.');
    const origin = own(input, 'origin');
    const dimension = ORIGINS.find(item => item.value === origin);
    check(dimension, 'Invalid origin; select A, U, K, P or H.');
    const assessment = { level, origin, model: dimension.model };
    for (const field of FIELDS) assessment[field] = text(own(input, field), field, field === 'evidenceReference' ? 1000 : 4000);
    return { schemaVersion: 'pad-robustness-assessment-1', status: 'manual-unverified', method: 'analyst-entered',
      technique: { id, domain, name }, methodology: { name: 'Summiting the Pyramid', documentationVersion: '4.0.0',
        source: BASE + 'overview/', levelsSource: BASE + 'levels/' }, assessment, caveats: [...CAVEATS] };
  }
  return Object.freeze({ createAssessment, LEVELS, ORIGINS });
});
