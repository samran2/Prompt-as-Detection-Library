(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PAD_RESEARCH_SOURCES = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Link directory only: no mirrored entries, commands, rules or samples.
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
      return {
        name: source.name, platform: source.platform, description: source.description,
        repository: source.repository,
        links: source.links.map(([label, url]) => ({ label: `${source.name} ${label}`, url })),
        search,
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
    const introduction = element('p', 'fine-print', 'External research, not validated detections. Links open a third-party site in a new tab only when selected. Nothing is imported or executed.');
    const boundary = element('p', 'fine-print', cards[0].search
      ? 'ID searches are not verified mappings. Results may be empty, require GitHub sign-in or refer to a different platform. Confirm relevance in the original source.'
      : 'General sources only. No ATLAS mappings are provided or inferred. Select an ATT&CK technique in Evidence for an ID search, not a verified mapping.');
    const list = element('div', 'research-source-grid');
    for (const card of cards) {
      const article = element('article', 'research-source-card');
      article.append(element(`h${headingLevel}`, '', card.name), element('p', 'research-source-platform', card.platform), element('p', '', card.description));
      const links = element('div', 'research-source-links');
      links.append(...card.links.map(link));
      article.append(links);
      if (card.search) article.append(link(card.search));
      list.append(article);
    }
    root.replaceChildren(introduction, boundary, list);
  }

  return Object.freeze({ cardsFor, render });
});
