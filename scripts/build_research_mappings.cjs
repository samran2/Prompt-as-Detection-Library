'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const idOK = id => typeof id === 'string' && [5, 9].includes(id.length) && /^T[0-9]{4}(?:\.[0-9]{3})?$/.test(id);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function text(value, label, max = 300) {
  if (typeof value !== 'string' || !value.length || value.length > max || /[\x00-\x1f\x7f]/.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}
function sourceFor(url) {
  let u; try { u = new URL(url); } catch { throw new Error('Invalid source URL'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || /[\s\\]/.test(url)) throw new Error('Unsafe source URL');
  if (u.hostname === 'lolbas-project.github.io' && (u.pathname === '/' || /^\/lolbas\/[A-Za-z0-9._/-]+\/$/.test(u.pathname))) return 'LOLBAS';
  if (['gtfobins.github.io', 'gtfobins.org'].includes(u.hostname) && (u.pathname === '/' || /^\/gtfobins\/[a-z0-9+._-]+\/$/.test(u.pathname))) return 'GTFOBins';
  if (u.hostname === 'github.com' && u.pathname === '/LOLBAS-Project/LOLBAS') return 'LOLBAS';
  if (u.hostname === 'github.com' && /^\/magicsword-io\/LOLDrivers\/blob\/[a-f0-9]{40}\/detections\/sigma\/[a-z0-9_]+\.yml$/.test(u.pathname) && !u.hash) return 'LOLDrivers';
  return null;
}
function provenanceKind(url) {
  if (url === 'https://lolbas-project.github.io/api/lolbas.json') return 'upstream-id';
  if (typeof url !== 'string' || /[\s\\]/.test(url)) throw new Error('Invalid provenance URL');
  if (/^https:\/\/raw\.githubusercontent\.com\/magicsword-io\/LOLDrivers\/[a-f0-9]{40}\/detections\/sigma\/[a-z0-9_]+\.yml$/.test(url)) return 'rule-tag';
  if (/^https:\/\/raw\.githubusercontent\.com\/mitre-attack\/attack-stix-data\/[a-f0-9]{40}\/(enterprise|mobile|ics)-attack\/\1-attack-19\.2\.json$/.test(url)) return 'mitre-citation';
  throw new Error('Invalid provenance URL');
}
function projectLolbas(entries) {
  if (!Array.isArray(entries) || entries.length > 2000) throw new Error('LOLBAS entry limit or type');
  return entries.flatMap((entry, index) => {
    if (sourceFor(entry.url) !== 'LOLBAS' || !entry.url.startsWith('https://lolbas-project.github.io/lolbas/')) throw new Error('Invalid LOLBAS URL');
    text(entry.Name, 'entry name');
    if (!Array.isArray(entry.Commands) || entry.Commands.length > 100) throw new Error('Invalid command metadata limit');
    return entry.Commands.map((command, commandIndex) => {
      if (!idOK(command.MitreID)) throw new Error('Invalid declared ATT&CK ID');
      return { source: 'LOLBAS', techniqueId: command.MitreID, domain: 'Enterprise', name: entry.Name,
        url: entry.url, basis: 'upstream-id', locator: `/${index}/Commands/${commandIndex}/MitreID` };
    });
  });
}
function projectDriver(yaml, url) {
  if (typeof yaml !== 'string' || Buffer.byteLength(yaml) > 2 * 1024 * 1024 || sourceFor(url) !== 'LOLDrivers') throw new Error('Invalid driver metadata input');
  const lines = yaml.split(/\r?\n/);
  const name = text(lines.find(line => line.startsWith('title: '))?.slice(7), 'rule title');
  const start = lines.indexOf('tags:');
  if (start < 0 || lines.filter(line => line === 'tags:').length !== 1) throw new Error('Missing/duplicate tags block');
  const rows = [];
  for (let i = start + 1; i < lines.length && (!lines[i] || /^\s/.test(lines[i])); i++) {
    const match = /^    - attack\.(t[0-9]{4}(?:\.[0-9]{3})?)$/.exec(lines[i]);
    if (match) rows.push({ source: 'LOLDrivers', techniqueId: match[1].toUpperCase(), domain: 'Enterprise', name,
      url, basis: 'rule-tag', locator: `line:${i + 1}` });
    else if (/attack\.t[0-9]/.test(lines[i])) throw new Error('Unsupported technique tag syntax');
  }
  if (!rows.length) throw new Error('No explicit driver technique tags');
  return rows;
}
function projectAttack(bundle, domain) {
  const rows = [];
  for (const object of bundle.objects) {
    if (object.type !== 'attack-pattern' || object.revoked || object.x_mitre_deprecated) continue;
    const techniqueId = object.external_references?.find(ref => ref.source_name === 'mitre-attack')?.external_id;
    if (!idOK(techniqueId)) continue;
    (object.external_references || []).forEach((ref, index) => {
      if (!ref.url) return;
      let source; try { source = sourceFor(ref.url); } catch { return; }
      if (!source) return;
      rows.push({ source, techniqueId, domain, name: text(ref.source_name, 'citation name'), url: ref.url,
        basis: 'mitre-citation', locator: `${object.id}/external_references/${index}`, sourceKey: `attack-${domain}` });
    });
  }
  return rows;
}

function buildData(snapshot, catalog, attackRows, attackSources) {
  if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.rows) || snapshot.rows.length > 5000 || !Array.isArray(snapshot.sources) || snapshot.sources.length > 50) throw new Error('Invalid snapshot limits/version');
  const sources = [...snapshot.sources, ...attackSources];
  const sourceKeys = new Map();
  for (const source of sources) {
    text(source.key, 'source key');
    if (sourceKeys.has(source.key) || typeof source.sha256 !== 'string' || source.sha256.length !== 64 || !/^[a-f0-9]{64}$/.test(source.sha256)) throw new Error('Invalid source identity');
    provenanceKind(source.url);
    if (provenanceKind(source.url) === 'rule-tag' && !['experimental', 'test', 'stable', 'deprecated', 'unsupported'].includes(source.status)) throw new Error('Invalid upstream rule status');
    sourceKeys.set(source.key, source);
  }
  const active = new Map(catalog.map(record => [record.id, record]));
  const techniques = {}; const excluded = []; const seen = new Map();
  for (const row of [...snapshot.rows, ...attackRows]) {
    if (!idOK(row.techniqueId) || sourceFor(text(row.url, 'URL', 1000)) !== row.source
      || !['upstream-id', 'mitre-citation', 'rule-tag'].includes(row.basis)
      || !sourceKeys.has(row.sourceKey)) throw new Error('Invalid mapping row');
    text(row.name, 'mapping name'); text(row.locator, 'source locator');
    if ((row.basis === 'upstream-id' && row.source !== 'LOLBAS')
      || (row.basis === 'rule-tag' && row.source !== 'LOLDrivers')) throw new Error('Invalid mapping basis');
    const evidence = sourceKeys.get(row.sourceKey);
    if (provenanceKind(evidence.url) !== row.basis
      || (row.basis === 'rule-tag' && evidence.url !== row.url.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/'))
      || (row.basis === 'mitre-citation' && (row.sourceKey !== `attack-${row.domain}` || !evidence.url.endsWith(`/${row.domain.toLowerCase()}-attack-19.2.json`)))) throw new Error('Mismatched mapping provenance');
    const record = active.get(row.techniqueId);
    if (!record || record.domain !== row.domain) {
      excluded.push({ ...row, reason: 'not-active-in-pinned-domain' }); continue;
    }
    const key = JSON.stringify([row.source, row.techniqueId, row.url, row.basis, row.sourceKey]);
    if (seen.has(key)) { seen.get(key).locators.push(row.locator); continue; }
    const mapped = { source: row.source, name: row.name, url: row.url, basis: row.basis, sourceKey: row.sourceKey, locators: [row.locator] };
    seen.set(key, mapped);
    if (!techniques[record.id]) techniques[record.id] = { domain: record.domain, name: record.name, links: [] };
    techniques[record.id].links.push(mapped);
  }
  const ordered = Object.fromEntries(Object.entries(techniques).sort(([a], [b]) => a.localeCompare(b)));
  const counts = {};
  for (const source of ['LOLBAS', 'GTFOBins', 'LOLDrivers']) {
    counts[source] = { techniques: Object.values(ordered).filter(t => t.links.some(link => link.source === source)).length,
      links: [...seen.values()].filter(link => link.source === source).length };
  }
  return { schemaVersion: 1, attackVersion: '19.2', retrievedAt: snapshot.retrievedAt, counts, sources, techniques: ordered, excluded };
}

