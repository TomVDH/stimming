---
# stimming-k3i9
title: 'Toy: Lava skin'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T08:55:05Z
updated_at: 2026-11-15T09:25:10Z
---

Lab toy, idea 331 from the pool: slow lava crusts, cracks and glows through. Group F: quiet to use, rich to look at. A close view of slow basalt lava: a dark cooling skin over a bright interior. The hand presses or drags to break the skin; the crack flares, fresh lava wells up, then crusts over. Tier: raw WebGL2 with a small simulated field. Bar v2. Brief: lab10 batch.

- [x] Blockout: page skeleton on Bar v2, field sim (break, well, tear, cool), crust and seam shading
- [ ] Look: black-body glow, crust relief and silver sheen, glow-through, heat shimmer, bloom (shared/glow.js)
- [ ] Idle state: low frame rate at rest, then the flow stalls and the loop sleeps
- [ ] Sound: low rumble, crust ticks, glassy cracks (Web Audio through audioKit)
- [ ] Performance: detail() level, pixel ratio, slow-frame step, whenVisible, reduced motion
- [ ] QA in the browser pane: console, gesture, controls, sound, 1280, 375 x 812, 812 x 375
- [ ] Vignette, toy doc docs/toys/lavaskin.md
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
