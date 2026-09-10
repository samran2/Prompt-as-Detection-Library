# Development guide

## Development baseline

The working target is `0.4.0.dev3` Premium Workbench (npm `0.4.0-dev.3`),
building on the research-and-contract foundation and independent rebuild.
The pinned ATT&CK release remains 19.2, and the existing CLI and static browser
workbench remain supported.
ATLAS AI is separately pinned at content version `2026.08` / format `6.0.0`.
D3FEND defensive context is separately pinned at ontology version `1.6.0`.

Node.js 22+ runs generation, the CLI, unit tests and the static build. The
browser and root package have zero runtime dependencies. Python 3.11+ is used
only for local preview and repository-quality checks; the unavailable original
Python application is not included.

Read [AGENTS](../AGENTS.md), [architecture](architecture.md), [CONTRIBUTING](../CONTRIBUTING.md)
and the relevant schema before changing behavior. Treat ATT&CK text, analyst
context, model output and rule fixtures as untrusted data.

## Fast local loop

The [project engineering skills](agent-skills.md) are committed in
`.agents/skills/` with their shared references, original license and an upstream
commit/hash lock. Open this repository root in Codex to discover them. Run
`npm run skills:verify` to check the local snapshot without network access.

```sh
npm run library:help
node scripts/library_cli.cjs list
node scripts/library_cli.cjs prompt T1059.001
npm run library:verify
npm run atlas:verify
npm run d3fend:verify
npm run check
npm test
npm run build
```

No dependency installation or network access is required for these commands.
Run the focused test for a changed component first, then the full suite once the
change is green. For publication-documentation changes, the focused check is:

```sh
node --test tests/release_docs.test.cjs
```

The root package is private and is not an npm publication target. `npm run
build` verifies the generated library and then creates `dist/`; it refuses an
existing output directory. `dist/` is disposable build output and must not be
committed.

## Version synchronization

Development versions use two equivalent spellings:

- `VERSION` and Python-facing prose: `0.4.0.dev3`
- npm metadata and browser-safe SemVer: `0.4.0-dev.3`

Keep application package metadata, lockfiles, UI/CLI display and changelog aligned.
Do not rewrite pinned source/content manifests or historical evidence merely to
match a UI version bump. `19.2`, `2026.08` and `0.4.0.dev3` describe different
source/application versions. The v3 prompt profile intentionally changes generated
prompt bytes and their hashes while retaining pinned sources. See
[versioning](versioning.md).

## Deterministic library generation

`npm run library:build` regenerates `demo/catalog.js`, the readable files in
`library/prompts/`, `library/procedures.jsonl` and coverage evidence from the
committed ATT&CK inputs. Use it only after an intentional generator, source or
shared-composer change, then inspect every generated difference.

`npm run library:verify` recomputes the expected bytes without writing and fails
on stale, missing or additional generated output. Never fetch a newer ATT&CK
release implicitly. A source upgrade needs a proposed migration with official
release identity, source hashes, license review, identifier diff and regression
evidence.

Coverage means exact parity with active records in the pinned source, not
detection effectiveness. Preserve the documented revoked/deprecated exclusions,
records without qualifying procedures and unlinked analytics.

`npm run atlas:build` generates the AI catalog and 197 text prompts separately
under `content/atlas/` plus `demo/atlas-catalog.js` and the public license notice.
`npm run atlas:verify` recomputes exact output bytes without writes, validates
pinned input hashes and rejects unexpected generated files. Routine verification
uses the checked-in JSON derivative and requires neither YAML tooling nor a
network connection. For a source upgrade, independently verify that the
derivative is an exact safe parse of the pinned official YAML before changing
the reviewed hash pins. See [ATLAS](atlas.md) for the scope and license policy.

`npm run d3fend:build` derives the supplementary defensive catalog, coverage and
public notice from pinned D3FEND inputs. `npm run d3fend:verify` validates source
hashes, strict file inventories and exact deterministic bytes without writes.
It runs in the normal static build; no network access is used. The browser and
`defenses ID` CLI command share `demo/defenses.js`. Default prompt bytes remain
unchanged. See [D3FEND](d3fend.md) for exact-ID joins, separate artifact paths,
source exclusions and inference limits.

## Prompt review evidence

Every prompt begins at validation status `generated` unless evidence proves a
higher state:

