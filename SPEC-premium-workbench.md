# Premium Workbench

Implement the owner-approved unified technique desk, portable workspaces and focused interaction design. Preserve all pinned prompt/source bytes, original CLI and exports. The local runtime has no dependencies, account, network API, model calls or execution.

## Acceptance

- Prompt, Evidence (source/map/CAR), Defenses and Flow share the selected technique. Comparison opens separately. Research page reuses CAR/Flow components. ATLAS mappings are never invented.
- Named workspaces contain favorites, named collections, per-technique/mode/target drafts and original templates/hashes, applied/unapplied context, flow, comparison and view state. Version1 JSON is capped at5MiB, strictly validated, previewed and opened as a new workspace. Unknown source/technique references preserve text and surface unresolved warnings.
- Persistent storage is off by default; explicit consent enables unencrypted IndexedDB storage. Atomic expected-revision checks prevent stale overwrites; clearing storage invalidates existing handles. Errors retain memory state and offer file export.
- Compact chrome, grouped exports, adjustable keyboard-accessible separator, mobile list/detail navigation, command search and existing themes preserve focus and drafts. Shared URLs contain no workspace content.
- Existing regression baseline308Node/16Python/52browser checks remains covered; new flows and failure paths are tested on Chromium/Firefox/WebKit and320–1440px. No human/lab/WCAG certification claims.

## Threat boundaries

Files and IndexedDB values are untrusted. Validate before mutation, reject extra fields and excessive size/depth, render text literally, and never import executable code or validation status. Local plaintext may expose analyst context on shared devices; consent and explicit deletion are required. Download is an intentional export, not an upload. No automatic source rebasing or silent cross-tab overwrite.

## Implementation boundaries

workspace.js owns the portable contract; workspace-store.js owns atomic persistence; research-components.js owns shared source/flow presentation. Main app owns selection and prompt composition; a workspace controller bridges snapshots without duplicating composer logic. Existing research/lab exports remain separate. Version0.4.0.dev1 is the next development snapshot, not stablev1.0.
