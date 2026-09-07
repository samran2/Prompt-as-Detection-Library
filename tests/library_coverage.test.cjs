const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('../demo/core.js');

// Independent source oracle: do not import the generator or trust its coverage
// totals. These byte hashes were checked against the separately recovered
// official MITRE v19.2 sources before the generated library existed.
const ROOT = path.resolve(__dirname, '..');
const DOMAIN_PINS = [
  {slug: 'enterprise', name: 'Enterprise', active: 697, parents: 222, children: 475, excludedCount: 161, procedureTotal: 17136, analytics: 1745,
    sha256: 'dc1639caa5501d720e280cf1cbd8fbe009884a0c9b3e6e9ed9d0c25166c3d8f4'},
  {slug: 'mobile', name: 'Mobile', active: 124, parents: 77, children: 47, excludedCount: 66, procedureTotal: 1478, analytics: 211,
    sha256: 'acfa5ca2d93484476f79bf38590e2b55bb675fc0ce85e76bffa0af2c82dada64'},
  {slug: 'ics', name: 'ICS', active: 97, parents: 79, children: 18, excludedCount: 21, procedureTotal: 271, analytics: 97,
    sha256: '08b83d2cea6b6d6752468ef0e62e2ab2a53c9443ef72c439ecccb07ab9e89da9'},
];
const live = object => Boolean(object) && object.revoked !== true && object.x_mitre_deprecated !== true;
const mitreReference = object => object.external_references.find(reference =>
  ['mitre-attack', 'mitre-mobile-attack', 'mitre-ics-attack'].includes(reference.source_name));
const externalId = object => mitreReference(object).external_id;
const recordKey = record => `${record.domain}:${record.id}`;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sorted = values => [...values].sort();
const comparableUrl = url => url.replace(/\/$/, '');
let oracle;

function sourceOracle() {
  if (oracle) return oracle;
  const domains = DOMAIN_PINS.map(pin => {
    const sourcePath = path.join(ROOT, 'sources', 'attack-19.2', 'raw', `${pin.slug}-attack-19.2.json`);
    const bytes = fs.readFileSync(sourcePath);
    assert.equal(hash(bytes), pin.sha256, `${pin.name}: pinned source bytes changed`);
    const bundle = JSON.parse(bytes);
    assert.equal(bundle.type, 'bundle');
    const objects = new Map(bundle.objects.map(object => [object.id, object]));
    assert.equal(objects.size, bundle.objects.length, `${pin.name}: duplicate source STIX IDs`);
    const techniques = bundle.objects.filter(object => object.type === 'attack-pattern' && live(object));
    const techniqueIds = new Set(techniques.map(object => object.id));
    const relationships = bundle.objects.filter(object => object.type === 'relationship' && live(object));
    const procedures = relationships.filter(object => object.relationship_type === 'uses' && techniqueIds.has(object.target_ref)
      && live(objects.get(object.source_ref)) && ['intrusion-set', 'malware', 'tool', 'campaign'].includes(objects.get(object.source_ref).type));
    const parentById = new Map(relationships.filter(object => object.relationship_type === 'subtechnique-of' && techniqueIds.has(object.source_ref))
      .map(object => [object.source_ref, objects.get(object.target_ref)]));
    const detects = relationships.filter(object => object.relationship_type === 'detects' && techniqueIds.has(object.target_ref)
      && live(objects.get(object.source_ref)) && objects.get(object.source_ref).type === 'x-mitre-detection-strategy');
    const strategies = new Map();
    for (const relationship of detects) {
      const linked = strategies.get(relationship.target_ref) || [];
      linked.push(objects.get(relationship.source_ref));
      strategies.set(relationship.target_ref, linked);
    }
    const linkedAnalyticIds = new Set(detects.flatMap(relationship => objects.get(relationship.source_ref).x_mitre_analytic_refs));
    const activeAnalytics = bundle.objects.filter(object => object.type === 'x-mitre-analytic' && live(object));
    const tactics = new Map(bundle.objects.filter(object => object.type === 'x-mitre-tactic')
      .map(object => [object.x_mitre_shortname, object.name]));
    const excluded = bundle.objects.filter(object => object.type === 'attack-pattern' && !live(object));
    return {...pin, objects, techniques, procedures, parentById, detects, strategies, linkedAnalyticIds, activeAnalytics, tactics, excluded};
  });
  const entries = domains.flatMap(domain => domain.techniques.map(technique => ({
    id: externalId(technique), domain: domain.name, technique, source: domain,
    procedures: domain.procedures.filter(relationship => relationship.target_ref === technique.id),
    strategies: domain.strategies.get(technique.id) || [],
  })));
  oracle = {domains, entries, byKey: new Map(entries.map(entry => [recordKey(entry), entry]))};
  return oracle;
}

