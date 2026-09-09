# Research API

## Status

The repository includes an **experimental, read-only local reference service**
and its OpenAPI 3.1 contract. It is not a hosted public beta and is not part of
the static GitHub Pages workbench. The browser workbench and local CLI described
in the [README](../README.md) remain supported and do not make implicit network
requests.

Run the reference service locally with Node.js 22 or newer:

```console
node apps/research-api/src/server.mjs
```

It binds to `127.0.0.1:8781` by default. See the
[service README](../apps/research-api/README.md) for the explicit network-bind
and OCI-container options. This implementation is a contract reference, not a
promise of hosted availability, compatibility beyond its development version,
or a release date.

## Purpose and limits

The API makes public, versioned research objects discoverable without changing
the local-first product. The reference implementation exposes techniques,
prompts, dataset versions, generated relationships, and bounded local search. It
also defines rule and validation collections, which deliberately remain empty
until qualifying evidence exists. Empty collections are not product-support or
validation claims.

The first version will not provide:

- user accounts, write endpoints, or private collections;
- model execution, prompt submission, or analyst log upload;
- malware sample upload, download, or analysis;
- a claim that generated content has been lab or field validated.

Those exclusions materially reduce privacy, authorization, and malware-handling
risk. Any proposal to add them requires a new threat model and architecture
decision.

## Contract

The normative development contract is
[`apps/research-api/openapi.yaml`](../apps/research-api/openapi.yaml), expressed
as OpenAPI 3.1 with JSON Schema 2020-12 components. The checked-in contract,
dependency-free client, and reference implementation must agree in CI. The
`/v1` prefix is part of every route in this contract.

| Route | Result |
| --- | --- |
| `GET /v1/techniques` | Techniques and subtechniques in the pinned catalog snapshot. |
| `GET /v1/techniques/{attack_id}` | One technique or subtechnique. |
| `GET /v1/prompts` | Prompt metadata and content, filterable by technique and status. |
| `GET /v1/rules` | Native rule records, including explicit support and not-applicable evidence. |
| `GET /v1/validations` | Public validation evidence without secrets or private telemetry. |
| `GET /v1/versions` | Immutable content-version manifests and source provenance. |
| `GET /v1/relationships` | Typed relationships between published objects. |
| `GET /v1/search` | Bounded catalog search over public fields. |

STIX 2.1 export and read-only TAXII 2.1 discovery are future work and are not
routes in the current OpenAPI contract. When implemented, they must represent
source and project relationships without rewriting the pinned MITRE source.
Project-generated objects require their own namespace, producer identity,
license, and content hashes.

## Request and response behavior

- List routes use an opaque `cursor`, a default `pageSize` of 20, and a maximum
  `pageSize` of 100. Clients must not decode or construct cursors.
- Ordering is stable within an immutable content version. A cursor is invalid
  when used with different filters or a different content version.
- Filter values are exact, allowlisted contract values. Unrecognized parameters
  and malformed identifiers receive a bounded `400` response.
- Successful object responses include `ETag` and `Content-Digest`. Conditional
  requests with `If-None-Match` may receive `304`.
- Immutable content versions use strong ETags derived from canonical response
  bytes. Mutable discovery documents use a version-specific validator.
- Errors use `application/json` and the stable envelope
  `{ "error": { "code": "...", "message": "..." } }`. Messages are bounded
  and non-sensitive; request bodies, filesystem paths, stack traces, and source
  exception details are never reflected.
- Dates are UTC RFC 3339 values. Hashes identify both algorithm and lower-case
  digest, for example `sha256:<64 hexadecimal characters>`.

## Compatibility

Additive fields may appear within `/v1`; clients must ignore fields they do not
understand. Removing or changing field meaning requires a new API major version.
Enum expansion is additive only where the schema marks it extensible. Published
content versions are immutable; corrections create a new version with an explicit
supersession relationship.

The current CLI command names, option behavior, and local file formats are not
implicitly changed by the API. The dependency-free client lives in
`packages/clients` and makes network requests only when a caller explicitly
constructs it with a base URL; existing local commands do not use it.

## Security and operations gates

The local reference service already allowlists and bounds query input, rejects
write methods, applies request timeouts and security headers, emits generic
errors, and defaults to loopback. Its OCI image runs as a non-root user and is
designed to be launched with a read-only root filesystem and dropped
capabilities.

Before a public beta, the production service must additionally have independent
schema validation at the HTTP boundary, parameterized database access,
distributed rate limits, restrictive CORS at a trusted gateway, TLS, abuse
monitoring, audit-safe request IDs, and a minimal network policy. PostgreSQL
storage, migrations, production search indexing, and public operations are
future work; no database adapter is included in the reference service.

The beta is intentionally unauthenticated because it exposes only public research
objects. Edge and application rate limits still apply. Administrative imports and
database migrations are separate authenticated operator paths and are not public
API endpoints.

See [data contracts](data-contracts.md), [privacy](privacy.md), and the
[proposed API threat model](../governance/threat-models/research-api.md).

## Service objectives for beta

The design target is 99.9% monthly availability and p95 under 250 ms for catalog
reads at 100 requests per second under a defined representative dataset. These are
future acceptance targets, not current measurements or a service commitment.
Load-test methodology, dataset hash, region, cache state, and result artifacts must
accompany any claim that the target was met.
