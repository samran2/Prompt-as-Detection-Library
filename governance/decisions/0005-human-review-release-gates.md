# ADR-0005: Bind Human Review and Validation Gates to Content Hashes

## Status

Accepted

## Date

2026-09-08

## Context

The library has complete structural coverage of the pinned active ATT&CK records,
but generated prose is not equivalent to expert review or effective detection.
Model evaluation can scale feedback but cannot supply independent accountability.
Semantic edits can invalidate a decision even when an object retains the same
logical identifier.

## Decision

Every prompt must receive two independent eligible human reviews bound to the same
content hash before stable v1.0. Content and rule changes require two approvals
once the project has enough independent maintainers to enforce that policy safely.

The review rubric measures factual accuracy, ATT&CK alignment, telemetry
feasibility, benign behavior, safety, citations, and platform assumptions. Each
prompt needs a mean of at least 4.0/5 and zero critical source-fabrication,
dangerous-instruction, or unsupported-validation failures.

Human review, model evaluation, parser checks, lab validation, and field evidence
are distinct records. No lower-cost evidence is relabeled to satisfy a higher gate.

## Alternatives considered

### Single maintainer approval

This is practical during early development but does not meet the independent
review objective or reduce author bias sufficiently for stable release.

### Model-only scoring

Models help find inconsistencies but cannot be the accountable domain reviewer and
may repeat shared errors or fabricate evidence.

### Review technique families by sample

Sampling measures systemic quality but cannot justify a per-prompt reviewed label.
It remains useful as a development diagnostic.

## Consequences

- Stable v1.0 has no date until reviewer capacity exists.
- Review records must identify reviewer independence, rubric version, date, and
  exact content hash.
- Any semantic edit resets the affected prompt's status until new reviews pass.
- Repository rules requiring two approvals are activated only after the roster can
  satisfy them without locking out maintenance.
- Public dashboards derive claims from machine-readable review evidence.

See [validation program](../../docs/validation-program.md) and
[release evidence](../../docs/release-evidence.md).
