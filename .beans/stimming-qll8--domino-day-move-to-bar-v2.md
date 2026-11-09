---
# stimming-qll8
title: 'Domino Day: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T09:10:25Z
updated_at: 2026-11-09T09:17:49Z
parent: stimming-80dc
---

Port `domino/index.html` to Bar v2. Brief: docs/plans/bar-v2-migration.md.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Add tray (8 tools) | Choice, top left, tray (`+ LINE`) | Eight options with icons |
| Iso chip (I) | Action, bottom left, cube icon, flash box when on | A quick view switch; the approved cube chip stays visible |
| Clear | Action, bottom left (C) | Shared verb |
| Picture tray (6 + upload) | Settings: Picture (Mix, Grin, Sun, Heart, Rings) and Yours (Off/On; On again picks a new file); drop an image on the table | Only the field tool reads it; five segments at most |
| Reset (Settings, R) | Settings footer; R stays | Clear shows |
| Quality | Settings, Site | Site row |
| dl.how | Key strip: drag lay tiles, click tip a tile, right-drag turn the table, I iso view | Four entries |

## Checklist

- [x] Play v1 at 1280 and 375; note bugs
- [x] Port to one bar spec; delete trays, popover, dead CSS
- [x] Fix bugs
- [x] Check in pane at 1280 and 375
- [x] Diegetic proposal still
- [x] Commit, push, tick domino in stimming-80dc

## Summary of Changes

- One bar spec: Add tray (8 tools), Iso and Clear actions, Picture and Yours in Settings, Reset in the footer, Quality, key strip.
- Header, bar, three popover trays, dl.how, dead hint CSS and JS removed.
- Fix: the opening run shrinks to fit the iso frame; on a tall phone stage it ran off the left edge.
- Upgrade: drop an image on the table to make it the field picture; Add turns to the field.
- Clear gets the C key.
- Diegetic proposal: a click on a fallen tile rewinds the run (replaces Reset). Waits for Tom.
