(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./workspace.js'), require('./workspace-store.js'));
  else root.PAD_WORKSPACE_UI = factory(root.PAD_WORKSPACE, root.PAD_WORKSPACE_STORE);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (contract, persistence) {
  'use strict';
  const LIMIT = 5 * 1024 * 1024;
  const MAX_WORKSPACES = 50;
  const FLAG = 'pad-workspaces-enabled';
  const MEMORY = 'Memory only — export a file before leaving.';
  const CONFLICT = 'Autosave stopped: another tab changed or cleared storage. Your work remains in memory. Export a file or copy as a new workspace.';
  const UNAVAILABLE = 'Autosave unavailable. Your work remains in memory; export a file.';
  const CONSENT = 'Enable unencrypted local autosave? Drafts, context and research notes will be stored in this browser on this device. Other people using this browser profile may be able to read them. Nothing is uploaded. Avoid secrets on shared devices.';

  function create({ document, catalog, core, sources, capture, restore, navigate }) {
    if (!contract || !persistence || !document || typeof capture !== 'function' || typeof restore !== 'function') throw new Error('Workspace dependencies are unavailable');
    const window = document.defaultView || globalThis;
    const $ = id => { const node = document.getElementById(id); if (!node) throw new Error('Workspace interface is incomplete'); return node; };
    const workspaces = new Map();
    const known = new Map(catalog.map(record => [record.id, record]));
    let currentId, selected = null, collectionId = '', timer = null, queue = Promise.resolve();
    let importGeneration = 0, preview = null, storageGeneration = 0, enabled = false, store = null;

    function entry(value, revision = 0, inspection = { warnings: [], unresolved: [] }) {
      return { value, revision, inspection, changes: 0, captured: -1, saved: revision ? 0 : -1, exported: -1, modified: false, conflicted: false };
    }
    const initial = contract.create('My research workspace', sources);
    currentId = initial.id; workspaces.set(currentId, entry(initial));
    const current = () => workspaces.get(currentId);
    const status = message => { $('workspace-storage-status').textContent = message; };
    function element(tag, text) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
    function button(text, action) { const node = element('button', text); node.type = 'button'; node.addEventListener('click', action); return node; }
    function enqueue(action) {
      const task = queue.then(action);
      queue = task.catch(() => { status('Workspace operation could not complete. Your work remains in memory; export a file.'); });
      return queue;
    }
    function cancelPreview() {
      importGeneration++; preview = null; $('workspace-preview').hidden = true;
      $('workspace-preview-text').textContent = ''; $('workspace-file').value = '';
    }
    function renderNames() {
      $('workspace-select').replaceChildren(...[...workspaces.values()].map(item => {
        const option = element('option', item.value.name); option.value = item.value.id; return option;
      }));
      $('workspace-select').value = currentId;
      $('workspace-name').value = current().value.name;
    }
    function renderWarnings() {
      const warnings = current().inspection.warnings || [];
      $('workspace-warnings').replaceChildren(...warnings.map(warning => element('p', warningText(warning))));
    }
    function warningText(warning) { return [warning.techniqueId || warning.source, warning.message].filter(Boolean).join(' — '); }
    function renderLists() {
      const value = current().value;
      const favorite = selected && value.favorites.includes(selected.id);
      $('favorite-toggle').disabled = !selected || !known.has(selected.id);
      $('favorite-toggle').textContent = favorite ? 'Remove favorite' : 'Add favorite';
      $('favorite-toggle').setAttribute('aria-pressed', String(Boolean(favorite)));
      function listRows(ids, remove) {
        return ids.map(id => {
          const row = element('li');
          const record = known.get(id);
          const open = button(record ? id + ' — ' + record.name : id + ' — unresolved', () => {
            if (known.has(id) && typeof navigate === 'function') { $('workspace-dialog').close(); navigate(id); }
          });
          open.disabled = !record;
          const discard = button('Remove', () => remove(id));
          discard.setAttribute('aria-label', 'Remove ' + id);
          row.append(open, discard); return row;
        });
      }
      $('favorites-list').replaceChildren(...listRows(value.favorites, id => mutate(next => { next.favorites = next.favorites.filter(item => item !== id); })));
      if (!value.favorites.length) $('favorites-list').append(element('li', 'No favorites yet.'));
      if (!value.collections.some(item => item.id === collectionId)) collectionId = value.collections[0]?.id || '';
      $('collection-select').replaceChildren(...value.collections.map(item => { const option = element('option', item.name); option.value = item.id; return option; }));
      $('collection-select').value = collectionId;
      const collection = value.collections.find(item => item.id === collectionId);
      $('collection-add').disabled = !collection || !selected || !known.has(selected.id);
      $('collection-items').replaceChildren(...listRows(collection?.techniqueIds || [], id => mutate(next => {
        const target = next.collections.find(item => item.id === collectionId);
        if (target) target.techniqueIds = target.techniqueIds.filter(item => item !== id);
      })));
      if (!collection?.techniqueIds.length) $('collection-items').append(element('li', collection ? 'No techniques in this collection.' : 'Create a collection to organize techniques.'));
    }
    function changed() {
      const item = current(); item.changes++; item.modified = true;
      status(enabled ? 'Unsaved changes — saving locally…' : item.conflicted ? CONFLICT : MEMORY);
      if (preview) { cancelPreview(); status('Workspace changed. Preview the import again before opening it.'); }
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => { timer = null; enqueue(() => flushCurrent()); }, 300);
    }
    function mutate(update) {
      try {
        const value = contract.validate(current().value); update(value);
        current().value = contract.validate(value); changed(); renderLists();
      } catch { status('Workspace limit or input rejected. Existing content was preserved.'); }
    }
    async function captureCurrent() {
      const id = currentId, item = current();
      for (let attempt = 0; attempt < 5; attempt++) {
        if (item.captured === item.changes) return item;
        const revision = item.changes;
        const snapshot = await capture();
        if (currentId !== id) throw new Error('Workspace changed during capture');
        if (revision !== item.changes) continue;
        const value = contract.validate({ ...item.value, ...snapshot, id, name: item.value.name, sources: item.value.sources,
          favorites: item.value.favorites, collections: item.value.collections });
        const inspection = await contract.inspect(value, catalog, core, sources);
        if (currentId !== id || revision !== item.changes) continue;
        item.value = value; item.inspection = inspection; item.captured = revision;
        renderWarnings(); return item;
      }
      throw new Error('Capture could not settle while edits continued');
    }
    async function save(item) {
      if (!enabled || !store || item.conflicted || item.saved === item.captured) return;
      const handle = store, generation = storageGeneration, revision = item.captured;
      try {
        const result = await handle.save(contract.validate(item.value), item.revision);
        if (generation !== storageGeneration || handle !== store) return;
        item.revision = result.revision; item.saved = revision;
        status(item.changes === revision ? 'Saved locally (unencrypted).' : 'New edits pending — keeping them in memory.');
      } catch (error) {
        if (generation !== storageGeneration) return;
        item.conflicted = error?.code === 'CONFLICT';
        disableStorage(item.conflicted ? CONFLICT : UNAVAILABLE);
      }
    }
    async function flushCurrent() {
      if (timer !== null) { window.clearTimeout(timer); timer = null; }
      for (let attempt = 0; attempt < 5; attempt++) {
        const item = await captureCurrent(); await save(item);
        if (item.changes === item.captured) return item;
      }
      throw new Error('Edits continued during saving; the current workspace was retained');
    }
    async function activate(item) {
      cancelPreview(); currentId = item.value.id; collectionId = '';
      renderNames(); renderLists(); renderWarnings();
      await restore(contract.validate(item.value));
    }
    async function copyWorkspace(value, inspection) {
      if (workspaces.size >= MAX_WORKSPACES) throw new Error('Workspace limit reached');
      const copy = contract.validate({ ...value, id: contract.create(value.name, sources).id });
      const item = entry(copy, 0, inspection); item.modified = true; item.captured = 0;
      workspaces.set(copy.id, item); await activate(item); await save(item);
      return item;
    }
    function exportFile(value) {
      const text = contract.serialize(value);
      const blob = new window.Blob([text], { type: 'application/json;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = element('a'); link.href = url; link.download = 'research.pad-workspace.json';
      document.body.append(link);
      try { link.click(); } finally { link.remove(); window.setTimeout(() => window.URL.revokeObjectURL(url), 1000); }
    }
    async function previewFile() {
      const file = $('workspace-file').files?.[0];
      cancelPreview(); if (!file) return;
      const generation = importGeneration, id = currentId, revision = current().changes;
      const stale = () => generation !== importGeneration || id !== currentId || revision !== current().changes;
      try {
        if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > LIMIT) throw new Error('File size');
        const bytes = await file.arrayBuffer(); if (stale()) return;
        if (bytes.byteLength !== file.size || bytes.byteLength > LIMIT) throw new Error('File size');
        const value = contract.parse(new window.TextDecoder('utf-8', { fatal: true }).decode(bytes));
        const inspection = await contract.inspect(value, catalog, core, sources); if (stale()) return;
        preview = { value, inspection, generation, id, revision };
        $('workspace-preview-text').textContent = value.name + '\n' + value.drafts.length + ' drafts; ' +
          value.favorites.length + ' favorites; ' + value.collections.length + ' collections; ' + value.flow.steps.length +
          ' flow steps.\nOpening creates a new workspace; existing work is preserved.\n' +
          inspection.warnings.map(warningText).join('\n');
        $('workspace-preview').hidden = false; $('workspace-import-confirm').focus();
      } catch { if (!stale()) { cancelPreview(); status('Import rejected. Use a valid workspace JSON file up to 5 MiB with intact template hashes. Existing work was preserved.'); } }
    }

    function disableStorage(message = MEMORY) {
      enabled = false; storageGeneration++; $('workspace-autosave').checked = false;
      try { window.localStorage.removeItem(FLAG); } catch { /* Only the consent flag is stored here. */ }
      if (store) store.close(); store = null; status(message);
    }

    async function enableStorage(resume = false) {
      if (current().conflicted) { $('workspace-autosave').checked = false; status(CONFLICT); return; }
      const generation = ++storageGeneration;
      let opened;
      try {
        opened = await persistence.open();
        if (generation !== storageGeneration) { opened.close(); return; }
        store = opened;
        const saved = await opened.list();
        if (generation !== storageGeneration) return;
        if (!Array.isArray(saved) || saved.length > MAX_WORKSPACES) throw new Error('Workspace count');
        for (const record of saved) {
          const value = contract.validate(record.value);
          if (record.id !== value.id || !Number.isSafeInteger(record.revision) || record.revision < 1) throw new Error('Stored wrapper');
          const inspection = await contract.inspect(value, catalog, core, sources);
          if (generation !== storageGeneration) return;
          if (!workspaces.has(value.id)) {
            if (workspaces.size >= MAX_WORKSPACES) throw new Error('Workspace count');
            workspaces.set(value.id, entry(value, record.revision, inspection));
          }
        }
        enabled = true; $('workspace-autosave').checked = true;
        try { window.localStorage.setItem(FLAG, 'yes'); } catch { /* Consent applies to this session even if the preference cannot be remembered. */ }
        renderNames();
        status('Local autosave enabled. Choose a saved workspace to resume.');
        if (!resume || current().modified) await flushCurrent();
      } catch {
        if (generation === storageGeneration) disableStorage(UNAVAILABLE);
        else if (opened) opened.close();
      }
    }

    async function clearStorage(handle) {
      let opened = handle;
      try {
        // The explicit deletion confirmation authorizes this clear-only open.
        if (!opened) opened = await persistence.open();
        await opened.clear();
        for (const item of workspaces.values()) {
          item.revision = 0; item.saved = -1; item.conflicted = false; item.modified = true;
        }
        status('Local workspace data deleted. Current work remains in memory; export it before leaving.');
      } catch { status('Local deletion could not complete. Autosave is off; memory content was preserved.'); }
      finally { if (opened) opened.close(); }
    }

    $('workspace-open').addEventListener('click', () => { renderNames(); renderLists(); renderWarnings(); $('workspace-dialog').showModal(); $('workspace-close').focus(); });
    $('workspace-close').addEventListener('click', () => { $('workspace-dialog').close(); $('workspace-open').focus(); });
    $('workspace-dialog').addEventListener('cancel', () => { $('workspace-open').focus(); });
    $('workspace-name').addEventListener('input', () => {
      const value = $('workspace-name').value;
      mutate(next => { next.name = value; });
      const option = [...$('workspace-select').children].find(item => item.value === currentId);
      if (option) option.textContent = current().value.name;
    });
    $('workspace-select').addEventListener('change', () => {
      const id = $('workspace-select').value;
      return enqueue(async () => { if (!workspaces.has(id) || id === currentId) return; await flushCurrent(); await activate(workspaces.get(id)); });
    });
    $('workspace-new').addEventListener('click', () => enqueue(async () => {
      const item = await flushCurrent();
      await copyWorkspace({ ...item.value, name: (item.value.name.slice(0, 115) + ' copy') }, item.inspection);
    }));
    $('workspace-export').addEventListener('click', () => enqueue(async () => {
      const item = await flushCurrent(); const revision = item.captured;
      exportFile(item.value); item.exported = Math.max(item.exported, revision);
      if (!enabled) status('Workspace file exported. New edits remain local until saved or exported again.');
    }));
    $('workspace-file').addEventListener('change', previewFile);
    $('workspace-import-cancel').addEventListener('click', () => { cancelPreview(); $('workspace-file').focus(); });
    $('workspace-import-confirm').addEventListener('click', () => enqueue(async () => {
      const accepted = preview;
      if (!accepted || accepted.id !== currentId || accepted.revision !== current().changes) return;
      await flushCurrent();
      if (preview !== accepted || accepted.generation !== importGeneration || accepted.revision !== current().changes) return;
      await copyWorkspace(accepted.value, accepted.inspection);
    }));
    $('favorite-toggle').addEventListener('click', () => {
      if (!selected || !known.has(selected.id)) return;
      mutate(value => { value.favorites = value.favorites.includes(selected.id) ? value.favorites.filter(id => id !== selected.id) : [...value.favorites, selected.id]; });
    });
    $('collection-create').addEventListener('click', () => {
      const name = $('collection-name').value;
      mutate(value => { const id = contract.create(name, sources).id; value.collections.push({ id, name, techniqueIds: [] }); collectionId = id; });
      $('collection-name').value = '';
    });
    $('collection-select').addEventListener('change', () => { collectionId = $('collection-select').value; renderLists(); });
    $('collection-add').addEventListener('click', () => {
      if (!selected || !known.has(selected.id)) return;
      mutate(value => { const collection = value.collections.find(item => item.id === collectionId); if (collection && !collection.techniqueIds.includes(selected.id)) collection.techniqueIds.push(selected.id); });
    });
    $('workspace-autosave').addEventListener('change', () => {
      if (!$('workspace-autosave').checked) { disableStorage(); return; }
      if (enabled) return;
      if (!window.confirm(CONSENT)) { $('workspace-autosave').checked = false; return; }
      const generation = ++storageGeneration;
      return enqueue(() => {
        if (generation === storageGeneration && $('workspace-autosave').checked) return enableStorage();
      });
    });
    $('workspace-delete-local').addEventListener('click', () => {
      if (!window.confirm('Delete all saved local workspaces in this browser? This cannot be undone. Work currently open in memory will remain available for file export.')) return;
      const handle = store; store = null; enabled = false; storageGeneration++;
      $('workspace-autosave').checked = false;
      try { window.localStorage.removeItem(FLAG); } catch { /* No content is stored in localStorage. */ }
      return enqueue(() => clearStorage(handle));
    });
    window.addEventListener('storage', event => {
      if (event.key === FLAG && event.newValue !== 'yes') disableStorage('Local autosave was disabled in another tab. Your current work remains in memory.');
    });
    window.addEventListener('beforeunload', event => {
      if ([...workspaces.values()].some(item => item.modified && Math.max(item.saved, item.exported) !== item.changes)) {
        event.preventDefault(); event.returnValue = '';
      }
    });
    renderNames(); renderLists(); cancelPreview(); status(MEMORY);
    const ready = enqueue(async () => {
      await captureCurrent();
      let resume = false;
      try { resume = window.localStorage.getItem(FLAG) === 'yes'; } catch { /* Memory-only when the consent preference is unavailable. */ }
      if (resume) await enableStorage(true);
    });
    return Object.freeze({ changed, selectionChanged(record) { selected = record || null; renderLists(); }, ready });
  }
  return Object.freeze({ create });
}));
