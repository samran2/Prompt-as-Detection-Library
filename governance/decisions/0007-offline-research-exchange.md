# ADR-0007: Keep Research Exchange Separate from Validation

## Status

Accepted

## Date

2026-09-09

## Context

Navigator, CAR, Attack Flow, Summiting the Pyramid and external lab workflows
can improve research without proving that a detection works. Imported reports
may contain commands, credentials, personal data and unsupported success claims.

## Decision

Use a separate static Research tools page and bounded local modules. Preserve
default prompt and source bytes. Export generated coverage and hypothetical flows;
keep manual assessments and lab results unverified. Do not connect to or execute
Caldera. Its offline project result envelope accepts only identifiers, hashes and
allowlisted outcomes, not native operation reports or arbitrary source text.

Compare proposed ATT&CK snapshots with a local read-only CLI. No proposal replaces
the pinned dataset. CAR mappings use exact explicit IDs and preserve upstream
licenses and original bytes; source examples do not become validated native rules.

## Alternatives considered

An embedded lab execution client would require credentials, authorization controls,
network boundaries and a separately approved threat model. An automatic score or
validation promotion would substitute self-assertion for independent evidence.
Neither is appropriate for a public local-first reference workbench.

## Consequences

No new runtime dependencies, accounts, telemetry, persistence or remote calls.
Interoperability is scoped to documented export formats. Lab artifacts still
require external authorized operation and human verification. Large candidate
STIX bundles are processed by the bounded local CLI instead of the browser.
