---
# stimming-kws3
title: 'Window seat: physical sky, sun, moon and two-pass render'
status: todo
type: task
priority: normal
created_at: 2026-11-04T23:30:00Z
updated_at: 2026-11-04T23:30:00Z
parent: stimming-w1nd
---

Round 5, phase 1. Tom approved the direction on 2026-11-04 and parked the build for budget.
Look: cinematic. Physics drives the scene; the grade gives the mood.
Budget: Standard holds 30 fps on an office laptop. High goes heavy.

Decisions:
- Pass 1 draws the outside (sky, ground, clouds, towers, bolts) to its own buffer. Standard renders it at half resolution; High at full.
- Pass 2 draws the cabin, frame and panes at full resolution. The glass samples the pass 1 buffer.
- The GLSL moves to `window/shader.js`, as `tvtree/channels.js` does.
- `onQuality` sets the march steps and the pass 1 resolution.
- Sky: single-scatter Rayleigh plus Mie, with ozone, seen from 11 km. Bake it to a small sky texture only when the sun moves.
- The hour chips become sun positions. Dusk: sun just under the eye's horizon (it dips about 3.4 degrees at 11 km). Dawn: just above, on the other bearing. Midnight: sun deep down; the moon is the light source.
- Each hour keeps a small OKLCH grade tint.
- Speed drops from 2.4 km/s to 0.75 km/s (about 3x real).

- [ ] Two-pass render; GLSL in `window/shader.js`; quality hook
- [ ] Speed to 0.75 km/s
- [ ] Rayleigh, Mie and ozone sky baked to a texture; Earth's shadow and the pink band emerge
- [ ] Hour chips set sun positions; small OKLCH grade tint per hour
- [ ] Sun: colour from transmittance, limb darkening, refraction squash near the horizon
- [ ] Moon: a proper disc with faint maria and a halo (no phase, no earthshine)
- [ ] Flare scales to its source: a shorter streak, full only when the whole disc clears the frame
- [ ] Screenshots to Tom: Dusk, Midnight, Dawn at 1280 px
