---
# stimming-290j
title: 'Soup surface: glints sweep along the stir'
status: completed
type: task
created_at: 2026-11-16T16:33:27Z
updated_at: 2026-11-16T16:33:27Z
parent: stimming-fskg
---

Tom picked it (2026-11-16, idea 5 of the fidelity list). Branch claude/cauldron-soup-0a7547.

## Summary of Changes

shadeSoup reads the CPU stir fluid (velTex, bound as uVel) and, while the soup moves, averages the surface gradient over five taps along the flow (up to 0.07 apart, by speed from 0.05 to 0.6). The lamp's glints sweep along the swirl; calm soup keeps its crisp ripples. Costs 16 extra surfH reads only where the soup moves.
