# Port list: main shelf at v1.5

Status: active · Bean: `stimming-3s8z`

Tom, 2026-11-15: every main shelf toy can be ported, and each one starts at version `1.5` (`version` in `toys.json`), no matter its state before.
Lab toys hold `version: null` and wait.
The decisions behind each column are in [code-health.md](../code-health.md).

## Every toy gets these

| Work | Plan |
|---|---|
| A toy doc in `docs/toys/<id>.md` | [toy-docs.md](toy-docs.md) |
| TypeScript: the module script moves to `<id>/src/main.ts`, esbuild bundles it to `<id>/dist/main.js` (decision 8, 2026-11-16; Railgun is the pilot). Toys ported before that (`foghorn`, `eyes`, `rain`, `dijkstra`) have a checked `<id>/main.js`: the `.ts` step is still to do | [typescript.md](typescript.md) |

## Rules

- One toy at a time, in that toy's own chat, when Tom picks it.
- A port must give the same frame and the same sound. Check it in headless Playwright at 1280 px and 375 px.
- Only approved modules: `audioKit()`, `oklchLinear`, `output.js`, `gl.js`, `detail()`, `fitRenderer`, `noise.js`. Rows marked "waits" need Tom first.
- Tom sets the version after a port. Nothing raises it on its own.

## Proved modules

A toy adopts a module only after its reference port proves it ([modularize.md](modularize.md), Adoption order).

| Module | Reference port | Proof |
|---|---|---|
| `audioKit()` | `eyes`, 2026-11-15 (`stimming-4u0b`) | The hand copy goes; first frame pixel-equal, same sound. SwiftShader only |
| `oklchLinear` | `rain`, 2026-11-15 (`stimming-zaqb`) | Not bit-equal: the copies round the matrix to 10 digits. 2 to 31 pixels per frame move by 1/255. Real GPU and SwiftShader. Tom accepts this as the same frame (2026-11-15): ready for the toys below |
| `output.js`: `ouAces` | `stone`, 2026-11-15 (`stimming-hmvj`) | Same text; 0 pixels differ in 25 frames, real GPU and SwiftShader. Ready for the toys below that copy `aces()` |
| `gl.js` | `bismuth`, 2026-11-15 (`stimming-x1q5`) | Its copies go; 0 pixels differ in 35 canvas frames on the real GPU and on SwiftShader. Bismuth also uses `onContextLoss` and recovers from a lost context; a browser unit check covers the rest. Ready for the family-A raw toys; B and C need the changes in modularize.md step 4. First main shelf adopter: `dijkstra`, 2026-11-16, 0 pixels in 53 frames, with `limit` and `onContextLoss` |
| `output.js`: `ouSrgb` | `dijkstra`, 2026-11-16 (`stimming-f4rc`) | Same text; 0 pixels differ in 53 canvas frames, real GPU and SwiftShader. Ready for the toys that copy `srgb()` without a clamp (`beer`, `bismuth`, `chocolate`, `lichtenberg`, `rubens`). The clamped copies (`kaleido`, `neon`, `rain`, `chladni`, `eyes`) keep their clamp |
| `detail()` with `steps` | `subway`, 2026-11-16 (`stimming-01gd`) | Its watch goes; 0 pixels differ in 16 frames on the real GPU and on SwiftShader, at 1280 and 375 x 812. Each step falls on the same frame under hand-fed frame times. A new quality choice now restarts the watch; the old copy stepped down again at once. A browser unit check matches the 2- and 3-rung copies frame for frame (`steps`, `settle`). Ready for the 38 fps ladders in modularize.md step 5; the window rule and the frame counters keep their own |
| `output.js`: `ouKnee`, `ouDither` | Not yet | Neither Stone nor Dijkstra has them. Dijkstra's dither steps by 0.012, not 1/255, so it stays by hand |
| `fire.js` (fire and smoke, TSL) | `fire`, 2026-11-16 (`stimming-oeym`) | Not bit-stable: the emit pass races, so two runs of the old page differ on 43 to 99% of pixels. The 54 WGSL modules are the same text in the same order; one buffer name differs (a node id). Frame 3: 1/255 on 712 pixels (old against old: 624). Look metrics over four runs a side: 1 of 57 past p < 0.05, fewer than chance. Real GPU (WebGPU, D3D12), 1280 and 375 x 812, clean console. Fire loses 457 lines. Ready for `spark` (needs a grid per quality step); not for `ink` (a fork). WebGL toys: `docs/plans/fire-smoke.md` |

