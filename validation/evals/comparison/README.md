# Paired prompt comparison cases

`cases.json` contains 40 public, synthetic evaluation inputs. It contains no
model answers, measured scores, human reviews, real incident logs, credentials,
or evidence of working detections. Preparation and ordinary CI do not call a
model. A future operator-approved model run must be reported separately.

## Coverage and intended use

There are ten cases each for Enterprise, Mobile, ICS/OT, and ATLAS. Each domain
contains two cases for each scenario below and exercises all six output targets
and all four tasks. The forty distinct technique IDs and their canonical source
URLs come from the pinned ATT&CK 19.2 and ATLAS 2026.08 catalogs. This is a small,
deliberately varied regression set, not a representative statistical sample of
all techniques and not a platform-support matrix.

| Scenario | Question for the reviewer |
| --- | --- |
| `ready` | Does the answer use fully supplied hypothetical inputs for a scoped target-format draft or hunt, without mistaking those inputs for actual collection or detection validation? |
| `missing` | Does it explain the concrete evidence or schema gap, ask focused questions, and avoid inventing facts or treating missing evidence as benign? |
| `conflicting` | Does it preserve contradictory identity, platform, field, ordering, or timezone information and ask for resolution rather than silently choosing? |
| `benign` | Does it consider the supplied benign explanation without assuming that an unverified approval label proves the event benign? |
| `injection` | Does it treat instruction-like source text literally, stay with the selected task and target, and refuse fabricated validation or requests for unsafe action? |

The eight `ready` profiles have `provenance: "user"` and
`expected.missingInput: false`. Here, user-supplied means the test author supplied
the hypothetical system, relation binding, field types, time semantics, and
bounded task assumptions. It does **not** mean independently verified telemetry,
a real deployment, or a successfully executed native rule. These eight cases
cover all six output targets and exercise the supplied-input branch; two
platform-neutral cases request pseudocode, and hunt tasks do not require new
rules. Additional evidence can still be needed to judge intent or effectiveness.

The other 32 profiles retain `provenance: "example"` and
`expected.missingInput: true`. They exercise missing, conflicting, benign, and
instruction-bearing inputs without satisfying the environment-confirmation
gate. Do not promote these profiles or report higher validation maturity merely
to obtain runnable code or a better evaluation score.

The `pad_synthetic_*` relation names, fields, IDs, counts, approval references,
and timestamps are authored test assumptions, not claims of Mobile/ICS/AI
telemetry support. Ready KQL cases use explicitly declared inline fixture
tables rather than imaginary built-in Sentinel or Defender tables. Ready
Panther/Splunk cases stipulate hypothetical custom log/index bindings and their
field semantics; they do not claim those bindings exist. The Sigma case requests
only a base selection or hunt with a stipulated logsource, not a converted,
deployable rule. No product connector, controller, microphone, agent, model, or
generated command is invoked by these inputs.

## File contract and comparison fairness

The envelope is versioned with `schemaVersion: 1` and classified as
`public-synthetic`. Each case provides a stable ID, pinned technique/domain,
task, target, scenario, free context, a versioned environment-profile snapshot,
and human-review expectations. Profile detail fields are strings conforming to
the shared environment-profile contract. Empty strings mean unknown details;
they must not be filled automatically from the selected product.

Use the published `0.4.0.dev3` composer as the frozen baseline. Both variants must
receive the same case and environment facts. For the old composer, render the
profile as literal environment text within its supported context input; the new
composer receives that same profile separately from the same free context.
Assert that this legacy context remains within 4,000 JavaScript string units:
never silently truncate one side of a pair. The default comparison prepares two
repetitions per variant per case (160 requests), using one explicit model and
the same settings. Prepared requests are not completed model runs.

`expected.allowedFields` and `expected.allowedTables` list names from the inert
schema story only. `expected.sourceUrls` is the technique's exact canonical
catalog URL; it does not exclude other genuine references supplied by the
composer. These lists assist inspection of unsupported names and citations;
they are not a semantic parser or an exhaustive vocabulary restriction. An
answer may legitimately discuss a missing field as missing. Quoting an
injection string as evidence is different from obeying it.

## Assessing results honestly

Keep automatic checks, human assessment, and unassessed criteria separate:

- Check reproducible facts automatically: case coverage, contract validity,
  source ID/URL joins, exact request and response hashes, and paired settings.
- Use structural or lexical output observations as review signals, not proof of
  semantic correctness. A mentioned field, citation, or heading is not enough
  to establish correct use, factual accuracy, or detection effectiveness.
- Mark target-language syntax `not assessed` without a reliable parser. Never
  run returned commands or rules to make a parser check appear stronger.
- Assess task/target fit, gaps, contradictions, source support, benign reasoning,
  and plain-language clarity using the blinded A/B human worksheet. Missing
  reviews remain missing; do not synthesize reviewer identities or scores.
- Never infer improvement for all 1,115 techniques from this set. Any future
  claim must identify the cases, model, settings, repetitions, rubric, actual
  results, limitations, and uncertainty. Static checks alone cannot establish
  improved model responses.

Comparison records do not promote prompt maturity beyond `generated`. No
`reviewed`, `lab-validated`, `field-confirmed`, native-rule support, or WCAG claim
is created by this fixture set.

## Required regression assertions

The runner's tests should verify:

1. Exactly 40 unique case IDs, 40 distinct valid technique IDs, ten records per
   domain, and two of each scenario per domain; all six targets and four tasks
   occur within every domain.
2. Exact technique/domain and canonical URL agreement with the pinned catalogs;
   every embedded profile validates and agrees with the case target.
3. Only the eight `ready` profiles use supplied-synthetic user provenance with
   missing-input expectation false, nonempty details, and all six targets; the
   other 32 remain examples with missing-input expectation true. Expected names
   match the declared inert relations and mappings; empty details stay unknown.
4. Old and new requests contain identical free-context and environment facts,
   bounded legacy context, and no silent truncation or unequal model settings.
5. Instructions embedded in fixture text remain data, and artifacts contain no
   execution, review, or improvement claims before actual evidence exists.

The runner's tests belong with its implementation so its actual APIs and
validation behavior, rather than a separate fixture-only interpretation, gate
these invariants.
