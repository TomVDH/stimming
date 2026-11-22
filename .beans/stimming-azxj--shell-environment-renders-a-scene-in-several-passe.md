---
# stimming-azxj
title: 'Shell: environment() renders a scene in several passes'
status: in-progress
type: feature
created_at: 2026-11-18T06:23:12Z
updated_at: 2026-11-18T06:23:12Z
---

Tornado alley's one scene shader does not compile on Windows (stimming-kg00). The D3D11 compiler (FXC) inlines every call, and the 227 KB scene never finishes. This lets a toy split its scene into passes, each a small program. Opt-in: a toy with one scene sees no change. Tom's yes: 2026-11-17 ('Split into passes').

- [x] environment() takes passes: each writes layers that the scene pass reads
- [x] shared/glsl-prune.js: each pass program keeps only the functions it calls (tests/glsl-prune.test.mjs)
- [x] Tornado alley moves its object groups into passes (11 passes and the composite)
- [x] Plain, farm, poles, infra, storm: ordered passes and one call site per heavy function, each under 15 s
- [ ] Vehicles under 15 s: moved to meshes (Tom, 2026-11-22), see the mesh bean
- [ ] Funnel program under 15 s
- [x] Edge on D3D11 reaches the first frame: 32 s in the app pane, vehicles off on Windows
- [ ] No freeze after it: the funnel's link stalls the tab about 2 min
- [x] Same frame on ANGLE GL, before and after (`tools/fxc/same.mjs`)
- [ ] /code-review, then the PR

## State, 2026-11-17

Work in progress. Not run in a browser yet. Tornado alley on this branch still does not load on Windows.

D3DCompile time per program (Edge's HLSL, timed with d3dcompiler_47, several in parallel):

| Program | Time |
|---|---|
| Wires, trees, debris, ground, storm, composite | 5 to 10 s |
| Infra | 28 s |
| Farm | 48 s |
| Poles | 61 s |
| Plain, cars far, cars near | more than 300 s |

The cause is inlined copies. Plain expands to about 101,000 HLSL lines from 2,000.
The main multipliers: `sunCover()` (about 200 lines with its calls, 90 copies in plain), `loneTree` (9 copies of 386 lines), `hPl` in cars (111 copies).

Next:
1. Test `[loop]` on the slow passes (the run was stopped). If it helps, give those loops uniform bounds in GLSL.
2. Put repeated calls (loneTree, belt, stead, vHit, vLamp) in loops over a table, with a uniform count.
3. If still slow: a deck-shadow texture in place of `sunCover()`. That is a visible change: ask Tom first.

Tools in `tools/fxc/` (Windows only): `measure.mjs` saves each program's HLSL from Edge, `fxc.py` times one, `inline.py` lists the inlined copies.

## State, 2026-11-22 (Windows desktop, RTX 3070)

Changes, each exact (uncommitted on this branch):
- `plain.js`: belts, lone trees and farmsteads come from tables in loops; far trees use one `loneTree()` call; loops start at `PLAIN0`, a 0 the compiler cannot fold, so FXC keeps them rolled.
- `damage.js` `dmgAt()` and `main.js` `N()`, `W()`: `textureLod(..., 0.0)`. Both textures have one level. A gradient read in a rolled loop is FXC error X3511.

The plain pass: 101,000 inlined HLSL lines to 30,500. FXC level 1: more than 300 s, then 308 s, then 244 s with `loneTree()`'s own loops rolled.
Offline level 1 matches the browser (Cauldron: 70.6 s offline, 66.5 s in the pane). The browser gives up near 90 s.

Pass times, six compiles at once (so high):

| Pass | FXC level 1 |
|---|---|
| fs0, fs3, fs5, fs6, fs9, fs13, fs14 | under 10 s |
| fs12 | 31 s |
| fs7, fs8 | about 75 s |
| fs20 | 182 s |
| fs10 (plain) | 244 s |
| fs11, fs15 (cars) | more than 400 s |

Optimisation skipped, the plain pass compiles in 7 s: the optimiser is the cost. A never-taken `discard` does not change ANGLE's flags.
Fewer inlined lines do not always help: FXC time does not follow the line count.

## State, 2026-11-22, second session

Tom, 2026-11-22: solid objects become meshes, the far plain too ('yes bake as meshes'). This bean keeps the exact split; the meshes get their own bean.

What works, each exact:
- A split into passes in draw order. FXC time is superlinear: fence 11 s and belts 3 s apart, 25 s together.
- `ROLL0` (main.js SHARED): a loop start of 0 the compiler cannot fold, so it keeps the loop rolled.
- One call site per heavy function in a rolled loop: `deckN()`, `stormD()`, `stormShapeSun()` in `cloudShade()`, `vol()`, `deckD()` and `stormLit()` in the funnel march, `vHit()`, `hPl()`, `woodShade()`, `loneTree()`.
- The lamps only add glow, so they take their own pass.
- The farmsteads stand 23 degrees apart on screen: their trees draw with the lone trees, before the buildings.

What does not help: one pass per vehicle kind (worse, 229 s); `[branch]` and `[loop]` on every statement (172 s to 138 s); FXC level 1, 2 or 3 (same time).

FXC level 1, one compile at a time (d3dcompiler_47):

| Pass | Before | Now |
|---|---|---|
| Plain | 244 s | fence 11.7, belts 3.2, far trees 13.4, trees 5.2, steads 6.3 |
| Farm | 55 s | ground 1.7, hedge 5.4, yard 21.9, mill 0.8 |
| Poles | 66 s | 13.3 |
| Infra | 26 s | tall 5.5, low 7.7 |
| Storm, composite | 6, 8 s | 4.4, 10.4 |
| Vehicles, far and near | more than 400 s | about 175 s each |
| Funnel | 93 s | 34 s: one call site each for `deckD()`, `stormLit()`, `vol()`, `stormShapeSun()` |

The farm yard, the infra halves and the funnel stubs ran beside a stray compile: they can read high.

Same frame (`tools/fxc/same.mjs` and `tools/fxc/diff.mjs`): a seeded Math.random, a clock of 1/60 s per frame, frames held until the funnel links.
Main against main: 0 px differ. Branch against main, F3 tornado at 3 km: 11 px of 938,000, all on the far vehicles' thin masts, at most 24/255.
With the vehicles near the eye a close pass shakes the camera, and two runs of main differ in the sky; the vehicle region matches main as closely as main matches itself.

Next for the funnel: the rain batch and the sun shafts in a second program after the march (without the rain batch: 20 s less).

## Live check, 2026-11-22 (app pane, ANGLE D3D11, RTX 3070)

Windows runs without the vehicles until they are meshes (`CARS` in main.js; Tom, 2026-11-22: 'do all').
The scene's programs link in parallel: the first frame shows at 32 s, the console stays clean, the context lives.
Then the funnel program links, and the tab does not answer for about 2 minutes. The frame comes back after it.
