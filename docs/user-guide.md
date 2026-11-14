# User guide

Prompt-as-Detection is a local-first research workbench for turning pinned MITRE
ATT&CK and ATLAS context into reviewable text prompts. It does not run detections,
query a security product or send your text to a model. Every generated prompt is
an unvalidated draft unless its record explicitly shows stronger evidence.

## Start in four steps

1. **Find a technique.** Search by ID, name or behavior. Use the domain, tactic
   and platform filters to narrow the 1,115 active ATT&CK 19.2 and ATLAS 2026.08
   records. Filters describe source metadata; they do not prove local visibility.
2. **Choose the task and target.** Select Detect, Hunt, Triage or Validate, then
   choose the output format. The target is an instruction for the answer, not a
   claim that a product integration has been tested.
3. **Add confirmed environment facts.** Use an environment profile or enter the
   data sources, tables, fields and gaps you actually know. Leave unknown facts
   empty. Never add credentials, confidential logs or private incident details.
4. **Review, copy and test.** Read Evidence, inspect the draft, then copy or
   download it. Review any generated logic and test it only with controlled,
   synthetic positive and benign cases before promotion.

## Understand the workbench

| Area | Purpose |
| --- | --- |
| Prompt | Create and edit the task-specific draft. |
| Evidence | Review source provenance, telemetry suggestions, CAR context and limitations. This area is always available. |
| Defenses | Explore source-linked D3FEND context where an exact mapping exists. |
| Flow | Arrange ATT&CK techniques into a research hypothesis. It is not observed activity or an executable attack. |
| Compare | Compare source metadata and evidence readiness for up to two techniques. |
| Research tools | Open separate coverage, Navigator, CAR, lab and source-diff workflows. |

ATLAS does not inherit unsupported ATT&CK, CAR or Attack Flow relationships.
Missing mappings stay missing. D3FEND relationships are defensive research
context, not proof of effectiveness or product compatibility.

## Focus the desk with Settings

Open **Settings** in the workbench header to choose the color theme, adjust the
desktop technique-list width, and show or hide these optional modules:

- Compare techniques
- Defenses
- Flow
- Research tools

All four are shown by default. Prompt, Evidence, search, the technique list,
Workspaces, Settings, this guide and About cannot be hidden. Evidence stays mandatory so
source provenance and limitations always remain reachable.

Hiding a module removes its controls and command-search action; it does not delete
drafts, comparison selections or Flow steps. If Defenses or Flow is active when
you hide it, Prompt opens instead. **Show all modules** restores the default without
changing the theme, list width or work.

The visibility preference contains only four booleans and is stored, when
available, in this browser profile for the current site origin. It is not part of
workspace files, exports or shared URLs. Browser storage may be blocked, changed
by same-origin scripts or cleared; hiding is customization, not access control.

## Save work safely

Drafts stay in memory by default and clear on reload. Open **Workspaces** to name
the current work, keep favorites and collections, or download a portable
`.pad-workspace.json` file. Imports are validated and previewed before opening as
a new workspace identity.

Optional local autosave requires explicit consent and uses unencrypted IndexedDB.
It is convenience, not a secure vault or backup. Other people using the browser
profile, extensions and same-origin applications may access stored material.
Use synthetic context, export a recovery copy, and delete locally saved workspaces
separately when they are no longer needed.

Module visibility is a separate browser preference. It is never copied into a
workspace and deleting workspaces does not reset it.

## Choose the right export

- **Copy prompt** and **Download .txt** use the current editor text, including
  your changes.
- **Filtered JSONL** creates fresh templates for all matching records. It is not
  a backup of edited drafts.
- **Research JSON** exports source relationships and explicit validation state for
  the current record; editor changes are not included.
- **Workspace JSON** includes private editor text, context, profiles, favorites,
  collections and the workbench Flow. Inspect it before sharing.
- Navigator, Attack Flow, assessment and lab exports are separate research
  artifacts with their own evidence limits.

No export executes generated code or promotes validation status.

## Keyboard and mobile use

- `Cmd/Ctrl+K` opens command search.
- `/` focuses technique search when you are not typing in a field.
- `Left`, `Right`, `Home` and `End` move between the visible detail tabs.
- `Esc` closes the current dialog and returns focus to its opener.

On narrow screens, the catalog and technique detail appear one at a time. Back to
techniques preserves the search and list position. All Settings and guide actions
remain available without a pointer.

## Before operational use

Confirm the real data sources, table and field names, timestamps, retention and
collection gaps. Challenge the hypothesis with benign lookalikes and missing-data
cases. Review output syntax in the exact product environment. Record the reviewer,
fixtures, limitations and actual result before assigning any validation maturity.

Catalog completeness, automated tests or a model answer do not establish detection
effectiveness. See the [validation program](validation-program.md),
[privacy boundary](privacy.md) and [workspace format](workspace-format.md) for the
full evidence and data-handling rules.
