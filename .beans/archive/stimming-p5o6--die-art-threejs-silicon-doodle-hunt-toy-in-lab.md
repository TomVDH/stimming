---
# stimming-p5o6
title: 'Die art: three.js silicon doodle hunt toy in Lab'
status: completed
type: feature
created_at: 2026-11-27T06:58:31Z
updated_at: 2026-11-27T07:08:00Z
---

Independent three.js execution of the silicon doodle hunt toy (`dieart`) in the Lab (Tom, 2026-11-26).

- [x] Build modular TypeScript three.js implementation in `dieart/src/` (`doodles.ts`, `materials.ts`, `wafer.ts`, `post.ts`, `sound.ts`, `main.ts`) and `dieart/index.html`
- [x] Add 10 handcrafted multi-layer 3D silicon doodles hidden across realistic VLSI die zones (SRAM, ALU, spiral inductors, clock spine, bond-pad corridors, metal-fill courtyards)
- [x] Implement 4 metallurgical illumination modes (Brightfield, Darkfield, DIC, UV), smooth objective zoom (5x to 100x), focus rack, pan/tilt stage, discovery lock-on, scan hint, and Web Audio synth
- [x] Add `shared/emblems/dieart.svg`, Lab entry in `toys.json`, and animated Lab tile in `index.html`
- [x] Build with `npm run build`, strict type-check `dieart/tsconfig.json`, and verify `toys.json` and `index.html` syntax

## Summary of Changes
- Created `dieart/` TypeScript + three.js Lab toy (`dieart/index.html`, `dieart/tsconfig.json`, `dieart/src/materials.ts`, `dieart/src/doodles.ts`, `dieart/src/wafer.ts`, `dieart/src/post.ts`, `dieart/src/sound.ts`, `dieart/src/main.ts`).
- Implemented physical SiO2 thin-film interference, Bragg diffraction SRAM arrays, chamfered instanced VLSI metal stack (Poly/M1/M2/M3/M4 + curved 3D gold wirebonds + octagonal copper spiral inductors), 10 extruded 3D mask doodles across layers, 4 metallurgical optical modes (Brightfield, Darkfield, DIC, UV), focus-plane bokeh/bloom post-processing, interference scan pulse, and muted-by-default Web Audio synth on Bar v3.
- Added `shared/emblems/dieart.svg`, registered `dieart` in `toys.json` (Lab), and added the animated `dieart` tile and hover loop to `index.html`.
- Verified with `npm run build` (`dieart/dist/main.js`, 82.1 KB), `npx tsc --noEmit -p dieart/tsconfig.json` (0 errors), `toys.json` JSON parse, and `index.html` inline script syntax check.
