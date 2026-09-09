/* Local-only orchestration; imported text never becomes markup or instructions. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const MAX_IMPORT_BYTES = 256 * 1024;
  const catalog = globalThis.PAD_CATALOG;
  const steps = [];
  let plan = null;
  let planRevision = 0;
  let importRevision = 0;
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const report = (id, message) => { $(id).textContent = message; };
  const download = (name, value) => {
    const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = make('a'); anchor.href = url; anchor.download = name;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const action = (id, statusId, handler) => {
    $(id).addEventListener('click', async () => {
      $(id).disabled = true;
      try { await handler(); }
      catch (error) { report(statusId, `Could not complete action: ${error.message}`); }
      finally { $(id).disabled = id === 'lab-template' ? !plan : id === 'flow-export' ? steps.length < 2 : false; }
    });
  };
  const selected = id => {
    const value = $(id).value.trim().toUpperCase();
    const record = catalog.find(item => item.id === value);
    if (!record) throw new Error('Choose an active ATT&CK 19.2 technique ID.');
    return record;
  };
  $('research-theme').addEventListener('change', event => {
    if (event.target.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = event.target.value;
  });
  const missing = ['PAD_NAVIGATOR', 'PAD_CAR', 'PAD_CAR_CATALOG', 'PAD_ATTACK_FLOW', 'PAD_ROBUSTNESS', 'PAD_LAB', 'PAD'].filter(key => !globalThis[key]);
  if (!Array.isArray(catalog) || missing.length) {
    report('research-status', 'Research modules are unavailable. Reload or open a complete local build. The technique library is still available.');
    return;
  }

  function renderCoverage() {
    const summary = PAD_NAVIGATOR.summarize(catalog, { domain: $('coverage-domain').value });
    report('coverage-counts', `${summary.total} generated · ${summary.reviewed} reviewed · ${summary.labValidated} lab-validated`);
    $('coverage-matrix').replaceChildren();
    for (const tactic of summary.tactics) {
      const card = make('div', undefined, 'coverage-tactic');
      card.append(make('h3', tactic.name), make('p', `${tactic.total} generated prompts`));
      const details = make('details'); details.append(make('summary', 'Technique IDs'));
      // Populate only on demand: collapsed matrices do not need hundreds of links.
      details.addEventListener('toggle', () => {
        if (!details.open || details.childElementCount > 1) return;
        const links = make('div');
        for (const id of tactic.techniqueIds) {
          const link = make('a', id); link.href = `./index.html?q=${encodeURIComponent(id)}`; links.append(link);
        }
        details.append(links);
      });
      card.append(details); $('coverage-matrix').append(card);
    }
  }
  $('coverage-domain').addEventListener('change', renderCoverage);
  action('navigator-export', 'research-status', () => {
    const domain = $('coverage-domain').value;
    download(`navigator-${domain.toLowerCase()}-19.2.json`, PAD_NAVIGATOR.createLayer(catalog, { domain }));
    report('research-status', `${domain} Navigator layer downloaded. Generated coverage only.`);
  });

  let car;
  try { car = PAD_CAR.createLibrary(PAD_CAR_CATALOG); }
  catch { report('research-status', 'CAR source data is invalid. Reload or open a complete local build.'); return; }
  function renderCar() {
    const record = selected('car-technique');
    const result = car.lookup(record.id);
    const region = $('car-results'); region.replaceChildren();
    region.append(make('p', `${result.analytics.length} exact CAR mappings for ${record.id}. ${result.warning}`));
    for (const analytic of result.analytics) {
      const details = make('details'); details.append(make('summary', `${analytic.id} · ${analytic.title}`));
      details.append(make('h3', 'Hypothesis'), make('p', analytic.hypothesis));
      details.append(make('h3', 'Source telemetry'), make('p', analytic.telemetry.join('\n') || 'Not specified by source.'));
      for (const implementation of analytic.pseudocode) {
        details.append(make('h3', implementation.description || implementation.type || 'Source pseudocode'));
        details.append(make('pre', implementation.code, 'research-code'));
      }
      const link = make('a', 'Read pinned CAR source ↗');
      const url = new URL(analytic.sourceUrl);
      if (url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password && !url.port) {
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; details.append(link);
      }
      details.append(make('p', `Source SHA-256: ${analytic.sourceSha256}`, 'fine-print'));
      region.append(details);
    }
    const notice = make('details'); notice.append(make('summary', 'Source license and notice'), make('pre', `${result.sourceNotice}\n${result.sourceLicense}`, 'research-code')); region.append(notice);
  }
  action('car-find', 'research-status', renderCar);

  function invalidatePlan() {
    plan = null; planRevision += 1; importRevision += 1;
    $('lab-template').disabled = true; $('lab-file').disabled = true; $('lab-file').value = '';
    $('lab-result').hidden = true; $('lab-result').textContent = '';
    report('lab-status', 'Selection or plan details changed. Create a new plan before importing evidence.');
  }
  function choices() {
    const query = $('flow-search').value.trim().toLowerCase();
    const matches = catalog.filter(record => `${record.id} ${record.name}`.toLowerCase().includes(query)).slice(0, 50);
    $('flow-choice').replaceChildren(...matches.map(record => {
      const option = make('option', `${record.id} · ${record.name}`); option.value = record.id; return option;
    }));
    $('flow-add').disabled = matches.length === 0 || steps.length >= 20;
  }
  function renderSteps() {
    $('flow-steps').replaceChildren();
    steps.forEach((record, index) => {
      const row = make('li', undefined, 'flow-step');
      row.append(make('strong', `${record.id} · ${record.name}`));
      const controls = make('div', undefined, 'step-controls');
      for (const [text, delta] of [['Move up', -1], ['Move down', 1], ['Remove', 0]]) {
        const button = make('button', text); button.setAttribute('aria-label', `${text}: step ${index + 1}, ${record.id}`);
        button.disabled = delta === -1 && index === 0 || delta === 1 && index === steps.length - 1;
        button.addEventListener('click', () => {
          if (delta === 0) steps.splice(index, 1);
          else [steps[index], steps[index + delta]] = [steps[index + delta], steps[index]];
          invalidatePlan(); renderSteps();
          const nextIndex = Math.max(0, Math.min(index + delta, steps.length - 1));
          const nextRow = $('flow-steps').children[nextIndex];
          (nextRow?.querySelector('button:not(:disabled)') || $('flow-add')).focus();
        });
        controls.append(button);
      }
      row.append(controls); $('flow-steps').append(row);
    });
    $('flow-empty').hidden = steps.length > 0;
    $('flow-export').disabled = steps.length < 2; $('flow-clear').disabled = steps.length === 0;
    choices(); report('flow-status', `${steps.length} of 20 hypothesis steps.`);
  }
  $('flow-search').addEventListener('input', choices);
  $('flow-add').addEventListener('click', () => {
    if (steps.length >= 20) return;
    const record = catalog.find(item => item.id === $('flow-choice').value);
    if (!record) return;
    steps.push(record); invalidatePlan(); renderSteps();
  });
  $('flow-clear').addEventListener('click', () => { steps.length = 0; invalidatePlan(); renderSteps(); });
  action('flow-export', 'flow-status', () => {
    download('attack-flow-hypothesis.json', PAD_ATTACK_FLOW.createFlow(steps, { title: $('flow-name').value }));
    report('flow-status', 'Attack Flow hypothesis downloaded. No activity observed or executed.');
  });

  for (const [id, entries] of [['assessment-level', PAD_ROBUSTNESS.LEVELS], ['assessment-origin', PAD_ROBUSTNESS.ORIGINS]]) {
    $(id).replaceChildren(...entries.map(entry => { const option = make('option', entry.label); option.value = entry.value; return option; }));
  }
  action('assessment-export', 'assessment-status', () => {
    const input = { level: Number($('assessment-level').value), origin: $('assessment-origin').value };
    for (const key of ['telemetry', 'observable', 'rationale', 'benignContext', 'evidenceReference']) input[key] = $(`assessment-${key}`).value;
    download('manual-robustness-assessment.json', PAD_ROBUSTNESS.createAssessment(selected('assessment-technique'), input));
    report('assessment-status', 'Manual, unverified assessment downloaded. Review status is unchanged.');
  });
  for (const id of ['lab-title-input', 'lab-authorization']) $(id).addEventListener('input', invalidatePlan);
  action('lab-plan', 'lab-status', async () => {
    const revision = planRevision;
    const next = await PAD_LAB.createPlan([...steps], { title: $('lab-title-input').value, authorizationReference: $('lab-authorization').value });
    if (revision !== planRevision) throw new Error('Plan inputs changed while preparing the export. Please retry.');
    plan = next; download('offline-lab-plan.json', plan);
    $('lab-template').disabled = false; $('lab-file').disabled = false;
    report('lab-status', 'Plan prepared locally. Download the result template for a separately authorized lab.');
  });
  action('lab-template', 'lab-status', async () => {
    if (!plan) throw new Error('Create a current plan first.');
    const currentPlan = plan;
    const template = await PAD_LAB.createResultTemplate(currentPlan);
    if (currentPlan !== plan) throw new Error('Plan changed during export. Please retry.');
    download('lab-result-template.json', template);
    report('lab-status', 'Template downloaded. Replace empty evidence fields with actual laboratory evidence before importing.');
  });
  $('lab-file').addEventListener('change', async () => {
    const file = $('lab-file').files[0]; const currentPlan = plan;
    const revision = ++importRevision;
    $('lab-result').hidden = true; $('lab-result').textContent = '';
    try {
      if (!currentPlan) throw new Error('Create a current plan first.');
      if (!file || file.size > MAX_IMPORT_BYTES) throw new Error('Choose a JSON result envelope of at most 256 KiB.');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      const imported = await PAD_LAB.importResults(text, currentPlan);
      if (currentPlan !== plan || revision !== importRevision) return;
      $('lab-result').textContent = JSON.stringify(imported, null, 2); $('lab-result').hidden = false;
      report('lab-status', 'Envelope accepted structurally. Evidence remains unverified; prompt validation is unchanged.');
    } catch (error) { if (revision === importRevision) report('lab-status', `Import rejected: ${error.message}`); }
    finally { if (revision === importRevision) $('lab-file').value = ''; }
  });

  try {
    renderCoverage(); choices(); renderCar();
    $('research-content').hidden = false;
    report('research-status', 'Ready. All inputs stay in this browser and clear on reload. Exported files are your responsibility.');
  } catch {
    report('research-status', 'Research data could not be initialized. Reload or use a complete local build.');
  }
})();
