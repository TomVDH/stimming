---
# stimming-b3ri
title: 'Glass: Bar v2'
status: in-progress
type: task
priority: normal
created_at: 2026-11-09T09:09:19Z
updated_at: 2026-11-09T09:18:45Z
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
- [ ] Commit and push, tick glass in stimming-80dc
- [ ] Diegetic verdict with a still
