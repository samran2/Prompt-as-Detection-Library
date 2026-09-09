# Research API reference service

This directory contains the experimental, read-only `/v1` contract and a
dependency-free Node.js reference service. It exposes only repository data and
binds to `127.0.0.1` by default. It has no user accounts, uploads, model calls,
log ingestion, analytics or malware samples.

The current adapter verifies the 918 prompt files against
`content/prompts/index.json` before serving them. Native rule and validation
collections remain empty until qualifying rule and evidence records exist.
An empty collection is not a product-support decision.

MITRE ATLAS AI records are available separately under `/v1/atlas/`. The ATLAS
adapter verifies the pinned JSON catalog and each prompt against
`content/atlas/coverage.json`; its source manifest is
`sources/atlas-2026.08/manifest.json`. Every ATLAS prompt has `generated` status.
The source's `sourceMaturity` field describes source knowledge and does not
establish independent prompt review or detection validation. ATLAS objects use
`framework: "ATLAS"`, `atlasVersion` and `AML.T` identifiers; they do not claim
an ATT&CK version or STIX identifier.

## Run locally

From the repository root, with Node.js 22 or newer:

```console
node apps/research-api/src/server.mjs
```

Then request `http://127.0.0.1:8781/v1/techniques`. Set `PORT` to select a
different port. `PAD_API_HOST` accepts loopback names by default; setting it to
`0.0.0.0` or `::` is an explicit decision to expose the process to other
interfaces.

The complete OpenAPI 3.1 contract is in `openapi.yaml`. Collections use opaque
cursors tied to the selected filters and immutable dataset snapshot. Responses
carry strong ETags, exact-byte `Content-Digest` values and item-level content
hashes. Page size is capped at 100.

Example ATLAS routes:

```text
/v1/atlas/techniques?pageSize=20
/v1/atlas/techniques/AML.T0051
/v1/atlas/prompts?techniqueId=AML.T0051
/v1/atlas/search?q=prompt%20injection
/v1/atlas/relationships?sourceId=AML.T0051
/v1/atlas/versions
```

ATLAS search includes parent technique names. Cursors remain bound to their
framework, resource, filters and source snapshot. Existing `/v1/techniques`,
`/v1/prompts` and other unprefixed routes retain the ATT&CK-only contract;
`domain=OT` remains an alias for the canonical `ICS` domain. The ATLAS domain
filter accepts `ATLAS`. ATLAS rules and validations currently return empty
collections. The local reference API is separate from the static Pages demo.

## OCI image

The official Node base is version- and digest-pinned. Build from the repository
root so that only the explicit `COPY` inputs are available to the service:

```console
docker build -f apps/research-api/Dockerfile \
  -t prompt-as-detection-research-api:dev .
docker run --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m -p 127.0.0.1:8781:8781 \
  prompt-as-detection-research-api:dev
```

The image runs as the unprivileged `node` user. This reference process does not
terminate TLS, authenticate callers, enforce a distributed rate limit or
provide a production service-level objective. A public deployment must add
those controls at a trusted gateway and must not enable write paths.
The image carries the project MIT license, separate ATT&CK data license, and
ATLAS notice and Apache 2.0 terms under `/srv/prompt-as-detection/licenses`.

## Production adapter seam

`createResearchCatalog` and `createAtlasResearchCatalog` are storage-agnostic;
the HTTP handler receives separate, completed immutable catalogs. A future PostgreSQL adapter can populate the same
contract without changing the static workbench or CLI. Database migrations,
TAXII/STIX exports, distributed caching and public operations are intentionally
outside this first reference slice and must land with their own contracts and
tests.
