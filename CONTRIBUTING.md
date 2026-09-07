# Contributing

This independent `0.3.0.dev2` rebuild prepares a complete active ATT&CK 19.2
prompt library. The original v0.2.0 source archive remains unavailable. Do not
claim original implementation preservation or transfer older audit results to
new code. Original project code and associated documentation use the owner-approved
[MIT License](LICENSE), Copyright (c) 2026 samran2. MITRE data retains separate
terms; see the [resolved licensing record](LICENSE_TODO.md).

## Making a change

1. Read [AGENTS](AGENTS.md), [SPEC](SPEC.md) and the
   [development guide](docs/development.md). Work in a focused branch once Git
   history exists, and preserve unrelated changes.
2. Keep MITRE ATT&CK pinned to 19.2. Source updates need a separate reviewed
   change with source identity, hashes, exclusions and regenerated artifacts.
   Never edit generated prompts or the catalog as the only source of a change.
3. Keep composition in `demo/core.js` shared by the browser, CLI and generator.
   Add meaningful regression tests for changed behavior and error paths.
4. Regenerate intentionally with `npm run library:build`, then run
   `npm run library:verify`, `npm run check`, `npm test` and the relevant browser
   and foundation checks. Record actual outcomes and any unavailable checks.
5. Update documentation and the unreleased changelog. Review generated diffs,
   source identities, licensing, and the exact proposed distribution contents.

Node.js 22+ runs the application tooling without runtime packages. Python 3.11+
supports the preview server and foundation checks. Optional browser QA lives in
its own locked development dependency boundary; it is never shipped to users.

## Prompt and source contributions

Submit original project-code contributions under the MIT License. Preserve
applicable third-party licenses and attribution when contributing source material.

Each active technique and subtechnique needs identifiable, readable text grounded
in its source description and linked evidence. Preserve source references,
literal strings, procedure relationships and stated absences. Do not invent
platforms, procedures, telemetry fields or analytic links to fill gaps.

Clearly distinguish source facts, suggested telemetry, local-baseline guidance
and user context. Source text, logs and model responses are untrusted data;
embedded instructions must not trigger code, shell commands, network requests
or credential access. Generated detections remain drafts until tested in their
target environment. Structural compliance is not detection effectiveness.

Use synthetic context in tests, issues and screenshots. Never contribute
credentials, private logs, customer details or production model responses.
Use the private-reporting process in [SECURITY](SECURITY.md) for vulnerabilities.

## Browser and release review

Verify the [UI acceptance criteria](docs/ui-quality.md), including keyboard
operation, all domains, pagination, source detail, TXT and JSONL export,
responsive widths and failure states. Record screenshots and limitations with
the exact tested version; older sample screenshots are historical evidence.

Reviewers need the resulting behavior, compatibility implications, relevant
checks and remaining limits. Creating a remote, pushing, deploying a site or
publishing an artifact requires the owner's explicit authorization. Follow the
[publication process](docs/publishing.md) after the candidate is reviewable.
