(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PAD_NAVIGATOR = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLOR = '#2563eb';
  const NOTICE = 'Generated prompt coverage only; not validated detection effectiveness. Human review, lab validation and field confirmation remain separate evidence gates.';
  // Order and names are checked against each pinned ATT&CK 19.2 matrix in tests.
  const TACTICS = {
    Enterprise: ['Reconnaissance', 'Resource Development', 'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Stealth', 'Defense Impairment', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Command and Control', 'Exfiltration', 'Impact'],
    Mobile: ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Command and Control', 'Exfiltration', 'Impact'],
    ICS: ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Evasion', 'Discovery', 'Lateral Movement', 'Collection', 'Command and Control', 'Inhibit Response Function', 'Impair Process Control', 'Impact'],
  };
  const slug = name => name.toLowerCase().replaceAll(' ', '-');
  const counts = total => ({ total, generated: total, reviewed: 0, labValidated: 0, fieldConfirmed: 0 });

  function select(records, options) {
    const domain = options && options.domain;
    if (typeof domain !== 'string' || !Object.hasOwn(TACTICS, domain)) throw new Error('Navigator domain must be Enterprise, Mobile or ICS.');
    if (!Array.isArray(records) || records.length > 5000) throw new Error('Navigator records must be an array of at most 5000 records.');
    const selected = [];
    const seen = new Set();
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid Navigator record.');
      if (record.domain !== domain) continue;
      if (typeof record.id !== 'string' || !/^T\d{4}(?:\.\d{3})?$/.test(record.id) || /\s/.test(record.id)) throw new Error('Invalid Navigator technique ID.');
      if (record.attackVersion !== '19.2') throw new Error('Navigator requires pinned ATT&CK 19.2 records.');
      if (!Array.isArray(record.tactics) || record.tactics.length === 0 || record.tactics.length > TACTICS[domain].length ||
          record.tactics.some(tactic => !TACTICS[domain].includes(tactic)) || new Set(record.tactics).size !== record.tactics.length) throw new Error('Invalid Navigator tactics.');
      if (seen.has(record.id)) throw new Error('Duplicate Navigator technique ID.');
      seen.add(record.id);
      selected.push({ id: record.id, tactics: [...record.tactics] });
    }
    selected.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return { domain, selected };
  }

  function summarize(records, options) {
    const { domain, selected } = select(records, options);
    return {
      domain, attackVersion: '19.2', ...counts(selected.length), notice: NOTICE,
      tactics: TACTICS[domain].map(name => {
        const techniqueIds = selected.filter(record => record.tactics.includes(name)).map(record => record.id);
        return { name, id: slug(name), ...counts(techniqueIds.length), techniqueIds };
      }),
    };
  }

  function createLayer(records, options) {
    const { domain, selected } = select(records, options);
    return {
      name: `Prompt-as-Detection — ${domain} generated coverage`,
      versions: { attack: '19.2', navigator: '5.2.0', layer: '4.5' },
      domain: `${domain.toLowerCase()}-attack`, description: NOTICE,
      sorting: 0,
      layout: { layout: 'side', showID: true, showName: true, showAggregateScores: false, expandedSubtechniques: 'annotated' },
      hideDisabled: false,
      selectTechniquesAcrossTactics: false,
      selectSubtechniquesWithParent: false,
      techniques: selected.flatMap(record => TACTICS[domain].filter(tactic => record.tactics.includes(tactic)).map(tactic => ({
        techniqueID: record.id, tactic: slug(tactic), color: COLOR, enabled: true,
        comment: 'Generated detection prompt available. Not independently reviewed or lab-validated.',
        metadata: [{ name: 'Prompt status', value: 'generated' }],
        links: [{ label: 'MITRE ATT&CK technique', url: `https://attack.mitre.org/techniques/${record.id.replace('.', '/')}/` }],
      }))),
      legendItems: [{ label: 'Generated prompt — not validated detection', color: COLOR }],
      metadata: [
        { name: 'ATT&CK source version', value: '19.2' },
        { name: 'Unique prompt records in this export', value: String(selected.length) },
        { name: 'Evidence boundary', value: NOTICE },
      ],
      links: [{ label: 'Navigator layer format 4.5', url: 'https://github.com/mitre-attack/attack-navigator/blob/master/layers/spec/v4.5/layerformat.md' }],
    };
  }
  return Object.freeze({ createLayer, summarize });
});
