---
# stimming-k3i9
title: 'Toy: Lava skin'
status: completed
type: feature
priority: normal
created_at: 2026-11-15T08:55:05Z
updated_at: 2026-11-27T07:19:52Z
---

Lab toy, idea 331 from the pool: slow lava crusts, cracks and glows through. Group F: quiet to use, rich to look at. A close view of slow basalt lava: a dark cooling skin over a bright interior. The hand presses or drags to break the skin; the crack flares, fresh lava wells up, then crusts over. Tier: raw WebGL2 with a small simulated field. Bar v2. Brief: lab10 batch.

- [x] Blockout: page skeleton on Bar v2, field sim (break, well, tear, cool), crust and seam shading
- [x] Look: black-body glow, crust relief and silver sheen, glow-through, heat shimmer, bloom (shared/glow.js)
- [x] Idle state: low frame rate at rest, then the flow stalls and the loop sleeps
- [x] Sound: low rumble, crust ticks, glassy cracks (Web Audio through audioKit)
- [x] Performance: detail() level, pixel ratio, slow-frame step, whenVisible, reduced motion
- [x] QA in the browser pane: console, gesture, controls, sound, 1280, 375 x 812, 812 x 375
- [x] Vignette, toy doc docs/toys/lavaskin.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Notes (2026-11-15)

- Tier: raw WebGL2. The break field lives in the lava's own frame and wraps in a 16-unit window, so the creep needs no advection.
- Emission is Planck at 650, 540 and 430 nm. Skin thickness sets the surface heat; fresh lava reads orange-yellow, cooling skin goes red, then black in about 20 s.
- Idle: 24 frames a second at rest; the flow stalls 60 s after the last input; the loop sleeps once the breaks cool (measured: about 80 s).
- Sound levels from an offline render: crack peak -9.5 dBFS, tick peak -22 dBFS, bed -27 dBFS RMS. Nobody has listened yet.
- QA: probe page on a timer loop with a PNG sink, because the pane tab did not render in the background. Probe deleted.

## Summary of Changes

- lavaskin/index.html: the toy on Bar v2. Heat slider; Surge (Space) and Shuffle (S); Settings: Heat shimmer, Quality, Reset; Dev: Glow, Sheen, Bloom, Plate size, Grain.
- Press breaks the skin, hold feeds a growing well, drag tears it; vents break out by themselves; Surge opens the seam network.
- Shared modules: stim.js, intro.js, detail.js, glow.js (bloom), grade.js, output.js. No library imports.
- docs/toys/lavaskin.md: the toy doc.
- Handoff for the orchestrator: toys-entry.json, menu-li.html and menu-icon.js in the lab10 scratchpad.
