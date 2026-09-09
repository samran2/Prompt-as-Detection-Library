---
name: Native rule or support assessment
about: Propose a product-native rule, fixture change, or evidence-backed not-applicable decision.
title: ''
labels: ''
assignees: ''
---

## Mapping and target

- ATT&CK release and technique ID:
- Prompt/content SHA-256:
- Domain: Enterprise / Mobile / ICS
- Native target and product version:
- Proposed state: supported / not-applicable

An unassessed matrix cell is not `not-applicable`. Do not propose an executable
rule without a real telemetry path.

## Telemetry contract

- Data source and collection path:
- Required tables, event types and fields:
- Field mappings and units:
- Required retention, permissions or product features:
- Missing telemetry behavior:
- Known platform or deployment limitations:

## Rule and provenance

- Rule path or proposed location:
- Origin and author:
- SPDX license identifier:
- External fragments and source URLs:
- Rule/parser version:

Do not paste third-party rule code without verified rights and item-level origin
metadata.

## Reproducible fixtures

- Positive fixture and expected match:
- Benign-lookalike fixture and expected non-match:
- Missing telemetry fixture and expected outcome:
- Boundary fixture and expected outcome:
- Fixture SHA-256 values:
- Replay command/environment:
- Observed results:

Parser/lint success is structural evidence, not lab validation.

## Lab or not-applicable evidence

For a supported rule, identify the sanitized lab environment, product version,
reviewer, date and result digest. For `not-applicable`, explain why the target
cannot observe the behavior and cite authoritative telemetry documentation.
Never include credentials, customer logs or proprietary sample content.

## Independent review

- Content/domain reviewer:
- Product/telemetry reviewer:
- Security reviewer, if required:
- Validation status requested:
