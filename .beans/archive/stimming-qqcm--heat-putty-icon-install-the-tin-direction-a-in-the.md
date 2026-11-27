---
# stimming-qqcm
title: 'Heat putty icon: install the tin (direction A) in the menu'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:41:43Z
updated_at: 2026-11-03T20:44:05Z
parent: stimming-phc6
---

Tom, 2026-11-03: picks A, the tin, from the four new directions (stimming-vn2u).

- [x] Replace the putty tile art in index.html with the tin
- [x] toys.putty: the pointer moves a warm thumbprint; it cools on leave
- [x] Emblem: icons/spike/emblems/putty-a.svg to shared/emblems/putty.svg
- [x] Record the pick in icons/picks.json
- [x] QA: menu parses, clean console, hover, screenshots at 1280 and 375
- [x] Commit own hunks via private index and push

## Summary of Changes

- The menu tile is now the tin from direction A. The old blob and handprint markup is gone.
- toys.putty follows the pointer: the thumbprint moves and heats, then cools on leave. Keyboard focus lets the print drift by itself.
- shared/emblems/putty.svg is the new tin emblem; the intro shows it.
- icons/picks.json records pick A.
