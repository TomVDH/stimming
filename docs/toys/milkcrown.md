# Milk crown (`milkcrown`)

Lab toy, idea 371. Bean `stimming-imb3`. Plan: `docs/plans/milkcrown.md`.

A white drop falls into a pool of milk in front of a studio backdrop, in slow motion. A thin crown sheet rises round the crater, and its rim breaks into evenly spaced points, each with a bead. The beads pinch off and rain back. The crown falls, the crater fills, and a Worthington jet shoots up; its neck thins and pinches off one droplet, which arcs up and falls back. Rings spread and the milk settles to a mirror.

## Play

| Input | Does |
|---|---|
| Click or tap the stage | A new drop from the Height slider |
| Drag left or right | Scrubs the moment, one film frame (0.25 ms) at a time; the whole stage width is 64 ms |
| Hold still (260 ms) | Freezes the frame; let go and it plays on to rest |
| Arrow left or right | One frame back or on; the moment plays on 2 s after the last step |
| Height slider | The fall height, 10 to 60 cm: impact speed 1.4 to 3.4 m/s |
| Backdrop choice (1, 2, 3) | Blue, Red, Black studio sweeps |
| Drop (Space) | A new drop |

- The first frame is the photograph: the crown at its peak, a bead on every point, held still.
- One drop plays in about 10.5 s: 5.5 s for the fall, the crown and the jet (about 1/110 of real time), then a speed ramp while the droplet flies, slowed again for its return.
- At rest the pool is a still mirror and the loop sleeps.

## The physics (event time in ms, lengths in mm)

| Part | Model |
|---|---|
| Drop | Radius 2 mm; speed `sqrt(2 g h)`; a small wobble in the fall; it sinks and merges with a smooth union |
| Crown | Base radius `A (0.9 + 1.05 sqrt(T))` with `T = t U / A`, easing to a stop (Yarin and Weiss); height to its peak at 8 ms, back down by 21 ms; a flared two-segment wall, thick at the foot; a rim torus that sags between points |
| Points | `round(13 + 11 s)` points (24 at 35 cm), each with its own jitter, length and bead size from a seeded random source. Fingers grow from 2 ms; each bead's neck thins and it pinches off at 9 to 12 ms, then flies on a ballistic path (4.5 g for drag); a small new bead forms on the point. Under a splash threshold the beads do not pinch off. |
| Crater and jet | The crater opens under the drop and fills from 11 ms. The jet rises from 19 ms: a flared foot, a column, a short neck under a bulb. The neck thins and pinches off the droplet at 29 ms; the column falls back. |
| Rings | Three packets: capillary rings from the impact, gravity rings from the crown's collapse, rings from the droplet's return. Each travels out and fades. |

Every shape is an analytic function of event time, so a scrub is exact in both directions. The page passes the shapes as uniforms; `event.js` also gives the sound cues between two times.

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, the playhead (play, scrub, hold), the camera, pointer and keys, Bar v3 spec, frame loop |
| `event.js` | The timeline: a seeded drop, the shapes at any event time, the sound cues |
| `scene.js` | Raw WebGL2: one signed-distance march into HDR, bloom (`shared/glow.js`), the grade (`shared/grade.js`) |
| `sound.js` | Web Audio one-shots |

- 3D, a macro camera 13 degrees over the milk, 165 mm back. The frame fits 45 mm by 28 mm, 32 mm wide on a portrait stage.
- One field: the pool height field, the crown, the jet and the drops, joined by smooth unions so every join has a fillet and every pinch has a neck.
- The points use domain repetition round the axis: each sample evaluates its own sector and the nearest neighbour, so 24 points cost two.
- The light: a dark studio; a large softbox from the front left (wrapped diffuse, a soft shadow, a glint), a cool strip light behind on the right (rim glints, and warm light through the thin wall), a backdrop sweep with a lit spot. The key is a pool of light on the set; the milk beyond falls dark and mirrors the backdrop.
- The milk mirrors the set: a short reflection march, shaded as a lit milk tone.
- The march runs 1.5 times larger than the canvas while the pixel budget allows (2.4 million), and the grade downsamples it, so thin points stay clean.
- The march and every shading probe (normal, occlusion, thinness, soft shadow, mirror) share one loop and one field call. The scene program compiles in 0.8 s on D3D11 (`tools/fxc`), not 3.7 s.
- The scene output passes through `max`, which drops a NaN on D3D: one bad pixel would spread through the bloom.

## Frame loop

- Lively while the moment plays, or while the pointer scrubs or holds.
- No ambient motion: at rest, and on the still first frame, the loop sleeps.
- Hidden tab: the loop and the playhead stop.
- Reduced motion: the moment plays at 0.75 speed; the grain holds still.
- Slow frames step down one rung, then two (`shared/detail.js`): no supersampling and a lower pixel ratio, then fewer bloom levels.

## Sound

Muted by default. The context suspends 1.5 s after the loop sleeps. All sounds are slowed with the picture: low and soft.

- The release: a valve tick and a breath of air.
- The impact: a deep thump that falls in pitch, a plunk of filtered noise.
- The crown: an airy swell that opens as the crown rises.
- Each bead: a small round tick, panned by its place on the rim; each bead's return, a plip that rises in pitch.
- The jet: a low glide up over water. The pinch-off: a slowed bloop whose pitch climbs. The droplet's return: a fuller plunk.
- A scrub clicks one film frame past the gate; a hold shuts the gate with a click.
- A small room: two short echoes.

## QA (headless Edge, D3D11, RTX 3070), 2026-11-23

| | Result |
|---|---|
| Q1 | `node --check` passes on the four modules, the menu scripts and the icon page script |
| Q2 | Clean console in play, on the menu with the tile hovered, and on the icon page |
| Q3 | Captures in `docs/qa/milkcrown/`: 1280 x 800, 375 x 812, 812 x 375, each moment, each backdrop |
| Q4 | Still first frame: 0 rAF in 2 s. At rest after a drop: 0 rAF in 2 s |
| Q5 | Hidden tab during play: 0 rAF in 2 s; the playhead does not move |
| Q6 | Reduced motion: clean console; every gesture answers |
| Q7 | Backdrop choice, Drop, Height slider (3 controls); How to play has 4 rows |
| Q8 | Arrows, 1 to 3 and Space each do their job |
| Q9 | The context runs after a gesture and is suspended at rest |
| Q10 | Frame times through one drop: median 7.6 ms, p95 8.2 ms (the march at 1.5x) |
