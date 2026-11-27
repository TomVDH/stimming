---
# stimming-ywwz
title: Deprecate Ribbon
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:02:43Z
updated_at: 2026-11-03T20:04:45Z
---

Tom deprecates the Ribbon toy. Remove it the way Keycaps, Ripple tank and Jelly were dropped (7af7438). Git history keeps the code.

- [x] Delete ribbon/
- [x] Remove the Lab menu entry, its gradient and its hover timeline
- [x] Remove the ribbon entry from toys.json
- [x] Remove the README row; set the AGENTS.md Lab count to 22
- [x] Check the menu script parses and the Lab renders
- [x] Commit and push only Ribbon's hunks

## Summary of Changes

Ribbon is removed. `ribbon/` is deleted. The Lab menu loses its entry, the `g-ribbon` gradient and the hover timeline. `toys.json` loses the ribbon entry. The README row goes, and AGENTS.md now counts 22 Lab toys. Headless Chromium shows 22 Lab toys and a clean console at 1280px and 375px. Restore with `git checkout <commit>~1 -- ribbon/`.
