# Research API reference service

This directory contains the experimental, read-only `/v1` contract and a
dependency-free Node.js reference service. It exposes only repository data and
binds to `127.0.0.1` by default. It has no user accounts, uploads, model calls,
log ingestion, analytics or malware samples.

The current adapter verifies the 918 prompt files against
`content/prompts/index.json` before serving them. Native rule and validation
collections remain empty until qualifying rule and evidence records exist.
An empty collection is not a product-support decision.

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
The image carries both the project MIT license and the separate ATT&CK data
license under `/srv/prompt-as-detection/licenses`.

## Production adapter seam

`createResearchCatalog` is storage-agnostic and the HTTP handler receives a
completed immutable catalog. A future PostgreSQL adapter can populate the same
contract without changing the static workbench or CLI. Database migrations,
TAXII/STIX exports, distributed caching and public operations are intentionally
outside this first reference slice and must land with their own contracts and
tests.
