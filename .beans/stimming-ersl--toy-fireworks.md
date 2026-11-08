---
# stimming-ersl
title: 'Toy: Fireworks'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:06:54Z
updated_at: 2026-11-08T10:21:22Z
---

Fireworks (`fireworks`, idea S2). Shells burst over dark water at night; each burst lights its smoke, the low sky and the water; the boom arrives late.

Plan: `docs/plans/fireworks.md`. Rendering: three.js 0.170 (Tom, 2026-11-08). Lifts K2 from Night viaduct's Port; builds K6, burst particles.

## Checklist

- [x] Blockout: the still bay and one frozen peony, stills at 1280 and 375 px
- [ ] Tom signs off the blockout
- [ ] D1: Tom names what broke in Night viaduct; fix it in this copy of K2
- [ ] Task 1: the bay at night, K2 lifted and marked
- [ ] Task 2: five shells on closed-form GPU stars (K6)
- [ ] Task 3: lit smoke, water reflections, finale
- [ ] Task 4: sound, with delayed boom
- [ ] Task 5: bar, menu Lab entry, toys.json, QA
- [ ] Record the session cost

## K2 fixes in this copy

- Grade grain: the sin hash drew faint vertical stripes on the sky; an integer hash replaces it. Night viaduct still has the sin hash.
- Orbs pass: caps pixels at 6 before bloom; very bright cores made square bloom tiles.
