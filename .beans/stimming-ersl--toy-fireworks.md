---
# stimming-ersl
title: 'Toy: Fireworks'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:06:54Z
updated_at: 2026-11-08T11:30:38Z
---

Fireworks (`fireworks`, idea S2). Shells burst over dark water at night; each burst lights its smoke, the low sky and the water; the boom arrives late.

Plan: `docs/plans/fireworks.md`. Rendering: three.js 0.170 (Tom, 2026-11-08). Lifts K2 from Night viaduct's Port; builds K6, burst particles.

## Checklist

- [x] Blockout: the still bay and one frozen peony, stills at 1280 and 375 px
- [x] Tom signs off the blockout (2026-11-08)
- [ ] D1: Tom names what broke in Night viaduct; fix it in this copy of K2
- [ ] Task 1: the bay at night, K2 lifted and marked
- [x] Task 2: five shells on closed-form GPU stars (K6): ring buffer with range uploads, comets with sparks, hold to charge, burst lights, sleep when idle
- [x] Q4 for Task 2: the loop stops when the show ends (0 frames for 13 s)
- [ ] Task 3: lit smoke, water reflections, finale
- [ ] Task 4: sound, with delayed boom
- [ ] Task 5: bar, menu Lab entry, toys.json, QA
- [ ] Record the session cost

## K2 fixes in this copy

- Grade grain: the sin hash drew faint vertical stripes on the sky; an integer hash replaces it. Night viaduct still has the sin hash.
- Orbs pass: caps pixels at 6 before bloom; very bright cores made square bloom tiles.

## Tom's batch, 2026-11-08

- [x] Bloom at full size; mirror at 3/4 (Standard) or full (High)
- [x] Land: beach, ridged hills and range as a lit height field; burst shadows from a baked height texture
- [x] Festival: 16 campfires that light the sand, string lights, lanterns, boats, floating lanterns, homes up the hill
- [x] Drift tier: fires flicker at 30 fps, then sleep after 60 s
- [x] Reflections: moving swell, chop and ripple; nine-tap streaks that lengthen on far water; crest glints near; two shells in one frame keep both uploads
- [x] Wide shell variety on a stepper: Mix and 17 shells (Chrysanthemum, Palm, Kamuro, Saturn, Pistil, Crackle, Fish, Heart, Galaxy, Cascade, Barrage, Supernova and the five first)
- [x] Square bloom: the stock blur has sigma = radius (a near box); weights now use sigma = radius / 2.5

## Tom's batch 2, 2026-11-08

- [x] Performance: cheap land copy in the mirror, shadows from 2 lights, fires only near the beach, bloom 0.7 and mirror 0.6 on Standard
- [x] Comets: six styles (gold, glitter, colour, dark, spin, crackle), bold trails and spark sprays, a lean up to about 9 degrees; dark comets carry bigger shells and a huge flash
- [x] Smoke: lit puffs that drift on the wind, layered; later bursts light earlier smoke; Thin and Thick
- [ ] fps on a real device (the pane stays hidden here)

## Tom's batch 3, 2026-11-08

- [x] Smoke ages into level, sheared strands (slierten) instead of textured blobs
- [x] Beach lights glow less and are about a quarter fewer

- [x] Comet tail: a short bright head plus a stream of shed embers that cool and fade (no rigid streak)
- [x] Wisps: slower, subtler change; longer, thicker, live 15 to 20 s

- [x] Wisp morph: seeded, eased stretch (long, wide, a little taller), shear, meander and a noise-frayed outline
- [x] Smoke light per pixel: a tight reach per burst, relief from the density slope, self-shade in dense cores, glowing edges when lit from behind

- [x] Smoke dissipates: diffusion growth, density thins with spread, a much slower lean; Thin and Thick lighter
- [x] Stars last about a third longer, die out at random, and fall more as they burn
