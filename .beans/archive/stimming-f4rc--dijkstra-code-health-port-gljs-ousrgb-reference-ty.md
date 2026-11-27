---
# stimming-f4rc
title: 'Dijkstra: code-health port (gl.js, ouSrgb reference, type check, toy doc)'
status: completed
type: task
priority: normal
created_at: 2026-11-16T08:19:47Z
updated_at: 2026-11-16T09:29:03Z
parent: stimming-3s8z
---

Port Dijkstra (main shelf No. 36, raw WebGL2, family A) per its row in docs/plans/ports.md. First main shelf toy on gl.js; reference port for ouSrgb.

## Todo

- [x] Capture before frames, real GPU and SwiftShader
- [x] Replace compile, locate, target, free, bind, to, tri, TRI with gl.js; 3 s poll to linked limit
- [x] Add onContextLoss
- [x] Use OUTPUT (ouAces, ouSrgb, ouHash) in the final shader
- [x] Move the module script to dijkstra/main.js; add dijkstra/*.js to tsconfig; npm run check to 0
- [x] After frames, pixel diff, console, interactions, context loss
- [x] Write docs/toys/dijkstra.md
- [x] Update ports.md (Proved modules, row 36) and modularize.md
- [x] Commit and push

## Summary of Changes

- `dijkstra/`: compile, locate, nextFrame, target, free, bind, to, tri and the TRI shader go; `gl.js` gives them. The 3 s poll is `linked(..., { limit: 3000 })`. The mask's depth-stencil buffer stays by hand, as `mask.depth`, so `free` deletes it.
- `FINAL_FS` pastes `OUTPUT`: `ouAces`, `ouSrgb` and `ouHash` replace `aces`, `srgb` and `hash`, same text. The 0.012 dither stays. Dijkstra is the reference port for `ouSrgb`.
- `onContextLoss`: the toy now recovers from a lost context. Before, the restore was refused and the canvas stayed black.
- The module script moves to `dijkstra/main.js`; `dijkstra/*.js` joins `tsconfig.json`. `npm run check`: 11 errors to 0, JSDoc types and casts only.
- Lines: 1,984 to 1,946 for the port; then `index.html` 69 and `main.js` 1,886.
- Toy doc `docs/toys/dijkstra.md`. Plan rows in `ports.md` and `modularize.md`.
- Proof, headless Playwright, seeded random, clock by hand: 0 pixels differ in 53 of 53 comparable canvas frames on the real GPU (RTX 3070, D3D11) and on SwiftShader, at 1280 x 800, 375 x 812, 812 x 375, reduced motion and sound on. Two before runs also give 0. The first frame after a restore equals the frame before the loss, 0 pixels, also after two losses. No audio context before or after. Console clean.
- Found: the page has no sound, but `toys.json` says it has (`stimming-e94j`).
