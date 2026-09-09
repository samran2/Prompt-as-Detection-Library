# Local ATT&CK comparison proposals

Compare an explicitly selected local STIX bundle with this library's pinned
ATT&CK 19.2 domain snapshot. The tool prints a JSON proposal and performs no
network operations, file writes, prompt regeneration or source upgrades. A
proposal is not approval to change the source and is not detection validation.

Run from the repository with Node.js 22 or later:

```sh
node scripts/attack_diff.cjs --domain Enterprise --candidate /absolute/path/to/enterprise-attack.json
node scripts/attack_diff.cjs --domain Mobile --candidate /absolute/path/to/mobile-attack.json
node scripts/attack_diff.cjs --domain ICS --candidate /absolute/path/to/ics-attack.json
node scripts/attack_diff.cjs --help
```

The candidate must already exist as a regular local file. Supply an absolute
path without symbolic links in the file or any parent directory. Only the three
domain spellings above are accepted. URLs, standard input, duplicate options and
an output-file option are rejected. Success writes one JSON object to stdout
and exits with status 0; failure writes a bounded JSON error to stderr, leaves
stdout empty and exits with status 1. Files are never opened for writing. If
you redirect stdout in your shell, the shell controls whether that destination
is overwritten; do not redirect onto a source or candidate file.

## Report contract

The report uses `schemaVersion: "pad-attack-diff/v1"`, `status: "proposed"`,
`domain` and `domainId`. There is no generated timestamp or local input path,
so the same input bytes produce the same report bytes.

Both `baseline` and `candidate` contain the exact input `sha256` and byte count,
the STIX `bundleId`, `collectionId`, claimed `collectionVersion`, and
`objectCount`. The normal CLI additionally records `baseline.pinnedSource`
with the reviewed release, commit and source-manifest hash. The tool verifies
the manifest against the independent pin used by the existing library
generator, then verifies the selected baseline's exact byte count and hash.
The candidate's version label is copied from its collection object and is
unauthenticated; its byte hash identifies the actual comparison input.

`changes` contains sorted arrays of STIX-object changes:

| Field | Meaning |
| --- | --- |
| `added` | The STIX ID exists only in the candidate. |
| `changed` | The same STIX ID has different canonical object content. |
| `removed` | The STIX ID exists only in the baseline. Absence does not mean revocation. |
| `revoked` | An existing object's `revoked` flag became `true`. A subset of `changed`. |
| `deprecated` | An existing object's `x_mitre_deprecated` flag became `true`. A subset of `changed`. |

Each change includes `stixId`, `type`, an `attackId` for techniques (otherwise
`null`), `beforeSha256`, `afterSha256`, and sorted top-level `changedFields`.
Object hashes cover canonical JSON with sorted object keys and preserved array
order. Missing `revoked` and `x_mitre_deprecated` flags are equivalent to
explicit `false`. All other fields, including `modified`, participate in the
comparison. Whole-bundle byte hashes still change for whitespace or reordering,
even when no object content changes. Addition/removal has a `null` hash on the
absent side and an empty `changedFields` array.

Lifecycle arrays overlap `changed`; do not add all five counts together.
Already inactive objects do not create new lifecycle events. Newly added
inactive objects appear under `added`, not under lifecycle transitions.

## Prompt impact

`impactedPromptIds` contains sorted, unique IDs of existing active baseline
techniques whose source dependencies changed. `newTechniqueIds` separately
lists candidate-active IDs without an active baseline prompt, including a
candidate's claimed reactivation. Neither list changes any files or accepts
the candidate's lifecycle claims as valid STIX versioning.

Impact is computed against both snapshots. It follows the explicit paths used
by the current library generator:

- Technique objects and their named tactic objects.
- Active `subtechnique-of` relationships and parent technique objects, affecting
  the child prompt.
- Active `uses` relationships from groups, malware, tools or campaigns to
  techniques, including their source actor objects.
- Active `detects` relationships from detection strategies to techniques,
  including the strategy's referenced active analytics and analytic log-source
  data-component references.

Both the old and new targets are considered when a relationship is reassigned.
Removed or newly inactive dependencies remain reachable through the baseline
snapshot. Unlinked analytics and inactive edges do not imply prompt impact.
Unrelated STIX relationships are reported as object changes but do not create
invented prompt dependencies. A reported dependency change is a reason to
review a prompt; metadata-only edits or changes outside its selected examples
may leave its rendered bytes unchanged.

## Bounds and limitations

Each input is limited to 64 MiB, 50,000 STIX objects, nesting depth 32,
4,000,000 JSON value nodes, 100,000 children per JSON container,
1,048,576 UTF-16 code units per string and 256 per field name. Dependency
traversal has a separate 250,000-operation budget per snapshot, including
visits and associations, to bound relationship/reference expansion.

File reads use a no-follow descriptor, bounded reads, regular-file checks,
opened-file identity checks, change detection and parent-path rechecks. Use a
stable local directory under your control; portable path checks do not provide
a filesystem sandbox against an attacker who can repeatedly replace ancestor
directories. Invalid UTF-8, invalid JSON, duplicate STIX IDs, duplicate technique
ATT&CK IDs, malformed relevant references, non-boolean lifecycle flags and
techniques outside the selected domain are rejected. Historical Mobile/ICS
ATT&CK reference source names are accepted alongside `mitre-attack`.

Provide a complete domain snapshot with exactly one versioned ATT&CK collection
and at least one technique object. General STIX bundles may contain several
versions of one ID; this tool deliberately rejects them instead of silently
selecting a version. It does not prove snapshot completeness, enforce the full
STIX/ATT&CK schemas, authenticate a publisher, check every dangling reference,
or validate monotonic object versions. An incomplete bundle can make unchanged
objects appear removed. Unknown object types and fields remain literal data
and participate in the object diff; they do not acquire execution semantics.

## Programmatic use and checks

`scripts/attack_diff.cjs` exports `compareBundles({domain, baselineBytes,
candidateBytes})`, `proposeAttackDiff({domain, candidatePath})`,
`readBundleBytes(absolutePath)` and the frozen `LIMITS` object. Byte inputs are
Node.js `Buffer` objects. The pure comparison accepts an explicit baseline for
fixtures or analysis and does **not** mark that baseline as pinned. Use
`proposeAttackDiff` or the CLI to obtain the pinned-baseline verification.

```sh
node --test tests/attack-diff.test.cjs
node --check scripts/attack_diff.cjs
```

## Source semantics

MITRE describes the distinction between deprecated objects, revoked objects
and `revoked-by` relationships in its
[official ATT&CK usage guide](https://github.com/mitre-attack/attack-stix-data/blob/master/USAGE.md#working-with-deprecated-and-revoked-objects).
The [STIX 2.1 specification](https://docs.oasis-open.org/cti/stix/v2.1/os/stix-v2.1-os.html)
defines object version identity using `id` and `modified`, and describes
revocation as permanent. This tool's local comparison categories and impact
heuristic are project behavior, not an official MITRE release-diff format.
