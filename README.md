# Prompt-as-Detection Library

Turn MITRE ATT&CK evidence into reviewable detection, hunting and triage prompts.
Browse **918 active techniques and subtechniques**, inspect their source guidance,
and export drafts from a browser workbench or local CLI.

The current `0.4.0.dev0` line is a research-foundation development version, not stable v1.0.
It adds versioned evidence contracts, a truthful review registry, a read-only API
contract, governance and supply-chain gates while preserving the pinned ATT&CK
19.2 library. No draft is described as operationally validated without evidence.

## Try it in your browser

**[Open the live demo →](https://samran2.github.io/Prompt-as-Detection-Library/)**

Search all 918 techniques, adapt a prompt and download it directly in your browser.
No installation, account or API key needed. Prompts remain unvalidated drafts;
the demo does not run a model or execute detection rules.

[![Repository CI](https://github.com/samran2/Prompt-as-Detection-Library/actions/workflows/ci.yml/badge.svg)](https://github.com/samran2/Prompt-as-Detection-Library/actions/workflows/ci.yml)
[![CodeQL](https://github.com/samran2/Prompt-as-Detection-Library/actions/workflows/codeql.yml/badge.svg)](https://github.com/samran2/Prompt-as-Detection-Library/actions/workflows/codeql.yml)

[Quick start](#run-it-locally) · [Source provenance](docs/source-provenance.md) · [Validation program](docs/validation-program.md) · [Roadmap](ROADMAP.md)

[![Full-library workbench showing source guidance and an editable detection prompt](docs/screenshots/desktop.png)](https://samran2.github.io/Prompt-as-Detection-Library/)

*Actual workbench screenshot from local browser verification.*

## What you can do

- **Find the right technique.** Search all three domains and filter by tactic
  or platform, with bounded pages of 50 records.
- **Inspect the evidence.** Read complete source descriptions, linked analytics,
  telemetry references, tuning variables and documented procedure examples.
- **Choose the task and format.** Use Detect, Hunt, Triage or Validate with
  Platform-neutral, Panther Python, Sentinel KQL, Defender XDR, Splunk SPL or Sigma output.
- **Compare evidence.** Keep a shareable search URL, compare two techniques and
  inspect the technique → telemetry → ATT&CK analytic → native-rule readiness map.
- **Keep drafts reviewable.** Edit browser text, copy or download TXT, and export
  filtered templates as JSONL or current-record research JSON. The CLI adds prompt
  and export checksums.
- **Choose your display.** Use the system, light, dark or high-contrast theme with
  keyboard-visible focus and reduced-motion support.

No account, API key, model service or runtime package installation is required.
Browser context and edits stay in memory and clear on reload; downloads create
local files. Copy and TXT preserve editor text; filtered JSONL exports fresh
templates without editor changes.

Prompts are **unvalidated drafts**. Output targets describe the requested format;
they are not verified integrations. No model calls or detection queries execute.
Source coverage and passing checks do not establish detection effectiveness.

## Evidence status

| Gate | Current measured state |
| --- | ---: |
| Active ATT&CK 19.2 prompts | 918 / 918 generated |
| Automated static prompt contract | 918 / 918 pass |
| Required independent human reviews | 0 / 1,836 complete |
| Native backend support cells | 0 assessed / 3,672 total |
| Lab-validated prompts | 0 |
| Field-confirmed prompts | 0 |
| Stable v1.0 release | Blocked by evidence gates |

The machine-readable [prompt registry](content/prompts/index.json),
[native-rule support matrix](content/native-rules/support-matrix.json) and
[review summary](validation/results/review-summary.json) make these limits
auditable. See the [evidence contribution guide](docs/evidence-contributions.md)
to help move a record forward without weakening the standard.
The [static scorecards](validation/evals/static/summary.json) evaluate source
grounding, ATT&CK alignment, telemetry feasibility language, benign-lookalike
handling, safety, citations and platform assumptions for every prompt. They do
not advance human-review or validation maturity.

## Run it locally

Download or clone the repository, then open `demo/index.html` in a modern browser.
For local HTTP preview and the best clipboard support, use Python 3.11 or later:

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory demo
```

Open [localhost:8766](http://127.0.0.1:8766/). The preview serves only the browser
assets; keep the repository root and private working files outside the site.

### Local CLI

Use Node.js 22 or later from the repository directory. No `npm install` is needed:

```sh
npm run library:help
node scripts/library_cli.cjs list
node scripts/library_cli.cjs prompt T1059.001
node scripts/library_cli.cjs export --output ./detection-prompts.jsonl
```

The export example creates `detection-prompts.jsonl` in the current directory;
it must not already exist. CLI help covers selectors, modes, targets and
literal context files. See the [development guide](docs/development.md) for details.

### Experimental local research API

Run the read-only reference service locally with `npm run api:start`. It binds
to `127.0.0.1:8781` by default and exposes the development OpenAPI contract for
techniques, prompts, versions, relationships and search. It is not the hosted
GitHub Pages demo and must not be exposed directly to the internet. See the
[API guide](docs/api.md) for current and future boundaries.

### Optional Rösti enrichment

The local-only Rösti adapter can relate a report to this catalog when Rösti
provides an explicit active ATT&CK technique ID. It aggregates IOC values away by
default and never counts external mapping as human or lab validation:

```sh
node scripts/rosti_sync.cjs \
  --report REPORT_ID \
  --output /absolute/private/path/rosti-enrichment.json
```

Read the [Rösti integration boundary](integrations/rosti/README.md) before use.
Inject `ROSTI_API_KEY` with a trusted secret manager before running; do not type
the value into the command itself or save it in shell history. Output must remain
outside the source repository. Review the rights of each underlying publisher
item before redistribution.

## Pinned coverage

| ATT&CK 19.2 domain | Active techniques and subtechniques |
| --- | ---: |
| Enterprise | 697 |
| Mobile | 124 |
| ICS | 97 |
| **Total** | **918** |

The library includes **378 parent techniques**, **540 subtechniques**,
**18,885 procedure relationships** and **2,053 linked analytics**. Each active
record has a readable [text prompt](library/prompts/). Revoked and deprecated
records are excluded from active prompts; source gaps and unlinked analytics
remain explicit in the [coverage evidence](library/coverage.json).

This is an **independent rebuild** from official pinned MITRE data, development
version `0.4.0.dev0` (npm `0.4.0-dev.0`). The original v0.2.0 archive remains
unavailable; this project does not claim to restore its implementation or formats.
Read the [source provenance](docs/source-provenance.md) for the exact commit,
source hashes, attribution and inclusion policy.

The earlier dev3 [prompt-quality review](docs/prompt-quality-review.md) covers
improved drafting instructions, not validated detections. Historical hosted
results remain in the [verification record](docs/verification.md); they do not
prove the unmerged `0.4.0.dev0` work or satisfy its release gates.

## Verify and build

```sh
npm run library:verify
npm run reviews:verify
npm run evals:verify
npm run check
npm test
npm run build
```

`library:verify` compares exact source/output identifiers and generated bytes
without rewriting them. `library:build` intentionally regenerates the pinned
library. The static build verifies it before copying exactly eight allowed
files to a new `dist/`; preserve an existing build before rebuilding.

The browser, CLI and text generator share `demo/core.js`. Raw source bundles,
complete procedure records, tests and private work stay outside the static build.
See [verification](docs/verification.md) for actual checks and their limits.

## Explore the project

| Guide | What it covers |
| --- | --- |
| [Architecture](docs/architecture.md) | Shared composition, data flow and the static file boundary. |
| [Data contracts](docs/data-contracts.md) | Versioned schemas and cross-record evidence invariants. |
| [Research API](docs/api.md) | Read-only `/v1` contract and current implementation boundary. |
| [Development](docs/development.md) | CLI contracts, generation, browser QA and repository checks. |
| [Agent skills](docs/agent-skills.md) | Pinned project-local engineering workflows for Codex, with shared checklists and offline verification. |
| [Contributing](CONTRIBUTING.md) | Focused changes, source fidelity and review expectations. |
| [Governance](GOVERNANCE.md) | Maintainer roles, DCO decisions and evidence approvals. |
| [Prompt quality review](docs/prompt-quality-review.md) | Semantic sample, shared-template improvements and validation limits. |
| [External detection comparison](docs/external-detection-review.md) | Public-summary comparisons, corroboration and rule-reuse boundaries. |
| [Security](SECURITY.md) | Private vulnerability reporting, trust boundaries and review scope. |
| [Release process](docs/release-process.md) | Candidate gates, signed evidence, publication and rollback. |
| [Repository settings](docs/repository-settings.md) | Required GitHub rules and current activation limits. |
| [Roadmap](ROADMAP.md) | Current delivery and separately scoped future work. |

## License and attribution

Original code and associated documentation use the [MIT License](LICENSE),
Copyright (c) 2026 samran2. Vendored development skills retain
[Addy Osmani's MIT notice](.agents/AGENT_SKILLS_LICENSE). Reproduced ATT&CK content retains separate
[MITRE terms](sources/attack-19.2/raw/LICENSE.txt); the
[static notice](demo/THIRD_PARTY_LICENSE.txt) includes both complete licenses.
See the [licensing record](docs/licensing.md) for scope. External evidence and rule
contributions require item-level SPDX and provenance. This independent project is
not endorsed by MITRE, Apple, Google, VirusTotal or Rösti. The npm packages remain
private; no stable release is claimed.
