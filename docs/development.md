# Development guide

## Local runtime and commands

This `0.3.0.dev3` independent rebuild uses Node.js 22+ for the CLI, generation,
unit tests and static build. No npm installation is required for those commands
or the browser runtime. Python 3.11+ supports preview and repository checks;
the unavailable original Python application is not included.

```sh
npm run library:help
node scripts/library_cli.cjs list
node scripts/library_cli.cjs prompt T1059.001
npm run library:verify
npm run check
npm test
npm run build
```

The root `package.json` and lockfile use SemVer `0.3.0-dev.3`; `VERSION` uses
`0.3.0.dev3`. Keep these and QA metadata, CLI/UI version displays and release
notes aligned. The root package is private and has no runtime dependencies.

`npm run library:build` explicitly regenerates `demo/catalog.js`, all readable
texts under `library/prompts/`, `library/procedures.jsonl` and coverage evidence.
Run it after an intentional shared-composer or generator change, then inspect
the generated differences. `npm run library:verify` recomputes expected bytes
and fails on differences without writing. Never silently fetch a newer dataset.

`npm run build` verifies the generated library first and then creates `dist/`.
It refuses an existing directory. Preserve or move an old build before rerunning.
The builder's exported `build(root)` remains independently testable using small
fixtures; invoke the package script for a verified production candidate.

## Browser preview and QA

Serve only the browser asset directory, not the repository root:

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory demo
```

Open `http://127.0.0.1:8766/`. The page also opens directly from `demo/index.html`;
clipboard permissions depend on the browser. No server API or model service is
required. Context and edits remain in memory; export intentionally writes files.

Optional real-browser QA has a separate, locked dependency boundary:

```sh
npm ci --prefix qa --ignore-scripts
node qa/node_modules/playwright/cli.js install chromium
node scripts/browser_smoke.cjs
```

Keep the loopback server running in another terminal. Linux may require
`install --with-deps chromium` for browser system libraries. The script uses an
isolated browser, synthetic input and a loopback target, and writes reports and
screenshots under ignored `work/browser-demo/`. `CHROME_PATH` and
`PLAYWRIGHT_MODULE` select an already installed trusted browser or QA module.
`DEMO_URL` can point at a loopback preview under a repository URL prefix.

Verify browse, all domains, filters, page boundaries, source details, context,
copy, TXT and JSONL flows at 320/768/1024/1440 pixels. The acceptance criteria are
in [UI quality](ui-quality.md). Record only actual results in
[verification](verification.md); old sample screenshots and reports do not prove
full-library behavior. Automated checks are not WCAG certification.

## CLI and export contract

CLI help defines the exact supported options. Commands list matching records,
compose a selected prompt, or export matching templates. Modes are `hunt`,
`detect`, `triage`, `validate`; targets must exactly match shared-core values.
Context files must be regular UTF-8 files, no more than 16,000 bytes and 4,000
JavaScript string units. The CLI performs no network calls or detection execution.

Export writes a new JSONL file exclusively, rejects existing output and symlinked
path components, and preserves literal source/analyst text. The parent output
directory must already exist. Use canonical paths; on macOS `/tmp` is a symlink,
so use `/private/tmp` when testing temporary output.

Each row includes `prompt_sha256` for its UTF-8 prompt text. Standard output
reports `{records, sha256}` for the whole JSONL byte stream, including line endings.
No checksum sidecar is created. Browser JSONL uses the shared template format;
it exports all filtered records, not only the visible page or remembered edits.
TXT download/copy uses the current editor text exactly.

## Foundation checks

The Python checker verifies repository files and selected credential patterns.
It does not validate ATT&CK coverage, model outputs or detection effectiveness.
From this directory:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --only-binary=:all: -r requirements-dev.txt
python -m pre_commit validate-config
python scripts/check_foundation.py
python -m unittest discover -s tests -v
python -m ruff check .
python -m ruff format --check .
```

On Windows, activate `.venv\Scripts\Activate.ps1`. Top-level Python development
tools are pinned; this is not a complete transitive lock. Once Git is initialized
and files are staged, `python scripts/check_foundation.py --tracked` also rejects
tracked excluded paths and symlinks. `python -m pre_commit install` installs local
hooks. These commands do not publish anything.

## Required verification evidence

| Area | Evidence |
| --- | --- |
| Source identity | Official release/commit, raw bundle hashes and preserved MITRE notice. |
| Complete coverage | Exact source, catalog and prompt-file ID sets across all domains; explicit historical exclusions and source gaps. |
| Prompt composition | All 918 × 4 × 6 combinations, complete source context, linked analytics and inert literal input. |
| Generation | Repeated expected bytes, no stale/missing/extra generated files, all qualifying procedure records preserved. |
| CLI | Help, selectors, context limits, prompt output, exact hashes and refusal to overwrite or traverse symlinks. |
| Browser | Required full-catalog flows, prefix deployment, widths, keyboard behavior and no unexpected requests or console errors. |
| Static build | Exact eight-file inventory; source bundles, complete procedures, QA and private work excluded. |
| Delivery | New archive compared bytewise to the reviewed source and accompanied by its SHA-256. |

Run the relevant checks after changes, report failures and unavailable checks
honestly, and inspect generated content before handoff. Zero discovered tests
is not a passing suite. Current results belong in the verification record.

## Working and publication conventions

Read [AGENTS](../AGENTS.md), [SPEC](../SPEC.md) and
[CONTRIBUTING](../CONTRIBUTING.md). Preserve unrelated work, keep shared behavior
in the core and treat all source/context/model text as untrusted data. Do not
commit credentials, exports, logs, environments, dependencies or build outputs.

Recovery of the original archive is separate future work, not a prerequisite
for completing this authorized independent rebuild. If it arrives, preserve its
checksum and inspect its paths, rights and contracts before merging anything.
The original response evaluator and `python -m huntprompt serve` are not provided.

Follow [publishing](publishing.md) only after preparing reviewable artifacts.
Original project code uses the owner-approved [MIT License](../LICENSE); retain
the separate MITRE notices. External publication remains an owner decision;
passing checks do not authorize a remote, push, deployment or public release.
