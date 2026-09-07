# Changelog

This file records changes actually made. Dates and results from earlier
conversations are not independent verification of a release.

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

### Limits

- The original v0.2.0 archive, Python command and response evaluator remain
  unavailable; no implementation or export-format compatibility is claimed.
- Source gaps remain explicit: 24 ICS records without platforms, 108 active
  records without qualifying procedures, and 13 active unlinked analytics.
- All prompts remain unvalidated drafts. Current check outcomes are recorded in
  docs/verification.md; older audits do not transfer to this version.
- MIT project-code licensing, the public repository and demo are approved.
  The repository exists with its initialization license and private reporting
  enabled. Full-library push, hosted CI and Pages deployment remain pending;
  no package publication or release is claimed.

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
