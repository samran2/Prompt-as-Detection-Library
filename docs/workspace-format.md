# Private workspace format

A workspace is a local JSON snapshot of analyst drafts, their original prompt
templates, environment profiles, context, collections, favorites, a proposed technique flow and view
state. It is **not review, laboratory or field-validation evidence**. No workspace
field can advance the library's evidence status.

The pure `demo/workspace.js` module has no DOM, storage, networking, logging,
command execution or automatic-download behavior. Storage and user-initiated
file selection belong to the integrating interface. Load `environment.js`, then
`core.js`, then `workspace.js`; CommonJS loads the same modules internally. Secure browser
cryptography provides UUIDs and SHA-256; absence fails closed.

## API

| Function | Result |
| --- | --- |
| `create(name, sources)` | A fresh version 2 workspace with a cryptographically generated UUID and guided-mode defaults. |
| `validate(value)` | A detached, strictly validated version 1 or 2 snapshot; no strings are trimmed or rewritten. |
| `parse(text)` | A validated snapshot from bounded JSON; duplicate member names, including escaped aliases, are rejected. |
| `serialize(value)` | Compact JSON after validation; no file is written. |
| `await hash(text)` | Lowercase hexadecimal SHA-256 of the text's UTF-8 bytes. |
| `await inspect(workspace, catalog, core, currentSources?)` | `{warnings, unresolved}` without altering the workspace or composing replacements into it. |
| `migrate(version1)` | A detached version 2 copy with a new UUID, empty profiles and quick mode; the input remains unchanged. |

Invalid values throw `Error`. Synchronous validation checks structure, **not**
template or profile-snapshot integrity. The importer must call and await `inspect`
successfully and offer a preview before accepting a new workspace. A mismatched
original-template or profile-snapshot hash throws, including for a technique
absent from the current catalog. Migration is only called after acceptance.

`SCHEMA` is an immutable JSON Schema 2020-12 contract matching
`packages/schemas/workspace.schema.json`. `LIMITS` exposes implementation resource
bounds. The lightweight runtime validator implements the keywords used by this
contract, not arbitrary third-party JSON Schemas. Document-byte, Unicode,
duplicate-member and cross-item uniqueness checks are additional runtime gates.

## Fields

All properties below are required and no additional properties are accepted:

```text
schemaVersion: 2
id: UUID
name: nonblank text
sources: {attack, atlas, d3fend, car, attackFlow}
profiles: [environment profile objects]
activeEnvironment: null | an applied environment profile snapshot
drafts: [{techniqueId, mode, target, text, template, templateSha256, context,
          environment: null | profile snapshot, environmentSha256: null | SHA-256}]
context: currently applied environment context
contextInput: unapplied environment text still in the editor
collections: [{id: UUID, name, techniqueIds}]
favorites: [technique IDs]
flow: {title, steps: [technique IDs]}
view: {
  query, domain, tactic, platform, mode, target, technique, compare,
  theme, tab, paneWidth, listScroll, mobileView, composer, guideStep
}
```

`sources` values are nonblank version/commit strings, not authenticated source
claims. No keys for credentials, reviewers, signatures, validation status or
store revisions exist. Storage revisions belong to an external storage wrapper.

Each draft's `template` is the exact original composer output, and
`templateSha256` hashes that string. `context` inside the draft is the context
used to create **that template**, not the workspace's latest context. `text`
contains the saved editor text, including changes. This preserves provenance
when sources, composer logic, applied context or other drafts later change.
Do not regenerate templates merely to make an import agree with current code.

Draft keys `(techniqueId, mode, target, environmentSha256 || "none")`, saved profile
UUIDs and collection UUIDs must be unique. The profile snapshot and its hash must
both be null or both be present. A snapshot's target must match its draft target;
the applied environment target must match `view.target`.
Favorites, collection memberships and comparison IDs cannot contain duplicates.
Flow steps may repeat a technique because repeated steps can be intentional.

Profiles use the same strict version 1 environment contract as portable
`.pad-environment.json` files. `profiles` contains the latest saved profiles;
`activeEnvironment` is the explicitly applied snapshot. It may contain a previous
revision or a profile later deleted from the saved list. Each draft retains its
own snapshot, using canonical environment serialization for its SHA-256. Editing
or removing a saved profile does not rewrite these snapshots, contexts or drafts.
Snapshots describe user input or examples, not verified telemetry availability.

## Defaults and limits

New workspaces contain empty lists, blank applied/unapplied context and
`flow: {title: "Research hypothesis", steps: []}`. View defaults are:

```json
{"query":"","domain":"","tactic":"","platform":"","mode":"detect","target":"Platform-neutral","technique":"","compare":[],"theme":"system","tab":"prompt","paneWidth":330,"listScroll":0,"mobileView":"list","composer":"guided","guideStep":1}
```

The default target is `core.TARGETS[0]`. Valid modes, targets and themes use the
current core allowlists. Domain accepts blank, `All`, `Enterprise`, `Mobile`,
`ICS`, `OT` and `ATLAS`; the aliases remain literal saved state.

