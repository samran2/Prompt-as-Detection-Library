# Attack Flow research hypotheses

The local workbench can export an analyst-ordered sequence of 2–20 pinned
ATT&CK techniques as an Attack Flow STIX 2.1 bundle. It does not execute those
techniques, fetch intelligence, or claim that the sequence occurred.

## Use and contract

Add techniques to a flow in the research tools, reorder or remove steps, give
the hypothesis a title, and export its JSON. Repeated techniques and mixed
Enterprise, Mobile and ICS steps are allowed. Review whether the proposed
order actually makes sense: a technique citation does not prove a causal link.
Sharing an exported file is a separate analyst action; nothing is uploaded.

`PAD_ATTACK_FLOW.createFlow(records, {title, description?})` returns a fresh
JSON-serializable STIX bundle and throws `Error` on invalid input. Browser
loading requires `catalog.js` before `attack-flow.js`; CommonJS loads the same
catalog internally. Records must match the pinned catalog's ID, domain, name,
STIX ID and ATT&CK version. Unknown IDs and mismatched references are rejected.

- `title`: nonblank string, at most 200 UTF-16 code units.
- `description`: optional string, at most 4,000 UTF-16 code units.
- Both retain literal text and reject C0/C1 controls except tab/newline/CR.
- Cryptographic UUID support is required. Export IDs and creation timestamps
  identify this newly authored document, not the time an attack occurred.
- No private prompt context, commands, reviewer names, or validation metadata
  are copied from technique records. Analyst-provided description text is
  included, so do not put secrets in it.

## Format and truth boundaries

The exporter targets the official **Attack Flow extension 2.0.0**, not a
made-up 4.0 file format. The upstream documentation has a v4 product heading,
but its normative STIX schema and extension definition remain version 2.0.0.
The source snapshot is pinned to commit
`0bd4a2d45dceacce499d7e94b85f7966e70f5399` in
`sources/attack-flow-2.0.0/manifest.json`.

The bundle contains one `attack-flow` object, ordered `attack-action` objects,
the unmodified official extension definition and its MITRE CTID identity, and
a `note` containing the full upstream Apache-2.0 license. The identity belongs
only to the extension definition: no MITRE authorship is asserted for the
user's flow or its steps. The exporter implementation keeps the project's MIT
license; upstream schema and extension metadata retain Apache-2.0.

Each flow and action has `confidence: 0`, the official speculative category,
and explicit hypothesis wording. The flow uses `scope: "other"`; no incident,
execution dates, command references, successful detection, or validation tier
is fabricated. `start_refs` identifies the first action and each action's
`effect_refs` links to the next. The final action omits `effect_refs`.

Technique references use the existing pinned ATT&CK STIX identifiers. The
source technique objects themselves are not copied into the bundle. A
consumer that resolves them needs the matching ATT&CK source release.

## Compatibility and verification

This is an export-only, linear hypothesis builder. It does not implement the
complete upstream graphical editor, branches, conditions, attack assets,
Flow import, or ATLAS/D3FEND action export. A JSON Schema pass establishes
structure, not operational validity or universal vendor compatibility.

Run `node --test tests/attack-flow.test.cjs` for source hashes, official
flow/action schema declarations, topology, all 918 active ATT&CK records,
input limits, browser module loading, cryptographic-ID behavior, provenance,
literal text, and privacy regressions. These dependency-free tests are
deliberately not a general-purpose JSON Schema validator.

An additional local verification used `jsonschema==4.25.1` with
`Draft202012Validator` and an explicit offline resource registry. All six
objects in an actual two-step export passed the full official Flow/common
STIX/identity/extension-definition/note schemas, including `allOf` and
`unevaluatedProperties`. The STIX schema dependencies were read from the
same pinned upstream commit. No remote reference resolver was enabled.
This was a local format check, not an upstream Builder acceptance test or a
human/lab review. Integration/browser testing is recorded separately by the
release verification report.

## Official references

- [Attack Flow language and confidence definitions](https://center-for-threat-informed-defense.github.io/attack-flow/language/)
- [Pinned normative schema](https://github.com/center-for-threat-informed-defense/attack-flow/blob/0bd4a2d45dceacce499d7e94b85f7966e70f5399/stix/attack-flow-schema-2.0.0.json)
- [Pinned extension definition](https://github.com/center-for-threat-informed-defense/attack-flow/blob/0bd4a2d45dceacce499d7e94b85f7966e70f5399/stix/attack-flow-extension-2.0.0.json)
- [Upstream Apache-2.0 license](https://github.com/center-for-threat-informed-defense/attack-flow/blob/0bd4a2d45dceacce499d7e94b85f7966e70f5399/LICENSE)
