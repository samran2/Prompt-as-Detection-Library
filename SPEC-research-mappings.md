# Source-backed ATT&CK research mappings

The owner's follow-up authorizes replacing search-only context with documented
technique associations. Retain general links and label search links separately.
No command/rule execution, sample handling, model calls or deployment is in scope.

## Evidence policy

Use exact active IDs from the pinned ATT&CK 19.2 catalogs, never names, keywords,
parent inheritance or automatic cross-domain translation. Preserve each basis:

1. LOLBAS: explicit `Commands[].MitreID` fields in an identified official API
   snapshot. Retain only entry name, official URL, ID and source JSON pointers.
2. MITRE citation: a direct external reference on an active technique object in
   the pinned STIX bundles. Distinguish whole-project citations from entry links.
   This supplies GTFOBins associations without inventing an upstream ID taxonomy.
3. LOLDrivers: explicit technique tags in the six official Sigma rule headers,
   pinned to an immutable commit. These are rule-level tags, not per-driver
   behavior mappings or proof that a driver is malicious. No rule bodies copied.

Record original payload hashes, source URLs, extraction date, projection hashes
and exact locators. Preserve upstream licensing/notices separately. Rejected or
inactive source IDs remain visible in the build report; never silently remap them.
No complete upstream catalog, commands or executable samples are mirrored.

## Implementation and commands

- `content/research-sources/`: minimal source metadata snapshots and manifest.
- `scripts/build_research_mappings.cjs`: offline validated join and reproducible
  browser index; `node scripts/build_research_mappings.cjs --check` rejects drift.
- `demo/research-mappings.js`: generated, allowlisted data, not executable rules.
- Existing `demo/research-sources.js`: shared literal-DOM presentation, explicit
  no-mapping/missing-data states, collapsed lists and source/provenance links.
- Tests: `node --test tests/research_mappings.test.cjs tests/research_sources.test.cjs`;
  full `npm test`, `npm run check`, `npm run build` and locked browser suites.

Keep zero runtime dependencies, strict local data boundaries and current prompt,
CLI/workspace contracts. Display metadata only as text; HTTPS origins/paths are
allowlisted. Invalid input fails the build; missing browser index is unavailable,
not an authoritative zero. Imported claims never promote validation status.

## Acceptance

All published rows point to an active exact ATT&CK record and a documented source
field/citation. Test positive matches, unknown/revoked IDs, exact subtechniques,
hostile URLs, input size/type limits, missing data and template-byte preservation.
Verify LOLDrivers T1068/T1543.003 and GTFOBins MITRE-cited records, plus truthful
unmapped T1001/OT/ATLAS states. Inspect desktop/mobile UI and independent code
review; do not confuse this with the still-incomplete formal security scan.
