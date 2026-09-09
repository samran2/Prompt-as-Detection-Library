# ADR-0004: Require Evidence for Native Rules and Not-Applicable Decisions

## Status

Accepted

## Date

2026-09-08

## Context

Panther, Sentinel, Defender, and Splunk have different event models, query
surfaces, correlation features, and product telemetry. Mobile and ICS behaviors
often lack a truthful observation path in one or more of these backends. Filling a
matrix with invented fields or mechanically translated syntax would create false
coverage and unsafe confidence.

## Decision

Native rules are backend-specific research objects. A support-matrix cell is
`unassessed`, `supported`, `not-applicable`, or `blocked`.

`supported` requires an executable native artifact, documented telemetry and field
mapping, source and license metadata, positive and negative fixtures, an exact
backend version, observed lab results, and human approval.

`not-applicable` requires a dated, reviewer-approved explanation tied to evidence
that the product cannot honestly observe the scoped behavior. It records the
backend version and reassessment trigger. Missing time, access, or knowledge is
`unassessed` or `blocked`, not `not-applicable`.

Generated pseudocode, parser success, and model output cannot establish support.

## Alternatives considered

### Sigma-first translation

Sigma is useful for portable log patterns but does not express every correlation
or product-specific capability. Translation alone does not prove telemetry exists.

### Populate every backend cell

This meets a numeric target at the cost of scientific integrity and analyst trust.
It is explicitly rejected.

### Leave unsupported cells blank

Blank cells hide whether they were reviewed. Explicit states make uncertainty and
evidence visible.

## Consequences

- Coverage numbers distinguish executable rules from assessed unsupported cells.
- Domain experts and licensed test environments are required for promotion.
- Backend changes can invalidate evidence and trigger reassessment.
- Community contributions need item-level origin, SPDX licensing, fixtures, and
  reproducible results.
- Stable v1.0 remains blocked until promised matrices are complete without
  fabricated telemetry.

See [data contracts](../../docs/data-contracts.md) and the
[validation program](../../docs/validation-program.md).