function catalog() {
  return require('../demo/catalog.js');
}

function assertExactKeys(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  assert.equal(actualSet.size, actual.length, `${label}: duplicate keys`);
  const missing = [...expectedSet].filter(key => !actualSet.has(key));
  const extra = [...actualSet].filter(key => !expectedSet.has(key));
  assert.ok(missing.length === 0 && extra.length === 0,
    `${label}: missing, extra or wrong-domain keys; missing ${missing.length} (${missing.slice(0, 5).join(', ')}); extra ${extra.length} (${extra.slice(0, 5).join(', ')})`);
}

function promptFiles(directory = path.join(ROOT, 'library', 'prompts'), prefix = '') {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), `Unexpected prompt symlink: ${relative}`);
    if (entry.isDirectory()) return promptFiles(path.join(directory, entry.name), relative);
    assert.ok(entry.isFile(), `Unexpected prompt entry: ${relative}`);
    return [relative];
  });
}

function assertSourcePrompt(prompt, entry, record) {
  const label = recordKey(entry);
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.includes(entry.id) && prompt.includes(entry.technique.name) && prompt.includes(entry.domain), `${label}: technique traceability`);
  assert.ok(prompt.includes(comparableUrl(mitreReference(entry.technique).url)), `${label}: source URL`);
  assert.ok(prompt.includes(entry.technique.description), `${label}: complete literal technique description`);
  assert.match(prompt, /DRAFT.*NOT VALIDATED/, `${label}: visible draft warning`);
  assert.doesNotMatch(prompt, /SAMPLE DETECTION PROMPT/, `${label}: full record must not be labelled a sample`);
  assert.match(prompt, /not operational validation|not a deployed or validated detection/i, `${label}: validation limitation`);
  for (const strategy of entry.strategies) {
    assert.ok(prompt.includes(externalId(strategy)) && prompt.includes(strategy.name), `${label}: linked strategy identity`);
    assert.ok(prompt.includes(comparableUrl(mitreReference(strategy).url)), `${label}: linked strategy URL`);
    for (const analyticId of strategy.x_mitre_analytic_refs) {
      const analytic = entry.source.objects.get(analyticId);
      assert.ok(prompt.includes(externalId(analytic)), `${label}: linked analytic identity`);
      assert.ok(prompt.includes(analytic.description), `${label}: complete literal ${externalId(analytic)} description`);
      for (const log of analytic.x_mitre_log_source_references || []) {
        assert.ok(prompt.includes(log.name) && prompt.includes(log.channel), `${label}: source log name and channel`);
        assert.ok(prompt.includes(entry.source.objects.get(log.x_mitre_data_component_ref).name), `${label}: source data component`);
      }
      for (const mutable of analytic.x_mitre_mutable_elements || []) {
        // The composer may serialize source objects as JSON; escaped strings
        // must round-trip literally rather than be evaluated or substituted.
        for (const value of Object.values(mutable)) {
          assert.ok(prompt.includes(value) || prompt.includes(JSON.stringify(value).slice(1, -1)), `${label}: source tuning variable`);
        }
      }
    }
  }
  for (const example of record.procedureExamples) {
    assert.ok(prompt.includes(example.id) && prompt.includes(example.actorId) && prompt.includes(example.actorName), `${label}: procedure traceability`);
    assert.ok(prompt.includes(example.description), `${label}: complete literal procedure description`);
  }
  if (entry.procedures.length === 0) assert.match(prompt, /No documented procedure/i, `${label}: procedure absence is explicit`);
}

test('independent pinned sources contain precisely the documented active population and linkage counts', () => {
  const {domains, entries} = sourceOracle();
  assert.equal(entries.length, 918);
  assert.equal(new Set(entries.map(recordKey)).size, 918);
  for (const domain of domains) {
    assert.equal(domain.techniques.length, domain.active, domain.name);
    assert.ok(domain.techniques.every(object => mitreReference(object).source_name === 'mitre-attack'), `${domain.name}: active reference namespace`);
    assert.equal(domain.techniques.filter(object => !object.x_mitre_is_subtechnique).length, domain.parents, `${domain.name}: parent techniques`);
    assert.equal(domain.techniques.filter(object => object.x_mitre_is_subtechnique).length, domain.children, `${domain.name}: subtechniques`);
    assert.equal(domain.parentById.size, domain.children, `${domain.name}: parent links`);
    assert.equal(domain.excluded.length, domain.excludedCount, `${domain.name}: historical exclusions`);
    assert.equal(domain.procedures.length, domain.procedureTotal, `${domain.name}: source procedures`);
    assert.equal(domain.detects.length, domain.active, `${domain.name}: source strategies`);
    assert.equal(domain.linkedAnalyticIds.size, domain.analytics, `${domain.name}: linked analytics`);
  }
});