function build(root = ROOT, check = false) {
  const directory = path.join(root, 'content/research-sources');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  for (const name of ['upstream.json', 'LOLBAS-license.txt', 'LOLBAS-notice.txt', 'LOLDrivers-license.txt']) {
    if (sha256(fs.readFileSync(path.join(directory, name))) !== manifest.files[name]) throw new Error(`Mapping source hash mismatch: ${name}`);
  }
  const snapshot = JSON.parse(fs.readFileSync(path.join(directory, 'upstream.json'), 'utf8'));
  const attackManifest = JSON.parse(fs.readFileSync(path.join(root, 'sources/attack-19.2/manifest.json')));
  const attackRows = [], attackSources = [];
  for (const domain of ['Enterprise', 'Mobile', 'ICS']) {
    const name = `raw/${domain.toLowerCase()}-attack-19.2.json`;
    const pin = attackManifest.files.find(file => file.path === name);
    const bytes = fs.readFileSync(path.join(root, 'sources/attack-19.2', name));
    if (!pin || sha256(bytes) !== pin.sha256) throw new Error('ATT&CK source hash mismatch');
    attackRows.push(...projectAttack(JSON.parse(bytes), domain));
    attackSources.push({ key: `attack-${domain}`, url: pin.url, sha256: pin.sha256,
      revision: `ATT&CK 19.2 (${attackManifest.commit_sha})`, license: 'MITRE ATT&CK terms' });
  }
  const data = buildData(snapshot, require(path.join(root, 'demo/catalog.js')), attackRows, attackSources);
  const serialized = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  const script = `// Generated by scripts/build_research_mappings.cjs. Source terms: RESEARCH_SOURCES_LICENSES.txt.\n(function(root, data) { if (typeof module === 'object' && module.exports) module.exports = data; else root.PAD_RESEARCH_MAPPINGS = data; })(typeof globalThis !== 'undefined' ? globalThis : this, ${serialized});\n`;
  const licenses = 'EXTERNAL RESEARCH MAPPING METADATA\n\nMinimal modified projections by Prompt-as-Detection Library; no rule or command bodies.\nProject code remains MIT. The following terms apply to their respective source metadata.\nMITRE citations retain the separate THIRD_PARTY_LICENSE.txt notice.\nLOLBAS source: https://github.com/LOLBAS-Project/LOLBAS (GPL 3.0).\nLOLDrivers source: https://github.com/magicsword-io/LOLDrivers (Apache 2.0).\nLOLDrivers rule metadata author: Nasreddine Bencherchali (Nextron Systems).\n\n'
    + ['LOLBAS-notice.txt', 'LOLBAS-license.txt', 'LOLDrivers-license.txt'].map(name => `${name}\n\n${fs.readFileSync(path.join(directory, name), 'utf8')}`).join('\n\n');
  for (const [name, body] of [['research-mappings.js', script], ['RESEARCH_SOURCES_LICENSES.txt', licenses]]) {
    const target = path.join(root, 'demo', name);
    if (check) { if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== body) throw new Error(`Mapping build drift: ${name}`); }
    else fs.writeFileSync(target, body);
  }
  return data;
}
if (require.main === module) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build_research_mappings.cjs [--check]');
    const data = build(ROOT, process.argv.includes('--check'));
    console.log(JSON.stringify({ counts: data.counts, excluded: [...new Set(data.excluded.map(row => row.techniqueId))] }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { projectLolbas, projectDriver, projectAttack, sourceFor, idOK, sha256, buildData, build };
