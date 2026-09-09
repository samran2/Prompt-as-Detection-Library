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
