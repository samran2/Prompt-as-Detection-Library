# Publishing and release process

## Current status

The complete active ATT&CK 19.2 library is an independent development rebuild at
`0.3.0.dev2` (npm `0.3.0-dev.2`). The original v0.2.0 archive is unavailable; no
recovery, original test preservation or format compatibility is claimed.
Nothing has been published by this work. The proposed destination is account
`samran2`, repository `Prompt-as-Detection-Library`; no live URL is asserted.

All 918 active techniques have been generated and checked. The owner approved
the MIT project-code license and requested GitHub publication. Public repository
visibility still requires confirmation; the creation attempt was blocked before
a repository was created. Private reporting must be configured on the actual
repository before uploading code. Preserve MITRE terms independently.

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
5. Preserve the approved [license decision](../LICENSE_TODO.md) and configure a
   monitored private vulnerability-reporting route. Confirm the proposed
   destination, visibility and explicit publication authorization.

Local implementation and passing checks do not authorize publication. A missing
original archive does not prevent review of this independent rebuild's rights,
but no rights to the original application may be claimed.

## Repository CI and archive preview

Repository CI runs foundation checks and the reusable full-library checks. The
latter verify generated source outputs, JavaScript syntax, Node behavior, static
build boundaries and real-browser flows. Python matrix jobs cover foundation
tooling only; they are not compatibility tests for an original Python app.
Workflows are prepared locally and have not run on GitHub yet.

The manual **Library archive preview** first requires the reusable library checks
and runs foundation checks before archiving committed `HEAD`. It uploads only
its generated ZIP and SHA-256 file as a short-lived Actions artifact, with
read-only repository permissions. It does not create a GitHub Release or publish
a package. Its ZIP contains the committed repository, including source bundles
and readable prompts; it is separate from the eight-file website payload.
Artifact access follows the repository's GitHub settings.

## Publish the static workbench

After explicit owner approval:

1. Create or use the verified destination and push only the reviewed tree using
   a real configured Git identity. No author or remote URL should be invented.
2. Configure GitHub Pages to use **GitHub Actions** and the `github-pages`
   environment with required approval where available. Require appropriate CI
   checks and review on `main`, and configure private vulnerability reporting.
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