test('catalog has exactly the active source ID/domain set with no omissions, extras or duplicates', () => {
  assertExactKeys(catalog().map(recordKey), sourceOracle().entries.map(recordKey), 'catalog');
  assert.equal(catalog().length, 918);
});

test('every record preserves source names, complete behavior, platforms, tactics and parent linkage', () => {
  const {byKey} = sourceOracle();
  for (const record of catalog()) {
    const entry = byKey.get(recordKey(record));
    assert.ok(entry, `Unexpected catalog record ${recordKey(record)}`);
    const raw = entry.technique;
    const parent = entry.source.parentById.get(raw.id);
    assert.equal(record.name, raw.name, `${record.id}: source name`);
    assert.equal(record.stixId, raw.id, `${record.id}: STIX identity`);
    assert.equal(record.behavior, raw.description, `${record.id}: complete source description`);
    assert.deepEqual(record.references, raw.external_references, `${record.id}: original source citations`);
    assert.equal(record.attackVersion, '19.2');
    assert.equal(record.kind, raw.x_mitre_is_subtechnique ? 'subtechnique' : 'technique');
    assert.equal(record.parentId, parent ? externalId(parent) : null, `${record.id}: source parent`);
    if (parent) {
      assert.ok(live(parent), `${record.id}: parent must be active`);
      assert.equal(record.parentName, parent.name, `${record.id}: parent name`);
    }
    assert.deepEqual(sorted(record.platforms), sorted(raw.x_mitre_platforms || []), `${record.id}: no invented platforms`);
    assert.deepEqual(sorted(record.tactics), sorted(raw.kill_chain_phases.map(phase => entry.source.tactics.get(phase.phase_name))), `${record.id}: source tactic names`);
    assert.equal(comparableUrl(record.sourceUrl), comparableUrl(mitreReference(raw).url));
    assert.match(record.falsePositives, /baseline|local|legitimate|approved/i, `${record.id}: local review guidance`);
  }
});

test('catalog retains every source-linked strategy and analytic, including full descriptions, logs and tuning variables', () => {
  const {byKey, domains} = sourceOracle();
  const actualAnalytics = [];
  let strategyCount = 0;
  for (const record of catalog()) {
    const entry = byKey.get(recordKey(record));
    assert.ok(entry, `Unexpected catalog record ${recordKey(record)}`);
    assertExactKeys(record.strategies.map(strategy => strategy.id), entry.strategies.map(externalId), `${record.id}: strategy set`);
    for (const strategy of record.strategies) {
      strategyCount++;
      const rawStrategy = entry.strategies.find(object => externalId(object) === strategy.id);
      assert.equal(strategy.name, rawStrategy.name);
      assert.deepEqual(strategy.references, rawStrategy.external_references, `${strategy.id}: original source citations`);
      assert.equal(comparableUrl(strategy.url), comparableUrl(mitreReference(rawStrategy).url));
      const expectedAnalytics = rawStrategy.x_mitre_analytic_refs.map(id => entry.source.objects.get(id));
      assertExactKeys(strategy.analytics.map(analytic => analytic.id), expectedAnalytics.map(externalId), `${record.id}: analytic set`);
      for (const analytic of strategy.analytics) {
        actualAnalytics.push(`${entry.domain}:${analytic.id}`);
        const rawAnalytic = expectedAnalytics.find(object => externalId(object) === analytic.id);
        assert.equal(analytic.name, rawAnalytic.name);
        assert.deepEqual(analytic.references, rawAnalytic.external_references, `${analytic.id}: original source citations`);
        assert.equal(analytic.description, rawAnalytic.description, `${analytic.id}: full source description`);
        assert.deepEqual(sorted(analytic.platforms), sorted(rawAnalytic.x_mitre_platforms || []));
        assert.deepEqual(analytic.mutableElements, rawAnalytic.x_mitre_mutable_elements || []);
        assert.deepEqual(analytic.logSources.map(log => ({name: log.name, channel: log.channel, dataComponent: log.dataComponent})),
          (rawAnalytic.x_mitre_log_source_references || []).map(log => ({name: log.name, channel: log.channel,
            dataComponent: entry.source.objects.get(log.x_mitre_data_component_ref).name})), `${analytic.id}: complete source log references`);
      }
    }
  }
  assert.equal(strategyCount, 918);
  const expectedAnalytics = domains.flatMap(domain => [...domain.linkedAnalyticIds].map(id => `${domain.name}:${externalId(domain.objects.get(id))}`));
  assertExactKeys(actualAnalytics, expectedAnalytics, 'linked analytics across domains');
  assert.equal(actualAnalytics.length, 2053);
  const unlinked = domains.flatMap(domain => domain.activeAnalytics.filter(object => !domain.linkedAnalyticIds.has(object.id)));
  assert.equal(unlinked.length, 13);
});

