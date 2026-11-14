# ADR-0010: Local Module Visibility Preferences

## Status

Accepted for the `0.4.0.dev4` development workbench. Release acceptance is separate.

## Date

2026-11-03

## Context

The unified workbench exposes several research modules at once. Analysts need a
calmer desk without losing provenance, private drafts or research state. The
existing workspace contract is portable analyst data, while a visibility choice
is a device presentation preference and must not create a migration or sharing
boundary.

Evidence is the primary path to pinned source text, provenance and limitations.
Allowing it to disappear would weaken the evidence-before-logic safety model.
Browser storage is untrusted, unencrypted and shared by scripts on the same origin.

## Decision

Keep Prompt, Evidence, search, the technique list, Workspaces, Settings, the User
guide and About always reachable. Only Compare, Defenses, Flow and Research tools are
configurable, and all four are visible by default.

Store exactly four booleans (`compare`, `defenses`, `flow`, `research`) under the
fixed origin-local key `pad-module-visibility-v1`. Strictly validate the whole
record, fail open on missing or malformed input and report storage unavailability
without exposing exception details. A write failure retains the current-page
choice without claiming it was saved.

Do not serialize module visibility into URLs, workspaces, IndexedDB workspace
records or exports. Hiding removes navigation controls and command actions but
does not unload assets or delete drafts, comparison selections or Flow steps. If
an active or restored optional tab is hidden, show Prompt while preserving the
underlying work. Show all modules changes only the four visibility values.

## Alternatives considered

- Making every module optional would allow Evidence and its limitations to
  disappear. Keep the provenance path mandatory.
- Storing visibility in each workspace would make presentation portable, require
  a schema migration and surprise users moving between devices. Keep it local.
- Encoding choices in shared URLs would disclose device customization and create
  conflicting link behavior. Keep URLs unchanged.
- Removing hidden modules from the public build would turn customization into a
  build-time product variant and could destroy in-memory state. Hide presentation
  only.

## Consequences

Users can reduce visual complexity and later restore modules without losing work.
Invalid preferences cannot hide core recovery or provenance surfaces. Same-origin
code can still read or change the preference; visibility is not encryption,
deletion, authorization or a security boundary.

This decision extends ADR-0008's limited localStorage allowance from consent and
appearance to one bounded display record. Its workspace privacy, import and
conflict rules remain unchanged. Fresh keyboard, responsive, storage-failure,
browser and independent review evidence is required before publication.
