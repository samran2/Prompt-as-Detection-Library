# Prompt comparison: evidence before claims

The `0.4.0.dev4` comparison tool prepares a reproducible **40-case, 160-response**
experiment. It does not establish that the new prompts produce better answers.
This release uses mocked API tests only: no paid model run or independent human
score is published. Prompt maturity remains `generated`.

## Start offline

Node.js 22+ is sufficient; there are no new dependencies. With no arguments,
the command prints a summary and neither writes files nor accesses the network:

```sh
node scripts/compare_prompts.cjs
```

To keep a prepared comparison and an empty review pack locally, create an ignored
private parent and choose new output directory names:

```sh
mkdir -m 700 runs
node scripts/compare_prompts.cjs prepare --output runs/dev4-comparison
node scripts/compare_prompts.cjs report --input runs/dev4-comparison --output runs/dev4-review
```

If `runs` already exists, use it only if it is a trusted private directory; do
not delete existing work to repeat these examples. Output parents must exist.
Commands refuse existing output directories, symbolic-link ancestors and
non-private run directories. Files are mode `0600`, directories `0700`. These are
local permissions, **not encryption**. Run artifacts belong outside the static
demo allowlist and should not be committed or automatically uploaded.

## What is compared

- Baseline: the exact `demo/core.js` bytes from published commit
  [`2fb30a089ed54a6834f308724c327edc5fccdfa6`](https://github.com/samran2/Prompt-as-Detection-Library/commit/2fb30a089ed54a6834f308724c327edc5fccdfa6),
  version `0.4.0.dev3`. Its separate vendored snapshot is hash checked before use;
  arbitrary Git refs, modules and commands are not accepted as inputs.
- Candidate: the checked-out shared composer and environment renderer, with
  exact file hashes, application version and source-catalog hash recorded.
- Cases: ten each from Enterprise, Mobile, ICS/OT and ATLAS, covering all six
  targets and all four tasks. Each case runs twice per version. Old-first and
  new-first order is balanced 40/40, with opposite orders within each case.
- Both versions receive the same synthetic environment facts and analyst
  context. The old version receives the exact rendered profile in its legacy
  context field; cases must fit its 4,000-character limit. Neither arm receives
  an information advantage. The profile formatting placement itself is part of
  the experiment.

The [fixture policy](../validation/evals/comparison/README.md) distinguishes
complete synthetic reasoning inputs, missing information, contradictory facts,
benign lookalikes and embedded hostile instructions. Eight `ready` profiles are
explicitly hypothetical, user-supplied inert fixture assumptions, covering all six
targets; they exercise the supplied-input branch without claiming real product
collection or validation. The other 32 profiles remain unconfirmed examples and
require missing-input handling. `ready` is a scenario label, **not** a claim of
operational readiness. This first suite does not test real deployment readiness
or prove all 1,115 prompts improved.

Preparation is versioned JSON (`schemaVersion: 1`) with `evidenceKind: not-run`,
exact source/composer/case hashes and per-prompt SHA-256. A run recomputes and
compares the complete plan against the pinned synthetic suite. Edited prompts,
private profiles and arbitrary imported preparations are refused. If code,
sources or cases change, prepare a new comparison; old evidence is not silently
reused with the new implementation.

## Optional operator API run — not used in this release

Only the explicit `run` command can contact OpenAI. The owner must authorize the
paid experiment separately. Keep the existing `OPENAI_API_KEY` in the operator's
environment; never put it in a command argument, a profile or a checked-in file.
There is no browser integration, no model default and no CI network path.

Before running, the operator verifies the exact model's current standard input
and output prices and maximum input-token bound using official model and pricing
documentation. Record them in a private JSON file matching
[the pricing schema](../packages/schemas/prompt-comparison-pricing.schema.json).
The required fields are `schemaVersion: 1`, `currency: "USD"`, `model`,
`inputUsdPerMillion`, `outputUsdPerMillion`, `maxInputTokens`, `verifiedAt`,
`sourceUrl` and `operatorVerified: true`. Both prices and the cost cap must be
positive. The snapshot must be at most 30 days old. No example prices are
presented as verified prices; the tool fails closed without this input.

When that separate paid-run approval exists, the command shape is:

```text
node scripts/compare_prompts.cjs run --input runs/dev4-comparison
  --model EXACT_MODEL_ID --pricing-file runs/verified-pricing.json
  --max-cost-usd APPROVED_POSITIVE_CAP --max-output-tokens 2048
```

The lines above describe one command; join them when invoking it. `EXACT_MODEL_ID`
and `APPROVED_POSITIVE_CAP` are intentional non-runnable placeholders, not choices
made on the owner's behalf. Model aliases which resolve to another response
model identifier are refused: record an exact identifier. Request settings are
identical for the two versions; unsupported settings stop the run.

Requests use only `https://api.openai.com/v1/responses`, no redirects, no tools,
no streaming/background mode, `store: false`, default service tier and disabled
truncation. Each response has a 60-second total fetch/body deadline and a 1 MiB
body cap. A completed refusal is recorded as refusal evidence, not a success
score or a transport retry. Unknown, malformed, incomplete or model-mismatched
responses stop the run. Raw provider errors and credentials are never printed.

The request contract follows the official
[Responses API reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).
`store: false` is not a promise of zero provider retention; review
[OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
before transmission. Only the public synthetic suite is eligible for this tool.

### Cost and interruption safety

Before **every** network request, the tool writes and syncs an exclusive
reservation containing the request identity, prompt hash, timestamp and cost.
It reserves the model's full operator-verified input bound plus the requested
maximum output at the recorded rates. This is deliberately much more conservative
than token estimates. Completed reservations are not automatically released.

The cap is a local bound under the supplied pricing assumptions, not an OpenAI
billing guarantee. Incorrect or changed rates can invalidate it. Usage above the
recorded context/output bound stops the run for manual billing review. Configure
provider-side project limits independently. Token usage, timestamps, request
settings, response/text hashes and a cost upper bound at recorded rates are saved
for each completed response; cached-input discounts are not assumed.

Use `--resume` with identical model, prices, cap and output settings to continue
only requests that were never reserved. Completed requests are skipped. A
reserved request without a valid result is **uncertain**, including timeouts and
write failures; it is never automatically retried and blocks further requests.
Do not delete reservations to make a run continue. Resolve billing with the
provider and deliberately authorize a new experiment if needed.

An exclusive `active.lock` prevents simultaneous runners. A process crash may
leave it behind. Remove that one stale lock only after confirming no runner is
active and inspecting the journal; removing it cannot clear uncertain
reservations. The tool assumes the private output hierarchy is trusted and not
being replaced by another process with the same operating-system permissions.

## Report and independent review

`report` is always offline and writes three new files:

- `report.json`: versions, hashes, settings, response evidence and observations.
- `blind-review.json`: 80 randomly assigned A/B response pairs and blank human
  rubric fields. Reviewers receive this file and the public fixture descriptions.
- `blind-key.json`: the answer-to-version mapping. Keep it from reviewers until
  they lock their scores. Response text is unchanged and may self-identify, so
  this is arm-label blinding, not a guarantee of complete anonymity.

Four-section markers, explanation length, code-block labels, canonical-source
mentions, supplied-field/table mentions and missing-input wording are **lexical
observations**, not semantic scores. Valid alternate supplied references need not
mention the canonical URL. Mentioning a field does not establish correct use;
quoting malicious instructions does not establish that the response followed
them. Syntax, actual field use, citation accuracy, selected-target compliance,
safety and detection effectiveness remain `not-assessed` without reliable tests
or human evidence. No model is used to grade itself.

Independent reviewers fill 1–5 scores for factual accuracy, technique alignment,
telemetry feasibility, benign cases, safety, source attribution and clarity;
leave unassessable dimensions blank and give a rationale. These files remain
separate from the project's review registry and never promote prompt maturity.

## Verification

```sh
node --test tests/prompt_comparison.test.cjs
node --check scripts/compare_prompts.cjs
node --check packages/core/prompt-comparison.cjs
```

Tests inject a local in-memory transport. Injected responses are always labeled
`mock`; there is no mock override in the production CLI. They cover safety
boundaries, conservative reservations, no-repeat resume, timeouts, refusal
handling, invalid/oversized results, fixture integrity, fairness and offline
reporting. Passing these checks demonstrates the tooling behavior, not model
quality, platform compatibility or detection effectiveness.
