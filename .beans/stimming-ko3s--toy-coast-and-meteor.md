---
# stimming-ko3s
title: 'Toy: Coast and meteor'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:41:23Z
updated_at: 2026-11-09T07:54:39Z
---

Coast and meteor (`meteor`), plan `docs/plans/meteor.md`. Rank 10. Uses K2 and K6 from `fireworks/index.html`. Bar v2.

A calm cove at dusk. Tap the sky: a meteor streaks in, its light sweeps the cliff's shadow across the bay, and the boom arrives late.

Not Window seat (`stimming-w1nd`): that toy looks down from 11 km at night, through a window; its meteor is a shader streak on the sky, its impact an orange ground dome and mushroom plume. This toy stands on a pebble beach at sea level at dusk. Its meteor is a 3D light that moves shadows; its impact is beyond the horizon: a white condensation dome, a shock ring on the sea, and the sea drawing back.

- [x] Task 1: lift K2 and K6 from Fireworks; terrain, sea, dusk sky
- [x] Task 1: Q1, Q2, stills at 1280 and 375 px at three Dusk values
- [ ] Task 1: blockout checkpoint with Tom (stills sent 2026-11-09, waiting)
- [ ] Task 2: Pebble and Fireball: moving light, shadow march, glitter, head, tail, fragments, flash, train
- [ ] Task 3: Impact: flash dome, shock ring, condensation dome, steam, draw-back, return
- [ ] Task 4: Sound
- [ ] Task 5: Bar, Settings, persistence; Q1 to Q10
- [x] toys.json entry (Dutch name and IPA are drafts)
- [x] Menu Lab entry with its toys.meteor hook
- [ ] Record the session cost

## Blockout (2026-11-09)

- Bar v2 (the house standard since 2026-11-08), not the plan v1 bar. Choice: Pebble, Fireball, Impact (keys 1 to 3). Slider: Dusk. Action: Shower (disabled until Task 2). Settings: Letterbox, Cliff, Quality.
- `terrainH(x, z)`: pebble bank, curved cove, seabed with reefs, a headland ridge with ledges. `heightTex` is 512 square over 1.8 km (plan: 256), so the shore foam reads the depth well.
- Sea: four Gerstner waves (per-wave distance fade), four normal-only ripples, a noise chop, swash on the bank, foam in the shallows. `level()` reads `uLevel` (drop, trough front, return crest, return height); all zero for now.
- The sea mirrors the headland through an 18-step march of `heightTex`; rung 2 drops it to 10.
- Kit changes in this copy only: K2 sky has dusk palettes (three keyframes) in place of the night sky; K2 grade gains a letterbox; K2 bloom runs at half size. K6 has 4096 slots, meteor ramps, no cloud veil and no fish, willow or glitter kinds.
- Drag looks around (yaw 34 deg, pitch 9 deg). Tap does nothing yet.
- Stills: side-session notes folder, `meteor-*.png`.
