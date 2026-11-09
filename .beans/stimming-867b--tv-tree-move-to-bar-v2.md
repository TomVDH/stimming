---
# stimming-867b
title: 'TV tree: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T17:10:07Z
updated_at: 2026-11-09T17:17:32Z
parent: stimming-80dc
---

Move tvtree/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc. channels.js, channels.html and lab.html stay as they are.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Shuffle chip (S) | Bottom left: action `shuffle`, key S | Shared verb: deals a new lineup |
| Tune chip (T) | Bottom left: action `Tune`, key T, disabled while it would do nothing | Main verb: every lit set to one big picture |
| Eyes chip (E) | Bottom left: action `Eyes`, key E, disabled while it would do nothing | Main verb: the watchers |
| Power chip in the hover tray (P) | Settings: toggle row `Power`, follows the sets; P stays | A bulk state, not a main verb |
| Lantern chip in the hover tray (L) | Settings: toggle row `Lantern`, persisted; L stays | A state a person wants back |
| Quality (v1 tray) | Settings: site Quality row | Site row |
| Channels pill in the header | Settings: `link` row `Channels`, `All 155`, to channels.html | The header goes; the sheet keeps the link (shell b443878) |
| dl.how | Key strip: click change channel, drag swing, hold power off, scroll zoom | Four entries at most; touch words swap |
| header data-shell | Shell: logo, name, sound, Settings, (i) | Shell |

No choice, no slider, no Reset.

## Two data-shell matches

The page had `<header data-shell>` and a script selector `header[data-shell] .tools` that put the Channels pill into the header. Under Bar v2 the header goes, so the pill would vanish without an error. It moves into Settings.

## Checklist
- [x] Read brief, spec, Galaxy, TV tree
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812, 812 x 375 and 740 x 375 in the pane
- [x] Diegetic proposal with one still
- [x] Commit, push, tick tvtree in stimming-80dc

## Diegetic proposal (awaits Tom)

The remote: a TV remote lies in the grass, front right of the trunk, the lantern's mirror. Tap it: every lit set tunes to one big picture, with a red IR blink. It replaces the Tune chip; T stays. Tap the lantern to light or douse it; it replaces the Lantern row; L stays. Shuffle and Eyes stay chips. A channel dial on each set was weighed: a tap on the set already changes channel, so a dial would duplicate it. Still: `tvtree-diegetic-remote.jpg` in the batch notes folder.

## Summary of Changes

TV tree passes one bar spec to initPage. Shuffle (S), Tune (T) and Eyes (E) sit bottom left. Settings holds Power and Lantern toggles, a Channels link to the contact sheet, and the site Quality row. Key strip: click change channel, drag swing, hold power off, scroll zoom (touch: tap, pinch). P and L still bind in the toy.
Fixed: the framing read the v1 bar, so under v2 the tree would ignore the corners; it now sits between a top band (the top corners) and a foot band (bottom corners and key strip), and refits when corners move or stack. The Channels pill depended on the header and would vanish without an error; it is a Settings link row. The Settings tray opened on hover; the sheet opens on click only. Arrow, Enter, Space, P and L keys fired while focus was in Settings; they skip the sheet now. Tune and Eyes did nothing when no set (or fewer than three) was lit or a show ran; they are disabled then. Lantern comes back on reload, lit at once without the match. The intro fallback dropped its stale Stimming Lab line.

## Mobile and compliance

Checked at 1280 x 800, 375 x 812 (mobile preset, touch), 812 x 375 and 740 x 375 (touch). No corner overlaps another or the key strip. No control leaves the stage. No sideways scroll. The Settings sheet fits. Touch chips and segments are 34 px or more (after shell 05324b9). The tree clears every corner and the key strip. The logo stays on dark ground during the Tune show. Lantern persists across reload. Console clean.
