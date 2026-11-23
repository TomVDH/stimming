# Solar loop (`solarloop`)

Lab toy, idea 238. Bean `stimming-e35i`. Plan: `docs/plans/solarloop.md`.

The sun's edge at a vast scale, graded like film. The look takes its cue from two kinds of film: the sun as a furnace, all gold and white light, and the slow, hazy, monumental frame of large-scale science fiction.
The disk is a dome across the foot of the frame: boiling granules, slow swirls, dark filaments. Above the limb, loops of plasma arc on field lines and drain back. Two giant prominences stand over everything: a hedgerow, a forest of fine threads 165 Mm tall, and an arch, a twisted rope 200 Mm high. Under the arch, the earth hangs at true scale, a dark dot 12.7 Mm across.
Tap a region and it flares: two ribbons flash, the core burns white with an anamorphic streak and lens ghosts, a twisted rope lifts off as a bulb and leaves the frame, a bubble swells and a wave runs over the disk. A new arcade snaps in, cools and rains back. Tap a prominence and it erupts: it lifts and swells into space over about 15 s, then forms again.

## Play

| Input | Does |
|---|---|
| Click or tap the stage | Flares the region nearest the tap, or lifts off the prominence nearest the tap |
| Drag | Turns the sun up to 18 degrees each way; the surface follows the hand |
| Band choice (1, 2, 3) | Gold, Teal, Red: three film grades |
| Activity slider | How many loops live, how bright, how fast they cycle |
| Flare (Space) | Flares each region in turn, the ones in view first |

- The first frame is a picture: every loop at its own stage of life.
- The view is orthographic. It is 1040 Mm across on a wide stage (760 at mid widths, 520 on a phone), so the limb reads as a dome. The limb's top stands about a quarter of the way up the free stage.

## The bands: three film grades

The image holds two light channels: hot plasma (the disk, the corona, the loops) and cool plasma (the prominences, the chromosphere, the rope). Each band is a film grade: a tone curve (1 minus e to the minus light), then a colour ramp per channel, mixed by how much of the light is cool. Each band still weights the loops by its own temperature, so one flare reads differently in each.

| Band | Grade | Sees |
|---|---|---|
| Gold (default) | Warm black, ember, amber, gold, white; the prominences run redder than the corona | Loops near one million kelvin; the arcade glows as it cools, from about 6 s |
| Teal | Cold steel, nearly one colour; the prominences in sand | Hot flare plasma: the arcade burns at once |
| Red | Crimson to pink white | Cool plasma: the prominences, the rope and the rain at their brightest |

Gold is the default: the sun as a furnace, and apart from Desert eclipse's white corona and pink prominences.

## The model (lengths in Mm; the sun's radius is 696)

| Part | Model |
|---|---|
| Regions | Five active regions round the visible limb: on the near side, on the limb, behind it (only the loop tops show), and on the disk (loops foreshortened) |
| Prominences | A hedgerow: 80 fine upright threads along 260 Mm of limb, up to 165 Mm tall, each swaying. An arch: 18 twisted threads between feet 270 Mm apart, 205 Mm high, its feet behind the limb. Knots of cool plasma slide down every thread. An eruption lifts the prominence with growing speed (the arch swells into a bulb), fades it out by 17 s, and forms it again from 24 s to 44 s |
| Scale | The earth, 12.7 Mm across, under the arch: a dark dot lit at its rim |
| Loops | Bundles of three to six threads between two footpoints on the sphere, height about half the span, with a tilt, a shear and a turned axis. Each lives 24 to 46 s: it rises, shines, drains (knots slide down both legs with growing speed) and fades, then returns with a new shape. Faint long loops climb out of the frame |
| Flows | Faint ripples climb from the feet: the upflows seen in real loops |
| Flare | Peak in 0.05 s. Ribbons part from 12 to 62 percent of the region's span. The rope, 12 threads, rises at 14 Mm/s plus 20 Mm/s² and swells into a bulb. Arcade loops form at 0.45 s, then about every 0.6 s, low first; each is born at 22 million kelvin and cools with a 1.6 s time constant; rain from 12 s after its birth |
| Lens | The flare's core burns white, with an anamorphic streak and three ghosts on the line through the frame's centre |

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, the telescope view, the turn, picking, Bar v3 spec, frame loop |
| `sun.js` | The regions, the loop life cycle, the flare timeline, the bands; it writes one strand per thread |
| `render.js` | Raw WebGL2: the disk and corona pass, instanced strands, bloom (`shared/glow.js`), light rays, the final pass, the colour ramps |
| `sound.js` | Web Audio |

- The disk pass: boiling granules, swirls of noise bent by noise, a faint supergranule network, dark filaments, limb darkening (Gold) or brightening (Teal), moss under each region, a haze over each region, the corona with streamers and a long tail, a red chromosphere rim and a spicule fringe. During a flare: the wave front over the disk and the dimming behind it, the bubble's shell and cavity.
- The strands: each thread is a camera-facing ribbon of 56 samples, drawn instanced with additive blending, as optically thin plasma adds up. A thread seen along its length is brighter (a longer path). The sun hides what stands behind it, and the chromosphere dims the feet. Threads thinner than 1.5 px keep their total light.
- Light rays: at half size, each pixel marches 40 steps toward the sun's centre through the bright light, then slow angular shafts break it into rays.
- The final pass: heat shimmer at the limb, colour split toward the edges, the grade (three times, one per colour), halation, the lens streak and ghosts, the earth, a vignette and film grain.

## Frame loop

- Lively while a flare or an eruption runs, or a drag turns the sun.
- Drifting at 30 fps: the loops' life cycle.
- Asleep 60 s after the last input: the drift eases to a stop over 2 s and the loop stops.
- Hidden tab: the loop and both clocks stop.
- Reduced motion: no drift; the loop sleeps at once. A tap still flares, softer (70 percent) and slower (80 percent); the shot noise holds still.
- Slow frames step down one rung, then two (`shared/detail.js`): a lower pixel ratio, then fewer bloom levels.

## Sound

Muted by default. Space makes no sound, so this is a sonification: each part has a visible cause and pans with its region.

- Awake: a deep hum, a low chord whose filter breathes about every 20 s. The band sets the key.
- A flare or an eruption lands on a low brass blast: stacked saws through a soft clip, a filter that opens and closes.
- An eruption: a long rush swept upward over 13 s, and a tone that bends up a fifth.

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
| Q3 | Captures in `docs/qa/solarloop/`: 1280 x 800, 375 x 812, each flare stage, a turned view, Teal, Red, the arch erupting (15), the menu tile |
| Q4 | Drifting: 32 rAF a second. Asleep 63 s after the last input: 0 rAF in 2 s |
| Q5 | Hidden tab: 0 rAF in 2 s |
| Q6 | Reduced motion: clean console; 0 rAF in 2 s at rest; a tap still flares, softer |
| Q7 | Band choice, Flare, Activity slider (3 controls); How to play has 2 rows |
| Q8 | 1 to 3 and Space each do their job |
| Q9 | The context runs after a gesture and is suspended once the toy sleeps |
| Q10 | Frame times through a flare, after the cinema pass: median 7.7 ms, p95 8.4 ms. Build to first frame: 1.0 s |
