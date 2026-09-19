const test = require('node:test');
const assert = require('node:assert/strict');
const mappings = require('../scripts/build_research_mappings.cjs');
const source = { key: 'test', url: 'https://lolbas-project.github.io/api/lolbas.json', sha256: 'a'.repeat(64) };

test('LOLBAS projection keeps only explicit IDs and exact source pointers', () => {
  const rows = mappings.projectLolbas([{ Name: 'Example.exe', url: 'https://lolbas-project.github.io/lolbas/Binaries/Example/', Commands: [
    { MitreID: 'T1105', Command: 'UNTRUSTED command ignored' }, { MitreID: 'T1218.005' }, { MitreID: 'T1105' },
  ], Description: 'T9999 is only prose' }]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.techniqueId), ['T1105', 'T1218.005', 'T1105']);
  assert.equal(rows[0].locator, '/0/Commands/0/MitreID');
  assert.equal(JSON.stringify(rows).includes('UNTRUSTED'), false);
  assert.equal(JSON.stringify(rows).includes('T9999'), false);
});

test('unsafe or malformed upstream entries fail closed, not coerced into mappings', () => {
  const entry = { Name: 'Example.exe', url: 'https://lolbas-project.github.io/lolbas/Binaries/Example/', Commands: [{ MitreID: 'T1105' }] };
  for (const url of ['javascript:alert(1)', 'https://lolbas-project.github.io.evil.invalid/lolbas/a/', 'https://user@lolbas-project.github.io/lolbas/a/', 'http://lolbas-project.github.io/lolbas/a/', 'https://lolbas-project.github.io/lolbas/a/?context=x']) {
    assert.throws(() => mappings.projectLolbas([{ ...entry, url }]), /URL/);
  }
  assert.throws(() => mappings.projectLolbas([{ ...entry, Commands: [{ MitreID: 'T1105\n' }] }]), /ID/);
  assert.throws(() => mappings.projectLolbas(Array(2001).fill(entry)), /limit/);
});

test('LOLDrivers projection reads only actual tags, never prose or detection text', () => {
  const yaml = 'title: Example\nid: 123\nstatus: experimental\ntags:\n    - attack.t1068\n    - attack.privilege_escalation\ndetection:\n    note: attack.t9999\n';
  assert.deepEqual(mappings.projectDriver(yaml, 'https://github.com/magicsword-io/LOLDrivers/blob/' + 'a'.repeat(40) + '/detections/sigma/example.yml').map(row => row.techniqueId), ['T1068']);
});

test('pinned MITRE citations keep exact IDs without inherited or revoked mappings', () => {
  const object = (id, url, extra = {}) => ({ type: 'attack-pattern', id: 'attack-pattern--' + id, name: 'Technique', external_references: [{ source_name: 'mitre-attack', external_id: id }, { source_name: 'Source', url }], ...extra });
  const rows = mappings.projectAttack({ objects: [object('T1218', 'https://gtfobins.github.io/gtfobins/split/'), object('T1218.001', 'https://example.invalid/gtfobins/'), object('T1117', 'https://lolbas-project.github.io/', { revoked: true })] }, 'Enterprise');
  assert.equal(rows.length, 1); assert.equal(rows[0].techniqueId, 'T1218');
  assert.equal(rows[0].source, 'GTFOBins'); assert.equal(rows[0].basis, 'mitre-citation');
});

test('the join excludes stale IDs and domain mismatches without aliasing or promoting them', () => {
  const row = { source: 'LOLBAS', techniqueId: 'T1218', name: 'Example', domain: 'Enterprise', url: 'https://lolbas-project.github.io/', basis: 'upstream-id', locator: '/0/Commands/0/MitreID', sourceKey: 'test' };
  const snapshot = { schemaVersion: 1, sources: [source], rows: [row, { ...row, techniqueId: 'T1117' }, { ...row, techniqueId: 'T0894' }] };
  const data = mappings.buildData(snapshot, [{ id: 'T1218', domain: 'Enterprise', name: 'Parent' }, { id: 'T1218.001', domain: 'Enterprise', name: 'Child' }, { id: 'T0894', domain: 'ICS', name: 'OT' }], [], []);
  assert.deepEqual(Object.keys(data.techniques), ['T1218']);
  assert.deepEqual(data.excluded.map(row => row.techniqueId), ['T1117', 'T0894']);
  assert.equal(JSON.stringify(data).includes('lab-validated'), false);
});

test('duplicate upstream command mappings retain every locator in one source entry', () => {
  const row = { source: 'LOLBAS', techniqueId: 'T1105', name: 'Example', domain: 'Enterprise', url: 'https://lolbas-project.github.io/', basis: 'upstream-id', locator: '/0/Commands/0/MitreID', sourceKey: 'test' };
  const data = mappings.buildData({ schemaVersion: 1, sources: [source], rows: [row, { ...row, locator: '/0/Commands/1/MitreID' }] }, [{ id: 'T1105', domain: 'Enterprise', name: 'Transfer' }], [], []);
  assert.equal(data.techniques.T1105.links.length, 1);
  assert.equal(data.techniques.T1105.links[0].locators.length, 2);
});

test('provenance rejects unsafe URLs and evidence from a different source', () => {
  for (const url of ['javascript:alert(1)', 'https://example.invalid/snapshot', 'https://lolbas-project.github.io/api/lolbas.json?private=x', 'https://raw.githubusercontent.com/magicsword-io/LOLDrivers/main/detections/sigma/example.yml']) {
    assert.throws(() => mappings.buildData({ schemaVersion: 1, sources: [{ ...source, url }], rows: [] }, [], [], []), /provenance/);
  }
  const row = { source: 'LOLDrivers', techniqueId: 'T1068', domain: 'Enterprise', name: 'Example', url: 'https://github.com/magicsword-io/LOLDrivers/blob/' + 'a'.repeat(40) + '/detections/sigma/example.yml', basis: 'rule-tag', locator: 'line:4', sourceKey: 'test' };
  assert.throws(() => mappings.buildData({ schemaVersion: 1, sources: [source], rows: [row] }, [], [], []), /provenance/);
});

test('generated mappings reproduce pinned inputs and every published ID is active in its exact domain', () => {
  const data = mappings.build(undefined, true);
  const catalog = new Map(require('../demo/catalog.js').map(record => [record.id, record]));
  assert.deepEqual(data.counts, { LOLBAS: { techniques: 62, links: 334 }, GTFOBins: { techniques: 5, links: 5 }, LOLDrivers: { techniques: 2, links: 12 } });
  assert.deepEqual([...new Set(data.excluded.map(row => row.techniqueId))].sort(), ['T1562', 'T1562.001']);
  for (const [id, record] of Object.entries(data.techniques)) {
    assert.equal(record.domain, catalog.get(id)?.domain);
    for (const link of record.links) {
      assert.equal(mappings.sourceFor(link.url), link.source);
      assert.ok(link.locators.length > 0);
      assert.ok(data.sources.find(source => source.key === link.sourceKey));
      assert.deepEqual(Object.keys(link).sort(), ['basis', 'locators', 'name', 'source', 'sourceKey', 'url']);
    }
  }
});
