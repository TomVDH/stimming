---
# stimming-r8gh
title: 'Beans: close shipped zombie beans and archive completed backlog'
status: completed
type: task
created_at: 2026-11-27T07:18:21Z
updated_at: 2026-11-27T07:20:00Z
---

Clean up stale in-progress/todo beans already shipped on main, triage unlinked old in-progress beans, and run `beans archive` (Tom, 2026-11-27).

## Summary of Changes
- Closed 228 git-verified `in-progress` zombie beans whose IDs had commits touching code/docs on `main` (and closed parents whose children all completed).
- Closed 61 shipped unlinked `in-progress` beans (29 shipped `Toy:` beans, 20 shipped `Bar v3` control-redo beans, and 12 shipped Nov 3 to Nov 24 tasks).
- Scrapped 3 superseded Bar v2 beans (`stimming-80dc`, `stimming-tbpn`, `stimming-gljn`).
- Demoted 14 genuinely open/paused `in-progress` beans and parent epics to `todo` so `in-progress` reflects only active work (`stimming-u67n` left untouched).
- Archived 752 completed/scrapped beans to `.beans/archive/` via `beans archive` and verified 0 link issues with `beans check` (top-level `.beans/` reduced from 884 to 133 files).