test('all 18,885 procedure relationships survive exactly with source identities, descriptions and references', () => {
  const {entries} = sourceOracle();
  const expected = new Map(entries.flatMap(entry => entry.procedures.map(relationship => [`${entry.domain}:${relationship.id}`, {entry, relationship}])));
  const lines = fs.readFileSync(path.join(ROOT, 'library', 'procedures.jsonl'), 'utf8').trimEnd().split('\n');
  const rows = lines.map(JSON.parse);
  assert.equal(rows.length, 18885);
  assert.equal(expected.size, 18885);
  assertExactKeys(rows.map(row => `${row.domain}:${row.id}`), expected.keys(), 'procedure relationships');
  for (const row of rows) {
    const {entry, relationship} = expected.get(`${row.domain}:${row.id}`);
    const actor = entry.source.objects.get(relationship.source_ref);
    assert.equal(row.techniqueId, entry.id);
    assert.equal(row.domainId, `${entry.source.slug}-attack`);
    assert.equal(row.sourceRef, relationship.source_ref);
    assert.equal(row.targetRef, relationship.target_ref);
    assert.equal(row.actorId, externalId(actor));
    assert.equal(row.actorName, actor.name);
    assert.equal(row.description, relationship.description);
    assert.deepEqual(row.references, relationship.external_references || []);
  }
  for (const record of catalog()) {
    const entry = sourceOracle().byKey.get(recordKey(record));
    assert.equal(record.procedureCount, entry.procedures.length, `${record.id}: procedure count`);
    assert.equal(record.procedureExamples.length, Math.min(3, entry.procedures.length), `${record.id}: example completeness`);
    assert.equal(new Set(record.procedureExamples.map(example => example.id)).size, record.procedureExamples.length);
    for (const example of record.procedureExamples) {
      const source = expected.get(`${record.domain}:${example.id}`);
      assert.ok(source && source.entry.id === record.id, `${record.id}: example must belong to this technique`);
      const actor = entry.source.objects.get(source.relationship.source_ref);
      assert.equal(example.actorId, externalId(actor));
      assert.equal(example.actorName, actor.name);
      assert.equal(example.description, source.relationship.description);
      assert.deepEqual(example.references, source.relationship.external_references || []);
    }
  }
});

test('coverage evidence names exactly the excluded source techniques and active source/catalog/text ID sets', () => {
  const {domains, entries} = sourceOracle();
  const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, 'library', 'coverage.json'), 'utf8'));
  const excluded = domains.flatMap(domain => domain.excluded.map(object => ({id: externalId(object), domain: domain.name,
    domainId: `${domain.slug}-attack`, stixId: object.id, name: object.name, revoked: object.revoked === true, deprecated: object.x_mitre_deprecated === true})));
  assert.equal(excluded.length, 248);
  assertExactKeys(coverage.excludedTechniques.map(recordKey), excluded.map(recordKey), 'historical exclusions');
  for (const actual of coverage.excludedTechniques) {
    const expected = excluded.find(item => recordKey(item) === recordKey(actual));
    for (const key of Object.keys(expected)) assert.deepEqual(actual[key], expected[key], `${actual.id}: exclusion ${key}`);
  }
  for (const field of ['sourceIds', 'catalogIds', 'textIds']) assertExactKeys(coverage[field], entries.map(recordKey), `coverage.${field}`);
});

