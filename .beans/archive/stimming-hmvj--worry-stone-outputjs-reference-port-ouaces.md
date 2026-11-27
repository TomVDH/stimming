---
# stimming-hmvj
title: 'Worry stone: output.js reference port (ouAces)'
status: completed
type: task
priority: normal
created_at: 2026-11-15T18:21:27Z
updated_at: 2026-11-15T18:28:36Z
parent: stimming-3s8z
---

Reference port for modularize adoption step 3 (docs/plans/modularize.md). Stone's shader copy of the film curve becomes the shared GLSL in shared/output.js.

Scope: the module proof only. Stone is a Lab toy: no version, no toy doc, no type check. The shell stays as it is.

Finding: Stone has no srgb() function. Its composite ends with pow(c, 1/2.2), a plain 2.2 gamma, not ouSrgb. The port keeps the 2.2 gamma; ouSrgb would change the picture.

Proof: same frame. Headless Playwright before and after, seeded Math.random, a hand-driven clock (requestAnimationFrame, performance.now, event timeStamp), real GPU (ANGLE d3d11, RTX 3070) and SwiftShader. 1280x800, 375x812, 812x375, reduced motion, sound on. Clean console.

## Todo

- [x] Compare aces with ouAces, word for word
- [x] Capture before frames
- [x] Replace aces with ouAces from OUTPUT
- [x] After frames and pixel diff, GPU and SwiftShader
- [x] Update modularize.md step 3, ports.md, shared-shaders.md
- [x] Commit and push

## Summary of Changes

- `stone/index.html`: imports `OUTPUT` from `shared/output.js` and pastes it into the composite shader. The local `aces()` is gone; the call is `ouAces()`. The `pow(c, 1/2.2)` gamma stays.
- Text check: `aces()` equals `ouAces()` byte for byte, apart from the name. Stone has no `srgb()`, so this port proves `ouAces` only. `dijkstra` holds the exact `ouSrgb` text; `lava` and `pool` write `12.92 * c`.
- Proof, headless Playwright: seeded `Math.random`, a hand-driven clock (`requestAnimationFrame`, `performance.now`, event `timeStamp`), no parallel compile. Runs: 1280x800 (light, rub, splash, wet, agate, agate rub, obsidian, new stone), 375x812 (rub, splash, wet), 812x375 (rub), reduced motion (rub), sound on (rub, splash).
- Real GPU (RTX 3070, ANGLE d3d11): 0 pixels differ in all 25 GL frames. Two before runs also give 0, so the harness has no noise.
- SwiftShader: 0 pixels differ in all 25 GL frames.
- Full-page shots: 3 of 45 differ (max 14/255) where the canvas is equal. The cause is the stone picker and key strip CSS fades, which run on real time.
- Console: clean on the GPU. SwiftShader logs 4 "GPU stall due to ReadPixels" warnings, the same before and after; the harness's `toDataURL` reads cause them.
- Docs: modularize.md step 3 row, a Proved modules table in ports.md, Stone's row in shared-shaders.md (it has no `srgb()`).
- Harness: `stone-qa.mjs` and `sidebyside.mjs` in the session notes folder.
