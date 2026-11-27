---
# stimming-rc86
title: 'Pendulum wave: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T11:09:43Z
updated_at: 2026-11-09T11:17:24Z
parent: stimming-80dc
---

Move pendulum/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Count chips 12 / 20 / 32 | Top left: choice `Pendulums`, segments (phone: stepper bottom left) | The one choice group; the count persists |
| Release chip (Space; reads Stop while the row swings) | Bottom left: action `Release`, key Space, with the next-pattern glyph | The main verb; one fixed label |
| Same chip in Stop mode (Escape) | Bottom left: action `Stop`, key Esc, disabled while nothing swings | One verb per chip; Escape shows on the chip |
| Iso chip (V) | Bottom left: action `Iso` with the cube, key V, pressed state | Same as the Domino run's Iso chip |
| Warp readout, top left | Canvas tag, top centre | Top left now holds the logo and name |
| dl.how | Key strip: drag a ball, drag across, hold (touch: same words) and Shift | Four entries at most |
| Quality (v1 tray) | Settings: site Quality row | Site row |
| header data-shell | Shell: logo, name, sound, (i) | Shell |

No slider. No Reset: Stop returns the row to rest.

## Checklist
- [x] Read brief, spec, Galaxy, Domino Iso chip, Pendulum wave
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812, 812 x 375 and 740 x 375 in the pane
- [x] Diegetic proposal with one still
- [x] Commit, push, tick pendulum in stimming-80dc

## Diegetic proposal (awaits Tom)

A release lever hangs from the near end of the beam. Pull it down: the row lifts to the next pattern and holds. Let go: the row drops together. The Release chip goes; Space stays as the keyboard path and becomes a held key (hold lifts, release drops), through the shell held action. Stop and Iso stay chips. Still: `pendulum-diegetic-lever.jpg` in the batch notes folder.

## Summary of Changes

Pendulum wave passes one bar spec to initPage. The Pendulums choice (12, 20, 32) sits top left; on phones it is a stepper bottom left. Release (Space, with the next-pattern glyph), Stop (Esc) and Iso (V, with the cube and a pressed state) sit bottom left. Settings holds the site Quality row. Key strip: drag a ball, drag across, hold (Shift on fine pointers).
Fixed: the framing read the v1 bar, so the row ignored the corners; it now reserves the top row, the bottom row and the key strip band, and refits when corners move or stack. The warp tag sat top left under the logo; it now sits top centre, or under the top row when the gap is tight. The one Release chip swapped to Stop under the pointer while the row swung, so a click meant to lift could stop it; Release and Stop are now two chips, and Stop is disabled while nothing swings. Escape no longer stops the row while it closes a sheet. The Iso key V now shows on its chip. The intro fallback dropped its stale number line.

## Mobile and compliance
Checked at 1280 x 800, 375 x 812 (mobile preset, touch), 812 x 375 and 740 x 375 (touch). No corner overlaps another or the key strip. No control leaves the stage. No sideways scroll. The Settings sheet fits. Touch chips are 36 px, segments and stepper arrows 34 px. The row clears every corner and the key strip. Count and view persist across reload. Console clean.
