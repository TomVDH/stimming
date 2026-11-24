# Solar loop (`solarloop`)

Lab toy, idea 238. Bean `stimming-e35i`. Plan: `docs/plans/solarloop.md`.

A star's edge at a vast scale, graded like film. The look takes its cue from two kinds of film: the sun as a furnace, all gold and white light, and the slow, hazy, monumental frame of large-scale science fiction.
Seventeen stars (Tom, 2026-11-23): one for each class on the main sequence, O to M, two brown dwarfs, and the stages of a star's life, from a protostar to a pulsar. The disk is a dome across the foot of the frame: boiling granules (or, on the red supergiants, a handful of giant cells), slow swirls, dark filaments. Above the limb, loops of plasma arc on field lines and drain back. Three giant prominences stand over everything: a hedgerow, a forest of fine threads, a twisted arch, and a tall curtain. No other bodies, apart from Mercury in transit on our sun (Tom, 2026-11-23).
Three views, stops on one zoom (Tom, 2026-11-23): the wheel, a pinch or - and = glide through them (long lens, wide view, full star, then out), and L jumps in Tom's order: long lens, full star, wide view. The long lens, where every visit opens, fills the frame with the star; its bottom left limb cuts off the bottom left corner, where prominences and loops stand in open space; the camera holds still. The wide view is the dome. The full view shows the whole star. The star is active all round its limb. A raymarched volume of haze and dust, lit by the star with Fire's smoke shading, wraps every star; Mercury crosses our sun's disk.
The film touch is light: fine grain, a soft colour split, a faint lens dirt, highlights that roll off to white.
Tap a region and it flares: two ribbons flash, the core burns white with an anamorphic streak and lens ghosts, a twisted rope lifts off as a bulb and leaves the frame, a bubble swells. A new arcade snaps in, cools and rains back. Tap a prominence and it erupts: it lifts and swells into space over about 15 s, then forms again.

## Play

| Input | Does |
|---|---|
| Click or tap the stage | Flares the region nearest the tap, or lifts off the prominence nearest the tap. Only the near side answers: the visible disk and its rim, never behind (Tom, 2026-11-23). Hover, press and Space follow the same rule |
| Point (mouse) | The cursor reads the region under it: a pointer over a region or prominence, grab on the wide and full views, an arrow on the still long lens. The target under the pointer brightens 15 percent |
| Press and hold | The nearest target swells to 1.6 times its light over about a second; the flare goes on release. A drag cancels it |
| Drag | Wide and full views: turns the star up to 18 degrees each way. The long lens holds still |
| Star (the bar button shows the star) | Opens the star tray, a size ladder (Tom, 2026-11-24): all seventeen stars on one line, smallest to largest, from the pulsar to VY CMa. Each star is a swatch in its own colour, sized by its radius on a log scale, standing on the line; its name stands on its side below it. A ring marks the current one. The foot line gives the star in hand: class, temperature, width. Tap a star to pick it. Left and right (or [ and ]) step along the ladder, Home and End go to its ends, Enter picks, Escape or S closes |
| Keys 1 to 0 | Pick the main sequence (O to M) and the two brown dwarfs |
| [ and ] | Step to the previous or the next star, through all seventeen |
| Zoom (wheel, pinch, - and =) | One zoom through every view: the long lens, the wide view, the full star, then out to 16 times farther. The three views are stops on it. The wheel, a pinch and the keys ride a heavy spring: about 1.4 s to the target, a few percent past, then it settles (Tom, 2026-11-23). The motion slows near each stop, and a pause within 0.15 of a stop settles on it. The zoom rail shows over the bar while the zoom moves: every stop, a mark where the view stands, and the name of where it goes. Tap a stop to glide there. The zoom is stored |
| Lens (L) | Jumps to the next stop in Tom's order: long lens (where every visit opens), full star, wide view, then back to the long lens, over two seconds. Picking a new star glides to the full star. The button shows the view, and the zoom past the full star (`Full ×2.0`) |
| S | Opens the star chart; S or Escape closes it |
| Activity slider | How many loops live, how bright, how fast they cycle |
| Flare (Space) | Flares each region in turn, the ones in view first |

