---
# stimming-2vxf
title: 'Pop field: drop the ripple shove'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:03:38Z
updated_at: 2026-11-03T20:04:41Z
parent: stimming-wzxt
---

The shockwave post pass is gone (52534ce). The ripple that pushes inflated cells outward after each pop still warps the grid. Remove it.

- [x] Remove the ripple shove from pop()
- [x] QA: clean console, single pops and a drag sweep stay on the grid
- [x] Commit, push

## Summary of Changes

A pop no longer sends a ripple that pushes inflated cells outward. Bursts, rings, the jumbo blast and the refill wave stay.
