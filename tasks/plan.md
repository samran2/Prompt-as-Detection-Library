# Plan: complete active ATT&CK 19.2 library

Original direction: every technique first; no publication. Techniques are now
complete; the owner approved MIT licensing, the public repository and public demo.
The full library is pushed to the public repository and private vulnerability
reporting is enabled. Hosted CI and Pages outcomes belong in
[verification](../docs/verification.md#hosted-publication-status).
Specification: ../SPEC.md.
Task checklist: todo.md. Existing demo and its audit remain immutable in outputs.

## Ordered slices and parallel ownership

1. Source inventory: pin official raw files and verify active identifiers,
   parent/child relations, strategy chains and documented procedures.
2. Composition contract: source-specific full prompts through shared core.js;
   unit tests fail first, then implement. Main owns core.js and its tests.
3. Generator: independent worker owns sources/, library/, build_library.cjs and
   generator tests. Output follows SPEC.md; consumes shared core.js.
4. Workbench: independent worker owns index.html, app.js, style.css and focused
   UI helpers/tests. Adds scalable browsing using unchanged catalog contract.
5. CLI: independent worker owns library_cli.cjs and CLI tests; consumes shared
   core/catalog without alternative prompt implementation.
6. Documentation/build/CI: independent worker owns package metadata, docs,
   workflows and static builder, retaining strict file boundaries.
7. Independent coverage and browser QA after integration; source-only code review
   of changed trust boundaries; main fixes issues and packages verified result.

## Checkpoints

- Source: exact counts and hashes from official release, no inferred relationships.
- Library: complete ID-set equality, per-technique readable prompts, all procedures.
- Integration: all tests/builds pass; browser and CLI use identical core output.
- Handoff: new ZIP verified bytewise; no original-restoration or security-audit
  claims inherited from earlier 12-record snapshot. A fresh full-library security
  review is complete; public visibility and private reporting are confirmed.
  The full-library push is complete. Record actual hosted CI and Pages outcomes
  in [verification](../docs/verification.md#hosted-publication-status).

## Risks

- Large catalog: bounded generation, 50-item rendering and measured browser load.
- Data missing source platforms/procedures: explicit absence, never invented facts.
- Malicious-looking source/log text: literal output and no execution/network.
- Source package remains missing: independent rebuild and traceable provenance.
- Rights: preserve the owner-approved MIT project-code license and separate MITRE
  notices; the completed decision is recorded in ../docs/licensing.md.
