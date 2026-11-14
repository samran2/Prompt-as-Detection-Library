# Security policy

## Project status and reporting

Version `0.4.0.dev4` is the current development candidate. The earlier
owner-approved library and demo are published at the approved public
destination following their recorded verification. This candidate adds local
environment profiles, guided creation, workspaces, module preferences and the
user guide. Its exact hosted checks and deployment still must pass on the
accepted publication head before merge and Pages publication.
Observed checks and deployment status are recorded in
[verification](docs/verification.md). No supported
public release is declared. Earlier foundation and 12-record sample reviews
apply only to their historical artifacts, not to this version or the missing
original application.

The 0.4 review chain covers the research API, versioned contracts, Rösti client,
premium state/compare UI, local workspace and preference boundaries, release
workflows, publication fixes and their tests. Pinned source data remains
unchanged and was verified for exact generated parity, but bulk ATT&CK
narratives were not individually security-reviewed.
See [verification](docs/verification.md) for exact scan identifiers, scope and
outcomes, and [release evidence](docs/release-evidence.md) for remaining gates.
This is not a guarantee that vulnerabilities are absent.

GitHub private vulnerability reporting is enabled and was verified for
[samran2/Prompt-as-Detection-Library](https://github.com/samran2/Prompt-as-Detection-Library).
Use **Report a vulnerability** from the repository's
[Security tab](https://github.com/samran2/Prompt-as-Detection-Library/security)
to submit a private report to its maintainers.

Never put undisclosed vulnerability details, credentials, customer logs or
sensitive exploits in public issues. A useful private report identifies the
version or commit, impact, prerequisites and a minimal synthetic reproduction.
No guaranteed response, remediation or disclosure timeline is stated.

## Trust boundaries

- Raw ATT&CK bundles are pinned inputs, still treated as untrusted data. The
  generator verifies shape and source hashes and preserves explicit source gaps.
- ATLAS uses separately pinned official versioned YAML and a hash-verified JSON
  derivative. Its descriptions, case studies and mitigations are untrusted
  literal data. Source threat maturity must not become detection validation.
- Browser source, procedure and analyst text must remain literal through
  composition and DOM rendering. No `eval`, executable markup or automatic model
  calls are part of the product. Prompt wording alone is not a security boundary.
- CLI selectors and context are validated. Exports use exclusive new-file writes
  and reject unsafe paths and symlinks. Context is bounded; do not include secrets
  in prompts, exports, test fixtures or screenshots.
  Mode 0600 restricts POSIX file permissions; no explicit Windows ACL is set.
  Export into a trusted private directory with appropriate host permissions.
- Browser context and edited drafts stay in memory by default. The user can
  explicitly enable local autosave; it stores the workspace, including drafts
  and context, as unencrypted IndexedDB data on that browser profile. The UI
  discloses this boundary, supports disabling autosave and requires confirmation
  before deleting all saved version 2 workspaces. Module visibility uses a
  separate bounded localStorage record containing exactly four booleans and no
  analyst text. Downloads intentionally create local files whose handling is the
  user's responsibility.
- The preview server binds to loopback. Serve `demo/` or reviewed `dist/`, never
  the repository root. The site is not an authenticated internet service.
- The public builder copies only the files in its explicit deny-by-default
  allowlist, rejects symlinks and invalid UTF-8/NUL text, and applies limited
  credential-pattern checks. Catalog
  size is limited to 16 MiB per framework and other assets to 2 MiB each. Source archives,
  tests and private work never enter the static output.
- The builder refuses an existing output. A write failure can leave a partial
  new `dist/`; inspect it and do not deploy a failed build.
- The optional Rösti client is an explicit network operation. It accepts only a
  validated report identifier, contacts the fixed `https://api.rosti.dev` origin,
  refuses redirects, limits decoded JSON/pagination/items, reads its credential
  only from `ROSTI_API_KEY`, and writes a new private file. IOC values are omitted
  unless the operator explicitly opts in. External mappings remain unvalidated.
- The local research API is read-only and binds to loopback by default. Its
  cursors, request limits, ETags and method restrictions are security controls,
  not authentication. Do not expose the reference server directly to the internet.
- Data contracts reject unsupported maturity claims. They do not authenticate a
  reviewer or laboratory; signed, independently reviewed evidence is still needed.

Source links open the linked site only when clicked. A hosted site still causes
ordinary page requests to the hosting provider. No automatic cloud submission,
query execution or telemetry is added by this rebuild. Private context persists
only when the user explicitly enables the local, unencrypted workspace autosave
described above or downloads/exports a file.

## Release checks and limits

Run source/output verification, review-registry checks, application and boundary tests, real-browser
checks, dependency advisory review and exact distribution inspection before
release. Keep the optional browser dependencies and workflows separate from the
zero-dependency runtime; use locked installs with dependency scripts disabled.
Review changes to source pins, dependency graphs and publication permissions.

Coverage, checksums, passing structural checks and limited secret signatures do
not establish detection effectiveness or the absence of vulnerabilities. Review
generated detections in their intended environment before operational use.
Record actual results and remaining limitations in [verification](docs/verification.md).
