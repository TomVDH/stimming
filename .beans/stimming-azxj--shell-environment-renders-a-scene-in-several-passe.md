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
- [ ] Plain, traffic, farm and poles: cut the inlined copies
- [ ] Each pass compiles under 15 s with d3dcompiler_47
- [ ] Edge on D3D11 reaches the first frame
- [ ] Same frame on ANGLE GL, before and after
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
