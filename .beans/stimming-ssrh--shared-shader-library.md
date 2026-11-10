---
# stimming-ssrh
title: Shared shader library
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T06:18:01Z
updated_at: 2026-11-10T09:43:08Z
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
- [ ] Tom picks the next effect (water surface, night sky and haze, output)

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
