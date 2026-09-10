/* Shared local-only research views. Source text is data, never markup or code. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PAD_RESEARCH_UI = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ensure = (condition, message) => { if (!condition) throw new Error(message); };
  function make(document, tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function createCar({document, root, library}) {
    ensure(document?.createElement && root?.replaceChildren && typeof library?.lookup === 'function', 'CAR view is unavailable.');
    const element = (tag, text, className) => make(document, tag, text, className);
    return Object.freeze({show(record) {
      root.replaceChildren();
      if (!record) { root.append(element('p', 'Choose a technique to inspect its CAR research.')); return; }
      if (record.domain === 'ATLAS' || /^AML\./.test(record.id)) {
        root.append(element('p', 'ATLAS AI mappings are not supported by this pinned CAR supplement. No ATT&CK mappings are inherited.')); return;
      }
      const result = library.lookup(record.id);
      root.append(element('p', `${result.analytics.length} exact CAR mappings for ${record.id}. ${result.warning}`));
      for (const analytic of result.analytics) {
        const details = element('details'); details.append(element('summary', `${analytic.id} · ${analytic.title}`));
        details.append(element('h3', 'Hypothesis'), element('p', analytic.hypothesis));
        details.append(element('h3', 'Source telemetry'), element('p', analytic.telemetry.join('\n') || 'Not specified by source.'));
        for (const implementation of analytic.pseudocode) {
          details.append(element('h3', implementation.description || implementation.type || 'Source pseudocode'));
          details.append(element('pre', implementation.code, 'research-code'));
        }
        // Invalid source URLs do not become links or prevent literal source viewing.
        try {
          const url = new URL(analytic.sourceUrl);
          if (url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password && !url.port
            && /^\/mitre-attack\/car\/blob\/[a-f0-9]{40}\/analytics\/CAR-\d{4}-\d{2}-\d{3}\.yaml$/.test(url.pathname)
            && !url.search && !url.hash) {
            const link = element('a', 'Read pinned CAR source ↗');
            link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; details.append(link);
          }
        } catch { /* Render the source text without a malformed link. */ }
        details.append(element('p', `Source SHA-256: ${analytic.sourceSha256}`, 'fine-print'));
        root.append(details);
      }
      const notice = element('details');
      notice.append(element('summary', 'Source license and notice'), element('pre', `${result.sourceNotice}\n${result.sourceLicense}`, 'research-code'));
      root.append(notice);
    }});
  }

  function createFlow({document, list, empty, addButton, exportButton, clearButton, search, choice, status, title, catalog, onChange = () => {}, onExport = () => {}}) {
    ensure(document?.createElement && [list, empty, addButton, exportButton, clearButton, status, title].every(Boolean), 'Flow view is unavailable.');
    ensure(Array.isArray(catalog) && catalog.length <= 2000 && typeof onChange === 'function' && typeof onExport === 'function', 'Invalid flow catalog or callbacks.');
    ensure(!search || choice, 'Flow search requires a choice control.');
    const records = catalog.filter(record => /^T\d{4}(?:\.\d{3})?$/.test(record?.id) && ['Enterprise', 'Mobile', 'ICS'].includes(record.domain));
    const byId = new Map(records.map(record => [record.id, record]));
    ensure(byId.size === records.length, 'Duplicate flow technique IDs.');
    const element = (tag, text, className) => make(document, tag, text, className);
    let steps = [], selected = null, exporting = false;
    const snapshot = () => ({title: title.value, steps: [...steps]});
    const report = message => { status.textContent = message; };
    const changed = () => { render(); onChange(snapshot()); };
    function candidate() { return choice ? byId.get(choice.value) : selected; }
    function choices() {
      if (choice) {
        const previous = choice.value;
        const query = (search?.value || '').trim().toLowerCase().slice(0, 200);
        const matches = records.filter(record => `${record.id} ${record.name}`.toLowerCase().includes(query)).slice(0, 50);
        choice.replaceChildren(...matches.map(record => { const option = element('option', `${record.id} · ${record.name}`); option.value = record.id; return option; }));
        choice.value = matches.some(record => record.id === previous) ? previous : matches[0]?.id || '';
      }
      addButton.disabled = !candidate() || steps.length >= 20;
    }
    function render() {
      list.replaceChildren();
      steps.forEach((id, index) => {
        const record = byId.get(id), row = element('li', undefined, 'flow-step');
        row.append(element('strong', `${record.id} · ${record.name}`));
        const controls = element('div', undefined, 'step-controls');
        for (const [text, delta] of [['Move up', -1], ['Move down', 1], ['Remove', 0]]) {
          const button = element('button', text); button.type = 'button';
          button.setAttribute('aria-label', `${text}: step ${index + 1}, ${record.id}`);
          button.disabled = delta === -1 && index === 0 || delta === 1 && index === steps.length - 1;
          button.addEventListener('click', () => {
            if (button.disabled) return;
            if (delta === 0) steps.splice(index, 1);
            else [steps[index], steps[index + delta]] = [steps[index + delta], steps[index]];
            changed();
            const next = list.children[Math.max(0, Math.min(index + delta, steps.length - 1))];
            (next?.querySelector('button:not(:disabled)') || (addButton.disabled ? title : addButton)).focus();
          });
          controls.append(button);
        }
        row.append(controls); list.append(row);
      });
      empty.hidden = steps.length > 0;
      exportButton.disabled = exporting || steps.length < 2;
      clearButton.disabled = steps.length === 0;
      choices(); report(`${steps.length} of 20 hypothesis steps.`);
    }
    function add(record) {
      ensure(byId.has(record?.id), 'Choose an active ATT&CK technique; ATLAS is not supported by this flow export.');
      ensure(steps.length < 20, 'A hypothesis can contain at most 20 steps.');
      steps.push(record.id); changed();
    }
    function restore(value) {
      ensure(value && typeof value.title === 'string' && value.title.length <= 200 && !value.title.includes('\0')
        && Array.isArray(value.steps) && value.steps.length <= 20, 'Invalid flow snapshot.');
      ensure(value.steps.every(id => typeof id === 'string' && byId.has(id)), 'Flow contains unresolved or unsupported ATT&CK technique IDs.');
      // Validate the entire draft first: unresolved entries never disappear silently.
      title.value = value.title; steps = [...value.steps]; changed();
    }
    search?.addEventListener('input', choices);
    choice?.addEventListener('change', () => { addButton.disabled = !candidate() || steps.length >= 20; });
    addButton.addEventListener('click', () => {
      try { add(candidate()); } catch (error) { report(error.message); }
    });
    clearButton.addEventListener('click', () => { steps = []; changed(); });
    title.addEventListener('input', () => { onChange(snapshot()); });
    exportButton.addEventListener('click', async () => {
      if (exporting) return;
      exporting = true; exportButton.disabled = true;
      try {
        ensure(steps.length >= 2 && steps.length <= 20, 'Choose 2–20 ATT&CK hypothesis steps before export.');
        await onExport(snapshot());
        report('Attack Flow hypothesis downloaded. No activity observed or executed.');
      } catch (error) { report(`Could not complete action: ${error.message}`); }
      finally { exporting = false; exportButton.disabled = steps.length < 2; }
    });
    render();
    return Object.freeze({add, snapshot, restore, render,
      setSelected(record) { selected = byId.get(record?.id) || null; choices(); },
    });
  }
  return Object.freeze({createCar, createFlow});
});
