# MITRE CAR research supplement

CAR adds source-backed analytic hypotheses, pseudocode and telemetry abstractions
to the technique workbench. It does not change detection prompts, review status,
ATT&CK content, D3FEND relationships or native-rule validation.

## Pinned scope

The source is the official [MITRE Cyber Analytics Repository](https://car.mitre.org/),
Git revision [`1b922fe1527d956e222a99473472e594f10f610b`](https://github.com/mitre-attack/car/tree/1b922fe1527d956e222a99473472e594f10f610b).
This is a commit snapshot, not an invented CAR release/version.

All 102 analytics YAML files are retained byte-for-byte in
`sources/car-1b922fe/raw/analytics/`, together with upstream README, analytic
schema, complete Apache-2.0 license and NOTICE. The lossless JSON derivative
retains all upstream fields. The browser projection contains all 102 analytics,
91 with source pseudocode, linked to 117 active Enterprise technique IDs.
It projects descriptions as hypotheses, retains contributors and source coverage
labels, and names the original file and SHA-256 for each analytic.

Only IDs explicitly present in source `coverage.technique` or
`coverage.subtechniques` are joined, and only when active in the pinned
Enterprise catalog. An explicit parent mapping does not imply mappings for any
children. Source references to T1070.001, T1562, T1562.001, T1562.002 and T1562.006
are retained in the exclusion report, not silently redirected to new IDs.
No Mobile, ICS/OT or ATLAS mappings are invented.

The source format is documented in the pinned
[analytic schema](https://github.com/mitre-attack/car/blob/1b922fe1527d956e222a99473472e594f10f610b/scripts/analytic_schema.yaml).
CAR telemetry uses its [object/action/field data model](https://car.mitre.org/data_model/),
not a guarantee that similarly named product fields exist. Upstream pseudocode
spelling and contents remain literal, including the source type `psuedocode`.

## Evidence and safety

Every analytic is labeled `upstream-research`. Source coverage values such as
“High” are source statements, not local effectiveness measurements. Imported
tests, true-positive samples and execution commands remain inert in the raw
archive/JSON derivative; they are neither executed nor projected as locally
validated evidence. The browser exposes pseudocode, implementation descriptions
and telemetry requirements, not an execution interface. Native implementation
code is retained in the source archive but is not added to the native-rule library.

The feature performs no uploads, model calls, telemetry or network requests.
Source text must be rendered with literal text nodes. Links point to fixed,
commit-specific official GitHub paths. A content hash proves byte identity, not
independent human review, source correctness or successful detection.

## Browser/CommonJS contract

```js
const library = PAD_CAR.createLibrary(PAD_CAR_CATALOG);
const result = library.lookup('T1059.001');
```

`createLibrary(catalog)` validates and snapshots its bounded input. `lookup(id)`
returns an immutable object with:

- `techniqueId` and `analytics`, ordered by CAR ID.
- `source` (name, repository and immutable commit).
- `sourceNotice`, `sourceLicense` and `warning`.

Each analytic includes `id`, `title`, `hypothesis`, `informationDomain`,
`platforms`, `contributors`, source dates, active `techniqueIds`, original
`coverage`, `pseudocode` entries (`type`, `description`, `code`, `dataModel`),
`telemetry`, implementation metadata, `sourceUrl`, `sourcePath`,
`sourceSha256`, `license` and `status`. Unknown but well-formed technique IDs
return an empty array; malformed input throws `Error`. Consumers must retain
the full result notice/license when exporting source-derived text or JSON.

## Reproducible verification

```sh
node scripts/build_car_catalog.cjs --check
node --test tests/car.test.cjs
```

The Node builder has no runtime dependencies or network access. It verifies a
hard-pinned manifest and every retained source/derivative hash, rejects extra
files and symbolic links, and deterministically regenerates the one public
artifact `demo/car-catalog.js`. Ordinary builds do not need Ruby or YAML parsing.

For an independent maintenance-time YAML-to-JSON comparison, Ruby 2.6+ with its
standard Psych/JSON libraries can run:

```sh
ruby sources/car-1b922fe/convert.rb --check
```

This uses safe YAML loading with object classes and aliases disabled. The pinned
snapshot was converted with Ruby 2.6.10/Psych 3.1.0 and checked against all 102 raw
files. Without `--check`, conversion refuses to overwrite existing derivative
or manifest files. A future source update requires a separately reviewed new
snapshot, source diff, applicable notices, new pins and mapping regressions;
there is no automatic upstream refresh.

## Licensing

CAR source and the source-derived catalog are Apache-2.0, separate from this
project's MIT implementation. The browser catalog and lookup exports include the
complete upstream license and NOTICE; source contributors are preserved. Generated
files prominently identify the modified representation. No MITRE endorsement,
certification or partnership is asserted. Source license text is preserved rather
than replacing it with a URL.
