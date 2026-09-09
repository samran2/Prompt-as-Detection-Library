# Evidence contributions

Prompt-as-Detection Library contributions can influence what defenders inspect
and how they interpret source material. A persuasive claim is not enough: the
pull request must leave reviewers able to identify the source, reproduce the
work and understand what remains unverified.

This guide supplements [CONTRIBUTING.md](../CONTRIBUTING.md),
[GOVERNANCE.md](../GOVERNANCE.md) and the repository's existing
[source-provenance record](source-provenance.md).

## Evidence boundaries

Label each material statement as one of the following:

- **Source fact:** a faithful statement from an identified source. Cite the
  exact source identity or version and location.
- **Observed result:** something reproduced by the contributor using a stated
  method and fixture. Record the environment and actual result.
- **Inference:** an interpretation supported by cited facts or observations.
  State the reasoning and plausible alternatives.
- **Proposal:** a change suggested for review, not an observed fact.

Do not convert an inference into a source fact or a generated answer into an
observed detection result. Prompts and generated detections remain an
**unvalidated draft** unless evidence covers that specific output in the stated
target environment. Structural tests, source coverage and a maintainer review do
not establish detection effectiveness.

## What an evidence pull request includes

Use a focused pull request and provide all applicable items:

1. **Claim and scope.** State exactly what should change, which technique,
   domain, platform, prompt mode or target is affected, and what is out of scope.
2. **Source identity or version.** Give the publisher, title, stable URL,
   version or publication date, and the relevant section or record identifier.
   Prefer primary and official sources; explain why a secondary source is needed.
3. **Rights and attribution.** Identify the license or other right to share the
   material. Quote only what is necessary. Do not copy paywalled, confidential or
   incompatibly licensed material into the repository.
4. **Reproduction.** Provide deterministic steps, commands, environment details
   and a minimal synthetic fixture. Pin changeable dependencies and inputs where
   practical. Record hashes for imported or regenerated source bundles using the
   repository's established provenance process.
5. **Actual results.** Include relevant expected and observed outcomes, not just
   a conclusion. Preserve error output and negative results when they affect the
   interpretation.
6. **Limitations.** Describe untested platforms, missing schema, assumptions,
   possible confounders, and known false positive and false negative conditions.
7. **Traceability.** Connect the evidence to the exact changed source,
   composition logic, generated artifact and regression test. Explain generated
   diffs rather than reviewing only summary counts.
8. **Safety and privacy.** Confirm that fixtures are synthetic or safely
   redacted and that no credentials, private telemetry, customer data or
   sensitive exploit details are exposed.

If an item does not apply, say why. Do not fill a gap with an invented procedure,
telemetry field, platform, analytic relationship, citation or test result.

## Changes to the pinned ATT&CK source

The active library is derived from pinned ATT&CK 19.2 inputs. Corrections to
project interpretation can be proposed without changing that pin, but a dataset
upgrade is a separate, explicitly reviewed change. An upgrade must:

- identify the official upstream object or bundle and immutable revision;
- preserve upstream terms, attribution and complete raw notices;
- record downloaded-byte hashes and retrieval details;
- define active, revoked, deprecated and unsupported-record handling;
- regenerate through the checked-in generator rather than hand-editing catalog
  or prompt outputs;
- reconcile added, removed and changed identifiers, procedures and analytics;
- run source-oracle, generated-integrity and full composition checks; and
- state clearly that dataset coverage is not detection validation.

Never edit a generated prompt or catalog record as the only source of a change.
Never silently move the pinned version to make a desired claim fit.

## Detection and prompt claims

A wording improvement may be reviewed with source citations and deterministic
composition tests. A claim that a detection works needs stronger, target-specific
evidence. Where applicable, supply:

- product and schema versions, collection prerequisites and relevant permissions;
- a sanitized or synthetic event set with an explained expected outcome;
- rule or query text and every transformation used to obtain it;
- positive, negative and edge-case results, including false positive analysis;
- false negative risks, blind spots, evasion assumptions and tuning boundaries;
- performance or cost observations with dataset size and measurement method;
- an independent reproduction or a clear statement that none occurred; and
- a rollback or disablement path for operational guidance.

Community tags, historical procedure examples and single indicator matches are
hunting leads, not proof of current malicious behavior or an independent ATT&CK
mapping. An absence of matches is inconclusive unless the evidence establishes
that the relevant behavior was present, visible and expected to be detected.

For ICS work, keep testing synthetic and offline; do not probe live control
systems or recommend control changes. For Mobile work, state device-management,
permissions, enrollment and collection prerequisites rather than assuming
visibility.

## Data handling

Public evidence must be safe to redistribute. Use minimal synthetic examples by
default. If a real-world artifact is necessary, contributors are responsible for
authorization, minimization and irreversible redaction before submission.

Do not submit:

- credentials, API keys, tokens, private keys or authentication material;
- customer, employee or victim identifiers;
- production logs or model conversations containing confidential context;
- undisclosed vulnerability or exploit details in a public issue; or
- content whose license or terms do not permit the proposed use.

Use the [private security-reporting route](../SECURITY.md) for a suspected
vulnerability. A private report still needs the minimum safe evidence needed to
reproduce and assess it.

## Review outcomes

A reviewer may accept the evidence, request narrower wording, request independent
reproduction, or reject the change with a reason. A merge means that the project
accepted the scoped contribution and its stated evidence; it does not turn every
claim into a guarantee.

Reviewers check both the evidence and the transformation from evidence to text or
code. They must disclose conflicts of interest. Approval requirements and the
current limitation of the two-approval gate are described in
[GOVERNANCE.md](../GOVERNANCE.md).

## DCO and contribution rights

Evidence contributions use the Developer Certificate of Origin 1.1 (DCO). This
project has no Contributor License Agreement (CLA). Every contributed commit must
contain the contributor's own certification:

```text
Signed-off-by: Your Name <your-email@example.com>
```

Add it with `git commit -s`. The DCO confirms the contributor has the right to
submit the contribution under the project's terms; it does not override a source
license, privacy duty or attribution requirement. A maintainer must not create a
sign-off on someone else's behalf.
