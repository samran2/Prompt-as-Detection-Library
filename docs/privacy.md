# Privacy

## Local-first default

The implemented workbench is a static application. Search, filtering, composition,
context, and drafts run in the browser. Drafts remain in tab memory and clear on
reload; downloads are initiated by the user. The application has no account,
analytics SDK, model call, telemetry collector, application database, or automatic
upload path.

A hosting provider still receives ordinary network metadata for page requests,
such as IP address, user agent, time, and requested asset. That infrastructure is
outside the application's JavaScript behavior and is governed by the host's policy.
Opening an external source link is an explicit user action and discloses a normal
request to that destination.

## Data handling rules

- Never put credentials, personal data, confidential logs, malware samples, or
  private incident details into the workbench context field.
- Render source, prompt, and analyst text literally. Do not turn it into HTML or
  executable code.
- Do not add analytics, crash reporting, remote fonts, model services, or external
  content delivery without a separate privacy and security review.
- A new collection purpose requires an explicit field inventory, lawful-purpose
  review, retention limit, deletion path, and user-facing notice before collection.
- Published validation fixtures use synthetic or irreversibly sanitized data.

## Future research API

The proposed read-only API exposes public research objects only. It does not accept
prompts, logs, samples, or user content and has no accounts in its first version.
Operational logs should contain a short-lived request ID, route template, status,
latency, response size, coarse abuse signal, and the minimum network metadata
required for security operations. Query text, full IP addresses, user-agent strings,
and response bodies must not be retained by default.

Before deployment, the operator must publish exact hosting jurisdictions, service
providers, log fields, retention periods, deletion process, incident contact, and
whether an edge provider processes network identifiers. Documentation alone does
not satisfy these operational obligations.

## Model evaluation

Evaluation is local by default. Selecting a remote model provider is an explicit
operator action. The harness must show what content will leave the machine, avoid
logging request or response bodies, and store only model/settings metadata and
cryptographic hashes unless the operator deliberately stores a sanitized artifact.
API keys remain environment secrets and are never written to result files.

Remote evaluation of production logs, personal data, or confidential incident
material is outside scope. Adding it requires user consent, a documented processing
basis, provider terms review, retention and deletion design, and an updated threat
model.

## Verification gate

Every release reviews the static public-file allowlist in `scripts/build_demo.cjs`,
checks the built artifact for unexpected files and credential patterns, and records
whether any dependency or external request was added. Browser inspection must
confirm that ordinary use makes no application-originated API or analytics calls.
See [release evidence](release-evidence.md) for the required record.
