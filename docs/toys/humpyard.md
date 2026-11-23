<!--
Toy doc. Rules: docs/plans/toy-docs.md. Prose: ASD-STE100, double density. No em dashes.
-->

# Hump yard (`humpyard/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.78 0.14 65)`, sodium amber |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

Idea 374, group C. Bean `stimming-6e2q`. Plan: [humpyard.md](../plans/humpyard.md).
A shunting yard at night under floodlights. A shunter pushes a freight train over the hump; each cut uncouples at the crest and rolls free.
Throw the points to send it to one of eight sorting tracks. Retarders scream and spark; cuts couple with a clank; the sorted trains leave.

## Rules

- Metres; y up; the yard runs away from the camera along -z. The crest is at z = 0, 3.6 m over the ground.
- Grades: 2% up to the crest, 4.5% down past it, 1.1% through the ladder, 0.12% in the bowl, a short climb before the buffers.
- One lead, three rows of switches (seven in all), eight sorting tracks 4.8 m apart. Buffers at z = -330.
- A track's index picks the branch at each row: bit 2 at row 0, bit 1 at row 1, bit 0 at row 2.
- A train: 16 to 22 wagons in cuts of 1 to 3, each cut to one track. Four types: van, hopper, tank, flat with a container.
- Cuts uncouple 1.5 m past the crest. Each wagon has its own rolling resistance, 0.016 to 0.030 m/s².
- The master retarder (z -14 to -34) lets cuts out at 3.6 m/s. Each track's retarder (z -162 to -178) aims for a touch at 1.7 m/s on the cut ahead.
- A retarder grips at 2.4 m/s² from 0.25 m/s over its target and lets go 0.7 m/s under it.
- A coupling keeps momentum: the struck cut and the new cut move on together.
- The yard computer sets each switch for the next wagon coming to it, unless a hand throw holds it for that wagon. A wagon on the points locks them.
- The hump signal turns red, and the shunter stops, while the next cut's track has less than 30 m free.
- When the train is gone and every cut stands still, each track's cut leaves into the dark; then the next train comes.

## Direction

- Night, fog, sodium floodlights on tall masts. High behind the hump, looking down the fan.
- Each sorting track has a lamp in its hue at its head. Each wagon carries a plate in the hue of its track.
- The rails of the route the next cut will take glow faintly.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Auto (A): the yard throws the points; on by default |
| Slider | Hump speed: the shunter pushes at 0.8 to 3 m/s |

| Gesture | Does |
|---|---|
| Click or tap a switch | Throws it for the next cut |
| Click or tap a sorting track | Routes the next cut there |
| Keys | 1 to 8 route the next cut; A toggles Auto |

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
| `yard.js` | Layout, hump profile, segments, poses |
| `sim.js` | Train, cuts, retarders, coupling, switches, departures |
| `scene.js` | Ground, bank, sleepers, rails, retarders, lamps, masts, wagons, sparks |
| `sound.js` | Clanks, retarder scream, switch thumps, the shunter's idle |
| `main.js` | Bar, camera, uploads, sparks, gestures, frame loop |

## Sound

Muted by default. Clanks ring in steel partials; a buffer stop rings lower. The retarder screams in three partials and hiss, held while it grips. A switch throws with a motor whirr and a clunk. The shunter idles in low saws. Far sounds arrive late and dark.

## Quality and performance

- One shadow-casting spot over the hump. Shadows switch off at the third slow-frame rung.
- The frame loop follows Calving: full rate for 3 s after input or while sparks fly, then 30 fps; 60 s after the last input the clock eases to a stop.

## State and storage

`stimming.humpyard.push`, `stimming.humpyard.auto`, `stimming.humpyard.sound`.

## Attributions

None. All geometry is procedural.

## Tests and QA

QA captures: `docs/qa/humpyard/`.

## Known issues

- No favicon and no menu tile yet.
- The switch ladder uses S-curves, not true turnouts.

## Legacy build

None.

## History

- 2026-11-23: built. First look.
