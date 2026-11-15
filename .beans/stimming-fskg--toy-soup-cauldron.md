---
# stimming-fskg
title: 'Toy: Soup cauldron'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:41:30Z
updated_at: 2026-11-15T10:28:23Z
---

Idea 363 (lab batch, group E, satisfying physics loops; Tom asked for it by name): A big pot on the fire. Throw things in and stir; it bubbles, steams and changes colour.

One huge black pot over a fire, seen from a little above, so the soup surface is the stage. Drag in a circle to stir: the soup turns with weight, a vortex dips the surface, things ride round on it. + Thing (or a tap on the soup) throws in the next thing: carrot, onion, fish, beetroot, rubber duck, peas, boot, star, tomato, mushroom. Each thing splashes, bobs, cooks, breaks up and tints the soup, so the colour and the thickness record what went in. The soup simmers by itself: fat bubbles rise and pop, steam rolls off in the firelight. Clear empties the pot. One main slider: Fire.

Tier: raw WebGL2. A ray-cast scene in one fragment shader (pot, soup heightfield, SDF things, droplets, spoon), a CPU stable-fluids solver (64 x 64) for the stir, a GPU dye field (OKLab, weighted) and a GPU ripple field, half-size fire and steam layers, the shared bloom chain and output curve.

## Checklist
- [x] Page skeleton on Bar v2 (intro fallback, stage, vignette)
- [x] Camera and framing for wide, tall and short stages
- [x] Pot, fire and background
- [x] CPU fluid: stir with weight, vortex, damping by thickness
- [x] Dye field: OKLab tint, mixing, fat, glitter
- [x] Soup surface: vortex dip, ripples, bubbles, gloss, submerged things
- [x] Things: throw, splash, bob, cook, break up, tint (ten kinds and their pieces)
- [x] Steam volume and puffs
- [x] Spoon and keyboard stir
- [x] Clear (drain and refill) and Reset
- [ ] Sound: simmer, pops, plops, stir scrape, squeak, drain (audioKit, muted by default)
- [ ] Quality: detail level, pixel ratio, slow-frame step, idle simmer at 30 fps, stop when hidden, reduced motion
- [ ] QA at 1280, 375 x 812, 812 x 375 in the browser pane
- [ ] Toy doc docs/toys/cauldron.md
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
