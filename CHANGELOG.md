# Changelog

This file records changes actually made. Planned work belongs in
[ROADMAP](ROADMAP.md), and test outcomes belong in
[verification](docs/verification.md). Dates and results from earlier
conversations are not independent release evidence.

## [0.4.0.dev1] - Premium Workbench development snapshot

### Added

- Added named private workspaces with favorites, collections, original template
  hashes, per-draft context, applied/unapplied context, flow and view state.
- Added bounded 5 MiB JSON export/import with strict preview, new import identity,
  integrity checks and unresolved/source-drift warnings that preserve saved text.
- Added optional, consent-based unencrypted IndexedDB autosave, expected-revision
  conflict detection and clear epochs that invalidate stale storage handles.
- Added command search, adjustable list width, mobile list/detail navigation and
  grouped exports. Existing themes, literal text rendering and draft warnings remain.

### Changed

- Unified Prompt, Evidence, Defenses and Flow around the selected technique;
  comparison opens separately. CAR and Flow share components with Research tools.
- Kept manual robustness and lab-envelope sessions separate from saved workspaces;
  they remain in memory with explicit exports and never advance validation status.
- Preserved pinned ATT&CK, ATLAS, D3FEND, CAR and Attack Flow source content,
  detection prompt bytes, the shared composer and existing CLI contracts.

### Security and privacy

- Reject oversized, malformed, ambiguous or extra workspace fields before state
  replacement; imported templates are not silently rebased onto current sources.
- Stop autosave on stale writes, cleared storage or storage failure while retaining
  memory state for export or a new copy. Disabling autosave does not delete old
  saves; explicit deletion is separate and does not erase downloaded files.
- Document that browser storage is plaintext and origin-scoped: GitHub Pages
  project paths do not isolate same-origin applications from stored workspaces.

Verification and hosted deployment outcomes are tracked separately; this entry
does not claim completed browser, accessibility or release acceptance.

## [0.4.0.dev0] - Research and trust foundation

### Added

- Added a local Research tools page: ATT&CK Navigator 4.5 layer exports and
  tactic coverage, pinned MITRE CAR analytics, linear Attack Flow hypotheses,
  manual Summiting the Pyramid observable assessments and offline Caldera lab
  plan/result exchange. No attack execution, uploads or validation promotion.
- Added read-only proposed ATT&CK STIX version comparison with exact source
  hashes, lifecycle changes and impacted prompt IDs; pinned sources stay unchanged.
- Preserved CAR raw sources and Apache notices and the official Attack Flow
  extension/schema/license, with focused boundary and source-fidelity tests.
- Added pinned MITRE D3FEND 1.6.0 defensive context for 369 exact library IDs
  (311 Enterprise, 58 ICS/OT), with 154 related countermeasures, source-row
  provenance, separate artifact paths, offline source verification and notices.
- Added the D3FEND workbench tab and `defenses ID` CLI command with separate
  draft TXT/JSON exports, explicit unmapped/unavailable states and no analyst
  context leakage. Existing 918 ATT&CK and 197 ATLAS prompt bytes are unchanged;
  inferred relationships do not advance validation maturity.
- Added MITRE ATLAS 2026.08 AI coverage: 197 source-linked text prompts,
  preserved case-study/mitigation relationships, deterministic source pins,
  Apache-2.0 notices, separate CLI selectors and read-only `/v1/atlas` resources.
- Added ATLAS AI workbench filtering, cross-framework comparison, source maturity
  context and TXT/JSONL/research exports. Existing ATT&CK source and prompt bytes
  remain unchanged; all new AI prompts are generated drafts, not validated rules.
- Exposed OT as an alias for the existing 97-record ICS corpus in the workbench,
  CLI and API contract without double-counting coverage.
- Added all 25 Addy Osmani agent-skills as a pinned project-local snapshot,
  including shared checklists, original MIT notice, per-file SHA-256 inventory,
  Codex routing and an offline integrity check in the existing test/CI suite.
- Defined phased, evidence-based gates for independent review of all 918 prompts,
  native rule labs, premium workbench quality, a signed release candidate and a
  later read-only research API beta.
- Added separate release-process, versioning and repository-settings guides so
  policy-as-code is not confused with applied remote protection or a published
  release.
