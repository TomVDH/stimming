---
# stimming-x1q5
title: 'Bismuth: gl.js reference port (shared/gl.js, new)'
status: completed
type: task
created_at: 2026-11-15T19:02:17Z
updated_at: 2026-11-15T19:02:17Z
parent: stimming-3s8z
---

Reference port for modularize adoption step 4 (docs/plans/modularize.md). The new module shared/gl.js takes the raw WebGL2 plumbing; Bismuth (a Lab toy) drops its copies.

Scope: the module and its proof only. Bismuth is a Lab toy: no version, no toy doc, no type check for its page. Its dead rung (stimming-gty9) belongs to the detail() step and stays.

## Todo

- [x] Read family A copies; skim B (trails), C (rain), environment.js, glow.js
- [x] Write shared/gl.js with JSDoc types; npm run check passes
- [x] Capture before frames, real GPU and SwiftShader
- [x] Port Bismuth to gl.js
- [x] After frames, pixel diff, console, context loss
- [x] Update modularize.md, ports.md, AGENTS.md
- [x] Commit and push

## Summary of Changes

- `shared/gl.js` (new): `program`, `linked` (the parallel-compile poll, the error log, the uniform map), `uniforms`, `TRI_VS`, `tri`, `to`, `target(gl, w, h, { format, filter, depth, mips, clear, check })`, `renderable`, `msTarget`, `free` (targets, pairs, multisampled), `bind` (a target or a bare texture), `nextFrame`, `onContextLoss`. JSDoc types; `npm run check` passes.
- `bismuth/index.html`: its `compile`, `locate`, `nextFrame`, `target`, `msTarget`, `free`, `bind`, `full` and its triangle shader are gone; it imports them from `gl.js`. 1,436 to 1,343 lines (93 lines out). Nothing else changes; the dead `rung` (`stimming-gty9`) stays.
- Proof, headless Playwright: seeded `Math.random`, a hand-driven clock, no parallel compile. Runs: 1280x800 (click, hold, circle, H, Space hold, long press, Hopper, Cluster, Heat, Argon, Turn off, X, Reset), 375x812 (click, hold, H, X), 812x375 (hold), reduced motion, sound on, context loss. 35 canvas frames per run.
- Real GPU (RTX 3070, ANGLE d3d11): 0 pixels differ in 35 of 35 frames. Two before runs also give 0, so the harness has no noise. Every action changes 87 to 100 % of the pixels, so the check has teeth.
- SwiftShader: 0 pixels differ in 35 of 35 frames.
- Console: clean on the GPU. SwiftShader logs 4 "GPU stall due to ReadPixels" warnings, before and after; the harness's `toDataURL` reads cause them.
- Context loss (`WEBGL_lose_context`), before and after alike: Bismuth has no handler. The lost event is not default-prevented, so the canvas goes black and `restoreContext()` is refused ("context restoration not allowed"). The page throws nothing; the bar stays live.
- A browser unit check of `gl.js` (GPU and SwiftShader) covers what Bismuth does not use: `onContextLoss` with lose, restore and rebuild, a throwing rebuild reaching `failed`, a failed link with its log, `check`, `renderable`, mips, pairs, `limit`. Finding: extensions die with the context too, so `restored` must get them again (in the JSDoc).
- Found on the way: `stimming-f32n`, a held press queues one extra frame callback per frame.
- Harness: `bismuth-qa.mjs` and `gl-unit.mjs` in the session notes folder.
