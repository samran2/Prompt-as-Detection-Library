# Privacy

## Local-first default

The implemented workbench is a static application. Search, filtering, composition,
context, and drafts run in the browser. By default, drafts remain in tab memory
and clear on reload; downloads are initiated by the user. The application has no
account, analytics SDK, model call, telemetry collector, server-side analyst
database or automatic upload path. Optional local storage is described below.

A hosting provider still receives ordinary network metadata for page requests,
such as IP address, user agent, time, and requested asset. That infrastructure is
outside the application's JavaScript behavior and is governed by the host's policy.
Opening an external source link is an explicit user action and discloses a normal
request to that destination.

## Optional local workspaces

Workspaces can contain original templates and hashes, edited prompts, per-draft
context, applied/unapplied context, favorites, collections, hypothetical flow and
view state. A workspace JSON export deliberately includes this private material.
Files are limited to 5 MiB, validated locally, previewed and opened with a new ID;
imports do not silently overwrite a workspace or replace old templates with new
sources. See the [format and integrity boundary](workspace-format.md).

Local autosave is **off by default**. Enabling it requires confirmation that
IndexedDB saves are **unencrypted** in this browser profile. A localStorage flag
remembers that consent and can resume the opted-in mode on later visits. Only
the consent preference, not workspace contents, belongs in that flag; the
existing theme preference can also use localStorage. The application does not
send workspace text to a server or model.

Anyone with access to this browser profile, compromised same-origin JavaScript,
or another application on the same origin may access stored content. In
particular, GitHub Pages projects under `https://samran2.github.io/` share an
origin: `/Prompt-as-Detection-Library/` is **not a storage isolation boundary**.
A project-specific IndexedDB name is not encryption or an access-control wall.
Use synthetic data, especially on shared devices; storage can also be removed
by browser settings, eviction or private-browsing lifecycle.

Turning autosave off stops new saves and removes its consent preference, but
does not erase existing saved workspaces. **Delete local workspaces** is a
separate, confirmed action: it clears saved workspace records and invalidates
old storage handles while retaining current in-memory work for export. It does
not delete files already downloaded, copies in backups or the theme preference.
Keep exported copies only as long as needed and delete them separately.

Concurrent stale writes or storage-clear conflicts stop autosave; newer saved
data is not silently overwritten. Current edits remain in memory for export or
copying to a new workspace. Quota, blocked or unavailable storage errors likewise
must not be presented as successful saves. Local autosave is convenience, not a
backup guarantee or secure vault.

## Data handling rules

The main workbench's Flow is part of its optional workspace snapshot. The
separate Research tools session, including its flow, manual assessment fields
and lab references, stays in memory only and has separate exports; manual
assessments and lab envelopes are not included in workspaces. A chosen
lab-envelope file is parsed locally, never
uploaded. The UI accepts at most 256 KiB and retains only allowlisted identifiers,
hash references and outcomes; native operation reports and unknown fields are
rejected. Changing the plan invalidates imported results. Reloading clears the
session but does not delete user-downloaded files. Inspect exports before sharing.

The version-comparison CLI reads an explicitly selected local STIX bundle and
prints a report to stdout. It does not fetch URLs, persist a candidate, update
sources or connect to Caldera. Terminal redirection is an operator-controlled
storage decision; treat candidate sources and reports as untrusted data.

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