- The first frame is a picture: every loop at its own stage of life.
- The view is orthographic. The wide view is 1040 star units across on a wide stage (760 at mid widths, 520 on a phone), so the limb reads as a dome; the limb's top stands about a quarter of the way up the free stage.
- The long lens is the default (Tom, 2026-11-23). It is 560 units across (420 at mid widths, 300 on a phone). The star fills the frame; its limb runs from the middle of the foot to the middle of the left side, and the bottom left corner is open space with its own regions and prominences. The camera never moves there. Loops and prominences draw brighter; the tone curve presses a little darker and harder; the vignette deepens.
- The full view fits the whole star with sky round it. The view pulls back to 3.2 radii tall. The corona is a raymarched 3D volume in the star's own frame, so it turns with the star: streamers gather on a warped sheet round the magnetic equator, narrow as they climb and bend in a slow spiral with height; polar plumes stand at the poles; fine rays run radially. It scatters the star's light with a Thomson lobe (brightest side on) and falls as the radius to the power 2.2 in density. The march reaches 3.4 radii. The exposure halves, so the whole disk shows its surface.

## Eggs (bean `stimming-239r`)

A still press of 3 s on three stars plays a real event from that star (Tom, 2026-11-23). From 0.6 s the event builds; a release before 3 s runs it back out and does not flare. Each egg also plays on its own, about once per 25 minutes awake, but never under reduced motion. The code is in `eggs.js`.

| Star | Egg | What happens |
|---|---|---|
| Sun | The Carrington flare, 1 September 1859 | A large spot group darkens in under the finger. The spot lands under the finger at 3 s, although the sun turns. Then two white-light kernels flash and part, as Carrington and Hodgson saw them by eye, and a large flare (1.6 times) rises from them. With sound on, 6.3 s later the storm reaches the earth (17.6 hours, at 10,000 times): a far telegraph sounder clacks |
| Betelgeuse | The Great Dimming, 2019 to 2020 | A cool patch spreads over the southern half. Then a dust veil condenses over it and past the southern limb; the star falls to about 43 percent of its light, then clears by 36 s. The veil's noise sits in the star's frame. With sound on, a chord falls and muffles |
| Pulsar | Vela's true voice | The spin rises on a log scale from one turn in 1.6 s to Vela's true 11.19 turns a second; the beams and the field lines go with it. Each turn is one tick, so with sound on the ticks run into a buzz. A release eases it back over about 5 s. Under reduced motion the spin rises only 4 times |

## The stars

The model runs in star units: the star's radius is always 696, so on our sun one unit is one Mm. The image holds two light channels, hot plasma (the disk, the corona, the loops) and cool plasma (the prominences, the chromosphere, the rope); each star grades them through its own pair of colour ramps after a film tone curve.

