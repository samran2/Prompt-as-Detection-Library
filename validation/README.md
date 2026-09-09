# Validation evidence

This directory separates planned validation from observed results.

- `review-rubric.json` defines the versioned seven-axis human-review rubric.
- `results/review-summary.json` is a generated, machine-readable release-gate
  summary.
- `fixtures/` is reserved for inert positive, benign-lookalike,
  missing-telemetry and threshold-boundary cases.
- `evals/` is reserved for reproducible model-evaluation manifests and results.

Expected results and observed results must remain distinct. Every observed
result needs the environment, fixture hash, tool or model version, settings,
execution date and evidence hash. Secrets, private telemetry and model API keys
must never be committed.

The current summary truthfully reports zero completed human reviews, zero lab
validations and zero field confirmations. Structural checks and hash parity are
not operational validation.
