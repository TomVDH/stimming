# East Van (`eastvan`) plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [x]`) syntax.

**Goal:** A cute, simple diorama of East Vancouver: a house, a back alley and a piece of Commercial Drive. You poke everything; nearly every object reacts.

**Architecture:** Open until the looks lab closes. Phase 0 draws one house lot three ways from one data file. From phase 1: `eastvan/index.html`, one lazy module per zone, one poke registry, baked city data.

**Tech stack:** three.js 0.170 (WebGL), GSAP 3.13, Tone.js through `kit.tone()`. GLB models through `three/addons/loaders/GLTFLoader.js`.

**Direction:** Tom, 2026-11-10: first ultra toy, SSS rank. Look picked from the lab: Toy-town, true 3D, at full force; Paper and Print wait. Weeks of iteration on direction and build. Public assets. Smooth and stylistically interesting. Epic `stimming-guw5`.

| | |
|---|---|
| Tier | 4, three.js: a lit diorama with many small moving parts |
| Size, estimate | XL, weeks |
| Kits | none yet |

## Brief (Tom, 2026-11-10)

| Topic | Answer |
|---|---|
| Main verb | Poke everything. |
| Still postcard | A separate session studies it in `eastvan/postcard/`. |
| Layout | True 3D on a plinth (picked from the looks lab). |
| Looks to try | Paper theatre, Toy-town low-poly, Print poster. |
| Assets | Open city data, CC0 3D models, CC0 textures and sound. |
| Realness | Archetype house and alley from real East Van parts. One real block: Commercial Drive at East 4th Avenue. |

Open with Tom:
- Dutch name and motto.
- Shop signs on the Drive: invented names (assumed).
- Hour and weather: after the three zones stand (assumed).

## The shot (phase 0)

One 33 ft lot at dusk, seen from the street.
A teal front-gable house on a raised basement, a full porch, five steps, a tomato door.
A cherry tree in bloom on the boulevard. A power pole, three wires and a service drop.
A crow on the wire. Two wheeled bins and a blue box by the side path.

## Pokes (phase 0)

| Poke | Reaction |
|---|---|
| Porch lamp | The light turns on or off. |
| Crow | It leaves the wire, flies a loop and lands again. |
| Bin lid | The lid flaps open and drops shut. |

## Phases

| Phase | Result | Bean |
|---|---|---|
| 0 Looks lab | Tom picks the look and the layout | `stimming-vmwf` |
| 1 Bones | Lab registration, Bar v2 shell, zone modules, poke registry, data bake | later |
| 2 House lot | The archetype house, finished alone: full poke list, sound | later |
| 3 Alley | Garages, bins, wires, laneway life | later |
| 4 The Drive | The real block at Commercial and East 4th, from city data | later |
| 5 Finish | Hour and weather, sound bed, vignette, phones, performance pass | later |

## Budget

The repo has no draw-call budget. East Van sets one.

| | |
|---|---|
| Frame rate | 60 fps goal, 30 fps floor |
| Draw calls | 150 |
| Triangles | 300k |
| First load | 3 MB |
| Idle | The loop sleeps 60 s after the last input |

## Public asset rules

- Licences: CC0, or open with credit (OpenStreetMap ODbL, City of Vancouver Open Government Licence). Nothing else.
- Every asset gets a row in `eastvan/CREDITS.md`: file, source URL, author, licence, date.
- The page carries a credit link (pattern: `canal/index.html`).
- Before each download batch, list file, source, size and licence. Wait for Tom's yes.
- City data: building footprints and heights, lot lines, lanes, street trees, poles. Confirm the dataset ids on the city portal at bake time.
- `dijkstra/maps/vancouver.json` covers downtown only. It does not reach the Drive.
- Bake template: `canal/bake/beernem.py` and `canal/beernem.json`.
- Models: plain GLB. No Draco, meshopt or KTX2 without Tom.
- Each model loses its own materials and takes the toy's one kit material.
- Textures: procedural first. A CC0 texture only where it beats code.
- Sound: synthesized first through `audioKit()`. CC0 field recordings as mp3 with `decodeAudioData`.

## Tasks

### Phase 0: Looks lab (checkpoint)

- [x] `eastvan/lot.js`: the lot as plain data (parts, sizes, OKLCH colours, poke targets).
- [x] `eastvan/looks.html` (`noindex`, unlinked): one canvas, looks A, B and C on keys 1 to 3.
- [x] A Paper theatre: flat cut-out layers at true depth, soft shadows, pointer parallax.
- [x] B Toy-town: true 3D, flat colour, edge line, sun shadow, drag to orbit.
- [x] C Print poster: four inks, halftone, misregistration, paper grain; on A's layers or on B's 3D.
- [x] The three pokes work in every look.
- [x] Readout: fps, draw calls, triangles.
- [x] Checkpoint with Tom: stills at 1280 px and 375 px. Tom picks the look and the layout.

### Toy-town pass 1: lens and house detail (`stimming-84n7`)

- [x] `eastvan/index.html`, `eastvan/town.js`, `eastvan/lens.js`. The lab keeps `eastvan/looks-lot.js`.
- [x] Lens: ambient occlusion, bloom from a glow mask, ink line, depth blur, grade.
- [x] Detail: clapboards, shingles, roof courses, mullions, barge boards, stair rails, strata, sidewalk slabs.
- [x] Poke: the front door.

### Pokes and life (`stimming-0tf8`)

- [x] One draw call for static paint; switches and movers from `sw` and `dyn` in `lot.js`.
- [x] 21 pokes: six windows, lamp, string lights, street lamp, door, gate, lids, blue box, van, crow, cat, flamingo, tree, chimney.
- [x] Life: cat, flamingo, couch, flowers, a camper van, petals, smoke.

### The alley (`stimming-jp71`)

- [x] Zone files: `lot.js` and `alley.js`, each with parts, wires, pokes, moves, acts and lamps.
- [x] Backyard, garage and lane behind the house; 13 new pokes; a basketball.
- [x] Camera stops House and Alley (keys 1 and 2), free turn.

### The Drive (`stimming-pmsi`)

- [x] Five city extracts fetched and baked; `eastvan/CREDITS.md`; the credit line on the page.
- [x] `eastvan/drive.js`: a disc of 58 m radius round the corner of Commercial Drive and East 4th, as its own diorama.
- [x] Pokes: shops, upper windows, street lamps, the trolley bus, the fruit stand. Stop 3.

### Next (Tom picks the order)

- [ ] The alley as its own full diorama (`stimming-cly0`; Tom asked for it after the Drive).

- [ ] More life: a bike, a mailbox flap, a sprinkler, a second crow; first CC0 model candidates.
- [ ] Sound for every poke; a dusk bed.
- [ ] Lab registration: `toys.json`, menu tile and icon, Bar v2 shell, intro.
- [ ] The Drive: people, crows, the east side, shop interiors.

## Reduced motion and idle

- **Reduced motion:** no sway; the crow hops off and back with no loop; the lid snaps.
- **Idle:** the loop sleeps 60 s after the last input and while the page is hidden.
