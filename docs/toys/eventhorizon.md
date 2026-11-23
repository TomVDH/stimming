# Event horizon (`eventhorizon`)

Lab toy, idea 237. Bean `stimming-u244`. Plan: `docs/plans/eventhorizon.md`.

A black hole hangs in deep space, ringed by a thin, hot disc of gas. Its pull bends light: the far side of the disc arches over the black shadow and a thinner arc runs under it, a thin bright ring hugs the shadow, and stars near it smear into arcs. The side of the disc that turns toward you shines brighter and bluer; the far end glows deep orange.
Drag to orbit the hole and watch the light swing round it. Tap to drop a star in: it falls from that side, stretches toward the hole, tears into a stream, whips round the shadow and wraps the front of the disc. The stream crosses itself, flares, settles into the disc and spirals in.

## Play

| Input | Does |
|---|---|
| Drag | Orbit the hole: sideways turns round it, up and down tilts over or under the disc. Release glides and eases to a stop |
| Click or tap | A star drops in from the tapped side of the disc |
| Wheel, Zoom slider | Move closer (17 radii) or farther (44 radii) |
| Arrow keys | Orbit in steps |
| Drop (Space) | A star from the far side of the view |
| Reset (R) | The home view: 11 degrees over the disc, 30 radii out |

- Up to three stars fly at once. A star takes about 1.5 s to reach the tidal radius; the stream feeds the disc for about 15 s.
- The first frame is the home view: the lensed disc, the photon ring, the arcs of starlight.

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, the orbit camera, pointer and keys, Bar v3 spec, frame loop |
| `rig.js` | The camera, the star's orbit, the stream particles |
| `scene.js` | Raw WebGL2: the sky cube, the stream splat, the geodesic trace, bloom, grade |
| `sound.js` | Web Audio: loops and one-shots |

- 3D, raw WebGL2. Units of one Schwarzschild radius. Each pixel traces one light ray backward from the eye with RK4 on `x'' = -1.5 h² x / r⁵`, the bend of light in a Schwarzschild field. Steps shrink near the photon sphere and grow far out; a ray that falls inside r = 1 is the shadow.
- Past r = 44 the rest of the bend is the weak-field term `(1/b)(1 - cos θ)`, so the sky lines up at any zoom.
- The disc lies in y = 0, from the ISCO (r = 3) to r = 14. Each crossing adds light, so the photon ring forms from rays that cross many times. Temperature after Novikov and Thorne; turbulence from a tileable noise that shears at the Kepler rate and resets unseen (two phases, cross-faded).
- The shift: gravity `sqrt(1 - 1/r)` times Doppler `1 / (γ (1 + β φ̂·v))` for gas on circles. Light goes as `g⁴`, colour as `g T` on a blackbody fit.
- Stars: point stars from a hashed grid, read in the trace from the bent direction. A pixel that spans more sky spreads the star and keeps its flux, so arcs near the shadow stay clean. The band of the galaxy is a 256 cube, drawn once.
- The star: a Paczynski-Wiita orbit in the disc plane, prograde, pericentre near 4.6. It stretches along the radius as it nears and tears at r = 6.4 into 3,000 particles spread along the radius, so its gas takes a spread of energies.
- The stream: drag toward the circular speed after each pericentre heats the gas (the flare); a slow loss of angular momentum carries it in; inside the ISCO it plunges. The particles splat into a 1024 map of the disc plane (RGBA16F). The trace reads the map as a thin hot slab: light grows with the path through it, so the stream shows edge-on.
- The flare lifts the inner disc's light and temperature, the bloom and the exposure, and fades over a few seconds.

## Frame loop

- Lively while a drag, a glide, a camera ease or a star is in flight.
- Drifting at 30 fps while the disc turns.
- 60 s after the last input the disc eases to a stop over 2 s; the loop sleeps.
- Hidden tab: the loop and the sim clock stop.
- Reduced motion: the disc holds still and the loop sleeps at once; a star still falls, at 60 percent speed, with a softer flare; no glide.
- Slow frames: the first rung lowers the pixel ratio; the second traces at three quarters size.

## Sound

Muted by default. The context suspends 1.5 s after the loop sleeps.

- Loops: a deep drone of two beating sines that swells with the flare; a low roar that opens with the flare; the star's chirp, its orbit frequency as a tone that rises as it falls, panned with it; a soft band of air while the camera swings.
- One-shots: a clear chime when a star arrives, a falling rip with grains and a thump when it tears, a deep boom when the flare takes hold.

## QA (headless Edge, D3D11, RTX 3070), 2026-11-23

| Check | Result |
|---|---|
| Q1 | `node --check` passes on the four modules, the six menu scripts with the new hook, the icon page and the sheet |
| Q2 | Clean console in play (drag, tap, Space, R, arrows, wheel), on `?lab` with the tile hovered, on the icon page and the sheet |
| Q3 | Captures in `docs/qa/eventhorizon/`: blockout, first frame, the drop at 0.6, 1.8, 3.3, 5.2 and 9 s, high and low orbits, phone, phone drop, phone landscape, reduced motion, Lab tile, icon round, sheet row |
| Q4 | Drift 27.5 rAF per second; 62 s after the last input, 0 frames in 2 s |
| Q5 | Hidden tab: 0 frames in 2 s |
| Q6 | Reduced motion: clean console; 0 frames at idle; a tap still drops a star |
| Q7 | Bar v3: Drop, Reset, the Zoom slider (3 controls); How to play has 4 rows |
| Q8 | Arrows orbit (0.22 rad sideways, 0.12 rad tilt); Space drops; R brings the view home |
| Q9 | The context runs after a gesture and is suspended once the toy sleeps |
| Q10 | Frame times through a drop: median 7.6 ms, p95 8.4 ms (headless, uncapped) |
| Load | `tools/loadtime.mjs`: first frame 0.75 s cold, 0.09 s warm |

## Open

- Tom sets the Dutch name (draft: Waarnemingshorizon).
- Tom picks the icon; A is on the menu until then.
- Not checked on a real touch screen or a weak GPU. The trace costs per pixel; the slow-frame rungs are the guard.
