# External research sources and ATT&CK associations

Open **Evidence → External research sources** for the selected technique, then
**Inspect links** to see the matching entries. **Provenance** explains the exact
source field, version and SHA-256 behind each link. Research tools also provides
a general directory. These are research associations, **not validated detections**.

[Desktop example](screenshots/research-mappings-desktop.png) ·
[Mobile example](screenshots/research-mappings-mobile.png)

## What is mapped

| Source | Included basis | Active ATT&CK 19.2 records | Source links |
| --- | --- | ---: | ---: |
| [LOLBAS](https://lolbas-project.github.io/) | Explicit `Commands[].MitreID` fields plus separately labeled direct MITRE citations | 62 | 334 |
| [GTFOBins](https://gtfobins.org/) | Direct citations in the pinned MITRE technique objects only | 5 | 5 |
| [LOLDrivers](https://www.loldrivers.io/detections/) | Explicit ATT&CK tags in six pinned upstream Sigma rule headers | 2 | 12 |

Counts overlap and must not be summed into distinct technique coverage. Multiple
source fields may describe the same entry; these share one link with all locators.
A direct citation can name an entire project rather than a specific tool.

- **LOLBAS:** `T1218.005` links to Mshta through its declared ID and MITRE citation.
  The 2026-09-19 API snapshot contains 245 entries; only mapping metadata is
  retained. The source's `T1562` and `T1562.001` IDs are absent from the active
  pinned catalog and are excluded, not guessed into replacement techniques.
- **GTFOBins:** the five cited records are `T1053.002`, `T1218`, `T1543.005`,
  `T1548.001` and ICS `T0894`. The ICS link is a real direct MITRE citation, not
  an Enterprise-to-OT translation. This is **not a mapping of all GTFOBins**.
  Legacy `gtfobins.github.io` URLs are preserved exactly as cited by MITRE.
- **LOLDrivers:** each of the six upstream rules explicitly tags `T1068` and
  `T1543.003`. These are **rule-level tags, not behavior claims for every driver**.
  The referenced rules are experimental and have not been locally lab-validated.

For example, `T1001` and OT `T0800` have no documented links in these snapshots.
Absence here does not prove no relationship exists. Parent mappings are never
inherited by children. ATLAS shows general links only; no ATLAS links are inferred.

The optional quoted GitHub ID searches are clearly separate: a search result is
not evidence of an exact mapping and may be unrelated or require authentication.
Always inspect prerequisites, behavior and your real telemetry before use.

## Provenance, privacy and terms

The [snapshot manifest](../content/research-sources/manifest.json) pins the retained
projection. Original payload hashes and precise field pointers/line numbers live
in [upstream metadata](../content/research-sources/upstream.json). LOLBAS's live API
is identified by retrieval time and payload hash, **not an asserted Git commit**;
the complete original API body is not archived here. LOLDrivers rule references
use commit `67ac4a76a641d94c1c14e169df4ee7ca2754f20a`. MITRE citations derive from the
existing ATT&CK 19.2 source manifests. Linked websites may change independently.

Only minimal mapping metadata is bundled. No command/rule bodies, binary samples
or drivers are bundled or executed. Rendering makes no external requests. Links
open only when selected, without opener/referrer; the destination's own privacy
and login policies then apply. Searches include only a public technique ID,
never profiles, drafts, workspace names or investigation context.

The metadata does not enter prompts or exports, alter the pinned catalogs or
promote review status. All 1,115 text prompts remain unchanged. Source cards and
repositories are not independent corroboration of one another. No endorsement,
affiliation, source correctness certification or successful detection is implied.

LOLBAS GPL-3.0/NOTICE and LOLDrivers Apache-2.0/author attribution accompany the
modified metadata in the public [research notices](../demo/RESEARCH_SOURCES_LICENSES.txt).
MITRE citations retain the separate MITRE notice. Project code remains MIT; those
terms do not relicense source content. See [licensing](licensing.md).

## Maintenance and checks

`scripts/build_research_mappings.cjs` performs an offline exact-ID/domain join and
validates source identities and allowlisted HTTPS paths. Its pure projection
helpers discard command and rule bodies. Updates require a separately reviewed
official-source projection, recorded original payload hashes/locators, refreshed
manifest hashes and unchanged source notices. Do not fetch mutable sources in CI.

```sh
npm run research:mappings:build
npm run research:mappings:verify
node --test tests/research_mappings.test.cjs tests/research_sources.test.cjs
```

The verifier rejects source-hash and generated-output drift. The generated index
also retains an `excluded` report for source IDs outside the active domain.
`npm run build` verifies the index and includes only its two allowlisted public
assets. The shared renderer uses literal DOM text and distinguishes a missing
index from zero documented links. No runtime dependencies or storage are added.

See [the mapping specification](../SPEC-research-mappings.md),
[browser checks](../scripts/research_sources_browser_checks.cjs) and
[verification](verification.md) for actual results and publication gates.
