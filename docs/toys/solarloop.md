# Solar loop (`solarloop`)

Lab toy, idea 238. Bean `stimming-e35i`. Plan: `docs/plans/solarloop.md`.

A close view of the sun's edge, as a solar space telescope sees it in extreme-ultraviolet light. The disk fills the foot of the frame, mottled, with bright moss where loops stand. Above the edge, loops of glowing plasma arc on magnetic field lines: fine threads in bundles that rise, brighten, drain and fade, one after another. Tap a region and it flares: two ribbons flash and saturate the detector, a twisted rope lifts off as a bulb and leaves the frame, a faint bubble swells behind it and a wave runs over the disk. A new arcade snaps in over the ribbons, cools, and rains back. The region is calm again after about 45 s.

## Play

| Input | Does |
|---|---|
| Click or tap the stage | Flares the region nearest the tap |
| Drag | Turns the sun up to 18 degrees each way; the surface follows the hand |
| Band choice (1, 2, 3) | Gold (171), Teal (131), Red (304) |
| Activity slider | How many loops live, how bright, how fast they cycle |
| Flare (Space) | Flares each region in turn, the ones in view first |

- The first frame is a picture: every loop at its own stage of life.
- The view is orthographic, as a telescope sees: the limb is a gentle arc across the lower third (a third of the way up the free stage on a phone too).

## The bands

Each band sees its own temperature, so one flare reads three ways. The image is one intensity channel, stretched by a log curve, then coloured by the band's table, as the real images are made.

| Band | Sees | In a flare |
|---|---|---|
| Gold, 171 (default) | Iron at about one million kelvin: coronal loops as fine threads | The ribbons, the snap of each new loop, the rope's sheath; the arcade glows as it cools to one million kelvin, from about 6 s |
| Teal, 131 | Hot flare plasma near ten million kelvin, and cool loops near 0.4 million | The arcade burns at once, while it is hot; the quiet loops are dim |
| Red, 304 | Cool plasma near 50,000 kelvin: the chromosphere, spicules, filaments, rain | A bright disk with a ragged fringe of spicules; the rope and the rain shine |

Gold is the default: 171 draws loops as sharp fine threads, the classic picture of loops over the limb, and its warm gold keeps the toy apart from Desert eclipse's white corona and pink prominences.

## The model (lengths in Mm; the sun's radius is 696)

| Part | Model |
|---|---|
| Regions | Five active regions round the visible limb: on the near side, on the limb, behind it (only the loop tops show), and on the disk (loops foreshortened) |
| Loops | Bundles of three to six threads between two footpoints on the sphere, height about half the span, with a tilt, a shear and a turned axis. Each lives 24 to 46 s: it rises, shines, drains (knots slide down both legs with growing speed) and fades, then returns with a new shape. Faint long loops climb out of the frame |
| Flows | Faint ripples climb from the feet: the upflows seen in real loops |
| Flare | Peak in 0.05 s. Ribbons part from 12 to 62 percent of the region's span. The rope rises at 22 Mm/s plus 84 Mm/s² and swells into a bulb. Arcade loops form at 0.45 s, then about every 0.6 s, low first; each is born at 22 million kelvin and cools with a 1.6 s time constant; rain from 12 s after its birth |
| Detector | Above saturation: a diagonal cross of diffraction spots from the filter mesh, and a vertical bleed line along the readout column |

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, the telescope view, the turn, picking, Bar v3 spec, frame loop |
| `sun.js` | The regions, the loop life cycle, the flare timeline, the bands; it writes one strand per thread |
| `render.js` | Raw WebGL2: the disk and corona pass, instanced strands, bloom (`shared/glow.js`), the final pass |
| `sound.js` | Web Audio |

- The disk pass: a warped cell network at supergranule scale, mottle and speckle, limb brightening (a longer path through the thin corona), moss under each region, a haze over each region, the off-limb corona with a scale height near 50 Mm and radial streaks, a spicule fringe. During a flare: the wave front over the disk and the dimming behind it, the bubble's shell and cavity.
- The strands: each thread is a camera-facing ribbon of 56 samples, drawn instanced with additive blending, as optically thin plasma adds up. A thread seen along its length is brighter (a longer path). The sun hides what stands behind it, and the chromosphere dims the feet. Threads thinner than 1.5 px keep their total light.
- The final pass: the detector's cross and bleed, the log stretch, the colour table, a light vignette and shot noise.

## Frame loop

- Lively while a flare runs or a drag turns the sun.
- Drifting at 30 fps: the loops' life cycle.
- Asleep 60 s after the last input: the drift eases to a stop over 2 s and the loop stops.
- Hidden tab: the loop and both clocks stop.
- Reduced motion: no drift; the loop sleeps at once. A tap still flares, softer (70 percent) and slower (80 percent); the shot noise holds still.
- Slow frames step down one rung, then two (`shared/detail.js`): a lower pixel ratio, then fewer bloom levels.

## Sound

Muted by default. Space makes no sound, so this is a sonification: each part has a visible cause and pans with its region.

- The flare: a crack of bright noise on a falling thump; a rush of noise swept upward as the rope lifts; a low roar under the eruption.
- Each arcade loop that snaps in: a glassy note, one step up a minor pentatonic scale. The band sets the key.
- The glow: a slow chord while the arcade shines.
- The rain: soft drips, each a falling note, from 12 s.
- A drag: a low wind that follows the speed of the turn.
- A wide hall: three long echoes.

## QA (headless Edge, D3D11, RTX 3070), 2026-11-23

| | Result |
|---|---|
| Q1 | `node --check` passes on the four modules, the menu scripts and the icon page script |
| Q2 | Clean console in play (every chip, key, tap, drag), on the menu with the tile hovered, and on the icon page |
| Q3 | Captures in `docs/qa/solarloop/`: 1280 x 800, 375 x 812, each flare stage, a turned view, the menu tile |
| Q4 | Drifting: 32 rAF a second. Asleep 63 s after the last input: 0 rAF in 2 s |
| Q5 | Hidden tab: 0 rAF in 2 s |
| Q6 | Reduced motion: clean console; 0 rAF in 2 s at rest; a tap still flares, softer |
| Q7 | Band choice, Flare, Activity slider (3 controls); How to play has 2 rows |
| Q8 | 1 to 3 and Space each do their job |
| Q9 | The context runs after a gesture and is suspended once the toy sleeps |
| Q10 | Frame times through a flare: median 7.5 ms, p95 8.1 ms. Build to first frame: 1.0 s; first frame 1.4 s after navigation |
