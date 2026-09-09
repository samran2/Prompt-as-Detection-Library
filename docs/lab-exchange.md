# Offline lab exchange

The workbench can export a local research plan and import a small, project-specific
result envelope. Plans contain technique identifiers, official source references,
and SHA-256 references to the library's canonical default prompts. Imported outcomes
always remain **unverified user-supplied evidence**. They never change a prompt's
review status or establish that a lab run happened.

## Relationship to Apache Caldera

MITRE announced Caldera's contribution to the Apache Incubator on May 20, 2026;
the project is now Apache Caldera (Incubating). Its official site links to its
operation-result documentation. Native reports and event logs can contain
commands, host and agent metadata, and command output. Those native files are not
accepted by this exchange. The formats here are named `pad-lab-plan-1` and
`pad-lab-results-1`; they are not Caldera adversary profiles, operation requests,
or native report formats. No native import compatibility is claimed.

Sources checked September 9, 2026:

- [MITRE's Apache contribution announcement](https://www.mitre.org/news-insights/news-release/mitre-contributes-caldera-apache-incubator-expand-open-cybersecurity)
- [Apache Caldera](https://caldera.apache.org/)
- [Official operation-result formats](https://caldera.readthedocs.io/en/latest/Operation-Results.html)

An operator may use an existing, separately authorized local lab workflow to
produce the evidence referenced by an envelope. This feature supplies no abilities,
commands, agents, host configuration, server connection, execution, or credentials.
The authorization reference is a user declaration, not verified permission.

## Local workflow

1. Select at most 50 techniques. Supply a short non-sensitive title and an existing
   authorization reference such as an internal ticket identifier.
2. Export the plan and its result template. Keep the plan alongside the exact
   canonical prompt files used in the review.
3. In the separate authorized workflow, retain the actual fixture artifact and
   run record locally. Populate the template with their lowercase SHA-256 digests
   and the outcome supported by that record. Do not copy raw reports or logs into
   the envelope. Missing artifacts must stay missing; do not invent hashes or runs.
4. Import the completed envelope against the original plan. The importer checks
   plan identity, membership, canonical prompt hashes, recognized outcomes, and
   digest formats. Partial submissions explicitly report the number of plan
   records that remain unreported.
5. Review the original private artifacts separately. A matching digest reference
   does not authenticate the author, verify the environment, or prove detection.

The exported template deliberately uses `null` for fixture and run hashes. It is
not accepted unchanged. Even `not-run` needs a real fixture reference and a local
record explaining that disposition before it can be imported. No operation or
timestamp is fabricated by the template.

## Browser and Node contract

Load `demo/core.js` before `demo/lab-exchange.js` in a secure browser context. The
module exposes `PAD_LAB`; Node can require `demo/lab-exchange.js`. It uses native
Web Crypto, adds no runtime dependency, and performs no network requests or
persistent storage. Each operation below returns a Promise and throws an Error
on invalid input. Consumers should display only returned data and static errors,
using literal text rendering; they should not echo rejected JSON.

```js
const plan = await PAD_LAB.createPlan(selectedCatalogRecords, {
  title: 'Offline research review',
  authorizationReference: 'LAB-2026-04',
});
const template = await PAD_LAB.createResultTemplate(plan);
const imported = await PAD_LAB.importResults(completedEnvelopeJson, plan);
```

`createPlan` hashes the UTF-8 bytes of `PAD.composePrompt(record)` with its default
mode, target and empty analyst context. Edited drafts and alternate compositions
are outside this contract. The plan identity is `sha256:` followed by the SHA-256
digest of compact JSON with this canonical field order, excluding `planId`:

```text
schemaVersion, title, authorizationReference, status, evidenceStatus, records
```

Each record has this canonical field order:

```text
techniqueId, framework, domain, sourceUrl, promptSha256
```

Selection order is preserved and affects identity. Title whitespace is trimmed
when the plan is created. A title, authorization, record order, source reference,
or prompt hash change produces a different identity. This is a consistency check,
not a digital signature or proof of authenticity.

The plan's fixed fields are `schemaVersion: "pad-lab-plan-1"`,
`status: "planned"`, and `evidenceStatus: "unverified"`. Frameworks are `ATT&CK`
and `ATLAS`; domains are `Enterprise`, `Mobile`, `ICS`, and `ATLAS`, with matching
technique ID syntax and exact official technique URLs. Extra fields from catalog
records are not copied into the plan.

The only accepted result envelope fields are:

```text
schemaVersion: "pad-lab-results-1"
planId: the original plan's sha256 identity
results: [
  {techniqueId, framework, domain, promptSha256, fixtureSha256, runSha256, status}
]
```

All three row hashes must be 64 lowercase hexadecimal characters. The prompt hash
must match the corresponding plan row. Fixture and run hashes are declared
references: the importer does not receive those private artifacts and cannot
verify that the supplied digests describe their bytes. The accepted statuses are:

| Status | Meaning of the submitted claim |
| --- | --- |
| `observed` | The submitter reports observing the behavior or signal under review. |
| `not-observed` | The submitter reports no such observation; absence is inconclusive without collection evidence. |
| `inconclusive` | The submitted review did not support a conclusion. |
| `not-run` | The local record states that the planned review was not run. |

`importResults` returns `schemaVersion: "pad-lab-import-1"`, `planId`, the
sanitized `results`, `unreportedRecords`, `evidenceStatus: "unverified"`, and
`validationLevel: "generated"`. It does not mutate input plans or catalog records.
The imported object is a review result, not another import envelope.

## Bounds and privacy

Plans and submissions permit 1–50 unique records. JSON input is limited to 1 MiB
of UTF-8 and eight nesting levels. Prompts are bounded to 1 MiB each and 4 MiB in
total. Titles are limited to 120 characters. Authorization references are limited
to 64 letters, digits, periods, underscores, colons or hyphens, starting with a
letter or digit. Labels must contain no control characters; selected credential
signatures are rejected. These signatures are not a general secret detector:
operators must use non-sensitive labels.

Unknown envelope and row fields, duplicate JSON keys, missing hashes, unsupported
statuses, duplicate or foreign technique identities, changed plans, and mismatched
prompt hashes fail closed. Rejected values and field names are not echoed in error
messages. The result format has no free-form prose, payload, agent, host, output,
credential or validation-evidence fields.

The module leaves saving and displaying approved outputs to the caller. Raw import
text should remain local and temporary. No import promotes `generated` to
`reviewed`, `lab-validated`, or `field-confirmed`; those require the project's
separate evidence and review process.

## Verification

Run `node --test tests/lab-exchange.test.cjs`. Tests use synthetic evidence labels
and digests; they perform no lab runs. They cover canonical plan hashing, source
projection, completed and partial imports, invalid fields and hashes, native report
rejection, JSON depth and duplicate keys, asynchronous input mutation, browser UMD
operation, and unchanged catalog validation status.
