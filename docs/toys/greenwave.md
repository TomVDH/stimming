<!--
Toy doc. Rules: docs/plans/toy-docs.md. Prose: ASD-STE100, double density. No em dashes.
-->

# Green wave (`greenwave/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Emblem | `shared/emblems/greenwave.svg`, from A of icon round greenwave-1 |
| Accent | `oklch(0.8 0.2 150)`, signal green |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

Idea 375, group E. Bean `stimming-ke8w`. Plan: [greenwave.md](../plans/greenwave.md).
One avenue at night, ten sets of signals in a row. The Offset slider sets how late each signal starts its green after the one before.
At the right offset groups of cars glide through on green. At a wrong one the avenue fills with stop-and-go and brake lights.

## Rules

- One one-way avenue, three lanes 3.3 m wide, running away from the camera along -z. Ten crossings 150 m apart.
- Every signal runs a 60 s cycle: avenue green 32 s, amber 3 s, then red. The side street runs during the red, after 1 s of all-red.
- Signal i starts its cycle i times the offset later.
- The wave is timed for 50 km/h. The right offset is 150 m / 13.9 m/s + 2 s, about 12.8 s: the 2 s is for a group pulling away from a stop.
- The Intelligent Driver Model in each lane: T 1.2 s, s0 2 m, a 1.6 m/s², b 2.4 m/s². Drivers aim at 96% to 106% of 50 km/h. No lane changes.
- On amber a car stops if it can at 3.4 m/s², else it goes through.
- Past the first crossing, about 7 cars stand at the right offset, against 55 to 85 at a wrong one (headless check).
- Side-street cars cross on their own green, for life in the picture.

## Direction

- Night after rain. A long lens from high behind the traffic, down the avenue, so the signals stack.
- Lit windows on both sides. Every light doubles on the wet road as a long streak toward the camera.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Wave (W): snaps the offset to the right value |
| Slider | Offset: 0 to 60 s |
| Settings | Traffic |

| Gesture | Does |
|---|---|
| Click or tap a car | It brakes hard, then drives on |
| Hold a car | It stays stopped until the release |
| Keys | W snaps the offset |

## Renderer and libraries

| | |
|---|---|
| Stack type | Scene |
| Tier | three.js 0.170, WebGL |
| Libraries | three, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `ShaderPass`, `OutputPass`, `BufferGeometryUtils` |
| Importmap | Word for word |

## Files

| File | Holds |
|---|---|
| `sim.js` | Lanes, signals, the driver model, side streets |
| `scene.js` | Road, paint, buildings and windows, lamps, signals, cars, wet-road streaks and pools |
| `sound.js` | A copy of Traffic wave's sound |
| `main.js` | Bar, camera, uploads, gestures, frame loop |

## Sound

Muted by default. The roar and the drone of Traffic wave follow the mean speed of the near cars. Near hard brakes make tyre scrubs, at most three a frame. Wave makes a swell of air.

## Quality and performance

The frame loop follows Calving: full rate for 3 s after input, then 30 fps; 60 s after the last input the clock eases to a stop.

## State and storage

`stimming.greenwave.offset`, `stimming.greenwave.flow`, `stimming.greenwave.sound`.

## Attributions

None. All geometry and textures are procedural.

## Tests and QA

QA captures: `docs/qa/greenwave/`.

## Known issues

- The menu tile is A of icon round greenwave-1, with no pick yet.
- The wet road has streaks and pools, not true reflections.

## Legacy build

None.

## History

- 2026-11-23: built. First look.
