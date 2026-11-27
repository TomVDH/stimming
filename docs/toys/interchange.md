<!--
Toy doc. Rules: docs/plans/toy-docs.md. Prose: ASD-STE100, double density. No em dashes.
-->

# Interchange trails (`interchange/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet |
| Motto | Everyone's going somewhere at once. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Emblem | `shared/emblems/interchange.svg`, from A of icon round interchange-1 |
| Accent | `oklch(0.8 0.13 70)`, headlight amber |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

Idea 373, group B. Bean `stimming-hjsw`. Plan: [interchange.md](../plans/interchange.md).
A motorway interchange at night, seen from straight above as a long exposure. Every lamp draws a line of light.
Swap the design (cloverleaf, turbine, stack, megastack); the old trails fade and the new ones draw in. A jam burns as a bright knot.

## Rules

- Two motorways cross at the origin, two lanes each way. Traffic keeps right. Units are metres.
- A design gives only the ramps that leave the northbound road. The builder turns them by 90 degrees for the other three roads.
- Cars never change lanes. Each car follows one path of links from its lane's start to its end.
- Shares on each approach: 60% through, 20% right, 20% left. In Megastack also 10% carpool (from the inner lane) and 4% U-turn. The inner lane carries through traffic, and the carpool move in Megastack.
- Megastack is the stack, plus a carpool flyover at level 5 from the inner lane to the left, and a U-turn loop at level 2 past each arm. Tom asked for it on 2026-11-23: "a multialyered LA-like or shenzen type situation".
- The Intelligent Driver Model, 60 substeps a second: T 1.1 s, s0 2.2 m, a 1.4 m/s², b 2.2 m/s². Lanes 31 m/s, ramps 19 to 20 m/s, turbine swirls 17 m/s, stack flyovers 18 m/s, carpool flyovers 23 m/s, cloverleaf loops 10.5 m/s, U-turn loops 9 m/s.
- At a merge the lane has the right of way. A ramp car waits until the next lane car would reach the merge at least 1 s after it. After 6 s of waiting it pushes in.
- One car in nine is a lorry: 13 to 16 m long, slow to pull away.
- The plate keeps exp(-dt / 7 s) of its light each step. During a swap it keeps exp(-dt / 1.8 s) for 1.5 s.
- A lamp adds energy in proportion to its time on each metre. A slow car burns brighter; a stopped car burns a dot.
- The camera hangs 380 m over the crossing. A lamp that faces it burns brighter: inbound cars draw white, outbound cars draw red.
- At the same traffic the cloverleaf knots first, the turbine next, and the stack last. The loops and their short merges make the difference.

## Direction

- Night, straight down, no perspective. Dark fields, grey decks, amber lamp pools along the outer edges.
- Higher decks are lighter and throw a shadow to the south-east.
- The trails carry the picture. The map stays dim.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Choice | Design: Cloverleaf, Turbine, Stack, Megastack |
| Actions | Clear (C): wipes the plate |
| Slider | Traffic: 500 to 3600 vehicles an hour on each approach, default 35% |

| Gesture | Does |
|---|---|
| Click or tap | A car brakes hard, then drives on |
| Hold | The car stays stopped until the release |
| Keys | C clears the plate |

## Renderer and libraries

| | |
|---|---|
| Stack type | Shader |
| Tier | Raw WebGL2, with a Canvas 2D map |
| Libraries | None from the importmap |
| Importmap | Word for word |

Raw WebGL2 holds a float plate that fades by blending, with no ping-pong. Canvas 2D draws the still map once per size or design.

## Shared modules

| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `pageReady`, `stage`, `reduced`, `onReducedChange`, `audioKit`, `sound` |
| `shared/intro.js` | `intro` |
| `shared/gl.js` | `program`, `linked`, `target`, `free`, `bind`, `tri`, `TRI_VS`, `onContextLoss` |
| `shared/glow.js` | `bloomChain` |
| `shared/detail.js` | `detail` |

## Files

| File | Holds |
|---|---|
| `index.html` | The page and its importmap |
| `main.js` | State, bar, plate exposure, frame loop, pointer |
| `designs.js` | The four designs and the network builder |
| `sim.js` | The driver model, merges, spawns, lamps |
| `basemap.js` | The still map in Canvas 2D |
| `render.js` | Plate, compose, cars, bloom, grade |
| `sound.js` | A copy of Traffic wave's sound |

## Render pipeline

1. The plate fades: a full-screen pass with the blend `ZERO, SRC_ALPHA`.
2. Each lamp adds a capsule stroke from its last place to its new place, additive.
3. Compose: the map (two textures that cross-fade on a swap), then the plate.
4. Live cars: instanced quads with body, glass and lamps.
5. Bloom (`shared/glow.js`), a filmic curve, a vignette and grain.

## Sound

Muted by default. The roar and the engine drone of Traffic wave follow the mean speed. Hard brakes in a knot make tyre scrubs, at most four a frame. A tap makes a firm stop. Clear and a swap make a swell of air.

## Quality and performance

- About 130 fps on an RTX 3070 at 1280 x 800, about 90 cars at the default traffic.
- A swap runs the new sim for 70 s before its first frame: about 100 to 200 ms.
- The frame loop follows Traffic wave: lively for 3 s after input and during a swap, then 30 fps. 60 s after the last input the sim clock eases to a stop and the picture holds.

## State and storage

`stimming.interchange.design`, `stimming.interchange.flow`, `stimming.interchange.sound`.

## Attributions

None. All geometry and light are procedural.

## Tests and QA

QA captures: `docs/qa/interchange/`. Captured in headless Edge on D3D11.

## Known issues

- The menu tile is A of icon round interchange-1, with no pick yet.
- The diverging diamond, the fourth design in the bean, is not built.

## Legacy build

None.

## History

- 2026-11-23: built. Three designs, the plate, white inbound and red outbound trails.
- 2026-11-23: Megastack, the fourth design, on Tom's ask.
