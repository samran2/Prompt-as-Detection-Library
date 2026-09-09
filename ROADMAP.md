# Roadmap

Prompt-as-Detection Library is moving from the published `0.3.0.dev3`
independent rebuild toward a trustworthy local-first research product. The next
development line is `0.4.0.dev0` (npm `0.4.0-dev.0`). It is a foundation, not a
stable release and not evidence that generated prompts detect malicious activity.

The pinned content baseline remains ATT&CK 19.2: 918 active techniques and
subtechniques (697 Enterprise, 124 Mobile and 97 ICS). A source update is a
separate reviewed migration. “Apple/VirusTotal quality” is an aspiration for
clarity, privacy, accessibility, evidence and operational discipline; it is not
an affiliation or data-scale claim.

ATLAS 2026.08 adds a separate 197-record AI corpus (114 techniques and 83
subtechniques), not extra ATT&CK coverage. All AI prompts remain `generated`.
Before including AI in stable v1.0, extend the evidence program with 394 real
independent reviews and framework-aware, hash-bound review contracts. Existing
ATT&CK scorecards and backend cells do not satisfy those AI gates.

## Preserved development baseline

The existing generator maintains exact identifier parity across 378 parent
techniques and 540 subtechniques, records 248 revoked/deprecated exclusions,
18,885 qualifying procedure relationships and 2,053 linked analytics. It keeps
13 unlinked active analytics, 24 ICS records without source platforms and 108
active records without qualifying procedures explicit rather than filling gaps.

The shared composer covers 918 records × four modes × six targets (22,032
combinations). The CLI retains bounded literal context, safe new-file export and
content hashes. The browser retains full-catalog search, pagination, source
details, local editing and export. The Pages build remains limited to its
explicit ten-file allowlist; raw source bundles, QA tools and analyst context
do not enter the static payload.

These are structural and workflow properties. They do not establish human review,
native-product validation or field-confirmed detection effectiveness.

## Non-negotiable release gates

- Preserve exact source, catalog and readable-prompt identifier parity for all
  918 active records, source hashes, licensing and explicit exclusions.
- Give every prompt two independent expert reviews. Record reviewer identity,
  review date and rubric version without manufacturing or backfilling reviews.
- Require 100% structural conformance, a mean expert score of at least 4/5 and
  zero critical source fabrication, dangerous instruction or unsupported
  validation claim before stable v1.0.
- Publish native rules only where a real product telemetry path and reproducible
  lab evidence exist. Use an audited `not-applicable` decision instead of an
  invented field mapping or rule.
- Keep local use first-class. Never upload prompts, logs or context by default,
  and never store credentials in evaluation or release evidence.
- Keep the existing CLI and static workbench compatible while contracts evolve.

## Phase 1 — `0.4.0.dev0` trust and contract foundation

Deliver versioned prompt, rule, review, validation and evaluation schemas;
governance and ownership records; contribution-evidence guidance; reproducible
catalog checks; a validation ledger; and hardened dependency and supply-chain
workflows. Existing prompt rows start as `generated` unless real review or lab
evidence proves a higher status.

Exit evidence:

- schemas reject missing provenance, impossible status transitions and malformed
  hashes while accepting documented fixtures;
- all 918 records have stable metadata and an explicit review state;
- repository policy, CODEOWNERS, DCO, support and security routes are reviewable;
- required Actions are allowlisted and SHA-pinned in the repository and in the
  remote settings; and
- current Node, Python, static-build and browser regression suites pass on the
  exact candidate commit.

Remote settings are not changed merely by adding repository files. Track their
desired state and observed verification separately in
[repository settings](docs/repository-settings.md).

## Phase 2 — independent prompt review

Review all 918 prompts twice using the same versioned rubric. Reviewers work
independently before disagreements are reconciled. Published scorecards include
coverage and aggregate results, not private reviewer notes or sensitive test data.

The rubric covers factual accuracy, ATT&CK alignment, telemetry feasibility,
benign behavior, safety, source traceability and platform assumptions. A model
evaluation can prioritize human work but cannot count as either expert review.
Every evaluation run records the exact model identifier, provider, settings,
date, prompt hash and response hash; secrets and private environment content are
never retained.

