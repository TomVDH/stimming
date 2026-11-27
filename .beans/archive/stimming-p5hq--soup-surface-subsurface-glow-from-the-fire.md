---
# stimming-p5hq
title: 'Soup surface: subsurface glow from the fire'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:46:07Z
updated_at: 2026-11-16T16:08:37Z
parent: stimming-fskg
---

The fire below warms the soup from inside: a faint glow through thin broth, stronger at high fire, near the wall over the coals.

Branch: claude/cauldron-soup-0a7547 (worktree window-storm-abea42). Soup surface work in cauldron/index.html (shadeSoup in SCENE_FS, DYE_FS, RIP_FS). One change at a time; show Tom a screenshot before the next. Hold 30 fps at Quality High with a full pot.

## Summary of Changes

shadeSoup adds an emitted glow: the fire's colour, filtered by the soup's hue, over the four boil plumes (uPlumeS, heat = Fire) and a soft spot over the base. exp(-dens * 0.05) hides it in thick soup. Dev row Soup glow (soupGlow) scales it. Tom's review rides on stimming-tao4.
