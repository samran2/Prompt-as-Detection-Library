# Publishing overview

## Current publication state

The approved public repository is
[samran2/Prompt-as-Detection-Library](https://github.com/samran2/Prompt-as-Detection-Library),
and the `0.3.0.dev3` static workbench has been published as a development demo.
Observed commit, workflow and hosted-demo results belong in
[verification](verification.md), not in evergreen instructions.

The `0.4.0.dev0` work is an unreleased foundation. There is no stable v1.0
release, package publication or claim that all prompts or native rules have been
human- or lab-validated. Local success never authorizes a push, deployment, tag
or release on its own.

These documents divide the process:

- [release process](release-process.md) defines candidate evidence, approval,
  signing, publication and rollback;
- [versioning](versioning.md) defines application, content, API and tag versions;
- [repository settings](repository-settings.md) lists desired GitHub protections
  and how to verify them without pretending policy files apply remote settings;
- [development](development.md) lists local commands and evidence expectations;
  and
- [verification](verification.md) records checks actually observed for a
  particular commit or artifact.

## Publication boundaries

Three deliverables have different risk and approval boundaries:

1. **Static workbench.** A manual Pages deployment publishes only the allowlisted
   static `dist/` payload. It does not publish the repository root or create a
   release.
2. **Source release.** A GitHub Release binds immutable source and evidence
   artifacts to an authorized stable or prerelease tag. It is not created by the
   archive-preview workflow.
3. **Packages and containers.** npm, PyPI and OCI publication are separate
   destinations. The root package is private, no PyPI distribution exists, and
   no package publication is implied by a GitHub Release.

Only an owner-approved destination, visibility, version and exact commit may be
published. Preserve the MIT license for project code, separate MITRE source
terms and item-level SPDX/origin metadata for contributed rule material.

## Development demo deployment

For an explicitly authorized Pages update:

1. verify the exact commit and wait for all required repository checks;
2. build and inspect a fresh fourteen-file static payload;
3. confirm GitHub Pages uses the Actions source, HTTPS and the protected
   `github-pages` environment;
4. manually dispatch **Publish library workbench to GitHub Pages** from the
   reviewed `main` commit with its confirmation input; and
5. inspect the returned URL, commit identity, asset hashes, console/network
   behavior, all-domain search, source detail, exports and representative
   desktop/mobile layouts.

The workflow's input expresses operator intent; it does not prove license,
security, CI, accessibility or content review. Relative asset URLs support a
repository subpath. Clipboard permission depends on the browser. Hosting logs and
headers outside the static payload remain the hosting provider's responsibility.

## Archive preview

The manual **Library archive preview** workflow creates a short-lived candidate
ZIP and checksum from committed `HEAD` after repository checks. It must retain
read-only repository permission and must not create a tag, GitHub Release or
package. The source archive contains reviewed repository files and pinned source
data; it is intentionally different from the public fourteen-file website payload.

Treat preview artifacts as disposable evidence inputs. A release candidate must
still pass the complete process in [release process](release-process.md), bind
evidence to the exact candidate commit and receive explicit authorization.

## Stable release barrier

Do not create a stable v1.0 tag or release until evidence proves every gate in
[ROADMAP](../ROADMAP.md), including:

- 918 prompts with two independent expert reviews bound to current prompt hashes;
- complete Enterprise, Mobile and ICS support matrices with lab results or
  reviewed `not-applicable` decisions;
- zero critical source fabrication, dangerous instruction or unsupported
  validation claim;
- independent WCAG 2.2 AA review and documented performance/browser evidence;
- passing security and supply-chain gates; and
- a clean reproducible build with SBOM, license report, SHA-256 values, Sigstore
  verification and at least SLSA Build L2 provenance.

Missing people, licensed labs or independent audits are genuine blocked gates.
Record them as such; do not lower a status or convert planned work into evidence.

## Incident response and rollback

If a published demo or release is faulty, stop further promotion, preserve the
observed commit, workflow run, artifacts and evidence, and follow the rollback
procedure in [release process](release-process.md). Never reset shared `main`,
force-push or move a published tag to conceal the fault. Revert through review,
or issue a new patch/prerelease version as appropriate.

If no known-good Pages deployment exists, unpublish or disable the affected site
while preparing a reviewed fix. A successful redeploy is not complete until the
live URL and critical user flows have been checked and recorded.