- Added a native-rule issue template and strengthened prompt-review and pull
  request evidence fields, including DCO, validation status and rollback impact.
- Added regression checks for required publication documentation and evidence
  language.
- Added an experimental loopback-first, read-only `/v1` research API contract,
  zero-dependency client, cursor pagination, ETags, content hashes, and strict
  versioned JSON Schema contracts.
- Added one automated static quality scorecard for every one of the 918 prompts,
  plus an evidence-graph validator that prevents review or validation maturity
  from resolving to unrelated records.
- Added an optional, local-only Rösti evidence importer that maps only
  provider-explicit active ATT&CK IDs and treats IOCs as unvalidated external
  corroboration.
- Added SHA-pinned Actions policy, Dependabot, dependency review, Gitleaks,
  CodeQL, OpenSSF Scorecard, container scanning, fuzz smoke tests, and manual
  release-evidence generation.

### Changed

- Split public demo deployment from stable release creation. A green local or
  hosted check is evidence, not publication authorization or proof of detection
  effectiveness.
- Made the v1.0 barrier explicit: two independent expert reviews for each prompt,
  resolved domain support matrices, independent accessibility review and signed
  supply-chain evidence.
- Refined the workbench with semantic light, dark, and high-contrast themes,
  visible focus, 44 px touch targets, explicit filter relationships, shareable
  state, comparison and evidence views, and 320 px / 200% text reflow.
- Replaced the resolved license TODO with a durable licensing record.

### Security

- Bounded Research API responses while streaming instead of after buffering.
- Rejected terminal control characters in CLI context before stdout rendering.
- Closed alternate GitHub Actions `uses` syntax and local-wrapper policy bypasses.
- Isolated repository test/build code from release-evidence OIDC signing authority.
- Narrowed the OCI context to exact runtime inputs and kept Rösti-derived output
  outside the repository.
- Removed credential assignments from Rösti command examples and required
  secret-manager injection.

### Limits

- No stable v1.0 release, package publication, human-review completion, native
  rule lab validation, WCAG certification, Sigstore signature or SLSA provenance
  is claimed by this development entry.
- ATT&CK 19.2 remains pinned. The original v0.2.0 archive and its implementation
  remain unavailable.

## [0.3.0.dev3] - Development prompt-quality update

- Documented a 30-prompt, three-domain semantic review and its limits in
  [the prompt quality report](docs/prompt-quality-review.md).
- Shared-template improvements cover schema/feasibility gating,
  mode/target contracts, analytic selection, domain-aware validation safety and
  source traceability. Regenerated all 918 text prompts and their coverage hashes;
  pinned ATT&CK data, catalog and procedures remain unchanged.
- Aligned version metadata, UI and QA reporting as `0.3.0.dev3` / `0.3.0-dev.3`
  to distinguish these prompts from earlier published artifacts.
- Added 13 prompt-quality regression tests, including corroboration of weak
  indicators informed by an [external public-summary comparison](docs/external-detection-review.md).
  No external rule code was imported or relicensed.
- The owner authorized publishing this update and the demo after verification.
  Actual full-suite, browser and hosted outcomes are recorded in
  [verification](docs/verification.md).
  These revisions are outside the earlier immutable security audit; no stable
  release or detection-effectiveness claim is made.

## [0.3.0.dev2] - Unreleased independent full-library rebuild

### Added

- Pinned official ATT&CK 19.2 source bundles and reproducible generation for all
  918 active techniques/subtechniques across Enterprise, Mobile and ICS.
- One readable, source-specific detection prompt per active record, exact
  coverage evidence, all 18,885 qualifying procedure relationships and linked
  analytic descriptions, source logs and tuning variables.
- Dependency-free local Node CLI for listing, composition and safe JSONL export
  with prompt and file SHA-256 values, sharing the browser composition core.
- Full-catalog browsing, 50-record pagination, source details and accurate
  coverage labels in the static workbench.
- Deterministic library verification before static builds and CI; a bounded
  16 MiB catalog allowance while other public files retain a 2 MiB limit.

### Changed

- Replaced current sample/restoration documentation with independent-rebuild
  provenance, complete coverage policy and local CLI instructions.
