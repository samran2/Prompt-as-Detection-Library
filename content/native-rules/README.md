# Native-rule support matrix

`support-matrix.json` records one cell for each of the 918 prompts and each
planned native backend: Panther, Microsoft Sentinel, Microsoft Defender XDR and
Splunk. All 3,672 cells begin as `unassessed`.

The matrix does **not** claim that a backend can or cannot observe a technique.
The backend names describe planned output targets, not verified integrations.

A cell may become:

- `supported` only with an item-level SPDX license and origin, an immutable rule
  hash, a named lab environment, a named validator and four fixture results;
- `not-applicable` only after a named assessor documents the telemetry or
  product-capability reason and cites evidence; or
- `unassessed` while neither conclusion has been established.

The Enterprise (100), Mobile (100) and ICS (97) pack sizes are targets. Their
candidate lists remain empty until expert curation occurs. Sorted ATT&CK IDs or
automated heuristics must not be presented as a selection of commonly
observable cases.
