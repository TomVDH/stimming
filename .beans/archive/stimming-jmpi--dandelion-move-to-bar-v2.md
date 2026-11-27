---
# stimming-jmpi
title: 'Dandelion: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T17:33:32Z
updated_at: 2026-11-09T17:41:53Z
parent: stimming-80dc
---

Move dandelion/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Space gust (keyboard only) | Bottom left: held action `Blow`, key Space | Touch had no gust control; a held chip blows as long as it is held |
| Regrow chip, R | Bottom left: action `Regrow`, key R, disabled while the head is full | Own verb; it returns the head to the start |
| Settings tray: Quality | Settings: site Quality row | Site row |
| dl.how (Drag, Hold, Space, R) | Key strip: drag blow, hold strong gust, arrows aim | Space and R show on their chips |
| header data-shell | Shell: logo, name, LAB tag, sound, (i) | Standard |
| Arrow keys blow that way | Kept; arrows also aim the Blow chip | Named in the key strip and the stage label |

Visible: Blow, Regrow. No choice, no slider, no Reset (Regrow is the reset).

## Checklist
- [x] Read brief, spec, Galaxy, Dandelion
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812, 812 x 375 and 740 x 375 in the pane
- [x] Diegetic proposal with one still
- [x] Commit, push, tick dandelion in stimming-80dc

## Bugs found in play
- Touch has no gust control: only Space blows a steady gust.
- The low sun sits behind the top-left corner, where the v2 logo and name go. The shell halo keeps both legible; no change to the sun.
- Regrow looked live while the head regrew, where it does nothing.

## Diegetic proposal (awaits Tom)

A bud in the grass: a second, short stem in the meadow right of the head, with a closed green bud. Tap it to regrow the head; the bud opens as the head closes. It replaces the Regrow chip; R stays the keyboard path. Still: `dandelion-diegetic-bud.jpg` in the batch notes folder.

## Summary of Changes

Dandelion passes one bar spec to initPage. Blow (held, Space) and Regrow (R) sit bottom left; both wait for the scene. Settings holds the site Quality row. Key strip: drag blow, hold strong gust, arrows blow that way (fine pointers only). Arrow keys still aim the gust and the Blow chip.
Fixed: touch had no steady gust; Regrow is now disabled while the head regrows.

## Mobile and compliance
Checked at 1280 x 800, 375 x 812 (mobile preset), 812 x 375 and 740 x 375 (touch). No corner overlaps another or the key strip, no control leaves the stage, no sideways scroll, the Settings sheet fits and Escape returns focus, touch targets are 34 px or more. The logo and name read on the sun with the shell halo. Console clean. The pane was hidden, so frame-rate and the Regrow state change were not seen live.
