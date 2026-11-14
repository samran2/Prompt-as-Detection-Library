/* Presentation only: no analyst data is stored here or put in URLs. */
((root) => {
  'use strict';

  function create({ document, catalog, navigate, onChange, actions, preferences }) {
    const $ = id => document.getElementById(id);
    const win = document.defaultView;
    let mobileView = 'list';
    let listScroll = 0;
    let storage;
    try { storage = win.localStorage; } catch { /* Origin storage may be unavailable. */ }
    const loaded = preferences.load(storage);
    let modules = { ...loaded.preferences };
    const dialogOpeners = new Map();

    function open(id, returnTo = document.activeElement, focusId = '') {
      dialogOpeners.set(id, returnTo);
      if (!$(id).open) $(id).showModal();
      if (focusId) $(focusId).focus();
    }
    function restoreDialogFocus(id, fallback) {
      if (!dialogOpeners.has(id)) return;
      const opener = dialogOpeners.get(id);
      dialogOpeners.delete(id);
      const target = opener && opener.isConnected !== false && !opener.hidden ? opener : fallback;
      target?.focus();
    }
    for (const [id, close, fallback] of [
      ['comparison-dialog', 'comparison-close', $('compare-open')],
      ['command-dialog', 'command-close', $('command-open')],
      ['settings-dialog', 'settings-close', $('settings-open')],
      ['guide-dialog', 'guide-close', $('guide-open')],
    ]) {
      $(close).addEventListener('click', () => $(id).close());
      $(id).addEventListener('close', () => restoreDialogFocus(id, fallback));
    }
    $('settings-done').addEventListener('click', () => $('settings-dialog').close());

    $('comparison-dialog').append($('panel-compare'));
    $('panel-source').append($('panel-map'));
    const review = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Review checklist and limitations';
    review.append(summary, $('panel-review')); $('panel-source').append(review);

    function openSettings(returnTo = document.activeElement) { open('settings-dialog', returnTo, 'settings-title'); }
    function openGuide(returnTo = document.activeElement) { open('guide-dialog', returnTo, 'guide-title'); }
    $('settings-open').addEventListener('click', () => openSettings($('settings-open')));
    $('guide-open').addEventListener('click', () => openGuide($('guide-open')));
    $('compare-open').addEventListener('click', () => { if (modules.compare) open('comparison-dialog'); });

    function mobile(view, focus = false) {
      mobileView = view; $('desk').dataset.mobileView = view;
      if (view === 'list') {
        $('techniques').scrollTop = listScroll;
        if (focus) ($('techniques').querySelector('[aria-current="true"]') || $('search')).focus();
      } else if (focus) $('technique-title').focus();
    }
    const toList = () => { mobile('list', true); onChange(); };
    $('mobile-back').addEventListener('click', toList);
    $('mobile-open').addEventListener('click', toList);

    function width(value) {
      const bounded = Math.max(240, Math.min(480, Math.round(Number(value) || 330)));
      $('pane-resize').value = String(bounded);
      $('desk').style.setProperty('--list-width', `${bounded}px`);
    }
    $('pane-resize').addEventListener('input', () => { width($('pane-resize').value); onChange(); });
    $('pane-reset').addEventListener('click', () => { width(330); onChange(); });

    const moduleControls = Object.freeze({
      compare: ['compare-open', 'compare-add', 'compare-help'],
      defenses: ['tab-defenses'],
      flow: ['tab-flow'],
      research: ['research-link'],
    });
    const moduleLabels = Object.freeze({ compare: 'Compare', defenses: 'Defenses', flow: 'Flow', research: 'Research tools' });
    let commands = [];

    function settingsMessage(changedKey, storageStatus) {
      const visible = preferences.KEYS.filter(key => modules[key]).length;
      const summary = `${visible} of ${preferences.KEYS.length} optional modules shown.`;
      const retention = storageStatus === 'unavailable' ? ' This choice may not be remembered after this page closes.' : '';
      if (changedKey) {
        if (visible === 0) return `${summary} Only the core workbench is shown. Optional-module data is still kept.${retention}`;
        return `${moduleLabels[changedKey]} ${modules[changedKey] ? 'shown' : 'hidden'}. ${summary} Existing work was kept.${retention}`;
      }
      if (storageStatus === 'invalid') return 'Saved display choices were invalid. All optional modules are shown.';
      if (storageStatus === 'unavailable') return 'Browser storage is unavailable. Changes apply to this page and may not be remembered.';
      if (storageStatus === 'stored') return `${visible} of ${preferences.KEYS.length} optional modules shown. Saved in this browser.`;
      return 'All optional modules are shown. Choices are saved in this browser when available.';
    }

    function renderCommands() {
      const q = $('command-search').value.trim().toLowerCase();
      const actionResults = commands
        .filter(command => (!command.module || modules[command.module]) && command.name.toLowerCase().includes(q))
        .map(command => [command.name, command.run]);
      const results = [...actionResults,
        ...catalog.filter(record => `${record.id} ${record.name}`.toLowerCase().includes(q)).slice(0, 20)
          .map(record => [`${record.id} · ${record.name}`, () => navigate(record.id)])].slice(0, 24);
      $('command-results').replaceChildren(...results.map(([name, run]) => {
        const item = document.createElement('li'); const button = document.createElement('button');
        button.textContent = name;
        button.addEventListener('click', () => { dialogOpeners.delete('command-dialog'); $('command-dialog').close(); run(); });
        item.append(button); return item;
      }));
      if (!results.length) {
        const item = document.createElement('li'); item.textContent = 'No matches. Try an ID or another name.';
        $('command-results').append(item);
      }
    }

    function applyModules(changedKey = '', storageStatus = loaded.status) {
      for (const key of preferences.KEYS) {
        $(`module-${key}`).checked = modules[key];
        for (const id of moduleControls[key]) $(id).hidden = !modules[key];
      }
      for (const key of ['defenses', 'flow']) {
        if (!modules[key] && $(`tab-${key}`).getAttribute('aria-selected') === 'true') {
          actions.tab('prompt', false);
          actions.announce(`${moduleLabels[key]} is hidden in Settings. Prompt opened instead.`);
        }
      }
      $('settings-status').textContent = settingsMessage(changedKey, storageStatus);
      renderCommands();
    }

    function setModule(key, shown) {
      const latest = preferences.load(storage);
      const base = latest.status === 'stored' ? latest.preferences : modules;
      modules = { ...base, [key]: shown };
      const saved = preferences.save(storage, modules);
      modules = saved.preferences;
      applyModules(key, saved.status);
    }
    for (const key of preferences.KEYS) {
      $(`module-${key}`).addEventListener('change', () => setModule(key, Boolean($(`module-${key}`).checked)));
    }
    $('settings-show-all').addEventListener('click', () => {
      modules = { ...preferences.DEFAULTS };
      const saved = preferences.save(storage, modules);
      modules = saved.preferences;
      applyModules('', saved.status);
      $('settings-status').textContent = saved.status === 'unavailable'
        ? 'All optional modules are shown for this page. Browser storage could not remember the choice.'
        : 'All optional modules are shown. Drafts and settings outside module visibility were unchanged.';
    });

    function command() { $('command-search').value = ''; renderCommands(); open('command-dialog'); $('command-search').focus(); }
    commands = [
      { name: 'Open workspaces', run: () => $('workspace-open').click() },
      { name: 'Open settings', run: () => openSettings($('command-open')) },
      { name: 'Open user guide', run: () => openGuide($('command-open')) },
      { name: 'Compare techniques', module: 'compare', run: () => open('comparison-dialog', $('command-open')) },
      { name: 'Browse techniques', run: toList },
      { name: 'Open prompt', run: () => actions.tab('prompt') },
      { name: 'Explore evidence', run: () => actions.tab('evidence') },
      { name: 'Explore defenses', module: 'defenses', run: () => actions.tab('defenses') },
      { name: 'Build Attack Flow', module: 'flow', run: () => actions.tab('flow') },
      { name: 'Open research tools', module: 'research', run: () => $('research-link').click() },
    ];
    $('command-open').addEventListener('click', command);
    $('command-search').addEventListener('input', renderCommands);
    $('command-search').addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); $('command-dialog').close(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); $('command-results').querySelector('button')?.focus(); }
      if (event.key === 'Enter') { event.preventDefault(); $('command-results').querySelector('button')?.click(); }
    });
    document.addEventListener('keydown', event => {
      if (document.querySelector('dialog[open]')) return;
      const active = document.activeElement;
      if (['INPUT','TEXTAREA','SELECT'].includes(active?.tagName) || active?.isContentEditable) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault(); command();
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault(); mobile('list'); $('search').focus();
      }
    });

    width(330);
    applyModules();
    return {
      openCompare: () => { if (modules.compare) open('comparison-dialog'); },
      selected(userInitiated) {
        if (userInitiated && win.matchMedia('(max-width: 690px)').matches) {
          listScroll = $('techniques').scrollTop; mobile('detail', true); onChange();
        }
      },
      snapshot: () => ({ paneWidth: Number($('pane-resize').value), listScroll: mobileView === 'list' ? $('techniques').scrollTop : listScroll, mobileView }),
      restore(view) { width(view.paneWidth); listScroll = view.listScroll; mobile(view.mobileView); },
    };
  }
  root.PAD_WORKBENCH_UI = Object.freeze({ create });
})(globalThis);
