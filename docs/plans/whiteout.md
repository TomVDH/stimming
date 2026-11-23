# Whiteout

Status: built as a Lab toy, 2026-11-23; waits on Tom's look. Bean `stimming-dl2w`. Toy doc: `docs/toys/whiteout.md`. Idea 209, group C, batch 8.
Brief (Tom): "MVP at high fidelity, with icons for the lab and intro as well, bar v3".

A polar hut on an ice field at night, in a blizzard. The storm breathes in gusts: the hut fades nearly to nothing and comes back. Tap the door lamp: a warm cone pours into the driving snow.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D, one fixed camera, raw WebGL2 | A blizzard is depth: haze thickens with distance, and the cone has volume. |
| Shot | A long lens (about 20 degrees) at eye height, 25 m from the hut | The lens stacks the snow between camera and hut, as in storm photographs. |
| Hut | A small orange box hut on skids, a shallow roof, one door, one window, the lamp over the door. The mast stands behind on the right with three guy wires. | The two shapes the brief names, and nothing else. |
| Wind | From the right, a little toward the camera | The snow crosses the cone, so every flake streaks through it. |
| Light | Off: a dim blue-grey storm glow, brighter in the upper right where a moon sits behind cloud. On: one hooded bulkhead lamp, about 2700 K. | One key light; the lamp is the event. |
| First frame | The storm between gusts, the hut clear, the lamp off, a faint warm window | A composed picture; the hero waits for the tap. |

## Hero

1. The storm breathes. A gust front arrives from the right: the haze thickens, the horizon and then the hut fade to grey-white, and the gust passes.
2. Tap the lamp (or anywhere on the stage): the filament catches with two short flickers, then the cone pours out. The snow in the cone streaks warm; the halo blooms in the haze; the wall below the lamp washes bright; a warm pool spreads on the snow.
3. A gust swallows the cone to a warm smear, then gives it back.

## True details

- Ground drift: snow streams low and fast in snakes, under the falling snow.
- Rime: white feathers on the windward faces of the hut, the mast and the guy wires.
- The lamp: an incandescent filament flickers on a cold start and glows orange as it dies.
- The cone's edge is soft and lit from inside: forward scatter makes it brighter toward the camera.
- Sound: the wind's pitch and level rise with each gust; the guy wires sing in the strong gusts; the switch clacks; the bulb ticks as it cools.

## Build

| Part | How |
|---|---|
| Surfaces | One signed-distance march into a G-buffer, once per size (the camera never moves). Each frame lights it. |
| Mast and wires | The mast is in the surface march. The guy wires are analytic segments in the light pass, with pixel coverage, so thin lines never break up. |
| Haze | A half-resolution march to the surface: wind-carried noise, a ground layer, gust fronts. Fire's smoke lighting (K3: Beer, multiple scatter, powder, Henyey-Greenstein) for the lamp; an ambient floor and the moon lobe. |
| Snow | Instanced streaks. Each flake's place is a function of seed and storm time; the vertex shader lights it from the lamp and fades it through the haze. Near flakes blur to soft discs. |
| Post | Bloom (`shared/glow.js`), a lamp flare after Buoy Business (`shared/flare.js`: veil, orb, ghosts; the long streak read as a horizon line, so it is nearly off), the grade (`shared/grade.js`). |
| Sound | Web Audio, muted by default: a wind bed and gust swells, a wire whistle, the switch, the bulb. |

## Bar v3

- Lamp (Space): switch the lamp on or off. `aria-pressed`.
- Gust (G): call a gust now.
- Wind slider, calm to gale: the storm's strength, its density and speed.
- Hold the stage: the gust holds while you hold.

## Frame loop

Drifting at 30 fps while the storm moves. Lively at full rate during a switch, a called gust or a hold. Asleep 60 s after the last input: the storm eases to a stop over 2 s and the wind fades. Hidden: stops at once. Reduced motion: the storm stands still; gestures fade the lamp and the haze with no flicker.

## Keep apart

- Snow globe (`snow/`): a globe you shake; no wind, no place.
- Night viaduct (`viaduct/`): a train on a bridge in falling snow. Whiteout has no motion but the storm, and its snow is driven sideways.
