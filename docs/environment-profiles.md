# Environment profiles and guided prompts

Environment profiles help a prompt ask for the right output using the information
you actually have. They do not connect to a product, collect logs or validate a
detection. The browser needs no account or API key.

## Create your first profile

1. Select a technique and open **Prompt**. Choose the task: Detect, Hunt, Triage
   or Validate.
2. Under **Your environment**, choose **New profile**. Give it a recognizable name
   and select the output target.
3. Describe the operating environment, collected data sources, actual table or
   log-type names, field mappings and known limitations. Leave unknown details
   empty. Placeholders are examples, not evidence that these fields exist.
4. Save the profile, then choose **Use selected profile** to apply it. Check the
   summary and prompt before copying the result.

Use **Edit profile** to save a new revision, **Duplicate profile** for a separate
environment or **Delete profile** to remove a saved choice. Saving, importing or
selecting a profile in the list does not apply it automatically. Applying a
profile is a separate action. Deleting a profile does not remove its snapshot
from an existing draft.

All six output targets remain available: Platform-neutral, Panther Python,
Sentinel KQL, Defender XDR, Splunk SPL and Sigma. A profile's target governs the
prompt when that profile is applied. The catalog's **Filter by platform** only
narrows techniques; it does not describe your operating environment.

## Guided or quick creation

New workspaces start in **Guided** mode with four steps: technique and task,
environment, available information, and summary/prompt. Use **Quick** for the
compact editing workflow. Both views share the same selections and composer;
changing view does not discard your work. Older workspace imports and existing
technique links keep the quick workflow.

The summary shows what you supplied and what is still missing. Supplied facts
are **unverified**, not lab validation. An incomplete or example-only profile
asks for a scoped explanation or missing information before executable code.
Even a filled-in profile cannot prove that the telemetry can observe the selected
technique. Review the result and test any proposed rule separately.

Optional context remains available for the current investigation. It appears
separately from the profile in the prompt. Neither input silently overrides the
other: conflicting information requires clarification. Applying changed context
or explicitly regenerating a draft retains the existing overwrite warning.

## Keep drafts and reuse profiles

A draft retains its original template, context, profile snapshot and hashes.
Technique, task, target and profile revision distinguish drafts. Editing a profile
does not silently rewrite a draft created with an earlier revision. Choosing a
different profile keeps the earlier draft available in the workspace.
Use **Saved draft versions** above the prompt to reopen an earlier task, target
or profile revision, even after deleting its saved profile. The summary describes
the context actually retained with that draft and warns about newer unapplied context.

Use **Import or export a profile** for a `.pad-environment.json` file. Import
checks the version and fields, rejects malformed or oversized input and shows
a literal preview. Confirming creates a separate profile; cancelling leaves
your work unchanged. A profile file is limited to 128 KiB of UTF-8 JSON.

Workspace exports also include saved profiles, the currently applied snapshot,
drafts and the guided/quick preference. The workspace file limit remains 5 MiB.
See the [workspace format and migration guide](workspace-format.md).

### Local command line

Export a profile from the workbench before using these examples:

```sh
node scripts/library_cli.cjs prompt T1059.001 --profile-file ./training.pad-environment.json
node scripts/library_cli.cjs prompt AML.T0051 --profile-file ./training.pad-environment.json --mode triage
node scripts/library_cli.cjs export --profile-file ./training.pad-environment.json --output ./training-prompts.jsonl
```

An additional `--context-file` stays separate from profile facts. Omitting
`--target` uses the profile target; giving a different target is an error, not an
override. Existing commands without a profile keep their behavior. Output files
must not already exist. The CLI uses the same profile validation and composer
as the browser and does not send data to a model.

## Privacy, migration and recovery

Profiles and workspaces remain in memory unless you export them or explicitly
enable local autosave. Files and browser storage are **unencrypted** and can
contain sensitive environment details. Never include credentials, personal data
or private logs in a shared example. Names, fields and context are not added to
share links or sent to a server by the workbench.

Version 2 uses a separate `pad-workspaces-v2` browser database and separate
autosave consent from version 1. Loading an older save is an explicit read-only
discovery and import: preview and confirm a new workspace identity. The original
version 1 record is not upgraded or overwritten. An older application tab cannot
write version 2 records through its version 1 database.

If you return to the dev3 application, use the preserved original version 1 save
or original version 1 export. Dev3 cannot read version 2 files. Keep a separate
version 2 export for new work; there is no lossy automatic downgrade.

Autosave is not a backup guarantee. A conflict or storage failure stops saving
without discarding the in-memory draft; export the workspace or save a new copy.
Disabling autosave does not delete saves. Explicit deletion and browser-origin
data clearing are separate actions. The database name is not a security boundary:
other applications on the same origin can access browser storage. See
[privacy](privacy.md) for the full limitations.
