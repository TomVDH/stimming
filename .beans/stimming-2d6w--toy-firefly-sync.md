---
# stimming-2d6w
title: 'Toy: Firefly sync'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T08:57:39Z
updated_at: 2026-11-15T09:44:28Z
parent: stimming-oh7b
---

Idea 196 (lab batch 10, group B, data visualisation): Fireflies blink at random, then lock in step. Tap to scatter.

Coupled oscillators shown as a warm night meadow, not as a chart. Hundreds of fireflies drift in the dark and blink out of step. Each one sees the flashes near it and nudges its own clock: late ones hurry, early ones wait. Over a minute they pull each other into one shared pulse, in patches first, then in waves. Tap or sweep to scatter their phases; hold to shine a lantern they follow. One main slider sets how hard they pull; below a threshold they never lock. Sound: each flash a tiny tick, so chaos sounds like rain and sync sounds like one heartbeat.

Tier: raw WebGL2 (instanced sprites, a baked night scene lit by the fireflies, bloom). The phase model runs on the CPU with a coarse light grid.

## Checklist
- [x] Phase model: pulse-coupled clocks on a light grid, tuned in a node prototype
- [x] Page skeleton on Bar v2 (intro fallback, stage, vignette)
- [x] Night scene: sky, tree line, lantern tree, meadow, front grass, lit by the fireflies
- [x] Fireflies: instanced sprites with depth, bokeh, glow; bloom and grade
- [x] Gestures: tap scatters, drag sweeps, hold leads; Shuffle; Pull slider; Rhythm choice (Pulse, Double, Burst)
- [x] Sound: ticks, rain, heartbeat through audioKit, muted by default
- [x] Quality: detail level, pixel ratio, slow-frame step, whenVisible, reduced motion
- [x] QA in the browser pane: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [x] Toy doc docs/toys/fireflies.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `fireflies/index.html`: a new Lab toy on Bar v2, raw WebGL2. About 730 fireflies on a night meadow seen from a low rise, with woods, a lantern tree and front grass.
- Phase model: each firefly keeps a clock and sees the flashes near it on a 1.5 m ground grid; late ones hurry, early ones wait. Pull is a multiple of the Kuramoto threshold. No lock below about 0.25; at the default 0.45 the meadow locks in about a minute.
- Rhythm choice: Pulse, Double, Burst. A spread factor per rhythm keeps each near a minute. Light saturates and never slows a clock below a third, so a volley cannot freeze the meadow.
- Gestures: tap startles a ring of flashes and resets the patch; drag sweeps; a still hold shines a lantern the swarm follows. Shuffle (S), Lead (L, held), keys 1 to 3, Space on the stage.
- Look: a baked night lit per frame by a small light map (ground pools, air glow in three depth bands), instanced sprites with lens blur up close, shared bloom, grade and film curve.
- Sound through audioKit: rain-like patter and glass ticks out of step; a lub-dub heartbeat and a warm chord in step; a bell for the lantern.
- `docs/toys/fireflies.md`: the toy doc. Handoff files in the lab10 scratchpad.
