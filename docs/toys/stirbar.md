# Stir vortex (`stirbar`)

Lab toy, idea 85. Bean `stimming-yelr`. Plan: `docs/plans/stirbar.md`.

A glass beaker of water stands on a magnetic stirrer: a black body, a white ceramic plate, one knob, an amber lamp. A white stir bar lies on the floor of the beaker.
Turn the knob: the bar spins up, the water follows, and the surface dips into a silver funnel that deepens toward the bar. Tap the water: a pipette comes down and lets one drop of dye fall. The drop spirals in under the surface, winds round the funnel and is drawn down it in helical threads. Turn the knob down: the bar stops, the water spins on, the funnel relaxes and the swirl dies slowly.

## Play

| Input | Does |
|---|---|
| Click or tap the water (or anywhere off the knob) | The pipette drops one drop of dye on that spot |
| Hold | Drips once each 0.65 s; a drag moves the spot |
| Drag the knob | Up or right turns it up, down or left turns it down |
| Tap the knob | One step up; at the top, off |
| Wheel, arrow keys | Turn the knob by 4 or 5 percent |
| Speed slider | The knob |
| Dye choice (1, 2, 3) | Blue (food dye), Violet (permanganate), Green (fluorescein, it glows) |
| Drop (Space) | A drop on a random spot |
| Rinse (R) | Fresh water: the dye fades out in 1.5 s |

- The motor follows the knob in about 0.5 s. The water spins up with a 1.9 s time constant and down with 9 s, so the swirl outlives the bar.
- The funnel depth grows with the square of the spin and keeps the volume: the rim rises as the centre dips. At full speed the tip stops 3.5 mm over the bar. The tip wanders round slowly.
- The first frame: the stirrer at 60 percent, two drops a few seconds old wound round the core.

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, knob, pipette and drop, pointer, Bar v3 spec, frame loop |
| `rig.js` | Sizes, the camera, the free surface, the stirred flow, the dye tracers |
| `scene.js` | Raw WebGL2: dye splat, bench, scene, bloom, grade |
| `sound.js` | Web Audio: two loops and one-shots |

- 3D, a fixed camera a little above the water line. Signed distances draw the stirrer, the beaker (rolled rim, thick floor), the bar with its pivot ring, and the pipette.
- The free surface is a height field: a vortex profile `(1 + (r/a)^2)^-p` (a 4.2 mm, p 0.62) scaled by the dip, offset so the volume holds. The march finds each crossing by bisection, then refracts or reflects. Total internal reflection gives the funnel its silver; a wall bounce or a floor exit near the critical angle is capped so no stripes form.
- The flow: rotation with a core (`1 / (1 + (r/rc)^2)`, rc 6 mm), an Ekman cell (in under the surface, down a jet at the core, out on the floor, up the wall), six smooth divergence-free shear waves for eddies, a faint random walk, and a slow sink.
- The dye: 12,000 tracers per drop on the CPU, at most four drops; an older drop joins a uniform tint. Each frame they splat into a 112 x 112 x 64 atlas (RGBA16F, additive points). The march reads it with Beer-Lambert absorption, a little scatter, and fluorescence for the green dye.
- Thread detail: a helical pattern that turns with the core and slides down it shapes the tracer density into strands, as Fire's grain shapes its smoke.
- The light: a dark room with a soft glow on the backdrop behind the beaker, so the dye reads against backlit water; a cool key from the back left lights the plate and casts the beaker's shadow and the bar's.
- Each loop count adds a uniform zero, and the interior march has one call site: the scene program links in about 2 s on D3D11, not 14 s.

## Frame loop

- Lively while the knob moves the motor, the pipette or a drop is in flight, a drop is under 6 s old, or a rinse runs.
- Drifting at 30 fps while the water turns or dye moves.
- 60 s after the last input the scene eases to a stop over 2 s; the loop sleeps. A still beaker with settled dye sleeps at once.
- Hidden tab: the loop and the sim clock stop.
- Reduced motion: the motor and the water ease more slowly, the flow runs at 60 percent, no eddies, no random walk, small ripples.

## Sound

Muted by default. The context suspends 1.5 s after the loop sleeps.

- Loops: a faint motor hum and whir that rise with the bar; the swirl of the water, a band of noise that rises with the spin. A deep funnel gulps small bubbles.
- One-shots: knob detents each 5 percent, a switch click on and off, a rub when the knob is gripped, the pipette's swing, the teat's squelch, the drop's plink with its splash, and the rinse with its gulps.

## QA (headless Edge, D3D11, RTX 3070), 2026-11-23

| Check | Result |
|---|---|
| Q1 | `node --check` passes on the four modules, the six menu scripts with the new hook, and the icon page |
| Q2 | Clean console in play (chips, Drop, Rinse, keys, tap, hold, knob drag, wheel), on `?lab` with the tile hovered, and on the icon page |
| Q3 | Captures in `docs/qa/stirbar/`: blockout, first frame, full speed, the drop at 0.45, 2 and 5 s, spin-down, phone, reduced motion, Lab tile, icon round, sheet row, `sequence.jpg` |
| Q4 | Drift 32 rAF per second (the drift delay is now 34 ms); 62 s after the last input, 0 frames in 2 s |
| Q5 | Hidden tab: 0 frames in 2 s |
| Q6 | Reduced motion: clean console; the drop and the funnel still answer, slower, with no eddies |
| Q7 | Bar v3: the Dye choice, Drop, Rinse, the Speed slider (4 controls); How to play has 4 rows |
| Q8 | Arrows turn the knob by 5 percent; 1, 2, 3 pick the dye; Space drops; R rinses |
| Q9 | The context runs after a gesture and is suspended once the toy sleeps |
| Q10 | Frame times through a drop at full speed: median 7.6 ms, p95 8.2 ms, max 14.7 ms (a 132 Hz headless clock) |
| Load | `tools/loadtime.mjs`: first frame 2.3 s cold, 2.2 s warm; the scene program links in about 2 s |

## Open

- Tom sets the Dutch name (draft: Roerkolk).
- Tom picks the icon; A is on the menu until then.
