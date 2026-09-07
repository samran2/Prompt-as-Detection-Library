# Prompt-quality review

## Scope

Review the shared prompt contract and a risk-stratified sample of Enterprise,
Mobile and ICS prompts; apply justified improvements consistently to all 918
active records. Preserve the pinned ATT&CK 19.2 sources and all source-derived
catalog and procedure bytes. No model calls, rule execution or dataset upgrade.

The public README demo-link improvement is a separate authorized change.
The owner subsequently authorized publishing the prompt improvements too.
Develop on `fix/prompt-quality-review`, complete review and verification, then
publish the approved repository and demo. Do not inherit security approval from
the older immutable snapshot.

## Acceptance criteria

- [x] Prompts require explicit gaps and non-executable conceptual logic when local
  schema/capabilities are missing, not invented executable rules or calibrated thresholds.
- [x] Modes request distinct deliverables; targets specify appropriate draft
  formats without claiming product compatibility.
- [x] Technique references and analytic source URLs survive TXT/JSONL composition.
- [x] Historical examples, local observations and assumptions are distinguished;
  analytics are selected by applicable platform, not blindly combined.
- [x] ICS test plans remain passive/offline; Mobile collection prerequisites and
  source `None` placeholders are explicit without altering source data.
- [x] New tests demonstrate RED before the fix, then all tests, exact generated
  parity, CLI and real-browser checks pass.
- [x] Independent review, scope/limits and actual results are documented.

## Implementation sequence

1. Independent domain/contract reviews and baseline suite.
2. Regression tests first; one bounded shared-core prompt improvement.
3. Regenerate text prompts and coverage hashes, verify unchanged source payloads.
4. Run complete verification and independent diff/content review.
5. Save the reviewed change, pass hosted CI and CodeQL on the reviewed commit,
   deliberately update the existing demo and verify the observed live result.
