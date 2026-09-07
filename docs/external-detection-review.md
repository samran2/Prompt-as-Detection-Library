# External detection comparison

Reviewed on 2026-09-08 at the owner's request. [detections.ai](https://detections.ai/detections)
was used as an additional comparison source, not a replacement for pinned MITRE
ATT&CK 19.2. We did not import rule bodies, copy a catalog or infer complete ATT&CK
coverage from community labels.

## What was accessible

| Public example | Visible evidence | Review implication (our analysis) |
| --- | --- | --- |
| [PowerShell hunt](https://detections.ai/detections/01a06cda-45bc-7404-bad0-83c54f170db7), Splunk Security, SPL | Summary describes script-block events and text matching; the browser detail page shows a registration gate for the rule itself. | Require confirmed collection and field semantics. A description or ATT&CK tag cannot establish query correctness. |
| [Unix browser-to-shell activity](https://detections.ai/detections/01a072b6-9f63-738a-9d2d-cb1caaa35443), Splunk Security, SPL | Listing describes a process chain with an outbound connection and acknowledges legitimate software workflows. | Specify entity linkage, event ordering and benign lookalikes instead of treating unrelated co-occurrence as a chain. |
| [IP lookup and infrastructure contact](https://detections.ai/detections/01a05e86-bb8b-749e-a708-474bf5670273), Renata Cardoso, KQL | Listing describes sequential network observations. | Ask for corroborating evidence and justified time bounds. |
| [Google Drive API activity](https://detections.ai/detections/01a06f38-4f37-7542-bbfe-044766db4e72), Arnold Chan, KQL | Listing associates common service destinations with possible abuse. | A common domain or single indicator is a hunting lead, not proof of C2 or exfiltration. |

These are observations of public metadata and descriptions, **not audits of the
underlying rules**. Non-PowerShell detail-page fetches were unavailable. Actual
query syntax, field mappings, exclusions, test evidence and item-level licenses
were not inspected. No registration, account creation, access-control bypass or
rule execution was performed.

## How this influenced the prompts

The shared response contract now explicitly requires corroboration for weak
indicator/service matches and independent justification of ATT&CK mappings.
It does not treat community tags, popularity or a source example as evidence of
local detection coverage. Existing improvements also require a local-schema
readiness decision, scoped analytics, correlation semantics and benign controls.
One additional regression test failed before this clarification and passed after it.

## Reuse boundary

Public visibility is not a redistribution license. The [terms page](https://detections.ai/terms/full)
did not expose inspectable rule-reuse terms in the text reader; reuse permission
was not established. This repository includes only links and original comparison
notes, not third-party rule code. Its MIT license does not relicense external rules.
Any future rule import needs explicit item-level provenance, applicable licensing
and a separate correctness review. Source links may change after the review date.
