---
# stimming-shkv
title: 'Railgun: final gun pass (PBR, model, laser, behaviour)'
status: completed
type: task
priority: normal
created_at: 2026-11-16T18:59:01Z
updated_at: 2026-11-16T20:01:26Z
parent: stimming-f793
---

Tom, 2026-11-16: "PBR and gun materials, final tweaks to the gun model and targeting laser and behaviour".

## Checklist

- [x] Before stills: dusk, night, day at 1280 and 375, two close eyes
- [x] Part 1: PBR on the gun and the spent case (GGX, Smith, Schlick, split-sum sky light, Dev rows Gun steel and Gun steel rough)
- [x] Tom signs off Part 1
- [x] Part 2: trunnion up 75 m, variable recoil, rods ride the block (stimming-4c0k); base tapered and weathered (Tom), Dev row Base wear
- [x] Recoil well (Tom: the gun stood too tall): trunnion only 20 m over the old 215 m (RISE), a slot and lined well in the deck behind the pylon, struts set wide, cross bars out, machinery house moved aside; recoil room checks the well, deck, apron and teeth
- [x] Side-tower mount (Tom: a higher, believable mount): Dev row Mount (Well, Towers), ?mount=towers; trunnion 80 m up; two battered towers with bearings, buttresses, pinion housings, a ladder cage; full recoil to 20 degrees
- [x] Tom picks the central mount; side towers and piers removed
- [x] Central pylon as an A: plumb yoke and collar, then an A to the deck with a pointed opening; the front prop goes
- [x] Tom signs off Part 2
- [x] Part 3: ranging laser (stimming-48f4): pulse twice, paint, strobe on release, out at launch; the sight draws it
- [x] Tom signs off Part 3
- [x] Part 4: per-axis slew (ramp, cruise, brake; feed-forward on the moving rock), cradle sway, recoil run-out to battery with a thunk
- [x] Tom signs off Part 4
- [x] Clean console; charge, shot and recoil still work

## Summary of Changes

Tom signed off all four parts on 2026-11-16. PBR on the gun and the case (cfa81dbf); a tapered, weathered base; one central A pylon over a recoil well with variable recoil (a26243f0, ee4218f2); the IR ranging laser (415862f6, e90b1a60); heavy per-axis slew, cradle sway and a run-out to battery (4a3d6b62). The plan's "The gun, final pass" section holds the details.
