# Versioning policy

Prompt-as-Detection Library versions the application, content contracts and
source datasets independently. One number must never be used to imply that all
of them changed or were validated together.

## Application versions

Stable application releases follow Semantic Versioning:

- **MAJOR** changes an established public CLI, schema or API incompatibly;
- **MINOR** adds backward-compatible behavior; and
- **PATCH** corrects behavior without changing supported contracts.

Stable tags use `vMAJOR.MINOR.PATCH`. They are annotated, protected and
immutable. A faulty release is superseded by a new version; its tag is never
moved.

Before v1.0, development identifiers use both ecosystem spellings:

- `0.4.0.dev0` in `VERSION` and Python-facing text;
- `0.4.0-dev.0` in npm metadata and SemVer-facing UI; and
- `v0.4.0-dev.0` only if an explicitly authorized prerelease tag is created.

Development builds must not be published as stable or described as v1.0 release
candidates unless they have passed the release-candidate gates.

## Stable v1.0 barrier

Version `1.0.0` cannot be authorized until evidence proves:

- all 918 current prompts have two independent expert reviews bound to the exact
  prompt hashes and current rubric version;
- all Enterprise, Mobile and ICS support-matrix cells are resolved with tested
  native rules or reviewed `not-applicable` evidence;
- the validation, security, supply-chain, WCAG/performance and rollback gates in
  [ROADMAP](../ROADMAP.md) and [release process](release-process.md) pass; and
- the candidate artifacts have verified SBOM, SHA-256, Sigstore and SLSA Build L2
  evidence.

A date, model score, source-coverage result or maintainer assertion cannot waive
these gates.

## Content and contract versions

- **ATT&CK version** identifies the official source release, currently pinned at
  19.2. It changes only through a reviewed source migration.
- **Content version** changes when prompt/rule bytes or their interpretation
  changes. Reviews bind to content hashes and do not transfer automatically.
- **Schema version** follows the schema's declared identifier/version. Breaking
  schema changes need a migration and an application-version assessment.
- **Rubric version** identifies the exact human-review criteria. Scorecards group
  only compatible rubric versions or explain normalization.
- **Fixture version/hash** binds expected outcomes to exact sanitized test data.
- **API version** appears in the future path (`/v1`) and OpenAPI document. API
  stability is separate from a deployment's application version.

Each exported object records the relevant versions and a content SHA-256. A
collection manifest records the application version and source/content snapshot.

## Compatibility policy

The existing Node CLI, static browser workflows and export meanings remain
compatible through the `0.x` foundation unless a change is explicitly documented
with a migration. Additive fields are preferred. Readers must ignore unknown
optional fields; writers must not silently reinterpret an existing required
field.

After v1.0, incompatible CLI, JSON Schema, export or `/v1` API changes require a
major version or a versioned replacement endpoint with a documented deprecation
window. Security fixes may shorten a window, but still need clear migration
guidance.

## Version update checklist

Before proposing a version change:

- update `VERSION`, package and lock metadata, UI/CLI labels, generated reports
  and the changelog together;
- verify the chosen spelling in each ecosystem;
- identify changed public contracts and provide migrations where required;
- keep ATT&CK, schema, rubric and fixture versions explicit;
- run deterministic generation and the full relevant test suite; and
- confirm release notes describe user impact and limitations, not only commits.

Only the release workflow may turn a reviewed version into a published tag or
artifact. A version string in the worktree is not release evidence.
