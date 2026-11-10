---
# stimming-ssrh
title: Shared shader library
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T06:18:01Z
updated_at: 2026-11-10T06:23:28Z
---

Reusable shader effects that several toys share. Each effect is one ES module in `shared/`: GLSL source strings and a small JS helper, in the style of `shared/glassrain.js`. It works in raw WebGL2 and in a three.js `ShaderMaterial`. Some effects come from Havoc (Buoy Business).

Tom, Train Ride chat, 2026-11-09: "we also need to spin off sub session into REUSABLE shader effects that are shared between several toys; some of these too will be sourced from havoc / buoy business".

Plan: `docs/plans/shared-shaders.md`.

## Checklist

- [x] Take stock in Stimming: shared shaders and hand copies
- [x] Take stock in Havoc: Buoy Business TSL shaders and classic water
- [x] Write `docs/plans/shared-shaders.md`: table and ranked list
- [ ] Tom picks the first effect
- [ ] Build that effect in `shared/`
- [ ] A/B panel on a dev page (noindex)
- [ ] Check in the browser pane
- [ ] Name the toys that can adopt it

## Rules

- One effect at a time. Tom picks.
- No toy moves onto a shared effect here. Each toy's own chat does that.

## Notes

- 2026-11-09: stock taken. Ranked list: lens flare, grade, water surface, night sky and haze, output. Recommended first: lens flare. Waits on Tom.
- Havoc `src/engine/tsl` (`hvc-01d1`) is still a plan; its shaders sit in `src/view` and `src/engine/post.js`.
- Dev page for the modules: `fxlab/` (noindex), not built yet.
