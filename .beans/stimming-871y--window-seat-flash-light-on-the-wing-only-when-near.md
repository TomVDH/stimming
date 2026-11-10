---
# stimming-871y
title: 'Window seat: flash light on the wing only when near; densest fog is the roughest air'
status: completed
type: task
created_at: 2026-11-10T09:14:23Z
updated_at: 2026-11-10T09:14:23Z
parent: stimming-w1nd
---

Tom: every flash, however far, throws hot specular orbs on the wing's edges, and the pop is hard. Dense fog should hold the heaviest turbulence.

- [x] Wing flash light falls off with distance (about 10 km)
- [x] Flash light mostly soft hemisphere fill; small directional share
- [x] Flash light eases in (40 ms) and out (200 ms)
- [x] Dense fog core adds turbulence above a full storm

## Summary of Changes

bolts3 picks the wing's flash by level over 1 + (d / 10 km)^2, so a 60 km flash gives 0.03 against 1.29 at 5 km. wing3 splits the flash into a HemisphereLight (0.3, no specular) and a weak DirectionalLight (0.06), and eases the level in 40 ms and out 200 ms. stepTurb adds 0.5 in the fog's dense core (level 0.75 to 1): turbulence 1.4 there, against 1.0 for a full storm.
