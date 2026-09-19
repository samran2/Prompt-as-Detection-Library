# Minimal research mapping snapshot

This is a projection of source mapping fields, not a searchable mirror of tool
catalogs. It contains no command bodies, rule detection blocks, hashes of driver
samples or binaries. See [the user guide](../../docs/research-sources.md).

- `upstream.json`: retrieval time, original payload identities and 496 raw
  mapping rows (484 LOLBAS command-ID fields, 12 LOLDrivers rule tags). Duplicate
  entries retain field locators; exact active-ID filtering happens during build.
- `manifest.json`: hashes of retained files and original legal-text origins.
- `LOLBAS-license.txt` / `LOLBAS-notice.txt`: complete GPL-3.0 and NOTICE.
- `LOLDrivers-license.txt`: complete Apache-2.0 license. Rule metadata author:
  Nasreddine Bencherchali (Nextron Systems).

The legal files are LF-normalized; original and retained hashes are distinct
where normalization changed bytes. The legal-text commit does not assert that
the LOLBAS API payload came from that commit. Its identity is its recorded
retrieval timestamp and original payload SHA-256.

GTFOBins associations (and supplemental LOLBAS citations) are derived directly
from the existing pinned MITRE ATT&CK 19.2 bundles, not a GTFOBins taxonomy or
keyword classifier. MITRE source terms remain separate. Project code remains MIT.

To refresh, inspect the official API or immutable Sigma headers and use the
generator's pure `projectLolbas` / `projectDriver` functions to project only
approved fields. Record each rule's actual upstream status in source metadata.
Verify the projection against the downloaded bytes, retain original payload
hashes and locators, update retained-file hashes, and inspect the complete diff.
Do not commit the downloaded command/rule bodies. A source hash is an integrity
identifier, not a signature, source-quality certification or validation claim.

Run `npm run research:mappings:build` and `npm run research:mappings:verify`.
The latter must pass offline without refreshing sources or changing statuses.
Review excluded IDs explicitly; never substitute a newer ID without evidence.
