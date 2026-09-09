# Architecture

## Independent rebuild

Version `0.4.0.dev0` builds from official pinned MITRE ATT&CK 19.2 STIX bundles.
It also includes the separately versioned MITRE ATLAS 2026.08 AI knowledge base.
The original v0.2.0 application remains unavailable. This architecture describes
the new Node CLI, static browser workbench and readable prompt library; it does
not claim Python CLI compatibility or restore the original response evaluator.

| Component | Responsibility |
| --- | --- |
| `sources/attack-19.2/` | Immutable raw bundles, source hashes, release identity and license. |
| `scripts/build_library.cjs` | Validate pinned inputs; deterministically derive catalog, all procedures, text files and coverage evidence. |
| `demo/catalog.js` | UMD/CommonJS catalog of all 918 active records with complete descriptions, linked analytics and up to three procedure examples each. |
| `sources/atlas-2026.08/` | Pinned versioned YAML, deterministic JSON derivative, release/commit hashes and Apache-2.0 notices. |
| `scripts/build_atlas.cjs` | Offline source validation and deterministic ATLAS artifact generation. |
| `content/atlas/`, `demo/atlas-catalog.js` | Separate 197-record catalog, readable prompts, source relationships, generated-status index and hash coverage. |
| `sources/d3fend-1.6.0/`, `scripts/build_d3fend.cjs` | Pinned D3FEND ontology/mappings/notices and deterministic, exact-ID defensive-context generation. |
| `content/d3fend/`, `demo/d3fend-catalog.js` | Coverage/exclusion evidence and inferred artifact paths for 369 existing offensive IDs. |
| `demo/defenses.js`, `demo/defenses-ui.js` | Strict supplementary data boundary, source-linked panel and separate notice-bearing defensive brief/JSON exports. |
| `demo/core.js` | One composition implementation for browser, CLI and generated texts; filtering, bounded context and JSONL templates. |
| `library/prompts/` | One source-specific detect prompt per active technique/subtechnique. |
| `library/procedures.jsonl` | All 18,885 qualifying procedure relationships, not only the examples embedded in the browser catalog. |
| `library/coverage.json` | Source, catalog and text identifier sets, exclusions, linkage counts and hashes. |
| `scripts/library_cli.cjs` | Local list, prompt, export and defenses commands with validated options and exclusive file writes. |
| `demo/app.js`, `index.html`, `style.css` | Search/filter/pagination, source detail, in-memory drafts, explicit context application, copy and downloads. |
| `scripts/build_demo.cjs` | Fourteen-file static public allowlist and bounded, validated byte copying. |
| `packages/schemas/` | Versioned JSON Schema 2020-12 contracts and boundary validation. |
| `content/`, `validation/` | Prompt/review registries, native-support truth and machine-readable evidence. |
| `apps/research-api/`, `packages/core/`, `packages/clients/` | Read-only local reference API, immutable catalog core and explicit client. |
| `integrations/rosti/`, `scripts/rosti_sync.cjs` | Opt-in external research enrichment with credentials kept outside repository state. |

## Source and generation contract

Active scope includes every non-revoked, non-deprecated attack-pattern in all
three domains. Parent techniques and subtechniques are both prompt records.
Tactics categorize records and procedures supply evidence; neither is an extra
technique. Source IDs, references, complete descriptions, analytic log sources
and tuning variables remain attributable to the pinned release.

Generation preserves missing source fields as missing: 24 ICS techniques have
no platform; 108 active records have no qualifying procedure relationship.
Thirteen active analytics lack a link from active strategies and remain in raw
source only. No source relationships are inferred to meet a count. See
[source provenance](source-provenance.md) for the precise coverage policy.

`library:build` is an explicit deterministic regeneration operation.
`library:verify` recomputes expected bytes and compares without writes. This
catches missing, altered and extra generated files. CI and `npm run build` use
verification so stale files cannot be silently corrected during a release build.

ATLAS follows its own [inclusion policy and provenance](atlas.md), not ATT&CK's
STIX exclusions. `atlas:build` / `atlas:verify` own only the separate AI outputs.
The browser combines both arrays, while default CLI commands and `/v1` API
resources stay ATT&CK-only. `/v1/atlas` exposes AI resources without fabricating
ATT&CK IDs, STIX IDs or versions. See [ADR 0006](../governance/decisions/0006-separate-atlas-framework.md).

D3FEND is a supplementary exact-ID join, not another offensive framework or
an addition to the default prompt composer/API. `d3fend:verify` checks all source
and derived bytes. Its two artifact endpoints, relation-bearing defensive ID,
query labels and source CSV row indices remain separate. Missing mappings do
not inherit parent or cross-framework context. See [D3FEND](d3fend.md).

## Composition and export

The four modes are hunt, detect, triage and validate; the six targets are the
existing shared-core targets. Node and browser import the same core code so
source and context handling do not diverge. Source and analyst strings are
inserted as literal data, never evaluated or interpolated a second time.

Applying browser context rebuilds the selected prompt and affects future
compositions/exports. Other remembered editor drafts remain intact; draft keys
include technique, mode and target. Reload clears all in-memory state. Text
copy/download preserves editor content. Browser JSONL contains freshly composed
filtered templates, excluding editor changes. CLI JSONL adds prompt SHA-256
values and reports a whole-file SHA-256 on stdout; it does not create a sidecar.

These checksums establish byte identity, not authenticity or detection quality.
The local CLI validates exact mode and target names and bounds context files to
16,000 bytes and 4,000 JavaScript string units. It refuses existing outputs and
symlinked path components. On macOS, use canonical `/private/tmp/` paths for
temporary exports rather than the `/tmp` symlink.

## Public and private boundaries

Runtime requires no packages or network service. Browser values enter the DOM
through text/value APIs, and the page has a restrictive CSP. There is no cloud
model integration, query execution, telemetry or persistent analyst storage.
Source-link clicks are explicit navigation. Hosting still receives ordinary
page requests.

Only `index.html`, `style.css`, `catalog.js`, `atlas-catalog.js`,
`d3fend-catalog.js`, `core.js`, `defenses.js`, `defenses-ui.js`, `app.js`,
`favicon.svg`, `THIRD_PARTY_LICENSE.txt`, `ATLAS_LICENSE.txt`,
`D3FEND_LICENSE.txt` and `.nojekyll` enter `dist/`. The notices retain ATT&CK,
ATLAS and D3FEND terms and project MIT attribution/license. Each catalog has a
16 MiB limit and every other file a 2 MiB limit. The builder rejects unexpected demo
files, symlinks, malformed UTF-8, NULs and selected credential signatures, captures
validated bytes, then writes a new output exclusively. It never packages raw
source bundles, the complete procedure file, tests, QA dependencies or repository
metadata. It refuses to overwrite an existing output; an I/O failure can leave
a partial new output, which must not be deployed.

## Decisions and tradeoffs

Keeping UMD/CommonJS and a single composition implementation supports a plain
browser and Node without a runtime framework. Committing raw source and readable
generated texts makes the data traceable and usable offline; reproducible
verification detects drift. The catalog includes three deterministic procedure
examples per record to bound browser payload size, while the repository preserves
all qualifying relationships. Pagination limits DOM work to 50 results at a time.

Dataset upgrades, original-archive recovery, model services, executable response
validation and persistent user data are separate changes requiring their own
compatibility and trust-boundary decisions. Original project code uses the
owner-approved [MIT License](../LICENSE), while reproduced ATT&CK source content
retains separate MITRE terms; see the [licensing record](licensing.md).
