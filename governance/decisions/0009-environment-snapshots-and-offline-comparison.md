# ADR-0009: Environment Snapshots and Offline-First Prompt Comparison

## Status

Accepted for `0.4.0.dev4` implementation. Release acceptance remains separate.

## Date

2026-09-13

## Context

An analyst's output target is not enough to establish available telemetry. Reusing
real environment facts should be convenient, but editing a saved profile must not
silently alter a draft or its provenance. Workspace v1 has no profile identity.
Old application tabs can remain open during a hosted update. Static template
checks cannot prove improved model answers.

## Decision

Add one dependency-free environment contract shared by the composer, browser,
library CLI and comparison preparation. Keep free analyst context separate from
profile facts, mark omissions unknown and distinguish example from user-supplied
data. Add optional `--profile-file`; reject contradictory explicit targets.

Workspace v2 stores editable profiles separately from the applied snapshot and
from each draft's immutable snapshot/hash. Include profile revision in draft
identity. Editing, importing, selecting and applying a profile are distinct
operations. A guided four-step view and quick view share state and composition.

Use a separate v2 IndexedDB database and consent flag. Read v1 saves only through
explicit discovery/import, preview them and create a new identity on acceptance.
Never migrate the old database in place. Preserve the v1 original for rollback;
do not attempt a lossy v2-to-v1 export. Keep the 5 MiB workspace limit and existing
atomic revision/epoch conflict protections.

Keep evaluation outside the public browser. Pin the dev3 composer; give each arm
the same synthetic facts and model/settings. Preparation and reporting are
offline. Explicit API execution requires a model, pricing and positive budget,
environment-only credentials and durable request journaling. No paid execution
is part of this development update. Blinded human evaluation remains distinct
from automatic checks, and neither changes review maturity automatically.

Application and prompt-content versions are independent: dev4 adds optional
profile composition while unprofiled text retains `PAD-v0.4.0-dev3`. Preserve
pinned source bytes and historical evidence.

## Alternatives considered

- Updating drafts whenever a saved profile changes would hide provenance changes
  and overwrite work; independent snapshots cost space but preserve intent.
- Sharing one database across incompatible app versions would allow old tabs to
  overwrite or misinterpret newer state. Separate stores avoid that compatibility
  failure, though they do not isolate hostile same-origin scripts.
- Always-on guided steps would interrupt existing expert workflows and deep links;
  retain quick mode and migrate old view preferences conservatively.
- Browser API calls would expose a new credential and private-context boundary;
  use an explicit operator-only tool with fixed public/synthetic cases instead.
- Static keyword scores and model self-grading alone cannot establish better
  answers. Keep measured checks, untested areas and blinded human reviews separate.

## Consequences

Environment information remains portable and local by default, but unencrypted
files/storage require care. V1 and v2 saves consume separate storage until the
user explicitly removes them. Dev3 rollback cannot read new v2 work, so retain
both the old original and a v2 export. Same-origin access, eviction and storage
failure limitations from [ADR-0008](0008-portable-private-workspaces.md) remain.

The API adapter adds an explicit network boundary to tooling, not to the browser
or library CLI. `store:false` is not a promise of zero provider retention.
Rate/price changes and inconclusive requests require operator review. Mocked
verification proves tool behavior, not model quality or detection effectiveness.
