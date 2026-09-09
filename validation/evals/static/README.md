# Automated static prompt evaluation

This directory contains a deterministic structural and source-parity assessment
for every prompt. It does not call a model or external service.

Run the evaluator with:

```console
node scripts/evaluate_prompts.cjs
node scripts/evaluate_prompts.cjs --check
```

`scorecards.jsonl` has one `automated-static` scorecard per
`<Domain>:<ATT&CK ID>`. Each scorecard records boolean evidence and reason codes
for seven criteria:

1. factual source grounding;
2. ATT&CK alignment;
3. telemetry-feasibility language;
4. benign-lookalike handling;
5. safety boundaries;
6. citation preservation; and
7. platform-assumption controls.

The factual score proves literal parity with the pinned source-derived catalog;
it is not an expert judgment that ATT&CK or a proposed detection is correct.
The safety score proves that required written guardrails are present; it does
not execute generated output. A perfect static score cannot advance a prompt
from `generated`, replace either independent human review, or claim lab or
field validation.

The evaluator fails the command when any prompt loses record-specific source
text, exact generated hash parity, citation traceability, parent context,
telemetry readiness language, platform controls or mandatory safety language.
`summary.json` provides corpus-level counts and the SHA-256 of the exact JSONL
scorecard artifact.
