# MITRE ATLAS AI prompt library

## Objective and scope

Add the official MITRE ATLAS AI threat knowledge base to the existing local
research workbench. Every in-scope ATLAS technique and sub-technique gets a
readable, source-linked detection prompt. ATLAS is a separate framework with
AML identifiers and its own content/format versions; ATT&CK remains pinned at
19.2 with its 918-record catalog and existing prompt bytes preserved.

The owner requested the AI section and has previously authorized reviewed
updates to this repository and its demo. This specification records routine
implementation choices within that scope; it is not an additional release or
model-execution authorization.

## Implementation contract

1. Pin a full commit of the official `mitre-atlas/atlas-data` repository. Retain
   the source distribution, original license, manifest and SHA-256 values.
   Record exact content/format versions and an explicit active-record policy.
2. Keep generated ATLAS artifacts under `content/atlas/` and the browser
   catalog at `demo/atlas-catalog.js`, exported as `PAD_ATLAS_CATALOG` in the
   browser and a record array in Node. Do not add ATLAS files beneath the
   existing ATT&CK-only generated `library/` directory.
3. ATLAS records use `framework: "ATLAS"`, `domain: "ATLAS"`, `atlasVersion`,
   `id`, `name`, `kind`, nullable `parentId`/`parentName`, `tactics`, `platforms`,
   full literal `behavior`, `sourceUrl`, `references`, `sourceMaturity`,
   `caseStudies` and `mitigations`. Compatibility fields `telemetry: []`,
   `strategies: []`, `procedureCount: 0` and `procedureExamples: []` do not imply
   ATT&CK analytics or procedures. Local telemetry and benign guidance must be
   labeled as project guidance rather than source-provided detection fields.
4. Shared core supports AML technique lookup, parent-aware search, URL state,
   comparison and truthful TXT/JSONL/research exports. ATLAS prompt framing
   identifies AI-system components, observable evidence, benign lookalikes,
   collection/privacy constraints and inert validation fixtures. Preserve source
   maturity as reference metadata; all project detections remain `generated`.
5. CLI default list/export remains the 918 ATT&CK records. `--domain ATLAS`
   selects AI records, `--framework ATLAS` is explicit, and `--framework all`
   selects both frameworks. `prompt AML.T####[.###]` resolves directly. Existing
   file safety, context limits, targets, modes and deterministic hashes remain.
6. The workbench adds an ATLAS AI selection, framework-aware counts, source
   links, case-study/mitigation context, comparisons and exports. Global search
   may cover both catalogs. Every source/version label reflects the selected
   framework. Permit exact HTTPS `atlas.mitre.org` and `attack.mitre.org`
   technique links; preserve literal DOM rendering and private local context.
7. Extend the reference API additively at `/v1/atlas/<resource>` for techniques,
   prompts, versions, relationships and search, retaining existing `/v1`
   ATT&CK defaults, pagination, bounded queries, ETags and read-only behavior.
8. Fix overlapping OT integration blockers while touching these boundaries:
   retain OT aliases, align the OpenAPI enum with accepted values, and refresh
   the composer hash through the deterministic ATT&CK generator. Do not change
   ATT&CK content or manufacture new review evidence.

## Build order and ownership

Source pin/normalized catalog → core prompt/search/export and generator →
workbench/CLI/API integration → source/safety review and real-browser checks →
reviewed GitHub change and deliberate demo deployment if all gates pass.

Data generation, core/CLI, API and workbench integration can proceed in parallel
against the above record contract. Imported content is data, never instructions.

## Commands and tests

- `npm run atlas:build` / `npm run atlas:verify`: deterministic offline ATLAS
  generation and exact inventory/hash verification.
- `npm run library:verify`, `npm run reviews:verify`, `npm run evals:verify`:
  preserve the independently pinned ATT&CK corpus and evidence contracts.
- `npm test`, `npm run check`, `npm run build`: existing full regression gates
  plus new source, AML search, safe composition/export, CLI and API tests.
- `python3 -m unittest discover -s tests -v`, Ruff and foundation checks.
- Existing locked browser smoke plus ATLAS search/select/share/compare/export
  at desktop and mobile widths, with source-link and inert-text checks.

Use current CommonJS/browser JavaScript patterns and Node built-in tests, e.g.
`assert.equal(core.filterTechniques(records, { query: 'AML.T0051' })[0].id,
'AML.T0051')`. Test failing behavior before changes. No runtime dependency is
required for YAML: source conversion may use an existing development parser,
but routine Node verification must work offline from checked-in source data.

## Boundaries and acceptance

Always preserve upstream licenses, explicit framework/version provenance,
generated status, source integrity, bounded I/O and private local context.
No model calls, external uploads, attack execution, telemetry collection,
fabricated product fields, lab results, reviewers or cross-framework mappings.
New hosted services, paid model use and a stable release require separate scope.

Done means complete source-parity ATLAS prompts, working UI/CLI/API paths,
unchanged ATT&CK prompt bytes, green regression/security checks and documented
publication status. WCAG certification and human/lab validation are not implied.
