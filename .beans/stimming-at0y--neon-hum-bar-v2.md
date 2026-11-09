---
# stimming-at0y
title: 'Neon Hum: Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T10:51:42Z
updated_at: 2026-11-09T10:58:16Z
parent: stimming-80dc
---

Move Neon Hum (`neon/index.html`) to Bar v2. Brief: `docs/plans/bar-v2-migration.md`. `legacy.html` stays on v1.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Gas rail (13 swatches) | Top left choice, stepper with colour dots | The gas is the main pick; 13 options take the stepper |
| Clear (C) | Bottom left action, key C | Shared verb |
| Backspace undo (keys only) | Bottom left action Undo, key Backspace | Touch had no undo |
| Lights (Off, Chase, Rave, Storm) | Settings choice row | A show mode, set once |
| Wall stepper (6 walls) | Settings choice row, persisted | Set once; a person wants it back |
| Tube (Free, Straight) | Settings toggle row, persisted | Touch has no Shift |
| Quality | Settings, site row | Shared |
| (none) | Settings footer Reset | Brings the OPEN sign back |
| `dl.how` | Key strip, four entries | drag, click, double-click, shift + drag |
| Classic link | Settings, Build (`legacy: true`) | Shell owns it |

Visible: Gas, Undo, Clear (three of five).

## Checklist
- [x] Read toy, spec, Galaxy, tests
- [x] Play at 1280 and 375
- [x] Map the controls
- [x] Diegetic check and still
- [x] Port to one bar spec; delete v1 bar CSS and JS
- [x] Fix bugs and upgrade
- [x] Check 1280, 375 x 812, 812 x 375
- [x] Commit and push; tick neon in stimming-80dc

## Bugs and rough edges (v1)
- Touch has no undo.
- Gas swatches are 7 px wide on phones.
- Settings opens on hover.
- After Clear, the OPEN sign never comes back.

## Summary of Changes

- One `bar` spec to `initPage`: Gas stepper (13 options, colour dots), Undo and Clear actions, Settings rows Lights, Wall (persisted), Straight tubes (persisted), Quality, Reset; four-entry key strip. Classic sits under Build.
- Deleted the v1 header, bar, gas rail, hover tray, wall picker, `bar--below` and their CSS.
- Fixes: Undo on touch; Undo and Clear rest while the wall is bare; Reset brings the OPEN sign back; Settings opens on click only; Cmd or Ctrl with Z undoes; a failed GL start hides the controls.
- Diegetic proposal: a pull chain on a junction box beside the sign cycles Lights (key L). Still in the session notes. Not built.
