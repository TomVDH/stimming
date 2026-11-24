# Solar loop (`solarloop`)

Lab toy, idea 238. Bean `stimming-e35i`. Plan: `docs/plans/solarloop.md`.

A star's edge at a vast scale, graded like film. The look takes its cue from two kinds of film: the sun as a furnace, all gold and white light, and the slow, hazy, monumental frame of large-scale science fiction.
Seventeen stars (Tom, 2026-11-23): one for each class on the main sequence, O to M, two brown dwarfs, and the stages of a star's life, from a protostar to a pulsar. Every star is seen from the side, north up, turning about its upright pole (Tom, 2026-11-24). The surface lives on its own: granules boil (each lives about 7 s; on the red supergiants, a handful of giant cells), swirls writhe over about a minute, the supergranule network creeps, dark filaments. Above the limb, loops of plasma arc on field lines and drain back. Three giant prominences stand over everything: a hedgerow, a forest of fine threads, a twisted arch, and a tall curtain. No other bodies, apart from Mercury in transit on our sun (Tom, 2026-11-23).
Three views, stops on one zoom (Tom, 2026-11-23): the wheel, a pinch or - and = glide through them (long lens, wide view, full star, then out), and L jumps in Tom's order: long lens, full star, wide view. The long lens, where every visit opens, fills the frame with the star; the old quarter cut, mirrored onto the west side (Tom, 2026-11-24): its limb arcs from the foot's middle to the right side's middle, and the bottom right corner is open space; the camera holds still. The wide view stands back from the same limb, upright. The full view shows the whole star. The star is active all round its limb. A raymarched volume of haze and dust, lit by the star with Fire's smoke shading, wraps every star; Mercury crosses our sun's disk.
The film touch is light: fine grain, a soft colour split, a faint lens dirt, highlights that roll off to white.
Tap a region and it flares: two ribbons flash, the core burns white with an anamorphic streak and lens ghosts, a twisted rope lifts off as a bulb and leaves the frame, a bubble swells. A new arcade snaps in, cools and rains back. Tap a prominence and it erupts: it lifts and swells into space over about 15 s, then forms again.

## Play

| Input | Does |
|---|---|
| Click or tap the stage | From the full star inward only (Tom, 2026-11-24); far out a tap does nothing. Flares the region nearest the tap, or lifts off the prominence nearest the tap. Only the near side answers: the visible disk and its rim, never behind (Tom, 2026-11-23). Hover, press and Space follow the same rule |
| Point (mouse) | The cursor reads the region under it: a pointer over a region or prominence, grab on the wide and full views, an arrow on the still long lens. The target under the pointer brightens 15 percent |
| Press and hold | The nearest target swells to 1.6 times its light over about a second; the flare goes on release. A drag cancels it |
| Drag | Wide and full views: turns the star up to 18 degrees each way. The long lens holds still. Halfway out past the full star and beyond, the drag stops turning the star |
| Mouse, far out | Past the full star the mouse gently nudges the lens: its optical centre follows the pointer a little, so the ghosts drift, and the two star layers slide by different amounts. A slow, critically damped follow, about 2 s, no overshoot (Tom, 2026-11-24). It grows with the distance and is gone by the full star; none under reduced motion |
| Star card | In Frietkot's establishing-title style and place (Tom, 2026-11-24). It shows only when the zoom settles on the full star: zoomed out to it, glided there by a star pick, or a visit that opens there. The name types on, then the formal (Latin) name, then one fact per row with aligned labels: catalogue (HIP where it has one), rotation, magnitude, width in suns, distance, age. It holds 6 s and fades; a zoom away fades it at once. Values from `facts.js`, with sources; "about" marks an estimate. Reduced motion shows it whole. The star tray clears it |
| Star (the bar button shows the star) | The bar holds only this button (Tom, 2026-11-24). Left and Right step the star while it has focus. A tap opens the star tray, a size ladder (Tom, 2026-11-24): all seventeen stars on one line, smallest to largest, from the pulsar to VY CMa. Each star is a swatch in its own colour, sized by its radius on a log scale, standing on the line; its name stands on its side below it. A ring marks the current one. The foot line gives the star in hand: class, temperature, width. Tap a star to pick it. Left and right (or [ and ]) step along the ladder, Home and End go to its ends, Enter picks, Escape or S closes |
| Keys 1 to 0 | Pick the main sequence (O to M) and the two brown dwarfs |
| [ and ] | Step to the previous or the next star, through all seventeen |
| Zoom (wheel, pinch, - and =) | One zoom through every view: the long lens, the wide view, the full star, then out to 32 times farther (Tom, 2026-11-24). The pull-back takes four units of the zoom, so each step changes the size about as much as a step between the views. The three views are stops on it. Every zoom input (the wheel, a pinch, the keys, L, the rail, a star pick) sets one target, and the view follows it through two critically damped followers in series: a soft start, no overshoot, about 1.8 s to settle one stop (Tom, 2026-11-24). Zooming in is slower and heavier: 1.4 times the time. The camera runs on a monotone cubic through the stops (log width and the centre over the width), so it never slows at a stop. One magnet notch (Tom, 2026-11-24): when the wheel, a pinch or the keys pause within 0.3 of the full star, the zoom settles on it. Dev Zoom weight scales the time. The zoom rail shows over the bar while the zoom moves, with no words (Tom, 2026-11-24): a dashed left half for the close views, a pip at the middle for the full star, a plain right half for the pull-back, and a mark where the view stands. Tap the line to glide there |
| L | Glides to the next stop in Tom's order: long lens (where every visit opens), full star, wide view, then back to the long lens. Picking a new star glides to the full star. A key only; the rail names the view |
| S | Opens the star chart; S or Escape closes it |
| Activity (Settings) | How many loops live, how bright, how fast they cycle, and how many sunspots show and how large |
| Space | Flares each region in turn, the ones in view first, from the full star inward. A key only |

