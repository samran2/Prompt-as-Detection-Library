# Security policy

## Project status and reporting

This `0.3.0.dev2` independent full-library rebuild is prepared for the approved
public repository and demo. The repository exists, but the full-library push,
GitHub CI and Pages deployment remain pending. No supported public release is
declared. Earlier foundation and 12-record sample reviews
apply only to their historical artifacts, not to this version or the missing
original application.

A new offline Codex Security review of the full-library development snapshot
completed without reportable findings. The publication copy subsequently added
approved license notices, licensing metadata and documentation only; runtime, tests, data and
workflows were unchanged. See [verification](docs/verification.md) for exact
scope and exclusions. This is not a guarantee that vulnerabilities are absent.

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
- Browser source, procedure and analyst text must remain literal through
  composition and DOM rendering. No `eval`, executable markup or automatic model
  calls are part of the product. Prompt wording alone is not a security boundary.
- CLI selectors and context are validated. Exports use exclusive new-file writes
  and reject unsafe paths and symlinks. Context is bounded; do not include secrets
  in prompts, exports, test fixtures or screenshots.
  Mode 0600 restricts POSIX file permissions; no explicit Windows ACL is set.
  Export into a trusted private directory with appropriate host permissions.
- Browser context and edited drafts stay in memory. Reload clears them. Downloads
  intentionally create local files whose handling is the user's responsibility.
- The preview server binds to loopback. Serve `demo/` or reviewed `dist/`, never
  the repository root. The site is not an authenticated internet service.
- The public builder copies exactly eight allowed files, rejects symlinks and
  invalid UTF-8/NUL text, and applies limited credential-pattern checks. Catalog
  size is limited to 16 MiB and other assets to 2 MiB each. Source archives,
  tests and private work never enter the static output.
- The builder refuses an existing output. A write failure can leave a partial
  new `dist/`; inspect it and do not deploy a failed build.

Source links open the linked site only when clicked. A hosted site still causes
ordinary page requests to the hosting provider. No cloud submission, query
execution, telemetry or persistence of private context is added by this rebuild.

## Release checks and limits

Run source/output verification, application and boundary tests, real-browser
checks, dependency advisory review and exact distribution inspection before
release. Keep the optional browser dependencies and workflows separate from the
zero-dependency runtime; use locked installs with dependency scripts disabled.
Review changes to source pins, dependency graphs and publication permissions.

Coverage, checksums, passing structural checks and limited secret signatures do
not establish detection effectiveness or the absence of vulnerabilities. Review
generated detections in their intended environment before operational use.
Record actual results and remaining limitations in [verification](docs/verification.md).
