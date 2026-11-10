---
# stimming-ssrh
title: Shared shader library
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T06:18:01Z
updated_at: 2026-11-10T10:36:34Z
---

Reusable shader effects that several toys share. Each effect is one ES module in `shared/`: GLSL source strings and a small JS helper, in the style of `shared/glassrain.js`. It works in raw WebGL2 and in a three.js `ShaderMaterial`. Some effects come from Havoc (Buoy Business).

Tom, Train Ride chat, 2026-11-09: "we also need to spin off sub session into REUSABLE shader effects that are shared between several toys; some of these too will be sourced from havoc / buoy business".

Plan: `docs/plans/shared-shaders.md`.

## Checklist

- [x] Take stock in Stimming: shared shaders and hand copies
- [x] Take stock in Havoc: Buoy Business TSL shaders and classic water
- [x] Write `docs/plans/shared-shaders.md`: table and ranked list
- [x] Tom picks the first effect: lens flare
- [x] Build that effect in `shared/`: `shared/flare.js`
- [x] A/B panel on a dev page (noindex): `fxlab/`
- [x] Check in the browser pane
- [x] Name the toys that can adopt it
- [x] Grade: `shared/grade.js`, panel in `fxlab/`, checked
- [x] `fxlab/` opens on one scene with every shared shader on a switch (Tom: rain drops, fog on glass, the combo)
- [x] Wet glass as one group: `shared/wetglass.js`, one card in `fxlab/`, checked against Train Ride
- [x] Water surface, first cut: `shared/water.js`, a card in `fxlab/`
- [x] Rain rings on water: `wtRings()` in `shared/water.js`, a slider in `fxlab/`
- [x] `shared/weather.js`: one value drives glass and water; Weather slider in `fxlab/`
- [x] Bundles follow the site quality setting: `shared/detail.js`, `waterDetail`, `wetGlassDetail`, a Quality row in `fxlab/`
- [x] Night sky and haze: `shared/sky.js` with `skyAt(hour)`, a card in `fxlab/`, three copy checks
- [x] Tom picks the first adopter: Train Ride. Brief handed to the Train Ride chat
- [ ] Train Ride adopts swaps 1 to 4 (its own chat)
- [x] Output: `shared/output.js`, a card in `fxlab/`, two copy checks
- [x] Rain and snow in the air: `shared/precip.js`, a card in `fxlab/`
- [x] Cloud deck: `skClouds()` in `shared/sky.js`, a slider in `fxlab/`
- [ ] Tom picks what comes next (light orbs and bloom, water extras, more adopters)

## Rules

- One effect at a time. Tom picks.
- No toy moves onto a shared effect here. Each toy's own chat does that.

## Notes

- 2026-11-09: stock taken. Ranked list: lens flare, grade, water surface, night sky and haze, output. Recommended first: lens flare. Waits on Tom.
- Havoc `src/engine/tsl` (`hvc-01d1`) is still a plan; its shaders sit in `src/view` and `src/engine/post.js`.
- Dev page for the modules: `fxlab/` (noindex), not built yet.

- 2026-11-09: `shared/flare.js` built. `fxlab/` checks five copies (walker, window, bread, fireworks and meteor) against it: each matches within 1 / 255 in raw WebGL2 and in a three.js ShaderMaterial. No toy adopted it; the plan lists how each one can.

- 2026-11-10: `shared/grade.js` built (Tom: "Build grade"). `fxlab/` checks five grade copies (kit, viaduct, subway, launch, frietkot): each matches within 1 / 255 in raw WebGL2. In three.js, kit, launch and frietkot match; viaduct and subway hash `vUv * uRes`, so the lab draws other grain of the same strength there. No toy adopted it.

- 2026-11-10: Tom found the A/B page unclear and asked for rain drops, fog on glass and the combination. `fxlab/` now opens on "All effects": one window scene, a card per shared shader (glassrain rain, glassrain fog, bokeh, flare, grade), look buttons. The A/B check is the second mode.

- 2026-11-10: Tom: glass with drops, fog, directional drops and scatter usually go together. `shared/wetglass.js` makes the pane in one call (`wgPane`, `wgView`, `wetGlassMotion`); the lab has one Wet glass card. It matches Train Ride within 1 / 255.
- 2026-11-10: `shared/water.js` built (Tom: "Water surface"): Wind farm swell, Beach walker chop and glitter, Buoy Business wave sets. The lab scene is now a harbour. No toy adopted either.

- 2026-11-10: Tom: "we will use bundled shaders to quickly pump out responsive and reactive environments". Recorded as the Direction section of the plan. Rain rings ported from Buoy Business (`sea.js:585`). `shared/weather.js` is the first driver.

- 2026-11-10: `shared/sky.js` built (Tom: "Night sky and haze"). The kit stars, Coast and meteor sky and the kit haze match exactly. `skyAt(hour)` drives the palette; night, blue hour and last light are Coast and meteor palettes; day and dawn are a first proposal. The lab scene now takes its sky, stars and haze from the module.

- 2026-11-10: `shared/detail.js` built (Tom: "Quality setting"). One level from the site quality and a slow-frame watch (Subway numbers). Water takes an octave and ring-layer budget; the wet pane a bokeh target scale. About twenty toys carry that watch by hand and could adopt it.

- 2026-11-10: Tom picked Train Ride as the first adopter. The brief is in the plan (First adopter) and in the shared notes folder (`trainride-adoption.md`). Four swaps keep the picture; water, flare and sky change the look and wait for Tom. The lab check shaders now include every module, so all compile together in three.js.

- 2026-11-10: `shared/output.js` built (Tom: "Build output"): film curve, soft knee, sRGB, dither. Every ranked effect of the first plan is now built: flare, grade, water, sky and haze, output.

- 2026-11-10: Tom: "Keep building". Built `shared/precip.js` (screen-space rain and snow) and a cloud deck in `shared/sky.js`; `weather.js` now drives air and clouds too. The lab scene first ran at 22 ms a frame with clouds in every mirror tap; mirroring the sky once brought it back to 8 ms.
