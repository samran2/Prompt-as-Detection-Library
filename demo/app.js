(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const catalog = globalThis.PAD_CATALOG;
  const core = globalThis.PAD;
  const PAGE_SIZE = 50;
  const UNSPECIFIED_PLATFORM = '__unspecified__';
  const recordIndex = new Map(catalog.map(record => [record.id, record]));
  const state = { domain: '', selected: null, visible: [], page: 0, drafts: new Map(), templates: new Map(), context: '', key: '' };
  const options = () => ({ mode: $('mode').value, target: $('target').value, context: state.context });
  const draftKey = () => `${state.selected.id}|${$('mode').value}|${$('target').value}`;
  const notify = message => { $('action-status').textContent = message; };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const parentCount = records => records.filter(record => record.kind !== 'subtechnique').length;
  const breakdown = records => `${parentCount(records)} techniques · ${records.length - parentCount(records)} sub-techniques`;
  function safeSourceUrl(value, mitreOnly = false) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        (!mitreOnly || url.hostname === 'attack.mitre.org') ? url.href : null;
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
  function selectRecord(record) {
    remember();
    state.selected = record;
    $('selected-detail').hidden = !record;
    $('no-selection').hidden = Boolean(record);
    if (!record) { state.key = ''; $('prompt').value = ''; updateEditorStatus(); return; }
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
    renderSources(record);
    for (const button of $('techniques').querySelectorAll('button')) button.setAttribute('aria-current', String(button.dataset.id === record.id));
    loadPrompt();
  }
  function populateFilters() {
    const records = catalog.filter(r => !state.domain || r.domain === state.domain);
    $('domain-count').textContent = `${state.domain || 'All domains'}: ${records.length} records · ${breakdown(records)}`;
    for (const [id, field, title] of [['tactic', 'tactics', 'All tactics'], ['platform', 'platforms', 'All platforms']]) {
      const choices = [...new Set(records.flatMap(r => field === 'platforms' ? (r.platforms.length ? r.platforms.map(value => value === 'None' ? UNSPECIFIED_PLATFORM : value) : [UNSPECIFIED_PLATFORM]) : r[field]))].sort();
      const makeOption = (value, text) => { const option = element('option', '', text); option.value = value; return option; };
      $(id).replaceChildren(makeOption('', title), ...choices.map(v => makeOption(v, v === UNSPECIFIED_PLATFORM ? 'Not specified' : v)));
    }
  }
  function filter() {
    state.visible = core.filterTechniques(catalog, { domain: state.domain, query: $('search').value, tactic: $('tactic').value, platform: $('platform').value });
    state.page = 0;
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
      button.append(text, arrow); button.addEventListener('click', () => selectRecord(record)); li.append(button); return li;
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
  $('target').value = 'Panther Python';
  $('library-count').textContent = `${catalog.length} active records`;
  $('coverage-summary').textContent = `${breakdown(catalog)} · ${['Enterprise', 'Mobile', 'ICS'].map(domain => `${domain} ${catalog.filter(record => record.domain === domain).length}`).join(' · ')}`;
  document.querySelectorAll('[data-domain]').forEach(button => button.addEventListener('click', () => {
    state.domain = button.dataset.domain;
    document.querySelectorAll('[data-domain]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    populateFilters(); filter();
  }));
  for (const id of ['search', 'tactic', 'platform']) $(id).addEventListener(id === 'search' ? 'input' : 'change', filter);
  $('clear-filters').addEventListener('click', () => {
    state.domain = ''; $('search').value = '';
    document.querySelectorAll('[data-domain]').forEach(button => button.setAttribute('aria-pressed', String(!button.dataset.domain)));
    populateFilters(); filter(); $('search').focus();
  });
  for (const [id, page] of [['page-first', () => 0], ['page-previous', () => state.page - 1], ['page-next', () => state.page + 1], ['page-last', () => Math.ceil(state.visible.length / PAGE_SIZE) - 1]]) {
    $(id).addEventListener('click', () => { state.page = page(); renderPage(); });
  }
  for (const id of ['mode', 'target']) $(id).addEventListener('change', () => { remember(); if (state.selected) loadPrompt(); });
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
  $('export-library').addEventListener('click', () => {
    download(core.exportJSONL(state.visible, options()), `${state.domain.toLowerCase() || 'all-domains'}-drafts.jsonl`, 'application/x-ndjson;charset=utf-8'); notify(`${state.visible.length} generated draft templates exported across all matching pages; editor changes are not included.`);
  });
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function activateTab(tab, focus = false) {
    tabs.forEach(button => { const selected = button === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; $(button.getAttribute('aria-controls')).hidden = !selected; });
    if (focus) tab.focus();
  }
  $('show-source').addEventListener('click', () => activateTab($('tab-source'), true));
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
  populateFilters(); filter();
})();