- Maximum serialized size: **5 MiB UTF-8**, including JSON syntax/escaping.
- Maximum drafts: 1,000; collections: 100; favorites or IDs per collection: 1,115.
- Maximum saved profiles: 100. Each environment field follows the shared profile
  contract, including five free-text fields of at most 4,000 code units each.
- Draft text and original template: at most 200 Ki UTF-16 code units each.
- Workspace and draft contexts: 4,000 code units each; names and flow title: 120;
  source version strings: 128.
- Query: 200; tactic/platform: 100; comparison: two IDs; flow: 20 steps.
- Tabs: `prompt`, `evidence`, `defenses`, `flow`.
- Pane width: integer 240–480; saved list scroll: finite number 0–10,000,000.
- Mobile view: `list` or `detail`.
- Composer view: `guided` or `quick`; guide step: integer 1–4.
- Defensive traversal: nesting depth 12 and 150,000 JSON values; objects have at
  most 32 own fields and arrays at most 1,115 entries before field-specific checks.

Control characters other than tab, carriage return and newline are rejected,
as are unpaired Unicode surrogates. Runtime length checks use UTF-16 code units,
matching browser form limits; JSON Schema `maxLength` counts Unicode code points,
so runtime checks are stricter for non-BMP characters. Programmatic inputs must
be plain, enumerable JSON data: no getters, hidden properties, functions, sparse
arrays, custom prototypes, cycles or prototype-control keys.

## Inspection and preservation

ATT&CK and ATLAS IDs are syntax-checked, but unknown IDs are preserved. Inspection
collects missing IDs from drafts, favorites, collections, flow, current selection
and comparison. It returns them sorted in `unresolved` and reports warnings.

Warning codes are `unresolved-technique`, `source-version-mismatch`,
`template-changed` and `template-unavailable`. At most 200 detailed warnings are
returned; an `additional-warnings` summary includes the omitted warning `count`.
The complete sorted `unresolved` list is retained. Warnings contain a fixed message
and, where relevant, `techniqueId`, zero-based `draftIndex` or source key.
When all five `currentSources` are supplied, every version is compared. Otherwise
only ATT&CK/ATLAS versions discoverable in the supplied catalog are compared.

For resolvable drafts, the current composer is called only for comparison with
the saved original template, using that draft's own mode, target, context and
environment snapshot (if present).
The original template and saved editor text are never replaced. A changed
template warning is not proof of malicious modification: legitimate composer
or source changes can produce it. A matching hash proves internal byte
consistency, not authorship or authenticity; a file author can change both
template and hash.

## Version 1 migration and local-storage isolation

The original strict version 1 format remains accepted. It has none of `profiles`,
`activeEnvironment`, draft environment fields, `view.composer` or `view.guideStep`;
adding any of them to a version 1 document is invalid. The public JSON Schema
contains both exact alternatives. No old context text is automatically parsed
into a profile. Migration preserves every existing text, source reference,
template hash and view value, adds null/empty profile fields and quick mode, and
assigns a new identity. Original files remain untouched.

Version 2 uses the isolated `pad-workspaces-v2` IndexedDB database and the
`pad-workspaces-enabled-v2` consent preference. An old application tab continues
using `pad-workspaces-v1`, so it cannot silently overwrite a version 2 record with
an old schema. Existing consent is not automatically extended to the new store.
Version 2 writers retain atomic expected-revision and deletion-epoch checks.

To recover older local workspaces, open Workspaces and select **Import older
local workspaces**. This explicit action reads bounded records using read-only
transactions and closes the legacy connection. If no legacy database exists,
the creation transaction is aborted rather than leaving a new database. Choose
an **Older workspace** entry in the workspace selector to preview it, then accept
the new copy. Reading, cancelling or accepting never updates the legacy record.
If reading is unavailable, export a workspace file from the older app and import
it normally. No asynchronous discovery automatically activates a workspace.

Deleting local data in this version clears only version 2 storage; the dialog
and completion message explicitly state that older version 1 storage remains.
To remove the original old data, use the older app's confirmed deletion action
or the browser's site-storage controls after backing up anything needed.

## Privacy and integration responsibilities

An exported workspace deliberately contains analyst text and environment
context. Treat it as private, inspect it before sharing, and use synthetic data
instead of secrets. Field allowlists reject secret metadata, but cannot reliably
recognize secrets pasted into ordinary text. Workspace data never belongs in a
public URL, analytics event or automatic upload.

Render names, drafts and warnings literally. Do not execute templates or follow
instructions inside imported text. Await inspection before state replacement;
offer explicit decisions for unresolved or changed templates, and keep the
existing workspace intact when parsing or integrity validation fails. The pure
module does not grant consent to store or share a workspace.

Run `node --test tests/workspace.test.cjs` for format, preservation, byte/depth,
duplicate-key, prototype/accessor, integrity, unresolved-reference and browser
global regressions. UI and storage persistence need their own integration tests.
