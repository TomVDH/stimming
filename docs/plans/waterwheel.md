# Water wheel (`waterwheel`) plan

Status: active · Bean: `stimming-2s2a`

Idea 73, group E. Sources: `docs/toy-ideas.md` (the shortlist row and Tom's picks, 2026-11-17) and the Water wheel row in `docs/toy-plan.md`.
Tom's brief for batch 2: an MVP at high fidelity, with icons, the intro emblem and Bar v3. One hero moment, finished. No extra modes.
`toy-plan.md` rates the idea L and high risk: particle water against moving wheels is hard to make look right. Tom's ruling: cut it to size M.

## The hero moment

1. Hold on the stage: water pours from above, where the pointer is.
2. It lands in the head flume and runs down to the first wheel.
3. It jumps the lip, fills the buckets on the far side, and the wheel takes up speed.
4. The spill drops into the trough below and runs on to the next wheel. Each wheel starts after the one above it.
5. Let go: the flumes drain, the buckets empty as they come round, and the wheels run down one after another and stop.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| 3D or flat | Flat: one side elevation, a section through the race | The whole chain reads at once, pour to tail race. The water in each bucket shows. A 3D wheel hides its buckets behind the shroud. |
| Presentation | Raw WebGL2. Static masonry and flumes draw once into a texture; the wheels draw as shapes in a shader; the water splats into a half-size density field and shades as one liquid. | Small programs, so the Windows D3D11 link stays fast. The frame pays only for wheels and water. |
| Light | Low evening sun, behind the scene, a little to the left | Backlit water and spray glow. The wheels stand dark with warm rims. Few shapes, light carries it (Look rule). |
| Wheels | Three overshot wheels in a cascade, large to small | Three makes a chain. A smaller wheel turns faster, so the chain quickens downhill. |
| Layout | Wide stage: a staircase down to the right. Tall stage: a zigzag down. | Each wheel's top sits under the trough of the wheel above, so the cascade needs height. The zigzag keeps the wheels large on a phone. |
| Pour | Hold or drag pours a stream from the top of the stage at the pointer. Space pours into the head flume. | The hand is the jug. Water that misses a flume falls to the race below, which is also true. |

## Cuts (L to M)

| Cut | Instead |
|---|---|
| A fluid sim (pressure, surface tension) | Ballistic particles with no forces between them. Flumes and troughs are one-sided floors. The density field gives the water its body. |
| Water against bucket boards | Each bucket holds a number: its fill. A particle that reaches an open bucket joins the fill. The shader draws a flat water line in the bucket. |
| More pours, more wheels, gears, a mill | One pour, three wheels, nothing else. |
| Modes and presets | None. One slider: Flow. |

## Physics (in metres and seconds)

- Gravity 9.81. A particle carries one unit of water.
- A bucket holds up to C units. Its capacity falls as it turns past horizontal and is zero on the rising side, so it spills on the way down.
- Torque is the sum of bucket mass times the lever arm, plus the momentum of water that lands. Friction has a viscous part and a dry part; the dry part holds a wheel still at low torque.
- Spill leaves the bucket mouth with the rim speed and falls into the trough below.

## Scene

- Sky: a warm haze with a low sun behind thin cloud, upper left.
- A far hill and near stone terraces, dark, with warm rims where the sun strikes.
- Wooden flumes on short trestles. Wheels of dark wood: shrouds, buckets, eight arms, a hub.
- Water: clear and dark where thick, bright at the edges toward the sun, white where it breaks.
- Spray: fine glints where water lands hard, lit by the sun.
- Bloom with a threshold, a film grade, grain.

## Physical details (the pizazz)

1. The jet leaves the flume lip in an arc and lands just past the top of the wheel, as an overshot wheel must.
2. Buckets on the loaded side show their water line level with the ground as the wheel turns.
3. A full wheel takes seconds to come up to speed and a long time to run down: it is heavy.
4. The wheels start one after another, as the water reaches each in turn.

## Sound (muted by default)

- Splash: band-passed noise at each landing point, panned, louder with flow.
- Gurgle: plinks in the flumes, as many as the flow carries.
- Creak: each wheel has a slow wooden groan and a knock as each arm passes the top, pitched by its speed.
- Every sound jitters in pitch, time and level.

## Bar (Bar v3)

| Control | Content |
|---|---|
| Action | Pour (hold), key Space |
| Slider | Flow |
| Settings | Quality (shared); Reset |
| How | Hold to pour; drag to move the stream; Space to pour into the head flume |

## Frame loop

- Lively while water is in flight, a pour runs, or a wheel turns. Full frame rate.
- No ambient motion: when the last wheel stops and the last drop lands, the loop stops.
- Hidden: the loop and the sim clock stop at once.
- Reduced motion: no spray drift and no grain motion. The pour and the wheels still answer.
- Slow frames step down: pixel ratio, then the density field to a quarter, then the particle cap.

## Tasks

1. Blockout: layout, masonry, flumes and three still wheels. Screenshot at 1280 x 800.
2. Particles, floors, buckets and wheel dynamics.
3. Shading: wheels, water, spray, bloom, grade.
4. Sound.
5. Bar v3, Lab entry, icons, emblems.
6. QA Q1 to Q10. Toy doc.

## Open for Tom

- 3D or flat: flat side elevation by default (above). A 3D version would be a new plan.
- The Dutch name: draft `Waterrad`.
