---
# stimming-2d6w
title: 'Toy: Firefly sync'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T08:57:39Z
updated_at: 2026-11-15T09:25:52Z
parent: stimming-oh7b
---

Idea 196 (lab batch 10, group B, data visualisation): Fireflies blink at random, then lock in step. Tap to scatter.

Coupled oscillators shown as a warm night meadow, not as a chart. Hundreds of fireflies drift in the dark and blink out of step. Each one sees the flashes near it and nudges its own clock: late ones hurry, early ones wait. Over a minute they pull each other into one shared pulse, in patches first, then in waves. Tap or sweep to scatter their phases; hold to shine a lantern they follow. One main slider sets how hard they pull; below a threshold they never lock. Sound: each flash a tiny tick, so chaos sounds like rain and sync sounds like one heartbeat.

Tier: raw WebGL2 (instanced sprites, a baked night scene lit by the fireflies, bloom). The phase model runs on the CPU with a coarse light grid.

## Checklist
- [x] Phase model: pulse-coupled clocks on a light grid, tuned in a node prototype
- [x] Page skeleton on Bar v2 (intro fallback, stage, vignette)
- [ ] Night scene: sky, tree line, lantern tree, meadow, front grass, lit by the fireflies
- [ ] Fireflies: instanced sprites with depth, bokeh, glow; bloom and grade
- [ ] Gestures: tap scatters, drag sweeps, hold leads; Shuffle; Pull slider
- [ ] Sound: ticks, rain, heartbeat through audioKit, muted by default
- [ ] Quality: detail level, pixel ratio, slow-frame step, whenVisible, reduced motion
- [ ] QA in the browser pane: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [ ] Toy doc docs/toys/fireflies.md
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
