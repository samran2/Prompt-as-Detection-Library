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

## Environment workflows and prompt comparison — 0.4.0.dev4

See SPEC-environment-workflows.md and ADR-0009. The completed plans above remain
historical context. The approved application target is `0.4.0.dev4` / npm
`0.4.0-dev.4`; no-profile content retains its dev3 identity and pinned sources.

1. Define strict environment files and profile-aware shared composition/CLI.
2. Add workspace v2 with independent applied/draft snapshots; explicitly import
   v1 data into a separate v2 store without touching old records.
3. Integrate profile management and four guided steps with quick-mode continuity,
   explicit application, draft preservation, keyboard and mobile access.
4. Add the fixed 40-case dev3/candidate comparison, offline preparation/reports,
   blinded review artifacts and explicit budgeted API runner. Verify with test
   doubles only; this update authorizes no paid model execution.
5. Run source parity, complete regressions, three-engine browser checks and
   independent correctness/security review; resolve findings and record limits.
6. After acceptance, publish the reviewed change to the existing repository and
   Pages demo, verify exact hosted assets, and deliver ZIP/hash and screenshots.

Local implementation and regression verification are complete. Formal comparison
security review is blocked by account access and an inventory that omits changed
`.cjs` files; no hosted dev4 update has been made. See docs/verification.md and
docs/environment-publication-status.json. The integrator owns final acceptance
and publication; retain these missing gates instead of treating tests as a clean
security scan.

## External research links — bounded follow-up

See SPEC-research-sources.md. The owner chose source cards and research links,
not mirrored metadata catalogs. Implement a shared literal-DOM module, integrate
Evidence and Research tools, verify privacy/source preservation and browser
regressions, then document local results. A separate agent may publish the frozen
dev4 snapshot as a draft PR only; main/Pages acceptance remains pending.

Implemented and locally verified on 2026-09-19: 439 Node, 16 Python and 95
checks per browser across three engines. Draft PR #21 contains only frozen
commit `04e4472`; source cards and narrow test corrections remain local. Hosted
scanner findings and the incomplete formal scan are recorded, not suppressed.
