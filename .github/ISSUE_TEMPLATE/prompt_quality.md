---
name: Detection prompt quality or coverage
about: Report a missing technique, incorrect mapping, or prompt improvement.
title: ''
labels: ''
assignees: ''
---

## ATT&CK mapping

- ATT&CK release:
- Prompt/content SHA-256:
- Domain:
- Technique or subtechnique ID:
- Official source URL:

## Observed issue

Describe the missing coverage, unsupported claim, telemetry assumption, or
incorrect procedure relationship. Include the affected prompt path if known.

## Proposed improvement

Explain the defensive behavior and evidence supporting the change.

## Validation evidence

Provide synthetic examples, negative cases, and known limitations. Distinguish
structural prompt checks from tests in an actual detection runtime.

- Current validation status (`generated`, `reviewed`, `lab-validated` or
  `field-confirmed`):
- Rubric version:
- Independent reviewer 1 and review date:
- Independent reviewer 2 and review date:
- Telemetry/platform assumptions:
- Benign-lookalike considered:

Do not nominate a model evaluation as an independent reviewer. If a model result
helped identify the issue, provide its exact model/settings and prompt/response
hashes without API keys, analyst logs or other private inputs.

## Source and safety review

- Could this change introduce a source fabrication or unsupported validation
  claim?
- Could generated output instruct dangerous execution rather than defensive
  analysis?
- Does any external text or rule fragment need item-level SPDX and origin data?
