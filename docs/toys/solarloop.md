# Solar loop (`solarloop`)

Lab toy, idea 238. Bean `stimming-e35i`. Plan: `docs/plans/solarloop.md`.

A star's edge at a vast scale, graded like film. The look takes its cue from two kinds of film: the sun as a furnace, all gold and white light, and the slow, hazy, monumental frame of large-scale science fiction.
Eight stars, from a neutron star a city wide to the hypergiant VY Canis Majoris. The disk is a dome across the foot of the frame: boiling granules (or, on the red supergiants, a handful of giant cells), slow swirls, dark filaments. Above the limb, loops of plasma arc on field lines and drain back. Three giant prominences stand over everything: a hedgerow, a forest of fine threads, a twisted arch, and a tall curtain. A scale body hangs at true size: Phobos beside the neutron star, the earth beside Sirius B (larger than the star), our sun beside Sirius and the giants.
Three views, stepped with L. The long lens, the default, fills the frame with the star; its bottom left limb cuts off the bottom left corner, where prominences and loops stand in open space; the camera holds still. The wide view is the dome. The full view shows the whole star. The star is active all round its limb. A raymarched volume of haze and dust, lit by the star with Fire's smoke shading, wraps every star; a body crosses the disk: Mercury on our sun, the moon on Sirius B, our sun itself on the giants.
The film touch is light: fine grain, a soft colour split, a faint lens dirt, highlights that roll off to white.
Tap a region and it flares: two ribbons flash, the core burns white with an anamorphic streak and lens ghosts, a twisted rope lifts off as a bulb and leaves the frame, a bubble swells and a wave runs over the disk. A new arcade snaps in, cools and rains back. Tap a prominence and it erupts: it lifts and swells into space over about 15 s, then forms again.

## Play

| Input | Does |
|---|---|
| Click or tap the stage | Flares the region nearest the tap, or lifts off the prominence nearest the tap |
| Drag | Wide and full views: turns the star up to 18 degrees each way. The long lens holds still |
| Star choice (1 to 8) | Neutron star, Sirius B, Proxima, Sun, Sirius, Rigel, Betelgeuse, VY CMa: smallest to largest |
| Lens (L) | Steps through the long lens (the default), the wide view and the full star, zooming over two seconds |
| Activity slider | How many loops live, how bright, how fast they cycle |
| Flare (Space) | Flares each region in turn, the ones in view first |

- The first frame is a picture: every loop at its own stage of life.
- The view is orthographic. The wide view is 1040 star units across on a wide stage (760 at mid widths, 520 on a phone), so the limb reads as a dome; the limb's top stands about a quarter of the way up the free stage.
- The long lens is the default (Tom, 2026-11-23). It is 560 units across (420 at mid widths, 300 on a phone). The star fills the frame; its limb runs from the middle of the foot to the middle of the left side, and the bottom left corner is open space with its own regions and prominences. The camera never moves there. Loops and prominences draw brighter; the tone curve presses a little darker and harder; the vignette deepens.
- The full view fits the whole star with sky round it. The view pulls back to 3.2 radii tall. The corona is a raymarched 3D volume in the star's own frame, so it turns with the star: streamers gather on a warped sheet round the magnetic equator, narrow as they climb and bend in a slow spiral with height; polar plumes stand at the poles; fine rays run radially. It scatters the star's light with a Thomson lobe (brightest side on) and falls as the radius to the power 2.2 in density. The march reaches 3.4 radii. The exposure halves, so the whole disk shows its surface.

## The stars

The model runs in star units: the star's radius is always 696, so on our sun one unit is one Mm. A scale body's size is its true diameter divided by the star's radius in suns. The image holds two light channels, hot plasma (the disk, the corona, the loops) and cool plasma (the prominences, the chromosphere, the rope); each star grades them through its own pair of colour ramps after a film tone curve.

