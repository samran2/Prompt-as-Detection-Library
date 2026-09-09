# Allowed GitHub Actions

Every remote action invocation in `.github/workflows/` must use the exact reviewed
commit below and retain a human-readable release comment. The repository-owned
`scripts/verify_actions_pinned.cjs` gate rejects tags, branches, unknown actions,
SHA drift, duplicate entries and missing comments.

The SHAs for newly introduced actions were resolved from release tags in their
official upstream repositories on 2026-09-08. A dependency update must review the
upstream diff and change this table and the workflow in the same pull request.

| Action | Allowed commit SHA | Reviewed release | Purpose |
| --- | --- | --- | --- |
| `actions/attest-build-provenance` | `977bb373ede98d70efdf65b84cb5f73e068dcc2a` | v3.0.0 | Generate an artifact provenance attestation without publishing a release. |
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | v7.0.1 | Read repository content with persisted credentials disabled. |
| `actions/dependency-review-action` | `05fe4576374b728f0c523d6a13d64c25081e0803` | v4.8.3 | Reject vulnerable dependency changes in pull requests. |
| `actions/deploy-pages` | `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` | v4 | Deploy an explicitly approved Pages artifact. |
| `actions/setup-node` | `249970729cb0ef3589644e2896645e5dc5ba9c38` | v6 | Select the declared Node.js runtime. |
| `actions/setup-python` | `5fda3b95a4ea91299a34e894583c3862153e4b97` | v7.0.0 | Select the repository-tooling Python runtime. |
| `actions/upload-artifact` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` | v7.0.1 | Retain bounded QA and evidence artifacts. |
| `actions/upload-pages-artifact` | `7b1f4a764d45c48632c6b24a0339c27f5614fb0b` | v4 | Package only the reviewed static Pages boundary. |
| `anchore/sbom-action` | `aa0e114b2e19480f157109b9922bda359bd98b90` | v0.20.8 | Produce the candidate SPDX JSON SBOM. |
| `aquasecurity/trivy-action` | `b6643a29fecd7f34b3597bc6acb0a98b03d33ff8` | v0.33.1 | Block high or critical vulnerabilities in the locally built research API image. |
| `github/codeql-action` | `cdf488f595d80d6e07e03d4674febd5ab45fa938` | v4 | Analyze code and upload reviewed SARIF output. |
| `gitleaks/gitleaks-action` | `ff98106e4c7b2bc287b24eaf42907196329070c7` | v2 | Scan Git history and pull-request changes for secrets. |
| `ossf/scorecard-action` | `4eaacf0543bb3f2c246792bd56e8cdeffafb205a` | v2.4.3 | Generate OpenSSF Scorecard evidence. |
| `sigstore/cosign-installer` | `7e8b541eb2e61bf99390e1afd4be13a184e9ebc5` | v3.10.1 | Install Cosign for keyless candidate-archive signing. |

Container scanning covers the repository's sole OCI build boundary,
`apps/research-api/Dockerfile`. Its base image is digest-pinned, the CI image is
never pushed, and Trivy fails on known high or critical OS/library findings. The
policy test requires any future Dockerfile or Containerfile to be reviewed as a
new build boundary rather than silently escaping this gate.

This file enforces workflow source policy in CI, but it cannot change repository
settings. After the table has been reviewed on `main`, configure GitHub Actions
to allow only these action repositories and require full-length commit-SHA
pinning. Keep the checked-in verifier as a second, reviewable enforcement layer.