Exit evidence: 1,836 valid review attestations, two distinct reviewers per prompt,
resolved critical findings, rubric-score thresholds and a machine-checkable
scorecard tied to immutable prompt hashes.

## Phase 3 — native reference-rule packs

- **Enterprise:** select 100 cases with demonstrated telemetry paths for Panther,
  Microsoft Sentinel, Microsoft Defender XDR and Splunk, then implement and test
  the four native rules for each case: 400 lab-validated rules in total.
- **Mobile:** assess 100 cases against the same four targets and publish an
  executable rule only for supported telemetry paths; every other matrix cell
  receives a reviewed `not-applicable` rationale.
- **ICS:** assess all 97 active records using the same evidence policy and target
  matrix. Preserve source records that lack a platform or procedure instead of
  guessing missing context.

Each supported rule needs positive, benign-lookalike, missing telemetry and
boundary fixtures. Results record engine/runtime versions, fixture hashes,
expected and observed outcomes, known limitations and reviewer approval.
Parser or lint success is structural evidence, not lab validation.

Exit evidence: complete support matrices, reproducible fixture replay for every
supported cell, SPDX and origin data for every external fragment, and no
unassessed cell presented as supported or not applicable.

## Phase 4 — premium research workbench

Evolve the static workbench with a coherent design system, dark and high-contrast
modes, persistent URL state, comparison, technique–telemetry–rule relationships,
validation-level and provenance history, and research-data export. Preserve the
zero-runtime-dependency static distribution unless a reviewed architecture
decision changes that boundary.

Acceptance evidence includes:

- WCAG 2.2 AA automated checks plus documented manual VoiceOver and NVDA reviews;
- Chromium, Firefox and WebKit at widths from 320 to 1440 CSS pixels;
- p75 Core Web Vitals of LCP at most 2.5 seconds, INP at most 200 milliseconds
  and CLS at most 0.1 under the documented measurement profile; and
- no prompt, context or log content sent to analytics or another service.

Automated accessibility tests do not replace the independent manual audit.

## Phase 5 — v1.0 release candidate

Create a clean, reproducible candidate with an SBOM, license report, artifact
SHA-256 values, Sigstore signature and at least SLSA Build L2 provenance. Exercise
artifact installation/use, static-site rollback and release rollback. Preserve
tags and published evidence as immutable records; corrections use a new version.

Exit evidence: all prior gates, a clean rebuild from the tagged commit, reviewed
release notes, verified signatures/provenance and an independent release audit.
See [release process](docs/release-process.md) and
[versioning](docs/versioning.md).

## Phase 6 — read-only research API beta

After the local product is mature, add an opt-in portable TypeScript service,
PostgreSQL storage and OCI image. A versioned `/v1` API exposes techniques,
prompts, native rules, validation results, versions, relationships and search
using cursor pagination, ETags, content hashes, OpenAPI 3.1 and JSON Schema.
Provide STIX 2.1 export and a read-only TAXII collection.

The first API beta has no user accounts, model execution, log uploads or malware
samples. It needs rate limiting, a WAF, OpenTelemetry, a public status surface,
a 99.9% monthly availability objective and a catalog-search target of p95 below
250 ms at 100 requests per second under a declared load profile.

## Phase 7 — stable v1.0

Stable v1.0 is blocked until all 918 prompts have two independent reviews, every
domain support matrix is resolved, security and supply-chain gates pass, the
independent WCAG review is complete, and signed release evidence is available.
There is no date commitment before qualified reviewers and licensed product labs
are available. The read-only API beta may follow the local v1.0 and is not a
reason to weaken local-product gates.

## Later candidates

Potential follow-on work includes reviewed ATT&CK update proposals, additional
native targets, localized UI strings and a stable research API. Each requires its
own source, licensing, privacy, migration and regression review. The original
v0.2.0 archive remains unavailable; if recovered, preserve and compare it rather
than silently merging or claiming compatibility.