- Archive preview now requires full-library/browser checks as well as foundation
  checks. Public Pages deployment remains a manual owner decision.
- Retained prior verification as historical and replaced current report and
  screenshots with the actual full-library browser run.
- Fixed Windows drive/UNC root handling in generator path checks, with three
  regression tests; preserved all generated content unchanged.
- Added the owner-approved MIT project-code license, preserved MITRE terms,
  and included both notices in the existing static distribution notice.
- Completed a new full-library Codex Security source review and separate
  maintained secret scan, dependency advisory and upstream workflow-pin checks;
  their scope and limitations are recorded in docs/verification.md.
- Recorded the approved public repository and demo, enabled private vulnerability
  reporting, and a manual rollback procedure that preserves Git history.
- Published the complete library to the public repository and added a pinned
  CodeQL workflow for GitHub Actions, JavaScript and Python. This new workflow
  is outside the earlier immutable audit; hosted outcomes are recorded in
  [verification](docs/verification.md#hosted-publication-status).
- Corrected nested HTML-entity decoding in a test-only fake DOM parser and added
  a regression that failed before the correction. Product runtime is unchanged;
  final test and CodeQL outcomes are recorded in the verification record.
- Deployed the public workbench and verified its hosted UI and static asset
  integrity. Added the live-demo link, native workflow badges and an actual UI
  screenshot to the README; detailed results and limits are in the verification record.

### Limits

- The original v0.2.0 archive, Python command and response evaluator remain
  unavailable; no implementation or export-format compatibility is claimed.
- Source gaps remain explicit: 24 ICS records without platforms, 108 active
  records without qualifying procedures, and 13 active unlinked analytics.
- All prompts remain unvalidated drafts. Current check outcomes are recorded in
  docs/verification.md; older audits do not transfer to this version.
- MIT project-code licensing, the public repository and demo are approved.
  The complete library is pushed and private reporting is enabled. See the
  [verification record](docs/verification.md#hosted-publication-status) for hosted
  CI and demo outcomes; no package publication or release is claimed.

## [0.3.0.dev1] - Historical unreleased sample

### Added

- Working standalone browser demo with 12 explicitly labeled ATT&CK 19.2 samples.
- Search, domain/tactic/platform filters, four prompt modes, six output targets,
  in-memory editable drafts, exact text download and filtered-template JSONL export.
- Responsive layout, keyboard-operated tabs, visible focus and reduced-motion support.
- Strict eight-file static build boundary; dependency-free runtime and unit tests.
- Optional version-locked browser QA, source provenance and MITRE attribution.
- Manually confirmed GitHub Pages workflow, separate from any application release.

### Limits

- A documentation-only review of that historical sample clarified the archive-preview checks,
  updated contribution/roadmap version labels and separated demo-license review
  from recovery of the absent application. Runtime, workflows and sample data
  remained byte-identical to the security-reviewed 52-file snapshot at that time.
  This statement does not apply to the new dev2 full-library rebuild.
- This demo is new work, not recovered v0.2.0 code or complete ATT&CK coverage.
- Original application, CLI, complete dataset, licenses and reported security fixes
  still require recovery and review. No GitHub publication has taken place.

## [0.3.0.dev0] - Unreleased foundation

### Added

- English repository documentation and contribution, security, and conduct policies.
- Codex development instructions and source-recovery acceptance criteria.
- Python quality tooling, repository checks, and tests for that tooling.
- GitHub Actions configuration for foundation checks and manual archive previews.
- Issue and pull request templates, ignore rules, and editor settings.
- Coverage and premium UI requirements for the application integration phase.

### Pending

- Recover the original v0.2.0 source, prompts, and ATT&CK 19.2 dataset.
- Inspect original licenses and integrate package metadata without breaking the CLI.
- Verify the full technique/subtechnique coverage and content preservation.
- Implement and browser-test the workbench refinements.
- Run original application tests and build/install smoke tests.

## [0.2.0] - Prior conversation record

The earlier project conversation reports a local browser workbench, JSONL batch
export, structural response evaluation, and safer prompt interpolation. The ZIP
is unavailable in this workspace, so this entry is a historical description,
not confirmation that its files or tests have been recovered.
