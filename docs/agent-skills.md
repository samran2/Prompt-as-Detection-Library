# Engineering skills for this project

The repository includes all 25 engineering skills from
[Addy Osmani's agent-skills](https://github.com/addyosmani/agent-skills/tree/6ca0cd7db39b41b1c37e26d335c507ee92382c6d),
pinned at `6ca0cd7db39b41b1c37e26d335c507ee92382c6d`. They guide planning,
implementation, testing, review, accessibility and release work. These are
development instructions, separate from the 918 ATT&CK detection prompts.

## Use with Codex

Open this repository's root as the Codex working directory. The versioned
`.agents/skills/<name>/SKILL.md` layout provides project-local skills; a clone
or source archive includes them without a separate global install. Use them on
the next turn; if the skill list has not refreshed, reopen the project/session.
If this repository is nested inside a delivery workspace, open the repository
itself so discovery starts at the right directory.

For example, ask Codex: "Use code-review-and-quality to review this change."
The root [AGENTS.md](../AGENTS.md) also routes work to the local files, so agents
can read them even when a skill picker is unavailable. Choose the project copy
explicitly if a global skill has the same name.

| Work | Project skills |
| --- | --- |
| Discover and plan | `using-agent-skills`, `spec-driven-development`, `planning-and-task-breakdown` |
| Implement and verify | `incremental-implementation`, `test-driven-development`, `debugging-and-error-recovery` |
| Improve the workbench | `frontend-ui-engineering`, `browser-testing-with-devtools`, `performance-optimization` |
| Design contracts | `api-and-interface-design`, `source-driven-development` |
| Review and deliver | `code-review-and-quality`, `security-and-hardening`, `ci-cd-and-automation`, `shipping-and-launch` |

The full inventory is in the [source lock](../.agents/agent-skills.lock.json).
Shared `../../references/` paths resolve to `.agents/references/`, which is
included along with skill-local references and the optional idea helper.
Upstream examples that start with `skills/` refer to its own root layout. In
this repository, the idea helper would be invoked explicitly from the repo root
as `bash .agents/skills/idea-refine/scripts/idea-refine.sh`. It is not run by
installation, tests or the workbench. Other example commands must be adapted to
the available project tools described in [development](development.md).

## Project policy

User instructions and existing authorizations take priority over general workflow
advice. Apply the root AGENTS.md rules for this project: pinned ATT&CK content,
literal untrusted text, evidence-based review levels, zero workbench runtime
dependencies and the existing publication gates. Do not interpret an example
deployment, external model command or telemetry snippet as permission to run it.
Use only relevant skills and read their required references before applying them.

The browser-testing skill's Chrome DevTools commands require a preconfigured
Chrome DevTools MCP. When it is unavailable, use the locked Playwright flow in
the development guide and report which browser tools were actually used.
Claude Code persona examples in the doubt-driven and orchestration guides map
only to the collaboration tools available in the current Codex session.
No additional browser service or model provider is installed by this package.

The import installs no session hooks, plugin marketplace, slash commands or
global settings. The explicit Pages allowlist and the deny-by-default OCI
context exclude `.agents/`. Source checkouts and source archives include the
skill package and its license. No additional runtime or npm dependency is added.

## Provenance, verification and updates

The [lock file](../.agents/agent-skills.lock.json) records the upstream repository,
full commit, MIT SPDX identifier, Git file modes, source-to-local path mapping and SHA-256 of all
38 imported files. Preserve [Addy Osmani's MIT notice](../.agents/AGENT_SKILLS_LICENSE)
when redistributing them. No imported file has a local content patch.

```sh
npm run skills:verify
```

This offline integrity check also runs in `npm test`, and therefore in existing
CI. It checks the file inventory, hashes, executable bits (on POSIX), skill frontmatter and shared-reference
resolution. Hashes detect drift relative to the reviewed lock; they are not an
upstream signature or proof that the upstream instructions are trustworthy.

Ruff formatting excludes the imported skill and reference directories so that
Python examples in upstream Markdown retain their locked bytes. Project-owned
Python and documentation remain in scope; the integrity and credential checks
still cover the imported package.

Updates are deliberate pull requests, never a build-time fetch of `main`:

1. Select a new full upstream commit. Inspect its skill, supporting script,
   reference and license diff against the locked commit.
2. Install the complete skill set into a fresh staging directory using Codex's
   skill-installer with `--repo addyosmani/agent-skills --ref <full-commit>` and
   an explicit `--dest`. Copy the shared references and original license too.
3. Compare every staged file to that commit's Git tree, update the locked
   source mappings and hashes, and review any added or removed skills. Preserve
   project-specific policy in AGENTS.md rather than silently editing upstream.
4. Replace only this imported snapshot through a reviewed diff. Run the skill
   check, foundation checks, full tests and normal publication checks. Adjust
   the declared skill count and this guide if upstream changes it.

To remove the integration, remove this snapshot, its test/command and the
associated guidance in a reviewed change. The application does not depend on it.
