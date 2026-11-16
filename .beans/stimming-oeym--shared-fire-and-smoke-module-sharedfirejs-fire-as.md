---
# stimming-oeym
title: 'Shared fire and smoke module: shared/fire.js, Fire as reference port'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:35:39Z
updated_at: 2026-11-16T09:42:16Z
parent: stimming-3s8z
---

Tom, 2026-11-16, decision 13 in docs/code-health.md: Fire's flame and smoke (its K3 volume fluid, three.js 0.186 WebGPU and TSL) become one shared module that other toys reuse.

## Checklist
- [x] Map Fire's flame and smoke against the page's own parts
- [x] Diff Ink's copy against Fire's and list the drift
- [x] Design shared/fire.js: namespaces passed in, small API, JSDoc types, npm run check passes
- [x] Port Fire onto the module, no other change
- [x] Prove the same frame: real GPU, 1280 and 375 x 812, run-to-run noise first
- [x] Plan the reach: every fire, flame, smoke or exhaust toy, and the options for WebGL Scene toys
- [x] Record: ports.md Proved modules, modularize.md K3 row, AGENTS.md Layout line

## Summary of Changes

- `shared/fire.js` (new, 664 lines): `createFire({ THREE, TSL, curl, renderer })` with `u`, `setEmitters`, `volume`, `setSteps`, `compile`, `step`, `clear`, `dispose`, and `fireRamp` / `tintRamp`. It imports nothing; the toy passes the namespaces. JSDoc types; `npm run check` passes. `@types/three` 0.170 lacks `Storage3DTexture` and `interleavedGradientNoise`, so the namespaces are typed loosely.
- `fire/index.html`: uses the module and changes nothing else. 1,799 to 1,342 lines.
- Proof: the 54 WGSL modules are the same text in the same order (one buffer name differs, a node id). The sim races in its emit pass, so frames are compared against run-to-run noise: four runs a side, 1 of 57 look metrics past p < 0.05. Real GPU, WebGPU on D3D12, 1280 and 375 x 812, clean console.
- `docs/plans/fire-smoke.md`: the map, the design, the proof, Ink's drift, every fire and smoke toy, and the WebGL options. Recommendation: WebGPU only now; a GLSL twin from `cauldron` only if Tom wants a sim fire in a WebGL toy.
- Rows in `docs/plans/ports.md` (Proved modules) and `docs/plans/modularize.md` (K3), one line in `AGENTS.md`.
