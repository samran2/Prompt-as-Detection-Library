# External research sources

Open **Evidence → External research sources** for the selected technique, or
**Research tools → External sources** for the general directory. This development
addition links three upstream projects; it does not mirror their catalogs.

[Desktop preview](screenshots/research-sources-desktop.png) ·
[Mobile preview](screenshots/research-sources-mobile.png)

| Project | Research purpose | Official links |
| --- | --- | --- |
| LOLBAS | Windows binaries, scripts and libraries that can be misused; upstream behavior and detection references | [Website](https://lolbas-project.github.io/) · [Repository](https://github.com/LOLBAS-Project/LOLBAS) · [License](https://github.com/LOLBAS-Project/LOLBAS/blob/master/LICENSE) |
| GTFOBins | Unix executable behaviors, prerequisites and configuration-dependent security boundaries | [Website](https://gtfobins.org/) · [Repository](https://github.com/GTFOBins/GTFOBins.github.io) · [License](https://github.com/GTFOBins/GTFOBins.github.io/blob/master/LICENSE) |
| LOLDrivers | Windows vulnerable/malicious driver intelligence and upstream detection references | [Detections](https://www.loldrivers.io/detections/) · [Repository](https://github.com/magicsword-io/LOLDrivers) · [License](https://github.com/magicsword-io/LOLDrivers/blob/main/LICENSE) |

## Use the links as research, not proof

An ATT&CK ID creates a quoted, repository-scoped GitHub code search. This is
**not a verified mapping** or exact semantic match. A result may reference a
different platform or subtechnique; a search may return nothing or require login.
Check the original entry, its prerequisites, references and applicability to your
actual telemetry. No parent-child mappings or OT/Mobile coverage are inferred.
ATLAS records show the general directory only; no ATLAS mapping is claimed.

No commands, detection rules, binary samples or drivers are imported or executed.
These sources are not added to prompts, prompt exports or review evidence. Their
websites and repositories are one project each, not independent corroboration.
The pinned MITRE catalogs and all 1,115 text prompts remain unchanged.

## Privacy and source terms

Rendering cards makes no network requests. Selecting a link opens a third-party
site in a new tab with no opener/referrer. Searches contain only the selected
public technique ID, never workspace names, profiles, prompts or investigation
text. After navigation, the destination's own privacy and authentication terms
apply; offline use cannot open the remote pages.

Upstream content is live, not version-pinned or availability-monitored. The
links and original short descriptions do not grant reuse rights over upstream
content. Consult the linked source licenses before copying any entry; the MIT
license for this project's code does not replace them. No affiliation,
endorsement, independent validation or successful detection is asserted.

## Implementation and verification

`demo/research-sources.js` owns the fixed directory, bounded ID handling and
literal-DOM renderer shared by both pages. It is explicitly allowlisted by the
static build and adds no runtime dependencies or storage. Its missing-asset
message stays visible if the optional module is unavailable.

See [the bounded specification](../SPEC-research-sources.md),
[unit tests](../tests/research_sources.test.cjs),
[browser checks](../scripts/research_sources_browser_checks.cjs) and the
[verification record](verification.md) for actual outcomes and remaining gates.
