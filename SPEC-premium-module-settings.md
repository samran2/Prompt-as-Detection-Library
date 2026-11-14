# Premium module settings and user guide

Deliver a calmer `0.4.0.dev4` workbench follow-up without changing the pinned source
catalogs, prompt bytes, CLI, workspace contract or export formats. The feature is
presentation-only: users can choose which optional research modules are visible
and can open a concise guide without leaving the workbench.

## User contract

- Prompt, Evidence, technique search/list, Workspaces, Settings, User guide and
  About are always available. Evidence remains the primary provenance and
  limitations path and cannot be hidden.
- Defenses, Flow, Compare and Research tools are optional modules. All four are
  visible by default and **Show all modules** restores that default.
- Hiding an active detail tab selects and displays Prompt while focus remains in
  Settings. Hiding a module
  removes its tab, command and direct controls from navigation, but retains all
  in-memory drafts, comparison selections and Flow steps for later restoration.
- Preferences contain exactly four booleans: `defenses`, `flow`, `compare` and
  `research`. Unknown or malformed data falls back safely.
- The fixed `pad-module-visibility-v1` localStorage value is origin-local,
  unencrypted and contains no analyst text. It is never added to URLs, workspace
  files or any export. Storage failures are non-fatal and are reported honestly.
- Settings and guide dialogs return focus to their opener and remain operable by
  keyboard, touch and at 320–1440 px in every existing color theme and reduced
  motion mode.

## Information design

Settings uses native checkboxes with one plain-language sentence per module, an
immediate visible-module summary and a single **Show all modules** action. The guide explains a
four-step first workflow, module purposes, local privacy, draft limitations,
workspace saving and keyboard shortcuts. The same canonical guidance is published
as `docs/user-guide.md` and linked from the repository README.

## Implementation boundaries

- `demo/preferences.js` owns strict normalization and best-effort local storage.
- `demo/workbench-ui.js` owns presentation, dialog focus, module visibility and
  command availability; `demo/app.js` retains tab selection and composition.
- `demo/index.html` and `demo/workbench.css` own semantic structure and responsive
  presentation. No external runtime dependency, network request, inline script or
  dynamically interpreted content is added.
- `scripts/build_demo.cjs` explicitly allowlists any new public asset.

## Verification

Start with failing contract tests for preference normalization/storage, required
semantic controls, active-tab fallback and hidden command/control behavior. Then
run the focused Node tests, complete Node/Python regression suite, source-fidelity
checks and a clean public build. Exercise reset, persistence, blocked storage,
keyboard focus, mobile layout and all four visibility choices in real Chromium,
Firefox and WebKit sessions. Inspect console/network results and screenshots.

Automated checks do not establish WCAG conformance, prompt quality, detection
effectiveness or completed human review. Public deployment remains a separate,
deliberately approved step.
