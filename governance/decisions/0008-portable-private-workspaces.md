# ADR-0008: Portable, Private Workspaces with Optional Local Persistence

## Status

Accepted for the `0.4.0.dev1` development workbench. Release acceptance is separate.

## Date

2026-09-10

## Context

Researchers need to resume edited drafts, keep technique collections and move work
between browsers without an account or remote storage. A unified desk should retain
one selection across Prompt, Evidence, Defenses and Flow. Existing research tools,
generated content and the CLI must remain compatible and keep their evidence limits.

Drafts may contain private environment context. Files and browser databases can
be malformed or modified; independent tabs can save stale versions. A source or
composer update must not silently replace the template underlying an edited draft.

## Decision

Use a versioned, dependency-free workspace contract with a 5 MiB UTF-8 boundary,
exact fields and bounded nesting/collections. Store each draft's original template,
SHA-256 and original context alongside its edited text. Preserve unknown technique
references and report source/template drift without rebasing. Hash consistency is
not authorship, independent review or evidence of detection effectiveness.

Keep workspaces in memory by default. A user-selected JSON import must parse and
pass template-hash inspection before a preview can be confirmed. Confirmation
opens a new workspace identity, never overwriting an existing one by imported ID.
Export is an explicit private download; workspace contents never enter shared URLs.

Offer optional plaintext IndexedDB persistence after explicit consent, remembered
by a localStorage flag. Save with an atomic expected-revision check. Clear saved
rows with an epoch change that invalidates existing store handles. Errors and
conflicts stop autosave and retain memory for file export or a new copy. Disabling
autosave is distinct from deleting saved workspaces.

Separate the pure format, transactional store, workspace controller and presentation
modules from the existing composer. Reuse CAR/Flow presentation in the main desk
and Research page; keep manual robustness and offline lab evidence session-only
and outside workspace serialization. Preserve pinned sources and prompt bytes.

## Alternatives considered

- Always-on persistence would retain analyst context without an explicit choice.
- A localStorage payload store would make large synchronous writes and transactional
  cross-tab conflict control harder; use it only for the consent flag and existing
  appearance preference.
- Last-write-wins saving and automatic template rebasing would hide data loss and
  provenance changes. Explicit conflicts and drift warnings are preferable.
- Accounts, remote synchronization and encrypted storage need separate key recovery,
  authorization and operational designs. No such protection is implied here.
- A single expanded research form would mix unverified lab evidence with ordinary
  drafts; keep the evidence boundary explicit instead.

## Consequences

Private work can be portable without a backend, but file exports contain analyst
text and require careful handling. Browser storage can be evicted or unavailable;
autosave is not a backup guarantee. Plaintext is accessible to the browser profile
and scripts with same-origin access. GitHub Pages repository paths do not isolate
storage from other projects on the same origin.

This decision extends the memory-only main-workbench assumption in
[ADR-0001](0001-local-first-static-workbench.md). The evidence separation in
[ADR-0007](0007-offline-research-exchange.md) remains: manual assessments and lab
envelopes are not persisted by workspaces or promoted into the review registry.
Fresh contract, failure-path, browser and independent review evidence is required;
accepting this design does not assert a completed accessibility or security audit.
