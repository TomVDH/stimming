# Railgun source

TypeScript. `tools/build.mjs` bundles `main.ts` to `../dist/main.js`; `index.html` loads that bundle.
Run `npm run dev` from the repo root, then open <http://localhost:8000/railgun/>.

## Load order

Each module builds its part of the scene when it loads, so the order is fixed.
The first import of each module is the module before it (`// Load order: ...`). `main.ts` imports the last one.
A new module goes into that chain at the place it loads; never import a later module for its side effects.
Imports of later modules are fine for names used inside functions: the chain keeps them from loading early.
The chain starts at `setup.ts` and runs through the folders interleaved; read each file's first import.

## Modules

| Folder | Holds |
|---|---|
| `setup.ts` | Settings, the bar spec, the renderer, the scene, the camera |
| `state.ts` | `state`: the values that more than one module writes, with their types |
| `world/` | The gun's axis, shared uniforms, the ground, the far country, sun shadows |
| `sky/` | The sun, the K2 sky and haze, the air, the impact light, the sky dome |
| `clouds/` | Light shafts, draw bands, cloud cards, the storm probe, storm lightning |
| `gun/` | The gun, the spent case, arcs, the muzzle, motes, vents, the flap, the laser, the beacon |
| `rock/` | The asteroid, its trail, fragments, shards, the strike |
| `ship/` | The battleship, the hulks, the hit, the ship's shot |
| `fx/` | Dust, bursts, flares, the bow shock, rings, the bolt, the ion line, glints, volumes, the blast, hail |
| `post/` | Bloom, the grade, the post chain, post settings |
| `view/` | The sight, the camera, resize and draw |
| `play/` | Ambient events, the approach, the charge, the shot, reset |
| `loop.ts` | The frame loop and sleep |
| `sound/` | Every voice: wind, hum, surge, game over, rumble, samples, shot, hit, ship, motor |
| `input.ts` | Pointer and keys |
| `qa.ts` | `window.__qa`, the test hooks |
| `main.ts` | The first compile and the start |

## Types and shaders

- Strict TypeScript. `npm run check` runs tsc on `railgun/tsconfig.json`; it shows 0 errors.
- `state.ts` types every shared field. Each module exports the types other modules read.
- Plain shader chunks are `.glsl` files beside their module; esbuild imports each as text (`glsl.d.ts`).
- A shader that splices other chunks with `${}` stays in TypeScript.

## Rules

- A module writes only its own variables. A value that two modules write lives on `state`.
- The cloud modules are guarded: a change needs `clouds-check: PASS` or Tom's words (`tools/commit.sh`).
