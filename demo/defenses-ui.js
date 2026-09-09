(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PAD_DEFENSES_UI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create({ document, library, download }) {
    const $ = id => document.getElementById(id);
    let selected = null;
    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    function sourceLink(label, value) {
      let href = null;
      try {
        const url = new URL(value);
        if (url.protocol === 'https:' && url.hostname === 'd3fend.mitre.org' &&
            !url.username && !url.password && !url.port) href = url.href;
      } catch { /* Untrusted URLs remain noninteractive text. */ }
      const link = element(href ? 'a' : 'span', 'source-link', label);
      if (href) { link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      return link;
    }
    function unavailable() {
      selected = null;
      $('defenses-summary').textContent = 'D3FEND context unavailable';
      $('defenses-version').textContent = '';
      $('defenses-results').replaceChildren(element('p', '', 'The supplemental D3FEND assets could not be opened. Reload this page or use a complete local download. The detection prompt library remains available.'));
      $('defenses-provenance').replaceChildren();
      $('download-defense-brief').disabled = $('export-defenses').disabled = true;
    }
    function relationship(path, context, technique) {
      const item = element('li', 'defense-path');
      item.append(element('p', 'defense-path-label', `Source query: ${path.queryLabel} · Top defensive technique: ${path.topLabel}`));
      const triples = element('ul', 'defense-triples');
      triples.append(
        element('li', '', `${technique.id} → ${path.defenseRelation} → ${path.defenseArtifact} (${path.defenseArtifactLabel})`),
        element('li', '', `${context.techniqueId} → ${path.offenseRelation} → ${path.offenseArtifact} (${path.offenseArtifactLabel})`),
      );
      item.append(triples, element('p', 'fine-print', `Source data rows: ${path.sourceRows.join(', ')}`));
      return item;
    }
    function countermeasure(technique, context) {
      const card = element('article', 'defense-card');
      const heading = element('div', 'defense-card-heading');
      heading.append(element('span', 'defense-id', technique.id), element('h4', '', technique.name));
      card.append(heading, element('p', 'source-text', technique.definition || 'No definition supplied in this snapshot.'));
      card.append(element('p', 'defense-tactics', `D3FEND tactics: ${technique.tactics.join(' · ') || 'Not specified in source'}`));
      card.append(sourceLink('Read countermeasure on MITRE D3FEND ↗', technique.url));
      const details = element('details', 'defense-paths');
      details.append(element('summary', '', `Inspect ${technique.paths.length} inferred artifact relationship${technique.paths.length === 1 ? '' : 's'}`));
      details.append(element('p', 'fine-print', 'Each pair below preserves the defensive and offensive artifact relationships from the pinned mapping. It is not an effectiveness ranking.'));
      const paths = element('ol');
      paths.append(...technique.paths.map(path => relationship(path, context, technique)));
      details.append(paths); card.append(details);
      return card;
    }
    function render(record) {
      $('defenses-action-status').textContent = '';
      try {
        if (!record || !library || !['lookup', 'composeBrief', 'exportJSON'].every(key => typeof library[key] === 'function')) {
          unavailable(); return;
        }
        const context = library.lookup(record.id);
        if (context.schemaVersion !== 'pad-d3fend-context-1' || context.techniqueId !== record.id ||
            context.mappingKind !== 'inferred' || !['mapped', 'unmapped'].includes(context.status) ||
            !Array.isArray(context.techniques) || (context.status === 'mapped') !== Boolean(context.techniques.length)) {
          unavailable(); return;
        }
        const cards = context.techniques.map(technique => countermeasure(technique, context));
        $('defenses-results').replaceChildren(...(cards.length ? cards : [element('div', 'defenses-empty',
          `No exact relationship for ${record.id} is present in this pinned D3FEND snapshot. This does not mean that no defense exists. Parent mappings and cross-framework matches are not inherited.`)]));
        $('defenses-summary').textContent = cards.length ? `${cards.length} related countermeasure${cards.length === 1 ? '' : 's'}` : 'No exact mapping in this snapshot';
        $('defenses-version').textContent = `D3FEND ${context.d3fendVersion} · inferred`;
        $('defenses-provenance').replaceChildren(sourceLink('Official source ↗', context.sourceUrl), sourceLink('D3FEND source terms ↗', context.licenseUrl));
        $('download-defense-brief').disabled = $('export-defenses').disabled = false;
        selected = record;
      } catch { unavailable(); }
    }
    function exportSelected(format) {
      if (!selected) return;
      try {
        const json = format === 'json';
        const text = json ? library.exportJSON(selected) : library.composeBrief(selected);
        download(text, `${selected.id}-d3fend-${json ? 'context.json' : 'brief-draft.txt'}`, json ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8');
        $('defenses-action-status').textContent = 'D3FEND download requested. Analyst context and prompt edits are not included.';
      } catch {
        $('defenses-action-status').textContent = 'The D3FEND export could not be prepared. Reload this page and try again.';
      }
    }
    $('download-defense-brief').addEventListener('click', () => exportSelected('text'));
    $('export-defenses').addEventListener('click', () => exportSelected('json'));
    return { render };
  }
  return Object.freeze({ create });
});
