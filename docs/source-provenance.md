# ATT&CK 19.2 provenance and coverage

This complete active library is an independent rebuild from official MITRE
ATT&CK STIX data. The original v0.2.0 application archive remains unavailable;
no original code or byte-for-byte prompt preservation is claimed.

## Pinned source

The [source manifest](../sources/attack-19.2/manifest.json) records the official
repository, retrieval evidence, all nine raw-file SHA-256 values and byte sizes.
The complete raw files are retained under `sources/attack-19.2/raw/`.

- Release: `v19.2`.
- Annotated tag object: `e400737ebdbfd36b72c63181257de7a2759c5945`.
- Resolved commit: `6cda5ad8462c79e14fbb872f4e09059b18e0cfc4`.
- The tag is unsigned. Matching tag/commit evidence and hashes establish the
  pinned bytes; they are not a cryptographically verified release signature.

The manifest's source URLs identify the official `mitre-attack/attack-stix-data`
repository and commit-specific bundle paths. Browser technique links lead to
MITRE's live site, whose content may change independently of this pinned copy.
Dataset upgrades require an explicit separate change.

| Bundle | Exact bytes | SHA-256 |
| --- | ---: | --- |
| Enterprise | 53,835,637 | `dc1639caa5501d720e280cf1cbd8fbe009884a0c9b3e6e9ed9d0c25166c3d8f4` |
| Mobile | 5,750,325 | `acfa5ca2d93484476f79bf38590e2b55bb675fc0ce85e76bffa0af2c82dada64` |
| ICS | 4,057,891 | `08b83d2cea6b6d6752468ef0e62e2ab2a53c9443ef72c439ecccb07ab9e89da9` |

## Active coverage policy

The counting unit is domain plus external ATT&CK technique ID. Include every
attack-pattern where `revoked !== true` and `x_mitre_deprecated !== true` in the
three pinned domain bundles. Parent techniques and subtechniques both require
their own text prompt. Do not naively deduplicate reused STIX objects across
domains or count tactics and procedures as additional techniques.

The exact scope is 918 active records: 697 Enterprise, 124 Mobile and 97 ICS;
378 parents and 540 subtechniques. All 248 revoked/deprecated attack-patterns
are excluded from active output and retained in the coverage exclusions, with
their source identifiers and status. Historical namespaces are preserved where
present in older Mobile/ICS external references.

[Coverage evidence](../library/coverage.json) records exact source, catalog and
text ID sets, per-domain totals, source identity, composer hash and generated
file hashes. `npm run library:verify` recomputes expected content without writing
and rejects missing, changed or extra generated outputs. Totals alone are not
the completeness test.

## Procedures, analytics and source gaps

A qualifying procedure is an active `uses` relationship from an active
intrusion-set, malware, tool or campaign to an active technique in the same domain.
All **18,885** relationships, full descriptions and external references are
preserved in [procedures.jsonl](../library/procedures.jsonl). The browser catalog
embeds at most three examples per technique, ordered by relationship STIX ID;
this is a display subset, not a loss of the underlying procedure library.

Resolve active `detects` relationships from active detection strategies to
active techniques, then use those strategies' analytic references. There are
918 linked strategies and **2,053 linked analytics**. The other **13 active
analytics** have no such source link and remain preserved in raw bundles, without
an invented technique association.

- 24 ICS records have no source-listed platform; display that as unspecified.
- 108 active techniques have no qualifying documented procedure; technique-level
  prompts remain available and identify the absence.
- 62 active techniques have no source-listed telemetry references. Missing
  source log arrays are not populated with invented logs or platform fields.

## Content and rights

The catalog retains complete technique descriptions, linked analytic text,
source log references, mutable elements, source IDs and references. Telemetry
descriptions are derived from those source log references. Local-baseline and
false-positive guidance and prompt instructions are newly authored, clearly
separate from source facts. Strings such as `${NAME}` remain literal data.

Text files use the shared composer with default `detect` mode, `Platform-neutral`
target and empty local context. They are readable without a model account or
service. None is a validated detection or a claim about real-world defensive
coverage, even where source completeness is exact.

Preserve the complete [MITRE data license](../sources/attack-19.2/raw/LICENSE.txt)
and [public notice](../demo/THIRD_PARTY_LICENSE.txt). The public notice preserves
the MITRE text and includes the full project MIT license for the static build.
MITRE ATT&CK is a trademark
of The MITRE Corporation; this independent project is not endorsed by MITRE.
Original project code and associated documentation use the owner-approved
[MIT License](../LICENSE), Copyright (c) 2026 samran2. This does not replace
MITRE's terms for reproduced ATT&CK content; see the
[resolved licensing record](licensing.md).

Raw bundles and the complete procedure file are repository artifacts and never
enter the eight-file static-site build. The preceding 12-record sample and its
provenance are historical; see [sample provenance](sample-provenance.md).

Formatting tools exclude only `sources/attack-19.2/raw/` to preserve pinned
upstream bytes, including Python examples inside upstream Markdown. Source
integrity and coverage checks still validate these files, and the foundation
credential-pattern checker still scans their text. This exception does not
exclude project implementation or generated prompts from repository checks.
