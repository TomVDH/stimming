---
# stimming-f69v
title: Idea swipe tool
status: completed
type: task
priority: normal
created_at: 2026-11-15T08:59:54Z
updated_at: 2026-11-15T09:03:35Z
---

A local page, docs/swipe.html, to swipe through the idea pool in docs/toy-ideas.md. Left is Can, right is Keep. It gives the verdicts as JSON for a cull of the pool.

- [x] Write docs/swipe.html
- [x] Check in the browser pane at 1280 and 375
- [x] Commit the page and this bean

## Summary of Changes

`docs/swipe.html` (noindex, local only: the Pages build skips `docs/`) reads `toy-ideas.md` live: 365 ideas. It marks 40 as started (a toy in `toys.json` or a `Toy:` bean) and leaves them out unless the toggle is on. Drag, arrow keys or buttons give Can or Keep; Z is undo. Progress saves in `stimming.ideas.swipe`. Copy JSON and Download give the verdict list. Checked at 1280 and 375 px; console clean.
