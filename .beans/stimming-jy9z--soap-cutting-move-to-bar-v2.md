---
# stimming-jy9z
title: 'Soap cutting: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T11:10:15Z
updated_at: 2026-11-09T11:17:28Z
parent: stimming-80dc
---

Move soap/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Play notes (v1, 1280 and 375)

- The Settings tray opens on hover and holds one Swirl toggle. Swirl is the sixth soap, split off only to keep five chips.
- On a phone the bar takes three rows and the board sits low, with a tall empty band above it.
- The first slice falls toward the camera and lands on the front edge, where the bottom corners sit in v2.
- The camera fit keeps 5 to 8 % margins only; v2 corners lie over the stage, so the fit must clear them.
- Enter (pop the grid) does nothing until a cross-scored grid exists; that is by design.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Mint, Amber, Charcoal, Layers, Coral chips + Swirl toggle in Settings | Top left: choice `Soap`, six options with a pattern dot, keys 1 to 6. Six options take the stepper (phones: stepper bottom left) | One choice group; Swirl rejoins its siblings, so Settings loses the odd toggle |
| New bar | Bottom left: action `New bar`, key N | Own verb; a fresh bar of the picked soap |
| Blow | Bottom left: action `Blow`, key B | Own verb |
| Quality row (qualitySetting) | Settings: site Quality row | Shell owns it |
| dl.how | Key strip. Fine: drag score and saw, shift + drag slice through, ctrl + click pop the grid, space next cut. Touch: drag, drag from the mat, tap a cube, hold a cube | Four entries each |
| header data-shell | Shell: logo, name, sound, (i) | Shell |

No slider: the toy has no continuous value. No Reset: New bar is the reset.

## Checklist
- [x] Read brief, spec, Galaxy, Soap cutting
- [x] Play v1 at 1280 and 375
- [x] Diegetic verdict and one still
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812, 812 x 375 and 740 x 375 touch in the pane
- [x] Commit, push, tick soap in stimming-80dc

## Diegetic check

Proposal, not built: a wooden crate of six small bars stands on the right of the mat, where each new bar slides in from. The gap in the crate is the soap on the board. Tap a bar in the crate: the board sweeps and that bar slides in. Tap the gap for a fresh bar of the same soap. It replaces both the Soap stepper and New bar; Blow stays. Keys 1 to 6 and N stay its keyboard path. Still: soap-diegetic-crate.jpg in the shared notes folder.

## Summary of Changes

- Header, bar, Settings tray and dl.how go; one `bar` spec to `initPage` builds every control.
- Top left: choice `Soap`, six soaps with their pattern dot, keys 1 to 6. Six options take the stepper; Swirl rejoins its siblings, so the Settings toggle and its lit-button state go.
- Bottom left: `New bar` (N) and `Blow` (B). Settings: site Quality.
- Key strip: drag, shift + drag, ctrl + click, space (fine); drag, drag from the mat, tap a cube, hold a cube (touch).
- Fix: after a pointer click on New bar, Blow or the choice, focus returns to the stage, so Space cuts and never re-presses the button.
- Fix: the camera fit keeps the bar and its landing room clear of the corner rows (56 px top and bottom), so the board centres on a phone and fallen slices never land under the bottom corners.
- Fix: a soap picked during the load now arrives once the first bar settles; before, the pick was dropped.
- Checked in the pane at 1280 x 800, 375 x 812 touch, 812 x 375 and 740 x 375 touch: no overlaps, no sideways scroll, every touch target 34 px or more, Escape closes Settings, clean console, no frames when idle.
