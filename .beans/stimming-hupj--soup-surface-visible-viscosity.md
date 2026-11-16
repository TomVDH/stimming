---
# stimming-hupj
title: 'Soup surface: visible viscosity'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:46:09Z
updated_at: 2026-11-16T16:12:17Z
parent: stimming-fskg
---

Thick soup ripples slower and smaller and holds dents (ripple damping and wave speed follow the dye weight T).

Branch: claude/cauldron-soup-0a7547 (worktree window-storm-abea42). Soup surface work in cauldron/index.html (shadeSoup in SCENE_FS, DYE_FS, RIP_FS). One change at a time; show Tom a screenshot before the next. Hold 30 fps at Quality High with a full pot.

## Summary of Changes

RIP_FS samples the dye weight per texel (T = (a - 1) * 0.3). Wave speed squared drops to 0.3x, velocity keeps 0.82 of each step, height decay rises from 0.98 to 0.996 as T goes to 1. The global thick() damping is gone; the local T replaces it. Tom's review rides on stimming-tao4.
