(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./research-mappings.js'));
  else root.PAD_RESEARCH_SOURCES = factory(root.PAD_RESEARCH_MAPPINGS);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (mappingData) {
  'use strict';

  // Minimal mapping metadata only: no commands, rule bodies or samples.
  const available = mappingData?.schemaVersion === 1 && mappingData?.attackVersion === '19.2'
    && Array.isArray(mappingData.sources) && mappingData.techniques && mappingData.counts;
  const evidence = new Map(available ? mappingData.sources.map(source => [source.key, source]) : []);
  const BASIS = { 'upstream-id': 'LOLBAS declared ATT&CK ID', 'mitre-citation': 'MITRE ATT&CK 19.2 directly cites this source', 'rule-tag': 'LOLDrivers Sigma rule-level ATT&CK tag' };
  const SOURCES = [
    {
      name: 'LOLBAS', platform: 'Windows · binaries, scripts and libraries',
      description: 'Research legitimate Windows tools that can be misused. Inspect upstream behavior notes and detection references against your actual telemetry.',
      repository: 'LOLBAS-Project/LOLBAS',
      links: [
        ['website', 'https://lolbas-project.github.io/'],
        ['repository', 'https://github.com/LOLBAS-Project/LOLBAS'],
        ['license', 'https://github.com/LOLBAS-Project/LOLBAS/blob/master/LICENSE'],
      ],
    },
    {
      name: 'GTFOBins', platform: 'Unix-like systems · executable behaviors',
      description: 'Research how Unix executables can cross security boundaries when misconfigured. Check prerequisites and expected administration before defining a detection.',
      repository: 'GTFOBins/GTFOBins.github.io',
      links: [
        ['website', 'https://gtfobins.org/'],
        ['repository', 'https://github.com/GTFOBins/GTFOBins.github.io'],
        ['license', 'https://github.com/GTFOBins/GTFOBins.github.io/blob/master/LICENSE'],
      ],
    },
    {
      name: 'LOLDrivers', platform: 'Windows · vulnerable and malicious drivers',
      description: 'Research driver intelligence and upstream detection references. Confirm driver identity, source freshness and your available telemetry; a match alone is not a verdict.',
      repository: 'magicsword-io/LOLDrivers',
      links: [
        ['detections', 'https://www.loldrivers.io/detections/'],
        ['repository', 'https://github.com/magicsword-io/LOLDrivers'],
        ['license', 'https://github.com/magicsword-io/LOLDrivers/blob/main/LICENSE'],
      ],
    },
  ];

  function cardsFor(techniqueId) {
    const id = typeof techniqueId === 'string' && [5, 9].includes(techniqueId.length)
      && /^T[0-9]{4}(?:\.[0-9]{3})?$/.test(techniqueId) ? techniqueId : '';
    return SOURCES.map(source => {
      let search = null;
      if (id) {
        const url = new URL(`https://github.com/${source.repository}/search`);
        url.searchParams.set('q', `"${id}"`);
        url.searchParams.set('type', 'code');
        search = { label: `Search ${source.name} for ${id}`, url: url.href };
      }
      const mappings = available && id ? (mappingData.techniques[id]?.links || [])
        .filter(row => row.source === source.name).map(row => ({ ...row, locators: [...row.locators], evidence: { ...evidence.get(row.sourceKey) } })) : [];
      return {
        name: source.name, platform: source.platform, description: source.description,
        repository: source.repository,
        links: source.links.map(([label, url]) => ({ label: `${source.name} ${label}`, url })),
        search, mappings,
        mappingStatus: !available ? 'unavailable' : !id ? 'general' : mappings.length ? 'mapped' : 'unmapped',
        coverage: available ? { ...mappingData.counts[source.name] } : null,
      };
    });
  }

  function render({ document, root, techniqueId = '', headingLevel = 3 }) {
    if (![3, 4].includes(headingLevel)) throw new Error('Unsupported source-card heading level.');
    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const link = entry => {
      const anchor = element('a', 'research-source-link', entry.label);
      anchor.href = entry.url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
      anchor.referrerPolicy = 'no-referrer';
      return anchor;
    };
    const cards = cardsFor(techniqueId);
    const introduction = element('p', 'fine-print', 'Source-backed ATT&CK links, not validated detections. Only mapping metadata is bundled; no commands, rules or samples are executed. External links open in a new tab only when selected.');
    const boundary = element('p', 'fine-print', cards[0].search
      ? 'Documented links use exact active ATT&CK 19.2 IDs. No parent or cross-domain inheritance. Separate ID searches are not verified mappings; confirm relevance in the original source.'
      : 'General source directory. No ATLAS mappings are provided or inferred. Select an ATT&CK technique in Evidence to inspect its documented links.');
    const list = element('div', 'research-source-grid');
    for (const card of cards) {
      const article = element('article', 'research-source-card');
      article.append(element(`h${headingLevel}`, '', card.name), element('p', 'research-source-platform', card.platform), element('p', '', card.description));
      const status = card.mappingStatus === 'unavailable' ? 'Mapping data unavailable. Reload a complete local build.'
        : card.mappingStatus === 'general' ? `${card.coverage.techniques} ATT&CK records with documented links in the included snapshots.`
          : card.mappingStatus === 'unmapped' ? `No documented mapping for ${techniqueId} in the included snapshots. This does not prove no relationship exists.`
            : `${card.mappings.length} documented source links for ${techniqueId}.`;
      article.append(element('p', 'research-mapping-status', status));
      if (card.mappings.length) {
        const details = element('details', 'research-mapping-details');
        details.append(element('summary', '', `Inspect ${card.mappings.length} ${card.name} links for ${techniqueId}`));
        if (card.name === 'LOLDrivers') details.append(element('p', 'fine-print', 'These are rule-level tags, not mappings for every driver. Rule references are not locally validated.'));
        const entries = element('ul', 'research-mapping-list');
        for (const row of card.mappings) {
          const item = element('li', '');
          item.append(link({ label: row.name, url: row.url }), element('p', 'fine-print', BASIS[row.basis]));
          const proof = element('details', 'research-mapping-proof');
          if (row.basis === 'rule-tag') item.append(element('p', 'fine-print', `Upstream rule status: ${row.evidence.status} (not local validation).`));
          proof.append(element('summary', '', `Provenance: ${row.name}`), link({ label: 'Original mapping evidence', url: row.evidence.url }),
            element('p', 'fine-print', `Source: ${row.evidence.revision}. SHA-256: ${row.evidence.sha256}. Fields: ${row.locators.join(', ')}.`));
          if (row.basis === 'upstream-id') proof.append(element('p', 'fine-print', `Retrieved ${mappingData.retrievedAt}. The live API may change; this hash identifies the inspected payload, whose full body is not archived here.`));
          item.append(proof); entries.append(item);
        }
        details.append(entries); article.append(details);
      }
      const links = element('div', 'research-source-links');
      links.append(...card.links.map(link));
      article.append(links);
      if (card.search) article.append(element('p', 'fine-print', 'Optional search — not mapping evidence'), link(card.search));
      list.append(article);
    }
    root.replaceChildren(introduction, boundary, list);
  }

  return Object.freeze({ cardsFor, render });
});
