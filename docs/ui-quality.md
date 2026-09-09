# Premium local UI acceptance criteria

## Scope and status

The user wants an interface with the care, clarity, and polish associated with leading Apple, Adobe and Google products. These are quality benchmarks, not branding, endorsement or permission to copy protected product appearance. This document translates that direction into reviewable criteria for the independent full-library workbench at `0.4.0.dev0`. Actual verification belongs in docs/verification.md; these criteria alone are not a claim that every check has passed. The original browser application remains unavailable.

The interface is a local research and prompt-composition tool. It should help a detection engineer find the right ATT&CK technique, understand the evidence, and obtain usable text with little friction. It must not upload catalog content, pasted context, model responses, or exports to a cloud service.

## Primary journey

1. **Browse:** Search by technique ID, name, or described behavior. Refine by ATT&CK domain, tactic, and platform. Show the result count, active filters, and an obvious way to clear them.
2. **Inspect:** Read the selected technique's ID, name, domain, tactic/platform context, source description, and provenance. Select a documented procedure when available; otherwise show a clear no-procedure state.
3. **Compose:** Choose `hunt`, `detect`, `triage`, or `validate`, then a supported target and local context. Keep the chosen technique visible while composing.
4. **Use:** Read the complete plain-text prompt, copy it, or download a UTF-8 text file. Export fresh templates for all filtered records as JSONL, with editor changes clearly excluded.

Each technique and subtechnique must have a text detection prompt accessible through this journey. Mode or target choices must not hide the base library or imply that an external model is required to read it. Show the pinned ATT&CK 19.2 version in a stable, discoverable location.

Platform-neutral, Panther Python, Sentinel KQL, Defender XDR, Splunk SPL, and Sigma are the shared-core targets. Describe them as output instructions. Do not use a “validated,” “certified,” or “production-ready” badge for a generated detection unless separate evidence supports that specific claim. Pages contain at most 50 results; preserve selection and exports across page changes, and distinguish total filtered results from visible page size.

## Visual direction

Use a quiet, content-led layout with generous but purposeful spacing, clear type hierarchy, restrained color, and consistent component geometry. A system font stack can achieve a polished local experience without downloading web fonts. Icons should clarify familiar actions and always have accessible names; text labels remain the default for less familiar operations.

Make technique identity and the primary next action easy to locate. Long descriptions and prompts should remain readable, selectable, and scannable. Use line length, spacing, and section labels to organize technical content. Reserve monospaced text for identifiers and content where it improves comprehension.

Prefer stable surfaces and subtle transitions. Avoid decorative effects that obscure text, consume the space needed for a prompt, or delay navigation. Any animation must respect reduced-motion preferences. A dark theme is optional; if supplied, it must meet the same contrast and interaction criteria as the light theme.

## Responsive behavior

Verify at the following CSS viewport widths. Component arrangement may adapt to the viewport, but the outcomes are required.

| Width | Required outcome |
| --- | --- |
| 320 px | Single-column flow; all search, filter, detail, compose, and export functions remain usable; controls and text fit without page-wide horizontal scrolling. Long technical content wraps or scrolls within its own labeled region. |
| 768 px | Clear list-to-detail navigation; filters remain discoverable without crowding the selected technique or prompt. No hover-only access to an action. |
| 1024 px | Efficient browsing and inspection; a split layout may keep the result list available while the selected detail changes. Primary actions remain near their relevant content. |
| 1440 px | Use space for useful context and comfortable reading rather than stretching paragraphs across the full width. Prompt composition and results remain visually connected. |

Also test browser zoom at 200%, portrait and landscape where practical, and unusually long technique names, source descriptions, and prompts. The mobile flow must preserve the user's selection and edits when moving between results, detail, and composition.

## Keyboard and accessibility

- Every interactive function works using the keyboard alone, with a logical tab order and a clearly visible focus indicator that is not obscured by sticky content.
- Use semantic buttons, links, labels, headings, and form controls. Associate help and error text with the relevant field, and identify required inputs in text.
- Selecting a result must not unexpectedly move focus. When a view or dialog requires a focus change, move it intentionally and restore it to the trigger when the interaction closes. Escape closes dismissible dialogs; dialogs must not trap users after dismissal.
- Provide a way to skip repeated navigation. Preserve useful heading structure and accessible names for the result list, filters, technique details, and prompt output.
- Target WCAG 2.2 AA contrast: at least 4.5:1 for normal text, 3:1 for qualifying large text, and 3:1 for applicable interface boundaries and states. Apply the definitions and exceptions in W3C's [text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Do not convey status through color alone.
- Use comfortably sized controls, aiming for 44 × 44 CSS-pixel targets where practical. Keep adjacent actions separated enough to avoid accidental activation.
- Announce result counts and copy/export outcomes without interrupting every keystroke. Do not place the full prompt into an assertive live region.
- Respect `prefers-reduced-motion`; task completion must not depend on animation, hover, dragging, or a visual-only cue.

Automated checks are useful evidence but do not prove the interface is accessible. Include a manual keyboard pass and a representative screen-reader review before describing accessibility as verified.

## Complete interaction states

| State | Expected experience |
| --- | --- |
| Initial view | A concise explanation of the library and an immediately usable search/browse entry point; no misleading zero-coverage claim while data is still loading. |
| Loading | A meaningful progress indication that preserves layout and does not repeatedly steal focus. Avoid artificial delays introduced for visual effect. |
| No matching results | Show the active criteria and a clear reset or refinement action. Preserve the entered query. |
| No documented procedure | State that the selected technique has no available documented procedure and allow technique-level composition to continue. |
| Empty local context | Explain any required context without inventing facts; preserve the ability to inspect or export the base prompt. |
| Invalid input | Explain the problem next to the input, retain the user's content, and show how to correct it. |
| Data or server error | Explain which operation failed, keep recoverable work available, and offer a suitable retry. Do not reveal stack traces or local secrets in product error messages. |
| Copy failure | Keep the text selectable and provide a download or manual-copy path when clipboard permission is unavailable. |
| Export success or failure | Identify the completed export or explain the failure accurately. Never report success before generation or writing has completed. Preserve overwrite safeguards. |

## Plain-text prompt quality

The prompt view must expose the actual text that will be copied or downloaded as TXT. Preserve line breaks, technique identity, and literal source strings. A styled preview must not silently alter the output. Make UTF-8 `.txt` export available for an individual detection prompt and clearly label JSONL as fresh filtered templates rather than editor drafts.

Clearly separate technique facts and procedure evidence from the user's environment details and the instructions sent to a model. Display the selected mode, target, and provenance near the output. When available local context is insufficient for a concrete detection, the prompt should ask for the missing evidence or identify assumptions rather than claim a rule is validated.

## Verification record

Before accepting the UI, record browser and operating-system versions, the viewport widths checked, representative screenshots, automated accessibility results, keyboard and screen-reader observations, and any unresolved limitations. Run the browse-to-export journey for Enterprise, Mobile, and ICS examples and compare equivalent CLI/UI prompt selections.

Use observed timing to investigate sluggish filtering, typing, selection, or export with all 918 records and their full source descriptions. Do not claim a performance budget has been met without a stated device, dataset, operation, and measurement. Premium quality requires responsive interactions as well as visual consistency.

The implementation is ready for review when the journey works end to end, every required state is addressed, the listed widths and input methods pass, and the output is faithful to the preserved library. Screenshots alone do not satisfy these criteria.
