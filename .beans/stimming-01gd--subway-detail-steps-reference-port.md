---
# stimming-01gd
title: 'Subway: detail() steps reference port'
status: completed
type: task
created_at: 2026-11-16T08:39:14Z
updated_at: 2026-11-16T09:40:00Z
parent: stimming-3s8z
---

Reference port for modularize adoption step 5 (docs/plans/modularize.md): detail() with steps. Subway (a Lab toy) drops its own slow-frame watch for shared/detail.js. Scope: the module proof only; no version, no toy doc, no type check for the page.

## Todo

- [x] Read the ladders: Subway, trainride, the 38 fps family
- [x] Add steps, fps and settle to detail(); default keeps the one-step drop
- [x] Port Subway
- [x] Timing proof: hand-fed frame times, before and after
- [x] Frame proof: real GPU and SwiftShader, 1280 and 375x812, clean console
- [x] Fog horn and fxlab re-run; npm run check
- [x] Update modularize.md step 5 and row 3, ports.md Proved modules
- [x] Commit and push (to branch feature/stimming-01gd, per Tom's 2026-11-16 call)

## Summary of Changes

- `shared/detail.js`: three new options. `steps` (rungs, default 1), `fps` (the slow mark, default 38), `settle` (seconds of grace after a step, on a fresh average; default 0). New getter `rung`. `onChange` now hears `(level, rung)`. `drop()` steps one rung, up to `steps`. With no options, the behaviour is the same as before.
- `subway/index.html`: `detail({ maxDpr: 2, budget: 2.6e6, onChange: () => resize(true) })` replaces `rung`, `watchdog()` and the `pixelRatio` call. `onQuality` now only wakes the loop; `detail()` resizes first.
- Subway has one rung, the same as `trainride`. The plan's "Subway's numbers" means exactly that.

## Proof

Harness in the session notes folder: `subway-qa.mjs`, `detail-regress.mjs`, `detail-unit.mjs`. A hand-driven clock (`requestAnimationFrame`, `performance.now`, event `timeStamp`), seeded `Math.random`, frame gaps fed by hand. The before run serves the HEAD page through a route.

- Timing, real GPU, 1280 and 375x812: the step falls on the same frame before and after in every load run. 30 fps: frame 181. 60 fps then 30 fps: 369. Flicker: 322. 37.5 fps: 226. 60 fps and 38.5 fps: no step.
- One change, on purpose: after a new quality choice, the old copy stepped down again on the next frame (frame 251), also when every later frame was fast. It reset `rung` but kept `slowT` and the old average. `detail()` clears the watch: on slow frames the step comes back after 4 + 2 s (frame 429); on fast frames it does not come back.
- Frames: 0 pixels differ in 10 of 10 frames on the real GPU (RTX 3070) and 6 of 6 on SwiftShader, at 1280 and 375x812, before and after each step. Console clean in every run.
- Real GPU through ANGLE OpenGL, not D3D11: in headless Chromium on D3D11, Subway never finishes its compile (90 s, before and after alike), and Train ride blocks the main thread at 12 s. ANGLE OpenGL and SwiftShader are ready in about 4 s. See `stimming-nh74`.
- `detail()` with no options: Fog horn and fxlab step on the same frame (211) before and after; 0 pixels differ in 4 of 4 frames; console clean.
- Browser unit check: `detail()` matches the copies frame for frame in 28 of 28 runs. Foil's family `{ steps: 2 }`, chocolate's `{ steps: 3, settle: 2 }`, stone's `{ steps: 2, settle: 2 }`, Subway's one step. Seven frame-time runs each, with seeded jitter. A new quality choice clears all three rungs. Three `drop()` calls on `steps: 2` stop at rung 2.
- `npm run check` passes.

## Does this fix the audit's bugs?

| Bean | Toy | Fixed by adoption? |
|---|---|---|
| `stimming-gty9` | `bismuth` | Yes. It has no watch: `detail({ steps: 1 })` gives one, and it reads `D.rung`. Its sizing stays `fitCanvas` with `maxDpr: 1` on the step, so on High it falls to 1x, where `D.dpr()` falls to Standard. Its chat picks one |
| `stimming-3vjf` | `bread` | Yes. Its reads fit `detail({ maxDpr: 1.5, budget: 1.8e6, steps: 2 })`. Its K2 siblings use the window rule, which `detail()` does not hold; Bread gets the 38 fps rule |
| `stimming-iizo` | `windfarm` | Yes. A 38 fps ladder: `{ steps: 3, settle: 2 }`. Its rungs switch passes off; `onChange` must switch them back on a reset |
| `stimming-h9xj` | `motorway` | No. It uses the window rule (38 or 22 fps by liveliness). The fix stays a one-line reset in `onQuality` |
| `stimming-8jxr`, `stimming-x3eq` | `harp`, `zipper` | No. A frame counter (`raw > 30 ms`, up and down, over 20 or 24). The fix stays local |
| `stimming-k8rj` | `sand` | No. A 30-frame mean over 26 ms, only while drawing. The fix stays local |
