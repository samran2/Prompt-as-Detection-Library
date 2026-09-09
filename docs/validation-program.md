# Validation Program

## Honest baseline

All 918 active ATT&CK 19.2 techniques and subtechniques currently have generated
text prompts and structural coverage checks. That is not independent human review,
model-quality evidence, native-rule validation, or production confirmation. The
current prompts remain `generated` unless an evidence record proves a higher state.

The v1.0 program converts those drafts into evidence-backed research objects. It
must never infer a validation status from catalog coverage, a passing parser, a
model's self-report, or the presence of a review template.

## Promotion states

| State | Minimum evidence |
| --- | --- |
| `generated` | Schema-valid content, provenance, source hash, and explicit limitations. |
| `reviewed` | Two independent eligible human reviews bound to the same content hash. |
| `lab-validated` | `reviewed`, plus repeatable native-backend fixtures and recorded observed results. |
| `field-confirmed` | `lab-validated`, plus approved field evidence with privacy-safe publication notes. |

Promotion is per object version and backend. A Panther result does not validate a
Sentinel, Defender, or Splunk implementation. A parent technique result does not
validate its subtechniques.

## Human review

Every one of the 918 prompt versions needs two independent reviews before stable
v1.0. Reviewers score each criterion from 1 to 5:

1. factual accuracy and fidelity to cited sources;
2. ATT&CK behavior and tactic alignment;
3. feasible, explicitly named telemetry requirements;
4. benign-lookalike and false-positive treatment;
5. safe, bounded instructions with no unjustified execution;
6. usable and verifiable citations;
7. platform and backend assumptions stated without invented fields.

The release threshold is 100% schema conformance, a mean human score of at least
4.0/5 for each prompt, and zero critical failures for source fabrication,
dangerous operational instructions, or unsupported validation claims. A failed
critical criterion cannot be averaged away.

## Multi-model evaluation

A future offline-first harness may run OpenAI, Gemini, and a local open-weight
model family. Providers are adapters behind one test contract. A run records the
exact provider model identifier, declared settings, date, harness version, prompt
hash, response hash, evaluator version, and sanitized outcome.

Credentials come from the operator environment, never fixtures, manifests, logs,
or committed configuration. Prompt content and responses remain local unless the
operator explicitly selects a remote provider after reviewing its data policy.
Model evaluation is supporting evidence and cannot replace either human review.

Adversarial cases include prompt injection inside source text, fabricated
citations, unsupported field assumptions, instructions to execute generated code,
overconfident claims when telemetry is missing, malformed JSON, oversized output,
and content that attempts to reveal secrets.

## Native rule program

The reference scope is:

- Enterprise: 100 commonly observable cases across Panther, Sentinel, Defender,
  and Splunk, up to 400 executable rules where telemetry is real;
- Mobile: 100 cases with a four-backend support matrix;
- ICS: all 97 active records with a four-backend support matrix.

Mobile and ICS cells become executable only when the product has a documented,
testable telemetry path. Otherwise the cell stays `unassessed` or `blocked`, or
becomes `not-applicable` through the evidence process in the
[data contract](data-contracts.md). No invented table, field, connector, or event
type is permitted to satisfy a numeric target.

Each supported rule has four inert, synthetic fixture classes:

- positive behavior that should match;
- benign lookalike that should not match;
- missing required telemetry that must fail safely or report insufficiency;
- a threshold or time-window boundary case.

Fixtures contain no live credentials, malware, personal data, production logs, or
instructions that execute harmful activity. Parser and lint checks precede replay;
observed runtime results are separately recorded.

## Reproducibility and review workflow

1. Select an immutable object version and verify its content hash.
2. Record source, telemetry, backend, and environment versions.
3. Run structural checks and retain the machine-readable output.
4. Run fixtures in an isolated authorized lab and retain sanitized results.
5. Have an eligible reviewer compare expected and observed results.
6. Publish only the minimum evidence needed to reproduce the conclusion.
7. Reassess when source data, schema, backend, telemetry mapping, or rule changes.

Content authors must not approve their own review or lab result. Pull requests for
prompts and native rules require two approvals once a sufficient independent
maintainer roster exists. Until then, content can advance in development but the
stable v1.0 gate stays closed.

## Release gates

Stable v1.0 requires:

- two valid human review records for every current prompt hash;
- complete Mobile and ICS support matrices with honest per-cell evidence;
- all promised Enterprise reference cases resolved and supported rules replayed;
- no critical validation failures or missing provenance;
- published scorecards derived from machine-readable evidence;
- the security, accessibility, and release-evidence gates described in
  [release evidence](release-evidence.md).

These gates intentionally make external reviewer and lab capacity visible. They
must not be waived by changing labels or lowering counts after the fact.
