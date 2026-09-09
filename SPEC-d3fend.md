# D3FEND defensive context

## Objective

Connect each existing ATT&CK or ATLAS technique to the countermeasure context
actually present in a pinned official MITRE D3FEND release. Users can inspect
defensive techniques and artifact relationships and export a separate defensive
research brief. This is one supplementary research capability, not a new
offensive prompt corpus or an effectiveness assessment.

## Boundaries

- Preserve all 918 ATT&CK 19.2 and 197 ATLAS 2026.08 default prompt bytes.
- Import only official, versioned D3FEND data with recorded source URLs,
  checksums, original copyright and terms. Record the actual available scope.
- Exact source identifiers determine joins. Do not invent links, infer inherited
  parent coverage or claim that missing relationships mean no defense exists.
- Label inferred ontology mappings as inferred. They do not establish local
  telemetry, product compatibility, validation, priority or effectiveness.
- Keep runtime dependencies at zero, all browsing/composition local, the CSP
  network prohibition intact, and exports free of automatic analyst-context
  inclusion. Never execute source content, commands or generated briefs.
- Existing CLI commands and the read-only research API retain their contracts.
  A new CLI `defenses ID` command exposes this supplementary capability.
- Continue the existing development version and normal reviewed GitHub/Pages
  publication path. No stable release or new hosting destination is implied.

## Structure and interfaces

- `sources/d3fend-<version>/`: pinned official inputs and provenance.
- `content/d3fend/`: generated coverage and defensive context.
- `demo/d3fend-catalog.js`: compact, offline browser/Node data.
- `demo/defenses.js`: shared lookup and defensive-brief formatting.
- A focused UI renderer presents a D3FEND section for the selected technique;
  build/publication allowlists include only reviewed public assets.
- `scripts/build_d3fend.cjs`: deterministic generator and read-only `--check`.
- `tests/d3fend*.test.cjs`: independent source parity, joins, safe formatting,
  empty/error cases, CLI and UI regression tests.

## Code style

Use the existing strict CommonJS/browser wrapper pattern and standard library.
Build lookup indexes once, bound source parsing, validate identifiers and URLs,
render with `textContent`, and keep data normalization out of the UI.

```js
const context = defenses.lookup(record.id);
summary.textContent = context.status === 'mapped'
  ? `${context.techniques.length} related countermeasures`
  : 'No exact mapping in this snapshot';
```

## Build order and checks

1. Inspect source semantics, terms, versions and actual framework coverage.
2. Test and implement a pinned offline generator plus lookup/brief contract.
3. Add the UI and CLI consumers and meaningful behavior regressions.
4. Verify all original prompt bytes, build boundaries, full Node/Python suites,
   real-browser flows, literal rendering, local downloads and responsive layout.
5. Independently review source fidelity and security-sensitive changes; publish
   through CI and verify the deployed assets.

Commands: `node --test tests/d3fend*.test.cjs`,
`node scripts/build_d3fend.cjs --check`, `npm test`, `npm run check`,
`npm run build`, `python3 -m pytest -q`, and the documented browser smoke suite.
New generator/test commands become usable as their respective slice lands.

## Acceptance

An analyst can select a mapped technique, understand the source relationship,
open the official D3FEND reference and download a clearly marked defensive
research draft. Unmapped techniques have an explicit, nonjudgmental empty state.
Coverage and provenance reconcile against every pinned input row. No unchanged
prompt becomes reviewed or validated, and no source/version gap is concealed.
