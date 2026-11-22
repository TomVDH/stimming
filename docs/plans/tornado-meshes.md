# Tornado alley: solid objects as meshes

Status: active · Bean: `stimming-wx3m` · Parent work: `stimming-azxj`

Tom, 2026-11-22: "yes bake as meshes -- to far plain too"; then "do all".

## Why

Tornado alley draws every solid object by ray tracing in full-screen fragment shaders.
The D3D11 compiler (FXC) pastes every call and optimises superlinearly: the vehicles' pass takes about 175 s.
Meshes give each object a small shader: seconds to compile on any GPU, and less work per frame.

## Goals, non-goals, anti-goals

| | |
|---|---|
| Goals | Every program under 5 s with d3dcompiler_47. Windows gets its vehicles back. The frame time is no worse. |
| Keep | Today's look: the paint and its sheen, glass that shows the cab and the far window, self-shadow, the road shadow, the motion blur in the 1/40 s shutter, the lamps' glow, the spray and the trail. |
| Non-goals | The storm deck and the funnel stay ray-marched: they are volumes. No downloaded models, no three.js. No change in `shared/`. |
| Anti-goals | A visible step down in the vehicles' look. A shader that compiles slowly again. |

## Approaches

| | Approach | Trade |
|---|---|---|
| A (picked) | The toy rasterizes each group in its `before()` hook into its own targets, then one layer pass lays the group in at its slot, as the funnel does. | No `shared/` change. One copy pass per group. |
| B | `shared/environment.js` learns to draw meshes into its layers. | Reuse for other toys, but a shell change for one toy. |
| Dropped | three.js on the same page. | A second context, or a fight with the runner. |

## Design

### Order and layers

- Each group keeps its slot in the pass order: far vehicles before the infrastructure, near vehicles last.
- Inside a group the depth buffer sorts, so the per-pixel draw order stops mattering there.
- A group draws twice into its own pair of targets: the share behind the funnels, then the share in front (`behindF()` per fragment). One output per program: D3D11 compiles a multi-output program twice.
- 4x multisampling, resolved, then a copy pass (`texelFetch`) lays each target into `tLayB` and `tLayF`.

### Vehicles (first)

| Part | How |
|---|---|
| Hulls | JS clips a box by each hull's planes (the existing tables) into a convex polyhedron. |
| Wheel arches | The side faces get the arch's notch; the well is a strip of the cylinder (id 8). |
| Small parts | Boxes, rods, capsules, the dish, wheels and rims, as small meshes from the same numbers. |
| Shading | `vPart()`, `vBend()` and `vShade()` move into the mesh fragment shader unchanged: id, local hit point and normal come from the mesh. |
| Glass | The fragment traces the cab hull's planes for the exit point, as today; `vPart()` then decides what shows through. |
| Self-shadow | A small shadow map per vehicle from the sun, in place of the sun ray. |
| Road shadow | A quad on the road under each vehicle reads the shadow map; the contact shadow stays a soft blob. |
| Motion blur | Four draws at four moments in the shutter, averaged; with 4x multisampling that matches today's 4 to 16 samples. |
| Lamps, spray, trail | Stay GLSL in their own small passes, behind and in front of the body pass. |

### Then, one group at a time

Farm buildings, poles and fence, pivot, tower, billboard and bales, then the far plain (belts, lone and far trees, steads).
Damage stays live: per-vertex lean and fall from the damage field, as the GLSL does now.

## Checks

- d3dcompiler_47 time per program, and the app pane on D3D11: first frame and no freeze.
- `tools/fxc/same.mjs` against main: the look holds. A mesh is not bit-exact, so Tom looks at each group before the next.
- Frame time with `__qa.gpuTime()` before and after.

## Left to the builder

The shadow map size, the mesh resolution of round parts, and the strip widths of the arches.
