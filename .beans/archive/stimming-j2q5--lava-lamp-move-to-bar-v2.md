---
# stimming-j2q5
title: 'Lava lamp: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T17:08:21Z
updated_at: 2026-11-09T17:15:10Z
parent: stimming-80dc
---

Move lava/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc. legacy.html (Classic) stays on v1.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Colour chips (Classic, Violet, Sea) | Top left: choice `Colour`, segments with the split wax-over-liquid dot; keys 1, 2, 3; remembered | Three options; the one choice group |
| Flip chip, F | Bottom left: action `Flip`, key F | Own verb |
| Space shake (keyboard only) | Bottom left: held action `Shake`, key Space | Touch had no shake chip; hold keeps it going |
| Settings tray: Quality | Settings: site Quality row | Site row |
| dl.how (4 entries) | Key strip: drag a blob pull apart, hold the base warm, drag the metal lift, drag beside tip | Four entries |
| header data-shell, Classic link | Shell: logo, name, sound, (i); Classic under Build in Settings | `legacy: true` |
| Arrow keys rock the lamp | Kept, named in the stage label | No room in the key strip |

Visible: choice, Flip, Shake. No slider, no Reset.

## Checklist
- [x] Read brief, spec, Galaxy, Lava lamp
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812, 812 x 375 and 740 x 375 in the pane
- [x] Diegetic proposal with one still
- [x] Commit, push, tick lava in stimming-80dc

## Bugs found in play
- Shake has no control on touch: only Space shakes; drag on the metal is the only touch path.
- The colour choice is not remembered over a reload.
- The full-bleed v2 stage puts the key strip over the lamp base, and a flipped base runs off the top.

## Diegetic proposal (awaits Tom)

A dimmer on the cord: a knurled puck on the desk, wired to the base. Turn it to set the heat; turn it fully down and the wax cools and sets. It takes the heat role from the "hold the base" gesture; Up and Down are the keyboard path. Still: `lava-diegetic-dimmer.jpg` in the batch notes folder.

## Summary of Changes

Lava lamp passes one bar spec to initPage. Colour (Classic, Violet, Sea) is the top-left choice with the split wax-over-liquid dot, keys 1, 2, 3, remembered in `stimming.lava.colour`. Flip (F) and a held Shake (Space) sit bottom left. Settings holds the site Quality row; Classic sits under Build. Key strip: drag a blob pull apart, hold the base warm, drag the metal lift, drag beside tip.
Fixed: touch had no shake control; the colour was not remembered; the lamp now frames itself in the band between the shell controls over its column (a lens shift and a measured fit), so the key strip and the top row clear it and a flipped base stays on screen; the intro fallback dropped its stale Lab line.

## Mobile and compliance
Checked at 1280 x 800, 375 x 812 (mobile preset), 812 x 375 and 740 x 375 (touch). No corner overlaps another or the key strip, no control leaves the stage, no sideways scroll, the Settings sheet fits, touch targets are 34 px or more. Console clean. Reload keeps the colour. On short stages the key strip may cross the base until it fades.
