# Prompt review registry

`index.json` is the versioned, machine-readable review index for every active
ATT&CK 19.2 prompt. Generate it with:

```console
node scripts/build_review_registry.cjs
```

Verify committed bytes without rewriting them with:

```console
node scripts/build_review_registry.cjs --check
```

## Stable release-gate fields

Release tooling may treat the following fields as the stable schema-version 1
summary contract:

- `schemaVersion` and `attackVersion`
- `totals.prompts`
- `totals.requiredHumanReviews`
- `totals.completedHumanReviews`
- `totals.statuses.generated`
- `totals.statuses.reviewed`
- `totals.statuses.lab-validated`
- `totals.statuses.field-confirmed`

Each `records[]` item is keyed by `<Domain>:<ATT&CK ID>`. It contains the exact
prompt path, byte count and SHA-256, the pinned source-bundle path and SHA-256,
source-listed telemetry, and empty evidence slots. `sourceListed` telemetry is
reference data. It is deliberately separate from `required` telemetry and
`fieldMappings`, which remain empty until an actual environment is reviewed.

The generated baseline never records a reviewer, review date, model result,
lab run or field confirmation. Human evidence needs its own reviewed input
schema and contribution before the generator may advance a lifecycle status.
Do not edit `index.json` by hand or change summary counts to bypass a release
gate.