test('coverage counts and unlinked analytic evidence reconcile independently to the raw source graph', () => {
  const {domains, entries} = sourceOracle();
  const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, 'library', 'coverage.json'), 'utf8'));
  const total = {promptFiles: entries.length, withoutTelemetryReferences: entries.filter(entry => entry.strategies.every(strategy =>
    strategy.x_mitre_analytic_refs.every(id => !(entry.source.objects.get(id).x_mitre_log_source_references || []).length))).length};
  assertExactKeys(coverage.domains.map(item => item.domain), domains.map(item => item.name), 'coverage domain rows');
  for (const domain of domains) {
    const expected = {
      activeTechniques: domain.techniques.length,
      parentTechniques: domain.techniques.filter(object => !object.x_mitre_is_subtechnique).length,
      subtechniques: domain.techniques.filter(object => object.x_mitre_is_subtechnique).length,
      excludedTechniques: domain.excluded.length,
      procedures: domain.procedures.length,
      strategies: domain.detects.length,
      activeAnalytics: domain.activeAnalytics.length,
      linkedAnalytics: domain.linkedAnalyticIds.size,
      unlinkedAnalytics: domain.activeAnalytics.filter(object => !domain.linkedAnalyticIds.has(object.id)).length,
      unspecifiedPlatforms: domain.techniques.filter(object => !(object.x_mitre_platforms || []).length).length,
      withoutProcedures: entries.filter(entry => entry.domain === domain.name && entry.procedures.length === 0).length,
    };
    const actual = coverage.domains.find(item => item.domain === domain.name);
    assert.equal(actual.domainId, `${domain.slug}-attack`);
    for (const [field, count] of Object.entries(expected)) {
      assert.equal(actual[field], count, `${domain.name}: reported ${field}`);
      total[field] = (total[field] || 0) + count;
    }
  }
  assert.deepEqual(coverage.totals, total, 'coverage totals derive from the source, not generated metadata');
  const unlinked = domains.flatMap(domain => domain.activeAnalytics.filter(object => !domain.linkedAnalyticIds.has(object.id))
    .map(object => ({id: externalId(object), domain: domain.name, domainId: `${domain.slug}-attack`, stixId: object.id, name: object.name})));
  assertExactKeys(coverage.unlinkedAnalytics.map(recordKey), unlinked.map(recordKey), 'unlinked analytic evidence');
  for (const actual of coverage.unlinkedAnalytics) assert.deepEqual(actual, unlinked.find(item => recordKey(item) === recordKey(actual)));
});

test('coverage file hashes and byte counts match every actual generated output, source file and shared composer', () => {
  const {entries} = sourceOracle();
  const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, 'library', 'coverage.json'), 'utf8'));
  const outputPaths = ['demo/catalog.js', 'library/procedures.jsonl',
    ...entries.map(entry => `library/prompts/${entry.source.slug}/${entry.id}.txt`)];
  const sourcePaths = ['tag-ref.json', 'tag-object.json', 'enterprise-attack-19.2.json', 'mobile-attack-19.2.json',
    'ics-attack-19.2.json', 'LICENSE.txt', 'README.md', 'USAGE.md', 'index.json'].map(file => `sources/attack-19.2/raw/${file}`);
  assertExactKeys(coverage.generatedFiles.map(file => file.path), outputPaths, 'output hash inventory');
  assertExactKeys(coverage.sourceFiles.map(file => file.path), sourcePaths, 'source hash inventory');
  for (const file of [...coverage.generatedFiles, ...coverage.sourceFiles]) {
    const target = path.join(ROOT, file.path);
    assert.ok(fs.lstatSync(target).isFile(), `${file.path}: regular file required`);
    const bytes = fs.readFileSync(target);
    assert.equal(file.bytes, bytes.length, `${file.path}: byte count`);
    assert.equal(file.sha256, hash(bytes), `${file.path}: actual content hash`);
  }
  assert.equal(coverage.composer.path, 'demo/core.js');
  assert.equal(coverage.composer.sha256, hash(fs.readFileSync(path.join(ROOT, 'demo', 'core.js'))));
});

test('the 24 ICS records without platforms and 108 records without procedures remain honest about missing source data', () => {
  const entries = sourceOracle().entries;
  const records = new Map(catalog().map(record => [recordKey(record), record]));
  const noPlatforms = entries.filter(entry => !entry.technique.x_mitre_platforms?.length);
  const noProcedures = entries.filter(entry => entry.procedures.length === 0);
  assert.equal(noPlatforms.length, 24);
  assert.equal(noProcedures.length, 108);
  for (const entry of noPlatforms) {
    assert.equal(entry.domain, 'ICS');
    assert.deepEqual(records.get(recordKey(entry)).platforms, [], `${entry.id}: absent platform data`);
  }
  for (const entry of noProcedures) {
    const record = records.get(recordKey(entry));
    assert.equal(record.procedureCount, 0);
    assert.deepEqual(record.procedureExamples, []);
    assertSourcePrompt(core.composePrompt(record), entry, record);
  }
});

