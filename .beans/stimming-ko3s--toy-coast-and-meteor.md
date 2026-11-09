---
# stimming-ko3s
title: 'Toy: Coast and meteor'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:41:23Z
updated_at: 2026-11-09T08:49:46Z
---

Coast and meteor (`meteor`), plan `docs/plans/meteor.md`. Rank 10. Uses K2 and K6 from `fireworks/index.html`. Bar v2.

A calm cove at dusk. Tap the sky: a meteor streaks in, its light sweeps the cliff's shadow across the bay, and the boom arrives late.

Not Window seat (`stimming-w1nd`): that toy looks down from 11 km at night, through a window; its meteor is a shader streak on the sky, its impact an orange ground dome and mushroom plume. This toy stands on a pebble beach at sea level at dusk. Its meteor is a 3D light that moves shadows; its impact is beyond the horizon: a white condensation dome, a shock ring on the sea, and the sea drawing back.

- [x] Task 1: lift K2 and K6 from Fireworks; terrain, sea, dusk sky
- [x] Task 1: Q1, Q2, stills at 1280 and 375 px at three Dusk values
- [x] Task 1: blockout checkpoint with Tom (signed off 2026-11-09)
- [x] Task 2: Pebble and Fireball: moving light, shadow march, glitter, head, tail, fragments, flash, train
- [x] Task 2: checkpoint with Tom (signed off 2026-11-09)
- [x] Task 3: Impact: flash dome, shock ring, condensation dome, steam, draw-back, return
- [ ] Task 3: checkpoint with Tom (stills sent 2026-11-09, waiting)
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

## Task 2 (2026-11-09)

- `uFireball` (position, intensity) and `uFireCol` feed the sky, haze, land and sea. `march()` walks `heightTex` toward the light (16 steps; rung 2 drops it to 8, before bloom at rung 3); the sea reflection uses the same march.
- Fireball: enters low from behind the headland, 48 to 60 deg round from the tap, on a shallow path (`power1.in`, so the shadow moves fastest before the burst). Breakup at two thirds sheds 40 K6 fragments; the airburst flashes (Fireworks flash curve, 200 ms rise in reduced motion); the persistent train (64 points, sheared wind) glows green and fades to smoke over 20 s.
- Pebble: a short streak and a soft light; reduced motion fades it in place. Shower: 12 Pebbles over 20 s from one radiant.
- Each Size is a paused GSAP timeline, removed from the global timeline, driven by `tl.time(simT - t0)`.
- Queue: one tap waits behind a long event; later taps answer as Pebbles. A Cliff change waits until no event is in flight.
- Impact still falls as a Fireball until Task 3.
- Not verified: the live frame loop (rAF counts, sleep) and real pointer taps; the pane stayed hidden, so checks ran through a probe page.

## Task 3 (2026-11-09)

- `impact(d)`: a 48 s timeline. The impactor dives from the tap to the horizon on that bearing (3 s, 60 fragments), then hits 11 km out.
- Flash: `uImpact` (site, strength) and `uImpCol` drive a horizon dome, a halo and a sky wash in `impactGlow()`; exposure lifts 20 %; `uGlare` dims the stars; the colour runs white, orange, embers over 11 s. The site is also the moving light (`uFireball`), so the headland throws long shadows and the sea carries a glitter path to the site.
- Condensation dome: a Fresnel hemisphere, grown to 2.6 km and gone in 1.5 s. Ejecta: 90 K6 stars fountain up from the site. Shock ring: `shockAt()` heaps a 2.4 m ridge that crosses 12 km in 6.5 s, ruffles and darkens the water behind its front and tears spray off it.
- Steam column: 30 fbm billboards stand up over 12 s, lit from below by the flash, from the side by the afterglow; they thin away by the end.
- Sea level: `level()` reads `uLevel` (drop, trough front, crest, crest height). The trough comes in from the sea and drains the cove 4.6 m (the shoreline recedes about 90 m, reefs bare). The return is a sech squared crest that slows as it shoals and floods the bank to the foot of the camera; foam breaks where the face is steep and churns behind the crest.
- Wet ground: `uWet` (high-water mark, dryness). Exposed bed stays dark and mirrors the sky; sparse cells glint; it dries over 10 s after the sea returns.
- Reefs lowered to 1.3 m and broken up: at 2.4 m they read as a wave wall when bared.
- Not verified live: the pane stayed hidden, so every still came through a probe page.

## Task 3, round 2 (2026-11-09, Tom: all out)

- The Impact is 96 s. The entry takes 9 s: a big head (capsule 4 to 7 px) with a plume of 72 billboards behind it that run white-hot, fire, then smoke lit by the sky and the head; three breakups shed 150 fragments.
- Lens flare: the `flares` pass from Fireworks (streak and ghosts), marked as a lift. It follows the brightest light with an eased gain, so it never pops. It runs before bloom.
- Tsunami: the swell looms from 7 km over 30 s (`power2.out`, so it slows as it shoals) and grows to 16 m at 170 m with a 120 m width and a steeper shoreward face (`uWave.y`). It breaks over 7 s into white water (`uWave.x`: a white lip, spray on the face, a foam sheet behind), falls to a 3.6 m bore, runs up the bank to 1.6 m at the camera, and drains. The face is dark water that stands against the afterglow.
- Draw-back now takes 17 s; the stones dry over 10 s at the end.
- Still not verified live (hidden pane). Tom should check the wall's scale on a real screen: it sits about 30 px above the horizon at 1280 px when it breaks.
