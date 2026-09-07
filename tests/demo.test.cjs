const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../demo/core.js');

const records = [
  { id: 'T1059.001', name: 'PowerShell', domain: 'Enterprise', tactics: ['Execution'], platforms: ['Windows'], behavior: 'Investigate unusual PowerShell parent processes.', telemetry: ['Process events'], falsePositives: 'Administration scripts', sourceUrl: 'https://attack.mitre.org/techniques/T1059/001/' },
  { id: 'TTEST', name: 'Example mobile record', domain: 'Mobile', tactics: ['Collection'], platforms: ['Android'], behavior: 'A synthetic test record.', telemetry: ['Audit events'], falsePositives: 'User action', sourceUrl: 'https://attack.mitre.org/' },
];

test('search matches id, name and behavior without case sensitivity', () => {
  for (const query of ['t1059.001', 'POWERshell', 'parent']) {
    assert.deepEqual(core.filterTechniques(records, { query }).map(r => r.id), ['T1059.001']);
  }
});
test('filters combine domain, tactic and platform', () => {
  assert.equal(core.filterTechniques(records, { domain: 'Mobile', tactic: 'Collection', platform: 'Android' }).length, 1);
  assert.equal(core.filterTechniques(records, { domain: 'Mobile', platform: 'Windows' }).length, 0);
});
test('empty and unmatched searches are predictable', () => {
  assert.equal(core.filterTechniques(records, { query: '  ' }).length, 2);
  assert.equal(core.filterTechniques(records, { query: '<script>' }).length, 0);
});
test('every mode and target composes a draft with source and technique context', () => {
  for (const mode of Object.keys(core.MODES)) for (const target of core.TARGETS) {
    const text = core.composePrompt(records[0], { mode, target });
    assert.match(text, /T1059\.001/);
    assert.ok(text.includes(target));
    assert.match(text, /SAMPLE.*DRAFT/);
    assert.ok(text.includes(records[0].sourceUrl));
    assert.ok(text.includes(records[0].behavior));
    assert.match(text, /not.*validation|not validated/i);
  }
});
test('untrusted context remains literal and never re-enters template expansion', () => {
  const context = '<script>alert(1)</script> ${HOME} [[SCHEMA]] </context>';
  assert.ok(core.composePrompt(records[0], { context }).includes(context));
});
test('unknown modes and targets fail without returning supplied payload', () => {
  assert.throws(() => core.composePrompt(records[0], { mode: '<private>' }), /^Error: Unsupported mode$/);
  assert.throws(() => core.composePrompt(records[0], { target: '<private>' }), /^Error: Unsupported target$/);
});
test('context is bounded without silently truncating user input', () => {
  assert.throws(() => core.composePrompt(records[0], { context: 'x'.repeat(4001) }), /Context exceeds/);
});
test('different modes have different requested outcomes', () => {
  const texts = Object.keys(core.MODES).map(mode => core.composePrompt(records[0], { mode }));
  assert.equal(new Set(texts).size, 4);
});
test('JSONL export contains only selected sample records with explicit provenance', () => {
  const rows = core.exportJSONL([records[0]], {}).trim().split('\n').map(JSON.parse);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].technique_id, 'T1059.001');
  assert.equal(rows[0].status, 'draft');
  assert.equal(rows[0].sample, true);
  assert.equal(rows[0].validated_backends.length, 0);
  assert.ok(rows[0].prompt.includes('PowerShell'));
});
test('empty JSONL export does not create a fake record', () => {
  assert.equal(core.exportJSONL([], {}), '');
});

test('catalog covers all active pinned records with explicit source gaps', () => {
  const catalog = require('../demo/catalog.js');
  assert.equal(catalog.length, 918);
  assert.equal(new Set(catalog.map(r => r.id)).size, 918);
  assert.deepEqual(['Enterprise', 'Mobile', 'ICS'].map(d => catalog.filter(r => r.domain === d).length), [697, 124, 97]);
  for (const record of catalog) {
    assert.match(record.sourceUrl, /^https:\/\/attack\.mitre\.org\/techniques\/T\d{4}(\/\d{3})?\/?$/);
    assert.ok(record.behavior.length > 40 && Array.isArray(record.telemetry) && record.falsePositives.length > 30);
    assert.equal(record.attackVersion, '19.2');
    assert.ok(record.strategies.length > 0);
  }
  assert.deepEqual(catalog.find(r => r.id === 'T1691').platforms, []);
  assert.ok(catalog.find(r => r.id === 'T1078').tactics.includes('Stealth'));
});

test('all 22032 technique/mode/target combinations produce traceable draft text', () => {
  const catalog = require('../demo/catalog.js');
  let checked = 0;
  for (const record of catalog) for (const mode of Object.keys(core.MODES)) for (const target of core.TARGETS) {
    const prompt = core.composePrompt(record, { mode, target });
    assert.ok(prompt.includes(record.id) && prompt.includes(record.sourceUrl) && prompt.includes(record.behavior));
    assert.match(prompt, /DRAFT/); checked++;
  }
  assert.equal(checked, 22032);
});