test('all 918 text files have the exact active domain/ID paths and full traceable source content', () => {
  const {entries, byKey} = sourceOracle();
  const expectedPaths = entries.map(entry => `${entry.source.slug}/${entry.id}.txt`);
  assertExactKeys(promptFiles(), expectedPaths, 'readable prompt files');
  const hashes = new Set();
  for (const record of catalog()) {
    const entry = byKey.get(recordKey(record));
    const prompt = fs.readFileSync(path.join(ROOT, 'library', 'prompts', entry.source.slug, `${entry.id}.txt`), 'utf8');
    assertSourcePrompt(prompt, entry, record);
    assert.ok(prompt === core.composePrompt(record) || prompt === `${core.composePrompt(record)}\n`, `${record.id}: text must use the shared composer`);
    hashes.add(hash(prompt));
  }
  assert.equal(hashes.size, 918, 'each technique has distinct readable content');
});

test('all 22,032 technique/mode/target combinations are distinct, literal, complete and traceable drafts', () => {
  assert.deepEqual(Object.keys(core.MODES), ['detect', 'hunt', 'triage', 'validate']);
  assert.deepEqual(core.TARGETS, ['Platform-neutral', 'Panther Python', 'Sentinel KQL', 'Defender XDR', 'Splunk SPL', 'Sigma']);
  const context = 'QA literal data: ${HOME} ${record.id} {{source}} <script>doNotExecute()</script> </context> `verbatim`';
  const {byKey} = sourceOracle();
  const hashes = new Set();
  let compositions = 0;
  for (const record of catalog()) for (const mode of Object.keys(core.MODES)) for (const target of core.TARGETS) {
    const prompt = core.composePrompt(record, {mode, target, context});
    assertSourcePrompt(prompt, byKey.get(recordKey(record)), record);
    assert.ok(prompt.includes(context), `${record.id}/${mode}/${target}: analyst context remains literal`);
    assert.ok(prompt.includes(core.MODES[mode]) && prompt.includes(target), `${record.id}: selected mode and target`);
    hashes.add(hash(prompt));
    compositions++;
  }
  assert.equal(compositions, 22032);
  assert.equal(hashes.size, compositions, 'no collapsed technique/mode/target combinations');
});

test('independent coverage checks reject missing IDs, count-preserving duplicates, extra historical IDs and wrong domains', () => {
  const expected = sourceOracle().entries.map(recordKey);
  assert.throws(() => assertExactKeys(expected.slice(1), expected, 'missing'), /missing, extra or wrong-domain/);
  const duplicated = [...expected];
  duplicated[duplicated.length - 1] = duplicated[0];
  assert.throws(() => assertExactKeys(duplicated, expected, 'duplicate'), /duplicate keys/);
  const wrongDomain = [...expected];
  wrongDomain[0] = wrongDomain[0].replace('Enterprise:', 'ICS:');
  assert.throws(() => assertExactKeys(wrongDomain, expected, 'wrong domain'), /missing, extra or wrong-domain/);
  const historical = sourceOracle().domains[0].excluded[0];
  assert.throws(() => assertExactKeys([...expected, `Enterprise:${externalId(historical)}`], expected, 'historical'), /missing, extra or wrong-domain/);
});

test('source-content checks reject generic name-only prompts and omitted source analytic descriptions', () => {
  const entry = sourceOracle().entries.find(item => item.id === 'T1059.001' && item.domain === 'Enterprise');
  const record = catalog().find(item => recordKey(item) === recordKey(entry));
  const complete = core.composePrompt(record);
  assertSourcePrompt(complete, entry, record);
  const nameOnly = complete.replace(entry.technique.description, entry.technique.name);
  assert.throws(() => assertSourcePrompt(nameOnly, entry, record), /complete literal technique description/);
  const analytic = entry.source.objects.get(entry.strategies[0].x_mitre_analytic_refs[0]);
  const withoutAnalytic = complete.replace(analytic.description, analytic.name);
  assert.throws(() => assertSourcePrompt(withoutAnalytic, entry, record), /complete literal .* description/);
});
