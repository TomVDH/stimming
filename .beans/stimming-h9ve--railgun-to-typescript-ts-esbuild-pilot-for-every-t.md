---
# stimming-h9ve
title: 'Railgun to TypeScript: .ts + esbuild pilot for every toy'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-17T05:17:45Z
updated_at: 2026-11-17T06:17:55Z
parent: stimming-3s8z
---

Tom, 2026-11-16: railgun goes to TypeScript as a proper mini-app; all toys follow. Must deploy to GitHub Pages as today. Path: .ts sources in railgun/src, esbuild bundles to railgun/main.js (git-ignored), built in the Pages workflow; importmap and CDN unchanged. Replaces decision 8 for ported toys.

- [x] Toolchain: tools/build.mjs, npm scripts, esbuild, Pages workflow step, .gitignore
- [x] Verbatim move of the inline script to src/main.ts; same frame (A/B against main equals main against itself)
- [x] Plain shader chunks to .glsl files beside their modules (10 chunks, 610 lines); spliced shaders stay in TypeScript
- [x] Typed state: 55 globals that several systems write move onto `state` (state.ts)
- [x] Split into 73 modules in load order (setup, world, sky, clouds, gun, rock, ship, fx, post, view, play, loop, sound, input, qa, main); the bundle matches the pre-split bundle line for line
- [x] Strict types: every module, 0 errors, no explicit any; the bundle stays byte-identical
- [x] Replay main's railgun commits made during the port: none; the cloud session parked its lines as docs/plans/railgun-cloud-layer.patch
- [x] Docs: code-health decision 8, typescript plan, AGENTS.md, PRODUCT.md, docs/standards code and process, railgun/src/README.md
- [x] Tom's look ("GO", "Yes, commit it", "Yes, commit both"); PR merged

## Handoff from the cloud session (stimming-fx4g), 2026-11-16

- main's railgun/index.html has 181/30 uncommitted lines and an untracked cumulus.js. Never revert them; keep them out of these commits. If committed on main, replay them into src/. If parked, they port after the merge.
- Module layout: main, state, loop, camera, qa; sky/ (dome, air, farbake); clouds/ (order, cards, storms, volumes, shafts, cumulus); gun/, rock/, fx/, sound/; ship, salvo, ranges.
- One depth-aware cloud pass (the layer and the storms at true distance) is a follow-up bean, not part of this refactor.
- stormcells.js is the cell lab's file (celllab.html); it stays outside src/.

## Summary of Changes

Railgun is the first TypeScript toy (Tom, 2026-11-16: every toy goes to TypeScript, deployed on GitHub Pages as today).

- Build: `tools/build.mjs` bundles each `<toy>/src/main.ts` with esbuild to `<toy>/dist/main.js` (git-ignored). `npm run dev` serves the repo on port 8000 and rebuilds; `npm run build` writes the bundles. The Pages workflow runs `npm ci` and `npm run build`, then publishes `dist/` and skips `src/`. The importmap and the CDN libraries stay.
- Railgun: the 12,206-line inline script is now 73 modules in `railgun/src/` (setup, world, sky, clouds, gun, rock, ship, fx, post, view, play, loop, sound, input, qa, main). `index.html` is markup only. `src/README.md` maps them.
- State: the 55 globals that several systems wrote live on one typed object, `state` (`state.ts`).
- Types: strict TypeScript in every module, 0 errors, no explicit `any`. `npm run check` runs the site check and the railgun check.
- Shaders: ten plain chunks (610 lines) are `.glsl` files beside their modules; spliced shaders stay in TypeScript.
- Rigs: `tools/clouds-check.mjs` reads `src/` and builds first; the commit guard covers `src/*.ts` and the cloud `.glsl` files.
- Docs: AGENTS.md, PRODUCT.md, docs/standards (code, process), docs/code-health.md decision 8, docs/plans/typescript.md.

Same behaviour at every step: the split bundle matched the single-file bundle line for line; strict types left the bundle byte-identical; play and salvo QA logs match main; stills A/B differ from main only as main differs from itself; clouds-check gives main's result on every check.

Not done, by choice: an `init()` per module in place of the load-order chain (it would turn about 900 consts into typed lets). Five unused values (`heaps`, `ring`, `rimPt`, `sceneReady`, `audition`) stay for a separate cleanup.
