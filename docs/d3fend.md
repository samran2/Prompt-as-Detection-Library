# D3FEND defensive context

The workbench connects offensive techniques to MITRE D3FEND countermeasures
using the pinned **D3FEND 1.6.0** ontology and full mapping CSV. This is an
offline research supplement, not another offensive prompt catalog, an executable
control or a claim of detection effectiveness.

## Use it

Select a technique and open the **D3FEND** tab. For an example with OT mappings,
search `T0800` (Activate Firmware Update Mode). Each countermeasure shows its
definition, tactic, official source and expandable artifact relationships.

**Download defense brief (.txt)** produces separate defensive research guidance;
**Export D3FEND JSON** preserves the structured relationships and source hash.
Neither includes analyst context or prompt-editor changes. Existing detection
prompts, TXT/JSONL exports and review status remain unchanged.

The same capability is available locally without dependencies or network access:

```sh
node scripts/library_cli.cjs defenses T0800
node scripts/library_cli.cjs defenses T0800 --json
node scripts/library_cli.cjs defenses T0800 --output ./T0800-defense-brief.txt
node scripts/library_cli.cjs defenses AML.T0051 --json
```

Output files must be new, use owner-only permissions and retain the existing
exclusive-write/checksum behavior. The last example returns an explicit unmapped
result, not an error or a guessed cross-framework mapping.

## What the snapshot covers

| Existing library domain | Exact mapped records | Total records |
| --- | ---: | ---: |
| Enterprise | 311 | 697 |
| Mobile | 0 | 124 |
| ICS / OT | 58 | 97 |
| ATLAS AI | 0 | 197 |
| **Total** | **369** | **1,115** |

The supplement includes 154 relation-bearing defensive techniques and 10,892
distinct paths from 14,830 matching source rows. These are not additional
validated prompts. The [coverage manifest](../content/d3fend/coverage.json)
accounts for all 16,249 source rows, including excluded SPARTA rows and source
ATT&CK IDs outside our active pinned scope.

The downloaded 1.6.0 mapping file contains Enterprise, ICS and SPARTA rows, but
no Mobile or ATLAS rows. Missing mappings mean **no exact relationship in this
snapshot**, never “no defense exists.” Parent relationships are not inherited:
for example, `T1059.001` remains explicitly unmapped. Missing or invalid
supplemental assets have a separate unavailable state; the prompt workbench
continues to function.

## Relationship meaning and provenance

[MITRE describes these mappings as inferred relationships](https://d3fend.mitre.org/resources/ontology/).
They are research context, not effectiveness rankings, telemetry guarantees or
local validation. Evaluate applicability, actual fields, benign cases, blind
spots and operational safety before considering a control.

Every path preserves **two separate artifacts** and their relations. For example,
a defensive technique may harden a Credential while the offensive technique
accesses an Encrypted Credential. Collapsing these into one object would change
the source claim. The displayed countermeasure belongs to the CSV's explicit
`def_tech`; the source query and top-level labels are retained separately because
hierarchy inference can make them different. Source row numbers count CSV data
records from 1, excluding the header; quoted newlines do not create extra rows.

Sources and all file hashes are in the
[source manifest](../sources/d3fend-1.6.0/manifest.json). The unmodified ontology,
mapping CSV, taxonomy CSV and captured terms are preserved for offline audit.
The source is pinned, never fetched during app use, tests or builds.

```sh
npm run d3fend:verify
# Only after an intentional, reviewed source or generator change:
npm run d3fend:build
```

Verification checks fixed source hashes, regular bounded files, exact active-ID
joins, defensive IDs/definitions, exclusions and deterministic output bytes.
Updates require a reviewed source/terms diff and coverage regression checks.
Checksums establish identity, not effectiveness or independent expert review.

## Boundaries and licensing

The supplement adds no runtime service, model calls, analytics or automatic
external requests. Clicking an official source link deliberately opens MITRE's
site. The full mapping snapshot adds about 5.6 MB of uncompressed JavaScript to
the offline-capable browser download; performance targets are not claimed from
local smoke tests. D3FEND is not exposed by the experimental research API in
this change.

Preserve the [D3FEND source notice](../demo/D3FEND_LICENSE.txt) and
[upstream terms](https://d3fend.mitre.org/tou/), including the bundled framework
notices. Our MIT code license does not replace them. This project is independent
and is not endorsed by MITRE. D3FEND exports remain **draft, not validated**.
