---
# stimming-vmu3
title: 'Toy: Fog horn'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T11:00:13Z
updated_at: 2026-11-10T11:38:54Z
---

Lab toy `foghorn/`. Idea 100 in `docs/toy-ideas.md`: a harbour mouth in thick fog. Tap the horn; a container ship slides out of the grey, lights first.

The first toy on the environment runner (`shared/environment.js`, bean `stimming-ssrh`). Tom, 2026-11-10: "Yes, a new toy".

## Checklist

- [x] Page on the runner: fog, water, two breakwater lights
- [x] The horn: tap, key, action; the lights hold while it sounds
- [x] The ship: lights first, then the hull; it passes and leaves
- [x] Sound: harbour horn, ship's answer, sea wash (written; not heard yet)
- [x] Bar v2: Time, Fog, Horn; Rain in Settings; quality
- [x] `toys.json` entry and Lab menu tile with a hover hook
- [x] Desktop seen in the browser pane; 375 x 812 and 812 x 375 checked by layout measurement only (the pane was hidden)
- [ ] See the picture at phone sizes; hear the sound; check frame time on a phone
- [ ] Tom reviews; Dutch name and icon are drafts

## Notes

- 2026-11-10: first build. The ship follows waypoints: bow-on through the mouth, a turn to port, then a broadside crossing at 260 m. `?ship=3.5` starts it at that waypoint, for QA.
- The lens widens on a narrow frame, so both harbour lights stay in view on a phone.
- Dutch name Misthoorn and the menu icon are drafts for Tom.
- Not done: vignette, emblem, bell buoy or other sounds, hull reflection in the water.

- 2026-11-10, Tom: "the boat looks a lil weird", use the Vlootzak if it is not too heavy, movement "FAR FAR slower", and "a rough sea here, like bad: it is an emergency to have to moor".
- The ship is now the KS Vlootzak (Havoc bulk carrier), drawn in the shader from her own measures: hull, five hatch covers, four cranes in two pairs, the house, funnel and mast aft, and her own lamp list (`bulker-lights.json`). A second, end-on shape crosses the side view, so she has a beam when she points at the eye.
- The model itself is not used: `bulker.glb` is 9.6 MB, needs a 3D renderer, and its source licence is unknown (Havoc CREDITS: confirm before shipping). A side render of it served only as a reference in the scratchpad; nothing from the model ships.
- Speed: 2.4 m/s near (under five knots), up to 8 m/s far off; the pass takes about five minutes. Was 16 to 60 m/s.
- Storm (Settings, default 0.85): 5 m swell, the water surface lifted onto the swell, foam, spray over the breakwater and up from the quay, the ship heaving, pitching and rolling on the same swell (`swellHeight`), driven rain, wind in the sound.
- Seen at desktop size only. Not checked: phone sizes, frame time on a phone, reduced motion, sound by ear.

- 2026-11-10, Tom: "Yes, bake it". The ship is now two baked pictures of the Vlootzak model: her port side (2048 x 436, 29 KB) and her bow (341 x 436, 10 KB), rendered in Blender from Havoc's `bulker.glb`, 9.48 px a metre. The funnel mark is painted out. `foghorn/CREDITS.md` records the source and the open licence question. The procedural hull is gone; the lamp list and the flood pools stay.
- The runner loads the pictures (`textures` option). Foam cut back to the highest crests. Lamps outside a pixel's reach are skipped, and thick fog skips the sky.
- Frame time: not measured in a way to trust. The pane was hidden and the numbers swung from 8 to 60 ms for the same frame.
