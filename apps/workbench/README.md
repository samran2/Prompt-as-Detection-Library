# Workbench application boundary

The browser workbench remains a dependency-free static application. During the
`0.4.x` compatibility transition, its executable assets stay in [`demo/`](../../demo/)
so existing bookmarks, GitHub Pages deployment, local preview commands, and
downstream tests continue to work without a breaking path change.

This directory is the stable application boundary for new architecture and
package metadata. Moving the executable assets here requires a separately
reviewed migration that preserves the `demo/` compatibility entry point and the
eight-file publication allowlist.

The workbench never uploads analyst context, runs a model, executes a rule, or
claims that a generated draft is a validated detection.

## Experience contract

The interface uses a quiet, content-first design system rather than copying any
vendor's brand or visual identity. Its supported appearance modes are system,
light, dark, and high contrast. Semantic color tokens keep primary actions,
status text, selection, and focus indicators readable in every mode.

Keyboard focus is visible, filters explicitly control the matching-technique
list, tabs follow the ARIA keyboard pattern, and compact layouts keep primary
touch targets at least 44 by 44 CSS pixels. The layout is regression-tested at
320, 768, 1024, and 1440 pixels and at 200% text size. Search, filters,
selection, comparison, output settings, and appearance remain shareable URL
state; analyst context and prompt edits never enter the URL.

The optional real-browser suite inspects browser console and network activity,
the accessibility tree, theme contrast, focus behavior, empty states, downloads,
and responsive overflow. These checks are strong regressions, not a substitute
for independent WCAG certification or manual VoiceOver and NVDA testing.
