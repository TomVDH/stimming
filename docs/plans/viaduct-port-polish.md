# Night viaduct, Port: polish (spec)

> Sub-project 1 of 3 for the Port pass that Tom asked for on 2026-11-08. Bean `stimming-3cmz`.
> Sub-project 2 is layers and settings. Sub-project 3 is interactions. Each one gets its own spec.

**Goal:** the Port looks calm and runs smoothly. Light comes only from real sources, the causeway lands on something, and the train and the ride camera move without steps or jolts.

**Files:** `viaduct/port.js` (scene, motion, chase), `viaduct/index.html` (frame loop, post chain, MSAA). No shared files.

## 1. Glow

Tom: "the glow is insane on things; not all needs flares".

Two kinds of lamp sprite replace the one `flare()`:

| Kind | Look | Use |
|---|---|---|
| `flare` | A core and a soft halo. It can bloom. | Lamps the eye reads as a source. |
| `pin` | A core only, 1 to 3 px. It stays below the bloom threshold. | Small lamps that only mark a shape. |

Each light site in `port.js` takes one kind, or none:

| Site | Now | After |
|---|---|---|
| Causeway sodium lamps | flare | flare |
| Train lamps | flare | flare |
| Flare-stack flame | flare | flare |
| Searchlight source | flare | flare |
| Quay floodlight heads (12) | flare | flare |
| Red tops on stacks and cranes | flare, all | flare on every second top, pin on the rest |
| Catenary mast lamps | flare | none |
| Crane boom lamps | flare | pin |
| Roof lamps, conveyors, tank rings and ladders | flare | pin |

- Lamp orbs: only the 6 strongest stay (`k` times `size`). The rest go.
- Bloom: the threshold goes up, so only flare cores and the flame bloom. The strength comes down to match.
- Claude sets the new bloom and flare defaults by eye. Tom tunes them later in the sub-project 2 desk.

## 2. Terminal portal

Tom chose "Lit terminal portal" for the end of the causeway.

- The causeway lands on a quay embankment at the port edge. The embankment is a sloped concrete wedge from the deck to the sea.
- The track runs into one brutalist block: about 60 m wide, 30 m tall and 80 m deep. Plain precast faces, no props.
- The block has one portal mouth on the track: 9 m wide and 8 m tall, lit from inside with a warm, even light.
- The mouth light spills onto the last 40 m of deck. It is a light in the light list, so the bake and the relight both use it.
- A soft light shaft leaves the mouth into the fog. It uses the existing `cone()` material.
- The block and the embankment use the `precast` material. They bake with the still layer.
- The portal is the train's far end. `END` moves 20 m past the mouth. The baked block hides the train by depth as it enters; then the train hides.

## 3. Smoothness

Tom chose all four kinds.

### 3.1 Frame rate

- During a ride, the mirror renders on every second frame. The sea uses the last mirror on the other frames.
- `k2portFog` returns at once when `uPortFog` is 0. Tom's default is 0.
- Measure frame times in the browser pane during a ride and in the wide shot. Record both in the bean.

### 3.2 Ride camera

- Position and aim follow critically damped springs, not a straight lerp. The time constant is 0.35 s.
- The way in and the way out rise on an arc: the camera lifts 12 m above the straight line at the middle of the move.
- The ease in takes 2.2 s. The ease out takes 2.6 s. Both use smootherstep.
- The aim point never jumps when it passes the nose or the tail: it follows its spring.

### 3.3 Train motion

The train speeds up and slows down; it never reverses at full speed.

| Phase | Motion |
|---|---|
| Leave the portal | Speed rises from 0 to cruise over 6 s. |
| Cruise | Tom's speed setting. |
| Near either end | Speed falls to 0 over the last 220 m, in a smooth curve. |
| Wait | `pause` seconds; the minimum is 1 s. |

- The near end (`START`) keeps its stop out of frame, behind the camera.
- `dt` stays capped at 0.05 s. A long frame slows the train; it never jumps.

### 3.4 Edges and shimmer

- Rails: a rail shader fades the rail as its width drops under one pixel, so it never breaks into dashes.
- Deck joints: they already fade by pixel footprint. The fade starts sooner.
- The baked still layer keeps its 2x supersample.
- High quality uses 4x MSAA in the post chain. Standard keeps 2x.

## 4. Out of scope

- Sub-project 2: fog as a live layer from depth, the tune desk by layer (Sky, Cloud, Air, Port, Causeway, Water, Train, Lens, Camera) with a mute per layer, and the player Settings tray (Quality, moods).
- Sub-project 3: lights wave (tap the port), lightning (double-tap the sky), fog roll (the bar's Fog slider).
- The gesture map after sub-project 3: tap water ripples, tap the train rides, tap the port starts the lights wave, tap the sky sends a train, double-tap the sky is lightning, drag steers the searchlight.

## 5. Checks

Tom said no Playwright. Check in the browser pane while it is visible.

1. The console is clean in the wide shot and during a ride.
2. Screenshots: the wide shot, the portal, and a ride with the train beside the camera.
3. Frame times during a ride and in the wide shot, recorded in the bean.
4. Only the lamps in the table above flare.
5. The train slows into the portal, waits, and leaves at speed.
