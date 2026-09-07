# Roadmap

Every active ATT&CK 19.2 technique is complete; the current objective is the
approved public repository and demo publication. Version `0.3.0.dev2` is independently rebuilt from official MITRE
source; the missing v0.2.0 archive has not been restored. The historical sample
and its verification record remain separate from this larger version.

## Complete the pinned library

- Preserve the official Enterprise, Mobile and ICS source bundles with commit
  identity, SHA-256 values and MITRE notice.
- Require exact identifier-set equality between active source techniques,
  generated catalog records and 918 readable prompt files: 697 Enterprise,
  124 Mobile and 97 ICS, including 378 parents and 540 subtechniques.
- Record all 248 revoked/deprecated exclusions, 18,885 qualifying procedure
  relationships and 2,053 linked analytics. Preserve the 13 unlinked active
  analytics in raw source without inventing relationships.
- Keep the 24 ICS records without source platforms and 108 records without
  qualifying procedures explicit. Absence must not prevent a technique prompt.

Exit evidence: deterministic generation, exact source and output inventories,
complete readable texts, and reviewable [coverage](library/coverage.json).

## Integrate and verify local workflows

- Use one composition implementation for generated text, browser and Node CLI.
- Verify all 22,032 record/mode/target combinations, source-specific content,
  literal input, bounded context, output checksums and overwrite safeguards.
- Verify all-domain search, pages of 50, first and last selections, source
  details, keyboard operation, context application, copy and both export formats.
- Check the browser at 320, 768, 1024 and 1440 CSS pixels and under a repository
  URL prefix. Record console/network results, screenshots and accessibility limits.
- Keep the public build limited to eight files and verify generated inputs
  before building. Raw bundles, repository tools and analyst context stay out.

Exit evidence: current Node and foundation checks, real-browser results, source
coverage review and inspected build contents in [verification](docs/verification.md).
These checks do not validate detection effectiveness.

## Prepare publication after review

- Build and compare the new archive against its source files; retain its checksum.
- Preserve the owner-approved [MIT project-code license](LICENSE) and separate
  MITRE terms; the decision is recorded in [LICENSE_TODO](LICENSE_TODO.md).
- Review the exact distribution and any future Git history for private data and
  credentials; preserve the enabled GitHub private vulnerability-reporting route.
- Use the approved public
  [samran2/Prompt-as-Detection-Library](https://github.com/samran2/Prompt-as-Detection-Library)
  repository. It currently contains its initialization license; the full-library
  push, hosted CI and Pages deployment remain pending.
- Run the configured CI on the approved commit and deploy only the reviewed static
  output after explicit authorization. Keep development builds marked prerelease.

See [publishing](docs/publishing.md). No release, push or deployment is authorized
by completing local implementation or by a passing test run.

## Later work

Evaluate source upgrades, deeper procedure browsing, saved local selections,
additional output formats and measured accessibility/performance improvements
as separate changes. A model service or executable detection evaluator requires
a separate product and data-flow decision. If the original archive becomes
available, preserve it and compare its provenance and contracts before promising
compatibility or merging its code.
