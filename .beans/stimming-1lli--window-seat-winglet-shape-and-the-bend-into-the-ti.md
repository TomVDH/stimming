---
# stimming-1lli
title: 'Window seat: winglet shape and the bend into the tip'
status: completed
type: task
priority: normal
created_at: 2026-11-15T07:48:53Z
updated_at: 2026-11-15T07:52:51Z
---


Tom (2026-11-14): fix the winglet's shape and the bend.
Today the root is 1.25 m against a 1.6 m wing tip and sits 35 cm aft. The 0.6 m bend gets about 5 of 16 sections, so it shades in steps.

- [x] The root continues the wing tip: same chord, leading edge, camber and height
- [x] A wider bend, sampled densely, so it shades smoothly
- [x] Chord tapers and the leading edge sweeps back smoothly up the blade
- [x] The tip lights and the ray-test quad follow the new shape
- [x] QA: clean console, fps, 1280 and 375 px screenshots, before and after close-ups

## Notes

- `WINGLET(u)` in `window/index.html`: a 1.1 m bend to 80 degrees, then a 1.7 m blade.
- Chord: 0.5 + 1.1 (1 - u)^1.6 m, so 1.6 m at the root and 0.5 m at the tip. The trailing edge sweeps 0.5 m aft.
- `wing3.js` lofts 30 sections, bunched toward the root (u = (i / 29)^1.5). It uses the wing's own 18-step chord spacing.
- The root ring is the wing tip's own section at z = 25. The offset to the plain blade fades out by u = 0.3, inside the bend.
- `TIP` and `LET` follow `WINGLET`, so the nav light, the strobe and the ray tests moved with it.
- QA (headless shell, ANGLE D3D11): 60 fps at 1280 and 375 px; no console errors.
- Dark inner face (Tom: lighten it): the paint's sky map turns every downward direction into horizon sky, so nothing lit the blade from below.
- A hemisphere light now adds light up from land and cloud: albedo 0.1 to 0.7 by the Cloud setting, times 0.8 for the air. Tom found 4x too light, so it runs at the physical value (1x).
- A 20x test lit the blade fully, so its normals are right.

## Light to match the scene and the hour (Tom, 2026-11-15)

Pixel samples showed a magenta cast on the aircraft at every hour (green lowest), against a warm or neutral scene.

- The red nav lamp lit the skin at full strength by day. It now scales with the hour's man-made light (`h.lit`: Noon 0, Golden hour 0.15, Dusk to Midnight 1).
- The paint's sky map began at +1.7 degrees true elevation; the eye's horizon is at -3.4 degrees. So the warm glow band never lit the paint. Level rays now meet the eye's horizon.
- The light from below now uses the deck shader's own cloud terms (sun times 0.075 times sunK, sky ambient times 0.021) and a land term, mixed by cover.
- Golden hour wing top: (65, 58, 62) before, (84, 71, 73) after. Noon winglet: (99, 90, 98) before, (86, 84, 90) after.
- Ruled out: sun shadow acne (shadows off changed nothing).
- Golden hour pink (Tom: warm it): the paint's sky colour now leans 60 percent to the horizon band's hue, keeping each direction's brightness.
- Golden hour wing top: (84, 71, 73) to (80, 66, 61); winglet (110, 88, 80). Noon stays neutral; Dusk reads dusky red.

