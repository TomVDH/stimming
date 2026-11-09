---
# stimming-4wu3
title: 'Toy: Marsh launch'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:30:16Z
updated_at: 2026-11-09T08:59:36Z
---

Marsh launch (`launch`, shortlist 55, rank 17). Dawn over a reed marsh; tap to launch a rocket from the far shore. Light now, roar later; the roar lifts the birds; the high plume catches the sun first.

Plan: `docs/plans/launch.md`. three.js 0.170 on K2 and K6 lifted from `fireworks/index.html`. Controls on Bar v2.

## Checklist

- [x] Task 1: the marsh at dawn: K2 and K6 lifted and marked; sky, mist, reeds, channels, far shore; dawn(δ), shadowH(δ)
- [x] Task 1: Bar v2 spec, toys.json entry, low-fi Lab menu icon (pointer x sets the pad; the plume turns gold up high)
- [x] Task 1: stills at three Dawn values, 1280 and 375 px; checkpoint with Tom (blockout): signed off 2026-11-09
- [x] Task 2: the launch: flame, steam, trajectory, plume with shadow-line light, reed rim, channel streaks, boosters
- [x] Task 2: checkpoint with Tom: look signed off 2026-11-09
- [x] Task 3: sound front and birds
- [x] Task 4: sound with delays; mute test (the context suspends; birds still lift)
- [ ] Task 4: Q9 full run to sleep, and the hidden-tab resume, by ear
- [x] Task 5: Settings persistence, menu hook, Q1, Q2, Q7, Q8 in the pane; fresh-eyes review, five Important findings fixed
- [ ] Task 5: Q4 (idle rAF), Q6 (reduced motion), Q9 (full run to sleep), Q10 (frame times): the pane stays hidden; Tom checks on a real device
- [ ] Tom sets the Dutch name (proposal: Moeraslancering)
- [ ] Record the session cost

## Blockout notes (2026-11-09)

- Eye on a 4 m dike; pool at 18 to 58 m; channels at 125, 300 and 720 m; flats and a lagoon to the far shore.
- Near reeds: 9,000 instanced stalks (12,000 on High, 5,000 on rung 3) with nodding plumes and two leaves; far beds are feathered ribbons along the banks.
- The sun sits 22 degrees left of the view; the climb will bend right, into the dark sky.
- Launch is aria-disabled until Task 2. The sound button is hidden until Task 4.
- K2 sky becomes a dawn sky in this copy; K2 grade gains a letterbox (uBox). K6 drops the cloud veil.

## Launch notes (2026-11-09)

- launch(kind, padX) returns a paused GSAP timeline; the tick sets its time from the sim clock.
- Real altitude: 0.06 t² km (Small 1.25x, Heavy 0.9x). World height: D · 0.121 · ln(1 + h / 3 km).
- Plume: 3,200 puffs in a ring, written once at birth. Above the shadow line (±2 km soft edge) they take sunlight: gold core, blue spread edges.
- High up each step emits a shell of puffs at one speed: the bell, with rings behind it.
- Tap or Space in flight toggles the follow view; tall stages follow from the start. Launch is aria-disabled until T+80.

## Volumetric pass (2026-11-09, Tom: the bell read as a failed rocket)

- Each puff is now a raymarched sphere: 9 steps of 3D billow noise, Beer-Lambert, a self-shadow toward the sun and the flame.
- No burst: the trail is one continuous column that widens into a glowing fan up high, and sweeps right across the sky (downrange 0.95 D).
- Liftoff ground clouds: forty large billows roll sideways off the pad, lit orange from below.

## Cinematic pass (2026-11-09, Tom: restyle the marsh, tilt down, professional staging)

- Reeds: slim stems, three long arching leaves, and a feather plume that nods downwind; one wind combs them all. Plume hairs use alpha to coverage on a 4x multisampled target.
- Depth of field: focus on the far shore; near stalks soften (scatter-as-gather, 28 taps, depth from the scene target).
- Grade: cool shadows, warm highlights, a faint lens fringe at the edges.
- Camera: the drag eases to its target; the view tilts down to -0.2 rad.
- Trail: tighter spacing and less spread up high, so the sunlit fan stays smooth.
- Rocket: an orbital launcher, two stages; Heavy adds two strap-on boosters.

## Backlight, landscape and camera (2026-11-09)

- Puffs march two short shadow steps toward each light. A Henyey-Greenstein phase (g 0.72) and a powder term make backlit rims glow: the dawn horizon below the shadow line, the sun above it, the flame always.
- Mesas: three ranges at 7, 16 and 42 km in real metres (mesas, buttes, benches). Air melts them into the low sky; tops above the shadow line take alpenglow.
- Camera: a tiny handheld wobble while awake. At liftoff a documentary push-in (to 0.68 of the lens in 1.1 s, a correction to 0.74, out again from T+12). The horizon holds its place during the zoom.

## Orbiter, scale and film (2026-11-09)

