---
# stimming-mhzq
title: 'Magnet balls: Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T11:09:27Z
updated_at: 2026-11-09T11:14:16Z
parent: stimming-80dc
---

Move `magnet/index.html` to Bar v2. Brief: docs/plans/bar-v2-migration.md.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Ring chip (R) | Bottom left action `Ring` (R) | A one-shot verb: it forms the shape. The v1 chip only lit until the next touch. |
| Hex chip (H) | Bottom left action `Hex` (H) | Same as Ring. |
| Shuffle with die (S) | Bottom left action `shuffle` (S) | Shared verb; the shell draws the die. |
| Field lines toggle (F) | Settings toggle `Field lines`, persisted in `stimming.magnet.field`; F still toggles | Tom keeps it off; a view option, not a gesture. Same key and format as v1. |
| Quality (`qualitySetting`) | Settings, Site row (`quality: true`) | Shell standard. |
| `dl.how` (4 rows) | Key strip: drag / hold / double-click / F | Four entries. |
| (none) | Settings footer `Reset` | New: brings back the three first clumps. |

Visible controls: 3 actions. Top left has no choice. No main slider.

## Checklist
- [x] Read the toy, spec, guide
- [x] Play at 1280 px
- [x] Map controls
- [x] Diegetic check and still
- [x] Port to Bar v2
- [x] Fix bugs and upgrade
- [x] Check 1280, 375 x 812, 812 x 375, 740 x 375 touch
- [x] Commit and push

## Summary of Changes

- Header, `.bar`, `dl.how`, the shape `choices()` and the die SVG code are gone; one `bar` spec builds the controls.
- Ring, Hex and Shuffle sit bottom left (R, H, S). Field lines is a persisted Settings toggle; F still toggles it. Reset in the Settings footer brings back three fresh clumps.
- The table now stops short of the corner rows, so no ball hides or sticks under a chip. It re-fits when the corners drop or stack.
- Arrow keys nudge only from the table or the bare page, so they no longer block page scroll or a focused control.
- Checked at 1280 x 800, 375 x 812, 812 x 375 and 740 x 375 touch: no overlaps, sheet fits, 36 px chips on touch, clean console.

## Diegetic proposal (not built)

A compass on the table, lower right. Its needle follows the live field at that spot. Tap it to show or hide the field lines; F stays the key. It replaces the Settings toggle. Still: `magnet-diegetic-compass.jpg` in the orchestrator notes folder.