- The first frame is a picture: every loop at its own stage of life.
- The view is orthographic. The wide view is 1040 star units across on a wide stage (760 at mid widths, 520 on a phone). It looks at the west limb from the side: the limb stands upright about a third of the way in from the left (Tom, 2026-11-24).
- The long lens is the default (Tom, 2026-11-23). It is 560 units across (420 at mid widths, 300 on a phone). The star fills the frame; its west limb arcs from the middle of the foot to the middle of the right side, and the bottom right corner is open space. The southern belt's regions and prominences stand on the arc's upper, equator end. Zooming from the long lens to the wide view stays on that limb. The camera never moves there. Loops and prominences draw brighter; the tone curve presses a little darker and harder; the vignette deepens.
- The full view fits the whole star with sky round it. The view pulls back to 3.2 radii tall. The corona is a raymarched 3D volume in the star's own frame, so it turns with the star: streamers gather on a warped sheet round the magnetic equator, narrow as they climb and bend in a slow spiral with height; polar plumes stand at the poles; fine rays run radially. It scatters the star's light with a Thomson lobe (brightest side on) and falls as the radius to the power 2.2 in density. The march reaches 3.4 radii. The exposure halves, so the whole disk shows its surface.
- Zooming out past the full star (x1 to x32), the star turns into one far light, with no seam (Tom, 2026-11-24): the corona, the haze, the loops and prominences, and everything round the disk fade out; the surface melts into an even glow; the star burns brighter; and the Buoy Business flare grows in round it: the disk shrinks to a hard white core in a round, globular glow (white at its heart, the star's colour farther out), a warm orb about twice the disk wide, a thin horizontal streak that tapers out before the frame's edge, and the ghosts (Tom, 2026-11-24). A sparse starfield in two layers comes through behind it, never over the disk; a drag slides it a little.
- Real light (Tom, 2026-11-24), after an HDR eye: up close the star is masked, so the corona, loops and surface detail show. From just past the wide view to about x16, the exposure rises up to 4.6 times, so the disk burns toward white and its fine detail washes out on its own; the light round the disk (the corona, loops, prominences, haze and the 3D corona) keeps only a quarter of its look against it; and the star's glare spreads past the limb and covers the corona. Past the full star that light fades on toward x32. The eye adapts late (Tom, 2026-11-24): every light value (the exposure, the glare, the far star's glow and flare, the off-disk weight) trails the zoom, about 2 s on the way in and 0.6 s on the way out. So a zoom in from far out overpowers for a moment: the glow, sized to the growing disk, and the flare balloon, then the exposure settles and the surface and corona show. The far streak reaches farther as the disk grows on screen, still ending inside the frame.

