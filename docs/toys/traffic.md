# Traffic wave (`traffic/`)

| | |
|---|---|
| Dutch | Spookfile /ˈspoːkˌfilə/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.68 0.21 27)`, brake-light red |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 93, group B: cars circle a ring road; tap one to brake, and a phantom jam ripples backward long after it moves on. Bean `stimming-9nb7`. Plan: [traffic.md](../plans/traffic.md), an MVP.
The model follows the ring-road experiment of 2008 (Sugiyama and others): 22 cars on a 230 m circle.

## Rules

- The Intelligent Driver Model on the CPU, 120 substeps a second. v0 14 m/s, T 0.6 s, s0 1.3 m, a 2.2 m/s², b 1.6 m/s². T and a vary by a few percent per driver.
- Each driver keeps an own stopping gap, 0.7 to 1.9 m, so a stopped queue has uneven gaps.
- Each driver has an own reaction time, 0.25 to 0.75 s: the foot follows the wanted pull this late. Braking follows twice as fast. Inside the stopping gap the driver brakes at once.
- Cars never pass. Each car follows the next car in the list.
- A tap brakes a car at 7 m/s² to a stop and holds it 0.7 s. A hold keeps it stopped until the release.
- Brake lights come on under 0.85 m/s² of braking and below 0.4 m/s, and fade over 0.18 s.
- At 22 cars a tap leaves a jam that slows cars for about 75 s and lights brake lights for about 105 s, then heals. The jam runs backward at about 25 km/h.
- Past about 25 cars the flow cannot heal: a small wander of each driver's foot starts jams by itself, as on the real ring.
- New cars join in the widest gap; leaving cars fade out over 0.6 s.
- Even out eases every car to an even spread at the steady speed over 1.6 s.

## Direction

- Flat, top down, at night: a high camera over a lot, as in the footage. One flood mast off the top left is the key light, with soft car shadows away from it; the moon adds a cool fill.
- One lane between worn white lines, two polished wheel tracks, a concrete kerb and a rough grass island. A start line crosses the lane at six o'clock.
- Headlights throw two cones along each car's heading, one from each lamp, splayed a little outward; the car ahead blocks its follower's beam and lights up on its boot.
- Tail lights glow dim red; brake lights flare and pool red on the asphalt, and bloom.
- The strip: time against the place on the ring, the last 64 s. Now is the edge beside the ring. Each car draws its path: blue-white in flow, amber when slow, red under brakes. A deep red field marks where cars crawl. A white ring marks each tap. A hairline every 10 s.
- At 375 px the strip moves under the ring and time runs down from the ring.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Brake (Space): the car nearest the start line. Even out (E). |
| Slider | Cars: 12 to 30, default 22 |
| Stage | Tap a car: brake. Hold a car: keep it stopped. |

## Frame loop

- Lively while a press, a brake, a jam or Even out runs, and for 3 s after input: full rate.
- Smooth flow alone: 30 fps, paced by a timer.
- 60 s after the last input the sim clock eases to a stop and the loop sleeps. Input wakes it.
- Hidden: the loop and the sim clock stop at once.
- Reduced motion: the first frame holds still until a gesture; the sim sleeps 30 s after the last input.

## Sound

Muted by default. A low engine drone and tyre roar follow the mean speed. Each car's brake lights coming on make a soft tyre scrub, panned to the car, so the ripple runs round the stereo field; hard stops add a short squeal. A tap: a firm scrub, a thump and a squeal. Even out: a soft swell of air. Output RMS about 0.04 to 0.055.

## Files

| File | Holds |
|---|---|
| `index.html` | The page |
| `main.js` | Layout, the strip's columns, input, the frame loop |
| `sim.js` | The car-following model |
| `render.js` | Ground, cars, strip, bloom and grade (raw WebGL2) |
| `sound.js` | Web Audio |

## Open

- Tom: the Dutch name.
- The strip could wrap round the ring instead: time running outward, so the jam draws a spiral that turns against the traffic.
