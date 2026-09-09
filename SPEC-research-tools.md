# Local research tools

## Scope and capability map

Add six independently testable, offline-first research capabilities to the
existing workbench. Preserve all pinned ATT&CK, ATLAS and D3FEND content,
default prompt bytes and CLI/API compatibility. Runtime dependencies remain zero.

| Capability | Implementation boundary | Evidence boundary |
| --- | --- | --- |
| Navigator | Domain-specific layer export and coverage matrix | Generated coverage is not validated detection |
| CAR | Pinned official analytics, exact technique joins and source viewing | Imported upstream examples are not locally tested rules |
| Attack Flow | User-authored ordered technique flow and official-format export | Hypothesis, never an assertion of observed activity |
| Summiting the Pyramid | Manual, evidence-backed robustness assessment | Not certification or prompt validation |
| ATT&CK comparison | Local proposed STIX bundle diff and impact report | No automatic pinned-source upgrade |
| Caldera | Offline lab plan and bounded result-envelope import | No command execution, server connection or validation promotion |

## Shared contracts

Supplemental browser modules are CommonJS/UMD, exposing distinct PAD_* globals.
They accept explicit inputs, return JSON-serializable objects, throw Error on
invalid boundary input, and perform no network calls or persistent storage.
User-provided text is bounded and rendered literally. Root integration owns
demo/index.html, demo/app.js, demo/styles.css, package scripts and build allowlist.
Feature owners own only their module, tests and feature-specific documentation.
Confirm exact callable contracts with the integrator before completion.

Source imports require immutable provenance, SHA-256 pins and applicable full
license notices. Generated projections must verify deterministically. Navigator
and Flow interoperability must target a documented official format rather than
inventing one. Lab results remain unverified user-supplied evidence.

## Acceptance

Each capability has successful and adversarial tests plus usable UI or CLI.
Existing regressions and source verifiers pass. Desktop/mobile screenshots and
browser exports are inspected. Review precedes publication through existing CI.
No human reviews, lab runs, performance measurements or certification are invented.
