# Data contracts

This package defines the first version of the library's public research-data
contracts using JSON Schema 2020-12. The schemas are additive to the current
CLI and static workbench formats; they do not silently reinterpret legacy
records.

Every contract uses a stable, versioned URN identifier and rejects unknown
properties. [`manifest.json`](manifest.json) is the machine-readable registry.
Consumers should resolve the URN references from that registry rather than
attempting network access.

The contracts deliberately distinguish four maturity levels:

- `generated`: built deterministically, but not independently reviewed;
- `reviewed`: both independent review slots link to evidence records;
- `lab-validated`: review is complete and reproducible lab evidence is linked;
- `field-confirmed`: review is complete and field evidence is linked.

A pending review slot is a real state, not missing data. Empty evidence
collections must never be presented as completed review or validation.

`index.cjs` provides dependency-free boundary validators for trusted tooling.
`validateContract()` checks one object or catalog and enforces local invariants
such as identifier consistency, fixture outcomes, and native backend/language
matching. It cannot prove that an evidence ID resolves. Release tooling must
also call `validateEvidenceGraph()` with the prompt, review, validation, and
native-rule collections. That set-level check resolves every maturity reference
to the exact subject ID, content version, and hash; checks review slots,
approvals, and independent reviewers; and binds validation levels to the claimed
maturity. These helpers are not a general-purpose JSON Schema implementation.

Catalog digests use the exported `sha256Canonical(items)` helper. It sorts
object keys recursively, preserves array order, serializes the result as UTF-8
JSON without whitespace, and calculates SHA-256. This makes catalog integrity
independent of source-file indentation or object insertion order.

## Compatibility

Schema version and content version are separate. A schema version changes only
when the data contract changes. A content version identifies the prompt or rule
release. Existing v1 fields will not be removed or have their meanings changed;
breaking changes require a new versioned schema namespace.
