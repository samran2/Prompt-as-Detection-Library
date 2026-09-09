# Maintainer onboarding

This process creates a transparent path to review responsibility while keeping
repository access proportional to demonstrated need. The current roster is in
[MAINTAINERS.md](../MAINTAINERS.md); today it records one maintainer and no
independent qualified reviewers.

Completing or editing this checklist does not itself grant access. Only an
explicit, recorded role decision followed by a separate access change can do so.

## Roles grow in stages

1. **Contributor:** participates through issues, pull requests, evidence and
   review. No repository access is implied.
2. **Qualified reviewer:** has demonstrated review judgment in a defined scope.
   Their independent approval can count only within that scope and only when they
   are neither author nor co-author and have no material conflict of interest.
3. **Maintainer:** receives the minimum repository permissions needed to triage,
   merge or administer the agreed scope and accepts the responsibilities in
   [GOVERNANCE.md](../GOVERNANCE.md).

A person does not need commit access to be recognized as a qualified reviewer.
Reviewer experience should normally precede maintainer access.

## Qualification criteria

Nomination is based on observable work, not employment, popularity or a fixed
number of pull requests. Evidence should show:

- sustained, constructive participation consistent with the Code of Conduct;
- accurate source, provenance and licensing judgment;
- reviews that find material correctness, safety or maintainability issues;
- care with untrusted data, private reports and disclosure boundaries;
- ability to distinguish source coverage, structural verification and detection
  validation;
- willingness to disclose conflicts, recuse and accept contrary evidence; and
- enough availability to perform the proposed role without promising an SLA.

Qualification is scoped. A candidate can be recognized for documentation or
prompt evidence without gaining authority over source ingestion, security,
release automation or repository administration.

## Nomination and decision

1. A contributor may nominate themselves or another contributor with that
   person's consent in a public issue or pull request.
2. The nomination states the proposed role and scope and links to representative
   contributions and reviews.
3. The community is invited to provide relevant, respectful evidence. Sensitive
   conduct or security information stays in its private reporting channel.
4. Unconflicted maintainers evaluate the published criteria and record the
   decision and rationale.
5. The same reviewed change updates [MAINTAINERS.md](../MAINTAINERS.md) and, if
   review routing changes, [CODEOWNERS](../.github/CODEOWNERS).

While `samran2` is the only maintainer, that account necessarily records role
decisions. This is centralized governance, not independent approval. A
candidate's own vote cannot supply independence, and the project must not claim
that the target two-reviewer gate is active before two independent qualified
reviewers exist and the protection has been verified.

## Reviewer onboarding checklist

Before recognizing a qualified reviewer, record that the candidate:

- agrees to the governance and Code of Conduct;
- understands the pinned-source and evidence contribution rules;
- knows that generated detections are drafts, not certified rules;
- understands the Developer Certificate of Origin (DCO) sign-off requirement;
- declares relevant affiliations and the conflict of interest and recusal rules;
- defines the technical or documentation scope they are qualified to review; and
- has completed at least one representative public review in that scope.

Recognition adds the candidate to the reviewer roster with an explicit scope. It
does not automatically add them to CODEOWNERS or grant write, merge, release,
security-report or administration access.

## Maintainer access checklist

After a public maintainer decision and before granting access:

- verify control of the named GitHub account through the existing public account;
- require two-factor authentication (2FA), preferably with phishing-resistant
  authentication and securely stored recovery methods;
- confirm that access uses an individual account, never a shared credential;
- apply least privilege and grant only the permissions required for the recorded
  scope;
- review branch protections, required checks, CODEOWNERS semantics, release and
  Pages controls, secret boundaries and private vulnerability reporting;
- confirm the maintainer can run and interpret the repository's documented
  verification commands and can explain their limits;
- confirm DCO handling, third-party attribution and source-provenance duties;
- configure necessary security and review notifications without exposing private
  report content; and
- observe the granted access and record completion without publishing recovery
  codes, tokens, private contact data or other secrets.

Cryptographic commit signing may be encouraged separately. DCO sign-off and
cryptographic signing are different controls: `Signed-off-by` certifies under
the DCO but does not prove key ownership.

Access to private vulnerability reports, environments, Pages, releases, secrets
or repository administration is granted separately when the role needs it. Do
not grant broad administration merely to make routine review convenient.

## First changes and ongoing review

A new maintainer's first access-sensitive change should be paired with an
unconflicted maintainer or qualified reviewer when one is available. Record
actual review and check outcomes; do not treat onboarding as permanent proof of
future review quality.

Maintainers periodically verify that public rosters, CODEOWNERS and actual access
still agree. Material scope expansion repeats the relevant nomination and access
checks. Inactivity alone is not misconduct, but unused privileged access should
be removed when it is no longer needed.

## Stepping down, inactivity and removal

A maintainer may step down at any time. Remove unneeded access promptly, rotate
any project-controlled secret the departing person could retrieve, transfer open
private work safely, and update the roster and CODEOWNERS. Never publish private
reports or personal reasons as part of offboarding.

Maintainer status may be removed for persistent failure to perform the role,
material policy violations, compromised access or loss of project trust. Give
notice and an opportunity to respond when safety and confidentiality permit. An
unconflicted decision-maker records the public portion of the rationale. If no
independent decision-maker exists, disclose that governance limitation rather
than describing the outcome as independent.

Former maintainers have no continuing authority unless assigned a current role.
Historical recognition may be recorded with consent; Git history remains the
record of past contributions.
