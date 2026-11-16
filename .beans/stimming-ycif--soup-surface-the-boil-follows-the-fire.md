---
# stimming-ycif
title: 'Soup surface: the boil follows the fire'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:46:16Z
updated_at: 2026-11-16T16:11:00Z
parent: stimming-fskg
---

A rolling boil at Fire 1, a calm shiver at 0.1: bubble rate, plume push and ripple noise follow the slider.

Branch: claude/cauldron-soup-0a7547 (worktree window-storm-abea42). Soup surface work in cauldron/index.html (shadeSoup in SCENE_FS, DYE_FS, RIP_FS). One change at a time; show Tom a screenshot before the next. Hold 30 fps at Quality High with a full pot.

## Summary of Changes

RIP_FS takes uShiver and uBoil: a slow random forcing (12 patterns a second) on the wave field. Shiver = 0.00003 * (0.4 + fire) everywhere; boil = 0.0005 * fire cubed over the four plumes. Off below Fire 0.04, in reduced motion and while draining. Dev row Boil scales both. Bubble rate already followed Fire. Tom's review rides on stimming-tao4.
