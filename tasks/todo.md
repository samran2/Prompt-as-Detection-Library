# Full-library tasks

- [x] Obtain pinned official 19.2 source and verify counts (697/124/97, 18,885 uses).
- [x] Implement source-grounded prompt composition; test all modes and literal text.
- [x] Generate all 918 text prompts plus complete source/relationship inventory.
- [x] Add full-library browser search/pagination/details; verify desktop/mobile.
- [x] Add local CLI list/prompt/export; verify safe writes and shared rendering.
- [x] Update dev.2 documentation, metadata, build and CI checks.
- [x] Independently verify exact ID coverage, determinism and all 22,032 combinations.
- [x] Review changed trust boundaries and regressions; correct the Windows path issue.
- [x] Prepare local delivery and actual UI screenshots; archive evidence accompanies the ZIP.
- [x] Review full-library snapshot with Codex Security and maintained secret scanning;
  the later CodeQL workflow is outside that audit. See ../docs/verification.md.
- [x] Record the owner-approved MIT project-code license and preserve MITRE notices.
- [x] Obtain approval for the public repository and public demo.
- [x] Create the public repository and verify GitHub private vulnerability reporting is enabled.
- [x] Push the complete reviewed library to the approved public repository.
- [x] Pass initial GitHub Repository CI and record the separate CodeQL outcome.
- [x] Verify the test-fixture correction and confirm automatic CodeQL alert resolution.
- [x] Deliberately deploy the approved Pages demo and verify the observed live URL.

Actual local results: 78 Node tests, 14 Python tests and 22 loopback browser checks passed.
Source/output coverage verification and eight-file static build passed. See
../docs/verification.md for scope, limits and observed hosted outcomes. The library
and demo are published; no operational detection validation or original application
recovery is claimed.