## Eggs (bean `stimming-239r`)

A still press of 3 s on three stars plays a real event from that star (Tom, 2026-11-23). From 0.6 s the event builds; a release before 3 s runs it back out and does not flare. Each egg also plays on its own, about once per 25 minutes awake, but never under reduced motion. The code is in `eggs.js`.

| Star | Egg | What happens |
|---|---|---|
| Sun | The Carrington flare, 1 September 1859 | A large spot group darkens in under the finger. The spot lands under the finger at 3 s, although the sun turns. Then two white-light kernels flash and part, as Carrington and Hodgson saw them by eye, and a large flare (1.6 times) rises from them. It has no sound of its own beyond the flare: the telegraph is gone (Tom, 2026-11-24) |
| Betelgeuse | The Great Dimming, 2019 to 2020 | A cool patch spreads over the southern half. Then a dust veil condenses over it and past the southern limb; the star falls to about 43 percent of its light, then clears by 36 s. The veil's noise sits in the star's frame. With sound on, a chord falls and muffles |
| Pulsar | Vela's true voice | The spin rises on a log scale from one turn in 1.6 s to Vela's true 11.19 turns a second; the beams and the field lines go with it. It has no sound: the pulsar tick is gone (Tom, 2026-11-24), a new sound comes later. A release eases it back over about 5 s. Under reduced motion the spin rises only 4 times |

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
| Regions | Fourteen active regions, every one in a belt 5 to 35 degrees from the equator, as on the sun (Tom, 2026-11-24): five in the west limb's northern belt (the wide view), five in its southern belt (the long lens), four spread round the star; the star's turn carries them across the disk and round the limbs |
| Sunspots | Each region opens a bipole as Activity rises: a whole leader along the region's axis and a smaller follower in two pieces, each a dark umbra in a ragged penumbra, with bright faculae round the group toward the limb. Only stars with a convecting surface have them (strength: the Sun 1, Epsilon Eridani 1.3, Proxima 1.5, T Tauri 1.8, Arcturus 0.4, Procyon 0.3); none on the hot O, B and A stars, the brown dwarfs, the supergiants or the dead stars |
| Prominences | Eight: hedgerows of fine upright threads, twisted arches with feet behind the limb, and tall curtains; three over the west limb's northern belt, two in its southern belt, one on the east limb, and two polar crowns. The largest arch stands 220 units high. Knots of cool plasma slide down every thread. An eruption lifts the prominence with growing speed (the arch swells into a bulb), fades it out by 17 s, and forms it again from 24 s to 44 s |
| Scale | Mercury is a grey shaded sphere lit from behind by the sun, with a thin sunlit rim. It crosses the disk level, east to west with the star's turn, a little south of the equator, on the long lens and the full view (Tom, 2026-11-24). No other star has a body beside it |
| Volume | A raymarched shell of haze and dust round the star, 32 steps per ray at half size (a quarter on slow machines), blurred twice, as Fire does. The lighting is Fire's smoke shading (a marked K3 section copied from `cloudbottle/scene.js`): a self-shadow march toward the star, Beer plus a multiple-scatter lobe, the powder term and a Henyey-Greenstein phase, so dust backlit at the limb glows. The light falls with the square of the distance. The dust absorbs as well as scatters, so lanes darken what lies behind them. Denser on the long lens and round the giants |
| Loops | Bundles of three to six threads between two footpoints on the sphere, height about half the span, with a tilt, a shear and a turned axis. Each lives 24 to 46 s: it rises, shines, drains (knots slide down both legs with growing speed) and fades, then returns with a new shape. Faint long loops climb out of the frame |
| Flows | Faint ripples climb from the feet: the upflows seen in real loops |
| Flare | Peak in 0.05 s. Ribbons part from 12 to 62 percent of the region's span. The rope, 12 threads, rises at 14 Mm/s plus 20 Mm/s² and swells into a bulb. Arcade loops form at 0.45 s, then about every 0.6 s, low first; each is born at 22 million kelvin and cools with a 1.6 s time constant; rain from 12 s after its birth |
| Lens | The Buoy Business anamorphic flare (`shared/flare.js` parts, Tom, 2026-11-24): the core burns white; a soft orb, a thin horizontal streak in a soft sheath (longer for a stronger core) and three ghosts on the line through the frame's centre, all in the star's own streak colour, so a blue star keeps a blue streak. The streak tapers out before the frame's edge. The ghosts are soft discs with brighter rims, warm and teal; a light near the frame's centre still throws them a little off axis. Screen-blended |

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, the telescope view, the turn, picking, Bar v3 spec, frame loop |
| `rail.js`, `rail.css` | The zoom rail over the bar |
| `card.js`, `card.css`, `facts.js` | The star card and the facts it shows |
| `chart.js`, `chart.css` | The star tray, a size ladder: a sheet the toy owns, in the Bar v3 sheet look. The Star action opens it; the bar labels follow the Bar v2 chips |
| `sun.js` | The regions, the loop life cycle, the flare timeline, the stars and the scale bodies; it writes one strand per thread |
| `render.js` | Raw WebGL2: the disk and corona pass, instanced strands, bloom (`shared/glow.js`), light rays, the final pass, the colour ramps |
| `eggs.js` | The eggs: the hold timing, each egg's timeline, the pulsar's spin rate |
| `sound.js` | Web Audio: the drone, the rumble and the interaction sounds |
| `choir.js` | Every star's choir, song and tap sounds; one preset per star; the progression library; the zoom mix |
| `lab.html` | The choir lab (`noindex`): shapes each star's song, choir and tap live, over the rumble |
| `legacy.js` | The older sounds as full presets, for the lab only: the synth draft, the first draft and the organ choir |

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
| Post | Exposure, Bloom, Light rays, Halation, Colour split, Heat shimmer, Lens dirt, Highlight roll-off, Vignette, Grain |
| Volume | Haze density, Haze light, Corona (full view), Corona bend |
| Flare | Orb, Streak, Ghosts |
| Real light | Exposure lift, Glare |
| Grade | Tone map: Film (the house curve), ACES (Narkowicz fit) or AgX (log2 and its default contrast curve); each feeds the star's own colour ramps, so the palettes stay. Look: None (the house default), Furnace, Viewing glass, Bleach, Gold haze, sun-glare looks after the film's style (Tom, 2026-11-24). Contrast, Saturation, Warmth. Reset puts the grade back |
| Zoom | Zoom weight: the followers' time, 1 is about 1.8 s a stop |
| Sound | Hum (the star's choir) and Space rumble: each on or off |

Every post row was measured on 2026-11-24: one frame drawn twice with nothing moving, each row at its top, the share of pixels that changed. Each row now acts where it can (Tom, 2026-11-24): above 1 the weak ones reach further (Bloom 6 times, Lens dirt 4, Light rays, Haze density 2, Colour split, Heat shimmer, Corona bend 3); at 1 and below nothing changed. Roll-off and vignette act only where there are highlights and lit corners, so they show on the long lens; Corona and Corona bend act on the full view. Lens dirt catches the star's light near it, faint over the disk. Grain is soft clumps about 1.4 CSS pixels wide, a new frame of it 24 times a second, kept out of black space, still while the toy sleeps.

## Fluid probe (`?fluid`, spike `stimming-8gez`)

Only with `?fluid` in the address. Fire's 3D fluid (`solarloop/fluid.js`, a trimmed copy of the K3 fluid in `cloudbottle/fluid.js`) is the haze round the prominence nearest the middle of the view. A 32 x 48 x 32 box of 12.5-unit cells stands under it, radial up, the star's surface its floor and every other side open; its faces fade, so no edge shows. Plasma condenses in drifting clumps along the prominence's own shape: an arch's semi-ellipse, or a hedgerow's curtain. A guide field steers the flow along that shape, so the haze drains down the legs and sinks into the surface, and holds it on the line. When the prominence erupts, the guide grows exactly as its threads do and a lift carries the plasma, so the haze lifts with them. A march through the box at half size adds it to the light as cool plasma before bloom. The threads stay drawn. Captures 27 and 28.

## Frame loop

- Lively while a flare, an eruption or an egg runs, a press is held, the zoom moves, a drag turns the star, a target's hover or press light eases or a star switch dips.
- Drifting at 30 fps: the loops' life cycle.
- Asleep 60 s after the last input: the drift eases to a stop over 2 s and the loop stops.
- Hidden tab: the loop and both clocks stop.
- Reduced motion: no drift; the loop sleeps at once. A tap still flares, softer (70 percent) and slower (80 percent); the shot noise holds still. The zoom and the star switch jump.
- Slow frames step down one rung, then two (`shared/detail.js`): a lower pixel ratio, then fewer bloom levels.

## Sound

Muted by default. Space makes no sound, so this is a sonification: each part has a visible cause and pans with its region.

- Awake, the star's voice in two layers (Tom, 2026-11-23). The star sets the key: the larger the star, the lower.
  - The space rumble: a constant, dense, deep surround drone, subtle (Tom, 2026-11-23). It renders once per star into a 24 s stereo loop whose last 3 s crossfade into its start, so it repeats with no seam: two independent deep noise beds, one per side, under twelve low sines round the root two octaves down, each placed across the stereo field. No swells: it holds steady.
  - The Sun's voice (Tom, 2026-11-24, set by ear in a tuning player), in A sharp: the Sun's key, so its brass blast and glow chord sit in A sharp too. A choir and a slowed choir, at half level each. The choir: one sawtooth wave per note, low passed at 3 kHz. The slowed choir: the same plus a wave an octave down, low passed at 1.8 kHz. Both pass four formant band passes (400, 750, 1150 and 2700 Hz). Three octave voices: the middle at 1, an octave down at 0.5, two octaves down at 0.6. Each wave sits at exact pitch, so nothing beats; one shared pitch drift of 3 cents at 0.2 Hz and a level swell of 20 percent at 0.12 Hz are the only movement. The chord holds the root, fifth, ninth and major third; every 10 to 12 s it crossfades over 4 s between Ionian (adds the major seventh) and major pentatonic (adds the sixth). Two top voices take turns: every 8 s the next note of the scale of the moment fades in over 2 s as the last fades out. A 7 s convolution reverb (wet 1.2, dry 0.5) replaces the echo hall. It fades in over 4 s and sits faint under the rumble.
  - Every other star (Tom, 2026-11-24): the same choir engine (`choir.js`), in the star's own key, shaped by its preset. A preset sets the source wave (saw, analog pad, organ, the old organ choir, reed, flute, pulse or FM), how much of the "ah" vowel shaping it keeps, the vowel, a ring-modulated metal copy, brightness, unison detune, synth resonance and filter sweep, the step and swell, distance, the echo (reverb, the hall or both), reverb length and mix, stereo width, the octave levels, the slowed choir and six sci-fi filters (machine comb, phaser sweep, screech, dark, transmission, deep echo). A gain trim matches each star's loudness to the Sun, measured offline through a rough ear weighting; Betelgeuse keeps Tom's level by ear.
  - Songs (Tom, 2026-11-24): each star has its own harmony (the Ionian and pentatonic blend, Ionian, pentatonic, harmonic minor or the harmonic series) and can have a progression: chords on scale degrees, each held for its length, round and round. Chords are triads, major, minor, sus 2, sus 4, add 9, 7th, power or cluster. A voicing spreads them (Sun, organ, open, close). Five note slots per octave take each chord; a note the next chord keeps holds still, the others dip and return or glide. The melody steps, glides or walks the chord as an arpeggio, on the chord's tones and scale steps between them. The library: Sun blend, Hold, Slow rise, Suspended drift, Lydian float, Ice, Ominous minor, Dark descent, Phrygian shadow, Overtones. The Sun keeps its blend, unchanged (a seeded render matches the old engine to 0.00000003). Starting songs: Lydian float or Suspended drift on the bright stars, Slow rise on Epsilon Eridani and Proxima, Ice on the brown dwarfs, Suspended drift on T Tauri, Ominous minor or Dark descent on Arcturus, Rigel and VY Canis Majoris, Overtones on the remnants; Betelgeuse holds the harmonic series.
  - The analog pad (Tom: Mass Effect, Blade Runner): raw detuned saws with no vowel shaping, a filter that dips and opens on each chord, a stereo chorus and a slow drift per voice. Arcturus, Rigel and VY Canis Majoris start on it.
  - The zoom mix, one for all stars (`ZOOM` in `choir.js`): at each stop (far at 32 times, out at 4 times, the full star, the wide view, the long lens) a choir level, a rumble level and gains for the low, middle and high singers, the melody and the effects. Far out only the low singers sound, 9 dB down; out adds the middle; the full star has the whole choir; the wide view brings the melody forward; the long lens brings the effects forward and the rumble up 2.3 dB. The toy interpolates between stops as the view zooms.
  - The rumble feeds the choir's echo at 0.6, so both share one room.
  - A star switch crossfades the voice at equal power (Tom, 2026-11-24): the old choir and rumble ease out over 7 s on a quarter cosine, the new ones ease in over 6 s on a quarter sine from 0.25 s after the wipe's dark point. Measured: the level holds within 1.5 dB through the switch. The wipe itself darkens over 0.4 s and returns over 1.1 s.
  - A preset's key moves the star's choir, taps and rumble up or down in semitones from its home key.
  - Shape songs in the choir lab: <http://localhost:8000/solarloop/lab.html>. It plays the toy's chain. A pinned bar holds the toy's actions: play, tap, lift, a repeating tap, the star's harmony, choir and rumble switches, the Dimming, and the zoom with a button per stop. Step 1 picks a star. Step 2 shapes it: song (progression library, a step editor for the chords, melody, voicing, chord change, melody octave), key and voices, tone, analog pad, space, movement, tap sound, level, effects. Each value reads in words; most changes apply at once, a ↻ change restarts the choir, and tap changes reach the tap that sounds. Load puts an older version in as normal settings. A zoom graph edits the zoom mix by dragging, and a table compares every setting across the versions. The tap bench lists every tap voice with its note: the blast's six (sub octave, root, root 7 cents up, fifth, octave, octave and fifth) and up to five glow notes. Each has a level that saves in the preset (blastMix, glowMix) and a mute and solo that change only what the lab plays. It draws the last tap's blast level, glow level and blast filter over 35 s with a playhead, meters the choir, the taps and the total every 0.1 s over 30 s, plays a burst of 10 taps 2.5 s apart, and sets the tap strength. Step 3 copies changed stars as presets for `choir.js`, the zoom mix as `ZOOM`, or one star as JSON.
- A flare: the deep brass synth (six stacked saws an octave and a fifth apart through a soft clip, a resonant filter that opens in 0.45 s and closes slowly: a raw "braam"), on the root of the chord the choir sings now, then the glow. The glow is four soft notes, each up to 6 cents off: the star's chosen chord, or the chord that sounds now; all at once, or as an arpeggio, one note at a time. It swells over its rise (4.5 s on the Sun), holds, then falls 40 dB over its fade. Both are new voices; the choir does not change. All taps share one tap bus: one glow at a time (a new tap fades the last over 2.5 s), one blast at a time (0.5 s fade), and a soft limiter, so a burst of taps stays at one tap's level (measured: 10 taps 2.5 s apart sit within 0.4 dB of one tap). Stack, on old versions, lets taps pile up as before 24 November. Per star: the blast wave, the glow wave, notes, style, shape and both levels. A far star sends both into its choir's echo. Only these two (Tom, 2026-11-23). A lifting prominence: the brass synth only. Nothing else: no rush or wind, no roar, no chimes, no drips.
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
| Q7 | The bar holds only Star (2026-11-24); Activity in Settings; How to play has 7 rows. Star tray as a size ladder (2026-11-24): 1280 x 800 and 375 x 812 in the in-app pane, clean console |
| Q8 | 1 to 9 and 0, [ and ], S, L (three stops), - and =, the wheel, and Space each do their job; while the chart is open, the toy's keys wait |
| Q9 | The context runs after a gesture and is suspended once the toy sleeps |
| Q10 | Frame times through a flare, after the cinema pass: median 7.7 ms, p95 8.4 ms. Build to first frame: 1.0 s |