| Star | Radius (suns) | Look |
|---|---|---|
| Zeta Ophiuchi (O) | 8 | Violet blue to white, deep violet prominences, strong rays. A fast spinner seen side-on: its equator 15 percent wider than its poles, and darker |
| Regulus (B) | 4.2 | Blue white, lilac prominences. Spun almost to breaking, seen side-on: its equator a third wider than its poles, and darker |
| Vega (A) | 2.7 | Near pure white, pale blue prominences. A fast spinner shown side-on, not pole-on as from the earth (Tom, 2026-11-23): its equator a fifth wider than its poles, the poles hot and bright, the equator about 2000 K cooler and darker |
| Sirius | 1.71 | Blue white, pale rose prominences |
| Procyon (F) | 2.05 | Cream to white, salmon prominences |
| Sun (default) | 1 | Gold furnace: ember, amber, gold, white; redder prominences |
| Epsilon Eridani (K) | 0.74 | Deep orange, red orange prominences; young and active, so flares hit hard |
| Proxima | 0.154 | Deep orange, crimson prominences; a flare star, so flares hit harder |
| Luhman 16 (L/T brown dwarf) | 0.1 | Magenta brown and dim; no loops or prominences. A cloud deck in six uneven bands round its spin axis: neighbour bands drift opposite ways, eddies curl their edges, dark storm ovals ride them |
| WISE 0855 (Y brown dwarf) | 0.1 | Dark maroon and slate, the coldest; no loops or prominences. Four slow bands of water ice cloud, calmer than Luhman 16's |
| T Tauri (protostar) | 3 | Amber in a light dusty envelope, red prominences, hard flares. A ringed dust disk circles it at a slant, from 1.3 radii out, with two dark gaps where young planets clear lanes; its inner rim glows, its near side crosses the star and dims it, and it turns faster near the star. A jet leaves each pole, with bright knots that travel outward |
| Arcturus (red giant) | 25.4 | Orange, rose prominences, large granules, light dust |
| Rigel | 78.9 | Cold blue steel to white, lilac prominences, strong rays |
| Betelgeuse | 764 | Rust and orange; a handful of giant cells, deep limb darkening, a dusty envelope |
| VY CMa | 1420 | Blood red, brown shadows; giant cells, a thick envelope of dust arcs and knots |
| Sirius B | 0.0084 | A white dwarf, cyan white and smooth |
| Pulsar (the Vela pulsar, a neutron star) | 0.0000172 (12 km) | A dark violet sphere with two white-hot magnetic polar caps. It spins every 1.6 s: two narrow beam cones sweep from the caps like a lighthouse, with charge streaming out along them, and a cap flares when its beam faces the eye. 56 dipole field lines in three shells turn with it. A wind nebula surrounds it: a torus round the spin equator, brighter on its near side, and a wandering jet from each spin pole. Gravity bends the sky at its limb |

Every star turns on its own axis at its true rate, run 10,000 times faster (Tom, 2026-11-23). The surface, the regions, the loops, the prominences and the corona turn with it.

| Star | True period | In the toy |
|---|---|---|
| Luhman 16 | 5.3 h | 1.9 s |
| WISE 0855 | about 10 h (an estimate) | 3.6 s |
| Vega | 12.5 h | 4.5 s |
| Regulus | 16 h | 5.7 s |
| Zeta Ophiuchi, Sirius B | about 1 day (estimates) | 8.6 s |
| T Tauri | 2.8 days | 24 s |
| Sirius | 5.5 days | 48 s |
| Epsilon Eridani | 11.2 days | 97 s |
| Procyon | 23 days | 3.3 min |
| Sun | 25.4 days | 3.7 min |
| Proxima | 83 days | 12 min |
| Rigel | about 160 days (an estimate) | 23 min |
| Arcturus | about 2 years | 1.8 h |
| Betelgeuse, VY CMa | decades | a day or more: still |

The pulsar keeps its own 1.6 s spin: Vela turns 11 times a second, and 10,000 times that cannot be drawn.

The sun is the default: the furnace, and apart from Desert eclipse's white corona and pink prominences. The hum and the notes fall in key as the star grows.

## The model (lengths in star units; the star's radius is 696)

| Part | Model |
|---|---|
| Regions | Fourteen active regions all round the limb: five over the top, five on the bottom left limb the long lens frames, four on the sides; on the near side, on the limb, behind it, and on the disk |
| Prominences | Eight: hedgerows of fine upright threads, twisted arches with feet behind the limb, and tall curtains; three over the top, three on the bottom left limb, two on the sides. The largest arch stands 220 units high. Knots of cool plasma slide down every thread. An eruption lifts the prominence with growing speed (the arch swells into a bulb), fades it out by 17 s, and forms it again from 24 s to 44 s |
| Scale | Mercury is a grey shaded sphere lit from behind by the sun, with a thin sunlit rim. It crosses the disk on the long lens and the full view, in about five minutes. No other star has a body beside it |
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
| `rail.js`, `rail.css` | The zoom rail over the bar |
| `chart.js`, `chart.css` | The star tray, a size ladder: a sheet the toy owns, in the Bar v3 sheet look. The Star action opens it; the bar labels follow the Bar v2 chips |
| `sun.js` | The regions, the loop life cycle, the flare timeline, the stars and the scale bodies; it writes one strand per thread |
| `render.js` | Raw WebGL2: the disk and corona pass, instanced strands, bloom (`shared/glow.js`), light rays, the final pass, the colour ramps |
| `eggs.js` | The eggs: the hold timing, each egg's timeline, the pulsar's spin rate |
| `sound.js` | Web Audio |

