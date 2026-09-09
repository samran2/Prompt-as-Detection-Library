# ADR-0002: Define a Read-Only Versioned Research API

## Status

Accepted

## Date

2026-09-08

## Context

Researchers need machine-readable access to techniques, prompts, rules, evidence,
versions, and relationships. Extending the static workbench into a multi-user or
upload service would mix a low-risk public catalog with materially different trust
boundaries.

## Decision

Maintain a separate `/v1` read-only HTTP API described by OpenAPI 3.1 and JSON Schema
2020-12. It uses opaque cursor pagination, conditional requests with ETags,
content hashes, stable error objects, and immutable content versions. A read-only
STIX 2.1 export and TAXII 2.1 collection may expose the same approved data.

The first version has no accounts, write routes, model execution, log ingestion,
or malware sample handling. Existing local CLI commands remain offline unless a
future user explicitly selects an API client.

## Alternatives considered

### Make repository files the only API

Files are reproducible and easy to mirror but do not provide bounded queries,
relationships, conditional fetches, or a stable service contract.

### GraphQL

Flexible client queries would increase complexity, query-cost controls, and cache
variability. The initial catalog has well-defined resource shapes suited to REST.

### Writable community service

Accounts and submissions could aid collaboration, but authorization, moderation,
privacy, and abuse handling are outside the first service's risk budget.

## Consequences

- The dependency-free local reference API can evolve separately from the workbench;
  it is not a hosted public beta.
- Immutability and hashes improve reproducibility and caching.
- Public access still needs rate limiting, request bounds, abuse monitoring, and
  denial-of-service controls.
- Adding write or upload capability requires a new ADR and threat-model revision.
- The contract must exist and pass compatibility tests before public beta.

See [Research API](../../docs/api.md).
