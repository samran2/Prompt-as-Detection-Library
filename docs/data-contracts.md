# Versioned Data Contracts

## Current and target state

The current repository deterministically derives 918 active technique and
subtechnique prompts from pinned ATT&CK 19.2 source files. `demo/catalog.js`,
`library/prompts/`, `library/procedures.jsonl`, and `library/coverage.json` are the
implemented data surfaces. Their hashes prove byte identity, not correctness or
detection effectiveness.

The target state adds versioned JSON Schema contracts for prompts, rules,
reviews, validations, relationships, and release manifests. Until a record passes
those schemas and the gates below, it must not be represented as reviewed or
validated.

## Shared identity

Every project object has:

| Field | Contract |
| --- | --- |
| `id` | Stable, globally unique project identifier; never recycled. |
| `object_type` | Versioned allowlisted type such as `prompt` or `native-rule`. |
| `schema_version` | Semantic version of the JSON contract. |
| `content_version` | Immutable project dataset version containing the object. |
| `attack_version` | Pinned ATT&CK release, currently `19.2`. |
| `attack_id` | Valid technique or subtechnique identifier such as `T1059.001`. |
| `domain` | `enterprise`, `mobile`, or `ics`. |
| `tactics` | Source-derived ATT&CK tactics; no inferred filler values. |
| `platforms` | Source-derived platforms; an empty list remains meaningful. |
| `created_at` / `updated_at` | UTC RFC 3339 timestamps for the project object. |
| `content_hash` | SHA-256 of canonical content bytes with algorithm prefix. |

Object identity and content identity are separate. Editing content retains the
logical object ID only when meaning is preserved, changes the content hash, and
creates a new immutable content version.

## Provenance

Each prompt and native rule records:

- source URLs or stable source identifiers;
- source license using an SPDX expression where one exists;
- source and generated artifact SHA-256 values;
- generation tool name and exact version or commit;
- deterministic input identifiers and transformation method;
- required telemetry, field mappings, and known gaps;
- validation status and the evidence records that justify it.

External rule code is not accepted without item-level origin and license data.
MIT covers project-authored code; reproduced MITRE data remains under the separate
terms recorded in [source provenance](source-provenance.md).

## Validation state

`validation_status` is one of:

- `generated`: structurally produced or edited, with no human-quality claim;
- `reviewed`: two eligible, independent reviews passed the published rubric;
- `lab-validated`: reviewed content passed reproducible tests in a named lab;
- `field-confirmed`: lab-validated content has separately documented production
  evidence approved for public release.

States are monotonic only within an immutable object version. Any semantic content,
telemetry mapping, threshold, or query change creates new evidence requirements.
A newer object may therefore return to `generated` while the previous version
retains its historical result.

## Review record

A review record contains the reviewed object ID and content hash, rubric version,
reviewer identity, review date, per-criterion score, critical-failure flags,
comments, and a signed or platform-auditable attestation reference. Reviewer
eligibility and independence are governance facts, not free-text claims.

Two reviews are independent when neither reviewer authored the evaluated object,
the reviewers do not copy one another's assessment, and both bind their decision
to the same content hash. Automated model scores never satisfy a human review slot.

## Native rule support

Each technique-and-backend cell has one explicit state:

- `unassessed`: no supported conclusion yet;
- `supported`: executable native rule plus telemetry contract and fixtures exist;
- `not-applicable`: a named reviewer approved evidence that the backend cannot
  observe the behavior with an honest telemetry path;
- `blocked`: a real telemetry path may exist, but required access or evidence is
  currently unavailable.

`not-applicable` is not a shortcut to improve coverage. It needs a dated rationale,
reviewer, backend version, evidence references, and the conditions that would
trigger reassessment. See the [native-rule ADR](../governance/decisions/0004-native-rule-evidence-and-not-applicable.md).

## Validation record

Each executable rule result binds:

- rule ID and exact content hash;
- backend name and exact version;
- isolated test-environment description;
- fixture ID, kind, and SHA-256;
- expected result and observed result;
- execution time, harness version, and sanitized evidence location;
- reviewer decision, limitations, and expiration or reassessment trigger.

Required fixture kinds are `positive`, `benign-lookalike`, `missing-telemetry`, and
`boundary`. A parse or lint success is structural evidence only; it is not a passed
detection result.

## Canonicalization and hashing

Text hashes cover exact UTF-8 bytes. JSON hashes use the project's specified
canonical JSON encoder: UTF-8, sorted object keys, array order preserved, no
insignificant whitespace, and a trailing newline for file artifacts. The encoder
name and version are part of the release manifest.

Hash comparison proves that two byte sequences match. Authenticity requires a
trusted signature and provenance chain; quality requires review and validation.

## Schema evolution

- Patch schema versions clarify constraints without changing accepted meaning.
- Minor versions add backward-compatible optional fields or object types.
- Major versions may change required fields or meaning and require a migration.
- Migrations are deterministic, preserve source identifiers and old hashes, and
  emit a machine-readable report of transformed, rejected, and unchanged records.
- CI validates representative old-version fixtures and all current content.
- Published content versions are never rewritten in place.

The future API follows the compatibility policy in [Research API](api.md). The
local CLI remains compatible unless its own documented interface is deliberately
versioned.
