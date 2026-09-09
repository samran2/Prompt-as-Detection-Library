# Verification records

## Research tools — local verification 2026-09-09

This development update adds six scoped offline capabilities. It preserves all
ATT&CK/ATLAS prompts, the shared composer and pinned ATT&CK/ATLAS/D3FEND source
bytes relative to `6460746dbd30010eb5de402e805b8a1b116735ad`. It retains version
`0.4.0.dev0`; software checks do not change review or validation evidence.

- Final Node regression run: **308 tests passed**, zero failures. API tests used
  explicit loopback permission; unprivileged agent attempts with EPERM are not
  counted as successful runs.
- Python foundation: **16 tests passed**; foundation artifact/credential-pattern
  check and existing/new JavaScript syntax checks passed.
- **52 Chrome 152.0.7977.83 checks passed**, including exact Navigator domain
  exports, CAR hypotheses and unmapped ICS, Flow reorder/remove and STIX export,
  literal manual assessment text, plan/template hashes, incomplete/foreign lab
  envelope rejection, successful unverified import, input invalidation, local-file
  loading, themes and 320/768/1024/1440 px layouts. No unexpected external request
  or main-page console error/warning was observed. Screenshots were inspected.
- Seven controller regressions cover stale asynchronous imports/exports, invalid
  CAR startup, enabled focus after reordering and local file bounds. Restoring
  previous unsafe patterns in memory caused the expected failures.
- Independent feature reviews verified Navigator/Flow, CAR/lab and STIX-diff
  boundaries. Required asynchronous-state, identifier-coercion, prototype-key and
  multiplicative-traversal issues were fixed and regression-tested. No concrete
  blockers remained in those reviewed scopes.
- CAR's 102 raw YAMLs match the official pinned commit; independent safe-decoder
  parity and join recomputation confirmed 117 active Enterprise IDs and five
  excluded obsolete IDs, without inherited mappings. Full notices are retained.
- An additional independent local full JSON Schema validation checked all six
  objects of a two-step Attack Flow export against official schema/core references.
  Ordinary Node tests verify format structure and source pins; they are not a full
  schema engine. No upstream Navigator/Flow interactive import is claimed.
- Root and isolated QA dependency audits reported zero known vulnerabilities.
  Build verification passed for ATT&CK, ATLAS, D3FEND, CAR, review registry and
  static evals, with the narrow public allowlist unchanged in principle.

This is scoped software verification, not a repository-wide Codex Security scan,
independent WCAG certification, real Caldera run, native-rule lab validation,
human review of prompts or production effectiveness proof. Hosted CI/Pages results
must be recorded after publication; this entry alone asserts no deployment.

## D3FEND development demo — hosted verification 2026-09-09

