# D3FEND research supplement

This optional, offline supplement joins official MITRE D3FEND 1.6.0 inferred
relationships to exact active IDs in the pinned ATT&CK 19.2 library. It adds
research context without modifying any of the 1,115 ATT&CK/ATLAS detection prompts.

The versioned mapping contains Enterprise, ICS and SPARTA relationships. The
local supplement includes 311 of 697 Enterprise records and 58 of 97 ICS records.
There are no direct Mobile or ATLAS mapping rows in this source release. All
124 Mobile and 197 ATLAS records remain present with empty relationship lists.
An empty list means no exact source mapping, not that no defensive technique
could apply. The 23 mapped ATT&CK IDs absent from the current active library and
all SPARTA rows remain in the pinned source but are excluded from the supplement.

`coverage.json` records source counts, exclusions, the mapping checksum and the
generated browser artifact checksum. `demo/d3fend-catalog.js` exports
`PAD_D3FEND_CATALOG` in the browser and the same object through CommonJS.

Each relationship preserves the explicit relation-bearing defensive technique,
both defensive and offensive artifact URIs and labels, both relation URIs, and
the original query and top-level defensive labels. The query label can differ
from the technique that owns the relation; it must not silently replace that
technique. `sourceRows` contains 1-based CSV **data row** indices, excluding the
header. Identical displayed paths are deduplicated while retaining every source
row index. Indices bind to `sourceSha256` and the versioned `sourceUrl`.

No parent-ID inheritance, renamed-ID substitution or cross-framework inference
is performed. D3FEND itself describes these mappings as inferred and experimental;
they do not establish effectiveness, priority, telemetry availability or local
validation. The supplement must not promote any prompt's review state.

Run `node scripts/build_d3fend.cjs --check` to verify all pinned source bytes and
deterministic generated outputs offline. Run without `--check` to regenerate only
the three allowlisted D3FEND outputs. Source changes require a reviewed version
and checksum update. Neither command downloads data or executes source content.

Sources and terms:

- [Versioned ontology resources](https://d3fend.mitre.org/resources/ontology/)
- [Mapping CSV](https://d3fend.mitre.org/ontologies/d3fend/1.6.0/d3fend-full-mappings.csv)
- [Ontology JSON-LD](https://d3fend.mitre.org/ontologies/d3fend/1.6.0/d3fend.json)
- [D3FEND FAQ](https://d3fend.mitre.org/faq/)
- [D3FEND Terms of Use](https://d3fend.mitre.org/tou/)

The raw source retains its upstream license and third-party notices (including
SPARTA) under `sources/d3fend-1.6.0/`. The public supplement carries
`demo/D3FEND_LICENSE.txt`; the project's MIT code license does not replace those
source terms.
