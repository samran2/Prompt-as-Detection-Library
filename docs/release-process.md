# Release process

This is the release runbook for source, static-workbench and future OCI
artifacts. It is intentionally stricter than local development. No step in this
document grants publication authority, and no stable release is currently
claimed.

## Roles and separation

- The **release manager** identifies the exact version and commit, coordinates
  evidence and performs the authorized publication.
- **Content/rule owners** review prompt, ATT&CK, telemetry and native-rule changes.
- A **security owner** reviews security-impacting changes and unresolved findings.
- Two independent eligible reviewers approve content and rule changes. The
  author cannot count as either required approval.
- A repository administrator verifies remote rules and environments without
  weakening them for the release.

One person may temporarily hold several roles during development, but that cannot
satisfy an independent-review gate. The v1.0 process becomes operable only after
the maintainer roster contains enough qualified reviewers.

## Candidate inputs

Freeze one commit and one version before collecting evidence. The candidate must
identify:

- full Git commit and proposed immutable tag;
- application, ATT&CK content, schema and rubric versions;
- source bundle and generated prompt hashes;
- supported platforms and explicit exclusions;
- changed public interfaces and migration notes;
- requested destinations: Pages, GitHub Release and, later, OCI registry; and
- the owner authorization for those destinations and visibility.

Rebuild or review results from another commit do not transfer. If any candidate
input changes, invalidate affected evidence and start a new candidate revision.

## Required evidence

| Gate | Candidate evidence |
| --- | --- |
| Source and licensing | Official ATT&CK identity, SHA-256 inventory, MITRE notice, project MIT license, SPDX/origin report and reviewed source diff. |
| Prompt corpus | Exact 918-record parity, deterministic bytes, two independent current-hash reviews per prompt and aggregate rubric scorecard. |
| Native rules | Complete domain support matrices; native parser/lint results; positive, benign-lookalike, missing-telemetry and boundary fixture replay; lab identity where validation is claimed. |
| Compatibility | Existing CLI and static workbench contracts, schema migration tests and public-interface compatibility report. |
| UI quality | Chromium/Firefox/WebKit matrix, 320–1440 px coverage, manual VoiceOver/NVDA report, WCAG 2.2 AA audit and declared Core Web Vitals measurement. |
| Security | Threat-model review, CodeQL, secret and dependency scanning, container scan when applicable, fuzz/DAST scope and disposition of every blocking finding. |
| Supply chain | Clean build, dependency/license inventory, SBOM, artifact SHA-256 values, Sigstore signature and verification, and SLSA Build L2 or stronger provenance. |
| Operations | Deployment plan, tested rollback, release notes, support/security routes and owners available for the release window. |

Machine-readable results must include tool and environment versions, timestamps,
the candidate commit and input hashes. A passing lint or structural check cannot
stand in for a human review, WCAG audit, native-product lab or field observation.

The ATLAS AI addition is a separate 197-record corpus. A stable candidate that
includes it also needs exact ATLAS 2026.08 source parity, Apache-2.0 attribution,
and two real independent current-hash reviews per AI prompt. Extend the
framework-aware evidence contracts before promotion; the existing 918-record
ATT&CK registry and scorecards are not an AI review result. No stable release
can bypass this gap by presenting source threat maturity as prompt validation.

## Candidate procedure

1. Create a short-lived release-candidate branch from reviewed `main`. Update
   version surfaces and the changelog according to [versioning](versioning.md).
2. Verify [repository settings](repository-settings.md) from the remote API/UI.
   Record observed values and time; a checked-in checklist is not proof.
3. From a clean checkout of the exact candidate commit, run the full commands in
   [development](development.md), including generation verification, Node and
   Python suites, browser checks and static-build inspection. Record counts and
   failures without editing the evidence afterward.
4. Run schema/migration, rule parser and fixture replay, adversarial evaluation,
   fuzz, dependency, CodeQL, secret and container checks that apply to the
   candidate. A blocked or unavailable required check blocks promotion.
5. Generate artifacts only in the trusted release workflow. Produce a source
   archive, static payload and any authorized OCI image from the same commit.
   Generate an SPDX or CycloneDX SBOM, license report and SHA-256 manifest for
   every distributed artifact.
6. Create keyless Sigstore signatures and attestations using the release
   workflow's GitHub OIDC identity. Verify artifact digest, certificate issuer,
   workflow identity and SLSA provenance before approval. Do not place a private
   signing key in repository secrets.
7. Have the release manager and required owners compare the evidence manifest to
   the gate table. Two approvals are required for content/rule changes; security
   approval is additionally required for security-impacting changes.
8. Obtain explicit owner authorization for the exact commit, version,
   destinations and visibility. A previous demo authorization does not
   automatically authorize a stable release, package or OCI image.
9. Create an annotated, immutable `vMAJOR.MINOR.PATCH` tag for stable releases
   or an approved prerelease tag. The protected release workflow must build from
   that tag rather than from a moving branch.
10. Publish the GitHub Release with human-readable notes, migration information,
    source and website archives, SHA-256 manifest, SBOM, license report,
    signatures, provenance and verification instructions. Mark development
    versions as prereleases.
11. Verify the published artifacts from a clean consumer environment, including
    checksums, Sigstore identity/provenance and critical CLI/browser flows. Record
    final URLs, digests and observed results.

Do not install release-time tooling dynamically from unpinned scripts. GitHub
Actions must be approved and pinned to full commit SHAs; generated dependencies
must come from reviewed lockfiles.

## Release evidence manifest

The release workflow should produce one machine-readable manifest that binds:

- schema version, release version, Git commit and tag;
- artifact names, media types, byte sizes and SHA-256 values;
- SBOM and license-report digests;
- Sigstore bundle and SLSA provenance identifiers;
- source/catalog/prompt counts and hashes;
- review, rules, accessibility, performance and security result digests; and
- workflow repository, workflow path, run identifier and trusted builder identity.

Do not include tokens, private logs, proprietary lab telemetry, reviewer private
notes or raw model prompts/responses containing protected data. Evidence
summaries must remain independently verifiable from sanitized fixtures.

## Rollback rehearsal

Before v1.0, rehearse both site and release recovery using non-production
artifacts. Record time to contain, selected known-good commit, commands or UI
actions used, verification and any policy bypass. A rehearsal that only describes
steps is not a successful test.

### Static workbench

1. Stop promotion and capture the bad deployment's commit, workflow run, payload
   digest and observed symptoms.
2. Prepare a focused revert on a review branch from current `main`. Never reset
   shared history or force-push.
3. Run the affected checks and inspect a fresh allowlisted static build. Merge
   only through the normal protected review path.
4. Manually deploy the exact reviewed revert commit. If no known-good deployment
   exists, disable/unpublish Pages until the fix is ready.
5. Verify the live commit, assets, console/network behavior and critical flows,
   then record the result in the verification log.

### Immutable release artifacts

A published tag, signature or provenance record must never be moved or silently
replaced. For a functional defect, publish a new patch or prerelease version and
link the superseding release. For a security issue, follow `SECURITY.md`, limit
public detail until coordinated disclosure is safe, mark affected artifacts
clearly and publish a fixed version. Preserve the original evidence for audit.

If a future package registry supports deprecation or revocation, use that
mechanism only with a documented reason and recovery version. Deleting evidence
is not rollback.

## After publication

Monitor required workflows, the Pages/API status surface and private
vulnerability route. Triage regressions against the released digest, not current
`main`. Close the release record only after clean-consumer verification and the
rollback path are confirmed. Post-release changes begin a new version; never
edit generated evidence to make an earlier release appear green.