## The list

Key: **Type** is the stack type now, then the proposed one. **Map** means the importmap holds only the three.js entries; paste the standard text.

| No. | Toy | Type | Map | Shared modules | Other |
|---|---|---|---|---|---|
| 1 | `morpher` | Scene, to **Shader** | Map | `detail()`, `oklchLinear` | |
| 2 | `pop` | Scene, to **Shader** (last) | | | Fail line; bloom needs `bloomPass` (waits) |
| 3 | `fidget` | Sketch | | `oklchLinear` | |
| 4 | `domino` | Scene | Map | `oklchLinear` | |
| 5 | `pins` | Scene | Map | `detail()`, `fitRenderer` | |
| 6 | `galaxy` | Compute | | `audioKit()`, `whenVisible`, `pixelRatio`; `voices.js` and `pointer.js` wait | Still frame without WebGPU |
| 7 | `prism` | Scene, to **Shader** (after a check) | | | Bug `stimming-68g3` |
| 8 | `kaleido` | Shader | | `gl.js`, `oklchLinear`, `output.js` | |
| 9 | `ferro` | Scene | Map | `detail()` | |
| 10 | `neon` | Shader | | `gl.js`, `output.js` | |
| 11 | `magnet` | Scene | Map | `detail()` | |
| 12 | `soap` | Scene | Map | `detail()`, `oklchLinear` | |
| 13 | `glass` | Scene | | `detail()` | Bug `stimming-syu9` |
| 15 | `chladni` | Shader | | `gl.js`, `oklchLinear`, `output.js` | |
| 16 | `pendulum` | Scene | Map | `detail()`, `oklchLinear` | |
| 17 | `pool` | Shader | | `output.js` | |
| 18 | `putty` | Shader | | `noise.js` | |
| 19 | `scope` | Shader | | `gl.js`, `noise.js` | |
| 20 | `walker` | Scene | Map | | |
| 21 | `fire` | Compute | | | Still frame without WebGPU |
| 22 | `rain` | Shader | | `gl.js`, `oklchLinear`, `output.js` | |
| 23 | `tvtree` | Scene | Map | `detail()`, `oklchLinear`, `noise.js` | |
| 24 | `balloons` | Scene | Map | `audioKit()`, `detail()`, `oklchLinear`, `noise.js` | |
| 25 | `bubbles` | Scene, to **Shader** (after a check) | Map | `detail()` | |
| 26 | `lava` | Shader | | `output.js` | |
| 27 | `eyes` | Shader | | `audioKit()`, `gl.js`, `oklchLinear`, `output.js` | Reference port for `audioKit()` |
| 28 | `sonar` | Shader | | `gl.js`, `noise.js` | |
| 29 | `trails` | Shader | | `gl.js` | |
| 30 | `shadyos` | Shader | | | Docs and type check only |
| 31 | `chamber` | Shader | | `gl.js` | Bug `stimming-yc2u` |
| 32 | `ink` | Compute | | | Still frame without WebGPU |
| 33 | `window` | Scene | | | |
| 34 | `windmap` | Shader | | `gl.js`, `detail()` | |
| 35 | `vortex` | Shader | | `gl.js`, `detail()`, `output.js`, `noise.js` | |
| 36 | `dijkstra` | Shader | | `gl.js`, `output.js` | Ported 2026-11-16 (`stimming-f4rc`): `gl.js`, `ouAces`, `ouSrgb`, `onContextLoss`, type check, toy doc. Reference port for `ouSrgb`. Bug `stimming-e94j` |
| 37 | `fireworks` | Scene | | `detail()`; `bloomPass` waits | |
| 38 | `launch` | Scene | | `detail()`; `bloomPass` waits | |
| 39 | `frietkot` | Scene | | `detail()`; `bloomPass` waits | |
| 40 | `railgun` | Scene | | `bloomPass` waits | |
| 41 | `trainride` | Scene | | `detail()`; `pointer.js` waits | |
| 42 | `foghorn` | Environment | | | Type check done (the pilot) |

No. 14 is free. The module names come from the rows in [modularize.md](modularize.md) that name each toy. A toy's own chat checks its row before it starts.
