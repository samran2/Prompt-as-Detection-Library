# Getting a useful answer

Choose a technique, task and output target. Add the relevant environment details,
then apply the context and copy the prompt. The library composes text locally; it
does not run a model or deploy a detection.

| Task | Main result requested |
| --- | --- |
| Detect | Rule specification and, when the supplied schema supports it, a draft for the selected target. |
| Hunt | Hypothesis, evidence that supports or disproves it, ordered investigation steps and stop conditions. |
| Triage | Evidence timeline, disposition, uncertainty and escalation conditions. |
| Validate | Offline test matrix: positive, benign lookalike, missing data and boundary cases; expected results remain separate from execution. |

Every answer is requested in four parts: summary, the selected result, checks and
limits, and the next step. References appear beside supported claims. Explanations
use the shortest complete answer, normally within 400 words, excluding code and a
necessary test table; essential evidence
takes priority over brevity. A model may still need correction.

## Supply the details that matter

Use the environment context for the actual operating platform or AI component,
collection source, table/log type, field names and types, time and entity fields,
and relevant constraints. Use redacted examples rather than credentials or
private logs. Catalog filters narrow the list; they do not configure the local
schema or automatically select a source analytic inside a prompt.

For example, a Sentinel detection request should identify the actual workspace
tables and relevant columns. Without those inputs, the prompt asks for specific
gaps and conceptual pseudocode. Choosing Sentinel alone does not prove that its
workspace contains the required data. The same boundary applies to every target.

When several source analytics could apply, specify the intended operating
platform/provider and analytic in context. Source alternatives remain available
for inspection, but the answer must focus on the supplied scope.

## What changed in profile PAD-v0.4.0-dev3

The previous template requested eight ATT&CK or nine ATLAS output sections,
duplicated an evidence ledger, demanded named owners without supplied identities,
and asked triage/hunt users for a separate test matrix. The shared composer now
consolidates that structure and asks for at most three prioritized questions
when inputs are missing. Unsupported conclusions remain insufficient evidence.

All pinned source descriptions, references and technique coverage are retained.
The text files and browser/CLI templates are regenerated together. Saved edited
workspace drafts keep their original text and hashes; users choose when to move
to a new template.

Tests check the requested format across 1,115 records, four modes and six targets
(26,760 combinations), literal context handling and existing source/safety
contracts. These checks do not measure model compliance or detection performance.
No model output, human review score or laboratory result is fabricated.
