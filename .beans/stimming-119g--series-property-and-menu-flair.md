---
# stimming-119g
title: Series property and menu flair
status: completed
type: task
priority: normal
created_at: 2026-11-09T09:56:31Z
updated_at: 2026-11-09T09:58:00Z
---

Tom wants a series property on toys. A series carries an icon or flair on the menu tile.

- [x] series.json defines each series
- [x] toys.json carries a series key per toy
- [x] Menu tiles show the series badge
- [x] AGENTS.md documents the field
- [x] Check in the browser pane

## Summary of Changes

- `series.json` defines science (rosette) and belgian (tricolour).
- `toys.json` tags 5 science toys and 6 Belgian toys, Canal at dusk included.
- The menu pins the badge top right of the tile; it tilts on hover.
- The Pages build copies `series.json`.
