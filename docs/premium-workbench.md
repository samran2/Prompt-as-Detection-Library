# Premium Workbench

The `0.4.0.dev1` development workbench brings selection, research context and
private drafts into one desk. It is still a local-first research aid: generated
prompts are not validated detections. This guide describes the candidate behavior;
actual test and hosted deployment outcomes are recorded in
[verification.md](verification.md), not implied by the version label.

## One technique, four views

Search by technique ID, name or behavior, then narrow the catalog with filters.
The selected technique is shared by four tabs:

| View | Purpose |
| --- | --- |
| Prompt | Compose or edit the draft for the chosen mode and target. |
| Evidence | Read source/provenance, telemetry context, exact CAR mappings where available, and the review checklist. |
| Defenses | Explore separately labelled D3FEND context where the pinned source has an exact mapping. |
| Flow | Build a proposed ordered ATT&CK technique flow and export a hypothesis. |

Comparison opens in a separate dialog. CAR and Flow use shared presentation with
the Research tools page, avoiding two competing implementations. Missing mappings
remain missing: the desk does not invent Mobile, OT/ICS or ATLAS mappings, convert
source pseudocode into validated rules, or promote a hypothetical flow into evidence.

Use the list-width control with pointer or keyboard to adjust the desktop list
between 240 and 480 pixels; Reset restores 330. On narrow screens the desk switches
between list and detail, retaining the list position and a way back to the selected
technique. Existing light, dark, high-contrast and system themes remain available.

Command search opens from its button or Cmd/Ctrl+K. Search for a technique or a
view/action; Enter activates the first result and Arrow Down moves into results.
The `/` shortcut focuses catalog search. Shortcuts do not intercept typing inside
inputs, editable content or an open dialog. Dialog close returns focus to its
opener where appropriate.

## Choose the right export

- Copy/TXT uses the current prompt editor, including your edits.
- JSONL composition exports generate prompts for the selected export scope; they
  are not a backup of all edited workspace drafts.
- A workspace JSON file includes saved editor drafts and their original templates,
  applied and unapplied context, favorites, collections, flow and view state.
- Navigator, Attack Flow, manual assessment and lab exports retain their own
  documented formats and evidence caveats.

No export executes generated code. Workspace files deliberately include private
text: inspect them before sharing, and use synthetic context instead of secrets.

## Workspaces, favorites and collections

Open Workspaces to name the current workspace, make a new copy, select an existing
one, or export it. A new copy carries the current state under a fresh identity;
it is not an empty reset. Favorites provide quick access to techniques. Named
collections keep separate groups of technique IDs for an investigation.

Edited drafts are keyed by technique, mode and target. Each retains its original
template, template hash and the context used to create it. Applied environment
context and text still waiting to be applied are distinct. Restoring a workspace
must not silently regenerate your old templates or discard edits when source data
or composer behavior changes.

The workspace also retains search/filter state, selection, comparison, theme,
active tab, list width, scroll position and mobile list/detail state. These values
are local workspace data, not credentials or review metadata. Shared URLs do not
include workspace names, draft text or environment context.

## Import without replacing existing work

1. Select a workspace JSON file, no larger than **5 MiB**.
2. Read the local preview and any source-version, template-drift or unresolved-ID
   warnings. No upload occurs.
3. Confirm to open a new workspace identity, or cancel to leave current work intact.

Exact fields, types, sizes, depth and duplicate JSON members are checked before
restoration. Unknown but well-formed technique IDs are retained with warnings.
They do not become current catalog records. Original-template hash mismatches
reject the import, including for unresolved techniques; matching hashes prove
internal consistency only, not authenticity or independent review.

Neither importing nor restoring a workspace advances a prompt's evidence status.
Workspace JSON cannot carry reviewer identities, validation statuses or secret
metadata. Ordinary text fields can still contain sensitive pasted text; field
validation is not a secret detector. See [workspace-format.md](workspace-format.md)
for exact bounds and the API contract.

## Optional local saving

Workspaces begin in memory. To retain them across reloads, explicitly enable local
autosave and accept the plaintext-storage notice. The application stores workspace
snapshots in IndexedDB and remembers consent in localStorage. Previously granted
consent enables the local restore path on later visits in the same browser profile.

This is **not encrypted storage** or cloud backup. Other people using the profile,
extensions or scripts with same-origin access may read the data. Repository paths
on one GitHub Pages origin are not security boundaries. A dedicated profile/origin
and non-sensitive examples reduce accidental exposure. Quota limits, private
browsing, eviction and device loss can make local saving unavailable or lose data.

Concurrent saves use revision checks. A conflict does not silently overwrite the
other tab: autosave stops and keeps the current in-memory copy. Export the copy or
make a new workspace copy before resuming saving. Storage failures likewise retain
memory for export; a saved indicator is not a guarantee of durable backup.

Disabling autosave removes consent and stops new automatic saves, but does not
delete existing saved workspaces. The explicit deletion action clears saved
workspace rows and invalidates old storage handles so stale tabs cannot recreate
them through an old save. Current in-memory work remains available for export.
Deletion does not erase previously downloaded files, browser/OS backups or other
origin data, and does not reset the separate appearance preference.

Manual robustness assessments and offline lab results in Research tools remain
separate session-only artifacts with their own explicit exports. They are not
included in workspace saving. See [privacy.md](privacy.md) and
[ADR-0008](../governance/decisions/0008-portable-private-workspaces.md).

## Verification boundaries

The design targets keyboard operation, responsive layout and clear privacy choices.
It does not itself establish WCAG conformance, native-rule effectiveness, a completed
security audit or stable v1.0 readiness. Browser matrix, 320–1440 px checks, storage
failure/conflict/clear tests, source fidelity and independent review must be recorded
against the actual candidate. See [development.md](development.md) for commands.