- Orbiter path: straight up, a slow lean from T+14, never levels out. Altitude maps by a square root: near true scale at liftoff, 120 km half a distance up.
- A rocket body (Heavy: three cores; the side cores drop at T+18), scaled with the altitude map. The flame is a long white-hot cone that cools to red and balloons wide in thin air.
- Smoke noise lives in world space, so overlapping puffs make one billow field. Ground clouds squat flat on the ground. Fill light is low: smoke turned from the dawn stays dark; rims and backlight carry it.
- Reed banks: clumps and plume tips instead of flat crests.
- Film: 24 fps always, moving grain (0.075), a small exposure flicker, a shakier hand with jitter, a shake at ignition and liftoff, and a push-in that overshoots and corrects twice.

## Bokeh (2026-11-09, Tom: as in Wind farm and Buoy Business)

- Wind farm's pass, ported: 28 golden-angle taps turned per pixel, a reach test so sharp things keep their edges, and hot pixels weighted so bright lights open into discs.
- Wide-lens circle of confusion: K · |1/d − 1/focus|, focus on the pad; only the near reeds go soft.
- A focus hunt at liftoff: soft, past sharp, then sharp. The flame opens into a disc for half a second.

## Sound front, birds and sound (2026-11-09)

- The front spreads at 343 m/s from the pad. Reeds and reed banks lean away from the pad as it passes.
- Sixty birds in five beds between the eye and the pad. The front lifts the far beds first; they flock away to the left and fade after 30 s.
- The roar arrives D / 343 s after ignition: a broad band whose low-pass falls from 4 kHz to 600 Hz, a 33 Hz sub, and crackle. The camera jolts as it arrives.
- Wing flutter per bed, after its own delay; chirps stop for 10 s. Heavy adds a faint double thud at separation.
- Mute stops every scheduled node; a hidden tab stops them and the roar resumes from the timeline.
- The performance ladder now judges 24 fps frames (gaps past 50 ms count as slow).

## Bokeh kinds, fire, review fixes (2026-11-09)

- Settings: Bokeh (Round, Hex, Oval, Donut, Star) and Texture (Clean, Scatter, Grain, Bubble, Swirl), persisted. Autofocus follows the rocket, or racks to the ground where the frame looks down; blur grows with the zoom squared.
- Smoke: grey-blue body from the sky; the dawn key lights only thin edges; sunlit exhaust is silver and pale blue. Exhaust under 1.6 s old burns orange-white near the engine.
- Review fixes: composer pixel ratio (was 1x on Retina); a roar never replays after it ends and resumes at its faded level; a hidden tab silences the bed and suspends the context; a start wakes the sound and a missed roar retries; 24 fps by frame accumulator, drifting waits by timeout, ladder threshold 62 ms; timelines killed; shore geometry disposed; Distance waits for the flight to end; a flight keeps the scene awake; nothing draws before compile.

## Ground blast, landscape, bokeh sliders (2026-11-09)

- Ground clouds: 110 flat-bottomed billows blast sideways along the ground from ignition to T+7, later ones faster; an even fill, so no puff shows a dark core.
- Eye raised to 5.5 m. Distance is fixed at Mid (2 km); the setting is gone.
- Reeds: 6,500 to 9,000 full stalks near the eye plus 11,000 to 18,000 light ones (stalk and plume only) out to 120 m.
- Landscape: the plain runs to the horizon; mesas at 5, 12 and 30 km stand on it; 280 flat-crowned acacias line the far shore and dot the plain.
- Sky: random horizontal wisps on a sheet 7 km up, grey before dawn, pink and gold underlit near sunrise.
- Bokeh: Aperture, Focus (far left is auto) and Highlights sliders in Settings, after the Bokeh and Texture rows.

## The composed shot (2026-11-09, Tom: an unsuspecting marsh shot; the launch surprises)

- Default framing: a 34-degree lens (54 on tall stages), horizon on the lower third, tall hero reeds framing a gap with a mesa in it.
- The pad is fixed on the right third, behind the reeds; a tap or Space only starts the launch (tap-to-place is gone).
- The flash bursts through the reeds; 0.9 s later the operator starts to follow, then pushes in at liftoff.
- The climb leans east, toward the dawn glow, so the arc crosses the frame right to left.

## Staged orbiter and the side-on arc (2026-11-09)

- Two stages: MECO at T+40, the spent stage tumbles off as a spark, the upper stage lights at T+41.6 and burns to T+112; the flight runs to T+128 and leaves the frame still climbing. The climb rate eases after the turn (altitude / (1 + (t/45)²)).
- The arc runs across the frame (1.1 D downrange), a little away from the eye; the pad sits left of centre, the climb goes right into the dark sky.
- Zoom push-in softened (0.78, 0.85, 0.82, out from T+14); shake halved.
- Birds take off one by one over 3 s, each on its own heading, loose flocking, a wingbeat bob; smaller.
- Framing back to the 36-degree lens with the horizon on 0.7; hero reeds only at the far sides; the centre opens on the mesas.
- Cost: 7 march steps, 22 bokeh taps, 4,800 + 9,000 reeds on Standard, 90 ground puffs.
