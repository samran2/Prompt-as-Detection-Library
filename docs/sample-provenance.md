# Historical demo sample provenance — 0.3.0.dev1

This page describes the earlier 12-record artifact only. The current independent
full-library rebuild is documented in [source provenance](source-provenance.md).
Sample counts, summaries and platform handling below must not be applied to the
new full catalog. The old artifact remains preserved separately.

This is a **12-record illustrative sample**, not a full ATT&CK library and not
recovered v0.2.0 content. Technique names, IDs, domain, tactics and platforms were
checked against the official MITRE ATT&CK STIX-data **v19.2** snapshot on 2026-09-07.
Behavior summaries, telemetry suggestions, false-positive notes and prompt
instructions are newly written guidance, not verbatim MITRE descriptions or
validated detections. No procedure relationships were reconstructed.

Immutable source: [attack-stix-data commit 6cda5ad](https://github.com/mitre-attack/attack-stix-data/tree/6cda5ad8462c79e14fbb872f4e09059b18e0cfc4),
resolved from tag `v19.2` (annotated tag object `e400737ebdbfd36b72c63181257de7a2759c5945`).
The records came from the `enterprise-attack/enterprise-attack-19.2.json`,
`mobile-attack/mobile-attack-19.2.json` and `ics-attack/ics-attack-19.2.json` bundles
at that commit. Full bundles are not shipped in this sample.

| Domain | Included IDs |
| --- | --- |
| Enterprise (8) | T1059.001, T1059.003, T1053.005, T1105, T1078, T1003.001, T1047, T1566.001 |
| Mobile (2) | T1429, T1437 |
| ICS (2) | T0831, T0843 |

All 12 selected source records are active in that snapshot. The v19.2 tactic
`Stealth` for T1078 is intentional. ICS source platform `None` is displayed as
“Not specified”; an operating system is not invented. The individual technique
links open MITRE's live site, whose content may evolve beyond this pinned snapshot.

MITRE ATT&CK is a trademark of The MITRE Corporation. This independent project
is not endorsed by MITRE. The source-data notice is preserved in
[THIRD_PARTY_LICENSE.txt](../demo/THIRD_PARTY_LICENSE.txt), including in the static
build. Original code in the current independent rebuild uses the owner-approved
[MIT License](../LICENSE); see the [licensing record](licensing.md).
That decision does not replace the MITRE notice or change frozen sample artifacts.
