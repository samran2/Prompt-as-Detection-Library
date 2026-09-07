# Prompt quality review

Date: 2026-09-08. Scope: development version `0.3.0.dev3` (npm `0.3.0-dev.3`).
The owner authorized GitHub publication and the updated public demo after
verification. Observed test and deployment outcomes belong in the
[verification record](verification.md); this report does not declare a stable release.

## Method and limits

Independent reviewers examined the shared composer, generator and a
risk-stratified semantic sample of 30 text prompts: 16 Enterprise, seven Mobile
and seven ICS. Selection covered parent/subtechniques, credentials, execution,
cloud identity, collection, exfiltration, pre-compromise activity and sensitive
device/process operations. Pinned source descriptions were treated as reference
data, not instructions to execute.

This is not manual review of all 918 prompts. Exhaustive structural checks of
catalog coverage, reproducibility and technique/mode/target combinations are a
different kind of evidence: they cannot establish semantic accuracy or detection
effectiveness. No model responses, live detections or attack emulation were
evaluated. Findings below are prompt-design gaps, not demonstrated product
vulnerabilities.

## Findings and shared-template changes

1. **Schema and feasibility gate.** Source-listed channels sometimes describe
   behavior rather than queryable schema, for example T1114.002 and T1567.002.
   Tuning variables can contain illustrative thresholds. Require locally supplied
   field mappings, collection capabilities and product context before emitting
   product-specific logic; otherwise return explicit gaps and non-executable
   platform-neutral pseudocode. Missing evidence must not become a true negative.
2. **Mode and target contracts.** Before review, modes changed an opening sentence
   and targets primarily supplied a name. Specify distinct detection, hunting, triage
   and validation deliverables. Product-specific drafts must expose unsupported
   capabilities instead of implying equivalent syntax or correlation support.
3. **Analytic selection and false positives.** Multi-platform parents such as
   T1003 and T1059 contain alternative analytics. Require selected DET/AN IDs,
   platform/provider, required versus optional signals, entity/time mappings and
   justified thresholds. Do not combine unrelated platforms automatically.
   Request concrete benign analogues and distinguishing evidence; source tuning
   suggestions are not blanket allowlists.
4. **Domain-aware safety and visibility.** ICS validation must use offline,
   synthetic event fixtures, never operational controller/process interaction.
   Mobile drafts must establish the available collector and OS/management
   visibility rather than assume privileged telemetry. Validation needs explicit
   fixture inputs, expected results, benign/missing-field/boundary cases and
   no-execution limits; embedded source commands are not test instructions.
5. **Standalone traceability.** Preserve available technique, strategy and
   analytic references and analytic URLs in composed text. Attribute source
   claims using their IDs; documented procedures are historical examples, not
   local observations or actor attribution evidence.

These are shared-template improvements in `demo/core.js`, followed by
deterministic regeneration of all 918 TXT prompts and their coverage/composer
hashes. ATT&CK 19.2 pins, source narratives, procedure relationships and licensing
remain unchanged. The dev3 identifier distinguishes revised prompts from the
published dev2 artifacts; it is not a dataset upgrade or stable release.

Target design references distinguish Panther's Python event-rule contract,
Sigma's backend-dependent correlation capabilities and Defender's specialized
KQL schema: [Panther Python detections](https://docs.panther.com/detections/rules/python),
[Sigma correlation specification](https://sigmahq.io/sigma-specification/specification/sigma-correlation-rules-specification.html),
[Defender XDR query language](https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-query-language).
These references do not certify generated drafts or integrations.

An owner-requested [external comparison](external-detection-review.md) used public
detections.ai summaries, not underlying rule code. It informed an additional
corroboration requirement: a common service or weak indicator is not proof of
compromise, and ATT&CK mappings require independent justification. The PowerShell
rule was registration-gated; no rule import or redistribution permission is claimed.

## Sample inventory

- Enterprise: T1003, T1003.001, T1059, T1059.001, T1078.004, T1098.001,
  T1114, T1114.002, T1041, T1567.002, T1595.002, T1583.001, T1486,
  T1056.001, T1557.001, T1621.
- Mobile: T1429, T1430, T1458, T1464, T1512, T1628.003, T1630.003.
- ICS: T0800, T0814, T0826, T0837, T0880, T0890, T1691.001.

## Verification status

- Baseline: 78 Node tests passed before these revisions.
- Shared-template implementation, 918-prompt regeneration and exact library
  verification: passed; catalog, raw sources and procedures stayed byte-identical.
- Added 13 prompt-quality regression tests, including the external-comparison
  corroboration case, with failing-before/passing-after evidence. The existing
  exhaustive 22,032-composition check remains distinct from semantic evaluation.
- Final full-suite, browser/CLI and hosted outcomes are recorded in
  [verification](verification.md), not inferred from intermediate focused runs.
- The earlier immutable Codex Security audit does **not** cover these prompt
  revisions. Neither that audit nor this review validates detection effectiveness.
