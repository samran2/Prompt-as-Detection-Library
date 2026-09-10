# Research tools implementation

See SPEC-research-tools.md. Parallel owners implement Navigator, CAR, Attack Flow,
robustness assessment, source diff and offline lab exchange. The integrator owns
shared UI/build/docs, regression checks and publication. Modules may not edit
shared entry points or commit/switch branches independently.

1. Establish source-backed contracts and focused failing tests.
2. Implement independent modules and feature documentation.
3. Integrate a local Research tools page linked from the workbench.
4. Run regression, source-fidelity, browser and independent review checks.
5. Publish only after review and CI; record actual hosted verification.

## Premium Workbench development snapshot

See SPEC-premium-workbench.md and ADR-0008. The next application version is
`0.4.0.dev1` / npm `0.4.0-dev.1`; pinned sources and prompt bytes remain unchanged.
The completed Research tools plan above remains historical context.

1. Define the strict portable workspace contract and preservation tests.
2. Implement independent atomic storage, shared CAR/Flow presentation and workspace
   control modules. Keep file imports, database records and analyst text untrusted.
3. Integrate the unified four-tab desk, comparison dialog, command search,
   adjustable list and mobile navigation without duplicating composition logic.
4. Document consent, plaintext origin scope, import preview/new identity,
   original-template preservation, conflict recovery and clear epochs.
5. Run regression/source-fidelity/build checks, synthetic browser failure paths,
   responsive/browser matrix checks and independent security/correctness review.
6. Record exact evidence and resolve findings before the integrator deliberately
   publishes the reviewed candidate and verifies CI/Pages. No stable-release or
   manual accessibility acceptance is inferred from implementation alone.

Module owners work only on assigned paths. The integrator owns shared entry points,
version metadata, build/QA orchestration and publication. Pending acceptance remains
visible in tasks/todo.md until supported by recorded checks.
