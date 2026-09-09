# Manual robustness worksheet

The workbench records a local, analyst-authored assessment of **one observable**
using concepts from CTID's Summiting the Pyramid. It does not score prompts,
calculate an aggregate analytic score, certify a detection, or change any prompt's
review, lab-validation or field-confirmation status.

## Method and scope

The official [Summiting levels](https://center-for-threat-informed-defense.github.io/summiting-the-pyramid/levels/)
describe five analytic-robustness levels and separate host and network dimensions.
The analyst explicitly selects both the level and an origin: application (`A`),
user mode (`U`), kernel mode (`K`), network payload (`P`) or network header (`H`).
The interface's short level labels are project-authored summaries, not a complete
reproduction of the methodology. Consult the official definitions before choosing.

Record the telemetry that produces the observable, the actual observable/filter,
why the chosen classification is justified, benign lookalikes and distinguishing
context, and a reference to supporting evidence. Use an anonymized case identifier
instead of credentials, raw private logs or sensitive infrastructure details.

The [official overview](https://center-for-threat-informed-defense.github.io/summiting-the-pyramid/overview/)
explains why evasion resistance and accuracy must be considered together. The
method assumes trusted telemetry; environment and tool changes can alter an
assessment. Higher classifications do not prove operational effectiveness.
This implementation references documentation labeled **4.0.0**, checked on
2026-09-09; the linked documentation can change. It does not import or execute
the upstream analytics repository, copy diagrams, or vendor source content.

This worksheet can be associated with Enterprise, Mobile, ICS or ATLAS records,
but that association is not a claim that CTID assessed the technique or that the
model applies uniformly across those frameworks. The analyst must justify the
chosen host/network observable. If neither dimension fits, do not invent an
origin to obtain a result.

## JavaScript contract

`demo/robustness.js` exposes `PAD_ROBUSTNESS` in the browser and the same API
through CommonJS. It has no runtime dependencies.

```javascript
const { createAssessment } = require('../demo/robustness.js');
const result = createAssessment(
  { id: 'T1059.001', domain: 'Enterprise', name: 'PowerShell' },
  {
    level: 1,
    origin: 'A',
    telemetry: 'Synthetic application audit events',
    observable: 'Synthetic exact executable name comparison',
    rationale: 'An executable name can change; this is not an invariant behavior.',
    benignContext: 'Approved administration can produce the same name.',
    evidenceReference: 'Synthetic example only; not a real lab result',
  }
);
const json = JSON.stringify(result, null, 2);
```

`createAssessment(record, input)` returns a JSON-serializable object:

- `schemaVersion`: `pad-robustness-assessment-1`.
- `status`: always `manual-unverified`; `method`: always `analyst-entered`.
- `technique`: only the supplied record's ID, domain and name.
- `methodology`: name, documentation version and official reference links.
- `assessment`: explicit level, origin, derived host/network model and the five
  analyst text fields. The model is an origin grouping, not an inferred score.
- `caveats`: self-contained warnings that travel with the JSON export.

`LEVELS` and `ORIGINS` are immutable arrays of `{ value, label }` objects; origins
also include `model`. There is no default grade or inferred origin.

All seven input properties are mandatory. `level` is an integer from 1 to 5;
`origin` is one of the five exact codes above. Each text field is trimmed and
limited to 4,000 UTF-16 code units, except `evidenceReference`, limited to 1,000.
Tabs and line breaks are allowed; other C0/C1 control characters are rejected.
Unknown properties, inherited required properties, accessors and wrong types
throw `Error`; inputs are not coerced into strings. Record IDs must match the
ATT&CK/ATLAS technique syntax and domain, with a name of at most 500 code units.
The integrating catalog remains responsible for resolving real, active records.

## Evidence, privacy and security boundary

The worksheet checks completeness and shape, **not whether the evidence exists
or supports the assessment**. An evidence reference is inert text: it is never
opened, fetched or treated as a command. Free text can itself contain inaccurate
claims; it remains explicitly unverified analyst material. No date, named reviewer,
signature, lab run or source endorsement is invented.

The module performs no networking, storage, logging or automatic downloads. It
does not import the rest of a selected record, private prompt context or validation
fields. An explicit export does include the analyst's entered text: inspect and
redact it before sharing. Render output with `textContent`, never `innerHTML`,
and do not turn user-provided references into automatic fetches or links.

The principal threats are unsupported validation claims, private-context leakage,
unbounded input, and executing or rendering analyst text as instructions. Fixed
output status, field projection, size limits, inert strings and literal rendering
address those boundaries. There is no secret-handling or external-service path.

## Verification

Run `node --test tests/robustness.test.cjs` for explicit-level/origin contracts,
evidence requirements, malformed input, identity projection, mutation isolation,
literal hostile strings and browser-global execution without network or storage.
Integration and browser UI checks are part of the workbench's regression suite.
