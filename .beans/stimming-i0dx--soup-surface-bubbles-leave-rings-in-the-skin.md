---
# stimming-i0dx
title: 'Soup surface: bubbles leave rings in the skin'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:46:15Z
updated_at: 2026-11-17T22:17:07Z
parent: stimming-fskg
---

A bubble that pops through skin leaves a ring that heals.

Branch: claude/cauldron-soup-0a7547 (worktree window-storm-abea42). Soup surface work in cauldron/index.html (shadeSoup in SCENE_FS, DYE_FS, RIP_FS). One change at a time; show Tom a screenshot before the next. Hold 30 fps at Quality High with a full pot.

## Summary of Changes

2026-11-17. Emitter type 4 in DYE_FS: a burst cuts the skin (aux b) to 5% in a disc 1.3 times the bubble's size and piles the pushed skin in a ring at 1.2 radii. pop() emits one for every burst. On set skin the hole shows as a glossy patch of broth that the skin grows back over. With skin already at its maximum the ring adds no height; the hole's edge carries the lip.
