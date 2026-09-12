(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PAD_ENVIRONMENT_UI = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_PROFILES = 100;
  const FIELDS = ['name', 'target', 'system', 'dataSources', 'tables', 'fieldMappings', 'limitations'];
  const LABELS = { system: 'operating environment', dataSources: 'data sources', tables: 'real tables', fieldMappings: 'field mappings', limitations: 'known limitations' };
  const STEPS = [
    ['Research task', 'Choose a technique and what you need to investigate.'],
    ['Target environment', 'Choose a saved profile, then explicitly apply it. You can also work without one.'],
    ['Available information', 'Review the applied environment and add context. Empty fields mean unknown, not available telemetry.'],
    ['Review and copy', 'Check your choices, then copy or edit the prompt. Information completeness is not validation.'],
  ];
  const GROUPS = ['guide-task', 'guide-environment', 'guide-telemetry', 'guide-result'];

  function create({ document, environment, targets, getDetails, onApply, onChange, download, initialComposer = 'guided' }) {
    if (!document || !environment || !Array.isArray(targets) || !targets.length || typeof getDetails !== 'function' || typeof onApply !== 'function') throw new Error('Environment interface dependencies are unavailable');
    const window = document.defaultView || globalThis;
    const $ = id => { const node = document.getElementById(id); if (!node) throw new Error('Environment interface is incomplete'); return node; };
    const statusNode = document.getElementById('environment-status') || $('environment-current');
    let profiles = [], activeEnvironment = null, selectedId = '', composer = initialComposer === 'quick' ? 'quick' : 'guided', guideStep = 1;
    let edit = null, preview = null, dialogFocus = null, previewFocus = null, generation = 0, applying = false;
    const selected = () => profiles.find(item => item.id === selectedId) || null;
    const copy = profile => profile === null ? null : environment.validate(profile);
    const changed = () => { if (typeof onChange === 'function') onChange(); };
    const status = text => { statusNode.textContent = text; };
    const option = (value, text) => { const node = document.createElement('option'); node.value = value; node.textContent = text; return node; };
    function closeDialog(id, focus) { const node = $(id); if (node.open) node.close(); if (focus?.focus) focus.focus(); }
    function cancelEdit() { edit = null; closeDialog('environment-dialog', dialogFocus); dialogFocus = null; }
    function cancelPreview() {
      generation++; applying = false; renderApplyButton(); preview = null; $('environment-preview-text').textContent = ''; $('environment-import').value = '';
      closeDialog('environment-preview-dialog', previewFocus); previewFocus = null;
    }
    function invalidate() { generation++; applying = false; cancelEdit(); cancelPreview(); }
    function renderApplyButton() {
      $('environment-apply').disabled = applying;
      $('environment-apply').textContent = applying ? 'Applying…' : selected() ? 'Use selected profile' : 'Work without a profile';
    }
    function summary() {
      const details = getDetails();
      const technique = typeof details.technique === 'string' ? details.technique : [details.technique?.id, details.technique?.name].filter(Boolean).join(' — ');
      const lines = [technique || 'No technique selected', 'Task: ' + (details.mode || 'unknown'), 'Target: ' + (details.target || 'unknown')];
      if (activeEnvironment) {
        const information = environment.summarize(activeEnvironment);
        lines.push('Applied profile: ' + activeEnvironment.name + ' · revision ' + activeEnvironment.revision);
        if (activeEnvironment.target !== details.target) lines.push('Target conflict: apply a matching profile or work without one.');
        lines.push(information.status === 'example' ? 'Example information — not confirmed for your environment.' : 'User-provided information — not independently verified.');
        lines.push(information.missing.length ? 'Unknown: ' + information.missing.map(key => LABELS[key] || key).join(', ') + '.' : 'Profile fields supplied. This does not prove telemetry availability or detection effectiveness.');
      } else lines.push('No profile applied. Supply real environment details where needed; unknown fields must not be invented.');
      const draftContext = typeof details.draftContext === 'string' ? details.draftContext : details.context;
      if (draftContext !== details.context) {
        lines.push('This retained draft uses earlier context. Use “Apply context” explicitly to replace it; your text is not changed automatically.');
        lines.push('Context saved with this draft:\n' + (draftContext || 'None.'));
      } else lines.push(draftContext ? 'Additional context is included separately; conflicts require clarification.' : 'No additional applied context.');
      if (typeof details.contextInput === 'string' && details.contextInput !== details.context) lines.push('Unapplied context edits: use “Apply context” before copying a prompt that needs these changes.');
      lines.push('Generated draft — review before use.');
      return lines.join('\n');
    }
    function refresh() {
      if (!profiles.some(item => item.id === selectedId)) selectedId = '';
      $('environment-select').replaceChildren(option('', 'No saved profile selected'), ...profiles.map(item => option(item.id, item.name + ' · revision ' + item.revision + (item.provenance === 'example' ? ' · example' : ''))));
      $('environment-select').value = selectedId;
      for (const id of ['edit', 'copy', 'delete', 'export']) $('environment-' + id).disabled = !selected();
      renderApplyButton();
      $('environment-current').textContent = activeEnvironment
        ? 'Applied: ' + activeEnvironment.name + ' · revision ' + activeEnvironment.revision + '. Saved edits do not change this snapshot until you apply them.'
        : 'No profile applied. Saving or selecting a profile does not change your current prompt.';
      $('environment-telemetry-summary').textContent = activeEnvironment ? environment.render(activeEnvironment) : 'No profile applied. Add only information you know; leave unknown details unspecified.';
      $('guide-summary').textContent = summary();
      $('composer-mode').value = composer;
      $('guide-nav').hidden = composer === 'quick';
      $('guide-step-title').hidden = composer === 'quick';
      $('guide-step-description').hidden = composer === 'quick';
      $('guide-step-title').textContent = 'Step ' + guideStep + ' of 4 — ' + STEPS[guideStep - 1][0];
      $('guide-step-description').textContent = STEPS[guideStep - 1][1];
      GROUPS.forEach((id, index) => { $(id).hidden = composer === 'guided' && guideStep !== index + 1; });
      $('guide-previous').disabled = guideStep === 1; $('guide-next').disabled = guideStep === 4;
    }
    function moveStep(delta) {
      guideStep = Math.max(1, Math.min(4, guideStep + delta)); refresh(); changed();
      $('guide-step-title').focus();
    }
    function beginEdit(kind) {
      if ((kind === 'new' || kind === 'copy') && profiles.length >= MAX_PROFILES) { status('Profile limit reached. Export or remove a saved profile before adding another.'); return; }
      const original = selected();
      if (kind !== 'new' && !original) return;
      invalidate();
      let candidate;
      if (kind === 'new') candidate = environment.create('New environment', getDetails().target || targets[0]);
      else if (kind === 'copy') candidate = { ...copy(original), id: environment.create('Copy', original.target).id, revision: 1, name: original.name.slice(0, environment.LIMITS.name - 7) + ' (copy)' };
      else candidate = { ...copy(original), revision: original.revision + 1 };
      edit = { kind, candidate };
      dialogFocus = $('environment-' + kind);
      $('environment-dialog-title').textContent = kind === 'new' ? 'Create environment profile' : kind === 'copy' ? 'Copy environment profile' : 'Edit environment profile';
      $('environment-error').textContent = '';
      FIELDS.forEach(key => { $('environment-' + key).value = candidate[key]; });
      $('environment-dialog').showModal(); $('environment-name').focus();
    }
    function saveEdit() {
      if (!edit) return;
      try {
        const candidate = { ...edit.candidate };
        FIELDS.forEach(key => { candidate[key] = $('environment-' + key).value; });
        const validated = environment.validate(candidate);
        const next = edit.kind === 'edit' ? profiles.map(item => item.id === validated.id ? validated : item) : [...profiles, validated];
        if (next.length > MAX_PROFILES) throw new Error('Profile limit');
        profiles = next; selectedId = validated.id; generation++;
        cancelEdit(); refresh(); status('Profile saved in this workspace. Use selected profile to apply it; existing drafts are unchanged.'); changed();
      } catch {
        $('environment-error').textContent = 'Profile not saved. Use a name of 1–120 characters, a supported target, and at most 4,000 characters per information field. Existing data is unchanged.';
        $('environment-error').focus();
      }
    }
    function removeSelected() {
      const profile = selected(); if (!profile) return;
      if (!window.confirm('Remove the saved profile “' + profile.name + '”? Applied snapshots and existing drafts will be kept. Export this profile first if you want a separate backup.')) { $('environment-delete').focus(); return; }
      invalidate(); profiles = profiles.filter(item => item.id !== profile.id); selectedId = '';
      refresh(); $('environment-select').focus(); status('Saved profile removed. Applied snapshots and existing drafts were kept.'); changed();
    }
    async function applySelected() {
      const candidate = copy(selected()), token = ++generation;
      applying = true; refresh();
      let previous = null, committed = false;
      try {
        const hash = candidate ? await environment.hash(candidate) : '';
        if (token !== generation) return;
        previous = activeEnvironment; activeEnvironment = candidate ? Object.freeze(copy(candidate)) : null; committed = true;
        // Root commits synchronously. The guard also permits async integrations
        // to check cancellation before mutating another workspace.
        await onApply(copy(candidate), hash, () => token === generation);
        if (token !== generation) return;
        applying = false; refresh(); status(candidate ? 'Profile applied to this prompt. Previous drafts are preserved.' : 'Working without a profile. Previous drafts are preserved.'); changed();
      } catch {
        if (token !== generation) return;
        if (committed) activeEnvironment = previous;
        applying = false; refresh(); status('Profile could not be applied. Existing profile and draft state were preserved.');
      }
    }
    async function importProfile() {
      const file = $('environment-import').files?.[0];
      cancelPreview(); const token = generation;
      if (!file) return;
      status('Reading profile file…');
      try {
        if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > environment.LIMITS.bytes) throw new Error('File limit');
        const buffer = await file.arrayBuffer();
        if (token !== generation) return;
        if (buffer.byteLength > environment.LIMITS.bytes || buffer.byteLength !== file.size) throw new Error('File limit');
        const decoder = new (window.TextDecoder || TextDecoder)('utf-8', { fatal: true });
        const candidate = environment.parse(decoder.decode(buffer));
        if (token !== generation) return;
        preview = candidate; previewFocus = $('environment-import');
        status('Profile ready for preview. Confirm import to save a new copy.');
        $('environment-preview-text').textContent = 'Import as a new saved profile. Nothing is applied to a prompt yet.\n\n' + environment.render(candidate);
        $('environment-preview-dialog').showModal(); $('environment-import-cancel').focus();
      } catch {
        if (token === generation) { cancelPreview(); status('Profile not imported. Choose a valid .pad-environment.json file within the 128 KiB limit. Existing work is unchanged.'); }
      }
    }
    function confirmImport() {
      if (!preview) return;
      if (profiles.length >= MAX_PROFILES) { cancelPreview(); status('Profile not imported: the workspace already contains 100 profiles. Existing work is unchanged.'); return; }
      try {
        const imported = environment.validate({ ...preview, id: environment.create('Import', preview.target).id, revision: 1 });
        profiles = [...profiles, imported]; selectedId = imported.id;
        cancelPreview(); refresh(); status('Profile imported with a new identity. Review its information, then explicitly apply it.'); changed();
      } catch { cancelPreview(); status('Profile not imported. Existing work is unchanged.'); }
    }
    function exportSelected() {
      const profile = selected(); if (!profile) return;
      try {
        if (typeof download !== 'function') throw new Error('Download unavailable');
        download('environment-' + profile.id + '.pad-environment.json', environment.serialize(profile), 'application/json');
        status('Profile file prepared. Store it privately: it may contain your environment details.');
      } catch { status('Profile export failed. Your saved profile remains in this workspace.'); }
    }
    function snapshot() { return { profiles: profiles.map(copy), activeEnvironment: copy(activeEnvironment), composer, guideStep }; }
    function restore(value) {
      if (!value || !Array.isArray(value.profiles) || value.profiles.length > MAX_PROFILES || !['guided', 'quick'].includes(value.composer) || !Number.isInteger(value.guideStep) || value.guideStep < 1 || value.guideStep > 4) throw new Error('Invalid environment workspace state');
      const next = value.profiles.map(copy), active = copy(value.activeEnvironment);
      if (new Set(next.map(item => item.id)).size !== next.length) throw new Error('Duplicate environment profile');
      invalidate(); profiles = next; activeEnvironment = active ? Object.freeze(active) : null;
      selectedId = active?.id || ''; composer = value.composer; guideStep = value.guideStep;
      refresh(); status('');
    }
    function detach() { invalidate(); activeEnvironment = null; refresh(); }
    function cancelPending() { invalidate(); refresh(); }

    $('environment-target').replaceChildren(...targets.map(target => option(target, target)));
    $('composer-mode').addEventListener('change', () => { composer = $('composer-mode').value === 'quick' ? 'quick' : 'guided'; refresh(); changed(); });
    $('guide-previous').addEventListener('click', () => moveStep(-1));
    $('guide-next').addEventListener('click', () => moveStep(1));
    $('environment-select').addEventListener('change', () => { generation++; applying = false; selectedId = $('environment-select').value; refresh(); });
    for (const kind of ['new', 'edit', 'copy']) $('environment-' + kind).addEventListener('click', () => beginEdit(kind));
    $('environment-save').addEventListener('click', saveEdit);
    $('environment-cancel').addEventListener('click', cancelEdit);
    $('environment-dialog').addEventListener('cancel', event => { event.preventDefault(); cancelEdit(); });
    $('environment-delete').addEventListener('click', removeSelected);
    $('environment-apply').addEventListener('click', applySelected);
    $('environment-export').addEventListener('click', exportSelected);
    $('environment-import').addEventListener('change', importProfile);
    $('environment-import-confirm').addEventListener('click', confirmImport);
    $('environment-import-cancel').addEventListener('click', cancelPreview);
    $('environment-preview-dialog').addEventListener('cancel', event => { event.preventDefault(); cancelPreview(); });
    refresh();
    return Object.freeze({ snapshot, restore, refresh, detach, cancelPending });
  }
  return Object.freeze({ create });
}));
