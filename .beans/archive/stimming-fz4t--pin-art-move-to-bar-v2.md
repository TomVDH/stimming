---
# stimming-fz4t
title: 'Pin art: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T08:18:57Z
updated_at: 2026-11-09T08:28:04Z
parent: stimming-i8rd
---

Move `pins/index.html` to Bar v2. Brief: docs/plans/bar-v2-migration.md. Epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Header (mark, back, sound) | Top left back block and name; top right sound | Shell standard |
| Finish: Chrome, Anodised | Top left choice, segments with colour dots | Two options; a look choice. Phones: bottom-left stepper |
| Shuffle | Bottom left, shuffle verb (die icon) | Shared verb |
| Flip | Bottom left, own verb | One word, Enter flips |
| Shake | Bottom left, own verb | One word, Escape shakes |
| Settings tray: Quality | Settings sheet, Site row | Shell standard |
| How-to: drag, type, Enter, Esc | Key strip, four entries | Same four |

Visible controls: 4 of 5.

## Checklist

- [x] Map controls (this table)
- [x] Diegetic check: knock and drag on the frame, built on Tom's yes
- [x] Port to one bar spec; delete dead markup and wiring
- [x] Fix bugs found on the way
- [x] Check in the pane at 1280 px and 375 px
- [x] Commit and push; tick pins in stimming-80dc

## Diegetic proposal

Knock the orange frame to shake flat (replaces Shake; Esc stays). Drag a frame side to flip (replaces Flip; Enter stays). Built on Tom's yes (2026-11-09). Shake and Flip buttons removed; Shuffle stays. The frame warms and the cursor opens on hover.

## Open

At 375 px the Finish stepper (x 28-202) overlaps the three actions (x 149-347). Fixed in the shell (36097e2): the bottom-right row stacks. The camera now measures the real corner rows.

## Summary of Changes

One bar spec replaces the header, the bar, choices() and qualitySetting(). Finish has colour dots. The camera fit measures the shell corner rows and refits when they stack. Escape that closes a sheet no longer shakes; typing in a sheet no longer presses letters.