1. `generated` — deterministic content and structural checks only;
2. `reviewed` — two independent expert reviews pass the current rubric;
3. `lab-validated` — the associated behavior or rule passes reproducible,
   product-specific fixtures in a declared lab; and
4. `field-confirmed` — a maintainer-approved, sanitized production observation
   is attached without private telemetry.

Do not infer a status from a filename, parser result, model score or previous
version. Review evidence must bind to the prompt SHA-256, ATT&CK and content
versions, two distinct reviewer identities, dates and rubric version. If the
prompt bytes change, the old attestations remain historical but do not validate
the new hash.

A model evaluation is supplementary evidence. Record provider, exact model ID,
settings, date, prompt hash and response hash. Keep provider keys in the process
environment, never in manifests or results; do not submit analyst context or
private logs. Fixture-only evaluation must remain the CI default.

## Native rule and fixture workflow

Native rule contributions target a named product and syntax, not a generic claim
of support. Before adding an executable rule:

1. document the real telemetry source and required fields;
2. map the rule to a stable prompt/ATT&CK identifier and content hash;
3. include SPDX license and origin metadata for every external fragment;
4. add positive, benign-lookalike, missing-telemetry and boundary fixtures;
5. run the native parser/linter and fixture replay in a versioned environment;
6. record expected and observed results, environment version, fixture hashes and
   known limitations; and
7. obtain the required content and product-owner reviews.

If a product cannot observe the behavior, submit an evidence-backed
`not-applicable` assessment. An unassessed cell is not `not-applicable`.
Synthetic parser success is structural evidence and must not be labeled
`lab-validated`.

## Browser preview and QA

The workbench links to `demo/research.html`. Its six local research capabilities
are documented in [research tools](research-tools.md). Run `npm run car:verify`
for pinned CAR parity and `npm run research:check` for the added modules. The
existing browser smoke harness includes real research exports and lab imports.
`npm run build` verifies these inputs before copying the public allowlist.

Serve only the browser assets, never the repository root:

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory demo
```

Open `http://127.0.0.1:8766/`. Direct `file:` use also works, with browser
clipboard/storage limitations. Prefer loopback HTTP for repeatable browser
storage and cryptographic APIs. Context and edits remain in memory by default;
exports and unencrypted IndexedDB autosave require explicit user action.

Optional real-browser QA has a separate locked development boundary:

```sh
npm ci --prefix qa --ignore-scripts
node qa/node_modules/playwright/cli.js install chromium
node scripts/browser_smoke.cjs
```

The smoke script uses isolated browser state, synthetic input and a loopback
target. It writes ignored output below `work/browser-demo/`. `CHROME_PATH`,
`PLAYWRIGHT_MODULE` and `DEMO_URL` may select a reviewed local browser,
dependency or repository-prefix preview.

For premium UI acceptance, test Chromium, Firefox and WebKit from 320 through
1440 CSS pixels; keyboard-only use; zoom/reflow; reduced motion; dark and
high-contrast modes; persistent URL state; comparison; relationship views; and
all export paths. Record console and unexpected-network results. Automated
checks do not establish WCAG 2.2 AA: complete independent manual VoiceOver and
NVDA reviews before v1.0.

### Workspace development and failure paths

`demo/workspace.js` owns the portable contract and integrity/drift inspection;
`demo/workspace-store.js` owns atomic IndexedDB writes; `demo/workspace-ui.js`
owns consent, preview, workspace lifecycle and the application snapshot bridge.
`demo/workbench-ui.js` owns layout/commands and `demo/research-components.js`
shares CAR/Flow views without duplicating the composer. Read
[workspace format](workspace-format.md) and [ADR-0008](../governance/decisions/0008-portable-private-workspaces.md).

Focused checks, before the complete regression suite:

```sh
node --test tests/workspace.test.cjs tests/workspace_store.test.cjs tests/workspace_ui.test.cjs
node --test tests/premium-workbench.test.cjs tests/premium_contract.test.cjs tests/research_components.test.cjs
npm run research:check
```

The optional `scripts/premium_browser_checks.cjs` exports checks consumed by
the smoke harness; it is not a standalone test runner. Use isolated browser
profiles and synthetic workspaces, never the user's saved browser data. Verify
reload with and without consent; import cancellation/new identity; changed or
unknown sources; hash failure; concurrent edits and clear-epoch conflicts;
quota/unavailable storage; file recovery; and no unexpected network requests.
Do not turn a missing browser or skipped failure path into a passing claim.

