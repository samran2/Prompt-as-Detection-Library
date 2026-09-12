# Environment workflows and prompt comparison — 0.4.0.dev4

## Status and intent

Approved implementation scope; integration, independent review and publication
acceptance are tracked separately in `tasks/todo.md` and `docs/verification.md`.
Help analysts describe their environment once, produce a focused prompt and
prepare a fair comparison of prompt versions. No paid model call is authorized
as part of implementing or verifying this version.

## Capabilities and boundaries

- The pure environment contract validates a versioned profile and renders its
  literal facts. Shared composition consumes it in the workbench, library CLI
  and comparison tool; user-interface modules do not implement another composer.
- Workspace v2 stores named editable profiles, an independent applied snapshot,
  per-draft snapshots/hashes and guided-view preferences. Draft identity includes
  the profile revision so edits do not rebase existing work.
- The guided controller presents four steps and a compatible quick view. Profile
  creation, selection and explicit application are distinct actions. Copy remains
  primary; unavailable telemetry is never filled in from catalog suggestions.
- A separate operator-only comparison CLI prepares, runs and reports fixed test
  cases. Only explicit `run` can call OpenAI. It is never a browser build asset.

## Contracts and preservation

Environment v1 files use `.pad-environment.json`, strict scalar fields and a
128 KiB UTF-8 limit. Profiles contain ID, revision, name, target, operating
environment, data sources, tables/log types, field mappings, known limitations
and user/example provenance. Empty text means unknown. Imported profiles are
previewed and copied to a new identity; imports do not apply them automatically.
CLI `--profile-file` is additive; an explicit target conflict is an error.

Workspace v2 retains the 5 MiB boundary and strict integrity checks. Version 1
files and stored records are inspected before migration; confirmation creates
a new workspace identity and preserves original draft/template/context bytes.
Unknown techniques and source drift remain visible without rebasing. Version 2
uses `pad-workspaces-v2`; version 1 storage is accessed only for explicit read-only
discovery/import. Existing original saves remain usable for dev3 rollback.
Autosave is opt-in plaintext storage with atomic revisions and clear epochs.

Applied environment snapshots do not depend on a profile remaining in the saved
list. Drafts preserve their own profile and template hashes. No names, context,
profiles or drafts enter share URLs or network calls. Manual assessments and lab
envelopes remain separate formats, not workspace validation claims.

The application version advances to `0.4.0.dev4` / `0.4.0-dev.4`. No-profile
generated prompts retain the `PAD-v0.4.0-dev3` content profile; unchanged prompt
bytes are not regenerated merely to match application labels. All pinned MITRE
source datasets and default ATT&CK-only CLI behavior remain unchanged.

## Comparison and evidence

Pin the published dev3 composer and integrity manifest. Prepare 40 fixed cases,
10 each for Enterprise, Mobile, ICS/OT and ATLAS, covering the six targets and
four modes. Both arms receive identical public/synthetic environment facts; the
baseline receives profile facts as literal legacy context. Default preparation
uses two repetitions per arm and makes no network call.

API execution requires an exact model ID, explicit pricing snapshot, positive
budget and a deliberate `run` command. Use the process environment key, fixed
HTTPS origin, bounded replies, no redirects, no automatic ambiguous retries and
`store:false`. Do not log secrets, accept private workspaces as test inputs or
execute model output. A durable run journal prevents silent repeated charges
after an interrupted or uncertain request; unresolved work is reported explicitly.

Reports separate deterministic structure/reference checks from human judgment;
unsupported syntax checks stay untested. Blinded A/B review files do not assign
fictional reviewers or scores. Record version/settings/time/token usage and
prompt/response hashes, without promoting generated maturity. No real model
quality gain is claimed from mocked tests or lexical assertions.

## Acceptance

- Preserve the 360 Node, 16 Python and 69 browser regression baseline; record
  actual new totals rather than treating planned checks as completed.
- Verify profile roundtrips, malformed/duplicate/oversized input, target conflicts,
  browser/CLI parity and all 1,115 techniques across six targets and four modes.
- Verify v1/v2 migration, cancelled imports, independent profile revisions,
  deleted-profile snapshots, autosave failures, multi-tab conflicts and rollback.
- Exercise guided/quick transitions, drafts, mobile and keyboard behavior in
  Chromium, Firefox and WebKit at 320–1440 CSS pixels; record skipped tests.
- Test comparison requests with doubles only: errors, timeouts, response limits,
  budget reservation, interrupted recovery and no implicit API call from CI.
- Inspect the exact 31-file static allowlist (30 served assets), private output
  exclusions and clean package. Complete independent code/security review before
  reviewed GitHub/Pages publication; then record real hosted results and ZIP/hash.

Automated tests do not certify WCAG compliance or lab/field detection validation.
