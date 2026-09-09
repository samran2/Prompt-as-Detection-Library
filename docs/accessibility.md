# Accessibility Standard

## Target and present status

The product target is WCAG 2.2 AA across the static workbench, including keyboard,
screen-reader, reflow, contrast, zoom, reduced-motion, focus, error, and status
behavior. The current UI includes semantic labels, visible focus treatment,
keyboard-operable controls, live status regions, and reduced-motion handling, but
it has not yet received an independent WCAG conformance audit. No conformance claim
should be published from automated tests alone.

## Product requirements

- Every task is complete with a keyboard and has a visible, unobscured focus state.
- Focus order follows reading order; opening or closing a dialog moves focus
  predictably and does not trap users outside the active surface.
- Controls have programmatic names, instructions, and state. Color and icons are
  never the only way to communicate meaning.
- Text and interactive components meet WCAG AA contrast in light, dark, and high
  contrast modes.
- The layout reflows without two-dimensional scrolling at 320 CSS pixels except
  where a genuinely two-dimensional visualization has an accessible alternative.
- Text supports 200% zoom and user spacing overrides without loss of content.
- Motion respects `prefers-reduced-motion`; no essential workflow depends on
  animation, hover, fine pointer control, or timing.
- Search counts, copy/download results, validation state, and errors are announced
  without unexpectedly moving focus.
- The technique-to-telemetry relationship graph has an equivalent structured list
  or table and never becomes the sole navigation mechanism.
- Language is declared, headings are hierarchical, and plain English remains the
  canonical publication language while strings are prepared for translation.

## Test matrix

| Dimension | Required coverage |
| --- | --- |
| Browsers | Current Chromium, Firefox, and WebKit engines. |
| Viewports | 320, 375, 768, 1024, and 1440 CSS pixels. |
| Keyboard | Tab, Shift+Tab, Enter, Space, Escape, arrows where widget semantics require them. |
| Screen readers | VoiceOver with Safari on macOS/iOS and NVDA with Firefox or Chromium on Windows. |
| Preferences | Dark mode, forced/high contrast, reduced motion, 200% zoom, increased text spacing. |
| Automation | Semantic, contrast, focus, reflow, and regression checks where reliable. |

Automated checks can detect only a subset of barriers. Each release candidate needs
manual completion of the primary search, filter, select, compose, source-review,
copy, download, and export journeys with keyboard and both named screen readers.

## Evidence

An accessibility evidence record includes commit and build hashes, browser and OS
versions, viewport, assistive technology and version, test operator, journey,
expected outcome, observed outcome, screenshots or redacted notes, issue links, and
final disposition. A pass is tied to that exact artifact; subsequent UI changes
require proportionate retesting.

An independent audit is mandatory before stable v1.0. Open critical or serious
barriers block release. Lesser findings need an owner, published limitation, and
time-bounded remediation decision approved through governance.

## Performance as inclusive design

The acceptance targets are p75 LCP at most 2.5 seconds, INP at most 200 ms, and CLS
at most 0.1 on representative mobile and desktop traffic. These are future measured
targets, not current results. Evidence must state the collection window, device and
network population, route, sample size, and tool version. Synthetic Lighthouse
scores can diagnose regressions but do not substitute for field percentiles.

See [UI quality](ui-quality.md) for current checks and [release evidence](release-evidence.md)
for publication gates.
