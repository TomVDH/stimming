---
# stimming-b3ri
title: 'Glass: Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T09:09:19Z
updated_at: 2026-11-09T09:19:32Z
parent: stimming-x6ef
---

Move glass/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Glass stepper + tray (9 glasses) | Choice, top left, stepper with icons | Nine options; only a stepper holds them. Phones: bottom left. |
| Tool chips (Hammer, Gun, Brick) | Settings row "Tool" (persisted), keys 1 2 3 | One choice group only; nine glasses cannot fit a Settings row. Diegetic proposal would replace it. |
| Rewind (R) | Action, bottom left, key R | Shared verb style, one word. |
| Quality (shared tray) | Settings, Site row | quality: true. |
| dl.how | Key strip: click, hold, 1 2 3, arrows + space | Click and hold verbs follow the tool and glass. |

## Checklist
- [x] Play v1 at 1280 and 375, note bugs
- [x] Port to one bar spec, delete header, .bar, dl.how, tray CSS and JS
- [x] Fix first-tap stall while audio starts
- [x] Check in pane at 1280 and 375, console, keys, Escape, reload
- [x] Commit and push, tick glass in stimming-80dc
- [x] Diegetic verdict with a still

## Summary of Changes

- Glass is the top-left stepper (bottom left on phones). Rewind is the action, key R. The tool is a persisted Settings row, keys 1 2 3. Quality sits in Settings. The key strip click and hold verbs follow the tool and glass.
- First-tap stall: compileAsync warmed the screen variant, but the scene draws into the composer target. Shaders now warm per target, then one hidden draw takes the first-use cost. First shot: 125-139 ms frame before, no long frame after. Sound off showed the same stall, so audio was not the cause.
- A wake during a frame no longer starts a second rAF loop.
- The frame clears the top corner row; tall stages centre it.

## Diegetic proposal (awaits Tom)

Hammer, gun and brick lie on the floor under the frame; click one to pick it up. It replaces the Tool row in Settings and restores one-tap tool switching on phones. Still: side-session-notes/glass-diegetic-tools.jpg.
