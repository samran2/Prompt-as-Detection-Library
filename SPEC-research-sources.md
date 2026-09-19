# External research source cards

Approved scope: source cards and research links first, not locally imported
catalogs. Add LOLBAS, GTFOBins and LOLDrivers to Evidence and Research tools using
one shared, dependency-free browser module. Duplicate website/repository requests
refer to the same project, not separate evidence sources.

## Contract and boundaries

- `PAD_RESEARCH_SOURCES.cardsFor(techniqueId)` returns three fresh card objects.
  Only an exact `Tdddd` or `Tdddd.ddd` ID can populate repository code-search links.
  These are searches, not verified mappings, and may return nothing or require login.
- `render({ document, root, techniqueId, headingLevel })` replaces only its own
  container with literal DOM; heading level is 3 (research) or 4 (Evidence).
- General official project, repository and license links stay available for
  ATLAS. No ATLAS association, inherited mapping or platform coverage is inferred.
- No source catalogs, commands, rules, drivers or samples are copied, downloaded
  automatically or executed. No runtime requests, storage or dependencies added.
- Links open only on selection with no opener or referrer. Only the public
  technique ID enters searches, never workspace names, profiles, prompts or logs.
- Pinned catalogs, generated prompts, CLI, exports and workspace formats stay
  unchanged. The new browser asset is explicitly added to the public allowlist.

## Acceptance

Test exact links, ID rejection, fresh data, literal rendering, safe link attributes,
ATLAS/general-only behavior, technique switching and draft preservation. Run Node,
Python, source/build checks and the existing three-engine browser regressions.
Inspect responsive source-card screenshots. Document upstream license links and
limits without implying affiliation or validated detections.

The parallel publication task is a draft PR of frozen commit `04e4472`, not these
new changes. The incomplete dev4 formal security gate still blocks main/Pages.
