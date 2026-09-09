# Governance

This document explains how the Prompt-as-Detection Library makes decisions,
reviews changes and grows its maintainer team. It describes the current project,
not a governance structure that the project merely hopes to have.

## Principles

- Prefer verifiable evidence and reproducible checks over authority or volume.
- Keep source facts, project decisions and unvalidated detection drafts distinct.
- Make decisions in public issues and pull requests unless confidentiality is
  required for a vulnerability, conduct report or private data.
- Give contributors a documented path from contribution to review and
  maintenance responsibility.
- Protect contributor independence: an author cannot approve their own change
  as an independent reviewer, and conflicts of interest require recusal.

All participants must follow the [Code of Conduct](CODE_OF_CONDUCT.md). Security
reports follow the private route in the [Security Policy](SECURITY.md).

## Roles

### Contributors

Anyone who files a useful issue, improves documentation, supplies reviewable
evidence, reviews a change or submits code is a contributor. Contribution does
not grant merge, release or repository-administration authority.

### Qualified reviewers

A qualified reviewer is a contributor whose relevant subject knowledge and
review judgment have been demonstrated in public work. Qualification is scoped:
for example, prompt-evidence review does not automatically qualify someone to
approve release automation or a security-boundary change. A reviewer must be
independent of the change to supply an independent approval: they cannot be its
author or co-author and must disclose a material conflict of interest.

Reviewer recognition is recorded through the process in
[Maintainer onboarding](docs/maintainer-onboarding.md). Review comments are
welcome from everyone; the recorded role determines whether a review counts
toward a protected-branch gate.

### Maintainers

Maintainers triage contributions, protect project scope and provenance, decide
when a change is ready, merge pull requests, coordinate releases and administer
community policy. Their authority is bounded by this document, the repository's
license, branch protections and the security and conduct policies.

The authoritative current roster is [MAINTAINERS.md](MAINTAINERS.md). The only
known maintainer is `samran2`. [CODEOWNERS](.github/CODEOWNERS) routes review
requests; it does not create authority or prove that a review happened.

## Proposals and decisions

1. Open a focused issue or pull request that states the problem, user impact,
   alternatives, risks, evidence and verification performed.
2. Keep material design discussion on that issue or pull request. Summarize any
   necessary private discussion without exposing confidential details.
3. Resolve substantive objections with evidence, a narrower change or an
   explicit maintainer decision. Silence is not approval from a named reviewer.
4. A maintainer confirms scope, required checks, licensing, provenance and
   review status before merge. Passing automation is necessary where configured
   but never substitutes for judgment.

Routine decisions should seek rough consensus. If consensus is not possible, a
maintainer records the decision and its rationale. While the project has one
maintainer, `samran2` is necessarily the final decision-maker. Contributors may
ask for reconsideration on the original issue or open a focused governance
proposal with new evidence.

## Review and merge policy

Every non-trivial change should arrive through a pull request, keep unrelated
work out of its diff, include appropriate tests or checks, and document what was
not verified. Authors may respond to review and re-review their work, but their
own review never counts as an independent approval.

### Target two-approval gate

The target protected-branch policy is two approvals from two independent
qualified reviewers, in addition to required automated checks. At least one
approval must cover each specialist area materially affected by a change. A new
commit that invalidates an approval must be reviewed again.

**Current enforcement status:** this two-approval gate cannot yet be enforced
because the only current maintainer is `samran2` and the project does not have
two independent qualified reviewers. The present state must not be represented
as satisfying a two-approval policy. One person, bot reviews, passing checks and
self-review must not count as a two-approval gate.

Until two independent qualified reviewers are recorded and available, the sole
maintainer retains merge authority. The interim safeguard is a public pull
request, all applicable required checks, an explicit account of evidence and
limitations, and a request for outside review for material security, licensing,
source-data, release or governance changes. If urgency or confidentiality makes
outside review unavailable, the maintainer records that limitation and arranges
retrospective review when disclosure is safe. This is an honest temporary
control, not an equivalent substitute for the target gate.

The gate may be enabled only after the reviewer roster documents at least two
independent qualified people, repository access matches their roles, and the
protected-branch settings have been observed working. Once enabled, any later
exception must be narrow, documented and reviewed afterward.

## Conflicts, conduct and security

A participant must disclose a relationship or interest that could reasonably
affect their judgment. A conflicted reviewer or maintainer recuses from approval
and enforcement decisions when another qualified person is available. If the
only maintainer is conflicted, the conflict and lack of an independent decision
maker must be disclosed; the project must not claim independent resolution.

Potential vulnerabilities are reported privately under
[SECURITY.md](SECURITY.md). Conduct concerns use the route documented in the
[Code of Conduct](CODE_OF_CONDUCT.md); that policy currently discloses that no
verified private conduct contact is configured. Do not redirect confidential
conduct reports into public issues.

## Contributor certification: DCO, not a CLA

This project uses the [Developer Certificate of Origin 1.1](https://developercertificate.org/)
(DCO). It does not use or require a Contributor License Agreement (CLA).

Each commit contributed to the project must include a certification line made by
the contributor:

```text
Signed-off-by: Your Name <your-email@example.com>
```

Use `git commit -s` to add the line. The sign-off certifies the contribution
under the DCO; it is not a cryptographic signature. Contributors remain
responsible for having the right to submit their work and for preserving
third-party licensing and attribution. Maintainers must not fabricate a sign-off
for another contributor. If commits are rebased or squashed, the resulting
commit history must retain the appropriate contributor certification before
merge. Evidence-specific requirements are in
[Evidence contributions](docs/evidence-contributions.md).

## Growing and changing the project

Reviewer qualification, maintainer nomination, onboarding, access changes,
inactivity and offboarding follow [Maintainer onboarding](docs/maintainer-onboarding.md).
No checklist or CODEOWNERS entry alone grants access. Additions and departures
must update the public roster in the same reviewed change whenever practical.

Changes to this governance model require a public pull request explaining the
need, effects on contributor rights and review implications. During the current
single-maintainer phase, the centralization and unavailable independent approval
must remain explicit. Governance history stays in Git; do not rewrite it to
suggest controls existed before they were actually enabled.