With the locked QA package and its browsers installed, select each engine using
`BROWSER_ENGINE=chromium`, `BROWSER_ENGINE=firefox` or `BROWSER_ENGINE=webkit`
when running `node scripts/browser_smoke.cjs`. `DEMO_URL` must be loopback HTTP;
`PLAYWRIGHT_BROWSERS_PATH` may point to the installed browser cache. The report
records the engine/version and any screenshot or platform keyboard limitations.
Run native storage checks explicitly with `WORKSPACE_BROWSER_TEST=1 node --test
tests/workspace_store.test.cjs`; all three engines must be available. The ordinary
Node suite tests storage with deterministic transaction doubles; it does not
silently label absent native-browser checks as successful.

Never use the URL for workspace text. Disabling autosave preserves existing
saves; explicit clear deletes saved records, invalidates old handles and retains
the current memory workspace. A conflict must not silently pick a winner or
re-enable autosave: preserve edits and offer export or a new workspace copy.
Same-origin GitHub Pages applications can access each other's browser storage;
a project-specific database name is namespacing, not an isolation boundary.

Measure Core Web Vitals using a documented environment and sufficient field or
representative lab samples. The targets are p75 LCP ≤ 2.5 s, INP ≤ 200 ms and
CLS ≤ 0.1. A single local trace does not prove the p75 gate.

## CLI and export contract

CLI help is the authoritative option list. Commands list records, compose a
selected prompt or export filtered templates. Modes are `hunt`, `detect`,
`triage` and `validate`; targets must match the shared-core values.

Default list/export remains ATT&CK-only. `list --domain ATLAS` or
`list --framework ATLAS` selects AI; `--framework all` opts into both catalogs.
`prompt AML.T0051` selects an ATLAS record directly. `--domain OT` is an alias
for the existing ICS corpus, not an extra set of techniques. Framework identity,
content version and generated status accompany AI exports.

Context files must be regular UTF-8 files no larger than 16,000 bytes and 4,000
JavaScript string units. Export creates a new JSONL file exclusively, rejects
existing output and symlinked path components, and preserves source and analyst
text literally. The parent directory must exist. On macOS, use `/private/tmp`
instead of the `/tmp` symlink when checking canonical temporary paths.

Each row includes the SHA-256 of its UTF-8 prompt. Standard output reports the
record count and SHA-256 of the complete JSONL byte stream, including newlines.
Browser JSONL exports every filtered record; TXT copy/download uses the current
editor text exactly. No command makes model calls, uploads content or executes a
generated detection.

## Python foundation checks

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --only-binary=:all: -r requirements-dev.txt
python -m pre_commit validate-config
python scripts/check_foundation.py
python -m unittest discover -s tests -v
python -m ruff check .
python -m ruff format --check .
```

On Windows, activate `.venv\\Scripts\\Activate.ps1`. The development tools
are pinned at the top level, not as a complete transitive lock. Once files are
staged, `python scripts/check_foundation.py --tracked` also rejects tracked
excluded paths and symlinks. The pattern-based secret check is one layer, not a
complete security review.

## Evidence expected before handoff

| Area | Minimum evidence |
| --- | --- |
| Source | Official release/commit, raw hashes, license notice and reviewed diff. |
| Coverage | Exact source/catalog/prompt ID parity and explicit exclusions/gaps. |
| Prompts | Structural checks plus status-specific attestations bound to hashes. |
| Rules | Native lint/parser results, four fixture classes and lab metadata where claimed. |
| CLI | Help, selectors, context bounds, literal handling, hashes and safe refusal paths. |
| Browser | Required flows, repository prefix, browser/viewport matrix and manual accessibility results. |
| Static build | Exact public allowlist; no raw bundles, QA files, context or private data. |
| Release | Clean-build evidence, archive hash, SBOM, license report, signature and provenance. |

Report only commands actually run and outcomes actually observed. Zero discovered
tests is not a passing run. Record candidate-specific evidence in
[verification](verification.md), and follow [publishing](publishing.md) only
after review. A passing test does not authorize a push, deployment, tag, package
or GitHub Release.
