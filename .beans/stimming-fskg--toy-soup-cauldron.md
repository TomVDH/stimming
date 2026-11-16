---
# stimming-fskg
title: 'Toy: Soup cauldron'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:41:30Z
updated_at: 2026-11-16T09:47:09Z
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
- [x] Sound: simmer, pops, plops, stir scrape, squeak, drain (audioKit, muted by default)
- [x] Quality: detail level, pixel ratio, slow-frame step, idle simmer at 30 fps, stop when hidden, reduced motion
- [x] QA at 1280, 375 x 812, 812 x 375 in the browser pane
- [x] Toy doc docs/toys/cauldron.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `cauldron/index.html`: a raw WebGL2 Lab toy on Bar v2. One ray-cast pass draws the pot (belly, rolled rim, three legs, inner wall), the soup heightfield (stir dip, funnel, ripples, bubble caps) and the things as SDFs. A CPU stable-fluids grid (64 x 64) carries the stir; a GPU dye field holds the colour in weighted OKLab, with fat and glitter; flame cards, sparks and marched steam run at half size; the shared bloom chain, grade and output curve finish the frame.
- Ten things in a fixed throw order; each splashes, bobs, cooks, breaks up (coins, rings, fish bones, cubes, small stars and glitter, chunks, slices) and tints the soup. The duck and the boot never cook through.
- Bar: + Thing (T), Clear (C, drain and refill), Fire slider, key strip, Settings (Simmer sound, Quality, Reset), Dev (Exposure, Bloom). Arrow keys stir.
- Sound through audioKit, muted by default: simmer bed, fire rumble and crackle, slosh, spoon scrape, bubble pops, plops, a duck squeak, a star chime, drain glugs.
- Performance: detail level and slow-frame step, up to 60 fps while a hand works, a 30 fps simmer otherwise, stops when hidden; reduced motion stops the simmer.
- `docs/toys/cauldron.md`: the toy doc. Handoff files in the lab10 scratchpad: toys-entry.json, menu-li.html, menu-icon.js.

## Round 2 (2026-11-16)

- [x] Fire's solver in WebGL2: a 48x56x48 grid in a 2D atlas, curl, advect, buoyancy, turbulence, confinement, Jacobi, project, dye with a coal bed
- [x] The belly and legs are solids; hot gas clings to the iron and climbs it
- [x] Fire volume march: Fire's wood ramp, emission and smoke light; steam takes Fire's smoke light
- [x] Iron lit by the solver's heat; flagstone floor lit through a bump normal; logs removed
- [x] Wind gusts at high fire; cursor wobble; Dev rows for camera and fire bed
- [x] WebGPU probe of Fire's own engine (cauldron/probe-gpu.html); its expansion source moved into the WebGL2 solver
- [x] PBR and bump on the iron: GGX, split-sum fit, hammered dimples that wrap the pot, grease streaks, worn rim
- [x] Roughness noise per material: iron streaks, spoon grain, a fine noise on each thing's skin
- [x] Soupy marbled dye field: Catmull-Rom advection clamped to its texels, a fine stir curl, plumes fold in nearby soup, ribbons along the stir, seams where colours meet
- [x] Tray picker (Mix, ten things, four liquids) and pours: cream, squid ink, chilli oil, saffron; the stream digs a dent, rings out and drops in its own colour
- [x] Toy doc

- [x] Soup film layers: a skin that sets on calm thick soup and cream (matte, wrinkled), wet broth, glassy fat with a faint oil-film rainbow
- [x] WebGPU fire parked (Tom, 2026-11-16): cauldron/gpufire.js runs Fire's engine over the pot only with ?fire=gpu; the toy ships the WebGL fire

- [x] Neater cooking: things shrink a touch, darken and gloss as they cook; a split thing shrinks away while its pieces grow in and drift apart; melting pieces fade into the soup's colour; calmer skins, no speckle

- [x] Steam pass: steam rises over the boil's plumes, Fire's detail erodes it into threads, it stays thin at high fire, and it leans with the wind


## Round 2 summary

Fire's solver in WebGL2 under the pot; PBR hammered iron; flagstone floor; Add tray with four liquids; marbled soup with film layers; neater cooking; steam pass. WebGPU fire parked behind ?fire=gpu. Next: a performance pass and an icon pass, then Tom promotes the toy to the main shelf.

## Soup surface

- [x] Depth absorption: light dies with depth, tinted by the soup's hue; thin broth shows sunk things and the spoon, thick soup, skin and fat close it up (Dev: Soup density)
- [ ] Tom reviews depth absorption, then PR (stimming-tao4)
- [ ] Open ideas, one bean each: fire glow (p5hq), viscosity (hupj), fat beads (xce4), skin rafts (1gin), wall scum (z7ca), bubble rings (i0dx), boil by fire (ycif)
- [ ] Merge origin/main before the PR
- [ ] PR to main
