(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const attackCatalog = globalThis.PAD_CATALOG;
  const atlasCatalog = globalThis.PAD_ATLAS_CATALOG;
  const catalog = Array.isArray(attackCatalog) && Array.isArray(atlasCatalog)
    ? [...attackCatalog, ...atlasCatalog] : null;
  const core = globalThis.PAD;
  $('reload-app').addEventListener('click', () => window.location?.reload());
  const runtimeReady = Array.isArray(catalog) && catalog.length > 0 && core &&
    ['filterTechniques', 'composePrompt', 'exportJSONL', 'parseUiState', 'serializeUiState'].every(name => typeof core[name] === 'function');
  if (!runtimeReady) {
    $('app-status').className = 'status-screen error-state';
    $('app-status').setAttribute('role', 'alert');
    $('app-status-title').textContent = 'The local library could not be opened';
    $('app-status-detail').textContent = 'One or more published assets are missing or invalid. Reload the page; if the problem continues, use the repository issue template.';
    $('reload-app').hidden = false;
    $('workbench').setAttribute('aria-busy', 'false');
    return;
  }
  const PAGE_SIZE = 50;
  const UNSPECIFIED_PLATFORM = '__unspecified__';
  const recordIndex = new Map(catalog.map(record => [record.id, record]));
  const restored = core.parseUiState(window.location?.search || '');
  let savedTheme = 'system';
  try { savedTheme = window.localStorage?.getItem('pad-theme') || 'system'; } catch { /* Storage may be unavailable. */ }
  const initialTheme = restored.theme !== 'system' || !core.THEMES.includes(savedTheme) ? restored.theme : savedTheme;
  const state = {
    domain: restored.domain, domainSelection: restored.domainSelection || restored.domain,
    selected: recordIndex.get(restored.technique) || null,
    visible: [], page: 0, drafts: new Map(), templates: new Map(), context: '', key: '',
    compare: restored.compare.filter(id => recordIndex.has(id)), theme: initialTheme,
  };
  const options = () => ({ mode: $('mode').value, target: $('target').value, context: state.context });
  const draftKey = () => `${state.selected.id}|${$('mode').value}|${$('target').value}`;
  const notify = message => { $('action-status').textContent = message; };
  const resolveDomain = domain => core.normalizeDomain(domain);
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const parentCount = records => records.filter(record => record.kind !== 'subtechnique').length;
  const breakdown = records => `${parentCount(records)} techniques · ${records.length - parentCount(records)} sub-techniques`;
  const isAtlas = record => record.framework === 'ATLAS';
  const frameworkLabel = record => isAtlas(record) ? `MITRE ATLAS ${record.atlasVersion}` : `MITRE ATT&CK ${record.attackVersion || '19.2'}`;
  function syncUrl() {
    if (!window.location || !window.history?.replaceState) return;
    const search = core.serializeUiState({
      query: $('search').value, domain: state.domainSelection || state.domain, tactic: $('tactic').value,
      platform: $('platform').value, mode: $('mode').value, target: $('target').value,
      technique: state.selected?.id || '', compare: state.compare, theme: state.theme,
    });
    const next = `${window.location.pathname}${search}${window.location.hash || ''}`;
    window.history.replaceState(null, '', next);
  }
  function applyTheme(theme) {
    state.theme = core.THEMES.includes(theme) ? theme : 'system';
    $('theme').value = state.theme;
    if (document.documentElement) {
      if (state.theme === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', state.theme);
    }
    try { window.localStorage?.setItem('pad-theme', state.theme); } catch { /* Storage may be unavailable. */ }
    syncUrl();
  }
  function safeSourceUrl(value, mitreOnly = false) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        (!mitreOnly || ['attack.mitre.org', 'atlas.mitre.org'].includes(url.hostname)) ? url.href : null;
    } catch { return null; }
  }
  function sourceLink(text, url, mitreOnly = false) {
    const href = safeSourceUrl(url, mitreOnly);
    const link = element(href ? 'a' : 'span', 'source-link', text);
    if (href) { link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    return link;
  }
  function sourceList(title, values) {
    const section = element('div');
    section.append(element('p', 'source-label', title));
    const list = element('ul');
    list.append(...values.map(value => element('li', 'source-text', value)));
    section.append(list);
    return section;
  }
  function renderSources(record) {
    $('attack-source-context').hidden = isAtlas(record);
    $('atlas-source-context').hidden = !isAtlas(record);
    if (isAtlas(record)) {
      $('atlas-source-maturity').textContent = `Source maturity: ${record.sourceMaturity || 'Not specified'}. This describes the threat in MITRE ATLAS, not validation of this detection prompt.`;
      for (const [id, items, empty] of [
        ['atlas-case-studies', record.caseStudies || [], 'No case study is linked to this technique in the pinned source.'],
        ['atlas-mitigations', record.mitigations || [], 'No mitigation is linked to this technique in the pinned source.'],
      ]) {
        $(id).replaceChildren(...(items.length ? items.map(item => {
          const card = element('details', 'source-card');
          card.append(element('summary', '', `${item.id} · ${item.name}`));
          card.append(element('p', 'source-text', item.description || 'No description supplied.'));
          if (item.url) card.append(sourceLink('Read on MITRE ATLAS ↗', item.url, true));
          return card;
        }) : [element('p', '', empty)]));
      }
    }
    const strategies = record.strategies || [];
    $('strategies').replaceChildren(...(strategies.length ? strategies.map(strategy => {
      const card = element('details', 'source-card');
      card.append(element('summary', '', `${strategy.id} · ${strategy.name} (${strategy.analytics.length} analytics)`));
      card.append(sourceLink('Read detection strategy on MITRE ATT&CK ↗', strategy.url, true));
      for (const analytic of strategy.analytics) {
        const detail = element('details', 'source-card');
        detail.append(element('summary', '', `${analytic.id} · ${analytic.name}`));
        detail.append(element('p', 'source-text', analytic.description || 'No analytic description supplied in this source.'));
        detail.append(element('p', '', `Platforms: ${analytic.platforms.length ? analytic.platforms.join(', ') : 'Platform not specified'}`));
        const logs = analytic.logSources.map(log => [log.name, log.channel, log.dataComponent].filter(Boolean).join(' · '));
        detail.append(sourceList('Source log references', logs.length ? logs : ['No log sources linked in this snapshot.']));
        const tuning = analytic.mutableElements.map(value => typeof value === 'string' ? value : [value.field, value.description].filter(Boolean).join(': '));
        detail.append(sourceList('Source tuning variables', tuning.length ? tuning : ['No tuning variables supplied in this snapshot.']));
        card.append(detail);
      }
      if (!strategy.analytics.length) card.append(element('p', '', 'No active analytics linked to this strategy in this snapshot.'));
      return card;
    }) : [element('p', '', 'No active detection strategies or analytics linked to this technique in the pinned snapshot.')]));
    const examples = record.procedureExamples || [];
    const count = record.procedureCount || 0;
    $('procedure-count').textContent = count ? `${count.toLocaleString()} documented procedure relationships · ${examples.length} examples shown. The complete relationship set is included in the local library files.` : 'No documented procedure relationships in this snapshot.';
    $('procedure-examples').replaceChildren(...examples.map(example => {
      const card = element('details', 'source-card');
      card.append(element('summary', '', `${example.actorId} · ${example.actorName}`));
      card.append(element('p', 'source-text', example.description));
      const references = element('div', 'source-references');
      references.append(...example.references.map(reference => sourceLink(reference.source_name || reference.external_id || 'Source reference', reference.url)));
      card.append(references);
      return card;
    }));
  }
  function renderTrust(record) {
    const validation = core.validationState(record);
    const labels = {
      generated: 'Generated · not reviewed', reviewed: `${validation.human_reviews} human review${validation.human_reviews === 1 ? '' : 's'}`,
      'lab-validated': 'Lab validated · inspect evidence', 'field-confirmed': 'Field confirmed · inspect evidence',
    };
    $('validation-level').textContent = labels[validation.level];
    $('provenance-summary').textContent = `${frameworkLabel(record)} · source linked`;
  }
  function renderRelationshipMap(record) {
    const telemetry = record.telemetry || [];
    const strategies = record.strategies || [];
    const analyticCount = strategies.reduce((sum, strategy) => sum + (strategy.analytics || []).length, 0);
    const validation = core.validationState(record);
    const outlineTelemetry = telemetry.length ? `${telemetry.slice(0, 2).join(' · ')}${telemetry.length > 2 ? ` · +${telemetry.length - 2} more` : ''}` : 'No source-listed telemetry';
    const nodes = [
      ['Technique', `${record.id} · ${record.name}`],
      ['Source-listed telemetry', telemetry.length ? `${telemetry.length} suggestion${telemetry.length === 1 ? '' : 's'} to verify locally` : 'No source-listed telemetry'],
      isAtlas(record)
        ? ['ATLAS source relationships', `${(record.caseStudies || []).length} case studies · ${(record.mitigations || []).length} mitigations`]
        : ['ATT&CK detection references', strategies.length ? `${strategies.length} strategies · ${analyticCount} analytics` : 'No linked strategy or analytic'],
      ['Native rule readiness', validation.lab_validated ? `Evidence recorded for ${validation.validated_backends.join(', ') || 'an unspecified backend'}` : `${$('target').value} remains an unvalidated draft target`],
    ];
    $('relationship-visual').replaceChildren(...nodes.map(([label, value], index) => {
      const node = element('div', `relationship-node${index === nodes.length - 1 ? ' rule-readiness' : ''}`);
      node.append(element('span', '', label), element('strong', '', value)); return node;
    }));
    const outline = [...nodes]; outline[1] = ['Source-listed telemetry', outlineTelemetry];
    $('relationship-text').replaceChildren(...outline.map(([label, value]) => element('li', '', `${label}: ${value}`)));
  }
  function comparisonValue(record, key) {
    if (!record) return 'Not selected';
    const validation = core.validationState(record);
    const values = {
      identity: `${record.id} · ${record.name}`,
      framework: frameworkLabel(record),
      domain: record.domain,
      tactics: (record.tactics || []).join(', ') || 'Not specified in source',
      platforms: (record.platforms || []).filter(value => value !== 'None').join(', ') || 'Not specified in source',
      telemetry: (record.telemetry || []).join('; ') || 'No source-listed telemetry',
      strategies: isAtlas(record) ? `${(record.mitigations || []).length} ATLAS mitigations; no native rule validation` : `${(record.strategies || []).length} linked detection strategies`,
      procedures: isAtlas(record) ? `${(record.caseStudies || []).length} ATLAS case studies` : `${record.procedureCount || 0} documented procedure relationships`,
      validation: validation.level === 'generated' ? 'Generated; no human or lab validation recorded' : `${validation.level}; ${validation.human_reviews} human reviews`,
    };
    return values[key];
  }
  function renderComparison() {
    const records = state.compare.map(id => recordIndex.get(id)).filter(Boolean);
    $('compare-count').textContent = String(records.length);
    $('comparison-region').hidden = records.length === 0;
    const selectedIncluded = Boolean(state.selected && state.compare.includes(state.selected.id));
    $('compare-add').setAttribute('aria-pressed', String(selectedIncluded));
    $('compare-add').textContent = selectedIncluded ? 'Remove from comparison −' : 'Add to comparison ＋';
    $('compare-add').disabled = !state.selected || (!selectedIncluded && records.length >= 2);
    $('compare-add').setAttribute('aria-label', selectedIncluded ? `Remove ${state.selected?.id} from comparison` : `Add ${state.selected?.id || 'technique'} to comparison`);
    const emptyComparison = element('div', 'comparison-empty');
    emptyComparison.append(element('strong', '', 'Build a focused comparison'), element('p', '', 'Add a technique, then select one more from the library.'));
    $('compare-slots').replaceChildren(...(records.length ? records.map(record => {
      const chip = element('span', 'compare-chip');
      chip.append(element('span', '', `${record.id} · ${record.name}`));
      const remove = element('button', '', '×');
      remove.setAttribute('aria-label', `Remove ${record.id} from comparison`);
      remove.addEventListener('click', () => { state.compare = state.compare.filter(id => id !== record.id); renderComparison(); syncUrl(); });
      chip.append(remove); return chip;
    }) : [emptyComparison]));
    $('compare-heading-a').textContent = records[0] ? records[0].id : 'Slot one';
    $('compare-heading-b').textContent = records[1] ? records[1].id : 'Slot two';
    const rows = [
      ['Technique', 'identity'], ['Framework', 'framework'], ['Domain', 'domain'], ['Tactics', 'tactics'], ['Platforms', 'platforms'],
      ['Telemetry suggestions', 'telemetry'], ['Detection references', 'strategies'],
      ['Documented examples', 'procedures'], ['Validation evidence', 'validation'],
    ];
    $('comparison-body').replaceChildren(...rows.map(([label, key]) => {
      const first = comparisonValue(records[0], key); const second = comparisonValue(records[1], key);
      const row = element('tr'); const heading = element('th', '', label); heading.setAttribute('scope', 'row');
      if (records.length === 2 && first !== second) heading.append(element('span', 'comparison-delta', 'Different'));
      row.append(heading, element('td', '', first), element('td', '', second)); return row;
    }));
  }
  function remember() { if (state.key) state.drafts.set(state.key, $('prompt').value); }
  function updateEditorStatus() {
    $('character-count').textContent = `${$('prompt').value.length.toLocaleString()} characters`;
    $('draft-state').textContent = $('prompt').value === state.templates.get(state.key) ? 'Draft template' : 'Edited in this tab';
    $('copy').disabled = $('download').disabled = !$('prompt').value.trim();
  }
  function loadPrompt() {
    state.key = draftKey();
    if (!state.templates.has(state.key)) state.templates.set(state.key, core.composePrompt(state.selected, options()));
    $('prompt').value = state.drafts.get(state.key) ?? state.templates.get(state.key);
    updateEditorStatus();
    notify('');
  }
  function selectRecord(record, userInitiated = false) {
    remember();
    state.selected = record;
    $('selected-detail').hidden = !record;
    $('no-selection').hidden = Boolean(record);
    if (!record) { state.key = ''; $('prompt').value = ''; updateEditorStatus(); renderComparison(); syncUrl(); return; }
    $('technique-title').textContent = record.name;
    $('technique-id').textContent = record.id;
    $('breadcrumb').textContent = `${record.domain} / ${record.tactics.join(' · ')}`;
    const parent = recordIndex.get(record.parentId);
    const children = catalog.filter(item => item.parentId === record.id).length;
    $('technique-kind').textContent = record.kind === 'subtechnique' ? `Sub-technique of ${record.parentId}${parent ? ` · ${parent.name}` : ''}` : `Technique · ${children} active sub-techniques`;
    $('behavior').textContent = $('source-behavior').textContent = record.behavior;
    $('platform-tags').replaceChildren(...(record.platforms.length ? record.platforms : ['None']).map(p => element('span', '', p === 'None' ? 'Platform not specified' : p)));
    $('telemetry').replaceChildren(...(record.telemetry.length ? record.telemetry : ['No source-derived telemetry suggestions available. Confirm available logs and schema.']).map(t => element('li', '', t)));
    $('false-positives').textContent = record.falsePositives;
    const href = safeSourceUrl(record.sourceUrl, true);
    $('source-link').removeAttribute('href');
    $('source-link').setAttribute('aria-disabled', String(!href));
    if (href) $('source-link').href = href;
    $('source-link').textContent = `Read technique on ${isAtlas(record) ? 'MITRE ATLAS' : 'MITRE ATT&CK'} ↗`;
    renderSources(record);
    renderTrust(record);
    renderRelationshipMap(record);
    for (const button of $('techniques').querySelectorAll('button')) button.setAttribute('aria-current', String(button.dataset.id === record.id));
    loadPrompt();
    renderComparison();
    syncUrl();
    if (userInitiated && window.matchMedia?.('(max-width: 690px)')?.matches) {
      $('technique-title').focus();
      $('technique-title').scrollIntoView?.({ behavior: 'auto', block: 'start' });
    }
  }
  function populateFilters() {
    const selectedDomain = resolveDomain(state.domain);
    const records = catalog.filter(record => !selectedDomain || record.domain === selectedDomain);
    const label = state.domainSelection ? `Domain: ${state.domainSelection}` : 'All domains';
    $('domain-count').textContent = `${label}: ${records.length} records · ${breakdown(records)}`;
    for (const [id, field, title] of [['tactic', 'tactics', 'All tactics'], ['platform', 'platforms', 'All platforms']]) {
      const choices = [...new Set(records.flatMap(r => field === 'platforms' ? (r.platforms.length ? r.platforms.map(value => value === 'None' ? UNSPECIFIED_PLATFORM : value) : [UNSPECIFIED_PLATFORM]) : r[field]))].sort();
      const makeOption = (value, text) => { const option = element('option', '', text); option.value = value; return option; };
      $(id).replaceChildren(makeOption('', title), ...choices.map(v => makeOption(v, v === UNSPECIFIED_PLATFORM ? 'Not specified' : v)));
    }
  }
  function renderActiveFilters() {
    const domainLabel = state.domainSelection;
    const values = [
      $('search').value ? `Search: “${$('search').value}”` : '',
      domainLabel ? `Domain: ${domainLabel}` : '',
      $('tactic').value ? `Tactic: ${$('tactic').value}` : '',
      $('platform').value ? `Platform: ${$('platform').value === UNSPECIFIED_PLATFORM ? 'Not specified' : $('platform').value}` : '',
    ].filter(Boolean);
    $('active-filters').hidden = values.length === 0;
    $('active-filter-text').textContent = values.join(' · ');
  }
  function filter(revealSelection = false) {
    state.visible = core.filterTechniques(catalog, { domain: state.domain, query: $('search').value, tactic: $('tactic').value, platform: $('platform').value });
    renderActiveFilters();
    const selectedIndex = revealSelection && state.selected ? state.visible.findIndex(record => record.id === state.selected.id) : -1;
    state.page = selectedIndex >= 0 ? Math.floor(selectedIndex / PAGE_SIZE) : 0;
    renderPage();
  }
  function renderPage() {
    const pages = Math.ceil(state.visible.length / PAGE_SIZE);
    state.page = Math.max(0, Math.min(state.page, pages - 1));
    const start = state.page * PAGE_SIZE;
    const records = state.visible.slice(start, start + PAGE_SIZE);
    $('result-count').textContent = `${state.visible.length} matches`;
    $('page-status').textContent = `Page ${pages ? state.page + 1 : 0} of ${pages}`;
    $('page-range').textContent = records.length ? `${start + 1}–${start + records.length} of ${state.visible.length}` : '0 matching records';
    $('page-first').disabled = $('page-previous').disabled = !state.page;
    $('page-last').disabled = $('page-next').disabled = !pages || state.page === pages - 1;
    $('empty-results').hidden = Boolean(state.visible.length);
    $('export-library').disabled = !state.visible.length;
    $('techniques').replaceChildren(...records.map(record => {
      const li = element('li');
      const button = element('button'); button.dataset.id = record.id;
      const text = element('span'); text.append(element('span', 'record-id', record.id), element('span', 'record-name', record.name));
      text.append(element('span', 'record-meta', `${record.domain} · ${record.kind === 'subtechnique' ? `Sub-technique of ${record.parentId}` : 'Technique'}`));
      const arrow = element('span', 'row-arrow', '›'); arrow.setAttribute('aria-hidden', 'true');
      button.append(text, arrow); button.addEventListener('click', () => selectRecord(record, true)); li.append(button); return li;
    }));
    $('techniques').scrollTop = 0;
    selectRecord(records.find(r => r.id === state.selected?.id) || records[0] || null);
  }
  function regenerate(applyContext = false) {
    if (!state.selected) return;
    if ($('draft-state').textContent === 'Edited in this tab' && !window.confirm('Replace the edited prompt with a fresh template? Download it first if you want to keep it.')) return;
    if (applyContext) state.context = $('context').value;
    state.drafts.delete(draftKey()); state.templates.delete(draftKey()); loadPrompt(); notify('Template updated using the applied context. Other drafts are unchanged.');
  }
  function download(text, filename, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const anchor = element('a'); anchor.href = url; anchor.download = filename; anchor.hidden = true;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  for (const target of core.TARGETS) { const option = element('option', '', target); option.value = target; $('target').append(option); }
  $('mode').value = restored.mode;
  $('target').value = restored.target;
  $('search').value = restored.query;
  $('library-count').textContent = `${catalog.length} active records`;
  $('source-versions').textContent = `ATT&CK 19.2${atlasCatalog.length ? ` · ATLAS ${atlasCatalog[0].atlasVersion}` : ''}`;
  $('coverage-summary').textContent = `${breakdown(catalog)} · ${['Enterprise', 'Mobile', 'ICS'].map(domain => `${domain} ${catalog.filter(record => record.domain === domain).length}`).join(' · ')} (OT)${atlasCatalog.length ? ` · ATLAS AI ${atlasCatalog.length}` : ''}`;
  document.querySelectorAll('[data-domain]').forEach(button => button.addEventListener('click', () => {
    state.domain = resolveDomain(button.dataset.domain);
    state.domainSelection = button.dataset.domain;
    document.querySelectorAll('[data-domain]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    populateFilters(); filter();
  }));
  for (const id of ['search', 'tactic', 'platform']) $(id).addEventListener(id === 'search' ? 'input' : 'change', () => filter());
  const clearFilters = () => {
    state.domain = ''; state.domainSelection = '';
    $('search').value = '';
    document.querySelectorAll('[data-domain]').forEach(button => button.setAttribute('aria-pressed', String(!button.dataset.domain)));
    populateFilters(); filter(); $('search').focus();
  };
  $('clear-filters').addEventListener('click', clearFilters);
  $('clear-active-filters').addEventListener('click', clearFilters);
  for (const [id, page] of [['page-first', () => 0], ['page-previous', () => state.page - 1], ['page-next', () => state.page + 1], ['page-last', () => Math.ceil(state.visible.length / PAGE_SIZE) - 1]]) {
    $(id).addEventListener('click', () => { state.page = page(); renderPage(); });
  }
  for (const id of ['mode', 'target']) $(id).addEventListener('change', () => {
    remember();
    if (state.selected) { loadPrompt(); renderRelationshipMap(state.selected); }
    syncUrl();
  });
  $('theme').addEventListener('change', () => applyTheme($('theme').value));
  $('prompt').addEventListener('input', () => { remember(); updateEditorStatus(); });
  $('apply-context').addEventListener('click', () => regenerate(true));
  $('reset-prompt').addEventListener('click', () => regenerate());
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('prompt').value); notify('Prompt copied. Review it before use.'); }
    catch { $('prompt').focus(); $('prompt').select(); notify('Clipboard unavailable. Text selected — press ⌘C / Ctrl+C, or download the .txt file.'); }
  });
  $('download').addEventListener('click', () => {
    download($('prompt').value, `${state.selected.id}-${$('mode').value}-draft.txt`, 'text/plain;charset=utf-8'); notify('Text download requested. Your browser controls where it is saved.');
  });
  $('export-research').addEventListener('click', () => {
    if (!state.selected) return;
    download(core.exportResearchJSON([state.selected], options()), `${state.selected.id}-research-record.json`, 'application/json;charset=utf-8');
    notify('Research record exported with source relationships and explicit validation status. Editor changes are not included.');
  });
  $('share-view').addEventListener('click', async () => {
    syncUrl();
    try { await navigator.clipboard.writeText(window.location.href); notify('View link copied. It includes filters and selections, never analyst context or prompt edits.'); }
    catch { notify('Clipboard unavailable. Copy the current address from your browser.'); }
  });
  $('export-library').addEventListener('click', () => {
    download(core.exportJSONL(state.visible, options()), `${state.domain.toLowerCase() || 'all-domains'}-drafts.jsonl`, 'application/x-ndjson;charset=utf-8'); notify(`${state.visible.length} generated draft templates exported across all matching pages; editor changes are not included.`);
  });
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function activateTab(tab, focus = false) {
    tabs.forEach(button => { const selected = button === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; $(button.getAttribute('aria-controls')).hidden = !selected; });
    if (focus) tab.focus();
  }
  $('show-source').addEventListener('click', () => activateTab($('tab-source'), true));
  $('compare-add').addEventListener('click', () => {
    if (!state.selected) return;
    if (state.compare.includes(state.selected.id)) state.compare = state.compare.filter(id => id !== state.selected.id);
    else if (state.compare.length < 2) state.compare.push(state.selected.id);
    renderComparison(); syncUrl();
    if (state.compare.length === 2) activateTab($('tab-compare'), true);
    else notify(state.compare.length ? 'One technique saved. Select another technique to compare.' : 'Technique removed from comparison.');
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activateTab(tabs[next], true); }
    });
  });
  $('about-open').addEventListener('click', () => $('about-dialog').showModal());
  $('about-close').addEventListener('click', () => $('about-dialog').close());
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !$('about-dialog').open) { event.preventDefault(); $('search').focus(); }
  });
  document.querySelectorAll('[data-domain]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.domain === state.domainSelection)));
  populateFilters();
  const restoreSelect = (id, value) => {
    if ([...$(id).children].some(option => option.value === value)) $(id).value = value;
  };
  restoreSelect('tactic', restored.tactic);
  restoreSelect('platform', restored.platform);
  filter(true);
  applyTheme(initialTheme);
  $('app-status').hidden = true;
  $('app-content').hidden = false;
  $('workbench').setAttribute('aria-busy', 'false');
})();
