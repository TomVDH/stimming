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
- [x] Task 1: checkpoint with Tom: the cadrage. Tom (13:17): far further away, a Villeneuve static shot. Done: eye at 3 km, 32° lens, locked off, no dolly, barrel at 18°
- [x] Task 2: approach and hold; charge: chase, cells, arcs, dust, sky dim, push-in, shake; `__qa.charge`, `__qa.jump`
- [x] Task 2: checkpoint: the draw. Tom (13:29, 13:33): daytime or dusk; the gun is stone with nothing glowing; keep the escalating charge chaos; the rock far out so the bolt takes seconds
- [x] Task 3: shot: slug, muzzle flash, bolt, Mach ring, recoil, hit, shards, burst, flash, respawn; `__qa.shoot`
- [x] Task 3: checkpoint: the slug (stills sent 13:45)
- [x] Task 4: sound: wind, hum, clicks, slug, crack at the Mach arrival, rumble; Q9 (context runs on hold, hum stops on release and on mute, pending drains, suspended after settle)
- [x] Task 5: persistence, reduced motion, Q1 to Q10 at three sizes, `tests/bar-v2.html` 98/98; fps below
- [ ] Task 5: fresh-eyes review of the branch, then the PR
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
- Tom asked for a far, static, Villeneuve-like shot: the eye moved to (1500, 70, 1800), lens 32°, horizon on the lower third, no dolly, no wobble; the barrel dropped to 18° so the rock stays in frame at every size.
- Charge cells moved from the inner faces to the rail flanks and tops: the inner faces never face the eye. Arcs bow up above the rails so they read against the sky.
- Tom (13:29): a day or dusk scene, and no glowing parts on the gun. The night K2 sky became a sunlit dusk sky; cells, seams, chase glow, beacons and service lights are gone. The charge reads as lightning over the gap, dust lifting and a shake, all growing with the hold.
- Tom (13:33): the rock far out, the bolt in flight for seconds. DA 40 km (same angular size), flight 9 s at a tap to 6 s at full charge; chaos saturates over 4 s, power over 2.5 s.
- The shot runs on a hand-rolled state keyed to the sim clock, not a GSAP timeline: fewer moving parts for one sequence. Cost if wrong: the same code in GSAP form.

## QA (2026-11-09, headless Chrome on Metal, 1280 × 800)

- Q1 `node --check` clean on the toy module and the four menu scripts. Q2 clean console through chips, slider, Settings, hold, release, Space, drag.
- Q4 zero `requestAnimationFrame` calls in 2 s once asleep (`?sleep=2500`). Q5 zero when hidden. Q6 reduced motion: clean, no arcs.
- Q7 two visible controls. Q8 Space charges and fires. Q9 see Task 4. Q10 hold 30 fps, shot 30 fps (the 30 fps film cadence is the cap).
- `tests/bar-v2.html`: DONE 98/98.
- Tom checks fps, sound by ear and the hold on a real device.
