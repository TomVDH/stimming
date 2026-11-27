# Calving (`calving/`)

| | |
|---|---|
| Dutch | Kalven /ˈkɑlvə(n)/ (draft) |
| Motto | The glacier has decided to downsize. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.09 220)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 57, group C: a glacier face in a fjord. Bean `stimming-2ddv`. Plan: [calving.md](../plans/calving.md). Tom sized the full toy XXXL; this is the MVP cut: one shot, one kind of calving, scaled by the hold.

## Rules

- One fixed camera position, low on the water about 760 m from the face. Drag pans; the Lens slider zooms. No modes.
- The sim is in metres and seconds. Sound travels at 343 m/s: the crack, the groan, the fall and the boom arrive about 2.2 s after their light.
- The surge runs at 33 m/s, the speed of a long wave in 110 m of water. It reaches the camera about 23 s after the impact; the camera boat then lifts and rocks.
- The loop runs at full rate while a crack, a tower, a block, spray or a surge is in flight. Ripples, mist and floes drift at 30 fps until 60 s after the last input; then the loop stops.

## Direction

- 3D, three.js 0.170. The answer to Tom's "3D or flat": 3D, a long lens from a boat. Scale and slowness read best from low on the water.
- One key light: a low sun behind the glacier and to the left. The face stands in its own shade, blue-white; the crests glow where the sun comes through.
- A dark headland closes the fjord on the left; the face fills the right two thirds; a snow range closes the valley behind. The water is a black-green mirror with brash ice.
- Wide stage: the waterline sits low. Tall stage: the lens keeps most of the face width and shows more sky and water.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Calve (Space): a tap calves a small tower where you look; a hold grows a big one |
| Slider | Lens: wide fjord to long lens; stored as `stimming.calving.lens` |
| Settings | Quality (shared), Reset (clears the ice that fell, pan and lens back to their defaults) |

| Input | Does |
|---|---|
| Press on the stage | Starts a crack on the face column under the pointer, at once |
| Release | The tower goes: it settles, leans out, breaks into blocks and falls |
| Hold (up to 2.4 s) | The crack runs wider along the grooves and lower to the waterline: a bigger tower |
| Drag | Pans along the face; the crack heals |
| Space | Tap or hold, as a press, on the face in view |

## The calving

1. The crack runs from the press along the grooves between columns and across the base. Dust and chips fall from it.
2. On release the face carves back by the tower's depth. The tower is built from the same grid points, so nothing shows until it moves. The fresh scar is clean blue and pales over four minutes.
3. The tower settles, then leans out on its hinge like a falling column. At its break angle it parts into stacked blocks, each with the speed it had.
4. A block that hits the water throws a splash: a white column with jets, drops, a base roll that runs out over the water, then mist that drifts on a light down-fjord breeze.
5. Each impact starts a surge and a foam patch. Floes and the new bergs ride it; the bergs turn flat side down and drift out.

## Sound

Web Audio on the shared kit, muted by default. Late by distance, on the audio clock: the first crack (a snap, a thud, two echoes off the walls), small snaps as the crack runs, a rising groan while the tower leans, the report and the roar of the fall, the boom and long hiss of the impact. Near the camera, at once: the wash of the surge and floes knocking. Mute and a hidden tab stop every pending sound; the context sleeps after the last one.

## Files

| File | Holds |
|---|---|
| `index.html` | Page skeleton |
| `main.js` | Bar, camera, frame loop, gestures, drawing upload |
| `land.js` | Height functions: the face line, its columns, the walls, the glacier, the far range |
| `scene.js` | three.js objects and shaders: sky, land, face, water and its mirror, brash, puffs |
| `ice.js` | The sim: crack, carve, blocks, chips, spray, surge, floes |
| `sound.js` | Web Audio |

## QA

Captures: `docs/qa/calving/`. Results: see the bean `stimming-2ddv`.

## Open

- Tom's look at the blockout and the hero moment.
- Tom's call on the Dutch name.
- The rest of Stage 4 (time of day, weather, aurora) and the polish list are in the plan; none is built.
