/* Presentation only: no analyst data is stored here or put in URLs. */
((root) => {
  'use strict';
  function create({ document, catalog, navigate, onChange, actions }) {
    const $ = id => document.getElementById(id);
    const win = document.defaultView;
    let mobileView = 'list';
    let listScroll = 0;
    const dialogOpeners = new Map();
    function open(id) {
      dialogOpeners.set(id, document.activeElement);
      $(id).showModal();
    }
    for (const [id, close] of [['comparison-dialog','comparison-close'],['command-dialog','command-close']]) {
      $(close).addEventListener('click', () => $(id).close());
      $(id).addEventListener('close', () => dialogOpeners.get(id)?.focus());
    }
    $('comparison-dialog').append($('panel-compare'));
    $('panel-source').append($('panel-map'));
    const review = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Review checklist and limitations';
    review.append(summary, $('panel-review')); $('panel-source').append(review);
    $('compare-open').addEventListener('click', () => open('comparison-dialog'));
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
    const commands = [
      ['Open workspaces', () => $('workspace-open').click()],
      ['Compare techniques', () => open('comparison-dialog')],
      ['Browse techniques', toList],
      ['Open prompt', () => actions.tab('prompt')],
      ['Explore evidence', () => actions.tab('evidence')],
      ['Explore defenses', () => actions.tab('defenses')],
      ['Build Attack Flow', () => actions.tab('flow')],
    ];
    function renderCommands() {
      const q = $('command-search').value.trim().toLowerCase();
      const results = [...commands.filter(([name]) => name.toLowerCase().includes(q)),
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
    function command() { $('command-search').value = ''; renderCommands(); open('command-dialog'); $('command-search').focus(); }
    $('command-open').addEventListener('click', command);
    $('command-search').addEventListener('input', renderCommands);
    $('command-search').addEventListener('keydown', event => {
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
    return {
      openCompare: () => open('comparison-dialog'),
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