| Star | Radius (suns) | Look | Scale body: wide, long lens |
|---|---|---|---|
| Neutron star | 0.0000172 (12 km) | Electric blue to white, a smooth surface with white-hot magnetic poles. It spins every 1.6 s: two beams sweep from the poles and the frame burns white each time one passes the eye; 30 dipole field lines turn with it; gravity bends the sky at its limb | Phobos, 22.5 km, as large as the star; none in transit |
| Sirius B | 0.0084 | A white dwarf, cyan white and smooth | The earth, larger than the star; the moon in transit |
| Sun (default) | 1 | Gold furnace: ember, amber, gold, white; redder prominences | The earth, 12.7 units; Mercury in transit, 4.9 units |
| Proxima | 0.154 | Deep orange, crimson prominences; a flare star, so flares hit harder | The earth, 83 units: a seventh of the star's width; a planet in transit |
| Sirius | 1.71 | Blue white, pale rose prominences | Our sun, more than half its size; the earth in transit |
| Rigel | 78.9 | Cold blue steel to white, lilac prominences, strong rays | Our sun, 17.7 units, a glowing bead |
| Betelgeuse | 764 | Rust and orange; a handful of giant cells, deep limb darkening, a dusty envelope | Our sun, 1.8 units, a speck |
| VY CMa | 1420 | Blood red, brown shadows; giant cells, a thick envelope of dust arcs and knots | Our sun, 1 unit, a speck of light |

The sun is the default: the furnace, and apart from Desert eclipse's white corona and pink prominences. The hum and the notes fall in key as the star grows.

## The model (lengths in star units; the star's radius is 696)

| Part | Model |
|---|---|
| Regions | Fourteen active regions all round the limb: five over the top, five on the bottom left limb the long lens frames, four on the sides; on the near side, on the limb, behind it, and on the disk |
| Prominences | Eight: hedgerows of fine upright threads, twisted arches with feet behind the limb, and tall curtains; three over the top, three on the bottom left limb, two on the sides. The largest arch stands 220 units high. Knots of cool plasma slide down every thread. An eruption lifts the prominence with growing speed (the arch swells into a bulb), fades it out by 17 s, and forms it again from 24 s to 44 s |
| Scale | A dark body is a shaded sphere lit from behind by the star: the earth with land, sea and cloud and a blue rim; the moon grey and cratered; Phobos lumpy. A body too large for the sky hangs in the top right corner, cut by the frame. A star body shows its darkened limb and surface, or, too small to resolve, a core and a halo. The transit crosses the disk and takes about five minutes |
| Volume | A raymarched shell of haze and dust round the star, 32 steps per ray at half size (a quarter on slow machines), blurred twice, as Fire does. The lighting is Fire's smoke shading (a marked K3 section copied from `cloudbottle/scene.js`): a self-shadow march toward the star, Beer plus a multiple-scatter lobe, the powder term and a Henyey-Greenstein phase, so dust backlit at the limb glows. The light falls with the square of the distance. The dust absorbs as well as scatters, so lanes darken what lies behind them. Denser on the long lens and round the giants |
| Loops | Bundles of three to six threads between two footpoints on the sphere, height about half the span, with a tilt, a shear and a turned axis. Each lives 24 to 46 s: it rises, shines, drains (knots slide down both legs with growing speed) and fades, then returns with a new shape. Faint long loops climb out of the frame |
| Flows | Faint ripples climb from the feet: the upflows seen in real loops |
| Flare | Peak in 0.05 s. Ribbons part from 12 to 62 percent of the region's span. The rope, 12 threads, rises at 14 Mm/s plus 20 Mm/s² and swells into a bulb. Arcade loops form at 0.45 s, then about every 0.6 s, low first; each is born at 22 million kelvin and cools with a 1.6 s time constant; rain from 12 s after its birth |
| Lens | The flare's core burns white, with an anamorphic streak and three ghosts on the line through the frame's centre |

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, the telescope view, the turn, picking, Bar v3 spec, frame loop |
| `sun.js` | The regions, the loop life cycle, the flare timeline, the stars and the scale bodies; it writes one strand per thread |
| `render.js` | Raw WebGL2: the disk and corona pass, instanced strands, bloom (`shared/glow.js`), light rays, the final pass, the colour ramps |
| `sound.js` | Web Audio |

- The disk pass: boiling granules, swirls of noise bent by noise, a faint supergranule network, dark filaments, limb darkening to a power set per star, a dust envelope on the giants (arcs, knots, dim patches over the disk), moss under each region, a haze over each region, the corona with streamers and a long tail, a red chromosphere rim and a spicule fringe. During a flare: the wave front over the disk and the dimming behind it, the bubble's shell and cavity.
- The strands: each thread is a camera-facing ribbon of 56 samples, drawn instanced with additive blending, as optically thin plasma adds up. A thread seen along its length is brighter (a longer path). The star hides what stands behind it, and the chromosphere dims the feet. Threads thinner than 1.5 px keep their total light.
- Light rays: at half size, each pixel marches 40 steps toward the star's centre through the bright light, then slow angular shafts break it into rays.
- The final pass: bent light round a neutron star, heat shimmer at the limb, the volume over the light, colour split toward the edges, the grade (three times, one per colour), halation, the lens streak and ghosts, the scale bodies, faint lens dirt, highlights that roll off to white, a vignette and fine grain. Reduced motion stills the grain.

