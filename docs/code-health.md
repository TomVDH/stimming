# Code health: overview and decisions

One page for the code-health work (epic `stimming-3s8z`). Tom set every decision below on 2026-11-14.
The detail lives in the plans; this page links them and does not repeat them.

| Strand | Question it answers | Plan |
|---|---|---|
| Stack types | Which renderer and libraries does a toy use? | [stack-types.md](plans/stack-types.md), [stack.md](stack.md) |
| Shared modules | Which copied code moves into `shared/`? | [modularize.md](plans/modularize.md), [shared-shaders.md](plans/shared-shaders.md) |
| Toy docs | What does each toy's reference page hold? | [toy-docs.md](plans/toy-docs.md), [template](toys/_template.md) |
| TypeScript | How do we get type checks? | [typescript.md](plans/typescript.md) |
| Port list | Which toys get ported, and what each one needs? Main shelf toys start at v1.5 | [ports.md](plans/ports.md) |
| Release readiness | What must a toy pass before Tom gives it the approved label? | [release-ready.md](plans/release-ready.md) |

## The site today

88 toys in `toys.json`: 41 on the main shelf, 47 in the Lab.

| Renderer | Toys |
|---|---|
| three.js 0.170, WebGL | 42 |
| Raw WebGL2 (GLSL) | 36 |
| Canvas 2D | 6 |
| three.js 0.186, WebGPU | 3 (Galaxy, Fire, Ink) |
| DOM / SVG | 1 |

About 2,900 lines are copied word for word across three or more toys. Many more are near copies.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Stack types | Keep five: Sketch, Shader, Environment, Scene, Compute |
| 2 | Starters | The reference toys are the starters. No starter pages |
| 3 | Flat three.js toys | Move all five to raw WebGL2, each after a same-frame check. Pop goes last |
| 4 | WebGPU fallback | A Compute toy without WebGPU shows a still frame and one line |
| 5 | Module order | Invisible steps first: audio kit, colour helper, tone curve |
| 6 | New modules | `gl.js` and `noise.js` may exist. `voices.js`, `bloomPass` and `pointer.js` wait |
| 7 | Toy docs | About ten main shelf docs by hand, then a generator for the factual sections |
| 8 | TypeScript | Every toy moves to TypeScript: `.ts` in `<id>/src/`, bundled by esbuild to `<id>/dist/main.js`, built in the Pages workflow (Tom, 2026-11-16; replaces JSDoc-only, no build step). Railgun is the pilot. `shared/` keeps JSDoc types until it moves |
| 9 | Dev tools | A `package.json` with TypeScript and library types is approved. `node_modules/` stays git-ignored |
| 10 | Type check in CI | No. It runs locally only |
| 11 | Bugs the audit found | One bean per toy now; each fix happens in that toy's own chat |
| 12 | Same frame | A shift of 1/255 on a few pixels counts as the same frame (2026-11-15, from Rain's `oklchLinear` proof). A larger change needs Tom's look |
| 13 | Fire and smoke | A key shared module (2026-11-16). Fire's flame and smoke (its K3 volume fluid, three.js WebGPU and TSL) become one module that other toys reuse. Ink copies it today. The design must say how Scene toys on WebGL take it |

## Stack types

A new toy picks one type in its bean, before its first line of code.

| Type | Renderer | Pick it for | Reference toy |
|---|---|---|---|
| Sketch | DOM, SVG or Canvas 2D | Shapes, type, a few thousand objects at most | `fidget` |
| Shader | Raw WebGL2, GLSL | Per-pixel maths seen flat | `vortex` |
| Environment | Raw WebGL2 on `shared/environment.js` | A place: sky, water, weather, glass | `foghorn` |
| Scene | three.js 0.170, WebGL | A camera that moves through lit 3D objects | `glass` |
| Compute | three.js 0.186, WebGPU and TSL | Over 100k agents, a fluid or a grid sim | `galaxy` |

Toys on the wrong type today: `morpher`, `ulam`, `prism`, `bubbles` and `pop` (three.js, should be Shader). Each moves in its own chat, when Tom picks it.

## Shared modules: order

One module at a time. One reference toy proves it first. Other toys adopt it in their own chats.

| Step | Module | Reference toy | Visible change |
|---|---|---|---|
| 1 | `audioKit()` for the hand copies | `eyes` | None |
| 2 | `oklchLinear` for the copied `lin` | `rain` | None |
| 3 | `output.js` for copied `aces` and `srgb` | `stone` | None |
| 4 | `shared/gl.js` (new) | `bismuth` | Must give the same frame |
| 5 | `detail()` with steps | `subway` | None |
| 6 | `fitRenderer` in `stim.js` | `pins` | None |
| 9 | `shared/noise.js` (new) | `frost` | Must give the same frame |

Steps 7, 8 and 10 (`voices.js`, `bloomPass`, `pointer.js`) wait for Tom.

## Open bugs from the audit

| Bean | Toy | Bug |
|---|---|---|
| `stimming-gty9` | bismuth | The slow-frame step never fires |
| `stimming-3vjf` | bread | The slow-frame step never fires |
| `stimming-iizo` | windfarm | A quality change does not reset the slow-frame step |
| `stimming-h9xj` | motorway | Same; also `fogT` is defined twice |
| `stimming-8jxr` | harp | A quality change does not reset the slow-frame step |
| `stimming-x3eq` | zipper | A quality change does not reset the slow-frame step |
| `stimming-k8rj` | sand | A quality change does not reset the slow-frame step |
| `stimming-yc2u` | chamber | The frame loop never stops when idle |
| `stimming-68g3` | prism | Two slow-frame watches |
| `stimming-syu9` | glass | Unused `gunshot.mp3`; stale header note in `AGENTS.md` |
| `stimming-orpt` | phaeton | MSAA runs twice |
| `stimming-e0qw` | postcard | In `toys.json` with no folder |

## Still open

- `nvg/tube.js` into `shared/`: yes or no.
- Toy docs: the section list, and uniform tables for every shader or only the tuned ones.
- Which flat three.js toy moves first.
