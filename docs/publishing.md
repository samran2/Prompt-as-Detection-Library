# Publishing and release process

## Current status

The complete active ATT&CK 19.2 library is an independent development rebuild at
`0.3.0.dev2` (npm `0.3.0-dev.2`). The original v0.2.0 archive is unavailable; no
recovery, original test preservation or format compatibility is claimed.
The verified public repository is
[samran2/Prompt-as-Detection-Library](https://github.com/samran2/Prompt-as-Detection-Library).
The complete library and public workbench are published. Keep the observed commit, hosted-check
results and public-demo status in the
[verification record](verification.md#hosted-publication-status).

All 918 active techniques have been generated and checked. The owner approved
the MIT project-code license, the public repository and the public demo.
GitHub private vulnerability reporting is enabled and was verified on the actual
repository. See [SECURITY](../SECURITY.md) for the reporting route. Preserve MITRE
terms independently.

## Prepare a reviewable candidate

1. Run `npm run library:verify`, `npm run check`, `npm test`, the real-browser
   checks and foundation checks in [development](development.md). Confirm exact
   active source/catalog/text ID sets, procedures, analytic links and exclusions.
2. Build a fresh `dist/` with `npm run build`. Inspect its exact eight allowed
   files, source-data notice and bounded catalog. Never publish the repository
   root as the site. Raw source bundles belong only in the reviewed repository
   archive; they do not enter the public static build.
3. Review the exact repository and public artifact for credentials, private logs,
   unexpected files, source rights and dependencies. Use maintained secret
   scanning in addition to the included limited pattern checks. Review any Git
   history that will be uploaded.
4. Record actual verification results and limits in
   [verification](verification.md), build the candidate archive, compare its
   files against the reviewed tree and retain its SHA-256 checksum.
5. Preserve the approved [license decision](../LICENSE_TODO.md), the enabled
   private vulnerability-reporting route, and the approved destination and
   public visibility. Additional publication destinations need separate approval.

Local implementation and passing checks do not authorize publication. A missing
original archive does not prevent review of this independent rebuild's rights,
but no rights to the original application may be claimed.

## Repository CI and archive preview

Repository CI runs foundation checks and the reusable full-library checks. The
latter verify generated source outputs, JavaScript syntax, Node behavior, static
build boundaries and real-browser flows. Python matrix jobs cover foundation
tooling only; they are not compatibility tests for an original Python app.
A separate pinned CodeQL workflow analyzes GitHub Actions, JavaScript and Python.
It was added after the earlier immutable audit and is not covered by that audit.
Actual hosted run outcomes are recorded in [verification](verification.md#hosted-publication-status).

The manual **Library archive preview** first requires the reusable library checks
and runs foundation checks before archiving committed `HEAD`. It uploads only
its generated ZIP and SHA-256 file as a short-lived Actions artifact, with
read-only repository permissions. It does not create a GitHub Release or publish
a package. Its ZIP contains the committed repository, including source bundles
and readable prompts; it is separate from the eight-file website payload.
Artifact access follows the repository's GitHub settings.

## Publish the static workbench

For the owner-approved public repository and demo:

1. Use the verified destination and push only the reviewed tree using
   a real configured Git identity. No author or remote URL should be invented.
2. Preserve GitHub Pages' **GitHub Actions** source, HTTPS enforcement and the
   `github-pages` environment's `main`-only deployment rule. No environment
   reviewer is configured; the confirmation input is the deliberate operator
   approval. Preserve enabled private vulnerability reporting and review CI
   on the exact commit to be deployed.
3. Wait for Repository CI on the reviewed commit. Manually run **Publish library
   workbench to GitHub Pages** on `main`, explicitly checking its confirmation
   input. It reruns full-library checks and uploads only the verified `dist/`.
4. Inspect the URL returned by the deployment. Recheck all-domain search,
   pagination, source detail, downloads and responsive layout under the repository
   prefix. Only then add that observed live URL to the README and repository.

The workflow never deploys automatically on push, pull request or tag. Only the
deployment job has Pages and identity-token write permission. Its boolean input
represents the operator's approval; it cannot itself verify licensing or enforce
a separate human reviewer without configured environment protection. The Pages
workflow runs library/browser checks; the instruction to wait for full Repository
CI also covers its separate Python foundation job.

Relative asset URLs support repository subpaths. Clipboard access depends on
browser permissions; manual copy and TXT download remain available. The page's
restrictive meta CSP cannot provide every HTTP-header policy, including
`frame-ancestors`. Hosting request logs are outside the app's control. The
loopback Python server is a local preview, not a production application service.

## Roll back a faulty deployment

Rollback is a deliberate maintainer action; this project does not perform it
automatically. Use it if the deployed workbench fails verification or the
published files differ from the reviewed static payload.

1. Record the faulty deployment's workflow run and commit, the observed problem,
   and the last successful reviewed deployment, if one exists. Retain its
   archive and checksum as evidence.
2. From current `main`, prepare a focused revert of the faulty change on a review
   branch. Review the resulting diff against the intended working version.
   For multiple commits or merges, identify the exact changes and merge parent
   before reverting. Preserve history: do not reset shared `main`, force-push,
   or move existing release tags.
3. Run the relevant local checks, inspect a fresh eight-file static build, and
   review the revert before merging it. Wait for Repository CI to pass on the
   resulting `main` commit. Retain the same source pins and license notices
   unless the reviewed fix specifically requires a change.
4. Deliberately dispatch **Publish library workbench to GitHub Pages** on `main`
   with its confirmation input enabled. Verify that the dispatched run uses
   the exact reviewed revert commit whose CI passed. If `main` has advanced,
   review and verify that revision before deploying it. The workflow reruns
   checks and uploads only its fresh `dist/`.
5. Verify the deployed commit and observed site URL, then repeat all-domain
   search, pagination, source detail, downloads and responsive-layout checks.
   Record the outcome; a successful workflow alone does not prove the UI works.

If the first deployment has no known-good predecessor, there is no earlier site
to restore. Keep Pages unpublished while preparing a reviewed fix. If that first
site already became live and then failed verification, deliberately unpublish
or disable the Pages site in repository settings while correcting it. Deploy
again only after review, passing CI and the same explicit manual deployment flow.

## Versioning and later releases

Keep `VERSION`, root and QA package metadata, CLI/UI displays and release notes
aligned: `0.3.0.dev2` is represented as `0.3.0-dev.2` in npm metadata. A future
stable tag is `vMAJOR.MINOR.PATCH`; development artifacts must not be marked stable.
No npm or PyPI publication configuration is provided.

For a later authorized release, run the complete current checks, inspect the
exact artifacts and notices, then tag the reviewed commit and publish only the
approved files. Keep release tags immutable and fix defects through a new version.
Retain prior archives and checksums for investigation and rollback.

All six action commit pins were verified against their official upstream tag
references on 2026-09-08 (Europe/Helsinki). This identifies the selected actions;
it does not audit upstream implementations or establish that hosted workflows
or repository settings have been exercised.
