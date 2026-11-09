---
# stimming-4wu3
title: 'Toy: Marsh launch'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:30:16Z
updated_at: 2026-11-09T10:56:35Z
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
- [x] Review 2 (Tom, 2026-11-09): bokeh on BokehShader2, one-sided, steady taps
- [x] Review 2: calm camera (no jitter, 30 fps)
- [x] Review 2: rocket sharp through the zoom toggle
- [x] Review 2: the arc stays in frame to SECO
- [x] Review 2: living reed sway, cleaner reed model
- [x] Review 2: birds nearer the eye, spruced up
- [ ] Review 2: no launch shockwave: camera jolts and the reed push wave gone
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

## Defined ground clouds (2026-11-09, Tom: darker, starker, definition)

- Ground-cloud density: big slow lumps carry small ridged ones (90 m field, ridged at 2.3x and 5.1x), then a hard smoothstep cut (0.42 to 0.6), so every lump has an edge.
- Lighting: tops lit by the sky, undersides in self-shadow (tk squared), fill cut to 0.1. Ten march steps with a steadier jitter, so the march leaves no grain.

## One ground-cloud volume (2026-11-09, Tom: pills, not contiguous)

- The liftoff clouds are no longer separate puffs. Up to 32 blobs feed one soft-sphere field; a box round them is marched once per pixel (14 steps Standard, 20 High, 10 on rung 2), so neighbours fuse into one mass.
- World noise (90 m lumps, ridged detail) carves the field, with a medium-soft cut. Two shadow samples toward the dawn and two up give rounded shading; grey in the hollows, pale on the tops; the flame only warms the near side.

## Ground cloud as a 2D fluid (2026-11-09, Tom: still pills; use the Fire toy's approach)

- Fire's K3 is WebGPU TSL on three 0.186 and cannot load here. Built the same idea in WebGL: a 2D grid fluid (384 x 144, half-float ping-pong targets, 18 Jacobi passes) on one slab across the pad. Side on, two dimensions carry the whole cloud.
- The exhaust is a body-force jet onto the pad; the pressure solve turns it into a ground sheet. Fresh smoke lifts (buoyancy decays with age), old smoke weighs down and spreads; a damping lid keeps it low; curl noise and gusts roll it.
- The slab shader warps the lookup with two noise scales for billow detail, lights by the density slope with dawn key, top light and flame, and shadows through the density toward the dawn.
- Acacias cut; the shore is one clean line; a faint lattice gantry stands beside the pad.
- Lesson: velocities in uv per second must stay near 0.05 (about 100 m/s); forces ten times larger blew the smoke out of the grid within a step.

## Click zoom, far pad, near-only bokeh (2026-11-09)

- No automatic push-in or follow: the camera holds the wide landscape. In flight a click or Space snaps the zoom in (0.5x, past the mark, two corrections, a focus hunt) and the next click snaps it back out the same way. Reduced motion snaps at once.
- Bokeh is one-sided: only what lies nearer than the pad blurs (the near pool edge and the reeds); the distance is always sharp. The look-down rack is gone.
- The pad is fixed at Far (3.4 km); the roar takes ten seconds. The Distance setting is gone for good.
- The installation is one slim rod, 45 m. Mesas at 9, 20 and 45 km. Wisps sparser and larger.
- The fluid cloud checked through the page's own loop (probe tickN): it shows in the real page; Tom's tab was stale.

## Two fluids: heavy ground cloud, fluid trail with the jellyfish (2026-11-09)

- The fluid engine is generic (makeFluid, fluidStep with a mode). Ground: 384 x 144; trail: 512 x 256 on a slab 1.9 D wide over the sky.
- Ground mode: heavier (drag 0.7, lift only while fresh, strong settle), a light downrange wind carries old smoke off, dissipation picks up after T+40, gone by T+110.
- Trail mode: smoke poured in at the rocket; the pour widens and pushes outward where the air is thin (the jellyfish); upper wind shears it; it lingers 40 s past the flight. Above the shadow line the slab shades it as a translucent sunlit bell, pale blue with a warm core; fresh exhaust burns orange.
- The puff trail is retired (puffs hidden, no emission); K6 sparks and boosters stay.
- Default lens 50 degrees (66 tall); tower is one rod; mesas at 9, 20, 45 km; wisps sparser.

## Reeds fill the frame; trail back to puffs (2026-11-09, Tom: the fluid trail was a regression)

- The raymarched puff trail is restored as it was in d1bd199; the trail fluid is gone. The fluid stays for the base only (512 x 160, slab 1.5 D wide).
- Base: the deflected jet drives two ground sheets, left and right, far along the ground; lower drag; more smoke; a little lift while fresh.
- Reeds fill the whole frame; a small gap stays open toward the pad (gapDir = padX / PAD). Two more channels at 480 and 1100 m; light far reeds out to 280 m.
- Vetted on stills at T+3, 8, 15, 30, 45 before the commit.

## Bokeh fix (03:20)

Cause: the DOF pass read depth 0 everywhere. The composer target's DepthTexture kept its first 1x1 size, and both composer buffers shared it (a feedback loop).
Fix: the scene renders into its own sceneRT (HalfFloat, 4 samples, DepthTexture at full size), rebuilt on resize; the DOF pass reads tScene and tDepth from it. The gather radius is now the widest blur among eight depth probes, so near reeds bleed over the sky; the distance stays sharp. Blur scale 130 / cap 18 per 800 px.
Also in this commit: calmer reed sway, narrower two-sided base cloud (G_W 0.7), unused RenderPass import removed.

## Thinner old smoke, cheaper reeds (03:35)

The ground cloud's extinction falls with age (4.0 to 0.6 over ~30 s) and its alpha drops 65% by 70 s, so the drift is a veil. Near reeds drop from 76 to 48 triangles each; counts 6000/4500 near (was 8500/6500), 12000/9000 far (was 18000/13000). Checked at 1280x800: idle, T+12, T+45, T+80, GL error 0.

## Night launch (03:58)

The Dawn slider now runs from 18° of depression (full night) to 1°: `dawnDeg(v) = 1 + 17 (1 - v)^1.3`. A `uNight` uniform (0 at 9°, 1 at 18°) darkens the sky and ambient, brings the stars up, raises exposure a little, and lets the flame key the reeds (rim x2.5), the ground cloud (x3.5), the puffs (x3) and the mist (x2). Checked at night: idle, T+10, T+18, T+30; GL error 0. Menu tile and toys.json carry the Beta tag.

## Soft shadow line, thinner cloud (04:05)

The trail's sunlit band no longer steps on at the shadow line: it rises over a third of the shadow height and eases in (squared), and the sunlit key is 1.15x instead of 1.6x. The ground cloud thins faster: extinction 3.0 falling with age over 18 s, alpha 0.9 down to 0.2 by 50 s. Checked at Dawn 0.45, T+45 and T+70.
