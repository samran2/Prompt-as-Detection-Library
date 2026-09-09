# ADR-0006: Keep ATLAS AI Separate from ATT&CK

## Status

Accepted

## Date

2026-09-09

## Context

The owner requested MITRE ATLAS AI coverage alongside the pinned ATT&CK library.
ATLAS has AML identifiers, its own versioned YAML model and Apache-2.0 terms.
Its threat maturity describes source evidence, not detection validation.
Existing ATT&CK CLI defaults, review contracts and source bytes must remain valid.

## Decision

Pin the official ATLAS 2026.08 source independently. Generate its catalogs,
relationships, prompt inventory and text files under `content/atlas/`, with a
separate browser module and public license notice. The browser searches both
frameworks; CLI defaults remain ATT&CK-only and explicit framework selectors
opt into AI. The local API uses additive `/v1/atlas` resources, never fabricated
ATT&CK/STIX identifiers. Shared composition branches on framework identity.

ATLAS records start at `generated`. Existing ATT&CK review and native-support
registries do not imply AI validation. Source case studies, mitigations and
threat maturity remain attributable metadata. Changes to the pinned source
require a separately reviewed source diff, safe YAML/JSON parity check, license
inventory and complete deterministic regeneration.

## Alternatives considered

- Treat AI as another ATT&CK domain: rejected because it conflates identifiers,
  versions, licensing and evidence semantics.
- Migrate all public contracts at once: rejected because an additive framework
  boundary preserves compatibility and keeps this change reviewable.
- Load upstream YAML in the browser: rejected because offline pinned artifacts
  offer reproducibility without adding runtime packages or network dependency.

## Consequences

The public asset allowlist grows from eight to ten files. Default API and CLI
consumers remain compatible. Future AI expert review needs framework-aware,
hash-bound evidence before stable release; source completeness alone is not a
validation gate. No model execution or hosted API deployment is introduced.
