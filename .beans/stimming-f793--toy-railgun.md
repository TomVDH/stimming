---
# stimming-f793
title: 'Toy: Railgun'
status: in-progress
type: feature
created_at: 2026-11-09T19:40:51Z
updated_at: 2026-11-09T19:40:51Z
---

Railgun (`railgun`). One colossal planetside railgun on megalithic cradles; hold to charge, release to fire; the slug crosses the sky and shatters a looming asteroid. Plan: `docs/plans/railgun.md`. three.js 0.170 on K2 and K6 lifted from `launch/index.html`. Bar v2.

## Checklist

- [x] Task 1: skeleton and kits from launch; gun, cradles, ground, sky, rock, plume, scale lights; camera with dolly; post chain; loop; pointer
- [x] Task 1: Bar v2 spec, `toys.json`, `docs/plans/railgun.md`, menu tile and hook
- [x] Task 1: stills at 1280 × 800, 375 × 812, 812 × 375, Dusk 0 / 0.5 / 1 (headless Chrome)
- [ ] Task 1: checkpoint with Tom: the cadrage
- [ ] Task 2: approach and hold; charge: chase, cells, arcs, dust, sky dim, push-in, shake; `__qa.charge`, `__qa.jump`
- [ ] Task 2: checkpoint: the draw
- [ ] Task 3: shot: slug, rail heat, muzzle ring, bolt, Mach ring, recoil, hit, shards, burst, flash, respawn; `__qa.fire`
- [ ] Task 3: checkpoint: the slug
- [ ] Task 4: sound: wind, hum, clicks, slug, shot at the Mach delay, rumble; Q9
- [ ] Task 5: persistence, reduced motion, Q1 to Q10 at three sizes, fps in the bean, `tests/bar-v2.html`, PR
- [ ] Tom sets the Dutch name (proposal: Spoorkanon) and IPA
- [ ] Record the session cost

## Rulings (2026-11-09)

- Flat plateau, no ridge: the cradles grow with the barrel to 580 m. Scale reads better; one mesh fewer. Cost if wrong: a heightfield under the axis.
- The composer renders into a multisampled half-float target through RenderPass; no separate scene target. Cost if wrong: one extra pass.
- Four cradles at stations 0.22 to 0.89, not nine: from the eye they overlapped into a wall.
- Scale lights are instanced quads with alpha one. gl.POINTS worked, but additive blending scales by alpha, so the first version was invisible.
- The plume streams across the sky, not down the axis: along the axis it foreshortened into a halo.

## Blockout notes (2026-11-09)

- Eye at (150, 64, 250), yaw 0.24 rad left, FOV 44 landscape, 64 portrait; the horizon on the lower quarter.
- Rails 22 × 34 m, gap 28 m, 1,400 m at 24°; breech block 96 × 76 × 70 m; cradles 11 m uprights, 95 × 9 m lintels.
- Rock at 5 km on the axis; Mountain spawns at s 0.55 (2.8°). Key light `(0.5 + 2.5·near²)·burn`.
- Dusk: sun 7° to 18° under, `7 + 11·(1 − v)²`, default 0.5.
- Headless QA runner: scratchpad `qa.mjs` on Playwright 1.62 with the Chrome channel and the GPU flags; the browser pane runs throttled while hidden.
