# GitHub repository settings

This file defines the desired state for the public repository. Checked-in files
cannot apply or prove remote GitHub settings. Every item begins unchecked by
design; an unchecked or checked Markdown box is not evidence. Record observed
values, timestamp, actor and API/UI source in [verification](verification.md).

Do not enable a rule that makes the repository unrecoverable. In particular,
confirm enough eligible maintainers and a documented emergency path exist before
requiring two approvals. Emergency bypass must be narrow, logged and reviewed
after use.

## Repository identity and discovery

- [ ] Confirm visibility is public and the default branch is `main`.
- [ ] Set the homepage to
      `https://samran2.github.io/Prompt-as-Detection-Library/` and verify it
      resolves to the reviewed demo.
- [ ] Add accurate topics such as `mitre-attack`, `detection-engineering`,
      `threat-hunting`, `cybersecurity`, `security-research` and
      `prompt-engineering`; do not add affiliation claims.
- [ ] Keep Issues enabled and link public support and private security reporting.
- [ ] Disable unused features or document their owner and moderation policy.

## Default-branch ruleset

- [ ] Confirm at least two independent reviewers in addition to the change author
      can satisfy the intended content/rule policy.
- [ ] Require pull requests; prevent direct pushes to `main`.
- [ ] Require two approvals for prompt, source, schema and native-rule changes.
- [ ] Require review from the relevant CODEOWNERS and dismiss stale approvals
      when protected files change.
- [ ] Require all review conversations to be resolved.
- [ ] Require current Repository CI, CodeQL, dependency review, secret scanning
      and applicable supply-chain checks by their exact observed check names.
- [ ] Require branches to be current with `main` or use a merge queue with the
      same required checks.
- [ ] Require signed commits and linear history.
- [ ] Block force-push and branch deletion.
- [ ] Restrict bypass to named emergency maintainers; log and retrospectively
      review every bypass.

Avoid guessing check names in a ruleset. First observe the successful checks on a
pull request, then configure exact stable names and verify a deliberately failing
test cannot merge.

## Actions and third-party code

- [ ] Change Actions from “allow all” to an explicit organization/repository
      allowlist.
- [ ] Require all actions to be SHA-pinned and verify every current workflow uses
      a full reviewed commit SHA.
- [ ] Allow GitHub-maintained actions only where needed; separately allowlist
      each external action and record its upstream tag-to-SHA verification.
- [ ] Keep default workflow permissions read-only and grant writes only in the
      smallest job that needs them.
- [ ] Require approval for workflows from first-time external contributors.
- [ ] Disable Actions from untrusted forks from receiving secrets or write tokens.
- [ ] Configure Dependabot and dependency-review policy without auto-merging
      unreviewed updates.
- [ ] Verify CodeQL, OpenSSF Scorecard, secret scanning/push protection and
      container scanning where an OCI build exists.

A pinned SHA controls version drift but does not audit the action implementation.
Review permissions, inputs, generated artifacts and network use as well.

## Pages environment

- [ ] Use GitHub Actions as the Pages source and enforce HTTPS.
- [ ] Restrict the `github-pages` environment to reviewed `main`.
- [ ] Require deliberate environment approval for production deployment when
      enough maintainers are available.
- [ ] Verify the workflow uploads only the allowlisted static `dist/` payload.
- [ ] Verify the live deployment commit, URL and asset hashes after each release.

## Releases and attestations

- [ ] Protect `v*` tags from update or deletion.
- [ ] Restrict release creation to the trusted tag workflow and authorized
      maintainers.
- [ ] Enable artifact attestations/OIDC only for the minimum release job.
- [ ] Require an SBOM, license report, SHA-256 manifest, Sigstore bundle and at
      least SLSA Build L2 provenance for stable release artifacts.
- [ ] Retain immutable release evidence and test a recovery path without moving
      tags.

## Security and administration

- [ ] Verify private vulnerability reporting is enabled and the public security
      contact link works without exposing a reporter.
- [ ] Enable secret scanning and push protection where available.
- [ ] Enable dependency graph and vulnerability alerts; route alerts to an owned
      triage process.
- [ ] Require 2FA for maintainers and least-privilege repository roles.
- [ ] Review deploy keys, installed apps, webhooks, environments, secrets and
      dormant collaborators at least quarterly.
- [ ] Export or capture the effective ruleset and Actions settings after every
      material administration change.

## Verification procedure

1. Read settings through the authenticated GitHub API or UI using least privilege.
2. Compare effective values to every desired-state item above.
3. Exercise controls with a test pull request: failing required check, stale
   approval, missing CODEOWNERS review and attempted direct push.
4. Record evidence in `docs/verification.md` with repository, default branch,
   ruleset identifier/revision, observed check names, time and observer.
5. Open a tracked issue for every gap. Do not mark this document complete merely
   because policy files exist in the repository.
