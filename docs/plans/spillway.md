# Spillway (`spillway`) plan

Status: active · Bean: `stimming-xv1l`

Idea 101, group C, a cinematic diorama. Sources: `docs/toy-ideas.md` (Tom's picks, 2026-11-16) and section 1 of `docs/plans/next-ten-concepts.md`.
Tom's brief for batch 1: an MVP at high fidelity, with icons, the intro emblem and Bar v3. One hero moment, finished. No extra modes.

## The hero moment

1. The gates open from a drag on the dam.
2. The water goes from a trickle to a roar.
3. Mist climbs the gorge and hangs.
4. The gates close; the face drains, then drips.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| 3D or flat | 3D, one fixed low camera at the plunge pool | A dam is a thing of scale. A low camera makes the wall tower over the viewer. |
| Presentation | Raw WebGL2. The rock, the dam and the pool raymarch once into a G-buffer; each frame shades it. | The camera does not move, so the costly shapes draw once. The frame pays only for light, water and mist. |
| Day or night | Late afternoon. The sun is low behind the camera and rakes into the gorge. | Light behind the viewer puts a rainbow in the spray. Day light reads rock, concrete and water. A night gorge is black. |
| Gates | Drag on the dam. Press on a bay and drag up to open it; sweep across to carry the level to other bays. | The hand moves the thing itself. A lever is a prop (Look rule). |
| Bays | Five radial gates between piers, under a hoist deck | Few, bold shapes that read at 375 px. |

## Scene

- Two rock walls, steep and close, in warm sun on one side and cool shade on the other.
- An arch dam of pale concrete across the gorge. Five bays at the crest, with piers and a deck.
- A plunge pool in the foreground, dark green, with foam at the toe.
- A slit of sky above.
- Haze in the gorge. Bloom with a threshold. A film grade.

## Physical details (the pizazz)

1. The inception point: water leaves the gate glassy and dark, then turns white part way down the face.
2. A rainbow in the spray, at 42 degrees from the point opposite the sun.
3. The gates are heavy: they move at a slow, fixed rate, with a motor hum and a clank at each end.
4. The wet face stays dark and glossy after the flow stops, and dries slowly.

## Sound (muted by default)

| Voice | Source | Cause |
|---|---|---|
| Roar | Low noise rumble and a hiss band | Total flow; it pans to where the flow is |
| Trickle | Splashy high noise and soft plinks | A small flow |
| Gate | A low motor hum, a clank at the start and the stop | A gate in motion |
| Drip | A short plink, panned by its lane | Each drip that lands in the pool |

## Bar (Bar v3, through the `bar` spec)

| Slot | Holds |
|---|---|
| Action | Open or Close all gates (Space) |
| Slider | Gates: the level of all five |
| Settings | Quality (shared) |
| How to play | Drag on the dam; Space; arrows |

## Frame loop

- Lively while a gate moves or the pointer is down: full rate.
- Drifting while water flows, mist hangs or the face drips: 30 fps.
- Asleep 60 s after the last input: the time eases to a stop over 2 s, the roar fades, the loop stops.
- Hidden: the loop and the clock stop at once.
- Reduced motion: no flow streaks or mist drift. The gates and the flow level still answer.

## Tasks

- [x] Blockout: G-buffer pass, camera, dam, walls, pool, sky. Screenshot at 1280 x 800.
- [x] Water on the face, gates, foam, drips, wetness.
- [x] Mist at half size, light shafts, rainbow. Bloom and grade.
- [x] Sound.
- [x] Bar v3, keys, the slow-frame step, the frame loop states.
- [x] Icons from Tom's pick A of spike spillway-1 (no new round): menu tile, sheet row, intro emblem; `toys.json`; menu Lab entry.
- [x] QA Q1 to Q10, `docs/toys/spillway.md`.
