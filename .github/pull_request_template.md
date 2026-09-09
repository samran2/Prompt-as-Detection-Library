## User outcome and scope

Describe what changes for a user or researcher, why it is needed, and what is
deliberately out of scope. Link the issue or decision record.

## Change classification

- [ ] Application/core behavior
- [ ] Prompt or ATT&CK content
- [ ] Native rule, telemetry mapping or fixture
- [ ] Schema, API or migration
- [ ] UI/accessibility
- [ ] Security or supply chain
- [ ] Documentation/governance only

## Evidence

List commands actually run, test counts and results. Link or attach sanitized
machine-readable evidence bound to this commit and the changed content hashes.
Do not use a checked box as a substitute for a result.

- Focused tests:
- Full Node/Python checks:
- Generation and exact coverage:
- Browser/viewports:
- Accessibility/manual assistive technology:
- Native parser, fixture replay and lab environment:
- Security/dependency/secret scans:
- Reproducible artifact/SBOM/signature/provenance:

## Content and validation

- ATT&CK/source version:
- Prompt, rule or schema identifiers:
- Previous validation status:
- Requested validation status:
- Reviewer/rubric or lab evidence:
- Known telemetry gaps and benign-lookalike behavior:

Leave validation status unchanged unless the attached evidence satisfies its
contract. A model evaluation, parser pass or generated fixture is not an
independent human review or lab validation.

## Compatibility, privacy and licensing

- [ ] Existing CLI/UI/export behavior is preserved, or migration guidance is included.
- [ ] No automatic external upload, telemetry or model call was added.
- [ ] Untrusted source/context/model text stays literal and bounded.
- [ ] ATT&CK identity, hashes, MITRE notice and exclusions are preserved or reviewed.
- [ ] External rule material has item-level origin and SPDX license metadata.
- [ ] No credential, private log, customer data, build output or unnecessary archive is included.

Explain every unchecked item:

## Review and DCO

- [ ] I certify this contribution under the repository DCO sign-off policy.
- [ ] Required CODEOWNERS have been requested.
- [ ] Prompt/content or native-rule changes have two independent eligible approvals.
- [ ] Security-impacting changes have security-owner review.
- [ ] Generated changes were inspected rather than accepted only because tests passed.

The author does not count as either independent content/rule approval.

## Release and rollback impact

State whether this changes the static demo, a public contract, release artifact or
future API. Describe the smallest safe rollback and any evidence that would become
invalid after a revert.

- [ ] Documentation and changelog describe user impact and remaining limits.
- [ ] No push, Pages deployment, tag, package, container or GitHub Release is
      assumed authorized by this pull request.

## Known limitations and follow-up

Record unavailable checks, unresolved evidence and owners for follow-up. Do not
mark a required release gate complete when the necessary reviewer, product lab or
independent audit is unavailable.