The application/content revision is
[`d7c53b6c18bdcec900cf0f04577ba052c884c7d9`](https://github.com/samran2/Prompt-as-Detection-Library/commit/d7c53b6c18bdcec900cf0f04577ba052c884c7d9),
merged through [PR #12](https://github.com/samran2/Prompt-as-Detection-Library/pull/12).
The remote tree matched the independently reviewed local tree exactly. All five
PR workflows completed successfully, including 240 Node tests, 41 Chrome checks
and Python 3.11–3.14 foundation checks (including pre-commit configuration).

The merged commit also passed
[Repository CI](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34399354756),
[CodeQL](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34399354452),
[supply-chain security](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34399354388),
[container security](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34399354455),
[fuzz smoke](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34399354319)
and [Scorecard](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34399354309).

[Pages run 34399403251](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34399403251)
was deliberately dispatched on that commit after PR checks and completed
successfully. All 13 public content assets returned HTTPS success and matched
the reviewed local bytes and SHA-256 values. The fourteenth file, `.nojekyll`,
is a publishing marker, not part of HTTP asset verification.

The live browser displayed the unchanged 1,115-record catalog and the new
D3FEND 1.6.0 tab. `T0800` showed six countermeasures; expanding Remote Firmware
Update Monitoring exposed both artifact relations and source rows 867, 3055
and 14205. The TXT download action reported success, with no browser warnings
or errors observed. Hosted downloaded-file bytes were not separately inspected;
exact TXT/JSON bytes and license retention passed in the local and PR-loopback
browser suites. This bounded live smoke is not independent WCAG certification
or detection-effectiveness evidence. The source/validation limits below remain.

## D3FEND 1.6.0 supplement — local verification 2026-09-09

The D3FEND addition retains application version `0.4.0.dev0` and all 918 ATT&CK
and 197 ATLAS prompt bytes. It adds inferred defensive research context, not
human-reviewed detections or validated controls. The following checks were run
locally before publication; hosted outcomes must be recorded separately.

| Check | Observed result |
| --- | --- |
| Node regression suite | 240 tests passed, zero failures/skips. The initial sandboxed attempt could not bind local API test servers; the complete rerun passed with loopback permission. |
| Foundation | 16 Python tests passed; foundation credential/artifact patterns, Ruff lint/format and JavaScript syntax passed. The local pre-commit module is unavailable; no local pre-commit success is claimed. |
| Data integrity | ATT&CK, ATLAS, D3FEND, review-registry and static-evaluation read-only verification passed. D3FEND preserves 14,830 matching source rows as 10,892 distinct paths for 369 exact local IDs, with 154 relation-bearing defensive techniques. |
| Browser | 41 Chrome checks passed: existing workbench regressions plus D3FEND paths, separate exact-byte TXT/JSON exports including notices, private-context exclusion, unmapped/unavailable states, literal hostile text, allowed links, keyboard tabs and 320/1440 px layouts. Screenshots were visually inspected. No unexpected external requests or main-page console errors/warnings were observed. |
| Independent review | A separate agent reconciled every accepted source row and reviewed data, UI, helper and CLI boundaries. One required detached-export license issue was corrected and verified; no required findings remained in that scope. This was not a new full Codex Security scan or human domain validation. |
| Static payload | A fresh fourteen-file allowlisted build passed. Original ATT&CK/ATLAS inputs, catalogs, composer and text prompts have no diff. Raw ontology/mapping inputs and private working files remain outside the public build. |

The D3FEND catalog adds approximately 5.58 MB uncompressed. Local smoke timing
is not field Core Web Vitals evidence. Firefox/WebKit, independent accessibility,
real expert/lab review and stable-release evidence remain incomplete gates.
Historical reports and screenshots below do not validate these newer changes.

## ATLAS development demo — 2026-09-09 verification

The application and content revision is
[`c2b1c7167a180aed3a7ae6f929575e6da2d0bd41`](https://github.com/samran2/Prompt-as-Detection-Library/commit/c2b1c7167a180aed3a7ae6f929575e6da2d0bd41),
merged through [PR #10](https://github.com/samran2/Prompt-as-Detection-Library/pull/10).
The version remains `0.4.0.dev0` / `0.4.0-dev.0`. This record supersedes earlier
deployment status, not the scope of historical tests or security reviews.

| Check | Observed result |
| --- | --- |
| Local Node suite | 215 tests passed with zero failures. Localhost binding was permitted for API and ATLAS server contracts. |
| Local foundation checks | 16 Python tests and 17 subtests passed; JavaScript syntax, the four pinned-skill tests and tracked-file foundation checks passed. The current follow-up environment did not have the pre-commit Python module; no new pre-commit result is claimed. |
| Content and build | Read-only build verification passed for 918 ATT&CK prompts, 18,885 ATT&CK procedure relationships and 197 ATLAS prompts with 1,318 source relationships. The fresh static payload contains ten allowlisted files, including both framework notices and the `.nojekyll` publishing marker. |
| Hosted CI | [Repository CI](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34394820210), [CodeQL](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34394819939), [supply-chain security](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34394819919), [container security](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34394819988), [fuzz smoke](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34394819955) and [Scorecard](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34394819986) completed successfully for this commit. Workflow success is not proof of complete coverage or perfect repository settings. |
| Pages and browser suite | [Pages run 34394863019](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34394863019) passed checks, build and deployment. Its logs record 215 passing Node tests and 34 passing Chromium browser checks, including AI filtering, source attribution, literal context, exact TXT/JSONL/research downloads, mixed-framework comparison and 320/1440 px AI layouts. These browser tests ran against the built payload on loopback in GitHub Actions. |
| Hosted asset integrity | All nine public content assets returned HTTPS success and matched the local reviewed source bytes and SHA-256 values. The tenth file, `.nojekyll`, is a publishing marker and was excluded from HTTP asset comparison. |
| Live browser smoke check | The public workbench displayed 1,115 records and the correct pinned versions. OT filtering returned 97 ICS records; ATLAS filtering returned 197 AI records; exact search for `AML.T0051.001` opened its parent-linked subtechnique. This is a bounded hosted smoke check, separate from the 34 automated checks. |

The committed [browser report](browser-report.json) remains the earlier
26-check, 918-record pre-ATLAS 0.4 run; it is not the current ATLAS browser
report. Current hosted evidence is linked above. The screenshots are illustrative
records of their respective runs, not independent accessibility certification.

This is an owner-authorized development demo. Stable v1.0 still requires the
real independent prompt reviews, native-product laboratory evidence,
framework-aware ATLAS review contracts, independent accessibility assessment,
field performance evidence and verified signed release/rollback evidence in the
[release process](release-process.md). No generated prompt is promoted to
reviewed, lab-validated or field-confirmed by these software checks.

## Project engineering skills — GitHub integration follow-up

The first [PR #9](https://github.com/samran2/Prompt-as-Detection-Library/pull/9)
CI run at `f391a8c2bfabb250d415878fa010e33dca8df144` passed library/browser,
CodeQL, dependency, secret, fuzz and container checks. All four Python jobs
failed at Ruff formatting because Ruff 0.16.4 also formats Python examples in
Markdown and proposed changes to the upstream `code-simplification` skill.

The failure reproduced locally with `python3 -m ruff format --check --no-cache .`.
The follow-up excludes only the imported skill/reference directories from Ruff
formatting; lint, source hashes and credential checks remain enabled. The
upstream snapshot is unchanged. Local Ruff lint/format, four skill-integrity
tests, seven documentation tests, foundation and whitespace checks passed after
the correction. Hosted results for the corrected commit must be
read from the PR checks; this record does not imply they have completed.

## Project engineering skills — 2026-09-09 local verification

The development-only agent-skills integration pins Addy Osmani's upstream
commit `6ca0cd7db39b41b1c37e26d335c507ee92382c6d`. All 38 imported Git blobs and
file modes matched that upstream tree before commit, including 25 skills,
seven shared references, supporting skill files and the original MIT notice.

- `npm test`: 185 tests passed, including four new skill-package checks.
  Local API tests ran with loopback binding permitted.
- `python3 -m pytest -q`: 16 tests and 17 subtests passed.
- `npm run check`, foundation checks including tracked paths, and staged
  whitespace checks passed. No credential-pattern exclusions were added.
- Integrity checks verify the complete imported inventory, SHA-256 values,
  executable bits on POSIX, skill frontmatter and shared reference resolution.
  The static and OCI build boundaries continue to exclude development skills.

Application, CLI, browser assets and ATT&CK content were unchanged. No new
browser interaction, hosted CI, deployment or skill-picker refresh is claimed
for this integration. See [the guide](agent-skills.md) for project-root discovery
and host-specific tool prerequisites. The earlier application evidence follows.

## Historical pre-ATLAS 0.4.0.dev0 candidate — local verification

Observed locally on 2026-09-09 (Europe/Helsinki). This is development-candidate
evidence, not a stable release, human detection review, independent WCAG
certification, or proof of hosted GitHub settings.

| Check | Actual result |
| --- | --- |
| Full Node suite | 181 tests passed with zero failures or skips. This includes the exhaustive 22,032 prompt-composition matrix, schema/evidence graph, CLI, API, Rösti, supply-chain, workbench, maturity-gate and generated-content checks. |
| Python foundation suite | 16 tests passed. The tracked-file foundation and selected credential/artifact checks also passed. |
| Prompt and source integrity | Read-only verification passed for 918 prompts, 18,885 procedure relationships, 918 review-registry records, 3,672 explicitly unassessed native-rule cells and 918 automated static scorecards. No human review or lab maturity was inferred. |
| Static build | A fresh eight-file workbench build succeeded after removing the prior ignored build directory. |
| Real-browser workbench | 26 Chromium checks passed in the delegated isolated run: clean console/network, accessibility tree, skip/focus behavior, light/dark/high-contrast action contrast, 44 px touch targets, reduced motion, empty/download flows, 320/768/1024/1440 layouts and 200% text. Desktop and mobile screenshots were visually inspected. |
| Security | Codex Security scan `4745032c-8b30-4540-8337-831913f7976c` found three Medium and three Low issues in immutable revision `343103d4a3f615969f29122678317a634d5983cf`; no Critical or High issue was reported. All six received code and regression fixes. Complete zero-finding diff reviews then covered the 0.4 changes in contiguous ranges: `c3d5048b-f033-4114-879b-04a8d5b92e2f`, `624e59e8-c7c8-45ba-9ea6-4b4db7aebf1d`, `38aba521-dfb3-405d-899e-3938f15fe2a8`, `80114560-87d6-40e4-b965-bedfbff6462e` and final scan `b9655d59-de04-4118-8806-3a866c11250a`. The last scan reviewed all 12 authoritative changed paths despite a two-row generated inventory. These local reviews do not replace the blocking hosted container scan or guarantee absence of vulnerabilities. |
| Remaining browser evidence | Firefox, WebKit, manual VoiceOver/NVDA, an independent WCAG 2.2 AA audit and field Core Web Vitals remain release gates rather than completed claims. |

## Current prompt-quality update — 0.3.0.dev3

Observed locally on 2026-09-08 (Europe/Helsinki). The
[semantic review](prompt-quality-review.md) examined 30 risk-stratified prompts
and the shared composer; it was not manual semantic evaluation of all 918
records. The [external comparison](external-detection-review.md) used public
descriptions only, not registration-gated rule code. No external rules were
imported. The original v0.2.0 archive remains unavailable.

| Check | Actual result |
| --- | --- |
| Test-first regressions | The initial 12 new contract tests failed before implementation and passed afterward. The subsequent corroboration test also failed before its clarification and passed afterward: 13 new tests total. |
| Full Node suite | 91 tests passed, zero failures or skips. Includes CLI/export boundaries and the exhaustive 22,032-composition matrix; those compositions are not additional test cases or model evaluations. |
| Source and generated integrity | Read-only regeneration verification passed for all 918 TXT prompts and coverage evidence. Raw sources, source manifest, catalog and complete procedure JSONL remained byte-identical to the preceding committed version. The 697 Enterprise, 124 Mobile and 97 ICS records, 18,885 procedure relationships and 2,053 analytics are unchanged. |
| Foundation tests and checks | All 14 Python tests passed; required-file/version and selected credential/artifact checks passed. |
| Syntax and tooling | JavaScript syntax, Ruff lint/format and pre-commit configuration validation passed. Root/QA dependency versions were unchanged; locked optional QA installation reported zero known vulnerabilities. |
| Static build | A fresh verified eight-file build succeeded. No backend, external model call or new runtime dependency was added. |
| Real-browser integration | All 22 checks passed against the final built dev3 site using isolated Chrome: filtering, source context, modes, draft handling, inert input, copy denial, exact TXT/JSONL downloads, keyboard/dialog behavior, reload clearing and direct local-file launch. |
| Visual and responsive review | Final desktop and mobile screenshots were visually inspected. Automated checks found no horizontal overflow at 320, 768, 1024 or 1440 pixels or 200% text scaling; reduced-motion checks passed. |
| Browser network/errors | No unexpected external requests, console warnings/errors or page errors in the tested HTTP flows. |
| Secret scan | Maintained Gitleaks 8.30.1 directory scan, default rules with full redaction and a 128 MB per-file ceiling, scanned approximately 135.45 MB with no leaks reported. This is a directory result, not proof about unknown secret formats or all Git history. |
| Independent review | Domain and shared-contract reviews approved the bounded composer change and its tests. A final separate review approved the corroboration clarification, its regression and the external-source limitations. |

Local tools: Node.js 24.13.0, Python 3.13.7, Ruff 0.16.4 and Playwright 1.62.1
with an isolated installed Chrome. Task-local caches and test output are excluded
from publication. The dev3 browser report and screenshots remain available in
Git history and their original delivery archives. Shared evidence paths have
since advanced; see the current verification record above for their scope.

These checks establish the reported structural behavior, not detection
effectiveness, model compliance, product compatibility, complete accessibility
or absence of vulnerabilities. The prior immutable Codex Security audit below
does **not** cover the changed dev3 composer and regenerated prompts. Hosted
outcomes are recorded separately from local checks.

## Dev3 hosted publication

Observed on 2026-09-08 (Europe/Helsinki), at the owner-approved repository and
demo destination. These hosted checks are separate from the older offline audit.

| Item | Observed result |
| --- | --- |
| Reviewed update | Published to `main` as [`bf113bd9c62c94103470bd0277b4044ab8cba1b1`](https://github.com/samran2/Prompt-as-Detection-Library/commit/bf113bd9c62c94103470bd0277b4044ab8cba1b1). |
| Repository CI | [Run 34167768740](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34167768740) succeeded in all five jobs, including the built-site browser checks and Python 3.11–3.14 foundation checks. |
| CodeQL | [Run 34167768534](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34167768534) succeeded. The open code-scanning alert API returned an empty list after this run; no alerts were dismissed or suppressed. |
| Repository discovery | A real browser confirmed the prominent **Try it in your browser / Open the live demo** link, dev3 version and both review-guide links on the public repository homepage. |
| Pages deployment | [Run 34167896352](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34167896352) succeeded through checks, build and deployment on the same reviewed `bf113bd9c62c94103470bd0277b4044ab8cba1b1` commit, deliberately dispatched with `publish_demo: true` after CI and CodeQL passed. |
| Live browser | The [public workbench](https://samran2.github.io/Prompt-as-Detection-Library/) showed dev3 and 918 records. Confirmed PowerShell search, Hunt/Sigma formatting, readiness/corroboration clauses, analytic references, source panel, ICS offline validation, Mobile collection prerequisites, and page 19 with 18 records. No console warnings/errors or horizontal overflow at the observed 837-pixel viewport. |
| Live exports | TXT and filtered JSONL actions were exercised; the app reported a one-record JSONL export. Hosted downloaded-file bytes were not independently inspected. Exact downloaded bytes were checked by the local and hosted-loopback browser suites. |
| Hosted asset integrity | Independent verification found all seven content assets returned HTTPS 200 with expected MIME types and exact bytes/SHA-256 matching the reviewed commit and local sources. Both license notices remained intact. `.nojekyll` returned 404 and was treated separately as a publishing marker. |

Pages emitted nonblocking Node.js 20 deprecation warnings for the pinned
deployment action and the upload action's nested artifact action; GitHub ran
them under Node.js 24 and all jobs succeeded. These workflow warnings are not
browser console errors. The subsequent publication-evidence documentation commit
does not change the seven deployed content assets and requires no new deployment.

## Historical independent full library — 0.3.0.dev2

Current source and output scope is described in
[provenance](source-provenance.md) and [coverage](../library/coverage.json).
This is a new implementation snapshot. Earlier sample/foundation test and
security-review results below do not transfer to its generator, CLI, full
catalog or updated browser workbench.

The documentation/build slice has run eight static-builder boundary tests on
Node.js 24.13.0: all passed. The new larger-catalog regression failed under the
old 2 MiB limit before the catalog-only 16 MiB allowance was implemented.
The suite also checks the unchanged limits for other public assets, exact file
allowlisting, literal bytes, symlink/binary/credential rejection and overwrite
refusal. This does not establish full-library or detection validation.

Additional checks completed locally for the documentation/build integration:

| Check | Actual result |
| --- | --- |
| `npm run library:verify` | Passed: 918 technique prompts and 18,885 documented procedure relationships; expected generated bytes matched. |
| `npm run check` | Passed JavaScript syntax checks for core, catalog, UI, generator, CLI and static builder. |
| `npm run library:help` | Passed; documented Node CLI help is available. |
| Root and QA metadata | Package names and all dev2 version spellings agree. |
| Local Markdown links | 42 relative file links resolved. |
| Workflow YAML parsing | All four workflows parsed successfully with Ruby's YAML parser; this is local syntax validation, not hosted execution. |
| Foundation checker | Passed required-file/version and selected text-pattern checks. |
| Optional QA dependency audit | `npm audit --prefix qa --audit-level=high` reported zero vulnerabilities on 2026-09-07. The first attempt lacked network resolution; the network-enabled retry succeeded. No dependency versions changed. |

Final integration checks used macOS, Node.js 24.13.0, Python 3.13.7,
Ruff 0.16.4, Playwright 1.62.1 and an isolated Chrome 152.0.7977.82:

| Check | Actual result |
| --- | --- |
| Full Node suite | 77 tests passed, no failures or skipped tests. Includes 13 generator, 13 independent coverage, 14 CLI and 8 static-builder tests. |
| Foundation regression suite | 14 tests passed. This tests repository tooling, not the unavailable original application. |
| Independent source oracle | Exact 918 active source/catalog/text ID sets, 378 parents, 540 subtechniques, 18,885 complete procedures, 918 strategies and 2,053 linked analytics matched. All 248 historical exclusions and 13 unlinked analytics reconciled. |
| Prompt matrix | All 22,032 technique/mode/target compositions checked for distinct, complete, literal, traceable draft output. This matrix is exercised within the Node suite, not 22,032 extra test cases. |
| Generated output integrity | All 920 catalog/procedure/prompt file hashes and byte counts matched coverage evidence. Read-only verification also checked coverage.json itself. Source and composer hashes matched. |
| Static build | Fresh verified eight-file build passed. The 8,310,689-byte catalog remained under its 16 MiB cap. Public assets matched source bytes. |
| Real-browser integration | 22 checks passed against the built site under /Prompt-as-Detection-Library/: pagination, domains/filters, full source guidance, modes, draft/context handling, inert markup, copy denial, TXT and JSONL downloads, keyboard tabs/dialog and reload clearing. |
| Responsive review | No horizontal overflow at 320, 768, 1024 or 1440 pixels or with 200% text scaling; reduced-motion emulation passed. Desktop and mobile screenshots were visually inspected. |
| Browser network/errors | No unexpected external requests, HTTP-page console warnings/errors or page errors during the tested flows. Direct local-file launch also worked. |
| Python lint/format | Passed. Immutable upstream raw files are excluded from formatting only; source integrity and credential-pattern checks still inspect them. |
| Hook configuration | pre-commit 4.6.2 validation passed in a task-local tool environment; dependency consistency passed. Hooks were not installed into a Git repository. |
| Final workflow YAML | All four workflows parsed after aligning CI with the built-site repository prefix. Hosted execution is not claimed. |
| Focused independent code review | Reviewed generator, core and static builder trust boundaries. Found and fixed Windows drive/UNC root duplication; three path regressions added. No Windows OS run or filesystem-race simulation was performed. |

The browser report and desktop/mobile screenshots at that historical revision
describe this full-library build, not the earlier sample. The ZIP is paired
with a SHA-256 file and a delivery verification manifest recording exact archive
membership, file hashes, byte comparisons and integrity checks. Local QA tools,
caches, Git history, private work and dist are not part of that repository ZIP.

The old sample test's mandatory trailing URL slash and the browser test's
unbounded result-count assumption were corrected against actual pinned source
and pagination behavior. Source URLs and records were not altered to fit tests.
The default sandbox blocked local browser/server launch; scoped local-test
permission allowed the successful isolated run.

### Publication review — 2026-09-08 (Europe/Helsinki)

- New standard Codex Security scan: `3c7390d6-d292-4985-bf83-88443b9b2db7`,
  completed with zero reportable findings. Target was the immutable 991-file
  full-library snapshot; its snapshot digest was
  `codex-security-snapshot/v1:sha256:64c9aec6738eee22ced24767c5aa33da5e1d1495189b3dc623cfff54f24ec001`.
- Independent baseline and architecture reviews, focused publication-pipeline
  investigation and parent validation fully reviewed 58 application, tooling,
  workflow, test, policy and documentation files. All 169 threat-model source
  citations resolved. Bulk generated/vendored narratives were not individually
  manually security-reviewed; their generators and literal consumers were.
- The audit was offline and did not execute application code. External action
  implementations, live hosting, downstream models/detections, Windows ACLs and
  hostile shared-directory race guarantees were not established.
- Separate publication preflight verified all six workflow action SHA pins
  against official upstream tag references. QA lockfile advisory review reported
  zero vulnerabilities; it used package-lock-only and disabled install scripts.
- Maintained Gitleaks 8.30.1 directory scan passed with no leaks, full redaction,
  default rules and a 128 MB per-file ceiling. The official Darwin arm64 archive
  digest matched the official release checksum and asset metadata. No pre-existing
  Git history existed in the publication copy. Unknown secret formats remain
  outside any scanner's guarantee.
- The publication copy added the approved MIT project-code license, licensing
  metadata and documentation. Full MITRE and project MIT notices are included in
  the existing public notice file. Runtime, generated library/source bytes
  and the original four workflows remain unchanged from the audited snapshot.
  The later `.github/workflows/codeql.yml` addition and test-fixture correction
  are outside that immutable audit; their verification is recorded separately below.
- Publication-copy recheck: all 77 Node tests and 14 Python foundation tests
  passed again, as did generated-library verification, JavaScript syntax,
  foundation checks and Ruff lint/format. A fresh eight-file static build matched
  its demo sources, including both complete license notices.

No model or detection-platform validation, screen-reader audit, complete WCAG
audit or absence-of-vulnerabilities guarantee is claimed. Earlier sample audits
remain historical and were not used as approval for this implementation.

### Hosted publication status

Observed on 2026-09-08 (Europe/Helsinki). The owner approved the public repository
and public demo. Repository setup and hosted execution are separate from the
earlier offline audit.

| Item | Observed result |
| --- | --- |
| Full-library push | Succeeded to public [samran2/Prompt-as-Detection-Library](https://github.com/samran2/Prompt-as-Detection-Library), `main` commit [`225812b9367931e75736908187b8eb854e047374`](https://github.com/samran2/Prompt-as-Detection-Library/commit/225812b9367931e75736908187b8eb854e047374). |
| Initial Repository CI | [Run 34164977469](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34164977469) succeeded in all five jobs, including Python 3.11–3.14 and browser checks. |
| Initial CodeQL | [Run 34164976981](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34164976981) succeeded in all three language jobs but reported alert 1, `js/double-escaping`, in `tests/ui_state.test.cjs`. Successful analysis does not mean no alerts. |
| Test-fixture correction | Static triage located repeated HTML-entity decoding in a test-only fake DOM parser; it is absent from the runtime, CLI and eight-file demo. Decoded values remain fake text. A focused regression failed before the correction; all nine focused tests and the full 78-test Node suite passed afterward. Independent review approved the bounded change, published as [`441053ebc19f3fae136f84543137f64fb2b23141`](https://github.com/samran2/Prompt-as-Detection-Library/commit/441053ebc19f3fae136f84543137f64fb2b23141). |
| Correction Repository CI | [Run 34165241762](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34165241762) succeeded on the correction commit. |
| Correction CodeQL | [Run 34165241593](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34165241593) succeeded in all three jobs. The open-alert API returned an empty list; alert 1 changed to `fixed` automatically at `2026-09-07T22:03:01Z`, with no dismissal or suppression. |
| Private vulnerability reporting | Enabled and verified on the public repository. |
| Security policy history | The GitHub initialization template history was retained while preserving the reviewed substantive root policy; no new exclusions or accepted risks were introduced. |
| Pages configuration | Workflow source, HTTPS enforced, and the `github-pages` environment restricted to `main`. No environment reviewer is configured. |
| Pages deployment | [Run 34165337041](https://github.com/samran2/Prompt-as-Detection-Library/actions/runs/34165337041) succeeded through checks, build and deployment on `441053ebc19f3fae136f84543137f64fb2b23141`, dispatched with `publish_demo: true`. The [public workbench](https://samran2.github.io/Prompt-as-Detection-Library/) loaded successfully in a real browser. |
| Live browser verification | Confirmed 918 records; exact PowerShell search `T1059.001`; Hunt/Sigma composition and source panel; Mobile 124 and ICS 97; last page 19 of 19 with 18 records. Desktop was visually reviewed; the 390-pixel mobile view had no horizontal overflow. No console warnings or errors were observed. |
| Hosted exports | The app reported a TXT request and a one-record JSONL export. The native browser automation download-event hook timed out, so hosted downloaded-file bytes were not validated. The existing 22 loopback browser checks, including download validation, passed in CI. |
| Hosted asset integrity | All seven content assets returned HTTPS 200 with expected MIME types and SHA-256 values matching the reviewed source. `.nojekyll` returned 404; it is a publishing marker rather than an interactive asset. |

The Pages workflow emitted a nonblocking Node.js 20 deprecation warning from
the upstream upload-pages-artifact action's nested upload-artifact action; the
runner automatically used Node.js 24. Action pins were retained. This workflow
warning is separate from the live browser's clean console result.

## Historical static demo 0.3.0-dev.1

This section covers the newly built 12-record sample, not the original application.
Local checks used macOS, Node.js 24.13.0, Python 3.13.7, Playwright 1.62.1 and
an isolated installed Chrome. The machine ran out of disk space during an early
QA dependency-lock operation; only the task-created, reinstallable foundation
tool environment was removed. Tests failing solely from unavailable temporary
storage were rerun successfully after that cleanup.

- 17 Node tests: filtering, catalog IDs, literal input, invalid options, JSONL,
  all 288 composition combinations, and five static-builder boundary tests.
- 20 real-browser checks: search/empty state, domains/filters, modes/targets,
  edited-draft preservation, explicitly applied context, inert markup, clipboard
  denial, exact text download, filtered JSONL, keyboard tabs/dialog, reload clearing,
  widths 320/768/1024/1440, 200% text scaling, reduced motion, no unexpected
  requests/HTTP-page console errors, and local-file launch.
- 14 foundation regression tests rerun. Python lint and formatting passed before
  removing the temporary tool environment; Python source was not modified afterward.
- Independent read-only review found no blocking issues in the static demo and
  builder. Context-application clarity and keyboard panel access were improved.
- The locked optional browser-QA dependency tree returned zero reported
  vulnerabilities from `npm audit` on 2026-09-07. The browser runtime has no npm
  dependencies. This advisory lookup is not proof of absence of vulnerabilities.

The historical browser report and desktop/mobile screenshots remain in the
separate sample delivery. Files at docs/browser-report.json and
docs/screenshots/desktop.png and mobile.png have now been replaced by actual
full-library browser renders. Neither version is an AI-generated concept image.
JavaScript checks are syntax and behavior checks, not a comprehensive style lint.
No full WCAG/screen-reader audit, cross-browser certification, model evaluation,
detection-platform validation, hosted Pages run or original application test was
performed. The earlier Codex Security scan covered the 29-file foundation only;
it is **not** a security approval for this new demo. Limited credential signature
checks and review do not replace a maintained secret scanner before publication.

## Historical foundation 0.3.0.dev0 verification

The remainder records the previously delivered 29-file foundation, before this
demo was added. Its statements about absent UI apply to that earlier artifact.

## Scope

This record covers the repository foundation only. The original v0.2.0 archive
was unavailable. No application code, ATT&CK data, prompts, browser UI, or original
tests are included or verified in this package. The requested complete project
continuation remains unfinished.

## Checks performed

Local environment: macOS, Python 3.13.7, an isolated development environment,
Ruff 0.16.4 and pre-commit 4.6.2. Dependency installation used binary wheels.

| Check | Result |
| --- | --- |
| Foundation checker unit tests | 14 passed. |
| New tracked-file gate regression tests | 5 failed before implementation and passed afterward, included in the 14 above. |
| Required foundation files and VERSION | Passed. |
| Selected credential patterns and local artifact checks | No findings in the scanned foundation files. |
| Python lint and formatting | Passed. |
| pre-commit configuration validation | Passed, with cache directed to a task-local directory. |
| Dependency consistency (`pip check`) | No broken requirements found; this does not check vulnerability advisories. |
| YAML parsing and workflow structure checks | Passed for both workflows and the hook configuration. |
| Local Markdown links | 23 existing cross-file links checked and resolved before this report was added. |
| Independent review | One archive-file selection issue found and corrected; focused re-review confirmed resolution. |
| Foundation delivery ZIP | 29 files checked against the source folder byte for byte; ZIP integrity passed; no Git history, virtual environment, or cache directories included. |

The tracked-file gate was exercised in temporary Git repositories. No Git
repository was initialized in the delivered foundation. The archive workflow
now rejects excluded tracked paths and symlinks before packaging and uploads
only its newly generated ZIP and checksum from a fresh temporary directory.

The secret checker covers selected private-key, GitHub-token, OpenAI-project-key,
and AWS-access-key patterns. It does not scan excluded directories, binary or
non-UTF-8 content, or Git history; the tracked-file gate rejects excluded paths
and symlinks rather than scanning their contents. This is not a comprehensive
credential audit.

## Not performed

- Original application tests, CLI compatibility, bulk exports, and response evaluation.
- ATT&CK 19.2 source identity, exact technique coverage, prompt quality, or procedure preservation.
- Browser, accessibility, responsive-layout, or runtime performance checks.
- Wheel/source package builds or clean application installations; package metadata is deferred.
- Tests on Python versions other than 3.13.7 or other operating systems.
- GitHub-hosted CI execution, branch protection, or an actual release workflow run.
- A complete dependency vulnerability audit or external secret-scanner run.
- License selection, Git initialization, committing, remote creation, or publication.

These remain integration/release tasks in ROADMAP.md and docs/publishing.md.
