(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PAD_CAR = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ensure = (condition, message) => { if (!condition) throw new Error(message); };
  const technique = value => typeof value === 'string' && /^(?:T\d{4}(?:\.\d{3})?|AML\.T\d{4}(?:\.\d{3})?)$/.test(value);
  const string = (value, label, maximum = 100000) => ensure(typeof value === 'string' && value.length <= maximum && !value.includes('\0'), `Invalid CAR ${label}`);
  function strings(value, label) {
    ensure(Array.isArray(value) && value.length <= 256, `Invalid CAR ${label}`);
    value.forEach(item => string(item, label, 4096));
  }
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  function createLibrary(input) {
    ensure(input && typeof input === 'object' && input.schemaVersion === 1
      && input.attackVersion === '19.2' && Array.isArray(input.analytics) && input.analytics.length <= 256, 'Invalid CAR catalog');
    const encoded = JSON.stringify(input);
    ensure(encoded.length <= 2_000_000, 'CAR catalog size limit');
    const catalog = JSON.parse(encoded);
    ensure(catalog.source?.repository === 'https://github.com/mitre-attack/car'
      && /^[a-f0-9]{40}$/.test(catalog.source.commit), 'Invalid CAR source');
    string(catalog.source.name, 'source name', 200);
    for (const field of ['sourceNotice', 'sourceLicense', 'warning']) string(catalog[field], field);
    ensure(catalog.sourceNotice.length > 0 && catalog.sourceLicense.length > 0, 'Missing CAR license notice');
    strings(catalog.excludedTechniqueIds, 'excluded IDs');
    const byTechnique = new Map();
    const seen = new Set();
    for (const analytic of catalog.analytics) {
      ensure(analytic && /^CAR-\d{4}-\d{2}-\d{3}$/.test(analytic.id), 'Invalid CAR analytic');
      ensure(!seen.has(analytic.id), 'Duplicate CAR analytic'); seen.add(analytic.id);
      ensure(analytic.status === 'upstream-research', 'Invalid CAR status');
      ensure(analytic.license === 'Apache-2.0', 'Invalid CAR license');
      ensure(analytic.sourceUrl === `https://github.com/mitre-attack/car/blob/${catalog.source.commit}/analytics/${analytic.id}.yaml`
        && analytic.sourcePath === `sources/car-${catalog.source.commit.slice(0, 7)}/raw/analytics/${analytic.id}.yaml`
        && /^[a-f0-9]{64}$/.test(analytic.sourceSha256), 'Invalid CAR source provenance');
      for (const field of ['title', 'hypothesis', 'informationDomain', 'submissionDate']) string(analytic[field], field);
      if (analytic.updateDate !== null) string(analytic.updateDate, 'update date', 32);
      for (const field of ['platforms', 'contributors', 'telemetry', 'techniqueIds']) strings(analytic[field], field);
      ensure(new Set(analytic.techniqueIds).size === analytic.techniqueIds.length, 'Duplicate CAR technique');
      ensure(Array.isArray(analytic.coverage) && analytic.coverage.length <= 64, 'Invalid CAR coverage');
      for (const coverage of analytic.coverage) {
        ensure(technique(coverage?.technique) && coverage.technique.startsWith('T'), 'Invalid CAR coverage technique');
        strings(coverage.tactics, 'coverage tactics'); string(coverage.coverage, 'coverage label', 200);
        if (coverage.subtechniques !== undefined) {
          strings(coverage.subtechniques, 'coverage subtechniques');
          ensure(coverage.subtechniques.every(id => technique(id) && id.startsWith(`${coverage.technique}.`)), 'Invalid CAR coverage subtechnique');
        }
      }
      for (const field of ['pseudocode', 'implementations']) {
        ensure(Array.isArray(analytic[field]) && analytic[field].length <= 32, `Invalid CAR ${field}`);
        for (const entry of analytic[field]) {
          string(entry.type, 'implementation type', 100); string(entry.description, 'implementation description');
          string(entry.dataModel, 'data model', 500);
          if (field === 'pseudocode') string(entry.code, 'pseudocode');
        }
      }
      for (const id of analytic.techniqueIds) {
        ensure(technique(id) && id.startsWith('T') && analytic.coverage.some(row => row.technique === id || row.subtechniques?.includes(id)), 'Invalid CAR exact technique mapping');
        if (!byTechnique.has(id)) byTechnique.set(id, []);
        byTechnique.get(id).push(analytic);
      }
    }
    freeze(catalog);
    for (const rows of byTechnique.values()) Object.freeze(rows);
    return Object.freeze({
      lookup(techniqueId) {
        ensure(technique(techniqueId), 'Invalid technique ID');
        return Object.freeze({techniqueId, analytics: byTechnique.get(techniqueId) || Object.freeze([]),
          source: catalog.source, sourceNotice: catalog.sourceNotice, sourceLicense: catalog.sourceLicense, warning: catalog.warning});
      },
    });
  }
  return Object.freeze({createLibrary});
});
