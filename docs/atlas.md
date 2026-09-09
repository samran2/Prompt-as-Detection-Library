# MITRE ATLAS AI

The AI section contains **197 source-linked text prompts** from MITRE ATLAS
2026.08: 114 parent techniques and 83 subtechniques. It sits alongside, not inside,
the unchanged ATT&CK 19.2 corpus of 918 records. The combined workbench contains
1,115 records, with separate framework identifiers and versions.

## Use the AI section

Open the workbench and select **ATLAS · AI**. Search by an AML identifier such as
`AML.T0051`, a name or literal source text. A parent-ID search includes its
subtechniques. The Sources panel shows the full technique description, source
maturity, linked case studies and mitigations. Compare two records, follow an
explicit MITRE source link, or save a detection draft as TXT, JSONL or research
JSON. A shared URL contains view settings, never analyst context or draft edits.

Local CLI examples, using Node.js 22+ from the repository root:

```sh
node scripts/library_cli.cjs list --domain ATLAS
node scripts/library_cli.cjs list --framework ATLAS --query AML.T0051
node scripts/library_cli.cjs prompt AML.T0051
node scripts/library_cli.cjs export --framework ATLAS --output ./atlas-prompts.jsonl
node scripts/library_cli.cjs list --framework all
```

Exports refuse to overwrite an existing file. Default CLI list/export commands
remain ATT&CK-only for compatibility. The local read-only API adds
`/v1/atlas/techniques`, `/v1/atlas/prompts`, `/v1/atlas/relationships`,
`/v1/atlas/versions` and `/v1/atlas/search` without changing the existing ATT&CK
resource defaults. See the [API reference](../apps/research-api/README.md).
GitHub Pages hosts the static workbench, not the API service.

## Exact source and inclusion policy

The authoritative source is the official
[MITRE ATLAS data release v2026.08](https://github.com/mitre-atlas/atlas-data/releases/tag/v2026.08),
commit `41d4f5ca4112f0e492ffaa3ebff07dc80a75afa5`, file
`dist/v6/ATLAS-2026.08.yaml`. Content version is `2026.08`; format version is
`6.0.0`. The versioned file is used instead of the deprecated unversioned YAML.

The [source manifest](../sources/atlas-2026.08/manifest.json) records release and
tag identity, SHA-256 hashes, attribution and the exact source inventory. The
tag was not signature-verified; content hashes establish reproducibility, not
an upstream signature. The checked-in YAML SHA-256 is
`a8d32f676854cc57721c217ec5b39f07db518076dee4a6c1335df0a7bc8271a2`.

All technique and subtechnique records present in this version are included.
This format has no per-record revoked/deprecated flag; the project does not
invent one or infer historical active status. The source also contains 16
tactics, 39 mitigations, 72 case studies and 1,318 relationships. These are not
additional techniques. All relationship records are retained separately in
[relationships.json](../content/atlas/relationships.json); linked case studies
and mitigations are included with their original relationship data. No
cross-framework mapping is inferred.

## Reproduce and verify

```sh
npm run atlas:verify
npm run atlas:build
npm run atlas:verify
```

Verification is read-only and offline; generation is an explicit update of the
owned artifacts. A deterministic JSON derivative supports Node without a YAML
runtime dependency. Independent source review must verify that derivative
against a safe parse of the pinned YAML before accepting any new hash pins.
The generator checks input identity, schema relationships, exact prompt-ID
parity, literal descriptions, and output bytes. See the
[generated inventory](../content/atlas/index.json) and
[coverage hashes](../content/atlas/coverage.json).

## What the evidence does and does not mean

All 197 detection prompts have status **generated**. No independent human
reviews, model evaluations, executable backend rules or lab/field validation
are claimed for this addition. The ATT&CK review registry and support matrix do
not silently cover ATLAS; AI review evidence needs its own framework-aware
records and hash-bound attestations before any maturity promotion.

MITRE's `Realized`, `Demonstrated` and `Feasible` values describe the maturity
of a threat in the source knowledge base. They do not establish that the prompt
detects it. Case-study evidence is not a successful local replay. Mitigations
are source guidance, not tested configurations or detection rules.

Prompts require explicit observability assumptions for the AI application,
model-serving layer, tools, retrieval, data pipeline or identity boundary.
Source absence remains visible: no invented provider fields, event IDs or
product integrations. Privacy-sensitive prompt, output and training data must
not be collected by default. Validate with inert synthetic fixtures; never run
an attack from source text. This application makes no model calls, uploads,
telemetry collections or detection executions.

## License and attribution

Reproduced ATLAS source content is Apache-2.0, Copyright 2021–2026 MITRE. Preserve
the [upstream notice](../sources/atlas-2026.08/raw/LICENSE.txt),
[complete license](../sources/atlas-2026.08/raw/APACHE-2.0.txt) and
[public distribution notice](../demo/ATLAS_LICENSE.txt). Normalized catalogs,
relationship views and prompt framing are identified project transformations;
the versioned YAML remains unchanged. Project code retains its own MIT license.
Linked external publications retain their respective rights. This independent
project is not endorsed by MITRE.
