# Prompt-as-Detection 0.4 foundation specification

## Product boundary

Prompt-as-Detection is a local-first, independently rebuilt research library for
all 918 active techniques and subtechniques in the pinned MITRE ATT&CK 19.2
dataset. The canonical browser workbench and CLI remain supported while the
repository adopts versioned data contracts and a read-only reference API.

`0.4.0.dev0` is a development foundation. It is not a stable v1 release, a
production detection service, an endorsement by MITRE or a design benchmark
company, or evidence that generated prompts work in a particular environment.

## Non-negotiable invariants

1. The active source set is exactly 918 records: Enterprise 697, Mobile 124 and
   ICS 97. The procedure relationship set is exactly 18,885.
2. `demo/core.js` composes the browser, CLI and generated text prompts. Generated
   prompt bytes and hashes must remain deterministic.
3. Source descriptions, procedures, imported intelligence, IOCs and analyst
   context are untrusted literal data. They are never executed or interpreted as
   instructions.
4. Local browser and CLI use have zero runtime dependencies, make no model calls,
   upload no context and collect no analytics.
5. `demo/`, `library/` and `scripts/library_cli.cjs` remain compatibility entry
   points until a documented migration is released.
6. Every prompt begins at `generated`. Only two real independent reviewers may
   advance it to `reviewed`; fixture-bound evidence is required for
   `lab-validated`, and operational evidence for `field-confirmed`.
7. Native backend support begins as `unassessed`. A runnable rule or an audited
   `not-applicable` rationale must be backed by real product telemetry evidence.
8. External intelligence is corroboration, not validation. Rösti mappings accept
   only provider-explicit active ATT&CK technique IDs, redact IOC values by
   default and require an explicit local network action.
9. The reference API is read-only, resource bounded and loopback-first. It accepts
   only `GET` and `HEAD`; accounts, uploads, model runs, samples and private logs
   remain out of scope.
10. Stable v1 publication stays blocked until human review, domain support,
    security, accessibility and signed release-evidence gates are satisfied.

## Public contracts

- `packages/schemas/manifest.json` indexes the JSON Schema 2020-12 contracts.
- `content/prompts/index.json` is the 918-record prompt and review registry.
- `content/native-rules/support-matrix.json` records all 918 × 4 backend cells.
- `validation/evals/static/summary.json` summarizes automated static prompt
  checks without advancing review maturity.
- `apps/research-api/openapi.yaml` is the OpenAPI 3.1 contract for the local
  reference implementation.
- `integrations/rosti/source.json` records the bounded external provider source.

See `docs/data-contracts.md`, `docs/api.md` and `docs/architecture.md` for the
versioning and dependency rules around these contracts.

## Acceptance gates for each development revision

- Source ID sets, generated prompt paths and content hashes match exactly.
- Repository, schema, API, CLI, browser, security-boundary and adversarial tests
  pass; zero discovered tests is a failure.
- The real browser suite covers keyboard use, URL restoration, exports, supported
  viewports, console errors and unexpected external requests.
- Credential-pattern and tracked-sensitive-path checks pass without allowlisting
  real secrets.
- All remote GitHub Actions references are exact allowlisted commit SHAs.
- The API container build context is deny-by-default, includes source license
  notices, and runs as a non-root user from a digest-pinned base image.
- A fresh security review covers the final diff before publication.

Passing these gates proves deterministic structure and guarded behavior only. It
does not prove detection effectiveness, complete WCAG conformance, independent
human review, laboratory validation or production API readiness.
