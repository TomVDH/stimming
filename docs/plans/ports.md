# Port list: main shelf at v1.5

Tom, 2026-11-15: every main shelf toy can be ported, and each one starts at version `1.5` (`version` in `toys.json`), no matter its state before.
Lab toys hold `version: null` and wait.
The decisions behind each column are in [code-health.md](../code-health.md).

## Every toy gets these

| Work | Plan |
|---|---|
| A toy doc in `docs/toys/<id>.md` | [toy-docs.md](toy-docs.md) |
| The type check: the module script moves to `<id>/main.js`, the folder joins `tsconfig.json` | [typescript.md](typescript.md) |

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
| `output.js`: `ouSrgb`, `ouKnee`, `ouDither` | Not yet | Stone has none of them. `dijkstra` holds the exact `srgb()` text. The clamped `srgb()` copies (`kaleido`, `neon`, `rain`, `chladni`, `eyes`) keep their clamp |

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
| 36 | `dijkstra` | Shader | | `gl.js`, `output.js` | |
| 37 | `fireworks` | Scene | | `detail()`; `bloomPass` waits | |
| 38 | `launch` | Scene | | `detail()`; `bloomPass` waits | |
| 39 | `frietkot` | Scene | | `detail()`; `bloomPass` waits | |
| 40 | `railgun` | Scene | | `bloomPass` waits | |
| 41 | `trainride` | Scene | | `detail()`; `pointer.js` waits | |
| 42 | `foghorn` | Environment | | | Type check done (the pilot) |

No. 14 is free. The module names come from the rows in [modularize.md](modularize.md) that name each toy. A toy's own chat checks its row before it starts.