- The disk pass: boiling granules (bent by noise, so they never read as hexagons), swirls of noise bent by noise, a faint supergranule network, dark filaments, limb darkening to a power set per star, a dust envelope on the giants (arcs, knots, dim patches over the disk), moss under each region, a haze over each region, the corona with streamers and a long tail, a red chromosphere rim and a spicule fringe. During a flare: the bubble's shell and cavity. No wave runs over the disk (Tom, 2026-11-23).
- The strands: each thread is a camera-facing ribbon of 56 samples, drawn instanced with additive blending, as optically thin plasma adds up. A thread seen along its length is brighter (a longer path). The star hides what stands behind it, and the chromosphere dims the feet. Threads thinner than 1.5 px keep their total light.
- Light rays: at half size, each pixel marches 40 steps toward the star's centre through the bright light: a smooth glow. No screen-fixed spokes (Tom, 2026-11-23: they read as a static starburst); the corona and haze volumes carry the structure.
- Nothing in the star holds still on the screen (Tom, 2026-11-23): the haze, the dust and the corona sit in the star's frame and turn with it; the march's dither steps each frame; the corona's lumps wrap with no seam. Off the disk, the streamers, the spicule fringe and the dust envelope take their noise from the point's direction in the star's frame, so they turn with the star and have no seam below it.
- The haze volume shows over a star's disk only on dusty stars (Tom, 2026-11-23: it read as blobs on every star).
- Fast spinners: the view stretches an oblate star's equator across the screen, so the disk, the loops and the volumes all take the same shape. Gravity darkening dims the disk toward the spin equator.
- The final pass: bent light round a neutron star, heat shimmer at the limb, the volume over the light, colour split toward the edges, the grade (three times, one per colour), halation, the lens streak and ghosts, the scale bodies, faint lens dirt (round the star only, never over its disk: Tom, 2026-11-23), highlights that roll off to white, a vignette and fine grain. Reduced motion stills the grain.

## Dev (`?dev`)

The Dev button shows only with `?dev` in the address. Its rows are stored per browser; 1 is the house default; Reset puts every row back. Dev opens as a small popover at the right, with no dark glass over the stage, so the star stays in view while you tune (Tom, 2026-11-23). The shared Bar v3 Dev popover draws it.

| Group | Rows |
|---|---|
| Post | Exposure, Bloom, Light rays, Halation, Colour split, Heat shimmer, Flare streak and ghosts, Lens dirt, Highlight roll-off, Vignette, Grain |
| Volume | Haze density, Haze light, Corona (full view), Corona bend |
| Grade | Tone map: Film (the house curve), ACES (Narkowicz fit) or AgX (log2 and its default contrast curve); each feeds the star's own colour ramps, so the palettes stay. Look: None (the house default), Furnace, Viewing glass, Bleach, Gold haze, sun-glare looks after the film's style (Tom, 2026-11-24). Contrast, Saturation, Warmth. Reset puts the grade back |
| Sound | Hum (organ choir) and Space rumble: each on or off |

## Fluid probe (`?fluid`, spike `stimming-8gez`)

Only with `?fluid` in the address. Fire's 3D fluid (`solarloop/fluid.js`, a trimmed copy of the K3 fluid in `cloudbottle/fluid.js`) is the haze round the prominence nearest the middle of the view. A 32 x 48 x 32 box of 12.5-unit cells stands under it, radial up, the star's surface its floor and every other side open; its faces fade, so no edge shows. Plasma condenses in drifting clumps along the prominence's own shape: an arch's semi-ellipse, or a hedgerow's curtain. A guide field steers the flow along that shape, so the haze drains down the legs and sinks into the surface, and holds it on the line. When the prominence erupts, the guide grows exactly as its threads do and a lift carries the plasma, so the haze lifts with them. A march through the box at half size adds it to the light as cool plasma before bloom. The threads stay drawn. Captures 27 and 28.

## Frame loop

