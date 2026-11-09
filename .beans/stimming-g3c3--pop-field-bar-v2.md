---
# stimming-g3c3
title: 'Pop field: Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T08:19:33Z
updated_at: 2026-11-09T08:23:21Z
parent: stimming-80dc
---

Move pop/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| header (back, Classic, sound) | top left back + name; top right Classic, sound | Shell builds them; legacy: true in toys.json |
| Settings tray (Quality) | Settings sheet, Site row | quality: true |
| (none) | top left choice: Material stepper (18) | Materials were reachable only by chance or ?mat= |
| Shuffle (animated die) | bottom left action, key S | Shared verb; the toy keeps its rolling die face |
| Reset | bottom left action, key R | No Clear, so Reset stays on the stage |
| dl.how (4 rows) | key strip, 4 entries | click pop, drag sweep, hold burst, arrows + space |

Five visible: choice, Shuffle, Reset. Top right does not count.

## Checklist

- [x] Port to one bar spec; delete header, .bar, dl.how, qualitySetting
- [x] Grid keeps clear of the corner chips
- [x] Wipe grows from the die wherever it sits
- [x] Material stepper swaps the sheet
- [x] Check 1280 and 375 in the pane
- [x] Commit, push, tick pop in stimming-80dc

## Summary of Changes

- One bar spec: Material stepper (18), Shuffle (S, rolling die kept), Reset (R), Quality in Settings, four-entry key strip. Header, .bar, dl.how and qualitySetting are gone.
- The sheet lays out between the top and bottom control rows and the key strip, so no chip or key word sits on a bubble.
- The new-sheet wipe grows from the control pressed (die or stepper), not from a fixed corner.
- Quick material steps lay one sheet, for the last material.
- S and R wake audio, so the rattle sounds on the key.
- Diegetic: a peel corner could replace Shuffle; proposal only.
- Open: Tom wants Classic/Fresh under Settings; sent to the shell owner.
