# Complete active ATT&CK 19.2 prompt library

## Objective and scope

Implement the user's instruction: finish every technique before publication.
Rebuild independently from official MITRE attack-stix-data v19.2, commit
6cda5ad8462c79e14fbb872f4e09059b18e0cfc4. Do not claim the missing application
was recovered. Include Enterprise (697), Mobile (124), ICS (97): 918 active
techniques/subtechniques, including both parents and children. Exclude revoked
or deprecated techniques from active prompts and list them in coverage evidence.
The owner approved publication to the public `samran2/Prompt-as-Detection-Library`
repository and a public demo. The full library is pushed and private vulnerability
reporting is enabled. Hosted CI and Pages outcomes are recorded in
[verification](docs/verification.md#hosted-publication-status).
Automatic model calls and query execution remain out of scope.

## Stack and commands

Zero runtime dependencies. Node.js >=22 for CLI, deterministic generation,
unit tests and static build. Python >=3.11 for existing foundation checks.
Commands to implement and verify: `npm test`, `npm run check`,
`npm run library:build`, `npm run library:verify`, `npm run build`,
`node scripts/library_cli.cjs list`, `node scripts/library_cli.cjs prompt T1059.001`,
`node scripts/library_cli.cjs export --output /absolute/new-file.jsonl`.
The static site uses local scripts only and works below a repository subpath.

## Data contract (provider first)

`demo/catalog.js` retains UMD/CommonJS exports and the existing record fields:
`id`, `name`, `domain` (Enterprise/Mobile/ICS), `tactics` (source tactic names),
`platforms` (source list; empty means unspecified), `behavior` (complete source
description), `telemetry` (source-derived suggested log descriptions),
`falsePositives` (clearly labelled local-baseline guidance), `sourceUrl`.
Add: `kind` (technique/subtechnique), `parentId` (ID/null), `stixId`,
`attackVersion` (19.2), `procedureCount`, `strategies` and `procedureExamples`.
Each strategy: `{id, name, url, analytics:[{id, name, description, platforms,
logSources:[{name,channel,dataComponent}], mutableElements:[]}]}`.
Each example: `{id, actorId, actorName, description, references:[]}`; include
up to three deterministic examples, retain ALL qualifying 18,885 relationships
separately in `library/procedures.jsonl` with `techniqueId`, `domain`, and source
STIX identifiers. Preserve source external references. Do not infer links for
13 active analytics not referenced by active strategies.

`demo/core.js` is the ONE composition implementation used by browser, CLI and
text generator. Preserve detect/hunt/triage/validate and six existing targets.
Full-library records are not samples; legacy synthetic sample fixtures may remain
samples. Include whole technique description and linked analytic descriptions,
source log references and tuning variables, procedure examples and limitations.
Source/analyst strings stay literal; never evaluate them or interpolate again.
All output is an unvalidated draft, not executable/production-approved detection.

## Structure and acceptance criteria

- `sources/attack-19.2/`: immutable raw source JSON, MITRE license, source hashes
  and official tag/commit evidence; not copied into the public site.
- `scripts/build_library.cjs`: strict deterministic source-to-catalog conversion.
  Writes only explicit generated paths; refuses symlinks and unknown source
  shapes. A check mode compares expected bytes without mutating files.
- `library/prompts/{enterprise,mobile,ics}/Txxxx[.xxx].txt`: one readable detect
  prompt per active record, not merely a link or shared generic prompt.
- `library/coverage.json`: exact source/record/text ID sets, domain, parent/sub
  counts, historical exclusions, procedure and analytic linkage counts, hashes.
- `demo/`: preserve premium light UI, add pagination (50 per page), accurate
  coverage counts, all-domain search, source/analytic detail, TXT/JSONL export.
- `scripts/library_cli.cjs`: local list/prompt/export with validated selectors,
  bounded context, no network, exclusive new output writes; no arbitrary code.
- Docs and package version describe dev.2, independently rebuilt provenance,
  separate source rights, owner-approved MIT project-code license, and actual
  repository, CI and deployment status.

## Style and trust boundaries

Use existing CommonJS/UMD and single-quoted strings. Validate at source/CLI
boundaries; use textContent/value for DOM. Example: `const record = records.find(
item => item.id === id); if (!record) throw new Error('Unknown technique');`.
Untrusted STIX and analyst context can contain HTML or instruction-like text:
encode generated JSON safely, retain strict CSP, no eval, innerHTML, fetch or
storage of private context. CLI writes reject overwrite and symlink targets.
Bound source inputs, context and generated-site assets. No new dependencies.

## Testing

Write failing tests for source coverage and full-record prompt behavior first.
Independently compare source ID sets to generated catalog AND all text files;
count alone is insufficient. Verify 918 x4 x6 =22,032 compositions, deterministic
rebuild, no stale/extra prompts, complete 18,885 procedure relationships and all
linked analytics. Keep existing safe-export, literal text, CSP and build tests.
Test browser at 320/768/1024/1440px, repository prefix, first/last-page selections,
all-domain searches, copy, TXT, JSONL and zero console/external network errors.
No claim that these checks validate model quality or detection effectiveness.

## Boundaries and remaining owner decisions

Always preserve reviewed prior demo artifacts unchanged; work in this new repo.
The owner-approved MIT project-code license is recorded in LICENSE_TODO.md.
The named public repository and demo are approved. Ask before future license
changes, external AI integration or publication beyond that approved scope.
Never invent provenance, original tests passing, or operational validation.