- Lively while a flare, an eruption or an egg runs, a press is held, the lens zooms, the zoom spring settles, a drag turns the star, a target's hover or press light eases or a star switch dips.
- Drifting at 30 fps: the loops' life cycle.
- Asleep 60 s after the last input: the drift eases to a stop over 2 s and the loop stops.
- Hidden tab: the loop and both clocks stop.
- Reduced motion: no drift; the loop sleeps at once. A tap still flares, softer (70 percent) and slower (80 percent); the shot noise holds still. The zoom and the star switch jump.
- Slow frames step down one rung, then two (`shared/detail.js`): a lower pixel ratio, then fewer bloom levels.

## Sound

Muted by default. Space makes no sound, so this is a sonification: each part has a visible cause and pans with its region.

- Awake, the star's voice in two layers (Tom, 2026-11-23). The star sets the key: the larger the star, the lower.
  - The space rumble: a constant, dense, deep surround drone, subtle (Tom, 2026-11-23). It renders once per star into a 24 s stereo loop whose last 3 s crossfade into its start, so it repeats with no seam: two independent deep noise beds, one per side, under twelve low sines round the root two octaves down, each placed across the stereo field. No swells: it holds steady. It grows as the view closes in (Tom, 2026-11-23): Against the old fixed level: the long lens +2.3 dB, the wide view +1 dB, the full star 0 dB (Tom). Zoomed out, it holds 0 dB to about 4 times, then fades to -9 dB at 16 times.
  - The Sun's voice (Tom, 2026-11-24, set by ear in a tuning player), in A sharp: the Sun's key, so its brass blast and glow chord sit in A sharp too. A choir and a slowed choir, at half level each. The choir: one sawtooth wave per note, low passed at 3 kHz. The slowed choir: the same plus a wave an octave down, low passed at 1.8 kHz. Both pass four formant band passes (400, 750, 1150 and 2700 Hz). Three octave voices: the middle at 1, an octave down at 0.5, two octaves down at 0.6. Each wave sits at exact pitch, so nothing beats; one shared pitch drift of 3 cents at 0.2 Hz and a level swell of 20 percent at 0.12 Hz are the only movement. The chord holds the root, fifth, ninth and major third; every 10 to 12 s it crossfades over 4 s between Ionian (adds the major seventh) and major pentatonic (adds the sixth). Two top voices take turns: every 8 s the next note of the scale of the moment fades in over 2 s as the last fades out. A 7 s convolution reverb (wet 1.2, dry 0.5) replaces the echo hall. It fades in over 4 s and sits faint under the rumble.
  - The other stars, until each gets its own voice (Tom: one by one): a soft angelic organ choir, crisp and steady (Tom, 2026-11-23: no wobble). Each note is a custom wave, organ drawbars plus an "ah" vowel shape, played by three voices 7 cents apart. A 16' bass, then root, fifth, octave and major tenth. Its harmonics reach 11 kHz: above the vowel they fall 6 dB an octave, so the top is open and crisp (Tom, 2026-11-23: it sounded like a 128 kbps file; the old wave stopped at 4 kHz). Its top voice sings a major pentatonic line, one note every 7 to 11 s, gliding between them. Tuned on the sun first.
- A pulsar ticks: a dry click on a short thump each time a beam sweeps past the eye.
- A flare: the deep brass synth (stacked saws through a soft clip, a filter that opens and closes), then the glow, a slow chord of four soft triangle notes that swells over 8 s and fades by 34 s. Only these two (Tom, 2026-11-23). A lifting prominence: the brass synth only. Nothing else: no rush or wind, no roar, no chimes, no drips.
- A drag is silent (Tom, 2026-11-23: no woosh).
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
| Q7 | Star, Flare, Lens, Activity slider (4 controls); How to play has 7 rows. Star tray as a size ladder (2026-11-24): 1280 x 800 and 375 x 812 in the in-app pane, clean console |
| Q8 | 1 to 9 and 0, [ and ], S, L (three stops), - and =, the wheel, and Space each do their job; while the chart is open, the toy's keys wait |
| Q9 | The context runs after a gesture and is suspended once the toy sleeps |
| Q10 | Frame times through a flare, after the cinema pass: median 7.7 ms, p95 8.4 ms. Build to first frame: 1.0 s |
