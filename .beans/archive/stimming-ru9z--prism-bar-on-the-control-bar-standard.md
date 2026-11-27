---
# stimming-ru9z
title: 'Prism: bar on the control bar standard'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:33:51Z
updated_at: 2026-11-03T20:37:41Z
parent: stimming-848s
---

Bring the Prism bar to the control bar standard in AGENTS.md (a8a95fd).

- [x] Light becomes one choice group: dot plus name chips
- [x] Solid/Wire moves into Settings as a labelled group
- [x] Reset moves into Settings; Clear stays in the bar
- [x] Settings (sliders icon) sits at the right edge, before the (i)
- [x] QA at 1280 and 375 px with a clean console
- [x] Commit through a private index and push

## Summary of Changes

- Bar, left to right: Light (White, Red, Green, Violet; dot plus name), + Piece, Clear, then Settings and (i) at the right edge.
- Settings tray: Style (Solid, Wireframe) and Reset.
- The light and style groups use the shared choices() helper; both trays share one popover().
- On phones the light chips tighten so the four keep to one row.