## Dev (`?dev`)

The Dev button shows only with `?dev` in the address. Its rows are stored per browser; 1 is the house default; Reset puts every row back.

| Group | Rows |
|---|---|
| Post | Exposure, Bloom, Light rays, Halation, Colour split, Heat shimmer, Flare streak and ghosts, Lens dirt, Highlight roll-off, Vignette, Grain |
| Volume | Haze density, Haze light, Corona (full view), Corona bend |

## Fluid probe (`?fluid`, spike `stimming-8gez`)

Only with `?fluid` in the address. Fire's 3D fluid (`solarloop/fluid.js`, a trimmed copy of the K3 fluid in `cloudbottle/fluid.js`) is the haze round the prominence nearest the middle of the view. A 32 x 48 x 32 box of 12.5-unit cells stands under it, radial up, the star's surface its floor and every other side open; its faces fade, so no edge shows. Plasma condenses in drifting clumps along the prominence's own shape: an arch's semi-ellipse, or a hedgerow's curtain. A guide field steers the flow along that shape, so the haze drains down the legs and sinks into the surface, and holds it on the line. When the prominence erupts, the guide grows exactly as its threads do and a lift carries the plasma, so the haze lifts with them. A march through the box at half size adds it to the light as cool plasma before bloom. The threads stay drawn. Captures 27 and 28.

## Frame loop

- Lively while a flare or an eruption runs, or the lens zooms, or a drag turns the star.
- Drifting at 30 fps: the loops' life cycle.
- Asleep 60 s after the last input: the drift eases to a stop over 2 s and the loop stops.
- Hidden tab: the loop and both clocks stop.
- Reduced motion: no drift; the loop sleeps at once. A tap still flares, softer (70 percent) and slower (80 percent); the shot noise holds still.
- Slow frames step down one rung, then two (`shared/detail.js`): a lower pixel ratio, then fewer bloom levels.

## Sound

Muted by default. Space makes no sound, so this is a sonification: each part has a visible cause and pans with its region.

- Awake: a deep hum, a low chord whose filter breathes about every 20 s. The star sets the key: the larger the star, the lower.
- A pulsar ticks: a dry click on a short thump each time a beam sweeps past the eye.
- A flare or an eruption lands on a low brass blast: stacked saws through a soft clip, a filter that opens and closes.
- An eruption: a long rush swept upward over 13 s, and a tone that bends up a fifth.

- The flare: a crack of bright noise on a falling thump; a rush of noise swept upward as the rope lifts; a low roar under the eruption.
- Each arcade loop that snaps in: a glassy note, one step up a minor pentatonic scale. The star sets the key.
- The glow: a slow chord while the arcade shines.
- The rain: soft drips, each a falling note, from 12 s.
- A drag: a low wind that follows the speed of the turn.
- A wide hall: three long echoes.

## QA (headless Edge, D3D11, RTX 3070), 2026-11-23

| | Result |
|---|---|
| Q1 | `node --check` passes on the four modules, the menu scripts and the icon page script |
| Q2 | Clean console in play (every chip, key, tap, drag), on the menu with the tile hovered, and on the icon page |
| Q3 | Captures in `docs/qa/solarloop/`: 1280 x 800, 375 x 812, each flare stage, a turned view, the arch erupting (15), the long lens (16), the neutron star, Sirius B and Sirius (17 to 19, 21), VY CMa on the long lens (20), the phone long lens (23), the full star (24), the menu tile |
| Q4 | Drifting: 32 rAF a second. Asleep 63 s after the last input: 0 rAF in 2 s |
| Q5 | Hidden tab: 0 rAF in 2 s |
| Q6 | Reduced motion: clean console; 0 rAF in 2 s at rest; a tap still flares, softer |
| Q7 | Star choice, Flare, Lens, Activity slider (4 controls); How to play has 3 rows |
| Q8 | 1 to 8, L (three views) and Space each do their job |
| Q9 | The context runs after a gesture and is suspended once the toy sleeps |
| Q10 | Frame times through a flare, after the cinema pass: median 7.7 ms, p95 8.4 ms. Build to first frame: 1.0 s |
