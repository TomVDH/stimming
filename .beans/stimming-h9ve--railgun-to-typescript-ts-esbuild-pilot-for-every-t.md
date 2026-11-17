---
# stimming-h9ve
title: 'Railgun to TypeScript: .ts + esbuild pilot for every toy'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-17T05:17:45Z
updated_at: 2026-11-17T05:26:23Z
parent: stimming-3s8z
---

Tom, 2026-11-16: railgun goes to TypeScript as a proper mini-app; all toys follow. Must deploy to GitHub Pages as today. Path: .ts sources in railgun/src, esbuild bundles to railgun/main.js (git-ignored), built in the Pages workflow; importmap and CDN unchanged. Replaces decision 8 for ported toys.

- [x] Toolchain: tools/build.mjs, npm scripts, esbuild, Pages workflow step, .gitignore
- [x] Verbatim move of the inline script to src/main.ts; same frame (A/B against main equals main against itself)
- [ ] Shaders to src/shaders/*.glsl
- [ ] Modules by system with a typed State; strict types
- [ ] Replay main's railgun commits made during the port
- [ ] Docs: code-health decision 8, typescript plan, AGENTS Running and Publishing
- [ ] Tom's look; PR merged

## Handoff from the cloud session (stimming-fx4g), 2026-11-16

- main's railgun/index.html has 181/30 uncommitted lines and an untracked cumulus.js. Never revert them; keep them out of these commits. If committed on main, replay them into src/. If parked, they port after the merge.
- Module layout: main, state, loop, camera, qa; sky/ (dome, air, farbake); clouds/ (order, cards, storms, volumes, shafts, cumulus); gun/, rock/, fx/, sound/; ship, salvo, ranges.
- One depth-aware cloud pass (the layer and the storms at true distance) is a follow-up bean, not part of this refactor.
- stormcells.js is the cell lab's file (celllab.html); it stays outside src/.
