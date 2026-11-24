# Superconductor track

Status: in build as a Lab toy, 2026-11-22. Bean `stimming-jm2w`. Toy doc: `docs/toys/supercon.md`.
Idea 130, group A, a science toy: "A frosty puck floats and locks over a magnet track; push it."
Tom's brief: an MVP at high fidelity, Lab and intro icons, Bar v3. One hero moment, finished.

## The real demo

A thin disc of yttrium barium copper oxide (YBCO) on a sapphire wafer, wrapped in plastic film, is cooled in liquid nitrogen (77 K, under its 93 K limit).
Set over a loop of neodymium magnets, it locks in place by flux pinning: field lines thread the disc through defects and stay there.
It keeps its height and its tilt, and it glides along the loop with almost no friction, because the field does not change along the track.
Boil-off and frozen air pour off it as a white fog that sinks. After a minute or two it warms, loses the lock and drops onto the track.

Reference photos: Wikimedia Commons, search "superconductor levitation magnet" (a black YBCO pellet with a white frost crust over nickel-plated magnets; a wrapped disc that steams over a ring track, its vapour pouring off the rim).

## Defaults (chosen in the build chat)

| | Choice | Why |
|---|---|---|
| Type | Scene: three.js 0.170, WebGL | The gap under the puck, its tilt and the sinking fog need depth and a shadow. A flat view loses the lock. |
| Shot | A fixed camera 22 degrees above the bench, the ring centred; a tall frame looks down at 46 degrees | The ring reads as an ellipse; the gap under the puck shows at the front of the loop. |
| Place | A dark lab bench of black epoxy in a dark room. One cool overhead lamp from the upper left; a faint blue fill | Light carries the scene: the lamp lights the fog, glints on the nickel and throws the puck's shadow on the track. |
| Track | A ring 0.34 m across: two rows of nickel-plated magnet blocks with a steel strip between, on a low black base | As the ring tracks of the classic demo. |
| Puck | A disc 66 mm across and 5 mm thick, wrapped in film, frosted white | The wrapped disc of the classic demo. |

## Hero

1. The puck hovers 12 mm over the ring, frosted, fog pouring off its rim and sinking over the track to the bench.
2. Drag it along the track and let go: it glides round the loop, keeps its height and tilt, and leans out a little at speed.
3. Hold it, then drag: it lifts (up and down) or tips (left and right). It moves in small snaps as the pins let go, and stays in the new pose.
4. It warms: the frost thins, the fog slows, the lock sags, and at last it drops onto the track with a clack and slides to a stop.
5. A tap pours liquid nitrogen on it: a stream, a burst of boil and fog, beads that skate off over the track, the frost comes back and the puck rises to its pinned height.

## Sim

- The puck's place on the loop is one angle with an angular speed. The loop does not pin it along the track, so only a slow drag (tau 40 s) slows it.
- Height, tilt and side offset are damped springs to the pinned pose (7 Hz, damping 0.12). Speed on the curve pushes it out a little.
- Warmth runs from 0 to 1 in 52 s of loop time, so the puck is down before the 60 s sleep. Frost thins from 0.3; the lock weakens past 0.75; at 1 the puck drops.
- A pour sets warmth to 0. Beads of nitrogen are small spheres that skate on the track and the bench (Leidenfrost) and shrink away.

## Look

- Fog: a raymarched volume of puffs, born at the puck's rim, sinking and spreading on the track and bench. Fire's smoke shading, from `shared/smoke.js`.
- Frost: a white crystal crust on the top and the rim, eroded by noise as it warms; then a wet sheen.
- One bloom with a threshold, a grade with a vignette and grain.

## Sound

- A soft boil hiss and crackle while cold, panned with the puck, falling as it warms.
- A faint air rush with speed. A film crinkle on a grab. A small tick on each snap of the pin.
- The pour: a liquid stream, a hard boil that settles, bead ticks. The drop: a ceramic clack on steel, a short scrape.

## Frame loop

- Lively while the puck moves, a pour or beads are in flight, or the pointer holds.
- Drifting while the puck is cold and fog pours: 30 fps. The loop sleeps when the puck has dropped and the fog is gone, or 60 s after the last input.
- Reduced motion: the fog stands still; the puck keeps its pose; gestures still answer.

## Bar

| Slot | Holds |
|---|---|
| Actions | Push (Space), Cool (C) |
| Slider | Height: the pinned height, 4 to 26 mm |
| Settings | Quality (shared) |
| How to play | Drag, hold and drag, tap, Space, C |
